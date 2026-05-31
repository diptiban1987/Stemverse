import {
  buildWorkspaceDocument,
  collectLibrariesForDocument,
  explainBlock,
  explainCode,
  extractBlockInfoFromDocument,
  generateCodeForDocument,
  parseNaturalLanguageToWorkspace,
  suggestWiring,
} from '@stemverse/blockly-engine';
import type {
  AiProvider,
  ExplainBlockRequest,
  ExplainCodeRequest,
  ExplainResult,
  TextToBlocksRequest,
  TextToBlocksResult,
  TextToProjectRequest,
  TextToProjectResult,
  WiringRequest,
  WiringResult,
} from './ai-provider.interface';

export class RuleBasedProvider implements AiProvider {
  readonly name = 'rule-based';

  async explainBlock(req: ExplainBlockRequest): Promise<ExplainResult> {
    return {
      explanation: explainBlock(req.blockType, req.fields ?? {}, req.level),
      provider: this.name,
    };
  }

  async explainCode(req: ExplainCodeRequest): Promise<ExplainResult> {
    return {
      explanation: explainCode(req.code, req.level),
      provider: this.name,
    };
  }

  async textToBlocks(req: TextToBlocksRequest): Promise<TextToBlocksResult> {
    const parsed = parseNaturalLanguageToWorkspace(req.prompt, req.boardSlug);
    const workspace = buildWorkspaceDocument(parsed);
    return {
      workspace,
      summary: parsed.summary,
      matchedPattern: parsed.matchedPattern,
      provider: this.name,
    };
  }

  async textToProject(req: TextToProjectRequest): Promise<TextToProjectResult> {
    const parsed = parseNaturalLanguageToWorkspace(req.description, req.boardSlug);
    const workspace = buildWorkspaceDocument(parsed);
    const generatedCode = generateCodeForDocument(workspace);
    const libraries = collectLibrariesForDocument(workspace);
    const { blockTypes, blockFields } = extractBlockInfoFromDocument(workspace);
    const wiring = suggestWiring(workspace, blockTypes, blockFields);

    return {
      name: parsed.name,
      board: parsed.board,
      workspace,
      generatedCode,
      libraries,
      wiring,
      summary: parsed.summary,
      provider: this.name,
    };
  }

  async suggestWiring(req: WiringRequest): Promise<WiringResult> {
    let blockTypes = req.blockTypes ?? [];
    let blockFields = req.blockFields ?? [];
    if (blockTypes.length === 0) {
      const extracted = extractBlockInfoFromDocument(req.workspace);
      blockTypes = extracted.blockTypes;
      blockFields = extracted.blockFields;
    }
    const result = suggestWiring(req.workspace, blockTypes, blockFields);
    return { ...result, provider: this.name };
  }
}
