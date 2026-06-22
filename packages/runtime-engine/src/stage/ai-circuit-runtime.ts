/**
 * Phase 32B — AI Circuit Runtime
 *
 * AI-driven circuit generation from natural language prompts.
 * Analyzes user intent, extracts components, generates project requirements.
 *
 * Extends existing: auto-wiring-runtime, component-knowledge-runtime,
 * circuit-wizard-runtime, circuit-diagnostics-runtime.
 */

import type {
  AICircuitRequestModel,
  AICircuitGenerationModel,
  AICircuitSuggestionModel,
  AICircuitValidationModel,
  AIGenerationSnapshot,
  AICircuitCategory,
  AIGenerationStatus,
} from '../types';

// ─── Helpers ────────────────────────────────────────────────

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

const WARN_PREFIX = '[Phase 32B AICircuit]';

// ─── Constants ──────────────────────────────────────────────

export const VALID_AI_CATEGORIES: AICircuitCategory[] = [
  'robotics', 'iot', 'electronics', 'automation', 'stem_project', 'competition', 'custom',
];

export const VALID_AI_STATUSES: AIGenerationStatus[] = [
  'idle', 'analyzing', 'generating_components', 'generating_wiring',
  'generating_blockly', 'generating_scene', 'validating', 'completed', 'failed',
];

// ─── Keyword Databases ──────────────────────────────────────

const SENSOR_KEYWORDS: Record<string, string> = {
  ultrasonic: 'HC-SR04', distance: 'HC-SR04', sonar: 'HC-SR04',
  temperature: 'DHT11', humidity: 'DHT11', dht: 'DHT11', dht22: 'DHT22',
  pir: 'PIR Sensor', motion: 'PIR Sensor', infrared: 'IR Sensor', ir: 'IR Sensor',
  light: 'LDR', ldr: 'LDR', photoresistor: 'LDR',
  gas: 'MQ-2', smoke: 'MQ-2', fire: 'Flame Sensor', flame: 'Flame Sensor',
  rain: 'Rain Sensor', soil: 'Soil Moisture Sensor', moisture: 'Soil Moisture Sensor',
  color: 'TCS3200', touch: 'Touch Sensor', sound: 'Sound Sensor',
  line: 'IR Line Sensor', 'line follower': 'IR Line Sensor', 'line following': 'IR Line Sensor',
  pressure: 'BMP280', altitude: 'BMP280', barometric: 'BMP280',
  accelerometer: 'MPU6050', gyroscope: 'MPU6050', imu: 'MPU6050',
  gps: 'GPS Module', rfid: 'RFID Module',
};

const ACTUATOR_KEYWORDS: Record<string, string> = {
  led: 'LED', light: 'LED', lamp: 'LED',
  motor: 'DC Motor', dc: 'DC Motor',
  servo: 'SG90 Servo', 'servo motor': 'SG90 Servo',
  stepper: 'Stepper Motor',
  buzzer: 'Buzzer', alarm: 'Buzzer', beep: 'Buzzer',
  relay: 'Relay Module', switch: 'Relay Module',
  pump: 'Water Pump', water: 'Water Pump', irrigation: 'Water Pump',
  display: 'OLED Display', oled: 'OLED Display', lcd: 'LCD 16x2',
  fan: 'DC Motor', heater: 'Relay Module',
  rgb: 'RGB LED', neopixel: 'NeoPixel Strip',
};

const BOARD_KEYWORDS: Record<string, string> = {
  esp32: 'ESP32 DevKit V1', 'esp32-s3': 'ESP32-S3', 'esp32-cam': 'ESP32-CAM',
  'esp32-c3': 'ESP32-C3', arduino: 'ESP32 DevKit V1', nodemcu: 'ESP32 DevKit V1',
};

