import { Injectable, NotFoundException } from '@nestjs/common';
import type { Course, Lesson, LessonProject, Module } from '@stemverse/database';
import { PrismaService } from '../prisma/prisma.service';
import type { CourseWithModules, LessonDetail } from '../types/prisma-payloads';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  listTracks() {
    return this.prisma.learningTrack.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        courses: {
          where: { published: true },
          select: { id: true, title: true, slug: true, level: true, category: true },
        },
      },
    });
  }

  listCourses(trackSlug?: string) {
    return this.prisma.course.findMany({
      where: {
        published: true,
        ...(trackSlug ? { track: { slug: trackSlug } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      include: {
        track: { select: { slug: true, title: true } },
        _count: { select: { modules: true } },
      },
    });
  }

  async getCourseBySlug(slug: string): Promise<CourseWithModules> {
    const course = await this.prisma.course.findUnique({
      where: { slug },
      include: {
        track: true,
        modules: {
          orderBy: { sortOrder: 'asc' },
          include: {
            lessons: {
              orderBy: { sortOrder: 'asc' },
              include: {
                lessonProjects: { orderBy: { sortOrder: 'asc' } },
                assessments: {
                  orderBy: { sortOrder: 'asc' },
                  select: { id: true, title: true, passingScore: true },
                },
              },
            },
            assessments: {
              orderBy: { sortOrder: 'asc' },
              select: { id: true, title: true, passingScore: true },
            },
          },
        },
      },
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async getLesson(lessonId: string): Promise<LessonDetail> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        lessonProjects: { orderBy: { sortOrder: 'asc' } },
        assessments: {
          include: {
            questions: { orderBy: { sortOrder: 'asc' } },
          },
        },
        module: {
          include: {
            course: { select: { id: true, title: true, slug: true } },
          },
        },
      },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    return lesson;
  }

  createCourse(data: {
    title: string;
    slug: string;
    category: string;
    level: string;
    description?: string;
    trackId?: string;
  }): Promise<Course> {
    return this.prisma.course.create({ data: { ...data, published: true } });
  }

  createModule(data: {
    courseId: string;
    title: string;
    description?: string;
    sortOrder?: number;
  }): Promise<Module> {
    return this.prisma.module.create({ data });
  }

  createLesson(data: {
    moduleId: string;
    title: string;
    contentMd?: string;
    sortOrder?: number;
  }): Promise<Lesson> {
    return this.prisma.lesson.create({ data });
  }

  addLessonProject(data: {
    lessonId: string;
    title: string;
    description?: string;
    templateKey?: string;
    boardType?: string;
  }): Promise<LessonProject> {
    return this.prisma.lessonProject.create({ data });
  }
}
