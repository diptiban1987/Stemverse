import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProjectVisibility, ProjectType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export type CommunityQuery = {
  type?: ProjectType;
  q?: string;
  board?: string;
  tag?: string;
  sort?: 'trending' | 'recent' | 'featured';
};

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  async browse(query: CommunityQuery) {
    const where: Prisma.ProjectWhereInput = {
      visibility: ProjectVisibility.PUBLIC,
      ...(query.type ? { type: query.type } : {}),
      ...(query.board ? { boardType: query.board } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { description: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy =
      query.sort === 'trending'
        ? [{ updatedAt: 'desc' as const }]
        : [{ updatedAt: 'desc' as const }];

    const projects = await this.prisma.project.findMany({
      where,
      orderBy,
      take: 48,
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        type: true,
        boardType: true,
        thumbnailUrl: true,
        updatedAt: true,
        createdAt: true,
        owner: { select: { displayName: true, id: true } },
        _count: { select: { forks: true } },
      },
    });

    const tags = this.extractTags(projects);
    const featured = projects.slice(0, 3);
    const trending = projects.slice(0, 12);

    return {
      projects: projects.map((p) => ({
        ...p,
        tags: this.projectTags(p),
        forkCount: p._count.forks,
      })),
      featured: featured.map((p) => ({ ...p, tags: this.projectTags(p), forkCount: p._count.forks })),
      trending: trending.map((p) => ({ ...p, tags: this.projectTags(p), forkCount: p._count.forks })),
      tags,
    };
  }

  async listPublic(type?: ProjectType) {
    const result = await this.browse({ type, sort: 'recent' });
    return result.projects;
  }

  async getBySlug(slug: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        slug,
        visibility: { in: [ProjectVisibility.PUBLIC, ProjectVisibility.UNLISTED] },
      },
      include: {
        owner: { select: { displayName: true, id: true } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    const forkCount = await this.prisma.project.count({
      where: { forkedFromId: project.id },
    });
    return {
      id: project.id,
      slug: project.slug,
      name: project.name,
      description: project.description,
      type: project.type,
      boardType: project.boardType,
      workspaceJson: project.workspaceJson,
      visibility: project.visibility,
      owner: project.owner,
      updatedAt: project.updatedAt,
      forkCount,
      tags: this.projectTags(project),
    };
  }

  async getRelated(slug: string) {
    const project = await this.prisma.project.findFirst({
      where: { slug, visibility: ProjectVisibility.PUBLIC },
    });
    if (!project) throw new NotFoundException('Project not found');

    const related = await this.prisma.project.findMany({
      where: {
        visibility: ProjectVisibility.PUBLIC,
        id: { not: project.id },
        OR: [{ boardType: project.boardType }, { type: project.type }],
      },
      take: 6,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        slug: true,
        name: true,
        type: true,
        boardType: true,
        updatedAt: true,
        owner: { select: { displayName: true } },
      },
    });
    return related;
  }

  private projectTags(p: { type: string; boardType?: string | null }) {
    const tags = [p.type.toLowerCase()];
    if (p.boardType) tags.push(p.boardType.replace(/_/g, '-'));
    return tags;
  }

  private extractTags(
    projects: Array<{ type: string; boardType?: string | null }>,
  ): string[] {
    const set = new Set<string>();
    for (const p of projects) {
      this.projectTags(p).forEach((t) => set.add(t));
    }
    return [...set].slice(0, 12);
  }

  async fork(userId: string, slug: string) {
    const source = await this.prisma.project.findFirst({
      where: {
        slug,
        visibility: { in: [ProjectVisibility.PUBLIC, ProjectVisibility.UNLISTED] },
      },
    });
    if (!source) throw new NotFoundException('Project not found');

    const forkSlug = `${slugify(source.name)}-fork-${Date.now().toString(36)}`;
    return this.prisma.project.create({
      data: {
        ownerId: userId,
        name: `${source.name} (Fork)`,
        slug: forkSlug,
        description: source.description,
        type: source.type,
        visibility: ProjectVisibility.PRIVATE,
        workspaceJson: source.workspaceJson as Prisma.InputJsonValue,
        boardType: source.boardType,
        forkedFromId: source.id,
        workspaces: {
          create: {
            name: 'Main',
            workspaceJson: source.workspaceJson as Prisma.InputJsonValue,
          },
        },
      },
    });
  }

  async publish(userId: string, projectId: string, visibility: ProjectVisibility) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerId !== userId) throw new ForbiddenException('Access denied');

    let slug = project.slug;
    if (!slug && visibility !== ProjectVisibility.PRIVATE) {
      const base = slugify(project.name);
      slug = base;
      let counter = 1;
      while (await this.prisma.project.findUnique({ where: { slug } })) {
        slug = `${base}-${counter++}`;
      }
    }

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        visibility,
        ...(slug ? { slug } : {}),
      },
    });
  }
}
