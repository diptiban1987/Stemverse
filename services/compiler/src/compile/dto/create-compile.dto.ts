import { IsEnum, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export enum CompileBoard {
  ESP32 = 'esp32',
  ESP32_S3 = 'esp32_s3',
  ARDUINO_UNO = 'arduino_uno',
}

export class CreateCompileJobDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsEnum(CompileBoard)
  board!: CompileBoard;

  @IsOptional()
  @IsString()
  sourceCode?: string;

  @IsOptional()
  @IsObject()
  workspaceJson?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  projectName?: string;
}
