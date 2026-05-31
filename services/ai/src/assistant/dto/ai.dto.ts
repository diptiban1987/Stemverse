import { IsArray, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export enum ExplainLevelDto {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export class ExplainBlockDto {
  @IsString()
  blockType!: string;

  @IsOptional()
  @IsObject()
  fields?: Record<string, string | number>;

  @IsEnum(ExplainLevelDto)
  level!: ExplainLevelDto;

  @IsOptional()
  @IsString()
  boardSlug?: string;

  @IsOptional()
  @IsString()
  provider?: string;
}

export class ExplainCodeDto {
  @IsString()
  code!: string;

  @IsEnum(ExplainLevelDto)
  level!: ExplainLevelDto;

  @IsOptional()
  @IsString()
  boardSlug?: string;

  @IsOptional()
  @IsString()
  provider?: string;
}

export class TextToBlocksDto {
  @IsString()
  prompt!: string;

  @IsOptional()
  @IsString()
  boardSlug?: string;

  @IsOptional()
  @IsString()
  provider?: string;
}

export class TextToProjectDto {
  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  boardSlug?: string;

  @IsOptional()
  @IsString()
  provider?: string;
}

export class WiringDto {
  @IsObject()
  workspace!: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  blockTypes?: string[];

  @IsOptional()
  blockFields?: Array<Record<string, string | number>>;

  @IsOptional()
  @IsString()
  provider?: string;
}

export class CopilotDto {
  @IsObject()
  workspace!: Record<string, unknown>;

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
  model?: string;

  @IsOptional()
  @IsString()
  fallbackModel?: string;
}

export class AutoFixDto {
  @IsObject()
  workspace!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  boardSlug?: string;
}

export class SimulatorAssistDto {
  @IsObject()
  workspace!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  generatedCode?: string;

  @IsOptional()
  @IsObject()
  simulatorMetadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  boardSlug?: string;

  @IsOptional()
  @IsString()
  model?: string;
}
