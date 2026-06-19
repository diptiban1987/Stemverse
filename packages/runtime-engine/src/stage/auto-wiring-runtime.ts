// ═══════════════════════════════════════════════════════════════
// Phase 29B: Auto-Wiring Engine
// Provides intelligent wire suggestions, auto-placement, wiring plans,
// and circuit repair capabilities.
// ═══════════════════════════════════════════════════════════════

import type {
  AutoWireSuggestionModel,
  AutoWireRuleModel,
  AutoWirePlanModel,
  AutoWireSnapshot,
  WireSignalType,
  WireColor,
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

/**
 * All valid wire signal types used for categorizing pin connections.
 * Each signal type determines the wire color and routing behavior.
 *
 * - VCC: Power supply line (typically 3.3V or 5V)
 * - GND: Ground return path
 * - DIGITAL: Standard digital I/O (HIGH/LOW)
 * - ANALOG: Analog input (ADC-capable pins)
 * - I2C: Inter-Integrated Circuit bus (SDA/SCL)
 * - PWM: Pulse Width Modulation output
 * - DATA: Generic data lines (e.g., one-wire sensors)
 * - SPI: Serial Peripheral Interface bus
 * - UART: Universal Asynchronous Receiver/Transmitter
 */
const VALID_WIRE_SIGNAL_TYPES: WireSignalType[] = [
  'VCC', 'GND', 'DIGITAL', 'ANALOG', 'I2C', 'PWM', 'DATA', 'SPI', 'UART',
];

/**
 * All valid wire colors used for visual identification in the breadboard view.
 * Colors are assigned automatically based on signal type.
 */
const VALID_WIRE_COLORS: WireColor[] = [
  'RED', 'BLACK', 'BLUE', 'GREEN', 'YELLOW', 'ORANGE', 'WHITE', 'PURPLE',
];

/**
 * Maps each signal type to its conventional wire color.
 * This follows real-world electronics color conventions:
 * - RED for power (VCC), BLACK for ground (GND)
 * - BLUE for digital signals, GREEN for analog
 * - YELLOW for I2C bus, ORANGE for PWM
 * - WHITE for generic data, PURPLE for SPI
 * - UART shares BLUE with digital since it is a digital protocol
 */
const WIRE_COLOR_BY_SIGNAL: Record<WireSignalType, WireColor> = {
  VCC: 'RED',
  GND: 'BLACK',
  DIGITAL: 'BLUE',
  ANALOG: 'GREEN',
  I2C: 'YELLOW',
  PWM: 'ORANGE',
  DATA: 'WHITE',
  SPI: 'PURPLE',
  UART: 'BLUE',
};

/**
 * Default GPIO pin assignments for each component type.
 * Maps component type → pin name → GPIO number.
 *
 * A value of -1 indicates the pin connects to a power rail (VCC/GND)
 * rather than a specific GPIO, so no GPIO number is assigned.
 *
 * These defaults match the ESP32 DevKit V1 pin layout used in STEMVerse.
 */
const DEFAULT_GPIO_ASSIGNMENTS: Record<string, Record<string, number>> = {
  LED: {
    ANODE: 13,
    CATHODE: -1,
  },
  'HC-SR04': {
    TRIG: 5,
    ECHO: 18,
    VCC: -1,
    GND: -1,
  },
  SERVO: {
    SIGNAL: 13,
    VCC: -1,
    GND: -1,
  },
  OLED_SSD1306: {
    SDA: 21,
    SCL: 22,
    VCC: -1,
    GND: -1,
  },
  LCD_1602: {
    SDA: 21,
    SCL: 22,
    VCC: -1,
    GND: -1,
  },
  DHT11: {
    DATA: 4,
    VCC: -1,
    GND: -1,
  },
  MQ2_GAS_SENSOR: {
    AOUT: 34,
    VCC: -1,
    GND: -1,
  },
  PUSH_BUTTON: {
    PIN_A: 15,
    PIN_B: -1,
  },
  POTENTIOMETER: {
    WIPER: 36,
    VCC: -1,
    GND: -1,
  },
  RELAY: {
    SIGNAL: 26,
    VCC: -1,
    GND: -1,
  },
  BUZZER: {
    SIGNAL: 25,
    GND: -1,
  },
  IR_SENSOR: {
    OUT: 35,
    VCC: -1,
    GND: -1,
  },
  RGB_LED: {
    RED: 27,
    GREEN: 14,
    BLUE: 12,
    COMMON: -1,
  },
  RESISTOR: {
    PIN_A: -1,
    PIN_B: -1,
  },
};

/**
 * Maps pin names to their signal types.
 * Used to automatically determine the signal type (and therefore wire color)
 * when a pin name is known but the signal type is not explicitly provided.
 */
const PIN_SIGNAL_TYPES: Record<string, WireSignalType> = {
  VCC: 'VCC',
  GND: 'GND',
  ANODE: 'DIGITAL',
  CATHODE: 'GND',
  SIGNAL: 'PWM',
  TRIG: 'DIGITAL',
  ECHO: 'DIGITAL',
  DATA: 'DATA',
  SDA: 'I2C',
  SCL: 'I2C',
  AOUT: 'ANALOG',
  WIPER: 'ANALOG',
  OUT: 'DIGITAL',
  RED: 'PWM',
  GREEN: 'PWM',
  BLUE: 'PWM',
  PIN_A: 'DIGITAL',
  PIN_B: 'GND',
  COMMON: 'GND',
  DOUT: 'DIGITAL',
};

/**
 * Physical placement specifications for each component type on the breadboard.
 * Defines how many rows and columns a component occupies, and which row
 * it should start on for optimal layout.
 *
 * - rowSpan: number of breadboard rows the component occupies
 * - colSpan: number of breadboard columns the component occupies
 * - startRow: preferred starting row for auto-placement (1-indexed)
 *
 * These specs ensure components do not overlap and are placed in
 * visually logical positions on the breadboard grid.
 */
const COMPONENT_PLACEMENT_SPECS: Record<string, {
  rowSpan: number;
  colSpan: number;
  startRow: number;
}> = {
  LED: { rowSpan: 2, colSpan: 1, startRow: 5 },
  'HC-SR04': { rowSpan: 4, colSpan: 2, startRow: 1 },
  SERVO: { rowSpan: 3, colSpan: 2, startRow: 1 },
  OLED_SSD1306: { rowSpan: 4, colSpan: 4, startRow: 1 },
  LCD_1602: { rowSpan: 4, colSpan: 8, startRow: 1 },
  DHT11: { rowSpan: 3, colSpan: 1, startRow: 1 },
  MQ2_GAS_SENSOR: { rowSpan: 3, colSpan: 2, startRow: 1 },
  PUSH_BUTTON: { rowSpan: 2, colSpan: 2, startRow: 5 },
  POTENTIOMETER: { rowSpan: 3, colSpan: 1, startRow: 3 },
  RELAY: { rowSpan: 3, colSpan: 2, startRow: 1 },
  BUZZER: { rowSpan: 2, colSpan: 1, startRow: 5 },
  IR_SENSOR: { rowSpan: 3, colSpan: 1, startRow: 1 },
  RGB_LED: { rowSpan: 2, colSpan: 1, startRow: 5 },
  RESISTOR: { rowSpan: 1, colSpan: 3, startRow: 10 },
};

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Creates a default AutoWireSuggestionModel with sensible defaults.
 * The suggestionId is always placed LAST to prevent accidental override
 * from the overrides spread.
 */
export function createDefaultAutoWireSuggestionModel(
  id: string,
  overrides: Partial<AutoWireSuggestionModel> = {},
): AutoWireSuggestionModel {
  return {
    componentId: '',
    componentType: '',
    sourcePinName: '',
    targetPinName: '',
    targetRail: '',
    gpioNumber: -1,
    signalType: 'DIGITAL',
    wireColor: 'BLUE',
    explanation: '',
    priority: 0,
    isRequired: false,
    futureWireHints: {},
    ...overrides,
    suggestionId: id,
  };
}

/**
 * Creates a default AutoWireRuleModel with sensible defaults.
 * The ruleId is always placed LAST to prevent accidental override
 * from the overrides spread.
 */
export function createDefaultAutoWireRuleModel(
  id: string,
  overrides: Partial<AutoWireRuleModel> = {},
): AutoWireRuleModel {
  return {
    componentType: '',
    pinMappings: [],
    placementRow: 0,
    placementCol: 0,
    placementSpan: 1,
    futureRuleHints: {},
    ...overrides,
    ruleId: id,
  };
}

/**
 * Creates a default AutoWirePlanModel with sensible defaults.
 * The planId is always placed LAST to prevent accidental override
 * from the overrides spread.
 */
export function createDefaultAutoWirePlanModel(
  id: string,
  overrides: Partial<AutoWirePlanModel> = {},
): AutoWirePlanModel {
  return {
    templateId: '',
    components: [],
    wireSuggestions: [],
    validationStatus: 'PENDING',
    validationErrors: [],
    totalWires: 0,
    completedWires: 0,
    futurePlanHints: {},
    ...overrides,
    planId: id,
  };
}

// ═══════════════════════════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════════════════════════

/**
 * Validates an AutoWireSuggestionModel and returns any warnings.
 * Never throws — all issues are reported as warnings.
 */
export function validateAutoWireSuggestionModel(
  model: AutoWireSuggestionModel,
  warnPrefix = '[AutoWiring]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_SUGGESTION', message: 'Auto-wire suggestion model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.suggestionId) {
    warnings.push({ code: 'EMPTY_SUGGESTION_ID', message: 'Auto-wire suggestion ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.componentId) {
    warnings.push({ code: 'EMPTY_SUGGESTION_COMPONENT_ID', message: `Auto-wire suggestion "${model.suggestionId}" has empty componentId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.componentType) {
    warnings.push({ code: 'EMPTY_SUGGESTION_COMPONENT_TYPE', message: `Auto-wire suggestion "${model.suggestionId}" has empty componentType.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.sourcePinName) {
    warnings.push({ code: 'EMPTY_SUGGESTION_SOURCE_PIN', message: `Auto-wire suggestion "${model.suggestionId}" has empty sourcePinName.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_WIRE_SIGNAL_TYPES.includes(model.signalType)) {
    warnings.push({ code: 'INVALID_SUGGESTION_SIGNAL_TYPE', message: `Auto-wire suggestion "${model.suggestionId}" has invalid signalType "${model.signalType}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_WIRE_COLORS.includes(model.wireColor)) {
    warnings.push({ code: 'INVALID_SUGGESTION_WIRE_COLOR', message: `Auto-wire suggestion "${model.suggestionId}" has invalid wireColor "${model.wireColor}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

/**
 * Validates an AutoWireRuleModel and returns any warnings.
 * Never throws — all issues are reported as warnings.
 */
export function validateAutoWireRuleModel(
  model: AutoWireRuleModel,
  warnPrefix = '[AutoWiring]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_RULE', message: 'Auto-wire rule model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.ruleId) {
    warnings.push({ code: 'EMPTY_RULE_ID', message: 'Auto-wire rule ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.componentType) {
    warnings.push({ code: 'EMPTY_RULE_COMPONENT_TYPE', message: `Auto-wire rule "${model.ruleId}" has empty componentType.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.pinMappings)) {
    warnings.push({ code: 'INVALID_RULE_PIN_MAPPINGS', message: `Auto-wire rule "${model.ruleId}" has invalid pinMappings (not an array).` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

/**
 * Validates an AutoWirePlanModel and returns any warnings.
 * Never throws — all issues are reported as warnings.
 */
export function validateAutoWirePlanModel(
  model: AutoWirePlanModel,
  warnPrefix = '[AutoWiring]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_PLAN', message: 'Auto-wire plan model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.planId) {
    warnings.push({ code: 'EMPTY_PLAN_ID', message: 'Auto-wire plan ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.templateId) {
    warnings.push({ code: 'EMPTY_PLAN_TEMPLATE_ID', message: `Auto-wire plan "${model.planId}" has empty templateId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.components)) {
    warnings.push({ code: 'INVALID_PLAN_COMPONENTS', message: `Auto-wire plan "${model.planId}" has invalid components (not an array).` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.wireSuggestions)) {
    warnings.push({ code: 'INVALID_PLAN_WIRE_SUGGESTIONS', message: `Auto-wire plan "${model.planId}" has invalid wireSuggestions (not an array).` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!['PENDING', 'VALID', 'INVALID'].includes(model.validationStatus)) {
    warnings.push({ code: 'INVALID_PLAN_VALIDATION_STATUS', message: `Auto-wire plan "${model.planId}" has invalid validationStatus "${model.validationStatus}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// SYNCHRONIZER
// ═══════════════════════════════════════════════════════════════

/**
 * AutoWiringSynchronizer manages auto-wire suggestions, rules, and wiring plans
 * for the STEMVerse breadboard. It provides intelligent wire suggestion generation,
 * component auto-placement, wiring plan creation/validation, and circuit repair.
 *
 * This synchronizer follows the standard RenderRegistry pattern:
 * - 3 registries: suggestions, rules, plans
 * - 8 CRUD methods per registry (24 total)
 * - getSnapshot() and clearAll() lifecycle methods
 * - safeDeepCopy on all external-facing data
 */
export class AutoWiringSynchronizer {
  private readonly suggestionRegistry = new RenderRegistry<AutoWireSuggestionModel>();
  private readonly ruleRegistry = new RenderRegistry<AutoWireRuleModel>();
  private readonly planRegistry = new RenderRegistry<AutoWirePlanModel>();
  private suggestionCounter = 0;
  private ruleCounter = 0;
  private planCounter = 0;

  // ─── Suggestion CRUD ──────────────────────────────────────────

  /**
   * Registers a new auto-wire suggestion in the suggestion registry.
   * The model is deep-copied before storage to prevent mutation leakage.
   */
  public registerSuggestion(key: string, model: AutoWireSuggestionModel): void {
    this.suggestionRegistry.register(key, safeDeepCopy(model), '[AutoWiring]');
  }

  /**
   * Retrieves a single auto-wire suggestion by key.
   * Returns undefined if the key does not exist.
   */
  public getSuggestion(key: string): AutoWireSuggestionModel | undefined {
    return this.suggestionRegistry.lookup(key);
  }

  /**
   * Returns all registered auto-wire suggestions in insertion order.
   * Each entry is a deep copy to prevent mutation leakage.
   */
  public getAllSuggestions(): AutoWireSuggestionModel[] {
    return this.suggestionRegistry.getAll();
  }

  /**
   * Updates fields on an existing auto-wire suggestion.
   * Warns if the key does not exist.
   */
  public updateSuggestion(key: string, updates: Partial<AutoWireSuggestionModel>): void {
    this.suggestionRegistry.update(key, updates, '[AutoWiring]');
  }

  /**
   * Removes an auto-wire suggestion by key.
   * Warns if the key does not exist.
   */
  public removeSuggestion(key: string): void {
    this.suggestionRegistry.remove(key);
  }

  /**
   * Clears all entries from the suggestion registry.
   */
  public clearSuggestions(): void {
    this.suggestionRegistry.clear();
  }

  /**
   * Returns all suggestion keys in insertion order.
   */
  public getSuggestionKeys(): string[] {
    return this.suggestionRegistry.keys();
  }

  /**
   * Checks if a suggestion with the given key exists.
   */
  public hasSuggestion(key: string): boolean {
    return this.suggestionRegistry.has(key);
  }

  // ─── Rule CRUD ────────────────────────────────────────────────

  /**
   * Registers a new auto-wire rule in the rule registry.
   * The model is deep-copied before storage to prevent mutation leakage.
   */
  public registerRule(key: string, model: AutoWireRuleModel): void {
    this.ruleRegistry.register(key, safeDeepCopy(model), '[AutoWiring]');
  }

  /**
   * Retrieves a single auto-wire rule by key.
   * Returns undefined if the key does not exist.
   */
  public getRule(key: string): AutoWireRuleModel | undefined {
    return this.ruleRegistry.lookup(key);
  }

  /**
   * Returns all registered auto-wire rules in insertion order.
   * Each entry is a deep copy to prevent mutation leakage.
   */
  public getAllRules(): AutoWireRuleModel[] {
    return this.ruleRegistry.getAll();
  }

  /**
   * Updates fields on an existing auto-wire rule.
   * Warns if the key does not exist.
   */
  public updateRule(key: string, updates: Partial<AutoWireRuleModel>): void {
    this.ruleRegistry.update(key, updates, '[AutoWiring]');
  }

  /**
   * Removes an auto-wire rule by key.
   * Warns if the key does not exist.
   */
  public removeRule(key: string): void {
    this.ruleRegistry.remove(key);
  }

  /**
   * Clears all entries from the rule registry.
   */
  public clearRules(): void {
    this.ruleRegistry.clear();
  }

  /**
   * Returns all rule keys in insertion order.
   */
  public getRuleKeys(): string[] {
    return this.ruleRegistry.keys();
  }

  /**
   * Checks if a rule with the given key exists.
   */
  public hasRule(key: string): boolean {
    return this.ruleRegistry.has(key);
  }

  // ─── Plan CRUD ────────────────────────────────────────────────

  /**
   * Registers a new auto-wire plan in the plan registry.
   * The model is deep-copied before storage to prevent mutation leakage.
   */
  public registerPlan(key: string, model: AutoWirePlanModel): void {
    this.planRegistry.register(key, safeDeepCopy(model), '[AutoWiring]');
  }

  /**
   * Retrieves a single auto-wire plan by key.
   * Returns undefined if the key does not exist.
   */
  public getPlan(key: string): AutoWirePlanModel | undefined {
    return this.planRegistry.lookup(key);
  }

  /**
   * Returns all registered auto-wire plans in insertion order.
   * Each entry is a deep copy to prevent mutation leakage.
   */
  public getAllPlans(): AutoWirePlanModel[] {
    return this.planRegistry.getAll();
  }

  /**
   * Updates fields on an existing auto-wire plan.
   * Warns if the key does not exist.
   */
  public updatePlan(key: string, updates: Partial<AutoWirePlanModel>): void {
    this.planRegistry.update(key, updates, '[AutoWiring]');
  }

  /**
   * Removes an auto-wire plan by key.
   * Warns if the key does not exist.
   */
  public removePlan(key: string): void {
    this.planRegistry.remove(key);
  }

  /**
   * Clears all entries from the plan registry.
   */
  public clearPlans(): void {
    this.planRegistry.clear();
  }

  /**
   * Returns all plan keys in insertion order.
   */
  public getPlanKeys(): string[] {
    return this.planRegistry.keys();
  }

  /**
   * Checks if a plan with the given key exists.
   */
  public hasPlan(key: string): boolean {
    return this.planRegistry.has(key);
  }

  // ═══════════════════════════════════════════════════════════════
  // CORE AUTO-WIRING METHODS
  // ═══════════════════════════════════════════════════════════════

  // ─── 1. initializeDefaultRules ────────────────────────────────

  /**
   * Creates and registers an AutoWireRuleModel for every component type
   * defined in DEFAULT_GPIO_ASSIGNMENTS. Each rule maps the component's
   * pins to their GPIO numbers, signal types, wire colors, and target
   * rails (VCC/GND for power pins).
   *
   * This method should be called once at startup to populate the rule
   * registry with the built-in component wiring knowledge.
   *
   * Educational note: In real electronics, every component has a datasheet
   * that describes its pins. This method encodes that datasheet knowledge
   * into machine-readable rules so the auto-wiring engine can suggest
   * correct connections automatically.
   */
  public initializeDefaultRules(): void {
    // Iterate over every component type that has GPIO assignments defined
    for (const [componentType, pinMap] of Object.entries(DEFAULT_GPIO_ASSIGNMENTS)) {
      const ruleId = `rule_${componentType}`;

      // Build pin mappings from the GPIO assignment table
      const pinMappings: AutoWireRuleModel['pinMappings'] = [];

      for (const [pinName, gpioNumber] of Object.entries(pinMap)) {
        // Determine the signal type for this pin from PIN_SIGNAL_TYPES
        const signalType: WireSignalType = PIN_SIGNAL_TYPES[pinName] || 'DIGITAL';

        // Determine the wire color from the signal type
        const wireColor: WireColor = WIRE_COLOR_BY_SIGNAL[signalType] || 'BLUE';

        // Determine the target rail: VCC/GND pins go to power rails,
        // GPIO-connected pins go to the microcontroller
        let targetRail = '';
        if (signalType === 'VCC') {
          targetRail = 'VCC_RAIL';
        } else if (signalType === 'GND') {
          targetRail = 'GND_RAIL';
        } else {
          targetRail = `GPIO_${gpioNumber}`;
        }

        // Build a human-readable description for educational tooltips
        let description = '';
        if (signalType === 'VCC') {
          description = `Connect ${pinName} to the 3.3V or 5V power rail to supply operating voltage.`;
        } else if (signalType === 'GND') {
          description = `Connect ${pinName} to the ground rail to complete the circuit.`;
        } else if (signalType === 'I2C') {
          description = `Connect ${pinName} (${signalType}) to GPIO ${gpioNumber} for I2C communication.`;
        } else if (signalType === 'ANALOG') {
          description = `Connect ${pinName} to GPIO ${gpioNumber} (ADC-capable pin) for analog readings.`;
        } else if (signalType === 'PWM') {
          description = `Connect ${pinName} to GPIO ${gpioNumber} for PWM signal output.`;
        } else if (signalType === 'DATA') {
          description = `Connect ${pinName} to GPIO ${gpioNumber} for data communication.`;
        } else {
          description = `Connect ${pinName} to GPIO ${gpioNumber} for digital I/O.`;
        }

        pinMappings.push({
          pinName,
          signalType,
          wireColor,
          defaultGpio: gpioNumber,
          targetRail,
          description,
        });
      }

      // Look up placement specs for this component type
      const placementSpec = COMPONENT_PLACEMENT_SPECS[componentType];
      const placementRow = placementSpec ? placementSpec.startRow : 1;
      const placementCol = 1; // Default column; auto-placement will adjust
      const placementSpan = placementSpec ? placementSpec.colSpan : 1;

      // Create and register the rule
      const rule = createDefaultAutoWireRuleModel(ruleId, {
        componentType,
        pinMappings,
        placementRow,
        placementCol,
        placementSpan,
      });

      this.registerRule(ruleId, rule);
    }
  }

  // ─── 2. analyzeMissingWires ───────────────────────────────────

  /**
   * Analyzes a set of placed components and identifies pins that are
   * not yet connected. For each missing connection, generates an
   * AutoWireSuggestionModel describing what wire to add.
   *
   * This is the primary "diagnostic" method of the auto-wiring engine.
   * It compares the current circuit state against the wiring rules to
   * find gaps.
   *
   * Educational note: In a real circuit, every required pin MUST be
   * connected for the component to function. A floating (unconnected)
   * pin can cause unpredictable behavior, damage, or simply prevent
   * the component from working.
   *
   * @param components - Array of components currently on the breadboard,
   *   each with an ID, type, and list of pins with their connection status.
   * @param existingWireIds - Set of wire IDs already placed. Used to
   *   avoid suggesting wires that already exist.
   * @returns Array of AutoWireSuggestionModel for missing connections.
   */
  public analyzeMissingWires(
    components: Array<{
      componentId: string;
      type: string;
      pins: Array<{ name: string; connectedTo: string | null }>;
    }>,
    existingWireIds: string[],
  ): AutoWireSuggestionModel[] {
    const suggestions: AutoWireSuggestionModel[] = [];
    const existingSet = new Set(existingWireIds);

    for (const comp of components) {
      // Look up the wiring rule for this component type
      const rule = this.getRuleForComponentType(comp.type);
      if (!rule) {
        // No rule found — we cannot analyze this component type.
        // This is not an error; custom components may not have rules yet.
        console.warn(`[AutoWiring] No wiring rule found for component type "${comp.type}". Skipping analysis.`);
        continue;
      }

      // Check each pin mapping in the rule against the component's actual pins
      for (const mapping of rule.pinMappings) {
        const pinEntry = comp.pins.find(
          (p) => p.name.toUpperCase() === mapping.pinName.toUpperCase(),
        );

        // If the pin exists and is NOT connected, suggest a wire
        const isConnected =
          pinEntry &&
          pinEntry.connectedTo !== null &&
          pinEntry.connectedTo !== '';

        // Check if a wire for this connection already exists
        const wireKey = `${comp.componentId}_${mapping.pinName}`;
        const alreadyWired = existingSet.has(wireKey);

        if (!isConnected && !alreadyWired) {
          const suggestionId = `suggestion_${++this.suggestionCounter}`;

          // Determine if this pin is required (non-optional pins are required)
          const isRequired = mapping.signalType === 'VCC' ||
            mapping.signalType === 'GND' ||
            mapping.defaultGpio >= 0;

          // Build a detailed explanation for the student
          let explanation = '';
          if (mapping.signalType === 'VCC') {
            explanation = `The ${mapping.pinName} pin on your ${comp.type} needs power. ` +
              `Connect it to the red power rail (VCC) on the breadboard. ` +
              `Without power, the ${comp.type} cannot operate.`;
          } else if (mapping.signalType === 'GND') {
            explanation = `The ${mapping.pinName} pin on your ${comp.type} needs a ground connection. ` +
              `Connect it to the blue/black ground rail (GND) on the breadboard. ` +
              `Ground completes the electrical circuit — without it, current cannot flow.`;
          } else if (mapping.signalType === 'I2C') {
            explanation = `The ${mapping.pinName} pin is an I2C bus line. ` +
              `Connect it to GPIO ${mapping.defaultGpio} on the ESP32. ` +
              `I2C uses two wires (SDA for data, SCL for clock) to communicate ` +
              `with multiple devices on the same bus.`;
          } else if (mapping.signalType === 'ANALOG') {
            explanation = `The ${mapping.pinName} pin outputs an analog voltage. ` +
              `Connect it to GPIO ${mapping.defaultGpio} (an ADC-capable pin) on the ESP32. ` +
              `The ADC converts the analog voltage to a digital value your code can read.`;
          } else if (mapping.signalType === 'PWM') {
            explanation = `The ${mapping.pinName} pin accepts a PWM signal for variable control. ` +
              `Connect it to GPIO ${mapping.defaultGpio} on the ESP32. ` +
              `PWM (Pulse Width Modulation) rapidly switches the pin on/off ` +
              `to simulate intermediate voltage levels.`;
          } else if (mapping.signalType === 'DATA') {
            explanation = `The ${mapping.pinName} pin is a data communication line. ` +
              `Connect it to GPIO ${mapping.defaultGpio} on the ESP32. ` +
              `This pin sends or receives digital data using a specific protocol.`;
          } else {
            explanation = `The ${mapping.pinName} pin on your ${comp.type} needs to be connected ` +
              `to GPIO ${mapping.defaultGpio} on the ESP32 for digital I/O.`;
          }

          // Calculate priority: VCC/GND are highest, then required GPIO pins
          let priority = 0;
          if (mapping.signalType === 'VCC') {
            priority = 100;
          } else if (mapping.signalType === 'GND') {
            priority = 90;
          } else if (mapping.signalType === 'I2C') {
            priority = 80;
          } else if (mapping.signalType === 'ANALOG') {
            priority = 70;
          } else if (mapping.signalType === 'PWM') {
            priority = 60;
          } else if (mapping.signalType === 'DATA') {
            priority = 50;
          } else {
            priority = 40;
          }

          const suggestion = createDefaultAutoWireSuggestionModel(suggestionId, {
            componentId: comp.componentId,
            componentType: comp.type,
            sourcePinName: mapping.pinName,
            targetPinName: mapping.targetRail,
            targetRail: mapping.targetRail,
            gpioNumber: mapping.defaultGpio,
            signalType: mapping.signalType,
            wireColor: mapping.wireColor,
            explanation,
            priority,
            isRequired,
          });

          suggestions.push(suggestion);
        }
      }
    }

    // Sort suggestions by priority (highest first), then by component ID
    suggestions.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.componentId.localeCompare(b.componentId);
    });

    return safeDeepCopy(suggestions);
  }

  // ─── 3. suggestWireRoutes ─────────────────────────────────────

  /**
   * Generates wire suggestions for ALL pins of a single component.
   * Unlike analyzeMissingWires (which checks existing connections),
   * this method generates suggestions for every pin regardless of
   * current connection state — useful for "show me how to wire this
   * component" scenarios.
   *
   * Educational note: When you place a new component on the breadboard,
   * you need to know exactly which pins to connect and where. This
   * method provides a complete wiring guide for the component.
   *
   * @param componentId - The unique ID of the component instance
   * @param componentType - The type of the component (e.g., 'LED', 'SERVO')
   * @returns Array of AutoWireSuggestionModel sorted by priority (required first)
   */
  public suggestWireRoutes(
    componentId: string,
    componentType: string,
  ): AutoWireSuggestionModel[] {
    const suggestions: AutoWireSuggestionModel[] = [];

    // Look up the rule for this component type
    const rule = this.getRuleForComponentType(componentType);
    if (!rule) {
      console.warn(`[AutoWiring] No wiring rule found for component type "${componentType}". Cannot suggest wire routes.`);
      return [];
    }

    // Also look up the default GPIO assignments for this component type
    const gpioMap = DEFAULT_GPIO_ASSIGNMENTS[componentType] || {};

    // Generate a suggestion for each pin mapping in the rule
    for (const mapping of rule.pinMappings) {
      const suggestionId = `suggestion_${++this.suggestionCounter}`;

      // Use the GPIO assignment from the DEFAULT_GPIO_ASSIGNMENTS if available,
      // otherwise fall back to the rule's defaultGpio
      const gpioNumber = gpioMap[mapping.pinName] !== undefined
        ? gpioMap[mapping.pinName]
        : mapping.defaultGpio;

      // Determine if this is a required connection
      const isRequired = mapping.signalType === 'VCC' ||
        mapping.signalType === 'GND' ||
        gpioNumber >= 0;

      // Calculate priority: power connections first, then signal pins
      let priority = 0;
      if (mapping.signalType === 'VCC') {
        priority = 100;
      } else if (mapping.signalType === 'GND') {
        priority = 90;
      } else if (mapping.signalType === 'I2C') {
        priority = 80;
      } else if (mapping.signalType === 'ANALOG') {
        priority = 70;
      } else if (mapping.signalType === 'PWM') {
        priority = 60;
      } else if (mapping.signalType === 'DATA') {
        priority = 50;
      } else if (mapping.signalType === 'SPI') {
        priority = 75;
      } else if (mapping.signalType === 'UART') {
        priority = 65;
      } else {
        priority = 40;
      }

      // Build a detailed educational explanation
      let explanation = '';
      if (mapping.signalType === 'VCC') {
        explanation = `Step: Connect the ${mapping.pinName} pin to the power rail (VCC). ` +
          `This provides operating voltage to the ${componentType}. ` +
          `Use a ${mapping.wireColor} wire to follow color conventions.`;
      } else if (mapping.signalType === 'GND') {
        explanation = `Step: Connect the ${mapping.pinName} pin to the ground rail (GND). ` +
          `This completes the electrical circuit for the ${componentType}. ` +
          `Use a ${mapping.wireColor} wire (black = ground by convention).`;
      } else if (mapping.signalType === 'I2C') {
        explanation = `Step: Connect the ${mapping.pinName} pin to GPIO ${gpioNumber} for I2C communication. ` +
          `The ${componentType} uses the I2C protocol which requires both SDA (data) and SCL (clock) lines. ` +
          `Use a ${mapping.wireColor} wire for I2C connections.`;
      } else if (mapping.signalType === 'ANALOG') {
        explanation = `Step: Connect the ${mapping.pinName} pin to GPIO ${gpioNumber} (analog-capable). ` +
          `The ${componentType} outputs a variable voltage that the ESP32's ADC will convert to a digital reading. ` +
          `Use a ${mapping.wireColor} wire for analog signals.`;
      } else if (mapping.signalType === 'PWM') {
        explanation = `Step: Connect the ${mapping.pinName} pin to GPIO ${gpioNumber} for PWM output. ` +
          `PWM allows the ESP32 to control the ${componentType} with variable intensity by rapidly toggling the signal. ` +
          `Use a ${mapping.wireColor} wire for PWM connections.`;
      } else if (mapping.signalType === 'DATA') {
        explanation = `Step: Connect the ${mapping.pinName} pin to GPIO ${gpioNumber} for data transfer. ` +
          `The ${componentType} communicates using a custom data protocol on this pin. ` +
          `Use a ${mapping.wireColor} wire for data lines.`;
      } else if (mapping.signalType === 'SPI') {
        explanation = `Step: Connect the ${mapping.pinName} pin to GPIO ${gpioNumber} for SPI communication. ` +
          `SPI is a high-speed serial protocol used for fast data transfer. ` +
          `Use a ${mapping.wireColor} wire for SPI connections.`;
      } else if (mapping.signalType === 'UART') {
        explanation = `Step: Connect the ${mapping.pinName} pin to GPIO ${gpioNumber} for UART serial communication. ` +
          `UART provides asynchronous serial data transfer between devices. ` +
          `Use a ${mapping.wireColor} wire for UART connections.`;
      } else {
        explanation = `Step: Connect the ${mapping.pinName} pin to GPIO ${gpioNumber} for digital I/O. ` +
          `Use a ${mapping.wireColor} wire for this digital connection.`;
      }

      const suggestion = createDefaultAutoWireSuggestionModel(suggestionId, {
        componentId,
        componentType,
        sourcePinName: mapping.pinName,
        targetPinName: mapping.targetRail,
        targetRail: mapping.targetRail,
        gpioNumber,
        signalType: mapping.signalType,
        wireColor: mapping.wireColor,
        explanation,
        priority,
        isRequired,
      });

      suggestions.push(suggestion);
    }

    // Sort by priority (highest first, so required/power connections appear first)
    suggestions.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.sourcePinName.localeCompare(b.sourcePinName);
    });

    return safeDeepCopy(suggestions);
  }

  // ─── 4. generateWiringPlan ────────────────────────────────────

  /**
   * Creates a complete wiring plan for a list of components.
   * The plan includes:
   *   - Auto-placed component positions (non-overlapping on the breadboard grid)
   *   - Wire suggestions for every pin on every component
   *   - Total wire count and validation status
   *
   * This is the main orchestration method for the auto-wiring engine.
   * Given a list of components, it generates everything needed to wire
   * the circuit from scratch.
   *
   * Educational note: A wiring plan is like a recipe for building a circuit.
   * It tells you where to place each component and which wires to connect.
   * Following the plan step by step ensures your circuit is built correctly.
   *
   * @param planName - Human-readable name for the plan (used as templateId)
   * @param componentList - Array of { componentId, componentType } to include
   * @returns The plan ID for retrieving the plan later
   */
  public generateWiringPlan(
    planName: string,
    componentList: Array<{ componentId: string; componentType: string }>,
  ): string {
    const planId = `plan_${++this.planCounter}`;

    // Step 1: Auto-place components on the breadboard grid
    const placements = this.autoPlaceComponents(componentList);

    // Step 2: Build the component list with placement positions
    const planComponents: AutoWirePlanModel['components'] = [];
    for (const comp of componentList) {
      const placement = placements.find((p) => p.componentId === comp.componentId);
      planComponents.push({
        componentId: comp.componentId,
        componentType: comp.componentType,
        placementRow: placement ? placement.row : 1,
        placementCol: placement ? placement.col : 1,
      });
    }

    // Step 3: Generate wire suggestions for every component
    const allSuggestions: AutoWireSuggestionModel[] = [];
    for (const comp of componentList) {
      const compSuggestions = this.suggestWireRoutes(comp.componentId, comp.componentType);
      allSuggestions.push(...compSuggestions);
    }

    // Step 4: Register all suggestions in the suggestion registry
    for (const suggestion of allSuggestions) {
      this.registerSuggestion(suggestion.suggestionId, suggestion);
    }

    // Step 5: Create the plan model
    const plan = createDefaultAutoWirePlanModel(planId, {
      templateId: planName,
      components: planComponents,
      wireSuggestions: safeDeepCopy(allSuggestions),
      validationStatus: 'PENDING',
      validationErrors: [],
      totalWires: allSuggestions.length,
      completedWires: 0,
    });

    // Step 6: Register the plan
    this.registerPlan(planId, plan);

    return planId;
  }

  // ─── 5. validateWiringPlan ────────────────────────────────────

  /**
   * Validates a wiring plan by checking each wire suggestion against
   * the component rules. Sets the plan's validationStatus to 'VALID'
   * or 'INVALID' and populates validationErrors.
   *
   * Validation checks include:
   *   - Does each component have a registered rule?
   *   - Are all required pins covered by wire suggestions?
   *   - Are wire colors correct for each signal type?
   *   - Are GPIO numbers valid (not -1 for signal pins)?
   *   - Are there any GPIO conflicts (two suggestions using the same GPIO)?
   *
   * Educational note: Validating a wiring plan before building it
   * catches mistakes early. It's much easier to fix a plan on screen
   * than to debug a physical circuit!
   *
   * @param planId - The ID of the plan to validate
   * @returns Array of validation error strings (empty if valid)
   */
  public validateWiringPlan(planId: string): string[] {
    const plan = this.getPlan(planId);
    if (!plan) {
      console.warn(`[AutoWiring] Cannot validate plan — plan "${planId}" not found.`);
      return [`Plan "${planId}" not found.`];
    }

    const errors: string[] = [];

    // Track GPIO usage to detect conflicts
    const gpioUsage = new Map<number, string[]>();

    // Check each component in the plan
    for (const comp of plan.components) {
      const rule = this.getRuleForComponentType(comp.componentType);
      if (!rule) {
        errors.push(
          `No wiring rule found for component type "${comp.componentType}" (${comp.componentId}).`,
        );
        continue;
      }

      // Check that all required pins have wire suggestions
      for (const mapping of rule.pinMappings) {
        const hasSuggestion = plan.wireSuggestions.some(
          (s) =>
            s.componentId === comp.componentId &&
            s.sourcePinName.toUpperCase() === mapping.pinName.toUpperCase(),
        );

        if (!hasSuggestion) {
          errors.push(
            `Component "${comp.componentId}" (${comp.componentType}) is missing a wire suggestion for pin "${mapping.pinName}".`,
          );
        }
      }
    }

    // Check each wire suggestion for correctness
    for (const suggestion of plan.wireSuggestions) {
      // Verify wire color matches signal type convention
      const expectedColor = WIRE_COLOR_BY_SIGNAL[suggestion.signalType];
      if (expectedColor && suggestion.wireColor !== expectedColor) {
        errors.push(
          `Wire suggestion "${suggestion.suggestionId}" for ${suggestion.componentId}.${suggestion.sourcePinName} ` +
          `uses color "${suggestion.wireColor}" but signal type "${suggestion.signalType}" conventionally uses "${expectedColor}".`,
        );
      }

      // Verify GPIO is valid for signal pins (not VCC/GND)
      if (
        suggestion.signalType !== 'VCC' &&
        suggestion.signalType !== 'GND' &&
        suggestion.gpioNumber < 0
      ) {
        errors.push(
          `Wire suggestion "${suggestion.suggestionId}" for ${suggestion.componentId}.${suggestion.sourcePinName} ` +
          `has invalid GPIO number ${suggestion.gpioNumber} for signal type "${suggestion.signalType}".`,
        );
      }

      // Track GPIO usage for conflict detection
      if (suggestion.gpioNumber >= 0) {
        const key = suggestion.gpioNumber;
        if (!gpioUsage.has(key)) {
          gpioUsage.set(key, []);
        }
        gpioUsage.get(key)!.push(
          `${suggestion.componentId}.${suggestion.sourcePinName}`,
        );
      }
    }

    // Detect GPIO conflicts
    for (const [gpio, users] of gpioUsage) {
      if (users.length > 1) {
        errors.push(
          `GPIO ${gpio} conflict: used by ${users.join(' and ')}. Each GPIO can only connect to one signal pin.`,
        );
      }
    }

    // Update the plan's validation status
    const newStatus = errors.length === 0 ? 'VALID' : 'INVALID';
    this.updatePlan(planId, {
      validationStatus: newStatus,
      validationErrors: safeDeepCopy(errors),
    });

    return safeDeepCopy(errors);
  }

  // ─── 6. applyWiringPlan ───────────────────────────────────────

  /**
   * Converts a validated wiring plan into an array of wire operations
   * that can be executed by the breadboard renderer. Each operation
   * describes a single wire to add.
   *
   * The returned operations are in priority order (power connections
   * first, then signal connections) to ensure correct build sequence.
   *
   * Educational note: Building a circuit in the correct order matters!
   * Always connect power (VCC) and ground (GND) first, then signal
   * wires. This prevents accidental damage to components from
   * unexpected voltage spikes.
   *
   * @param planId - The ID of the plan to apply
   * @returns Array of wire operation objects describing each wire to add
   */
  public applyWiringPlan(
    planId: string,
  ): Array<{
    action: string;
    sourceComponent: string;
    sourcePin: string;
    targetComponent: string;
    targetPin: string;
    wireColor: WireColor;
    signalType: WireSignalType;
  }> {
    const plan = this.getPlan(planId);
    if (!plan) {
      console.warn(`[AutoWiring] Cannot apply plan — plan "${planId}" not found.`);
      return [];
    }

    const operations: Array<{
      action: string;
      sourceComponent: string;
      sourcePin: string;
      targetComponent: string;
      targetPin: string;
      wireColor: WireColor;
      signalType: WireSignalType;
    }> = [];

    // Sort suggestions by priority (VCC first, then GND, then signal pins)
    const sortedSuggestions = safeDeepCopy(plan.wireSuggestions).sort(
      (a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return a.sourcePinName.localeCompare(b.sourcePinName);
      },
    );

    for (const suggestion of sortedSuggestions) {
      // Determine the target component:
      // - For VCC/GND: target is the power rail
      // - For signal pins: target is the ESP32 microcontroller
      let targetComponent = 'ESP32';
      let targetPin = `GPIO_${suggestion.gpioNumber}`;

      if (suggestion.signalType === 'VCC') {
        targetComponent = 'BREADBOARD';
        targetPin = 'VCC_RAIL';
      } else if (suggestion.signalType === 'GND') {
        targetComponent = 'BREADBOARD';
        targetPin = 'GND_RAIL';
      }

      operations.push({
        action: 'ADD_WIRE',
        sourceComponent: suggestion.componentId,
        sourcePin: suggestion.sourcePinName,
        targetComponent,
        targetPin,
        wireColor: suggestion.wireColor,
        signalType: suggestion.signalType,
      });
    }

    return safeDeepCopy(operations);
  }

  // ─── 7. autoPlaceComponents ───────────────────────────────────

  /**
   * Calculates non-overlapping placement positions for a list of
   * components on the breadboard grid. Uses COMPONENT_PLACEMENT_SPECS
   * to determine how much space each component needs.
   *
   * The algorithm places components left-to-right in rows, advancing
   * to the next available column when space runs out. Components are
   * grouped by their preferred startRow to maintain visual organization.
   *
   * Educational note: Component placement on a breadboard matters!
   * Placing components in an organized way makes wiring easier, reduces
   * wire crossings, and makes the circuit easier to debug. Think of it
   * like organizing your desk — a tidy workspace leads to fewer mistakes.
   *
   * @param components - Array of { componentId, componentType } to place
   * @returns Array of { componentId, row, col } with calculated positions
   */
  public autoPlaceComponents(
    components: Array<{ componentId: string; componentType: string }>,
  ): Array<{ componentId: string; row: number; col: number }> {
    const placements: Array<{ componentId: string; row: number; col: number }> = [];

    // Track occupied cells on the grid to prevent overlaps
    // Key: "row,col", Value: componentId occupying that cell
    const occupiedCells = new Map<string, string>();

    // Maximum breadboard dimensions (standard breadboard is ~30 rows × 63 cols)
    const maxCols = 63;

    // Sort components by their preferred start row for grouping,
    // then by column span (larger components first to place them efficiently)
    const sortedComponents = safeDeepCopy(components).sort((a, b) => {
      const specA = COMPONENT_PLACEMENT_SPECS[a.componentType];
      const specB = COMPONENT_PLACEMENT_SPECS[b.componentType];
      const rowA = specA ? specA.startRow : 1;
      const rowB = specB ? specB.startRow : 1;
      if (rowA !== rowB) return rowA - rowB;
      const spanA = specA ? specA.colSpan : 1;
      const spanB = specB ? specB.colSpan : 1;
      return spanB - spanA; // Larger components first
    });

    for (const comp of sortedComponents) {
      const spec = COMPONENT_PLACEMENT_SPECS[comp.componentType];
      const rowSpan = spec ? spec.rowSpan : 2;
      const colSpan = spec ? spec.colSpan : 1;
      const preferredStartRow = spec ? spec.startRow : 1;

      // Find the first available position starting from the preferred row
      let placed = false;
      let startRow = preferredStartRow;
      let startCol = 1;

      // Try placing at the preferred row first, scanning columns
      for (let col = 1; col <= maxCols - colSpan + 1 && !placed; col++) {
        let canPlace = true;

        // Check if all cells needed by this component are free
        for (let r = startRow; r < startRow + rowSpan && canPlace; r++) {
          for (let c = col; c < col + colSpan && canPlace; c++) {
            const cellKey = `${r},${c}`;
            if (occupiedCells.has(cellKey)) {
              canPlace = false;
            }
          }
        }

        if (canPlace) {
          startCol = col;
          placed = true;
        }
      }

      // If preferred row is full, try other rows
      if (!placed) {
        for (let row = 1; row <= 30 && !placed; row++) {
          if (row === preferredStartRow) continue; // Already tried

          for (let col = 1; col <= maxCols - colSpan + 1 && !placed; col++) {
            let canPlace = true;

            for (let r = row; r < row + rowSpan && canPlace; r++) {
              for (let c = col; c < col + colSpan && canPlace; c++) {
                const cellKey = `${r},${c}`;
                if (occupiedCells.has(cellKey)) {
                  canPlace = false;
                }
              }
            }

            if (canPlace) {
              startRow = row;
              startCol = col;
              placed = true;
            }
          }
        }
      }

      // Mark cells as occupied
      if (placed) {
        for (let r = startRow; r < startRow + rowSpan; r++) {
          for (let c = startCol; c < startCol + colSpan; c++) {
            occupiedCells.set(`${r},${c}`, comp.componentId);
          }
        }
      } else {
        // Fallback: place at (1, 1) — this should rarely happen
        console.warn(`[AutoWiring] Could not find space for component "${comp.componentId}" (${comp.componentType}). Placing at default (1,1).`);
        startRow = 1;
        startCol = 1;
      }

      placements.push({
        componentId: comp.componentId,
        row: startRow,
        col: startCol,
      });
    }

    return safeDeepCopy(placements);
  }

  // ─── 8. autoRouteWires ────────────────────────────────────────

  /**
   * Generates clean wire path coordinates for all wire suggestions
   * in a wiring plan. Each path is a series of (x, y) points that
   * the renderer can use to draw the wire on the breadboard.
   *
   * Wire routing uses a simplified Manhattan routing algorithm:
   * - Wires travel horizontally and vertically (no diagonals)
   * - Power rail connections go straight down/up to the rail
   * - GPIO connections route to the ESP32 header pins
   *
   * Educational note: In professional PCB design, wire routing is
   * one of the most complex challenges. Our simplified version
   * gives students a visual understanding of how connections work
   * without the full complexity of professional EDA tools.
   *
   * @param planId - The ID of the plan to route wires for
   * @returns Array of { suggestionId, path: {x, y}[] } with wire paths
   */
  public autoRouteWires(
    planId: string,
  ): Array<{ suggestionId: string; path: Array<{ x: number; y: number }> }> {
    const plan = this.getPlan(planId);
    if (!plan) {
      console.warn(`[AutoWiring] Cannot route wires — plan "${planId}" not found.`);
      return [];
    }

    const routes: Array<{
      suggestionId: string;
      path: Array<{ x: number; y: number }>;
    }> = [];

    // Grid spacing constants (in pixels)
    const cellWidth = 20;
    const cellHeight = 20;
    const railOffsetY = -40; // Power rails are above the breadboard
    const gndRailOffsetY = 600; // GND rail is below the breadboard
    const esp32HeaderX = 640; // ESP32 header is on the right side

    for (const suggestion of plan.wireSuggestions) {
      // Find the component's placement position
      const compPlacement = plan.components.find(
        (c) => c.componentId === suggestion.componentId,
      );

      if (!compPlacement) {
        console.warn(
          `[AutoWiring] Component "${suggestion.componentId}" not found in plan. Skipping wire route.`,
        );
        continue;
      }

      // Calculate the source pin position (component pin)
      const sourceX = compPlacement.placementCol * cellWidth;
      const sourceY = compPlacement.placementRow * cellHeight;

      // Calculate the target position based on signal type
      let targetX: number;
      let targetY: number;

      if (suggestion.signalType === 'VCC') {
        // Route to VCC power rail (top of breadboard)
        targetX = sourceX;
        targetY = railOffsetY;
      } else if (suggestion.signalType === 'GND') {
        // Route to GND rail (bottom of breadboard)
        targetX = sourceX;
        targetY = gndRailOffsetY;
      } else {
        // Route to ESP32 GPIO header pin
        targetX = esp32HeaderX;
        // GPIO pins are spaced vertically on the ESP32 header
        targetY = (suggestion.gpioNumber % 20) * cellHeight + cellHeight;
      }

      // Build a Manhattan-routed path (horizontal then vertical)
      const path: Array<{ x: number; y: number }> = [];

      // Start at the source pin
      path.push({ x: sourceX, y: sourceY });

      // For power rails: go straight up or down
      if (suggestion.signalType === 'VCC' || suggestion.signalType === 'GND') {
        path.push({ x: targetX, y: targetY });
      } else {
        // For GPIO: route horizontally first, then vertically
        // Add a midpoint for clean routing
        const midX = sourceX + (targetX - sourceX) * 0.5;

        // Horizontal segment from source
        path.push({ x: midX, y: sourceY });

        // Vertical segment to target row
        path.push({ x: midX, y: targetY });

        // Horizontal segment to target
        path.push({ x: targetX, y: targetY });
      }

      routes.push({
        suggestionId: suggestion.suggestionId,
        path: safeDeepCopy(path),
      });
    }

    return safeDeepCopy(routes);
  }

  // ─── 9. repairCircuit ─────────────────────────────────────────

  /**
   * Generates fix suggestions for reported circuit issues.
   * Currently handles FLOATING_PIN issues by generating wire
   * suggestions that connect the floating pin to its correct target.
   *
   * This method bridges the gap between the Circuit Diagnostics engine
   * (Phase 29A) and the Auto-Wiring engine (Phase 29B). When diagnostics
   * detects a problem, repairCircuit can suggest the exact wire to fix it.
   *
   * Educational note: Circuit repair is like debugging code — you find
   * the problem, understand why it's wrong, and apply a specific fix.
   * The auto-wiring engine makes this process easier by suggesting
   * exactly which wire to add and where.
   *
   * @param issues - Array of circuit issues to repair
   * @returns Array of AutoWireSuggestionModel with fix suggestions
   */
  public repairCircuit(
    issues: Array<{
      issueId: string;
      code: string;
      componentId: string;
      pinName: string;
    }>,
  ): AutoWireSuggestionModel[] {
    const fixes: AutoWireSuggestionModel[] = [];

    for (const issue of issues) {
      // Currently handle FLOATING_PIN issues
      if (issue.code !== 'FLOATING_PIN') {
        // Other issue types are not auto-fixable via wiring
        console.warn(
          `[AutoWiring] Cannot auto-repair issue "${issue.issueId}" with code "${issue.code}". Only FLOATING_PIN is supported.`,
        );
        continue;
      }

      // Look up the signal type and GPIO for this pin
      const pinNameUpper = issue.pinName.toUpperCase();
      const signalType: WireSignalType = PIN_SIGNAL_TYPES[pinNameUpper] || 'DIGITAL';
      const wireColor: WireColor = WIRE_COLOR_BY_SIGNAL[signalType] || 'BLUE';

      // Try to find the default GPIO for this component/pin combination
      // First, try to find the component type from existing rules
      let gpioNumber = -1;
      let componentType = '';
      let targetRail = '';

      // Search all rules to find the component type
      const allRules = this.getAllRules();
      for (const rule of allRules) {
        const pinMapping = rule.pinMappings.find(
          (m) => m.pinName.toUpperCase() === pinNameUpper,
        );
        if (pinMapping) {
          // Check if the DEFAULT_GPIO_ASSIGNMENTS has this component type
          const gpioMap = DEFAULT_GPIO_ASSIGNMENTS[rule.componentType];
          if (gpioMap && gpioMap[pinNameUpper] !== undefined) {
            gpioNumber = gpioMap[pinNameUpper];
            componentType = rule.componentType;
            targetRail = pinMapping.targetRail;
            break;
          }
        }
      }

      // If no specific GPIO found, use the signal type to determine target
      if (targetRail === '') {
        if (signalType === 'VCC') {
          targetRail = 'VCC_RAIL';
        } else if (signalType === 'GND') {
          targetRail = 'GND_RAIL';
        } else if (gpioNumber >= 0) {
          targetRail = `GPIO_${gpioNumber}`;
        } else {
          targetRail = 'UNKNOWN';
        }
      }

      const suggestionId = `fix_${++this.suggestionCounter}`;

      // Build educational explanation for the fix
      let explanation = '';
      if (signalType === 'VCC') {
        explanation = `Fix: Connect the ${issue.pinName} pin to the power rail (VCC). ` +
          `This pin needs power to operate the component.`;
      } else if (signalType === 'GND') {
        explanation = `Fix: Connect the ${issue.pinName} pin to the ground rail (GND). ` +
          `Ground completes the electrical circuit.`;
      } else {
        explanation = `Fix: Connect the ${issue.pinName} pin to GPIO ${gpioNumber}. ` +
          `This pin needs a signal connection to the microcontroller.`;
      }

      const fix = createDefaultAutoWireSuggestionModel(suggestionId, {
        componentId: issue.componentId,
        componentType,
        sourcePinName: issue.pinName,
        targetPinName: targetRail,
        targetRail,
        gpioNumber,
        signalType,
        wireColor,
        explanation,
        priority: signalType === 'VCC' ? 100 : signalType === 'GND' ? 90 : 50,
        isRequired: true,
      });

      fixes.push(fix);
    }

    return safeDeepCopy(fixes);
  }

  // ─── 10. getSuggestionsForComponent ───────────────────────────

  /**
   * Retrieves all wire suggestions associated with a specific component.
   * Filters the suggestion registry by componentId.
   *
   * This is useful for displaying per-component wiring guides in the UI,
   * or for checking if a component still has missing connections.
   *
   * @param componentId - The component ID to filter by
   * @returns Array of AutoWireSuggestionModel for the specified component
   */
  public getSuggestionsForComponent(componentId: string): AutoWireSuggestionModel[] {
    const allSuggestions = this.getAllSuggestions();
    const filtered = allSuggestions.filter(
      (s) => s.componentId === componentId,
    );
    return safeDeepCopy(filtered);
  }

  // ─── 11. getRuleForComponentType ──────────────────────────────

  /**
   * Finds and returns the wiring rule for a given component type.
   * Searches the rule registry for a rule whose componentType matches.
   *
   * Returns undefined if no rule is found for the given type.
   *
   * @param componentType - The component type to look up (e.g., 'LED', 'SERVO')
   * @returns The matching AutoWireRuleModel or undefined
   */
  public getRuleForComponentType(componentType: string): AutoWireRuleModel | undefined {
    const allRules = this.getAllRules();
    const match = allRules.find(
      (r) => r.componentType === componentType,
    );
    return match ? safeDeepCopy(match) : undefined;
  }

  // ─── 12. getSnapshot ──────────────────────────────────────────

  /**
   * Returns a complete snapshot of all auto-wiring state.
   * Includes all suggestions, rules, and plans as deep copies.
   *
   * Used for serialization, state diffing, and debugging.
   * The snapshot is fully independent of the internal state —
   * modifying it will not affect the synchronizer.
   *
   * @returns AutoWireSnapshot with all registry contents
   */
  public getSnapshot(): AutoWireSnapshot {
    return {
      suggestions: safeDeepCopy(this.getAllSuggestions()),
      rules: safeDeepCopy(this.getAllRules()),
      plans: safeDeepCopy(this.getAllPlans()),
    };
  }

  // ─── 13. clearAll ─────────────────────────────────────────────

  /**
   * Clears all 3 registries and resets all counters to zero.
   * Use this when starting a new project or resetting the auto-wiring state.
   */
  public clearAll(): void {
    this.clearSuggestions();
    this.clearRules();
    this.clearPlans();
    this.suggestionCounter = 0;
    this.ruleCounter = 0;
    this.planCounter = 0;
  }
}
