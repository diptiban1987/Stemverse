import { Injectable, NotFoundException } from '@nestjs/common';
import { CertificateLevel } from '@stemverse/database';
import { PrismaService } from '../prisma/prisma.service';
import type { CertificateListItem, ProgressDashboard } from '../types/prisma-payloads';
import { buildCertificateMetadata } from '../assessment/grading.util';

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(userId: string): Promise<ProgressDashboard> {
    const [enrollments, lessonProgress, quizAttempts, projectCompletions, certificates] =
      await Promise.all([
        this.prisma.courseEnrollment.findMany({
          where: { userId },
          include: {
            course: {
              select: { id: true, title: true, slug: true, level: true },
            },
          },
        }),
        this.prisma.lessonProgress.findMany({
          where: { userId, completed: true },
          include: { lesson: { select: { id: true, title: true } } },
        }),
        this.prisma.assessmentAttempt.findMany({
          where: { userId },
          orderBy: { submittedAt: 'desc' },
          take: 10,
          include: { assessment: { select: { id: true, title: true } } },
        }),
        this.prisma.projectCompletion.findMany({
          where: { userId },
          include: { lessonProject: { select: { id: true, title: true } } },
        }),
        this.prisma.certificate.findMany({
          where: { userId },
          include: { course: { select: { title: true, slug: true } } },
        }),
      ]);

    return {
      enrollments,
      lessonsCompleted: lessonProgress.length,
      lessonProgress,
      quizAttempts,
      projectsCompleted: projectCompletions.length,
      projectCompletions,
      certificatesEarned: certificates.length,
      certificates,
    };
  }

  async enroll(userId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    return this.prisma.courseEnrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: { userId, courseId },
      update: {},
    });
  }

  async completeLesson(userId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { select: { courseId: true } } },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    await this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId, completed: true, completedAt: new Date() },
      update: { completed: true, completedAt: new Date() },
    });

    await this.recalculateCourseProgress(userId, lesson.module.courseId);
    return { success: true, lessonId };
  }

  async completeProject(
    userId: string,
    lessonProjectId: string,
    projectId?: string,
  ) {
    await this.prisma.projectCompletion.upsert({
      where: { userId_lessonProjectId: { userId, lessonProjectId } },
      create: { userId, lessonProjectId, projectId },
      update: { projectId, completedAt: new Date() },
    });
    return { success: true };
  }

  async recalculateCourseProgress(userId: string, courseId: string) {
    const modules = await this.prisma.module.findMany({
      where: { courseId },
      include: { lessons: { select: { id: true } } },
    });
    const lessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));
    if (lessonIds.length === 0) return;

    const completed = await this.prisma.lessonProgress.count({
      where: { userId, lessonId: { in: lessonIds }, completed: true },
    });

    const percent = (completed / lessonIds.length) * 100;

    await this.prisma.courseEnrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: { userId, courseId, progressPercent: percent },
      update: {
        progressPercent: percent,
        completedAt: percent >= 100 ? new Date() : null,
      },
    });

    if (percent >= 100) {
      await this.tryAwardCertificate(userId, courseId);
    }
  }

  private async tryAwardCertificate(userId: string, courseId: string) {
    const existing = await this.prisma.certificate.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (existing) return existing;

    const [user, course] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.course.findUnique({ where: { id: courseId }, include: { track: true } }),
    ]);
    if (!user || !course) return null;

    const level = mapCourseLevelToCertificate(course.level);
    const certId = crypto.randomUUID();
    const metadata = buildCertificateMetadata({
      certificateId: certId,
      recipientName: user.displayName ?? user.email,
      courseTitle: course.title,
      level,
      issuedAt: new Date(),
      trackTitle: course.track?.title,
    });

    return this.prisma.certificate.create({
      data: {
        id: certId,
        userId,
        courseId,
        level,
        metadata,
      },
    });
  }

  listCertificates(userId: string): Promise<CertificateListItem[]> {
    return this.prisma.certificate.findMany({
      where: { userId },
      include: { course: { select: { title: true, slug: true, level: true } } },
      orderBy: { issuedAt: 'desc' },
    });
  }
}

function mapCourseLevelToCertificate(level: string): CertificateLevel {
  const l = level.toLowerCase();
  if (l.includes('advanced') || l.includes('professional')) return CertificateLevel.ADVANCED;
  if (l.includes('intermediate')) return CertificateLevel.INTERMEDIATE;
  if (l.includes('professional')) return CertificateLevel.PROFESSIONAL;
  return CertificateLevel.BEGINNER;
}
