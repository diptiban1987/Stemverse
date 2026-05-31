import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiAssetsController } from './ai-assets.controller';
import { MarketplaceAssetsController } from './marketplace-assets.controller';
import { ScratchAssetsController } from './scratch-assets.controller';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    StorageController,
    ScratchAssetsController,
    AiAssetsController,
    MarketplaceAssetsController,
  ],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