const CATEGORY_KEYWORDS: Record<string, AICircuitCategory> = {
  robot: 'robotics', robotics: 'robotics', 'line follower': 'robotics', 'obstacle avoid': 'robotics',
  car: 'robotics', rover: 'robotics', arm: 'robotics', bot: 'robotics',
  iot: 'iot', smart: 'iot', 'smart home': 'iot', home: 'iot', cloud: 'iot',
  wifi: 'iot', bluetooth: 'iot', remote: 'iot', monitor: 'iot',
  led: 'electronics', blink: 'electronics', circuit: 'electronics', breadboard: 'electronics',
  resistor: 'electronics', capacitor: 'electronics', transistor: 'electronics',
  automatic: 'automation', automation: 'automation', auto: 'automation', timer: 'automation',
  irrigation: 'automation', street: 'automation', parking: 'automation',
  project: 'stem_project', stem: 'stem_project', science: 'stem_project', fair: 'competition',
  competition: 'competition', hackathon: 'competition',
};

// ─── Prompt Analysis ────────────────────────────────────────

/** Analyze a natural language prompt and extract structured data */
export function analyzePrompt(prompt: string): {
  intent: string;
  components: string[];
  sensors: string[];
  actuators: string[];
  boardType: string;
  category: AICircuitCategory;
} {
  const lower = prompt.toLowerCase().trim();
  return {
    intent: extractIntent(lower),
    components: extractComponents(lower),
    sensors: extractSensors(lower),
    actuators: extractActuators(lower),
    boardType: extractBoardType(lower),
    category: extractCategory(lower),
  };
}

/** Extract the user's intent from a prompt */
export function extractIntent(prompt: string): string {
  const lower = prompt.toLowerCase().trim();
  if (!lower) return 'Unknown project';

  // Extract "create a X" or "make a X" or "build a X"
  const createMatch = lower.match(/(?:create|make|build|design|set up|setup)\s+(?:a|an|the)?\s*(.+?)(?:\s+using|\s+with|\s+that|\s+which|$)/);
  if (createMatch) return createMatch[1].trim();

  // Extract "X using Y"
  const usingMatch = lower.match(/^(.+?)\s+(?:using|with)\s+/);
  if (usingMatch) return usingMatch[1].trim();

  return lower.length > 80 ? lower.substring(0, 80) + '...' : lower;
}

/** Extract components from prompt */
export function extractComponents(prompt: string): string[] {
  const found = new Set<string>();
  const lower = prompt.toLowerCase();
  for (const [kw, comp] of Object.entries(SENSOR_KEYWORDS)) {
    if (lower.includes(kw)) found.add(comp);
  }
  for (const [kw, comp] of Object.entries(ACTUATOR_KEYWORDS)) {
    if (lower.includes(kw)) found.add(comp);
  }
  // Always include board
  found.add(extractBoardType(lower));
  // Always include breadboard
  found.add('Breadboard');
  return [...found];
}

/** Extract sensors from prompt */
export function extractSensors(prompt: string): string[] {
  const found = new Set<string>();
  const lower = prompt.toLowerCase();
  for (const [kw, sensor] of Object.entries(SENSOR_KEYWORDS)) {
    if (lower.includes(kw)) found.add(sensor);
  }
  return [...found];
}

/** Extract actuators from prompt */
export function extractActuators(prompt: string): string[] {
  const found = new Set<string>();
  const lower = prompt.toLowerCase();
  for (const [kw, act] of Object.entries(ACTUATOR_KEYWORDS)) {
    if (lower.includes(kw)) found.add(act);
  }
  return [...found];
}

/** Extract board type from prompt */
export function extractBoardType(prompt: string): string {
  const lower = prompt.toLowerCase();
  // Sort by keyword length descending to match longer variants first
  const sorted = Object.entries(BOARD_KEYWORDS).sort((a, b) => b[0].length - a[0].length);
  for (const [kw, board] of sorted) {
    if (lower.includes(kw)) return board;
  }
  return 'ESP32 DevKit V1'; // Default
}

