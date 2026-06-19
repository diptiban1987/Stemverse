// ═══════════════════════════════════════════════════════════════
// Phase 29A: Circuit Diagnostics & Learning Assistant
// Detects circuit issues, generates recommendations, learning hints,
// Blockly diagnostics, and project readiness assessments.
// ═══════════════════════════════════════════════════════════════

import type {
  CircuitIssueModel,
  CircuitRecommendationModel,
  LearningHintModel,
  ProjectReadinessModel,
  BlocklyDiagnosticModel,
  CircuitDiagnosticSnapshot,
  DiagnosticSeverity,
  DiagnosticCategory,
  HighlightColor,
} from '../types';

import { RenderRegistry } from './render-registry';
import { ValidationWarning } from './scene-model';

// ─── Deep Copy Helper ───────────────────────────────────────────

function safeDeepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const VALID_DIAGNOSTIC_SEVERITIES: DiagnosticSeverity[] = [
  'ERROR', 'WARNING', 'SUGGESTION', 'INFO',
];

export const VALID_DIAGNOSTIC_CATEGORIES: DiagnosticCategory[] = [
  'ELECTRICAL', 'BLOCKLY', 'RUNTIME', 'HARDWARE',
];

export const VALID_HIGHLIGHT_COLORS: HighlightColor[] = [
  'RED', 'YELLOW', 'BLUE', 'GREEN',
];

/**
 * Component wiring rules for diagnostics validation.
 * Maps component type to required/optional pins and power requirements.
 */
export const COMPONENT_WIRING_RULES: Record<string, {
  requiredPins: string[];
  optionalPins: string[];
  needsPower: boolean;
  needsGround: boolean;
  description: string;
}> = {
  LED: {
    requiredPins: ['ANODE', 'CATHODE'],
    optionalPins: [],
    needsPower: false,
    needsGround: true,
    description: 'Light Emitting Diode — requires anode (signal/power) and cathode (GND).',
  },
  'HC-SR04': {
    requiredPins: ['VCC', 'GND', 'TRIG', 'ECHO'],
    optionalPins: [],
    needsPower: true,
    needsGround: true,
    description: 'Ultrasonic distance sensor — requires VCC, GND, TRIG, and ECHO pins.',
  },
  SERVO: {
    requiredPins: ['SIGNAL', 'VCC', 'GND'],
    optionalPins: [],
    needsPower: true,
    needsGround: true,
    description: 'Servo motor — requires SIGNAL, VCC, and GND connections.',
  },
  OLED_SSD1306: {
    requiredPins: ['VCC', 'GND', 'SDA', 'SCL'],
    optionalPins: ['RST'],
    needsPower: true,
    needsGround: true,
    description: 'OLED display (I2C) — requires VCC, GND, SDA, and SCL.',
  },
  LCD_1602: {
    requiredPins: ['VCC', 'GND', 'SDA', 'SCL'],
    optionalPins: ['RS', 'EN', 'D4', 'D5', 'D6', 'D7'],
    needsPower: true,
    needsGround: true,
    description: 'LCD 16×2 display — requires VCC, GND, and I2C or parallel data pins.',
  },
  DHT11: {
    requiredPins: ['VCC', 'GND', 'DATA'],
    optionalPins: [],
    needsPower: true,
    needsGround: true,
    description: 'Temperature & humidity sensor — requires VCC, GND, and DATA pin.',
  },
  BUZZER: {
    requiredPins: ['SIGNAL', 'GND'],
    optionalPins: ['VCC'],
    needsPower: false,
    needsGround: true,
    description: 'Piezo buzzer — requires SIGNAL and GND connections.',
  },
  RELAY: {
    requiredPins: ['VCC', 'GND', 'SIGNAL'],
    optionalPins: ['COM', 'NO', 'NC'],
    needsPower: true,
    needsGround: true,
    description: 'Relay module — requires VCC, GND, and SIGNAL to control switching.',
  },
  MQ2_GAS_SENSOR: {
    requiredPins: ['VCC', 'GND', 'AOUT'],
    optionalPins: ['DOUT'],
    needsPower: true,
    needsGround: true,
    description: 'Gas/smoke sensor — requires VCC, GND, and analog output (AOUT).',
  },
  PUSH_BUTTON: {
    requiredPins: ['PIN_A', 'PIN_B'],
    optionalPins: [],
    needsPower: false,
    needsGround: true,
    description: 'Momentary push button — requires two terminal connections.',
  },
  POTENTIOMETER: {
    requiredPins: ['VCC', 'GND', 'WIPER'],
    optionalPins: [],
    needsPower: true,
    needsGround: true,
    description: 'Variable resistor — requires VCC, GND, and WIPER (analog output).',
  },
  IR_SENSOR: {
    requiredPins: ['VCC', 'GND', 'OUT'],
    optionalPins: [],
    needsPower: true,
    needsGround: true,
    description: 'Infrared obstacle/proximity sensor — requires VCC, GND, and output pin.',
  },
  RGB_LED: {
    requiredPins: ['RED', 'GREEN', 'BLUE', 'COMMON'],
    optionalPins: [],
    needsPower: false,
    needsGround: true,
    description: 'RGB LED — requires RED, GREEN, BLUE signal pins and COMMON (anode/cathode).',
  },
};

/**
 * Demo circuit definitions for auditing common project setups.
 */
