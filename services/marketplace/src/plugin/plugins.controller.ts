import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '@stemverse/auth';
import { PluginLifecycleService } from './plugin-lifecycle.service';

@Controller('plugins')
export class PluginsController {
  constructor(private readonly lifecycle: PluginLifecycleService) {}

  @Get('installed')
  @UseGuards(JwtAuthGuard)
  listInstalled(@CurrentUser() user: { id: string }) {
    return this.lifecycle.listInstalled(user.id);
  }

  @Post(':listingId/install')
  @UseGuards(JwtAuthGuard)
  install(@CurrentUser() user: { id: string }, @Param('listingId') listingId: string) {
    return this.lifecycle.install(user.id, listingId);
  }

  @Post(':listingId/enable')
  @UseGuards(JwtAuthGuard)
  enable(@CurrentUser() user: { id: string }, @Param('listingId') listingId: string) {
    return this.lifecycle.enable(user.id, listingId);
  }

  @Post(':listingId/disable')
  @UseGuards(JwtAuthGuard)
  disable(@CurrentUser() user: { id: string }, @Param('listingId') listingId: string) {
    return this.lifecycle.disable(user.id, listingId);
  }

  @Post(':listingId/upgrade')
  @UseGuards(JwtAuthGuard)
  upgrade(@CurrentUser() user: { id: string }, @Param('listingId') listingId: string) {
    return this.lifecycle.upgrade(user.id, listingId);
  }

  @Delete(':listingId')
  @UseGuards(JwtAuthGuard)
  remove(@CurrentUser() user: { id: string }, @Param('listingId') listingId: string) {
    return this.lifecycle.remove(user.id, listingId);
  }
}
