import { Inject, Injectable } from '@nestjs/common';
import type { WorkspaceDocument } from '@stemverse/blockly-engine';
import { CopilotService } from '../copilot/copilot.service';
import { AiModelRouterService } from '../routing/ai-model-router.service';
import { ProviderRegistry } from '../providers/provider.registry';
import type {
  AutoFixDto,
  CopilotDto,
  ExplainBlockDto,
  ExplainCodeDto,
  SimulatorAssistDto,
  TextToBlocksDto,
  TextToProjectDto,
  WiringDto,
} from './dto/ai.dto';

@Injectable()
export class AssistantService {
  constructor(
    @Inject(ProviderRegistry) private readonly providers: ProviderRegistry,
    @Inject(CopilotService) private readonly copilot: CopilotService,
    @Inject(AiModelRouterService) private readonly router: AiModelRouterService,
  ) {}

  listProviders() {
    return {
      providers: this.providers.listProviders(),
      models: this.router.listAvailableModels(),
    };
  }

  explainBlock(dto: ExplainBlockDto) {
    const provider = this.providers.resolve(dto.provider);
    return provider.explainBlock({
      blockType: dto.blockType,
      fields: dto.fields,
      level: dto.level,
      boardSlug: dto.boardSlug,
    });
  }

  explainCode(dto: ExplainCodeDto) {
    const provider = this.providers.resolve(dto.provider);
    return provider.explainCode({
      code: dto.code,
      level: dto.level,
      boardSlug: dto.boardSlug,
    });
  }

  textToBlocks(dto: TextToBlocksDto) {
    const provider = this.providers.resolve(dto.provider);
    return provider.textToBlocks({
      prompt: dto.prompt,
      boardSlug: dto.boardSlug,
    });
  }

  textToProject(dto: TextToProjectDto) {
    const provider = this.providers.resolve(dto.provider);
    return provider.textToProject({
      description: dto.description,
      boardSlug: dto.boardSlug,
    });
  }

  suggestWiring(dto: WiringDto) {
    const provider = this.providers.resolve(dto.provider);
    return provider.suggestWiring({
      workspace: dto.workspace as WorkspaceDocument,
      blockTypes: dto.blockTypes,
      blockFields: dto.blockFields,
    });
  }

  analyzeCopilot(dto: CopilotDto) {
    return this.copilot.analyzeCopilot({
      workspace: dto.workspace as WorkspaceDocument,
      generatedCode: dto.generatedCode,
      validationIssues: dto.validationIssues,
      simulatorMetadata: dto.simulatorMetadata,
      boardSlug: dto.boardSlug,
      model: dto.model,
      fallbackModel: dto.fallbackModel,
    });
  }

  analyzeAutoFix(dto: AutoFixDto) {
    return this.copilot.analyzeAutoFix({
      workspace: dto.workspace as WorkspaceDocument,
      boardSlug: dto.boardSlug,
    });
  }

  simulatorAssist(dto: SimulatorAssistDto) {
    return this.copilot.simulatorAssist({
      workspace: dto.workspace as WorkspaceDocument,
      generatedCode: dto.generatedCode,
      simulatorMetadata: dto.simulatorMetadata,
      boardSlug: dto.boardSlug,
      model: dto.model,
    });
  }

  listModels() {
    return { models: this.router.listAvailableModels() };
  }
}
