import { IsArray, IsBoolean, IsNumber, IsObject, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class UpdateAiSettingsDto {
  @IsOptional()
  @IsString()
  preferredModel?: string;

  @IsOptional()
  @IsString()
  fallbackModel?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(64)
  @Max(8192)
  maxTokens?: number;

  @IsOptional()
  @IsBoolean()
  streamingEnabled?: boolean;
}

export class CreateAiSessionDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsArray()
  messages?: unknown[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
