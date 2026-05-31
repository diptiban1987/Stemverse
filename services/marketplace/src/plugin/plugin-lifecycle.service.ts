import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { MarketplaceItemType, PluginInstallState } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PluginLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  private async getPluginListing(listingId: string) {
    const listing = await this.prisma.marketplaceListing.findUnique({
      where: { id: listingId },
    });
    if (!listing || listing.type !== MarketplaceItemType.PLUGIN) {
      throw new NotFoundException('Plugin listing not found');
    }
    return listing;
  }

  async install(userId: string, listingId: string) {
    const listing = await this.getPluginListing(listingId);
    const install = await this.prisma.pluginInstallation.upsert({
      where: { userId_listingId: { userId, listingId } },
      create: {
        userId,
        listingId,
        version: listing.version,
        state: PluginInstallState.ENABLED,
      },
      update: {
        version: listing.version,
        state: PluginInstallState.ENABLED,
        updatedAt: new Date(),
      },
    });
    await this.prisma.marketplaceListing.update({
      where: { id: listingId },
      data: { installCount: { increment: 1 } },
    });
    return { installation: install, action: 'install' };
  }

  async enable(userId: string, listingId: string) {
    return this.setState(userId, listingId, PluginInstallState.ENABLED, 'enable');
  }

  async disable(userId: string, listingId: string) {
    return this.setState(userId, listingId, PluginInstallState.DISABLED, 'disable');
  }

  async upgrade(userId: string, listingId: string) {
    const listing = await this.getPluginListing(listingId);
    const existing = await this.prisma.pluginInstallation.findUnique({
      where: { userId_listingId: { userId, listingId } },
    });
    if (!existing) throw new NotFoundException('Plugin not installed');
    const updated = await this.prisma.pluginInstallation.update({
      where: { id: existing.id },
      data: { version: listing.version, state: PluginInstallState.ENABLED },
    });
    return { installation: updated, action: 'upgrade', version: listing.version };
  }

  async remove(userId: string, listingId: string) {
    await this.getPluginListing(listingId);
    const existing = await this.prisma.pluginInstallation.findUnique({
      where: { userId_listingId: { userId, listingId } },
    });
    if (!existing) throw new NotFoundException('Plugin not installed');
    await this.prisma.pluginInstallation.delete({ where: { id: existing.id } });
    return { success: true, action: 'remove' };
  }

  listInstalled(userId: string) {
    return this.prisma.pluginInstallation.findMany({
      where: { userId },
      include: {
        listing: {
          select: {
            id: true,
            slug: true,
            title: true,
            version: true,
            category: true,
            pluginManifest: true,
          },
        },
      },
    });
  }

  private async setState(
    userId: string,
    listingId: string,
    state: PluginInstallState,
    action: string,
  ) {
    await this.getPluginListing(listingId);
    const existing = await this.prisma.pluginInstallation.findUnique({
      where: { userId_listingId: { userId, listingId } },
    });
    if (!existing) {
      throw new BadRequestException('Install the plugin before changing state');
    }
    const updated = await this.prisma.pluginInstallation.update({
      where: { id: existing.id },
      data: { state },
    });
    return { installation: updated, action };
  }
}
