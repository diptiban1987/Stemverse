import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVersionDto } from './dto/create-version.dto';

@Injectable()
export class VersionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, projectId: string) {
    await this.ensureOwner(userId, projectId);
    return this.prisma.projectVersion.findMany({
      where: { projectId },
      orderBy: { versionNumber: 'desc' },
      select: {
        id: true,
        versionNumber: true,
        label: true,
        createdAt: true,
        createdById: true,
        simulatorMetadata: true,
        aiSessionMetadata: true,
      },
    });
  }

  async get(userId: string, projectId: string, versionId: string) {
    await this.ensureOwner(userId, projectId);
    const version = await this.prisma.projectVersion.findFirst({
      where: { id: versionId, projectId },
    });
    if (!version) throw new NotFoundException('Version not found');
    return version;
  }

  async create(userId: string, projectId: string, dto: CreateVersionDto) {
    await this.ensureOwner(userId, projectId);
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');

    const latest = await this.prisma.projectVersion.findFirst({
      where: { projectId },
      orderBy: { versionNumber: 'desc' },
    });
    const versionNumber = (latest?.versionNumber ?? 0) + 1;

    return this.prisma.projectVersion.create({
      data: {
        projectId,
        createdById: userId,
        versionNumber,
        label: dto.label ?? `Version ${versionNumber}`,
        workspaceJson: (dto.workspaceJson ?? project.workspaceJson) as Prisma.InputJsonValue,
        generatedCode: dto.generatedCode,
        simulatorMetadata: dto.simulatorMetadata as Prisma.InputJsonValue | undefined,
        aiSessionMetadata: dto.aiSessionMetadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async restore(userId: string, projectId: string, versionId: string) {
    await this.ensureOwner(userId, projectId);
    const version = await this.get(userId, projectId, versionId);

    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: { workspaceJson: version.workspaceJson as Prisma.InputJsonValue },
    });

    const workspace = await this.prisma.workspace.findFirst({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
    });
    if (workspace) {
      await this.prisma.workspace.update({
        where: { id: workspace.id },
        data: {
          workspaceJson: version.workspaceJson as Prisma.InputJsonValue,
          version: { increment: 1 },
        },
      });
    }

    return { project, restoredVersion: version };
  }

  async compare(userId: string, projectId: string, versionA: string, versionB: string) {
    const [a, b] = await Promise.all([
      this.get(userId, projectId, versionA),
      this.get(userId, projectId, versionB),
    ]);
    return {
      versionA: {
        id: a.id,
        versionNumber: a.versionNumber,
        label: a.label,
        createdAt: a.createdAt,
      },
      versionB: {
        id: b.id,
        versionNumber: b.versionNumber,
        label: b.label,
        createdAt: b.createdAt,
      },
      diff: {
        workspaceChanged: JSON.stringify(a.workspaceJson) !== JSON.stringify(b.workspaceJson),
        codeChanged: a.generatedCode !== b.generatedCode,
        simulatorChanged:
          JSON.stringify(a.simulatorMetadata) !== JSON.stringify(b.simulatorMetadata),
      },
    };
  }

  async remove(userId: string, projectId: string, versionId: string) {
    await this.ensureOwner(userId, projectId);
    await this.prisma.projectVersion.delete({ where: { id: versionId } });
    return { success: true };
  }

  private async ensureOwner(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerId !== userId) throw new ForbiddenException('Access denied');
  }
}
