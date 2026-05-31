import { AssetPurpose } from '@stemverse/database';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class PresignUploadDto {
  @IsEnum(AssetPurpose)
  purpose!: AssetPurpose;

  @IsString()
  mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(26_214_400)
  sizeBytes!: number;

  @IsOptional()
  @IsString()
  filename?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  listingId?: string;

  @IsOptional()
  @IsUUID()
  aiSessionId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
