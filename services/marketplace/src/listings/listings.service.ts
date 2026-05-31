import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  MarketplaceItemType,
  MarketplaceListingStatus,
  Prisma,
  ProjectType,
  ProjectVisibility,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { validatePluginManifest, type PluginManifest } from '../plugin/plugin-manifest';

export type SearchQuery = {
  type?: MarketplaceItemType;
  category?: string;
  q?: string;
  status?: MarketplaceListingStatus;
};

@Injectable()
export class ListingsService {
  constructor(private readonly prisma: PrismaService) {}

  search(query: SearchQuery = {}) {
    const status = query.status ?? MarketplaceListingStatus.PUBLISHED;
    return this.prisma.marketplaceListing.findMany({
      where: {
        status,
        ...(query.type ? { type: query.type } : {}),
        ...(query.category ? { category: query.category } : {}),
        ...(query.q
          ? {
              OR: [
                { title: { contains: query.q, mode: 'insensitive' } },
                { description: { contains: query.q, mode: 'insensitive' } },
                { slug: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ installCount: 'desc' }, { publishedAt: 'desc' }],
      include: {
        author: { select: { id: true, displayName: true, email: true } },
      },
    });
  }

  categories(type?: MarketplaceItemType) {
    return this.prisma.marketplaceListing.groupBy({
      by: ['category'],
      where: {
        status: MarketplaceListingStatus.PUBLISHED,
        ...(type ? { type } : {}),
      },
      _count: { category: true },
    });
  }

  async getBySlug(slug: string) {
    const listing = await this.prisma.marketplaceListing.findUnique({
      where: { slug },
      include: {
        author: { select: { id: true, displayName: true } },
        project: { select: { id: true, name: true, type: true, boardType: true } },
        course: { select: { id: true, title: true, slug: true, level: true } },
      },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }

  async publishPlugin(authorId: string, manifest: PluginManifest) {
    const { valid, errors } = validatePluginManifest(manifest);
    if (!valid) throw new ForbiddenException({ message: 'Invalid plugin.json', errors });

    return this.prisma.marketplaceListing.upsert({
      where: { slug: manifest.slug },
      create: {
        slug: manifest.slug,
        type: MarketplaceItemType.PLUGIN,
        title: manifest.name,
        description: manifest.description,
        category: manifest.category,
        authorId,
        version: manifest.version,
        status: MarketplaceListingStatus.PUBLISHED,
        pluginManifest: manifest as object,
        tags: manifest.blocks ?? [],
        publishedAt: new Date(),
        metadata: { author: manifest.author, generators: manifest.generators },
      },
      update: {
        title: manifest.name,
        description: manifest.description,
        version: manifest.version,
        pluginManifest: manifest as object,
        status: MarketplaceListingStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
  }

  async publishComponent(
    authorId: string,
    data: {
      kind: 'sensor' | 'actuator' | 'display' | 'board';
      slug: string;
      title: string;
      description: string;
      category: string;
      payload: Record<string, unknown>;
    },
  ) {
    const typeMap = {
      sensor: MarketplaceItemType.COMPONENT_SENSOR,
      actuator: MarketplaceItemType.COMPONENT_ACTUATOR,
      display: MarketplaceItemType.COMPONENT_DISPLAY,
      board: MarketplaceItemType.COMPONENT_BOARD,
    } as const;

    const listingSlug = `component-${data.kind}-${data.slug}`;
    return this.prisma.marketplaceListing.upsert({
      where: { slug: listingSlug },
      create: {
        slug: listingSlug,
        type: typeMap[data.kind],
        title: data.title,
        description: data.description,
        category: data.category,
        authorId,
        componentSlug: data.slug,
        componentKind: data.kind,
        status: MarketplaceListingStatus.PUBLISHED,
        metadata: data.payload as Prisma.InputJsonValue,
        publishedAt: new Date(),
      },
      update: {
        title: data.title,
        description: data.description,
        metadata: data.payload as Prisma.InputJsonValue,
        status: MarketplaceListingStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
  }

  async publishCourse(authorId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    const listingSlug = `course-${course.slug}`;
    return this.prisma.$transaction(async (tx) => {
      await tx.course.update({ where: { id: courseId }, data: { published: true } });
      return tx.marketplaceListing.upsert({
        where: { slug: listingSlug },
        create: {
          slug: listingSlug,
          type: MarketplaceItemType.COURSE,
          title: course.title,
          description: course.description ?? undefined,
          category: course.category,
          authorId,
          courseId,
          status: MarketplaceListingStatus.PUBLISHED,
          metadata: { level: course.level },
          publishedAt: new Date(),
        },
        update: {
          title: course.title,
          description: course.description ?? undefined,
          status: MarketplaceListingStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      });
    });
  }

  async publishProject(authorId: string, projectId: string, userRole: UserRole) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerId !== authorId && userRole !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Not your project');
    }
    const listingSlug = `project-${project.id.slice(0, 8)}`;
    return this.prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: { visibility: ProjectVisibility.PUBLIC },
      });
      return tx.marketplaceListing.upsert({
        where: { slug: listingSlug },
        create: {
          slug: listingSlug,
          type: MarketplaceItemType.PROJECT,
          title: project.name,
          description: project.description ?? undefined,
          category: mapProjectCategory(project.type),
          authorId,
          projectId,
          status: MarketplaceListingStatus.PUBLISHED,
          metadata: {
            projectType: project.type,
            boardType: project.boardType,
          },
          publishedAt: new Date(),
        },
        update: {
          title: project.name,
          description: project.description ?? undefined,
          status: MarketplaceListingStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      });
    });
  }
}

function mapProjectCategory(type: ProjectType): string {
  switch (type) {
    case ProjectType.ROBOTICS:
      return 'robotics';
    case ProjectType.IOT:
      return 'iot';
    case ProjectType.SCRATCH:
      return 'scratch';
    default:
      return 'general';
  }
}
