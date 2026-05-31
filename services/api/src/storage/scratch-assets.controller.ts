import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AssetPurpose } from '@stemverse/database';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, JwtAuthGuard } from '@stemverse/auth';
import { PresignUploadDto } from './dto/storage.dto';
import { StorageService } from './storage.service';

/** Scratch costume/sound upload pipeline (pre-signed URLs, no scratch-gui). */
@Controller('scratch/projects')
@UseGuards(JwtAuthGuard)
export class ScratchAssetsController {
  constructor(private readonly storage: StorageService) {}

  @Get(':projectId/assets/manifest')
  manifest(@CurrentUser() user: { id: string }, @Param('projectId') projectId: string) {
    return this.storage.getScratchAssetManifest(projectId, user.id);
  }

  @Get(':projectId/assets')
  list(@CurrentUser() user: { id: string }, @Param('projectId') projectId: string) {
    return this.storage.listScratchAssets(user.id, projectId);
  }

  @Post(':projectId/assets/presign')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  presign(
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Body() dto: PresignUploadDto,
  ) {
    if (
      dto.purpose !== AssetPurpose.SCRATCH_COSTUME &&
      dto.purpose !== AssetPurpose.SCRATCH_SOUND
    ) {
      dto.purpose =
        dto.mimeType.startsWith('audio/') ? AssetPurpose.SCRATCH_SOUND : AssetPurpose.SCRATCH_COSTUME;
    }
    return this.storage.createPresignedUpload({
      userId: user.id,
      purpose: dto.purpose,
      mimeType: dto.mimeType.toLowerCase(),
      sizeBytes: dto.sizeBytes,
      filename: dto.filename,
      projectId,
      metadata: { ...dto.metadata, scratch: true },
    });
  }

  @Post(':projectId/assets/resolve-urls')
  resolveUrls(
    @CurrentUser() user: { id: string },
    @Body() body: { assetIds: string[] },
  ) {
    return this.storage.resolveAssetDownloadUrls(user.id, body.assetIds ?? []);
  }
}