export const DEMO_CIRCUIT_DEFINITIONS: Record<string, {
  name: string;
  components: string[];
  expectedWires: number;
  description: string;
}> = {
  LED_BLINK: {
    name: 'LED Blink',
    components: ['LED'],
    expectedWires: 2,
    description: 'Simple single LED blink circuit — the classic first project.',
  },
  TRAFFIC_LIGHT: {
    name: 'Traffic Light',
    components: ['LED', 'LED', 'LED'],
    expectedWires: 6,
    description: 'Three-LED traffic light simulation — red, yellow, green.',
  },
  SERVO_SWEEP: {
    name: 'Servo Sweep',
    components: ['SERVO'],
    expectedWires: 3,
    description: 'Servo motor sweep — rotates back and forth continuously.',
  },
  OLED_DEMO: {
    name: 'OLED Display Demo',
    components: ['OLED_SSD1306'],
    expectedWires: 4,
    description: 'OLED I2C display demo — shows text/graphics on SSD1306.',
  },
  LCD_COUNTER: {
    name: 'LCD Counter',
    components: ['LCD_1602'],
    expectedWires: 4,
    description: 'LCD 16×2 counter — displays incrementing numbers.',
  },
  HC_SR04_ALARM: {
    name: 'HC-SR04 Distance Alarm',
    components: ['HC-SR04', 'BUZZER'],
    expectedWires: 6,
    description: 'Ultrasonic distance sensor with buzzer alarm when objects are close.',
  },
  MQ2_ALARM: {
    name: 'MQ2 Gas Alarm',
    components: ['MQ2_GAS_SENSOR', 'BUZZER', 'LED'],
    expectedWires: 8,
    description: 'Gas/smoke detector with buzzer and LED warning indicators.',
  },
  BUZZER_MELODY: {
    name: 'Buzzer Melody',
    components: ['BUZZER'],
    expectedWires: 2,
    description: 'Piezo buzzer playing a simple melody using tone frequencies.',
  },
};

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function createDefaultCircuitIssueModel(
  id: string,
  overrides: Partial<CircuitIssueModel> = {},
): CircuitIssueModel {
  return {
    code: '',
    severity: 'WARNING',
    category: 'ELECTRICAL',
    componentId: '',
    pinName: '',
    gpioNumber: -1,
    wireId: '',
    netId: '',
    title: '',
    message: '',
    whyWrong: '',
    howToFix: '',
    expectedOutcome: '',
    highlightColor: 'YELLOW',
    affectedIds: [],
    futureIssueHints: {},
    ...overrides,
    issueId: id,
  };
}

export function createDefaultCircuitRecommendationModel(
  id: string,
  overrides: Partial<CircuitRecommendationModel> = {},
): CircuitRecommendationModel {
  return {
    issueId: '',
    title: '',
    description: '',
    actionType: '',
    targetComponentId: '',
    targetPinName: '',
    targetGpioNumber: -1,
    isAutoFixable: false,
    fixPayload: {},
    futureRecommendationHints: {},
    ...overrides,
    recommendationId: id,
  };
}

export function createDefaultLearningHintModel(
  id: string,
  overrides: Partial<LearningHintModel> = {},
): LearningHintModel {
  return {
    componentType: '',
    issueCode: '',
    difficulty: 'BEGINNER',
    title: '',
    explanation: '',
    example: '',
    relatedConcept: '',
    futureHintHints: {},
    ...overrides,
    hintId: id,
  };
}

export function createDefaultProjectReadinessModel(
  id: string,
  overrides: Partial<ProjectReadinessModel> = {},
): ProjectReadinessModel {
  return {
    hardwarePercent: 0,
    codePercent: 0,
    electricalPercent: 0,
    simulationPercent: 0,
    overallPercent: 0,
    criticalIssues: [],
    notReadyReasons: [],
    isReady: false,
    futureReadinessHints: {},
    ...overrides,
    readinessId: id,
  };
}

export function createDefaultBlocklyDiagnosticModel(
  id: string,
  overrides: Partial<BlocklyDiagnosticModel> = {},
): BlocklyDiagnosticModel {
  return {
    code: '',
    severity: 'WARNING',
    blockId: '',
    variableName: '',
    gpioNumber: -1,
    title: '',
    message: '',
    howToFix: '',
    futureDiagnosticHints: {},
    ...overrides,
    diagnosticId: id,
  };
}

// ═══════════════════════════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════════════════════════

