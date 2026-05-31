import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { AssetPurpose } from '@stemverse/database';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, JwtAuthGuard } from '@stemverse/auth';
import { PresignUploadDto } from './dto/storage.dto';
import { StorageService } from './storage.service';

const MARKETPLACE_PURPOSES = new Set<AssetPurpose>([
  AssetPurpose.MARKETPLACE_ICON,
  AssetPurpose.MARKETPLACE_PREVIEW,
  AssetPurpose.MARKETPLACE_DOWNLOAD,
]);

@Controller('marketplace/listings')
@UseGuards(JwtAuthGuard)
export class MarketplaceAssetsController {
  constructor(private readonly storage: StorageService) {}

  @Post(':listingId/assets/presign')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  presign(
    @CurrentUser() user: { id: string },
    @Param('listingId') listingId: string,
    @Body() dto: PresignUploadDto,
  ) {
    const purpose = MARKETPLACE_PURPOSES.has(dto.purpose)
      ? dto.purpose
      : AssetPurpose.MARKETPLACE_PREVIEW;
    return this.storage.createPresignedUpload({
      userId: user.id,
      purpose,
      mimeType: dto.mimeType.toLowerCase(),
      sizeBytes: dto.sizeBytes,
      filename: dto.filename,
      listingId,
      metadata: { ...dto.metadata, marketplace: true },
    });
  }
}
