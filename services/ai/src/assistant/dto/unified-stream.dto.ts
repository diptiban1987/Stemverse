import { IsEnum, IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { ExplainLevelDto } from './ai.dto';
import type { AiStreamMode } from '../../streaming/stream-events';

const STREAM_MODES: AiStreamMode[] = [
  'chat',
  'text_to_blocks',
  'explain_block',
  'explain_code',
  'copilot',
  'optimize',
  'debug',
  'auto_fix',
];

export class UnifiedStreamRequestDto {
  @IsIn(STREAM_MODES)
  mode!: AiStreamMode;

  @IsOptional()
  @IsString()
  requestId?: string;

  @IsOptional()
  @IsString()
  prompt?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsObject()
  workspace?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  generatedCode?: string;

  @IsOptional()
  validationIssues?: Array<{ code: string; message: string; severity: string }>;

  @IsOptional()
  @IsObject()
  simulatorMetadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  boardSlug?: string;

  @IsOptional()
  @IsString()
  blockType?: string;

  @IsOptional()
  @IsObject()
  fields?: Record<string, string | number>;

  @IsOptional()
  @IsEnum(ExplainLevelDto)
  level?: ExplainLevelDto;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  fallbackModel?: string;

  @IsOptional()
  @IsString()
  provider?: string;
}
