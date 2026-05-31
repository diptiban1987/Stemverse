import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { IntegrationsController } from './integrations/integrations.controller';
import { ListingsController } from './listings/listings.controller';
import { ListingsService } from './listings/listings.service';
import { PluginsController } from './plugin/plugins.controller';
import { PluginLifecycleService } from './plugin/plugin-lifecycle.service';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ListingsController, PluginsController, IntegrationsController],
  providers: [ListingsService, PluginLifecycleService],
})
export class MarketplaceModule {}
