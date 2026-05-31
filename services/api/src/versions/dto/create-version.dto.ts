import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateVersionDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsObject()
  workspaceJson?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  generatedCode?: string;

  @IsOptional()
  @IsObject()
  simulatorMetadata?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  aiSessionMetadata?: Record<string, unknown>;
}
