import { Inject, Injectable } from '@nestjs/common';
import {
  extractBlockInfoFromDocument,
  generateCodeForDocument,
  suggestWiring,
  validateWorkspaceFromDocument,
  type WorkspaceDocument,
} from '@stemverse/blockly-engine';
import { AiModelRouterService } from '../routing/ai-model-router.service';
import { RuleBasedProvider } from '../providers/rule-based.provider';

export type CopilotRequest = {
  workspace: WorkspaceDocument;
  generatedCode?: string;
  validationIssues?: Array<{ code: string; message: string; severity: string }>;
  simulatorMetadata?: Record<string, unknown>;
  boardSlug?: string;
  model?: string;
  fallbackModel?: string;
};

export type CopilotSuggestion = {
  category:
    | 'next_blocks'
    | 'pin_config'
    | 'wiring'
    | 'logic'
    | 'workflow'
    | 'code_explanation'
    | 'optimization'
    | 'simulator'
    | 'libraries';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
};

export type CopilotResult = {
  suggestions: CopilotSuggestion[];
  summary: string;
  provider: string;
  usage?: Record<string, unknown>;
};

export type AutoFixApiRequest = {
  workspace: WorkspaceDocument;
  boardSlug?: string;
};

export type SimulatorAssistRequest = {
  workspace: WorkspaceDocument;
  generatedCode?: string;
  simulatorMetadata?: Record<string, unknown>;
  boardSlug?: string;
  model?: string;
};

export type SimulatorAssistResult = {
  explanations: string[];
  sensorSuggestions: Array<{ component: string; property: string; suggestedValue: number | string }>;
  tuningTips: string[];
  provider: string;
};

@Injectable()
export class CopilotService {
  private readonly ruleBased = new RuleBasedProvider();

  constructor(@Inject(AiModelRouterService) private readonly router: AiModelRouterService) {}

  async analyzeCopilot(req: CopilotRequest): Promise<CopilotResult> {
    const board = req.boardSlug ?? req.workspace.board ?? 'arduino_uno';
    const validation =
      req.validationIssues ??
      validateWorkspaceFromDocument(req.workspace).issues.map((i) => ({
        code: i.code,
        message: i.message,
        severity: i.severity,
      }));

    const { blockTypes, blockFields } = extractBlockInfoFromDocument(req.workspace);
    const wiring = suggestWiring(req.workspace, blockTypes, blockFields);
    const code = req.generatedCode ?? generateCodeForDocument(req.workspace);

    const suggestions: CopilotSuggestion[] = [];

    if (!blockTypes.includes('stemverse_program')) {
      suggestions.push({
        category: 'next_blocks',
        title: 'Add Start Program block',
        description: 'Wrap your setup and loop logic in a Start Program block for structured code generation.',
        priority: 'high',
      });
    }

    if (!blockTypes.includes('stemverse_configure_pin')) {
      suggestions.push({
        category: 'pin_config',
        title: 'Configure pins before use',
        description: 'Add Configure Pin blocks for each GPIO pin used by sensors or actuators.',
        priority: 'high',
      });
    }

    for (const issue of validation) {
      if (issue.code.includes('PIN')) {
        suggestions.push({
          category: 'pin_config',
          title: 'Fix pin configuration',
          description: issue.message,
          priority: issue.severity === 'error' ? 'high' : 'medium',
        });
      }
      if (issue.code === 'DISCONNECTED_LOGIC' || issue.code === 'NO_PROGRAM_BLOCK') {
        suggestions.push({
          category: 'logic',
          title: 'Fix disconnected logic',
          description: issue.message,
          priority: 'high',
        });
      }
    }

    if (wiring.warnings.length > 0) {
      wiring.warnings.forEach((w) => {
        suggestions.push({
          category: 'wiring',
          title: 'Wiring review',
          description: w,
          priority: 'medium',
        });
      });
    }

    if (wiring.connections.length > 0 && suggestions.filter((s) => s.category === 'wiring').length === 0) {
      suggestions.push({
        category: 'wiring',
        title: 'Verify component wiring',
        description: wiring.connections.slice(0, 3).join('; '),
        priority: 'low',
      });
    }

    const libraries = req.workspace.libraries ?? [];
    if (libraries.length === 0 && blockTypes.some((t) => t.includes('sensor'))) {
      suggestions.push({
        category: 'libraries',
        title: 'Add sensor libraries',
        description: 'Sensor blocks may require DHT, OneWire, or other libraries in your project includes.',
        priority: 'medium',
      });
    }

    if (req.simulatorMetadata) {
      suggestions.push({
        category: 'simulator',
        title: 'Tune simulator values',
        description: 'Adjust virtual sensor sliders to match expected real-world ranges before deploying.',
        priority: 'low',
      });
    }

    suggestions.push({
      category: 'code_explanation',
      title: 'Generated code overview',
      description: `Your workspace generates ${code.split('\n').length} lines of ${req.workspace.language ?? 'arduino_cpp'} code for ${board}.`,
      priority: 'low',
    });

    const route = this.router.resolve({ task: 'copilot', preferredModel: req.model, fallbackModel: req.fallbackModel });
    let summary = `Found ${suggestions.length} copilot suggestions for your ${board} project.`;
    let usage: Record<string, unknown> | undefined;

    const prompt = `Robotics Blockly project on ${board}. Blocks: ${blockTypes.join(', ')}. Validation: ${validation.map((v) => v.message).join('; ')}. Give 2-3 actionable next steps.`;
    const chat = await this.router.chatWithFallback(prompt, {
      task: 'copilot',
      preferredModel: req.model,
      fallbackModel: req.fallbackModel,
    });
    if (chat.content) {
      summary = chat.content;
      usage = chat.route.usage as Record<string, unknown> | undefined;
    }

    return {
      suggestions,
      summary,
      provider: route.providerName,
      usage,
    };
  }

