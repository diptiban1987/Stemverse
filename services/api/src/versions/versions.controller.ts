import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '@stemverse/auth';
import { CreateVersionDto } from './dto/create-version.dto';
import { VersionsService } from './versions.service';

@Controller('projects/:projectId/versions')
@UseGuards(JwtAuthGuard)
export class VersionsController {
  constructor(private readonly versions: VersionsService) {}

  @Get()
  list(@CurrentUser() user: { id: string }, @Param('projectId') projectId: string) {
    return this.versions.list(user.id, projectId);
  }

  @Get('compare')
  compare(
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Query('a') versionA: string,
    @Query('b') versionB: string,
  ) {
    return this.versions.compare(user.id, projectId, versionA, versionB);
  }

  @Get(':versionId')
  get(
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.versions.get(user.id, projectId, versionId);
  }

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Body() dto: CreateVersionDto,
  ) {
    return this.versions.create(user.id, projectId, dto);
  }

  @Post(':versionId/restore')
  restore(
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.versions.restore(user.id, projectId, versionId);
  }

  @Delete(':versionId')
  remove(
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.versions.remove(user.id, projectId, versionId);
  }
}
