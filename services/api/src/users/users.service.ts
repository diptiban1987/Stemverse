import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        organizationId: true,
        createdAt: true,
        organization: { select: { id: true, name: true, plan: true } },
        _count: { select: { projects: true, certificates: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getDashboard(userId: string) {
    const [user, recentProjects, courses, certificates] = await Promise.all([
      this.getProfile(userId),
      this.prisma.project.findMany({
        where: { ownerId: userId },
        orderBy: { updatedAt: 'desc' },
        take: 6,
        select: {
          id: true,
          name: true,
          type: true,
          visibility: true,
          thumbnailUrl: true,
          updatedAt: true,
        },
      }),
      this.prisma.course.findMany({
        take: 3,
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          title: true,
          slug: true,
          category: true,
          level: true,
        },
      }),
      this.prisma.certificate.findMany({
        where: { userId },
        take: 5,
        include: { course: { select: { title: true, slug: true } } },
      }),
    ]);

    return {
      user,
      recentProjects,
      continueLearning: courses,
      certifications: certificates,
      stats: {
        projectCount: user._count.projects,
        certificateCount: user._count.certificates,
      },
    };
  }

  async updateProfile(userId: string, data: { displayName?: string }) {
    const updateData: Record<string, unknown> = {};
    if (data.displayName !== undefined) {
      updateData.displayName = data.displayName.trim() || null;
    }

    if (Object.keys(updateData).length === 0) {
      return this.getProfile(userId);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return this.getProfile(userId);
  }
}
