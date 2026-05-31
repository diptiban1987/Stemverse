import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '@stemverse/auth';
import { CreateAiSessionDto, UpdateAiSettingsDto } from './dto/update-ai-settings.dto';
import { AiSessionsService } from './ai-sessions.service';

@Controller('ai-studio')
@UseGuards(JwtAuthGuard)
export class AiSessionsController {
  constructor(private readonly aiSessions: AiSessionsService) {}

  @Get('settings')
  getSettings(@CurrentUser() user: { id: string }) {
    return this.aiSessions.getSettings(user.id);
  }

  @Put('settings')
  updateSettings(@CurrentUser() user: { id: string }, @Body() dto: UpdateAiSettingsDto) {
    return this.aiSessions.updateSettings(user.id, dto);
  }

  @Get('sessions')
  listSessions(
    @CurrentUser() user: { id: string },
    @Query('projectId') projectId?: string,
  ) {
    return this.aiSessions.listSessions(user.id, projectId);
  }

  @Get('sessions/:sessionId')
  getSession(@CurrentUser() user: { id: string }, @Param('sessionId') sessionId: string) {
    return this.aiSessions.getSession(user.id, sessionId);
  }

  @Post('sessions')
  createSession(@CurrentUser() user: { id: string }, @Body() dto: CreateAiSessionDto) {
    return this.aiSessions.createSession(user.id, dto);
  }

  @Put('sessions/:sessionId')
  updateSession(
    @CurrentUser() user: { id: string },
    @Param('sessionId') sessionId: string,
    @Body() body: { title?: string; messages?: unknown[]; metadata?: Record<string, unknown> },
  ) {
    return this.aiSessions.updateSession(user.id, sessionId, body);
  }

  @Delete('sessions/:sessionId')
  deleteSession(@CurrentUser() user: { id: string }, @Param('sessionId') sessionId: string) {
    return this.aiSessions.deleteSession(user.id, sessionId);
  }
}