export function validateCircuitIssueModel(
  model: CircuitIssueModel,
  warnPrefix = '[CircuitDiagnostics]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_ISSUE', message: 'Circuit issue model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.issueId) {
    warnings.push({ code: 'EMPTY_ISSUE_ID', message: 'Circuit issue ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.code) {
    warnings.push({ code: 'EMPTY_ISSUE_CODE', message: `Circuit issue "${model.issueId}" has empty code.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.title) {
    warnings.push({ code: 'EMPTY_ISSUE_TITLE', message: `Circuit issue "${model.issueId}" has empty title.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.message) {
    warnings.push({ code: 'EMPTY_ISSUE_MESSAGE', message: `Circuit issue "${model.issueId}" has empty message.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_DIAGNOSTIC_SEVERITIES.includes(model.severity)) {
    warnings.push({ code: 'INVALID_SEVERITY', message: `Circuit issue "${model.issueId}" has invalid severity "${model.severity}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_DIAGNOSTIC_CATEGORIES.includes(model.category)) {
    warnings.push({ code: 'INVALID_CATEGORY', message: `Circuit issue "${model.issueId}" has invalid category "${model.category}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_HIGHLIGHT_COLORS.includes(model.highlightColor)) {
    warnings.push({ code: 'INVALID_HIGHLIGHT', message: `Circuit issue "${model.issueId}" has invalid highlightColor "${model.highlightColor}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateCircuitRecommendationModel(
  model: CircuitRecommendationModel,
  warnPrefix = '[CircuitDiagnostics]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_RECOMMENDATION', message: 'Circuit recommendation model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.recommendationId) {
    warnings.push({ code: 'EMPTY_RECOMMENDATION_ID', message: 'Circuit recommendation ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.issueId) {
    warnings.push({ code: 'EMPTY_RECOMMENDATION_ISSUE_ID', message: `Circuit recommendation "${model.recommendationId}" has empty issueId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.title) {
    warnings.push({ code: 'EMPTY_RECOMMENDATION_TITLE', message: `Circuit recommendation "${model.recommendationId}" has empty title.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.description) {
    warnings.push({ code: 'EMPTY_RECOMMENDATION_DESC', message: `Circuit recommendation "${model.recommendationId}" has empty description.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.actionType) {
    warnings.push({ code: 'EMPTY_ACTION_TYPE', message: `Circuit recommendation "${model.recommendationId}" has empty actionType.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateLearningHintModel(
  model: LearningHintModel,
  warnPrefix = '[CircuitDiagnostics]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_HINT', message: 'Learning hint model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.hintId) {
    warnings.push({ code: 'EMPTY_HINT_ID', message: 'Learning hint ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.title) {
    warnings.push({ code: 'EMPTY_HINT_TITLE', message: `Learning hint "${model.hintId}" has empty title.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.explanation) {
    warnings.push({ code: 'EMPTY_HINT_EXPLANATION', message: `Learning hint "${model.hintId}" has empty explanation.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.componentType) {
    warnings.push({ code: 'EMPTY_HINT_COMPONENT_TYPE', message: `Learning hint "${model.hintId}" has empty componentType.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.difficulty) {
    warnings.push({ code: 'EMPTY_HINT_DIFFICULTY', message: `Learning hint "${model.hintId}" has empty difficulty.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateProjectReadinessModel(
  model: ProjectReadinessModel,
  warnPrefix = '[CircuitDiagnostics]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_READINESS', message: 'Project readiness model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.readinessId) {
    warnings.push({ code: 'EMPTY_READINESS_ID', message: 'Project readiness ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.hardwarePercent !== 'number' || model.hardwarePercent < 0 || model.hardwarePercent > 100) {
    warnings.push({ code: 'INVALID_HARDWARE_PERCENT', message: `Project readiness "${model.readinessId}" has invalid hardwarePercent ${model.hardwarePercent}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.codePercent !== 'number' || model.codePercent < 0 || model.codePercent > 100) {
    warnings.push({ code: 'INVALID_CODE_PERCENT', message: `Project readiness "${model.readinessId}" has invalid codePercent ${model.codePercent}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.electricalPercent !== 'number' || model.electricalPercent < 0 || model.electricalPercent > 100) {
    warnings.push({ code: 'INVALID_ELECTRICAL_PERCENT', message: `Project readiness "${model.readinessId}" has invalid electricalPercent ${model.electricalPercent}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.simulationPercent !== 'number' || model.simulationPercent < 0 || model.simulationPercent > 100) {
    warnings.push({ code: 'INVALID_SIMULATION_PERCENT', message: `Project readiness "${model.readinessId}" has invalid simulationPercent ${model.simulationPercent}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.overallPercent !== 'number' || model.overallPercent < 0 || model.overallPercent > 100) {
    warnings.push({ code: 'INVALID_OVERALL_PERCENT', message: `Project readiness "${model.readinessId}" has invalid overallPercent ${model.overallPercent}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.criticalIssues)) {
    warnings.push({ code: 'INVALID_CRITICAL_ISSUES', message: `Project readiness "${model.readinessId}" has invalid criticalIssues array.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.notReadyReasons)) {
    warnings.push({ code: 'INVALID_NOT_READY_REASONS', message: `Project readiness "${model.readinessId}" has invalid notReadyReasons array.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateBlocklyDiagnosticModel(
  model: BlocklyDiagnosticModel,
  warnPrefix = '[CircuitDiagnostics]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_BLOCKLY_DIAGNOSTIC', message: 'Blockly diagnostic model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.diagnosticId) {
    warnings.push({ code: 'EMPTY_DIAGNOSTIC_ID', message: 'Blockly diagnostic ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.code) {
    warnings.push({ code: 'EMPTY_DIAGNOSTIC_CODE', message: `Blockly diagnostic "${model.diagnosticId}" has empty code.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.title) {
    warnings.push({ code: 'EMPTY_DIAGNOSTIC_TITLE', message: `Blockly diagnostic "${model.diagnosticId}" has empty title.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.message) {
    warnings.push({ code: 'EMPTY_DIAGNOSTIC_MESSAGE', message: `Blockly diagnostic "${model.diagnosticId}" has empty message.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_DIAGNOSTIC_SEVERITIES.includes(model.severity)) {
    warnings.push({ code: 'INVALID_DIAGNOSTIC_SEVERITY', message: `Blockly diagnostic "${model.diagnosticId}" has invalid severity "${model.severity}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// SYNCHRONIZER
// ═══════════════════════════════════════════════════════════════

export class CircuitDiagnosticsSynchronizer {
  private readonly issueRegistry = new RenderRegistry<CircuitIssueModel>();
  private readonly recommendationRegistry = new RenderRegistry<CircuitRecommendationModel>();
  private readonly hintRegistry = new RenderRegistry<LearningHintModel>();
  private readonly readinessRegistry = new RenderRegistry<ProjectReadinessModel>();
  private readonly blocklyDiagnosticRegistry = new RenderRegistry<BlocklyDiagnosticModel>();
  private issueCounter = 0;
  private recommendationCounter = 0;
  private hintCounter = 0;
  private diagnosticCounter = 0;

  // ─── Issue CRUD ──────────────────────────────────────────────

  public registerIssue(key: string, model: CircuitIssueModel): void {
    this.issueRegistry.register(key, safeDeepCopy(model), '[CircuitDiagnostics]');
  }
  public getIssue(key: string): CircuitIssueModel | undefined {
    return this.issueRegistry.lookup(key);
  }
  public getAllIssues(): CircuitIssueModel[] {
    return this.issueRegistry.getAll();
  }
  public updateIssue(key: string, updates: Partial<CircuitIssueModel>): void {
    this.issueRegistry.update(key, updates, '[CircuitDiagnostics]');
  }
  public removeIssue(key: string): void {
    this.issueRegistry.remove(key);
  }
  public clearIssues(): void {
    this.issueRegistry.clear();
  }
  public getIssueKeys(): string[] {
    return this.issueRegistry.keys();
  }
  public hasIssue(key: string): boolean {
    return this.issueRegistry.has(key);
  }

  // ─── Recommendation CRUD ───────────────────────────────────

  public registerRecommendation(key: string, model: CircuitRecommendationModel): void {
    this.recommendationRegistry.register(key, safeDeepCopy(model), '[CircuitDiagnostics]');
  }
  public getRecommendation(key: string): CircuitRecommendationModel | undefined {
    return this.recommendationRegistry.lookup(key);
  }
  public getAllRecommendations(): CircuitRecommendationModel[] {
    return this.recommendationRegistry.getAll();
  }
  public updateRecommendation(key: string, updates: Partial<CircuitRecommendationModel>): void {
    this.recommendationRegistry.update(key, updates, '[CircuitDiagnostics]');
  }
  public removeRecommendation(key: string): void {
    this.recommendationRegistry.remove(key);
  }
  public clearRecommendations(): void {
    this.recommendationRegistry.clear();
  }
  public getRecommendationKeys(): string[] {
    return this.recommendationRegistry.keys();
  }
  public hasRecommendation(key: string): boolean {
    return this.recommendationRegistry.has(key);
  }

  // ─── Hint CRUD ─────────────────────────────────────────────

  public registerHint(key: string, model: LearningHintModel): void {
    this.hintRegistry.register(key, safeDeepCopy(model), '[CircuitDiagnostics]');
  }
  public getHint(key: string): LearningHintModel | undefined {
    return this.hintRegistry.lookup(key);
  }
  public getAllHints(): LearningHintModel[] {
    return this.hintRegistry.getAll();
  }
  public updateHint(key: string, updates: Partial<LearningHintModel>): void {
    this.hintRegistry.update(key, updates, '[CircuitDiagnostics]');
  }
  public removeHint(key: string): void {
    this.hintRegistry.remove(key);
  }
  public clearHints(): void {
    this.hintRegistry.clear();
  }
  public getHintKeys(): string[] {
    return this.hintRegistry.keys();
  }
  public hasHint(key: string): boolean {
    return this.hintRegistry.has(key);
  }

  // ─── Readiness CRUD ────────────────────────────────────────

  public registerReadiness(key: string, model: ProjectReadinessModel): void {
    this.readinessRegistry.register(key, safeDeepCopy(model), '[CircuitDiagnostics]');
  }
  public getReadiness(key: string): ProjectReadinessModel | undefined {
    return this.readinessRegistry.lookup(key);
  }
  public getAllReadiness(): ProjectReadinessModel[] {
    return this.readinessRegistry.getAll();
  }
  public updateReadiness(key: string, updates: Partial<ProjectReadinessModel>): void {
    this.readinessRegistry.update(key, updates, '[CircuitDiagnostics]');
  }
  public removeReadiness(key: string): void {
    this.readinessRegistry.remove(key);
  }
  public clearReadiness(): void {
    this.readinessRegistry.clear();
  }
  public getReadinessKeys(): string[] {
    return this.readinessRegistry.keys();
  }
  public hasReadiness(key: string): boolean {
    return this.readinessRegistry.has(key);
  }

  // ─── BlocklyDiagnostic CRUD ────────────────────────────────

  public registerBlocklyDiagnostic(key: string, model: BlocklyDiagnosticModel): void {
    this.blocklyDiagnosticRegistry.register(key, safeDeepCopy(model), '[CircuitDiagnostics]');
  }
  public getBlocklyDiagnostic(key: string): BlocklyDiagnosticModel | undefined {
    return this.blocklyDiagnosticRegistry.lookup(key);
  }
  public getAllBlocklyDiagnostics(): BlocklyDiagnosticModel[] {
    return this.blocklyDiagnosticRegistry.getAll();
  }
  public updateBlocklyDiagnostic(key: string, updates: Partial<BlocklyDiagnosticModel>): void {
    this.blocklyDiagnosticRegistry.update(key, updates, '[CircuitDiagnostics]');
  }
  public removeBlocklyDiagnostic(key: string): void {
    this.blocklyDiagnosticRegistry.remove(key);
  }
  public clearBlocklyDiagnostics(): void {
    this.blocklyDiagnosticRegistry.clear();
  }
  public getBlocklyDiagnosticKeys(): string[] {
    return this.blocklyDiagnosticRegistry.keys();
  }
  public hasBlocklyDiagnostic(key: string): boolean {
    return this.blocklyDiagnosticRegistry.has(key);
  }

  // ═══════════════════════════════════════════════════════════════
  // CORE DIAGNOSTIC METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Detects circuit issues by checking each component against wiring rules.
   * Identifies floating pins, missing GND/VCC, and GPIO conflicts.
   */
  public detectCircuitIssues(
    components: Array<{
      componentId: string;
      type: string;
      pins: Array<{ name: string; connectedTo: string | null; netId: string | null }>;
    }>,
    gpioMappings: Array<{
      gpioNumber: number;
      componentId: string;
      pinName: string;
      direction: string;
    }>,
  ): CircuitIssueModel[] {
    const issues: CircuitIssueModel[] = [];

    // Check each component against wiring rules
    for (const comp of components) {
      const rules = COMPONENT_WIRING_RULES[comp.type];
      if (!rules) {
        continue; // No rules for this component type — skip
      }

      const connectedPinNames = comp.pins
        .filter(p => p.connectedTo !== null && p.connectedTo !== '')
        .map(p => p.name.toUpperCase());

      // Detect floating pins (required pin not connected)
      for (const requiredPin of rules.requiredPins) {
        const pinEntry = comp.pins.find(p => p.name.toUpperCase() === requiredPin.toUpperCase());
        if (pinEntry && (pinEntry.connectedTo === null || pinEntry.connectedTo === '')) {
          const issueId = `issue_${++this.issueCounter}`;
          issues.push(createDefaultCircuitIssueModel(issueId, {
            code: 'FLOATING_PIN',
            severity: 'ERROR',
            category: 'ELECTRICAL',
            componentId: comp.componentId,
            pinName: requiredPin,
            title: 'Floating Pin Detected',
            message: `Pin "${requiredPin}" on component "${comp.componentId}" (${comp.type}) is not connected.`,
            whyWrong: `The ${requiredPin} pin is required for ${comp.type} to function correctly. An unconnected pin means the component will not work.`,
            howToFix: `Connect the ${requiredPin} pin to the appropriate rail or GPIO on the breadboard.`,
            expectedOutcome: `The ${comp.type} component will be properly connected and functional.`,
            highlightColor: 'RED',
            affectedIds: [comp.componentId],
          }));
        }
      }

      // Detect missing GND connection
      if (rules.needsGround) {
        const hasGnd = connectedPinNames.some(p =>
          p === 'GND' || p === 'CATHODE' || p === 'PIN_B' || p === 'COMMON',
        );
        if (!hasGnd) {
          const issueId = `issue_${++this.issueCounter}`;
          issues.push(createDefaultCircuitIssueModel(issueId, {
            code: 'MISSING_GND',
            severity: 'ERROR',
            category: 'ELECTRICAL',
            componentId: comp.componentId,
            title: 'Missing Ground Connection',
            message: `Component "${comp.componentId}" (${comp.type}) has no ground (GND) connection.`,
            whyWrong: 'Without a ground connection, current cannot flow through the circuit. The component will not function.',
            howToFix: 'Connect the GND pin of the component to the ground rail on the breadboard.',
            expectedOutcome: 'Current will flow properly and the component will be able to operate.',
            highlightColor: 'RED',
            affectedIds: [comp.componentId],
          }));
        }
      }

      // Detect missing VCC connection
      if (rules.needsPower) {
        const hasVcc = connectedPinNames.some(p =>
          p === 'VCC' || p === '5V' || p === '3V3' || p === '3.3V',
        );
        if (!hasVcc) {
          const issueId = `issue_${++this.issueCounter}`;
          issues.push(createDefaultCircuitIssueModel(issueId, {
            code: 'MISSING_VCC',
            severity: 'ERROR',
            category: 'ELECTRICAL',
            componentId: comp.componentId,
            title: 'Missing Power Connection',
            message: `Component "${comp.componentId}" (${comp.type}) has no power (VCC) connection.`,
            whyWrong: 'The component requires a power source to operate. Without VCC, it will receive no power.',
            howToFix: 'Connect the VCC pin of the component to the 3.3V or 5V power rail on the breadboard.',
            expectedOutcome: 'The component will receive power and be able to operate correctly.',
            highlightColor: 'RED',
            affectedIds: [comp.componentId],
          }));
        }
      }
    }

    // Detect GPIO conflicts (two components sharing the same gpioNumber)
    const gpioByNumber = new Map<number, Array<{ componentId: string; pinName: string; direction: string }>>();
    for (const mapping of gpioMappings) {
      if (mapping.gpioNumber < 0) continue;
      if (!gpioByNumber.has(mapping.gpioNumber)) {
        gpioByNumber.set(mapping.gpioNumber, []);
      }
      gpioByNumber.get(mapping.gpioNumber)!.push({
        componentId: mapping.componentId,
        pinName: mapping.pinName,
        direction: mapping.direction,
      });
    }

    for (const [gpioNum, owners] of gpioByNumber) {
      if (owners.length > 1) {
        const issueId = `issue_${++this.issueCounter}`;
        const componentNames = owners.map(o => o.componentId).join(', ');
        issues.push(createDefaultCircuitIssueModel(issueId, {
          code: 'GPIO_CONFLICT',
          severity: 'ERROR',
          category: 'HARDWARE',
          gpioNumber: gpioNum,
          title: 'GPIO Pin Conflict',
          message: `GPIO ${gpioNum} is used by multiple components: ${componentNames}.`,
          whyWrong: 'Two or more components are trying to use the same GPIO pin. This can cause electrical conflicts and unpredictable behavior.',
          howToFix: `Reassign one of the components to a different GPIO pin. Currently shared by: ${componentNames}.`,
          expectedOutcome: 'Each component will have its own dedicated GPIO pin, preventing conflicts.',
          highlightColor: 'RED',
          affectedIds: owners.map(o => o.componentId),
        }));
      }
    }

    return issues;
  }

  /**
   * Generates fix recommendations for each detected issue.
   */
  public generateRecommendations(
    issues: CircuitIssueModel[],
  ): CircuitRecommendationModel[] {
    const recommendations: CircuitRecommendationModel[] = [];

    for (const issue of issues) {
      const recId = `rec_${++this.recommendationCounter}`;
      let actionType = 'REVIEW';
      let title = 'Review Issue';
      let description = issue.howToFix || 'Review the circuit and fix manually.';

      switch (issue.code) {
        case 'FLOATING_PIN':
          actionType = 'CONNECT_PIN';
          title = `Connect ${issue.pinName} on ${issue.componentId}`;
          description = `Wire the ${issue.pinName} pin to the appropriate connection point.`;
          break;
        case 'MISSING_GND':
          actionType = 'CONNECT_GND';
          title = `Add Ground to ${issue.componentId}`;
          description = 'Connect the component GND pin to the ground rail on the breadboard.';
          break;
        case 'MISSING_VCC':
          actionType = 'CONNECT_VCC';
          title = `Add Power to ${issue.componentId}`;
          description = 'Connect the component VCC pin to the power rail (3.3V or 5V).';
          break;
        case 'GPIO_CONFLICT':
          actionType = 'REASSIGN_GPIO';
          title = `Resolve GPIO ${issue.gpioNumber} Conflict`;
          description = `Multiple components share GPIO ${issue.gpioNumber}. Move one to a free GPIO.`;
          break;
        default:
          actionType = 'MANUAL_FIX';
          title = `Fix: ${issue.title}`;
          description = issue.howToFix || 'Review and fix the reported issue manually.';
          break;
      }

      recommendations.push(createDefaultCircuitRecommendationModel(recId, {
        issueId: issue.issueId,
        title,
        description,
        actionType,
        targetComponentId: issue.componentId,
        targetPinName: issue.pinName,
        targetGpioNumber: issue.gpioNumber,
        isAutoFixable: false,
      }));
    }

    return recommendations;
  }

  /**
   * Generates educational learning hints based on issues and component types.
   */
  public generateLearningHints(
    issues: CircuitIssueModel[],
    componentTypes: string[],
  ): LearningHintModel[] {
    const hints: LearningHintModel[] = [];
    const seenCodes = new Set<string>();

    for (const issue of issues) {
      // Avoid duplicate hints for the same issue code
      if (seenCodes.has(issue.code)) continue;
      seenCodes.add(issue.code);

      const hintId = `hint_${++this.hintCounter}`;
      let difficulty = 'BEGINNER';
      let title = '';
      let explanation = '';
      let example = '';
      let relatedConcept = '';
      let componentType = '';

      switch (issue.code) {
        case 'FLOATING_PIN':
          difficulty = 'BEGINNER';
          title = 'Understanding Floating Pins';
          explanation = 'A floating pin is a pin that is not connected to anything. In digital circuits, floating pins pick up electrical noise and can cause unpredictable behavior. Every required pin on a component must be connected.';
          example = 'If an LED\'s anode is connected to GPIO but the cathode is not connected to GND, the LED will not light up.';
          relatedConcept = 'Pull-up resistors, Pull-down resistors';
          componentType = issue.category === 'ELECTRICAL' ? (componentTypes[0] || 'GENERIC') : 'GENERIC';
          break;
        case 'MISSING_GND':
          difficulty = 'BEGINNER';
          title = 'Why Ground (GND) is Essential';
          explanation = 'Ground provides the return path for electrical current. Without GND, current cannot flow and no component will work. Every circuit needs at least one ground connection.';
          example = 'A servo motor with VCC and SIGNAL but no GND will not move because current has no return path.';
          relatedConcept = 'Complete circuits, Current flow, Kirchhoff\'s Laws';
          componentType = componentTypes[0] || 'GENERIC';
          break;
        case 'MISSING_VCC':
          difficulty = 'BEGINNER';
          title = 'Powering Components with VCC';
          explanation = 'VCC (Voltage Common Collector) provides operating power to components. Most sensors and modules need a stable power source (3.3V or 5V) to function.';
          example = 'An OLED display connected with SDA and SCL but missing VCC will remain dark — it has no power source.';
          relatedConcept = 'Voltage levels, 3.3V vs 5V, Level shifting';
          componentType = componentTypes[0] || 'GENERIC';
          break;
        case 'GPIO_CONFLICT':
          difficulty = 'INTERMEDIATE';
          title = 'Avoiding GPIO Pin Conflicts';
          explanation = 'Each GPIO pin can only be reliably driven by one source at a time. When two components try to use the same GPIO, they may interfere with each other, causing damage or incorrect readings.';
          example = 'If both an LED and a servo are connected to GPIO 13, the servo signal will conflict with the LED control.';
          relatedConcept = 'Pin multiplexing, GPIO allocation, ESP32 pin map';
          componentType = 'GENERIC';
          break;
        default:
          difficulty = 'INTERMEDIATE';
          title = `Understanding: ${issue.title}`;
          explanation = issue.whyWrong || 'This issue may affect circuit operation.';
          example = issue.howToFix || 'Review the component wiring carefully.';
          relatedConcept = 'Circuit debugging';
          componentType = componentTypes[0] || 'GENERIC';
          break;
      }

      hints.push(createDefaultLearningHintModel(hintId, {
        componentType,
        issueCode: issue.code,
        difficulty,
        title,
        explanation,
        example,
        relatedConcept,
      }));
    }

    // Generate component-specific hints for types that have wiring rules
    for (const compType of componentTypes) {
      const rules = COMPONENT_WIRING_RULES[compType];
      if (rules && !seenCodes.has(`COMPONENT_INFO_${compType}`)) {
        seenCodes.add(`COMPONENT_INFO_${compType}`);
        const hintId = `hint_${++this.hintCounter}`;
        hints.push(createDefaultLearningHintModel(hintId, {
          componentType: compType,
          issueCode: `COMPONENT_INFO_${compType}`,
          difficulty: 'BEGINNER',
          title: `How to Wire: ${compType}`,
          explanation: rules.description,
          example: `Required pins: ${rules.requiredPins.join(', ')}. ${rules.optionalPins.length > 0 ? `Optional pins: ${rules.optionalPins.join(', ')}.` : ''}`,
          relatedConcept: `${compType} datasheet, Pin configuration`,
        }));
      }
    }

    return hints;
  }

  /**
   * Detects Blockly-specific diagnostics such as unused GPIO mappings
   * and missing setup blocks.
   */
  public detectBlocklyDiagnostics(
    programBlocks: Array<{
      blockId: string;
      type: string;
      fields: Record<string, string>;
    }>,
    gpioMappings: Array<{
      gpioNumber: number;
      componentId: string;
    }>,
  ): BlocklyDiagnosticModel[] {
    const diagnostics: BlocklyDiagnosticModel[] = [];

    // Collect all GPIO numbers referenced in program blocks
    const usedGpios = new Set<number>();
    const blockTypes = new Set<string>();
    for (const block of programBlocks) {
      blockTypes.add(block.type);
      // Check fields for GPIO references
      for (const [_fieldName, fieldValue] of Object.entries(block.fields)) {
        const gpioNum = parseInt(fieldValue, 10);
        if (!isNaN(gpioNum) && gpioNum >= 0) {
          usedGpios.add(gpioNum);
        }
      }
    }

    // Detect unused GPIO mappings (mapped in hardware but never used in code)
    for (const mapping of gpioMappings) {
      if (mapping.gpioNumber >= 0 && !usedGpios.has(mapping.gpioNumber)) {
        const diagId = `diag_${++this.diagnosticCounter}`;
        diagnostics.push(createDefaultBlocklyDiagnosticModel(diagId, {
          code: 'UNUSED_GPIO',
          severity: 'WARNING',
          gpioNumber: mapping.gpioNumber,
          title: 'Unused GPIO Mapping',
          message: `GPIO ${mapping.gpioNumber} is mapped to component "${mapping.componentId}" but is not referenced in any Blockly block.`,
          howToFix: `Add a Blockly block that uses GPIO ${mapping.gpioNumber}, or remove the hardware mapping if it is not needed.`,
        }));
      }
    }

    // Detect missing setup blocks
    const hasSetup = programBlocks.some(b =>
      b.type === 'setup' || b.type === 'arduino_setup' || b.type === 'on_start' || b.type === 'event_whenflagclicked',
    );
    if (!hasSetup && programBlocks.length > 0) {
      const diagId = `diag_${++this.diagnosticCounter}`;
      diagnostics.push(createDefaultBlocklyDiagnosticModel(diagId, {
        code: 'MISSING_SETUP',
        severity: 'SUGGESTION',
        title: 'Missing Setup Block',
        message: 'No setup/initialization block found in the program. GPIO pins should be configured in a setup block.',
        howToFix: 'Add a "Setup" or "On Start" block to your program to initialize GPIO pin modes before using them.',
      }));
    }

    // Detect blocks referencing GPIO numbers that have no hardware mapping
    for (const block of programBlocks) {
      for (const [fieldName, fieldValue] of Object.entries(block.fields)) {
        const gpioNum = parseInt(fieldValue, 10);
        if (!isNaN(gpioNum) && gpioNum >= 0) {
          const hasMappedComponent = gpioMappings.some(m => m.gpioNumber === gpioNum);
          if (!hasMappedComponent) {
            const diagId = `diag_${++this.diagnosticCounter}`;
            diagnostics.push(createDefaultBlocklyDiagnosticModel(diagId, {
              code: 'UNMAPPED_GPIO_IN_CODE',
              severity: 'WARNING',
              blockId: block.blockId,
              variableName: fieldName,
              gpioNumber: gpioNum,
              title: 'GPIO Not Mapped to Hardware',
              message: `Block "${block.blockId}" references GPIO ${gpioNum} in field "${fieldName}", but no component is mapped to this pin.`,
              howToFix: `Connect a component to GPIO ${gpioNum} on the breadboard, or change the block to use a mapped GPIO pin.`,
            }));
          }
        }
      }
    }

    return diagnostics;
  }

  /**
   * Calculates project readiness across 4 dimensions.
   */
  public calculateProjectReadiness(
    componentCount: number,
    wireCount: number,
    issueCount: number,
    errorCount: number,
    hasProgram: boolean,
  ): ProjectReadinessModel {
    const readinessId = `readiness_${Date.now()}`;

    // Hardware: percentage based on component count (0=0%, ≥3=100%)
    const hardwarePercent = componentCount >= 3 ? 100 : Math.round((componentCount / 3) * 100);

    // Code: 100% if hasProgram, else 0%
    const codePercent = hasProgram ? 100 : 0;

    // Electrical: 100% - (errorCount * 20%), min 0
    const electricalPercent = Math.max(0, 100 - errorCount * 20);

    // Simulation: 100% if no issues, else max(0, 100 - issueCount * 10)
    const simulationPercent = issueCount === 0 ? 100 : Math.max(0, 100 - issueCount * 10);

    // Overall: average of 4 dimensions
    const overallPercent = Math.round(
      (hardwarePercent + codePercent + electricalPercent + simulationPercent) / 4,
    );

    // Build critical issues and not-ready reasons
    const criticalIssues: string[] = [];
    const notReadyReasons: string[] = [];

    if (componentCount === 0) {
      notReadyReasons.push('No components placed on the breadboard.');
    }
    if (wireCount === 0 && componentCount > 0) {
      notReadyReasons.push('No wires connecting components.');
    }
    if (!hasProgram) {
      notReadyReasons.push('No Blockly program created.');
    }
    if (errorCount > 0) {
      criticalIssues.push(`${errorCount} circuit error(s) must be fixed.`);
      notReadyReasons.push(`${errorCount} circuit error(s) detected.`);
    }
    if (issueCount > 0 && errorCount === 0) {
      notReadyReasons.push(`${issueCount} issue(s) detected (warnings/suggestions).`);
    }

    // isReady: overallPercent >= 80 AND errorCount === 0
    const isReady = overallPercent >= 80 && errorCount === 0;

    return createDefaultProjectReadinessModel(readinessId, {
      hardwarePercent,
      codePercent,
      electricalPercent,
      simulationPercent,
      overallPercent,
      criticalIssues,
      notReadyReasons,
      isReady,
    });
  }

  /**
   * Calculates a health score from 0–100 based on issue severities.
   * Returns score and letter grade.
   */
  public calculateHealthScore(
    issues: CircuitIssueModel[],
  ): { score: number; grade: string } {
    let score = 100;

    for (const issue of issues) {
      switch (issue.severity) {
        case 'ERROR':
          score -= 20;
          break;
        case 'WARNING':
          score -= 5;
          break;
        case 'SUGGESTION':
          score -= 1;
          break;
        case 'INFO':
          // No penalty for info
          break;
      }
    }

    // Clamp 0–100
    score = Math.max(0, Math.min(100, score));

    // Grade
    let grade: string;
    if (score >= 95) {
      grade = 'A+';
    } else if (score >= 90) {
      grade = 'A';
    } else if (score >= 75) {
      grade = 'B';
    } else if (score >= 60) {
      grade = 'C';
    } else if (score >= 40) {
      grade = 'D';
    } else {
      grade = 'F';
    }

    return { score, grade };
  }

  /**
   * Audits a demo circuit by name, running full diagnostics and
   * returning a complete snapshot.
   */
  public auditDemoCircuit(
    circuitName: string,
    components: Array<{
      componentId: string;
      type: string;
      pins: Array<{ name: string; connectedTo: string | null; netId: string | null }>;
    }>,
    gpioMappings: Array<{
      gpioNumber: number;
      componentId: string;
      pinName: string;
      direction: string;
    }>,
  ): CircuitDiagnosticSnapshot {
    const demoDef = DEMO_CIRCUIT_DEFINITIONS[circuitName];
    if (!demoDef) {
      console.warn(`[CircuitDiagnostics] Demo circuit "${circuitName}" not found in definitions.`);
    }

    // Run issue detection
    const issues = this.detectCircuitIssues(components, gpioMappings);

    // Generate recommendations
    const recommendations = this.generateRecommendations(issues);

    // Generate learning hints
    const componentTypes = components.map(c => c.type);
    const learningHints = this.generateLearningHints(issues, componentTypes);

    // Calculate health
    const { score, grade } = this.calculateHealthScore(issues);

    // Calculate readiness
    const errorCount = issues.filter(i => i.severity === 'ERROR').length;
    const readiness = this.calculateProjectReadiness(
      components.length,
      0, // wire count not available at audit time
      issues.length,
      errorCount,
      false, // program status not available at audit time
    );

    return {
      issues: safeDeepCopy(issues),
      recommendations: safeDeepCopy(recommendations),
      learningHints: safeDeepCopy(learningHints),
      blocklyDiagnostics: [],
      projectReadiness: safeDeepCopy(readiness),
      healthScore: score,
      healthGrade: grade,
    };
  }

  /**
   * Formats issues into serial-monitor-friendly strings.
   */
  public emitSerialDiagnostics(
    issues: CircuitIssueModel[],
  ): string[] {
    const lines: string[] = [];
    for (const issue of issues) {
      lines.push(`[${issue.severity}] ${issue.title}: ${issue.message}`);
    }
    return lines;
  }

  /**
   * Orchestrator: runs all detection methods, populates registries,
   * and returns a full diagnostic snapshot.
   */
  public runFullDiagnostics(
    components: Array<{
      componentId: string;
      type: string;
      pins: Array<{ name: string; connectedTo: string | null; netId: string | null }>;
    }>,
    gpioMappings: Array<{
      gpioNumber: number;
      componentId: string;
      pinName: string;
      direction: string;
    }>,
    programBlocks: Array<{
      blockId: string;
      type: string;
      fields: Record<string, string>;
    }>,
    componentCount: number,
    wireCount: number,
    hasProgram: boolean,
  ): CircuitDiagnosticSnapshot {
    // Clear previous diagnostics
    this.clearAll();

    // 1. Detect circuit issues
    const issues = this.detectCircuitIssues(components, gpioMappings);
    for (const issue of issues) {
      this.registerIssue(issue.issueId, issue);
    }

    // 2. Generate recommendations
    const recommendations = this.generateRecommendations(issues);
    for (const rec of recommendations) {
      this.registerRecommendation(rec.recommendationId, rec);
    }

    // 3. Generate learning hints
    const componentTypes = components.map(c => c.type);
    const learningHints = this.generateLearningHints(issues, componentTypes);
    for (const hint of learningHints) {
      this.registerHint(hint.hintId, hint);
    }

    // 4. Detect Blockly diagnostics
    const blocklyGpioMappings = gpioMappings.map(m => ({
      gpioNumber: m.gpioNumber,
      componentId: m.componentId,
    }));
    const blocklyDiags = this.detectBlocklyDiagnostics(programBlocks, blocklyGpioMappings);
    for (const diag of blocklyDiags) {
      this.registerBlocklyDiagnostic(diag.diagnosticId, diag);
    }

    // 5. Calculate project readiness
    const errorCount = issues.filter(i => i.severity === 'ERROR').length;
    const readiness = this.calculateProjectReadiness(
      componentCount,
      wireCount,
      issues.length,
      errorCount,
      hasProgram,
    );
    this.registerReadiness(readiness.readinessId, readiness);

    // 6. Calculate health score
    const { score, grade } = this.calculateHealthScore(issues);

    return {
      issues: safeDeepCopy(this.getAllIssues()),
      recommendations: safeDeepCopy(this.getAllRecommendations()),
      learningHints: safeDeepCopy(this.getAllHints()),
      blocklyDiagnostics: safeDeepCopy(this.getAllBlocklyDiagnostics()),
      projectReadiness: safeDeepCopy(readiness),
      healthScore: score,
      healthGrade: grade,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // SNAPSHOT & LIFECYCLE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Returns a complete diagnostic snapshot of all registries.
   */
  public getSnapshot(): CircuitDiagnosticSnapshot {
    const issues = this.getAllIssues();
    const { score, grade } = this.calculateHealthScore(issues);
    const allReadiness = this.getAllReadiness();

    return {
      issues: safeDeepCopy(issues),
      recommendations: safeDeepCopy(this.getAllRecommendations()),
      learningHints: safeDeepCopy(this.getAllHints()),
      blocklyDiagnostics: safeDeepCopy(this.getAllBlocklyDiagnostics()),
      projectReadiness: allReadiness.length > 0 ? safeDeepCopy(allReadiness[allReadiness.length - 1]) : null,
      healthScore: score,
      healthGrade: grade,
    };
  }

  /**
   * Clears all 5 registries and resets counters.
   */
  public clearAll(): void {
    this.clearIssues();
    this.clearRecommendations();
    this.clearHints();
    this.clearReadiness();
    this.clearBlocklyDiagnostics();
    this.issueCounter = 0;
    this.recommendationCounter = 0;
    this.hintCounter = 0;
    this.diagnosticCounter = 0;
  }
}
