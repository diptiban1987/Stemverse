import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ProjectType, ProjectVisibility } from '@prisma/client';
import { CurrentUser, JwtAuthGuard, Public } from '@stemverse/auth';
import { CommunityService } from './community.service';

@Controller('community')
export class CommunityController {
  constructor(private readonly community: CommunityService) {}

  @Public()
  @Get('browse')
  browse(
    @Query('type') type?: ProjectType,
    @Query('q') q?: string,
    @Query('board') board?: string,
    @Query('tag') tag?: string,
    @Query('sort') sort?: 'trending' | 'recent' | 'featured',
  ) {
    return this.community.browse({ type, q, board, tag, sort });
  }

  @Public()
  @Get('projects')
  listPublic(@Query('type') type?: ProjectType) {
    return this.community.listPublic(type);
  }

  @Public()
  @Get('projects/:slug/related')
  related(@Param('slug') slug: string) {
    return this.community.getRelated(slug);
  }

  @Public()
  @Get('projects/:slug')
  getBySlug(@Param('slug') slug: string) {
    return this.community.getBySlug(slug);
  }

  @UseGuards(JwtAuthGuard)
  @Post('projects/:slug/fork')
  fork(@CurrentUser() user: { id: string }, @Param('slug') slug: string) {
    return this.community.fork(user.id, slug);
  }

  @UseGuards(JwtAuthGuard)
  @Post('publish/:projectId')
  publish(
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Body() body: { visibility: ProjectVisibility },
  ) {
    return this.community.publish(user.id, projectId, body.visibility);
  }
}