/** Extract project category from prompt */
export function extractCategory(prompt: string): AICircuitCategory {
  const lower = prompt.toLowerCase();
  for (const [kw, cat] of Object.entries(CATEGORY_KEYWORDS)) {
    if (lower.includes(kw)) return cat;
  }
  return 'custom';
}

// ─── Request Factory ────────────────────────────────────────

/** Create an AI circuit request from a user prompt */
export function createAICircuitRequest(prompt: string): AICircuitRequestModel {
  const analysis = analyzePrompt(prompt);
  return {
    requestId: generateId(),
    prompt,
    category: analysis.category,
    extractedIntent: analysis.intent,
    extractedComponents: analysis.components,
    extractedSensors: analysis.sensors,
    extractedActuators: analysis.actuators,
    extractedBoardType: analysis.boardType,
    createdAt: Date.now(),
    deleted: false,
  };
}

/** Validate an AI circuit request */
export function validateAICircuitRequest(
  req: unknown,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!req || typeof req !== 'object') {
    warnings.push(`${WARN_PREFIX} Request is null or not an object.`);
    console.warn(warnings[warnings.length - 1]);
    return { valid: false, warnings };
  }
  const r = req as Record<string, unknown>;
  if (typeof r.requestId !== 'string' || !r.requestId) {
    warnings.push(`${WARN_PREFIX} Request has empty requestId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof r.prompt !== 'string' || !r.prompt) {
    warnings.push(`${WARN_PREFIX} Request has empty prompt.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof r.category !== 'string' || !VALID_AI_CATEGORIES.includes(r.category as AICircuitCategory)) {
    warnings.push(`${WARN_PREFIX} Request has invalid category "${r.category}".`);
    console.warn(warnings[warnings.length - 1]);
  }
  return { valid: warnings.length === 0, warnings };
}

// ─── Generation Engine ──────────────────────────────────────

/** Generate a component layout from a request */
export function generateComponentLayout(
  request: AICircuitRequestModel,
): Array<{ componentId: string; type: string; x: number; y: number }> {
  const layout: Array<{ componentId: string; type: string; x: number; y: number }> = [];
  const spacing = 120;
  let col = 0;

  // Board in center
  layout.push({ componentId: generateId(), type: request.extractedBoardType, x: 400, y: 300 });

  // Sensors on the left
  for (const sensor of request.extractedSensors) {
    layout.push({ componentId: generateId(), type: sensor, x: 100, y: 150 + col * spacing });
    col++;
  }

  // Actuators on the right
  col = 0;
  for (const actuator of request.extractedActuators) {
    layout.push({ componentId: generateId(), type: actuator, x: 700, y: 150 + col * spacing });
    col++;
  }

  return layout;
}

/** Generate wiring for a component layout */
export function generateWiring(
  layout: Array<{ componentId: string; type: string; x: number; y: number }>,
): Array<{ wireId: string; from: string; to: string; color: string }> {
  const wires: Array<{ wireId: string; from: string; to: string; color: string }> = [];
  const board = layout.find(c => c.type.includes('ESP32') || c.type.includes('DevKit'));
  if (!board) return wires;

  const wireColors = ['#FF0000', '#00FF00', '#0000FF', '#FFAA00', '#FF00FF', '#00FFFF', '#FFFFFF'];
  let colorIdx = 0;

  for (const comp of layout) {
    if (comp.componentId === board.componentId) continue;
    // Power wire (red)
    wires.push({ wireId: generateId(), from: `${board.componentId}:3V3`, to: `${comp.componentId}:VCC`, color: '#FF0000' });
    // Ground wire (black)
    wires.push({ wireId: generateId(), from: `${board.componentId}:GND`, to: `${comp.componentId}:GND`, color: '#000000' });
    // Signal wire (colored)
    wires.push({ wireId: generateId(), from: `${board.componentId}:GPIO${2 + colorIdx}`, to: `${comp.componentId}:SIG`, color: wireColors[colorIdx % wireColors.length] });
    colorIdx++;
  }

  return wires;
}

