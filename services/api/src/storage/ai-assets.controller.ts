import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { AssetPurpose } from '@stemverse/database';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, JwtAuthGuard } from '@stemverse/auth';
import { PresignUploadDto } from './dto/storage.dto';
import { StorageService } from './storage.service';

const AI_PURPOSES = new Set<AssetPurpose>([
  AssetPurpose.AI_DIAGRAM,
  AssetPurpose.AI_WIRING,
  AssetPurpose.AI_IMAGE,
  AssetPurpose.AI_PROJECT_ASSET,
]);

@Controller('ai/sessions')
@UseGuards(JwtAuthGuard)
export class AiAssetsController {
  constructor(private readonly storage: StorageService) {}

  @Post(':sessionId/assets/presign')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  presign(
    @CurrentUser() user: { id: string },
    @Param('sessionId') sessionId: string,
    @Body() dto: PresignUploadDto,
  ) {
    const purpose = AI_PURPOSES.has(dto.purpose) ? dto.purpose : AssetPurpose.AI_IMAGE;
    return this.storage.createPresignedUpload({
      userId: user.id,
      purpose,
      mimeType: dto.mimeType.toLowerCase(),
      sizeBytes: dto.sizeBytes,
      filename: dto.filename,
      aiSessionId: sessionId,
      projectId: dto.projectId,
      metadata: { ...dto.metadata, aiStudio: true },
    });
  }
}
