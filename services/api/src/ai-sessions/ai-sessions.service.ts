import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAiSettingsDto, CreateAiSessionDto } from './dto/update-ai-settings.dto';

@Injectable()
export class AiSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  listSessions(userId: string, projectId?: string) {
    return this.prisma.aiSession.findMany({
      where: {
        userId,
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
  }

  getSession(userId: string, sessionId: string) {
    return this.prisma.aiSession.findFirst({
      where: { id: sessionId, userId },
    });
  }

  createSession(userId: string, dto: CreateAiSessionDto) {
    return this.prisma.aiSession.create({
      data: {
        userId,
        projectId: dto.projectId,
        title: dto.title,
        model: dto.model,
        messages: (dto.messages ?? []) as Prisma.InputJsonValue,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async updateSession(
    userId: string,
    sessionId: string,
    data: { title?: string; messages?: unknown[]; metadata?: Record<string, unknown> },
  ) {
    const session = await this.prisma.aiSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) throw new NotFoundException('Session not found');
    return this.prisma.aiSession.update({
      where: { id: sessionId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.messages !== undefined && { messages: data.messages as Prisma.InputJsonValue }),
        ...(data.metadata !== undefined && { metadata: data.metadata as Prisma.InputJsonValue }),
      },
    });
  }

  async deleteSession(userId: string, sessionId: string) {
    await this.prisma.aiSession.deleteMany({ where: { id: sessionId, userId } });
    return { success: true };
  }

  async getSettings(userId: string) {
    let settings = await this.prisma.aiUserSettings.findUnique({
      where: { userId },
    });
    if (!settings) {
      settings = await this.prisma.aiUserSettings.create({
        data: { userId },
      });
    }
    return settings;
  }

  updateSettings(userId: string, dto: UpdateAiSettingsDto) {
    return this.prisma.aiUserSettings.upsert({
      where: { userId },
      create: {
        userId,
        preferredModel: dto.preferredModel,
        fallbackModel: dto.fallbackModel,
        temperature: dto.temperature ?? 0.7,
        maxTokens: dto.maxTokens ?? 1024,
        streamingEnabled: dto.streamingEnabled ?? true,
      },
      update: {
        ...(dto.preferredModel !== undefined && { preferredModel: dto.preferredModel }),
        ...(dto.fallbackModel !== undefined && { fallbackModel: dto.fallbackModel }),
        ...(dto.temperature !== undefined && { temperature: dto.temperature }),
        ...(dto.maxTokens !== undefined && { maxTokens: dto.maxTokens }),
        ...(dto.streamingEnabled !== undefined && { streamingEnabled: dto.streamingEnabled }),
      },
    });
  }
}