/** Generate a Blockly program stub for the request */
export function generateBlocklyProgram(
  request: AICircuitRequestModel,
): string {
  const lines: string[] = [];
  lines.push('// Auto-generated by STEMVerse AI Circuit Assistant');
  lines.push(`// Project: ${request.extractedIntent}`);
  lines.push(`// Board: ${request.extractedBoardType}`);
  lines.push('');
  lines.push('void setup() {');
  lines.push('  Serial.begin(115200);');

  let pinNum = 2;
  for (const sensor of request.extractedSensors) {
    lines.push(`  // ${sensor}`);
    lines.push(`  pinMode(${pinNum}, INPUT);`);
    pinNum++;
  }
  for (const actuator of request.extractedActuators) {
    lines.push(`  // ${actuator}`);
    lines.push(`  pinMode(${pinNum}, OUTPUT);`);
    pinNum++;
  }

  lines.push('}');
  lines.push('');
  lines.push('void loop() {');

  pinNum = 2;
  for (const sensor of request.extractedSensors) {
    lines.push(`  int ${sensor.replace(/[^a-zA-Z0-9]/g, '_')}_val = digitalRead(${pinNum});`);
    lines.push(`  Serial.println(${sensor.replace(/[^a-zA-Z0-9]/g, '_')}_val);`);
    pinNum++;
  }
  for (const actuator of request.extractedActuators) {
    lines.push(`  // Control ${actuator}`);
    lines.push(`  digitalWrite(${pinNum}, HIGH);`);
    pinNum++;
  }

  lines.push('  delay(100);');
  lines.push('}');
  return lines.join('\n');
}

/** Generate a simulation scene */
export function generateSimulationScene(
  request: AICircuitRequestModel,
  layout: Array<{ componentId: string; type: string; x: number; y: number }>,
): Record<string, unknown> {
  return {
    projectName: request.extractedIntent,
    boardType: request.extractedBoardType,
    componentCount: layout.length,
    cameraPosition: { x: 400, y: 300, zoom: 1.0 },
    gridEnabled: true,
    snapEnabled: true,
    components: layout.map(c => ({ id: c.componentId, type: c.type, position: { x: c.x, y: c.y } })),
  };
}

/** Generate diagnostics for a generated project */
export function generateDiagnostics(
  request: AICircuitRequestModel,
  layout: Array<{ componentId: string; type: string; x: number; y: number }>,
  wiring: Array<{ wireId: string; from: string; to: string; color: string }>,
): AICircuitValidationModel {
  const missingComponents: string[] = [];
  const invalidWirings: string[] = [];
  const powerIssues: string[] = [];
  const conflicts: string[] = [];
  const fixSuggestions: string[] = [];
  let passedChecks = 0;
  const totalChecks = 8;

  // Check: has board
  if (layout.some(c => c.type.includes('ESP32'))) passedChecks++;
  else { missingComponents.push('ESP32 DevKit V1'); fixSuggestions.push('Add an ESP32 board'); }

  // Check: has at least one sensor or actuator
  if (request.extractedSensors.length > 0 || request.extractedActuators.length > 0) passedChecks++;
  else fixSuggestions.push('Add at least one sensor or actuator');

  // Check: all sensors placed
  for (const sensor of request.extractedSensors) {
    if (layout.some(c => c.type === sensor)) passedChecks++;
    else missingComponents.push(sensor);
  }

  // Check: all actuators placed
  for (const actuator of request.extractedActuators) {
    if (layout.some(c => c.type === actuator)) passedChecks++;
    else missingComponents.push(actuator);
  }

  // Check: wiring exists
  if (wiring.length > 0) passedChecks++;
  else fixSuggestions.push('Generate wiring connections');

  // Check: power connections
  const hasPower = wiring.some(w => w.to.includes('VCC') || w.to.includes('3V3'));
  if (hasPower) passedChecks++;
  else powerIssues.push('Missing power connections');

  // Check: ground connections
  const hasGround = wiring.some(w => w.to.includes('GND'));
  if (hasGround) passedChecks++;
  else powerIssues.push('Missing ground connections');

  const healthScore = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

  return {
    validationId: generateId(),
    generationId: '',
    healthScore,
    missingComponents,
    invalidWirings,
    powerIssues,
    conflicts,
    fixSuggestions,
    passedChecks,
    totalChecks,
    timestamp: Date.now(),
  };
}

