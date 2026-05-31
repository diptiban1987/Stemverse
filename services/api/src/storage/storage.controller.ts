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
import { AssetPurpose } from '@stemverse/database';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, JwtAuthGuard, Public } from '@stemverse/auth';
import { PresignUploadDto } from './dto/storage.dto';
import { StorageService } from './storage.service';

@Controller('storage')
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Public()
  @Get('health')
  storageHealth() {
    return this.storage.checkStorageHealth();
  }

  @Post('presign/upload')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  presignUpload(@CurrentUser() user: { id: string }, @Body() dto: PresignUploadDto) {
    return this.storage.createPresignedUpload({
      userId: user.id,
      purpose: dto.purpose,
      mimeType: dto.mimeType.toLowerCase(),
      sizeBytes: dto.sizeBytes,
      filename: dto.filename,
      projectId: dto.projectId,
      listingId: dto.listingId,
      aiSessionId: dto.aiSessionId,
      metadata: dto.metadata,
    });
  }

  @Post('assets/:id/confirm')
  confirmUpload(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.storage.confirmUpload(user.id, id);
  }

  @Get('assets/:id/download-url')
  presignDownload(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.storage.createPresignedDownload(user.id, id);
  }

  @Delete('assets/:id')
  deleteAsset(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.storage.deleteAsset(user.id, id);
  }

  @Get('projects/:projectId/assets')
  listProjectAssets(
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Query('purpose') purpose?: AssetPurpose,
  ) {
    return this.storage.listProjectAssets(user.id, projectId, purpose);
  }
}