  analyzeAutoFix(req: AutoFixApiRequest) {
    const board = req.boardSlug ?? req.workspace.board ?? 'arduino_uno';
    const blockInfo = extractBlockInfoFromDocument(req.workspace);
    const validation = validateWorkspaceFromDocument(req.workspace);

    const suggestions = validation.issues.map((issue, i) => {
      const autoApplicable = [
        'INVALID_DIGITAL_PIN',
        'INVALID_ANALOG_PIN',
        'SERVO_ANGLE_RANGE',
      ].includes(issue.code);
      const confidence = autoApplicable
        ? 0.92
        : issue.severity === 'error'
          ? 0.75
          : issue.severity === 'warning'
            ? 0.55
            : 0.4;
      return {
        id: `issue-${i}`,
        issueCode: issue.code,
        title: `Fix: ${issue.code.replace(/_/g, ' ').toLowerCase()}`,
        description: issue.message,
        action: issue.code.includes('PIN')
          ? 'assign_pin'
          : issue.code === 'MISSING_LIBRARY'
            ? 'insert_include'
            : 'repair_generator',
        blockId: issue.blockId,
        blockType: issue.blockType,
        autoApplicable,
        confidence,
      };
    });

    return {
      board,
      blockCount: blockInfo.blockTypes.length,
      suggestions,
      issueCount: validation.issues.length,
      fixableCount: suggestions.filter((s) => s.autoApplicable).length,
      provider: 'rule-based',
    };
  }

  async simulatorAssist(req: SimulatorAssistRequest): Promise<SimulatorAssistResult> {
    const board = req.boardSlug ?? req.workspace.board ?? 'arduino_uno';
    const { blockTypes } = extractBlockInfoFromDocument(req.workspace);
    const meta = req.simulatorMetadata ?? {};

    const sensorSuggestions: SimulatorAssistResult['sensorSuggestions'] = [];
    if (blockTypes.includes('stemverse_sensor_read')) {
      sensorSuggestions.push(
        { component: 'DHT22', property: 'temperature', suggestedValue: 25 },
        { component: 'DHT22', property: 'humidity', suggestedValue: 50 },
      );
    }
    if (blockTypes.includes('stemverse_analog_read')) {
      sensorSuggestions.push({ component: 'LDR', property: 'lightLevel', suggestedValue: 512 });
    }

    const explanations = [
      `Simulator runs block-level metadata for ${blockTypes.length} block types on virtual ${board}.`,
      'Start the simulator to observe GPIO, sensor, and actuator state changes in real time.',
    ];

    const tuningTips = [
      'Match sensor slider ranges to your board ADC resolution (0–1023 on Arduino, 0–4095 on ESP32).',
      'Use Reset between test runs to clear virtual component state.',
    ];

    const route = this.router.resolve({ task: 'simulator', preferredModel: req.model });
    const chat = await this.router.chatWithFallback(
      `Explain simulator behavior for blocks: ${blockTypes.join(', ')} on ${board}. Metadata: ${JSON.stringify(meta).slice(0, 500)}`,
      { task: 'simulator', preferredModel: req.model },
    );
    if (chat.content) {
      explanations.push(chat.content);
    }

    return {
      explanations,
      sensorSuggestions,
      tuningTips,
      provider: route.providerName,
    };
  }
}