/** Full project generation from a request */
export function generateProject(
  request: AICircuitRequestModel,
): AICircuitGenerationModel {
  const startTime = Date.now();
  const layout = generateComponentLayout(request);
  const wiring = generateWiring(layout);
  const blocklyProgram = generateBlocklyProgram(request);
  const scene = generateSimulationScene(request, layout);
  const diagnostics = generateDiagnostics(request, layout, wiring);

  return {
    generationId: generateId(),
    requestId: request.requestId,
    templateId: null,
    status: 'completed',
    componentLayout: layout,
    wiring,
    blocklyProgram,
    simulationScene: scene,
    healthScore: diagnostics.healthScore,
    diagnostics: diagnostics.fixSuggestions,
    warnings: [...diagnostics.missingComponents.map(c => `Missing: ${c}`), ...diagnostics.powerIssues],
    generatedAt: Date.now(),
    durationMs: Date.now() - startTime,
    deleted: false,
  };
}

/** Validate an AI generation model */
export function validateAICircuitGeneration(
  gen: unknown,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!gen || typeof gen !== 'object') {
    warnings.push(`${WARN_PREFIX} Generation is null or not an object.`);
    console.warn(warnings[warnings.length - 1]);
    return { valid: false, warnings };
  }
  const g = gen as Record<string, unknown>;
  if (typeof g.generationId !== 'string' || !g.generationId) {
    warnings.push(`${WARN_PREFIX} Generation has empty generationId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof g.requestId !== 'string' || !g.requestId) {
    warnings.push(`${WARN_PREFIX} Generation has empty requestId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof g.status !== 'string' || !VALID_AI_STATUSES.includes(g.status as AIGenerationStatus)) {
    warnings.push(`${WARN_PREFIX} Generation has invalid status "${g.status}".`);
    console.warn(warnings[warnings.length - 1]);
  }
  return { valid: warnings.length === 0, warnings };
}

/** Create a suggestion for a request */
export function createAICircuitSuggestion(
  requestId: string,
  title: string,
  description: string,
  confidence: number,
): AICircuitSuggestionModel {
  return {
    suggestionId: generateId(),
    requestId,
    title,
    description,
    confidence: Math.max(0, Math.min(1, confidence)),
    alternativeComponents: [],
    tips: [],
  };
}

