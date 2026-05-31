import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { MarketplaceItemType, UserRole } from '@prisma/client';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '@stemverse/auth';
import { ListingsService } from './listings.service';
import type { PluginManifest } from '../plugin/plugin-manifest';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Get()
  search(
    @Query('type') type?: MarketplaceItemType,
    @Query('category') category?: string,
    @Query('q') q?: string,
  ) {
    return this.listings.search({ type, category, q });
  }

  @Get('categories')
  categories(@Query('type') type?: MarketplaceItemType) {
    return this.listings.categories(type);
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.listings.getBySlug(slug);
  }

  @Post('publish/plugin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MARKETPLACE_CREATOR, UserRole.TEACHER, UserRole.PLATFORM_ADMIN)
  publishPlugin(@CurrentUser() user: { id: string }, @Body() body: PluginManifest) {
    return this.listings.publishPlugin(user.id, body);
  }

  @Post('publish/component')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MARKETPLACE_CREATOR, UserRole.TEACHER, UserRole.PLATFORM_ADMIN)
  publishComponent(
    @CurrentUser() user: { id: string },
    @Body()
    body: {
      kind: 'sensor' | 'actuator' | 'display' | 'board';
      slug: string;
      title: string;
      description: string;
      category: string;
      payload?: Record<string, unknown>;
    },
  ) {
    return this.listings.publishComponent(user.id, {
      ...body,
      payload: body.payload ?? {},
    });
  }

  @Post('publish/course')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.SCHOOL_ADMIN, UserRole.PLATFORM_ADMIN)
  publishCourse(@CurrentUser() user: { id: string }, @Body() body: { courseId: string }) {
    return this.listings.publishCourse(user.id, body.courseId);
  }

  @Post('publish/project')
  @UseGuards(JwtAuthGuard)
  publishProject(
    @CurrentUser() user: { id: string; role: UserRole },
    @Body() body: { projectId: string },
  ) {
    return this.listings.publishProject(user.id, body.projectId, user.role);
  }
}
