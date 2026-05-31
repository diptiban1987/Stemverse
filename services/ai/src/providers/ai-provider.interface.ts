import type { ExplainLevel } from '@stemverse/blockly-engine';
import type { WorkspaceDocument } from '@stemverse/blockly-engine';

export type ExplainBlockRequest = {
  blockType: string;
  fields?: Record<string, string | number>;
  level: ExplainLevel;
  boardSlug?: string;
};

export type ExplainCodeRequest = {
  code: string;
  level: ExplainLevel;
  boardSlug?: string;
};

export type TextToBlocksRequest = {
  prompt: string;
  boardSlug?: string;
};

export type TextToProjectRequest = {
  description: string;
  boardSlug?: string;
};

export type WiringRequest = {
  workspace: WorkspaceDocument;
  blockTypes?: string[];
  blockFields?: Array<Record<string, string | number>>;
};

export type TextToBlocksResult = {
  workspace: WorkspaceDocument;
  summary: string;
  matchedPattern: string;
  provider: string;
};

export type TextToProjectResult = {
  name: string;
  board: string;
  workspace: WorkspaceDocument;
  generatedCode: string;
  libraries: string[];
  wiring: {
    components: Array<{ slug: string; name: string; role: string }>;
    pinMappings: Array<{ component: string; pin: number | string; function: string; notes?: string }>;
    connections: string[];
    warnings: string[];
  };
  summary: string;
  provider: string;
};

export type ExplainResult = {
  explanation: string;
  provider: string;
};

export type WiringResult = {
  components: Array<{ slug: string; name: string; role: string }>;
  pinMappings: Array<{ component: string; pin: number | string; function: string; notes?: string }>;
  connections: string[];
  warnings: string[];
  provider: string;
};

export interface AiProvider {
  readonly name: string;
  explainBlock(req: ExplainBlockRequest): Promise<ExplainResult>;
  explainCode(req: ExplainCodeRequest): Promise<ExplainResult>;
  textToBlocks(req: TextToBlocksRequest): Promise<TextToBlocksResult>;
  textToProject(req: TextToProjectRequest): Promise<TextToProjectResult>;
  suggestWiring(req: WiringRequest): Promise<WiringResult>;
}
