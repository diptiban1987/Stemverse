import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProjectType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

const DEFAULT_SCRATCH_WORKSPACE: Prisma.InputJsonValue = {
  targets: [],
  meta: { semver: '3.0.0', vm: '0.2.0', agent: 'STEMVerse' },
};

const DEFAULT_ROBOTICS_WORKSPACE: Prisma.InputJsonValue = {
  project_id: '',
  name: 'Untitled Robotics Project',
  board: 'arduino_uno',
  language: 'arduino_cpp',
  blocks: null,
  variables: [],
  functions: [],
  libraries: [],
};

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  listForUser(userId: string, type?: ProjectType) {
    return this.prisma.project.findMany({
      where: {
        ownerId: userId,
        ...(type ? { type } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        visibility: true,
        thumbnailUrl: true,
        updatedAt: true,
        createdAt: true,
      },
    });
  }

  async getById(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        workspaces: { orderBy: { updatedAt: 'desc' }, take: 1 },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return project;
  }

  async create(userId: string, dto: CreateProjectDto, ip?: string) {
    const type = dto.type ?? ProjectType.SCRATCH;
    const defaultWorkspace =
      type === ProjectType.ROBOTICS ? DEFAULT_ROBOTICS_WORKSPACE : DEFAULT_SCRATCH_WORKSPACE;
    const workspaceJson = dto.workspaceJson ?? defaultWorkspace;

    const project = await this.prisma.project.create({
      data: {
        ownerId: userId,
        name: dto.name,
        description: dto.description,
        type,
        visibility: dto.visibility,
        boardType: dto.boardType ?? (type === ProjectType.ROBOTICS ? 'arduino_uno' : null),
        workspaceJson,
        workspaces: {
          create: {
            name: 'Main',
            workspaceJson,
          },
        },
      },
      include: { workspaces: true },
    });

    await this.audit.log({
      userId,
      action: 'project.create',
      resource: 'project',
      resourceId: project.id,
      ipAddress: ip,
    });

    return project;
  }

  async update(
    userId: string,
    projectId: string,
    dto: UpdateProjectDto,
    ip?: string,
  ) {
    await this.ensureOwner(userId, projectId);

    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.visibility !== undefined && { visibility: dto.visibility }),
        ...(dto.workspaceJson !== undefined && {
          workspaceJson: dto.workspaceJson,
        }),
        ...(dto.thumbnailUrl !== undefined && {
          thumbnailUrl: dto.thumbnailUrl,
        }),
        ...(dto.boardType !== undefined && { boardType: dto.boardType }),
      },
    });

    if (dto.workspaceJson !== undefined) {
      const workspace = await this.prisma.workspace.findFirst({
        where: { projectId },
        orderBy: { updatedAt: 'desc' },
      });
      if (workspace) {
        await this.prisma.workspace.update({
          where: { id: workspace.id },
          data: {
            workspaceJson: dto.workspaceJson,
            version: { increment: 1 },
          },
        });
      }
    }

    await this.audit.log({
      userId,
      action: 'project.update',
      resource: 'project',
      resourceId: projectId,
      ipAddress: ip,
    });

    return project;
  }

  async remove(userId: string, projectId: string, ip?: string) {
    await this.ensureOwner(userId, projectId);
    await this.prisma.project.delete({ where: { id: projectId } });
    await this.audit.log({
      userId,
      action: 'project.delete',
      resource: 'project',
      resourceId: projectId,
      ipAddress: ip,
    });
    return { success: true };
  }

  private async ensureOwner(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }
  }
}