/** Validate an AI suggestion */
export function validateAICircuitSuggestion(
  sug: unknown,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!sug || typeof sug !== 'object') {
    warnings.push(`${WARN_PREFIX} Suggestion is null or not an object.`);
    console.warn(warnings[warnings.length - 1]);
    return { valid: false, warnings };
  }
  const s = sug as Record<string, unknown>;
  if (typeof s.suggestionId !== 'string' || !s.suggestionId) {
    warnings.push(`${WARN_PREFIX} Suggestion has empty suggestionId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  return { valid: warnings.length === 0, warnings };
}

/** Validate an AI validation model */
export function validateAICircuitValidation(
  val: unknown,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!val || typeof val !== 'object') {
    warnings.push(`${WARN_PREFIX} Validation is null or not an object.`);
    console.warn(warnings[warnings.length - 1]);
    return { valid: false, warnings };
  }
  const v = val as Record<string, unknown>;
  if (typeof v.validationId !== 'string' || !v.validationId) {
    warnings.push(`${WARN_PREFIX} Validation has empty validationId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  return { valid: warnings.length === 0, warnings };
}

// ─── Default Snapshot ───────────────────────────────────────

export function createDefaultAIGenerationSnapshot(): AIGenerationSnapshot {
  return {
    requests: [],
    templates: [],
    generations: [],
    suggestions: [],
    validations: [],
    requestCount: 0,
    templateCount: 0,
    generationCount: 0,
  };
}

// ─── AICircuitSynchronizer ──────────────────────────────────

export class AICircuitSynchronizer {
  private readonly requests = new Map<string, AICircuitRequestModel>();
  private readonly requestOrder: string[] = [];
  private readonly generations = new Map<string, AICircuitGenerationModel>();
  private readonly generationOrder: string[] = [];
  private readonly suggestions = new Map<string, AICircuitSuggestionModel>();
  private readonly suggestionOrder: string[] = [];
  private readonly validations = new Map<string, AICircuitValidationModel>();
  private readonly validationOrder: string[] = [];

  // ── Request CRUD ──
  public registerRequest(req: AICircuitRequestModel): void {
    if (!req.requestId) { console.warn(`${WARN_PREFIX} registerRequest: empty ID.`); return; }
    const copy = deepCopy(req);
    if (this.requests.has(req.requestId)) {
      console.warn(`${WARN_PREFIX} Duplicate request "${req.requestId}". Replacing.`);
      this.requests.set(req.requestId, copy); return;
    }
    this.requests.set(req.requestId, copy);
    this.requestOrder.push(req.requestId);
  }
  public getRequest(id: string): AICircuitRequestModel | undefined {
    const v = this.requests.get(id); return v ? deepCopy(v) : undefined;
  }
  public getAllRequests(): AICircuitRequestModel[] {
    return this.requestOrder.filter(id => this.requests.has(id)).map(id => deepCopy(this.requests.get(id)!));
  }
  public updateRequest(id: string, updates: Partial<AICircuitRequestModel>): void {
    const e = this.requests.get(id);
    if (!e) { console.warn(`${WARN_PREFIX} Request "${id}" not found.`); return; }
    this.requests.set(id, { ...deepCopy(e), ...updates, requestId: id });
  }
  public removeRequest(id: string): void {
    this.requests.delete(id);
    const i = this.requestOrder.indexOf(id); if (i !== -1) this.requestOrder.splice(i, 1);
  }
  public clearRequests(): void { this.requests.clear(); this.requestOrder.length = 0; }
  public getRequestKeys(): string[] { return [...this.requestOrder]; }
  public hasRequest(id: string): boolean { return this.requests.has(id); }

  // ── Generation CRUD ──
  public registerGeneration(gen: AICircuitGenerationModel): void {
    if (!gen.generationId) { console.warn(`${WARN_PREFIX} registerGeneration: empty ID.`); return; }
    const copy = deepCopy(gen);
    if (this.generations.has(gen.generationId)) {
      console.warn(`${WARN_PREFIX} Duplicate generation "${gen.generationId}". Replacing.`);
      this.generations.set(gen.generationId, copy); return;
    }
    this.generations.set(gen.generationId, copy);
    this.generationOrder.push(gen.generationId);
  }
  public getGeneration(id: string): AICircuitGenerationModel | undefined {
    const v = this.generations.get(id); return v ? deepCopy(v) : undefined;
  }
  public getAllGenerations(): AICircuitGenerationModel[] {
    return this.generationOrder.filter(id => this.generations.has(id)).map(id => deepCopy(this.generations.get(id)!));
  }
  public updateGeneration(id: string, updates: Partial<AICircuitGenerationModel>): void {
    const e = this.generations.get(id);
    if (!e) { console.warn(`${WARN_PREFIX} Generation "${id}" not found.`); return; }
    this.generations.set(id, { ...deepCopy(e), ...updates, generationId: id });
  }
  public removeGeneration(id: string): void {
    this.generations.delete(id);
    const i = this.generationOrder.indexOf(id); if (i !== -1) this.generationOrder.splice(i, 1);
  }
  public clearGenerations(): void { this.generations.clear(); this.generationOrder.length = 0; }
  public getGenerationKeys(): string[] { return [...this.generationOrder]; }
  public hasGeneration(id: string): boolean { return this.generations.has(id); }

  // ── Suggestion CRUD ──
  public registerSuggestion(sug: AICircuitSuggestionModel): void {
    if (!sug.suggestionId) { console.warn(`${WARN_PREFIX} registerSuggestion: empty ID.`); return; }
    const copy = deepCopy(sug);
    if (this.suggestions.has(sug.suggestionId)) {
      this.suggestions.set(sug.suggestionId, copy); return;
    }
    this.suggestions.set(sug.suggestionId, copy);
    this.suggestionOrder.push(sug.suggestionId);
  }
  public getSuggestion(id: string): AICircuitSuggestionModel | undefined {
    const v = this.suggestions.get(id); return v ? deepCopy(v) : undefined;
  }
  public getAllSuggestions(): AICircuitSuggestionModel[] {
    return this.suggestionOrder.filter(id => this.suggestions.has(id)).map(id => deepCopy(this.suggestions.get(id)!));
  }
  public removeSuggestion(id: string): void {
    this.suggestions.delete(id);
    const i = this.suggestionOrder.indexOf(id); if (i !== -1) this.suggestionOrder.splice(i, 1);
  }
  public clearSuggestions(): void { this.suggestions.clear(); this.suggestionOrder.length = 0; }
  public hasSuggestion(id: string): boolean { return this.suggestions.has(id); }

  // ── Validation CRUD ──
  public registerValidation(val: AICircuitValidationModel): void {
    if (!val.validationId) { console.warn(`${WARN_PREFIX} registerValidation: empty ID.`); return; }
    const copy = deepCopy(val);
    if (this.validations.has(val.validationId)) {
      this.validations.set(val.validationId, copy); return;
    }
    this.validations.set(val.validationId, copy);
    this.validationOrder.push(val.validationId);
  }
  public getValidation(id: string): AICircuitValidationModel | undefined {
    const v = this.validations.get(id); return v ? deepCopy(v) : undefined;
  }
  public getAllValidations(): AICircuitValidationModel[] {
    return this.validationOrder.filter(id => this.validations.has(id)).map(id => deepCopy(this.validations.get(id)!));
  }
  public removeValidation(id: string): void {
    this.validations.delete(id);
    const i = this.validationOrder.indexOf(id); if (i !== -1) this.validationOrder.splice(i, 1);
  }
  public clearValidations(): void { this.validations.clear(); this.validationOrder.length = 0; }
  public hasValidation(id: string): boolean { return this.validations.has(id); }

  // ── Lifecycle ──
  public clear(): void {
    this.clearRequests(); this.clearGenerations(); this.clearSuggestions(); this.clearValidations();
  }

  public buildSnapshot(): Partial<AIGenerationSnapshot> {
    return {
      requests: this.getAllRequests(),
      generations: this.getAllGenerations(),
      suggestions: this.getAllSuggestions(),
      validations: this.getAllValidations(),
      requestCount: this.requests.size,
      generationCount: this.generations.size,
    };
  }

  public toJSON(): Partial<AIGenerationSnapshot> { return this.buildSnapshot(); }

  public fromJSON(json: Partial<AIGenerationSnapshot>): void {
    this.clear();
    if (!json) return;
    for (const r of json.requests || []) this.registerRequest(r);
    for (const g of json.generations || []) this.registerGeneration(g);
    for (const s of json.suggestions || []) this.registerSuggestion(s);
    for (const v of json.validations || []) this.registerValidation(v);
  }

  public clone(): AICircuitSynchronizer {
    const c = new AICircuitSynchronizer();
    c.fromJSON(this.toJSON());
    return c;
  }

  public get requestSize(): number { return this.requests.size; }
  public get generationSize(): number { return this.generations.size; }
  public get suggestionSize(): number { return this.suggestions.size; }
  public get validationSize(): number { return this.validations.size; }
}
