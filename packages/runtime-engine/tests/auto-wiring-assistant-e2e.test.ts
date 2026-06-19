import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createDefaultAutoWireSuggestionModel,
  createDefaultAutoWireRuleModel,
  createDefaultAutoWirePlanModel,
  validateAutoWireSuggestionModel,
  validateAutoWireRuleModel,
  validateAutoWirePlanModel,
  AutoWiringSynchronizer,
} from '../src/stage/auto-wiring-runtime';
import {
  createDefaultComponentKnowledgeModel,
  validateComponentKnowledgeModel,
  ComponentKnowledgeSynchronizer,
  VALID_COMPONENT_CATEGORIES,
  DEFAULT_COMPONENT_KNOWLEDGE,
} from '../src/stage/component-knowledge-runtime';
import {
  createDefaultCircuitTemplateModel,
  createDefaultGuidedBuildStepModel,
  createDefaultGuidedBuildModel,
  createDefaultLearningProgressModel,
  validateCircuitTemplateModel,
  validateGuidedBuildStepModel,
  validateGuidedBuildModel,
  validateLearningProgressModel,
  VALID_TEMPLATE_DIFFICULTIES,
  VALID_TEMPLATE_CATEGORIES,
  VALID_GUIDED_BUILD_ACTIONS,
  CIRCUIT_TEMPLATE_DEFINITIONS,
  CircuitWizardSynchronizer,
} from '../src/stage/circuit-wizard-runtime';
import type {
  AutoWireSuggestionModel,
  AutoWireRuleModel,
  AutoWirePlanModel,
  AutoWireSnapshot,
  ComponentKnowledgeModel,
  ComponentKnowledgeSnapshot,
  CircuitTemplateModel,
  GuidedBuildStepModel,
  GuidedBuildModel,
  LearningProgressModel,
  CircuitWizardSnapshot,
  WireSignalType,
  WireColor,
  TemplateDifficulty,
  TemplateCategory,
  GuidedBuildAction,
} from '../src/types';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

const ALL_COMPONENT_TYPES = Object.keys(DEFAULT_COMPONENT_KNOWLEDGE);
const ALL_TEMPLATE_IDS = Object.keys(CIRCUIT_TEMPLATE_DEFINITIONS);

// ═══════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════

describe('Phase 29B — Auto-Wiring Assistant & Guided Circuit Builder E2E', () => {

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ═════════════════════════════════════════════════════════════
  // §1: AutoWiringSynchronizer — Factory Functions
  // ═════════════════════════════════════════════════════════════
  describe('§1 — AutoWiringSynchronizer Factory Functions', () => {
    for (let i = 0; i < 50; i++) {
      it(`creates suggestion model with id "sug_${i}" and correct defaults (iter ${i})`, () => {
        const m = createDefaultAutoWireSuggestionModel(`sug_${i}`);
        expect(m.suggestionId).toBe(`sug_${i}`);
        expect(m.componentId).toBe('');
        expect(m.componentType).toBe('');
        expect(m.sourcePinName).toBe('');
        expect(m.targetPinName).toBe('');
        expect(m.targetRail).toBe('');
        expect(m.gpioNumber).toBe(-1);
        expect(m.signalType).toBe('DIGITAL');
        expect(m.wireColor).toBe('BLUE');
        expect(m.explanation).toBe('');
        expect(m.priority).toBe(0);
        expect(m.isRequired).toBe(false);
        expect(m.futureWireHints).toEqual({});
      });
    }

    for (let i = 0; i < 50; i++) {
      it(`creates rule model with id "rule_${i}" and correct defaults (iter ${i})`, () => {
        const m = createDefaultAutoWireRuleModel(`rule_${i}`);
        expect(m.ruleId).toBe(`rule_${i}`);
        expect(m.componentType).toBe('');
        expect(m.pinMappings).toEqual([]);
        expect(m.placementRow).toBe(0);
        expect(m.placementCol).toBe(0);
        expect(m.placementSpan).toBe(1);
        expect(m.futureRuleHints).toEqual({});
      });
    }

    for (let i = 0; i < 50; i++) {
      it(`creates plan model with id "plan_${i}" and correct defaults (iter ${i})`, () => {
        const m = createDefaultAutoWirePlanModel(`plan_${i}`);
        expect(m.planId).toBe(`plan_${i}`);
        expect(m.templateId).toBe('');
        expect(m.components).toEqual([]);
        expect(m.wireSuggestions).toEqual([]);
        expect(m.validationStatus).toBe('PENDING');
        expect(m.validationErrors).toEqual([]);
        expect(m.totalWires).toBe(0);
        expect(m.completedWires).toBe(0);
        expect(m.futurePlanHints).toEqual({});
      });
    }

    it('suggestion overrides are preserved but id always wins', () => {
      const m = createDefaultAutoWireSuggestionModel('override_test', {
        componentId: 'led_1',
        componentType: 'LED',
        sourcePinName: 'ANODE',
        gpioNumber: 13,
        signalType: 'PWM',
        wireColor: 'ORANGE',
        priority: 99,
        isRequired: true,
        suggestionId: 'should_be_overridden',
      } as any);
      expect(m.suggestionId).toBe('override_test');
      expect(m.componentId).toBe('led_1');
      expect(m.componentType).toBe('LED');
      expect(m.gpioNumber).toBe(13);
      expect(m.signalType).toBe('PWM');
      expect(m.wireColor).toBe('ORANGE');
      expect(m.priority).toBe(99);
      expect(m.isRequired).toBe(true);
    });

    it('rule overrides are preserved but id always wins', () => {
      const m = createDefaultAutoWireRuleModel('rule_override', {
        componentType: 'SERVO',
        placementRow: 5,
        placementCol: 3,
        placementSpan: 4,
        ruleId: 'should_be_overridden',
      } as any);
      expect(m.ruleId).toBe('rule_override');
      expect(m.componentType).toBe('SERVO');
      expect(m.placementRow).toBe(5);
      expect(m.placementCol).toBe(3);
      expect(m.placementSpan).toBe(4);
    });

    it('plan overrides are preserved but id always wins', () => {
      const m = createDefaultAutoWirePlanModel('plan_override', {
        templateId: 'LED_BLINK',
        validationStatus: 'VALID',
        totalWires: 10,
        completedWires: 5,
        planId: 'should_be_overridden',
      } as any);
      expect(m.planId).toBe('plan_override');
      expect(m.templateId).toBe('LED_BLINK');
      expect(m.validationStatus).toBe('VALID');
      expect(m.totalWires).toBe(10);
      expect(m.completedWires).toBe(5);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §2: AutoWiringSynchronizer — Validators
  // ═════════════════════════════════════════════════════════════
  describe('§2 — AutoWiringSynchronizer Validators', () => {
    for (let i = 0; i < 50; i++) {
      it(`validates a fully-populated suggestion (iter ${i})`, () => {
        const m = createDefaultAutoWireSuggestionModel(`vs_${i}`, {
          componentId: `comp_${i}`,
          componentType: 'LED',
          sourcePinName: 'ANODE',
          signalType: 'DIGITAL',
          wireColor: 'BLUE',
        });
        const w = validateAutoWireSuggestionModel(m);
        expect(w.length).toBe(0);
      });
    }

    it('validates empty suggestion produces warnings', () => {
      const m = createDefaultAutoWireSuggestionModel('empty_sug');
      const w = validateAutoWireSuggestionModel(m);
      expect(w.length).toBeGreaterThan(0);
      const codes = w.map(x => x.code);
      expect(codes).toContain('EMPTY_SUGGESTION_COMPONENT_ID');
      expect(codes).toContain('EMPTY_SUGGESTION_COMPONENT_TYPE');
      expect(codes).toContain('EMPTY_SUGGESTION_SOURCE_PIN');
    });

    it('validates null suggestion model', () => {
      const w = validateAutoWireSuggestionModel(null as any);
      expect(w.length).toBe(1);
      expect(w[0].code).toBe('INVALID_SUGGESTION');
    });

    it('validates invalid signalType', () => {
      const m = createDefaultAutoWireSuggestionModel('bad_sig', {
        componentId: 'c', componentType: 'LED', sourcePinName: 'A',
        signalType: 'INVALID' as any,
      });
      const w = validateAutoWireSuggestionModel(m);
      expect(w.some(x => x.code === 'INVALID_SUGGESTION_SIGNAL_TYPE')).toBe(true);
    });

    it('validates invalid wireColor', () => {
      const m = createDefaultAutoWireSuggestionModel('bad_col', {
        componentId: 'c', componentType: 'LED', sourcePinName: 'A',
        wireColor: 'PINK' as any,
      });
      const w = validateAutoWireSuggestionModel(m);
      expect(w.some(x => x.code === 'INVALID_SUGGESTION_WIRE_COLOR')).toBe(true);
    });

    for (let i = 0; i < 50; i++) {
      it(`validates a fully-populated rule (iter ${i})`, () => {
        const m = createDefaultAutoWireRuleModel(`vr_${i}`, {
          componentType: 'SERVO',
          pinMappings: [{ pinName: 'SIGNAL', signalType: 'PWM' as WireSignalType, wireColor: 'ORANGE' as WireColor, defaultGpio: 13, targetRail: 'GPIO_13', description: 'test' }],
        });
        const w = validateAutoWireRuleModel(m);
        expect(w.length).toBe(0);
      });
    }

    it('validates empty rule produces warnings', () => {
      const m = createDefaultAutoWireRuleModel('empty_rule');
      const w = validateAutoWireRuleModel(m);
      expect(w.length).toBeGreaterThan(0);
      const codes = w.map(x => x.code);
      expect(codes).toContain('EMPTY_RULE_COMPONENT_TYPE');
    });

    it('validates null rule model', () => {
      const w = validateAutoWireRuleModel(null as any);
      expect(w.length).toBe(1);
      expect(w[0].code).toBe('INVALID_RULE');
    });

    it('validates invalid pinMappings (not array)', () => {
      const m = createDefaultAutoWireRuleModel('bad_pm', {
        componentType: 'LED',
        pinMappings: 'not_an_array' as any,
      });
      const w = validateAutoWireRuleModel(m);
      expect(w.some(x => x.code === 'INVALID_RULE_PIN_MAPPINGS')).toBe(true);
    });

    for (let i = 0; i < 50; i++) {
      it(`validates a fully-populated plan (iter ${i})`, () => {
        const m = createDefaultAutoWirePlanModel(`vp_${i}`, {
          templateId: 'LED_BLINK',
          components: [{ componentId: 'led1', componentType: 'LED', placementRow: 1, placementCol: 1 }],
          wireSuggestions: [],
          validationStatus: 'VALID',
        });
        const w = validateAutoWirePlanModel(m);
        expect(w.length).toBe(0);
      });
    }

    it('validates empty plan produces warnings', () => {
      const m = createDefaultAutoWirePlanModel('empty_plan');
      const w = validateAutoWirePlanModel(m);
      expect(w.length).toBeGreaterThan(0);
      const codes = w.map(x => x.code);
      expect(codes).toContain('EMPTY_PLAN_TEMPLATE_ID');
    });

    it('validates null plan model', () => {
      const w = validateAutoWirePlanModel(null as any);
      expect(w.length).toBe(1);
      expect(w[0].code).toBe('INVALID_PLAN');
    });

    it('validates invalid validationStatus', () => {
      const m = createDefaultAutoWirePlanModel('bad_vs', {
        templateId: 'T',
        validationStatus: 'UNKNOWN_STATUS' as any,
      });
      const w = validateAutoWirePlanModel(m);
      expect(w.some(x => x.code === 'INVALID_PLAN_VALIDATION_STATUS')).toBe(true);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §3: AutoWiringSynchronizer — CRUD Operations
  // ═════════════════════════════════════════════════════════════
  describe('§3 — AutoWiringSynchronizer CRUD Operations', () => {
    // Suggestion CRUD
    for (let i = 0; i < 50; i++) {
      it(`suggestion register/get/has/update/remove (iter ${i})`, () => {
        const sync = new AutoWiringSynchronizer();
        const m = createDefaultAutoWireSuggestionModel(`crud_s_${i}`, {
          componentId: `comp_${i}`, componentType: 'LED', sourcePinName: 'ANODE',
        });
        sync.registerSuggestion(`crud_s_${i}`, m);
        expect(sync.hasSuggestion(`crud_s_${i}`)).toBe(true);
        const got = sync.getSuggestion(`crud_s_${i}`);
        expect(got).toBeDefined();
        expect(got!.suggestionId).toBe(`crud_s_${i}`);
        sync.updateSuggestion(`crud_s_${i}`, { priority: 99 });
        expect(sync.getSuggestion(`crud_s_${i}`)!.priority).toBe(99);
        sync.removeSuggestion(`crud_s_${i}`);
        expect(sync.hasSuggestion(`crud_s_${i}`)).toBe(false);
      });
    }

    it('getAll and getKeys for 100 suggestions', () => {
      const sync = new AutoWiringSynchronizer();
      for (let i = 0; i < 100; i++) {
        sync.registerSuggestion(`all_s_${i}`, createDefaultAutoWireSuggestionModel(`all_s_${i}`, {
          componentId: `c_${i}`, componentType: 'LED', sourcePinName: 'ANODE',
        }));
      }
      expect(sync.getAllSuggestions().length).toBe(100);
      expect(sync.getSuggestionKeys().length).toBe(100);
      sync.clearSuggestions();
      expect(sync.getAllSuggestions().length).toBe(0);
    });

    // Rule CRUD
    for (let i = 0; i < 50; i++) {
      it(`rule register/get/has/update/remove (iter ${i})`, () => {
        const sync = new AutoWiringSynchronizer();
        const m = createDefaultAutoWireRuleModel(`crud_r_${i}`, {
          componentType: 'SERVO',
          pinMappings: [],
        });
        sync.registerRule(`crud_r_${i}`, m);
        expect(sync.hasRule(`crud_r_${i}`)).toBe(true);
        const got = sync.getRule(`crud_r_${i}`);
        expect(got).toBeDefined();
        expect(got!.ruleId).toBe(`crud_r_${i}`);
        sync.updateRule(`crud_r_${i}`, { placementRow: 10 });
        expect(sync.getRule(`crud_r_${i}`)!.placementRow).toBe(10);
        sync.removeRule(`crud_r_${i}`);
        expect(sync.hasRule(`crud_r_${i}`)).toBe(false);
      });
    }

    it('getAll and getKeys for 100 rules', () => {
      const sync = new AutoWiringSynchronizer();
      for (let i = 0; i < 100; i++) {
        sync.registerRule(`all_r_${i}`, createDefaultAutoWireRuleModel(`all_r_${i}`, {
          componentType: 'LED',
        }));
      }
      expect(sync.getAllRules().length).toBe(100);
      expect(sync.getRuleKeys().length).toBe(100);
      sync.clearRules();
      expect(sync.getAllRules().length).toBe(0);
    });

    // Plan CRUD
    for (let i = 0; i < 50; i++) {
      it(`plan register/get/has/update/remove (iter ${i})`, () => {
        const sync = new AutoWiringSynchronizer();
        const m = createDefaultAutoWirePlanModel(`crud_p_${i}`, {
          templateId: 'LED_BLINK',
        });
        sync.registerPlan(`crud_p_${i}`, m);
        expect(sync.hasPlan(`crud_p_${i}`)).toBe(true);
        const got = sync.getPlan(`crud_p_${i}`);
        expect(got).toBeDefined();
        expect(got!.planId).toBe(`crud_p_${i}`);
        sync.updatePlan(`crud_p_${i}`, { totalWires: 42 });
        expect(sync.getPlan(`crud_p_${i}`)!.totalWires).toBe(42);
        sync.removePlan(`crud_p_${i}`);
        expect(sync.hasPlan(`crud_p_${i}`)).toBe(false);
      });
    }

    it('getAll and getKeys for 100 plans', () => {
      const sync = new AutoWiringSynchronizer();
      for (let i = 0; i < 100; i++) {
        sync.registerPlan(`all_p_${i}`, createDefaultAutoWirePlanModel(`all_p_${i}`, {
          templateId: 'T',
        }));
      }
      expect(sync.getAllPlans().length).toBe(100);
      expect(sync.getPlanKeys().length).toBe(100);
      sync.clearPlans();
      expect(sync.getAllPlans().length).toBe(0);
    });

    it('deep copy isolation: mutating returned suggestion does not affect registry', () => {
      const sync = new AutoWiringSynchronizer();
      const m = createDefaultAutoWireSuggestionModel('iso_sug', {
        componentId: 'led1', componentType: 'LED', sourcePinName: 'ANODE',
      });
      sync.registerSuggestion('iso_sug', m);
      const got = sync.getSuggestion('iso_sug')!;
      got.priority = 999;
      got.componentId = 'MUTATED';
      const got2 = sync.getSuggestion('iso_sug')!;
      expect(got2.priority).toBe(0);
      expect(got2.componentId).toBe('led1');
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §4: AutoWiringSynchronizer — Core Methods
  // ═════════════════════════════════════════════════════════════
  describe('§4 — AutoWiringSynchronizer Core Methods', () => {
    it('initializeDefaultRules populates rules for all component types', () => {
      const sync = new AutoWiringSynchronizer();
      sync.initializeDefaultRules();
      const allRules = sync.getAllRules();
      expect(allRules.length).toBeGreaterThan(0);
      // Should have rules for LED, HC-SR04, SERVO, etc.
      const ruleTypes = allRules.map(r => r.componentType);
      expect(ruleTypes).toContain('LED');
      expect(ruleTypes).toContain('SERVO');
      expect(ruleTypes).toContain('HC-SR04');
      expect(ruleTypes).toContain('DHT11');
    });

    it('initializeDefaultRules creates rules with pin mappings', () => {
      const sync = new AutoWiringSynchronizer();
      sync.initializeDefaultRules();
      const ledRule = sync.getRuleForComponentType('LED');
      expect(ledRule).toBeDefined();
      expect(ledRule!.pinMappings.length).toBeGreaterThan(0);
      const anodeMapping = ledRule!.pinMappings.find(p => p.pinName === 'ANODE');
      expect(anodeMapping).toBeDefined();
      expect(anodeMapping!.defaultGpio).toBe(13);
    });

    it('suggestWireRoutes returns valid suggestions for LED', () => {
      const sync = new AutoWiringSynchronizer();
      sync.initializeDefaultRules();
      const suggestions = sync.suggestWireRoutes('led_1', 'LED');
      expect(suggestions.length).toBeGreaterThan(0);
      for (const s of suggestions) {
        expect(s.componentId).toBe('led_1');
        expect(s.componentType).toBe('LED');
        expect(s.sourcePinName).toBeTruthy();
        expect(s.explanation).toBeTruthy();
      }
    });

    it('suggestWireRoutes returns suggestions sorted by priority', () => {
      const sync = new AutoWiringSynchronizer();
      sync.initializeDefaultRules();
      const suggestions = sync.suggestWireRoutes('servo_1', 'SERVO');
      expect(suggestions.length).toBeGreaterThan(0);
      for (let j = 1; j < suggestions.length; j++) {
        expect(suggestions[j - 1].priority).toBeGreaterThanOrEqual(suggestions[j].priority);
      }
    });

    it('suggestWireRoutes returns empty for unknown component type', () => {
      const sync = new AutoWiringSynchronizer();
      sync.initializeDefaultRules();
      const suggestions = sync.suggestWireRoutes('x', 'UNKNOWN_TYPE');
      expect(suggestions.length).toBe(0);
    });

    for (const compType of ['LED', 'HC-SR04', 'SERVO', 'DHT11', 'BUZZER', 'OLED_SSD1306', 'LCD_1602', 'RELAY', 'PUSH_BUTTON', 'POTENTIOMETER', 'MQ2_GAS_SENSOR', 'IR_SENSOR', 'RGB_LED', 'RESISTOR']) {
      it(`suggestWireRoutes produces suggestions for ${compType}`, () => {
        const sync = new AutoWiringSynchronizer();
        sync.initializeDefaultRules();
        const suggestions = sync.suggestWireRoutes(`test_${compType}`, compType);
        expect(suggestions.length).toBeGreaterThan(0);
        expect(suggestions[0].componentType).toBe(compType);
      });
    }

    it('generateWiringPlan creates a valid plan', () => {
      const sync = new AutoWiringSynchronizer();
      sync.initializeDefaultRules();
      const planId = sync.generateWiringPlan('test_plan', [
        { componentId: 'led_1', componentType: 'LED' },
        { componentId: 'servo_1', componentType: 'SERVO' },
      ]);
      expect(planId).toBeTruthy();
      const plan = sync.getPlan(planId);
      expect(plan).toBeDefined();
      expect(plan!.templateId).toBe('test_plan');
      expect(plan!.components.length).toBe(2);
      expect(plan!.wireSuggestions.length).toBeGreaterThan(0);
      expect(plan!.totalWires).toBe(plan!.wireSuggestions.length);
      expect(plan!.validationStatus).toBe('PENDING');
    });

    it('validateWiringPlan returns errors for conflicting GPIOs', () => {
      const sync = new AutoWiringSynchronizer();
      sync.initializeDefaultRules();
      // LED and SERVO both use GPIO 13 by default
      const planId = sync.generateWiringPlan('conflict_plan', [
        { componentId: 'led_1', componentType: 'LED' },
        { componentId: 'servo_1', componentType: 'SERVO' },
      ]);
      const errors = sync.validateWiringPlan(planId);
      // Both use GPIO 13 → should be a conflict
      expect(errors.some(e => e.includes('GPIO 13 conflict'))).toBe(true);
      const updatedPlan = sync.getPlan(planId);
      expect(updatedPlan!.validationStatus).toBe('INVALID');
    });

    it('validateWiringPlan returns empty errors for single-component plan', () => {
      const sync = new AutoWiringSynchronizer();
      sync.initializeDefaultRules();
      const planId = sync.generateWiringPlan('single_plan', [
        { componentId: 'dht_1', componentType: 'DHT11' },
      ]);
      const errors = sync.validateWiringPlan(planId);
      expect(errors.length).toBe(0);
      const updatedPlan = sync.getPlan(planId);
      expect(updatedPlan!.validationStatus).toBe('VALID');
    });

    it('validateWiringPlan returns error for unknown plan', () => {
      const sync = new AutoWiringSynchronizer();
      const errors = sync.validateWiringPlan('nonexistent_plan');
      expect(errors.length).toBe(1);
      expect(errors[0]).toContain('not found');
    });

    it('applyWiringPlan returns wire operations', () => {
      const sync = new AutoWiringSynchronizer();
      sync.initializeDefaultRules();
      const planId = sync.generateWiringPlan('apply_plan', [
        { componentId: 'dht_1', componentType: 'DHT11' },
      ]);
      const ops = sync.applyWiringPlan(planId);
      expect(ops.length).toBeGreaterThan(0);
      for (const op of ops) {
        expect(op.action).toBe('ADD_WIRE');
        expect(op.sourceComponent).toBeTruthy();
        expect(op.sourcePin).toBeTruthy();
        expect(op.targetComponent).toBeTruthy();
        expect(op.targetPin).toBeTruthy();
        expect(op.wireColor).toBeTruthy();
        expect(op.signalType).toBeTruthy();
      }
    });

    it('applyWiringPlan returns empty for unknown plan', () => {
      const sync = new AutoWiringSynchronizer();
      const ops = sync.applyWiringPlan('nonexistent');
      expect(ops.length).toBe(0);
    });

    it('autoPlaceComponents returns non-overlapping positions', () => {
      const sync = new AutoWiringSynchronizer();
      const placements = sync.autoPlaceComponents([
        { componentId: 'led_1', componentType: 'LED' },
        { componentId: 'servo_1', componentType: 'SERVO' },
        { componentId: 'oled_1', componentType: 'OLED_SSD1306' },
        { componentId: 'lcd_1', componentType: 'LCD_1602' },
      ]);
      expect(placements.length).toBe(4);
      // Check no two components overlap on the same cell
      const cells = new Set<string>();
      for (const p of placements) {
        const key = `${p.row},${p.col}`;
        expect(cells.has(key)).toBe(false);
        cells.add(key);
      }
      // All have positive coords
      for (const p of placements) {
        expect(p.row).toBeGreaterThanOrEqual(1);
        expect(p.col).toBeGreaterThanOrEqual(1);
      }
    });

    it('repairCircuit generates fix suggestions for FLOATING_PIN', () => {
      const sync = new AutoWiringSynchronizer();
      sync.initializeDefaultRules();
      const fixes = sync.repairCircuit([
        { issueId: 'issue_1', code: 'FLOATING_PIN', componentId: 'led_1', pinName: 'ANODE' },
      ]);
      expect(fixes.length).toBe(1);
      expect(fixes[0].sourcePinName).toBe('ANODE');
      expect(fixes[0].isRequired).toBe(true);
      expect(fixes[0].explanation).toBeTruthy();
    });

    it('repairCircuit ignores non-FLOATING_PIN issues', () => {
      const sync = new AutoWiringSynchronizer();
      sync.initializeDefaultRules();
      const fixes = sync.repairCircuit([
        { issueId: 'issue_2', code: 'MISSING_GND', componentId: 'led_1', pinName: 'GND' },
      ]);
      expect(fixes.length).toBe(0);
    });

    it('getSnapshot returns complete deep-copied snapshot', () => {
      const sync = new AutoWiringSynchronizer();
      sync.initializeDefaultRules();
      sync.generateWiringPlan('snap_plan', [
        { componentId: 'led_1', componentType: 'LED' },
      ]);
      const snap = sync.getSnapshot();
      expect(snap.rules.length).toBeGreaterThan(0);
      expect(snap.suggestions.length).toBeGreaterThan(0);
      expect(snap.plans.length).toBe(1);
      // Mutating snapshot should not affect internals
      snap.rules.length = 0;
      expect(sync.getAllRules().length).toBeGreaterThan(0);
    });

    it('clearAll resets all registries', () => {
      const sync = new AutoWiringSynchronizer();
      sync.initializeDefaultRules();
      sync.generateWiringPlan('clear_plan', [
        { componentId: 'led_1', componentType: 'LED' },
      ]);
      sync.clearAll();
      expect(sync.getAllRules().length).toBe(0);
      expect(sync.getAllSuggestions().length).toBe(0);
      expect(sync.getAllPlans().length).toBe(0);
    });

    it('analyzeMissingWires detects unconnected pins', () => {
      const sync = new AutoWiringSynchronizer();
      sync.initializeDefaultRules();
      const suggestions = sync.analyzeMissingWires(
        [{ componentId: 'led_1', type: 'LED', pins: [{ name: 'ANODE', connectedTo: null }, { name: 'CATHODE', connectedTo: null }] }],
        [],
      );
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].componentId).toBe('led_1');
    });

    it('analyzeMissingWires returns empty when all pins connected', () => {
      const sync = new AutoWiringSynchronizer();
      sync.initializeDefaultRules();
      const suggestions = sync.analyzeMissingWires(
        [{ componentId: 'led_1', type: 'LED', pins: [{ name: 'ANODE', connectedTo: 'wire_1' }, { name: 'CATHODE', connectedTo: 'wire_2' }] }],
        [],
      );
      expect(suggestions.length).toBe(0);
    });

    it('autoRouteWires produces paths for a valid plan', () => {
      const sync = new AutoWiringSynchronizer();
      sync.initializeDefaultRules();
      const planId = sync.generateWiringPlan('route_plan', [
        { componentId: 'led_1', componentType: 'LED' },
      ]);
      const routes = sync.autoRouteWires(planId);
      expect(routes.length).toBeGreaterThan(0);
      for (const r of routes) {
        expect(r.suggestionId).toBeTruthy();
        expect(r.path.length).toBeGreaterThanOrEqual(2);
        for (const pt of r.path) {
          expect(typeof pt.x).toBe('number');
          expect(typeof pt.y).toBe('number');
        }
      }
    });

    it('getSuggestionsForComponent filters correctly', () => {
      const sync = new AutoWiringSynchronizer();
      sync.initializeDefaultRules();
      sync.generateWiringPlan('filter_plan', [
        { componentId: 'led_1', componentType: 'LED' },
        { componentId: 'servo_1', componentType: 'SERVO' },
      ]);
      const ledSuggestions = sync.getSuggestionsForComponent('led_1');
      for (const s of ledSuggestions) {
        expect(s.componentId).toBe('led_1');
      }
      const servoSuggestions = sync.getSuggestionsForComponent('servo_1');
      for (const s of servoSuggestions) {
        expect(s.componentId).toBe('servo_1');
      }
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §5: ComponentKnowledgeSynchronizer — Factory & Validation
  // ═════════════════════════════════════════════════════════════
  describe('§5 — ComponentKnowledgeSynchronizer Factory & Validation', () => {
    for (let i = 0; i < 50; i++) {
      it(`creates knowledge model with id "know_${i}" and correct defaults (iter ${i})`, () => {
        const m = createDefaultComponentKnowledgeModel(`know_${i}`);
        expect(m.knowledgeId).toBe(`know_${i}`);
        expect(m.componentType).toBe('');
        expect(m.displayName).toBe('');
        expect(m.category).toBe('');
        expect(m.requiredPins).toEqual([]);
        expect(m.optionalPins).toEqual([]);
        expect(m.powerPins).toEqual([]);
        expect(m.communicationPins).toEqual([]);
        expect(m.recommendedGpios).toEqual({});
        expect(m.blocklyTemplateId).toBe('');
        expect(m.placementWidth).toBe(1);
        expect(m.placementHeight).toBe(1);
        expect(m.educationalNotes).toBe('');
        expect(m.wiringTips).toEqual([]);
        expect(m.commonMistakes).toEqual([]);
        expect(m.futureKnowledgeHints).toEqual({});
      });
    }

    for (let i = 0; i < 50; i++) {
      it(`validates a fully-populated knowledge model (iter ${i})`, () => {
        const m = createDefaultComponentKnowledgeModel(`vk_${i}`, {
          componentType: 'LED',
          displayName: 'LED',
          category: 'OUTPUT',
        });
        const w = validateComponentKnowledgeModel(m);
        expect(w.length).toBe(0);
      });
    }

    it('validates empty knowledge produces warnings', () => {
      const m = createDefaultComponentKnowledgeModel('empty_know');
      const w = validateComponentKnowledgeModel(m);
      expect(w.length).toBeGreaterThan(0);
      const codes = w.map(x => x.code);
      expect(codes).toContain('EMPTY_COMPONENT_TYPE');
      expect(codes).toContain('EMPTY_DISPLAY_NAME');
      expect(codes).toContain('EMPTY_CATEGORY');
    });

    it('validates null knowledge model', () => {
      const w = validateComponentKnowledgeModel(null as any);
      expect(w.length).toBe(1);
      expect(w[0].code).toBe('INVALID_KNOWLEDGE');
    });

    it('validates invalid category', () => {
      const m = createDefaultComponentKnowledgeModel('bad_cat', {
        componentType: 'LED', displayName: 'LED',
        category: 'INVALID_CAT',
      });
      const w = validateComponentKnowledgeModel(m);
      expect(w.some(x => x.code === 'INVALID_CATEGORY')).toBe(true);
    });

    it.each(VALID_COMPONENT_CATEGORIES)('accepts category "%s"', (cat) => {
      const m = createDefaultComponentKnowledgeModel('cat_test', {
        componentType: 'T', displayName: 'T', category: cat,
      });
      const w = validateComponentKnowledgeModel(m);
      expect(w.some(x => x.code === 'INVALID_CATEGORY')).toBe(false);
    });

    it('validates invalid placementWidth', () => {
      const m = createDefaultComponentKnowledgeModel('bad_pw', {
        componentType: 'T', displayName: 'T', category: 'OUTPUT',
        placementWidth: -1,
      });
      const w = validateComponentKnowledgeModel(m);
      expect(w.some(x => x.code === 'INVALID_PLACEMENT_WIDTH')).toBe(true);
    });

    it('validates invalid placementHeight', () => {
      const m = createDefaultComponentKnowledgeModel('bad_ph', {
        componentType: 'T', displayName: 'T', category: 'OUTPUT',
        placementHeight: 0,
      });
      const w = validateComponentKnowledgeModel(m);
      expect(w.some(x => x.code === 'INVALID_PLACEMENT_HEIGHT')).toBe(true);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §6: ComponentKnowledgeSynchronizer — CRUD Operations
  // ═════════════════════════════════════════════════════════════
  describe('§6 — ComponentKnowledgeSynchronizer CRUD Operations', () => {
    for (let i = 0; i < 50; i++) {
      it(`knowledge register/get/has/update/remove (iter ${i})`, () => {
        const sync = new ComponentKnowledgeSynchronizer();
        const m = createDefaultComponentKnowledgeModel(`crud_k_${i}`, {
          componentType: 'LED', displayName: 'LED', category: 'OUTPUT',
        });
        sync.registerKnowledge(`crud_k_${i}`, m);
        expect(sync.hasKnowledge(`crud_k_${i}`)).toBe(true);
        const got = sync.getKnowledge(`crud_k_${i}`);
        expect(got).toBeDefined();
        expect(got!.knowledgeId).toBe(`crud_k_${i}`);
        sync.updateKnowledge(`crud_k_${i}`, { displayName: 'Updated LED' });
        expect(sync.getKnowledge(`crud_k_${i}`)!.displayName).toBe('Updated LED');
        sync.removeKnowledge(`crud_k_${i}`);
        expect(sync.hasKnowledge(`crud_k_${i}`)).toBe(false);
      });
    }

    it('getAll and getKeys for batch knowledge entries', () => {
      const sync = new ComponentKnowledgeSynchronizer();
      for (let i = 0; i < 100; i++) {
        sync.registerKnowledge(`all_k_${i}`, createDefaultComponentKnowledgeModel(`all_k_${i}`, {
          componentType: `TYPE_${i}`, displayName: `Component ${i}`, category: 'OUTPUT',
        }));
      }
      expect(sync.getAllKnowledge().length).toBe(100);
      expect(sync.getKnowledgeKeys().length).toBe(100);
      sync.clearKnowledge();
      expect(sync.getAllKnowledge().length).toBe(0);
    });

    it(`initializes default knowledge for all ${ALL_COMPONENT_TYPES.length} types`, () => {
      const sync = new ComponentKnowledgeSynchronizer();
      sync.initializeDefaultKnowledge();
      const allEntries = sync.getAllKnowledge();
      expect(allEntries.length).toBe(ALL_COMPONENT_TYPES.length);
      for (const entry of allEntries) {
        expect(entry.knowledgeId).toBeTruthy();
        expect(entry.componentType).toBeTruthy();
        expect(entry.displayName).toBeTruthy();
      }
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §7: ComponentKnowledgeSynchronizer — Core Methods
  // ═════════════════════════════════════════════════════════════
  describe('§7 — ComponentKnowledgeSynchronizer Core Methods', () => {
    it('initializeDefaultKnowledge populates all component types', () => {
      const sync = new ComponentKnowledgeSynchronizer();
      sync.initializeDefaultKnowledge();
      for (const compType of ALL_COMPONENT_TYPES) {
        const knowledge = sync.getKnowledgeByType(compType);
        expect(knowledge).toBeDefined();
        expect(knowledge!.componentType).toBe(compType);
      }
    });

    for (const compType of ALL_COMPONENT_TYPES) {
      it(`getKnowledgeByType returns correct knowledge for ${compType}`, () => {
        const sync = new ComponentKnowledgeSynchronizer();
        sync.initializeDefaultKnowledge();
        const knowledge = sync.getKnowledgeByType(compType);
        expect(knowledge).toBeDefined();
        expect(knowledge!.componentType).toBe(compType);
        expect(knowledge!.displayName).toBeTruthy();
        const expected = DEFAULT_COMPONENT_KNOWLEDGE[compType];
        expect(knowledge!.category).toBe(expected.category);
      });
    }

    it('getKnowledgeByType returns undefined for unknown type', () => {
      const sync = new ComponentKnowledgeSynchronizer();
      sync.initializeDefaultKnowledge();
      const result = sync.getKnowledgeByType('UNKNOWN_COMPONENT');
      expect(result).toBeUndefined();
    });

    it('getKnowledgeByType returns undefined for empty type', () => {
      const sync = new ComponentKnowledgeSynchronizer();
      sync.initializeDefaultKnowledge();
      const result = sync.getKnowledgeByType('');
      expect(result).toBeUndefined();
    });

    it('getRecommendedGpio returns valid GPIO numbers for LED ANODE', () => {
      const sync = new ComponentKnowledgeSynchronizer();
      sync.initializeDefaultKnowledge();
      const gpio = sync.getRecommendedGpio('LED', 'ANODE');
      expect(gpio).toBe(13);
    });

    it('getRecommendedGpio avoids already-used GPIOs', () => {
      const sync = new ComponentKnowledgeSynchronizer();
      sync.initializeDefaultKnowledge();
      const gpio = sync.getRecommendedGpio('LED', 'ANODE', [13]);
      expect(gpio).not.toBe(13);
      expect(gpio).toBeGreaterThanOrEqual(0);
    });

    it('getRecommendedGpio returns -1 for unknown component', () => {
      const sync = new ComponentKnowledgeSynchronizer();
      sync.initializeDefaultKnowledge();
      const gpio = sync.getRecommendedGpio('UNKNOWN', 'PIN');
      expect(gpio).toBe(-1);
    });

    it('getRecommendedGpio returns -1 for unknown pin', () => {
      const sync = new ComponentKnowledgeSynchronizer();
      sync.initializeDefaultKnowledge();
      const gpio = sync.getRecommendedGpio('LED', 'UNKNOWN_PIN');
      expect(gpio).toBe(-1);
    });

    it('getRecommendedGpio returns -1 for empty params', () => {
      const sync = new ComponentKnowledgeSynchronizer();
      expect(sync.getRecommendedGpio('', '')).toBe(-1);
    });

    for (const compType of ['HC-SR04', 'SERVO', 'DHT11', 'BUZZER', 'POTENTIOMETER']) {
      it(`getRecommendedGpio returns valid GPIO for ${compType}`, () => {
        const sync = new ComponentKnowledgeSynchronizer();
        sync.initializeDefaultKnowledge();
        const knowledge = sync.getKnowledgeByType(compType)!;
        const pinNames = Object.keys(knowledge.recommendedGpios);
        if (pinNames.length > 0) {
          const gpio = sync.getRecommendedGpio(compType, pinNames[0]);
          expect(gpio).toBeGreaterThanOrEqual(0);
        }
      });
    }

    it('getBlocklyTemplate returns correct template for LED', () => {
      const sync = new ComponentKnowledgeSynchronizer();
      sync.initializeDefaultKnowledge();
      expect(sync.getBlocklyTemplate('LED')).toBe('led_blink');
    });

    it('getBlocklyTemplate returns correct template for SERVO', () => {
      const sync = new ComponentKnowledgeSynchronizer();
      sync.initializeDefaultKnowledge();
      expect(sync.getBlocklyTemplate('SERVO')).toBe('servo_sweep');
    });

    it('getBlocklyTemplate returns empty for unknown type', () => {
      const sync = new ComponentKnowledgeSynchronizer();
      sync.initializeDefaultKnowledge();
      expect(sync.getBlocklyTemplate('UNKNOWN')).toBe('');
    });

    it('getBlocklyTemplate returns empty for empty type', () => {
      const sync = new ComponentKnowledgeSynchronizer();
      expect(sync.getBlocklyTemplate('')).toBe('');
    });

    it('getWiringExplanation returns non-empty for LED ANODE', () => {
      const sync = new ComponentKnowledgeSynchronizer();
      sync.initializeDefaultKnowledge();
      const explanation = sync.getWiringExplanation('LED', 'ANODE', 'GPIO13');
      expect(explanation).toBeTruthy();
      expect(explanation.length).toBeGreaterThan(10);
    });

    it('getWiringExplanation returns non-empty for DHT11 DATA', () => {
      const sync = new ComponentKnowledgeSynchronizer();
      sync.initializeDefaultKnowledge();
      const explanation = sync.getWiringExplanation('DHT11', 'DATA', 'GPIO4');
      expect(explanation).toBeTruthy();
      expect(explanation.length).toBeGreaterThan(10);
    });

    it('getWiringExplanation handles unknown component gracefully', () => {
      const sync = new ComponentKnowledgeSynchronizer();
      sync.initializeDefaultKnowledge();
      const explanation = sync.getWiringExplanation('UNKNOWN', 'PIN', 'GPIO5');
      expect(explanation).toBeTruthy();
      expect(explanation).toContain('No knowledge available');
    });

    it('getWiringExplanation returns generic message for empty params', () => {
      const sync = new ComponentKnowledgeSynchronizer();
      const explanation = sync.getWiringExplanation('', '', '');
      expect(explanation).toBeTruthy();
    });

    it.each(VALID_COMPONENT_CATEGORIES)('getComponentsByCategory returns entries for "%s"', (cat) => {
      const sync = new ComponentKnowledgeSynchronizer();
      sync.initializeDefaultKnowledge();
      const entries = sync.getComponentsByCategory(cat);
      for (const entry of entries) {
        expect(entry.category).toBe(cat);
      }
    });

    it('getComponentsByCategory returns empty for invalid category', () => {
      const sync = new ComponentKnowledgeSynchronizer();
      sync.initializeDefaultKnowledge();
      const entries = sync.getComponentsByCategory('INVALID');
      expect(entries.length).toBe(0);
    });

    it('getComponentsByCategory returns empty for empty category', () => {
      const sync = new ComponentKnowledgeSynchronizer();
      sync.initializeDefaultKnowledge();
      const entries = sync.getComponentsByCategory('');
      expect(entries.length).toBe(0);
    });

    it('getSnapshot returns deep-copied snapshot', () => {
      const sync = new ComponentKnowledgeSynchronizer();
      sync.initializeDefaultKnowledge();
      const snap = sync.getSnapshot();
      expect(snap.entries.length).toBe(ALL_COMPONENT_TYPES.length);
      // Mutating snapshot doesn't affect internals
      snap.entries.length = 0;
      expect(sync.getAllKnowledge().length).toBe(ALL_COMPONENT_TYPES.length);
    });

    it('clearAll resets knowledge registry', () => {
      const sync = new ComponentKnowledgeSynchronizer();
      sync.initializeDefaultKnowledge();
      sync.clearAll();
      expect(sync.getAllKnowledge().length).toBe(0);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §8: CircuitWizardSynchronizer — Factory & Validation
  // ═════════════════════════════════════════════════════════════
  describe('§8 — CircuitWizardSynchronizer Factory & Validation', () => {
    for (let i = 0; i < 30; i++) {
      it(`creates template model with id "tmpl_${i}" and correct defaults (iter ${i})`, () => {
        const m = createDefaultCircuitTemplateModel(`tmpl_${i}`);
        expect(m.templateId).toBe(`tmpl_${i}`);
        expect(m.name).toBe('');
        expect(m.description).toBe('');
        expect(m.difficulty).toBe('BEGINNER');
        expect(m.category).toBe('BEGINNER');
        expect(m.components).toEqual([]);
        expect(m.wiringPlan).toEqual([]);
        expect(m.blocklyProgramId).toBe('');
        expect(m.estimatedTimeMinutes).toBe(0);
        expect(m.prerequisiteTemplates).toEqual([]);
        expect(m.futureTemplateHints).toEqual({});
      });
    }

    for (let i = 0; i < 30; i++) {
      it(`creates step model with id "step_${i}" and correct defaults (iter ${i})`, () => {
        const m = createDefaultGuidedBuildStepModel(`step_${i}`);
        expect(m.stepId).toBe(`step_${i}`);
        expect(m.buildId).toBe('');
        expect(m.stepNumber).toBe(0);
        expect(m.action).toBe('PLACE_COMPONENT');
        expect(m.targetComponentId).toBe('');
        expect(m.targetComponentType).toBe('');
        expect(m.targetPinName).toBe('');
        expect(m.instruction).toBe('');
        expect(m.explanation).toBe('');
        expect(m.isCompleted).toBe(false);
        expect(m.isOptional).toBe(false);
        expect(m.futureStepHints).toEqual({});
      });
    }

    for (let i = 0; i < 30; i++) {
      it(`creates build model with id "build_${i}" and correct defaults (iter ${i})`, () => {
        const m = createDefaultGuidedBuildModel(`build_${i}`);
        expect(m.buildId).toBe(`build_${i}`);
        expect(m.templateId).toBe('');
        expect(m.templateName).toBe('');
        expect(m.steps).toEqual([]);
        expect(m.currentStepIndex).toBe(0);
        expect(m.totalSteps).toBe(0);
        expect(m.completedSteps).toBe(0);
        expect(m.isComplete).toBe(false);
        expect(m.startedAt).toBe(0);
        expect(m.futureBuildHints).toEqual({});
      });
    }

    for (let i = 0; i < 30; i++) {
      it(`creates progress model with id "prog_${i}" and correct defaults (iter ${i})`, () => {
        const m = createDefaultLearningProgressModel(`prog_${i}`);
        expect(m.progressId).toBe(`prog_${i}`);
        expect(m.userId).toBe('');
        expect(m.circuitsBuilt).toBe(0);
        expect(m.circuitsCompleted).toBe(0);
        expect(m.mistakesCorrected).toBe(0);
        expect(m.guidedStepsCompleted).toBe(0);
        expect(m.healthScores).toEqual([]);
        expect(m.averageHealthScore).toBe(0);
        expect(m.templatesCompleted).toEqual([]);
        expect(m.totalTimeMinutes).toBe(0);
        expect(m.lastActivityAt).toBe(0);
        expect(m.futureProgressHints).toEqual({});
      });
    }

    // Template validator
    for (let i = 0; i < 30; i++) {
      it(`validates a fully-populated template (iter ${i})`, () => {
        const m = createDefaultCircuitTemplateModel(`vt_${i}`, {
          name: `Template ${i}`, difficulty: 'BEGINNER', category: 'BEGINNER',
          estimatedTimeMinutes: 10,
        });
        const w = validateCircuitTemplateModel(m);
        expect(w.length).toBe(0);
      });
    }

    it('validates null template model', () => {
      const w = validateCircuitTemplateModel(null as any);
      expect(w.length).toBe(1);
      expect(w[0].code).toBe('INVALID_TEMPLATE');
    });

    it('validates empty template name', () => {
      const m = createDefaultCircuitTemplateModel('empty_tmpl');
      const w = validateCircuitTemplateModel(m);
      expect(w.some(x => x.code === 'EMPTY_TEMPLATE_NAME')).toBe(true);
    });

    it('validates invalid difficulty', () => {
      const m = createDefaultCircuitTemplateModel('bad_diff', {
        name: 'T', difficulty: 'EXPERT' as any,
      });
      const w = validateCircuitTemplateModel(m);
      expect(w.some(x => x.code === 'INVALID_DIFFICULTY')).toBe(true);
    });

    it('validates invalid category', () => {
      const m = createDefaultCircuitTemplateModel('bad_cat', {
        name: 'T', category: 'INVALID_CAT' as any,
      });
      const w = validateCircuitTemplateModel(m);
      expect(w.some(x => x.code === 'INVALID_CATEGORY')).toBe(true);
    });

    it.each(VALID_TEMPLATE_DIFFICULTIES)('accepts difficulty "%s"', (diff) => {
      const m = createDefaultCircuitTemplateModel('diff_test', {
        name: 'T', difficulty: diff, category: 'BEGINNER',
      });
      const w = validateCircuitTemplateModel(m);
      expect(w.some(x => x.code === 'INVALID_DIFFICULTY')).toBe(false);
    });

    it.each(VALID_TEMPLATE_CATEGORIES)('accepts category "%s"', (cat) => {
      const m = createDefaultCircuitTemplateModel('cat_test', {
        name: 'T', difficulty: 'BEGINNER', category: cat,
      });
      const w = validateCircuitTemplateModel(m);
      expect(w.some(x => x.code === 'INVALID_CATEGORY')).toBe(false);
    });

    // Step validator
    it('validates null step model', () => {
      const w = validateGuidedBuildStepModel(null as any);
      expect(w.length).toBe(1);
      expect(w[0].code).toBe('INVALID_STEP');
    });

    it('validates empty step produces warnings', () => {
      const m = createDefaultGuidedBuildStepModel('empty_step');
      const w = validateGuidedBuildStepModel(m);
      expect(w.some(x => x.code === 'EMPTY_STEP_BUILD_ID')).toBe(true);
      expect(w.some(x => x.code === 'EMPTY_INSTRUCTION')).toBe(true);
    });

    it('validates invalid action', () => {
      const m = createDefaultGuidedBuildStepModel('bad_act', {
        buildId: 'b1', instruction: 'I',
        action: 'INVALID_ACTION' as any, stepNumber: 1,
      });
      const w = validateGuidedBuildStepModel(m);
      expect(w.some(x => x.code === 'INVALID_ACTION')).toBe(true);
    });

    it.each(VALID_GUIDED_BUILD_ACTIONS)('accepts action "%s"', (action) => {
      const m = createDefaultGuidedBuildStepModel('act_test', {
        buildId: 'b1', instruction: 'I', action, stepNumber: 1,
      });
      const w = validateGuidedBuildStepModel(m);
      expect(w.some(x => x.code === 'INVALID_ACTION')).toBe(false);
    });

    // Build validator
    it('validates null build model', () => {
      const w = validateGuidedBuildModel(null as any);
      expect(w.length).toBe(1);
      expect(w[0].code).toBe('INVALID_BUILD');
    });

    it('validates empty build produces warnings', () => {
      const m = createDefaultGuidedBuildModel('empty_build');
      const w = validateGuidedBuildModel(m);
      expect(w.some(x => x.code === 'EMPTY_BUILD_TEMPLATE_ID')).toBe(true);
    });

    // Progress validator
    it('validates null progress model', () => {
      const w = validateLearningProgressModel(null as any);
      expect(w.length).toBe(1);
      expect(w[0].code).toBe('INVALID_PROGRESS');
    });

    it('validates empty progress produces warnings', () => {
      const m = createDefaultLearningProgressModel('empty_prog');
      const w = validateLearningProgressModel(m);
      expect(w.some(x => x.code === 'EMPTY_USER_ID')).toBe(true);
    });

    it('validates negative circuitsBuilt', () => {
      const m = createDefaultLearningProgressModel('bad_cb', {
        userId: 'u1', circuitsBuilt: -5,
      });
      const w = validateLearningProgressModel(m);
      expect(w.some(x => x.code === 'INVALID_CIRCUITS_BUILT')).toBe(true);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §9: CircuitWizardSynchronizer — CRUD Operations
  // ═════════════════════════════════════════════════════════════
  describe('§9 — CircuitWizardSynchronizer CRUD Operations', () => {
    // Template CRUD
    for (let i = 0; i < 30; i++) {
      it(`template register/get/has/update/remove (iter ${i})`, () => {
        const sync = new CircuitWizardSynchronizer();
        const m = createDefaultCircuitTemplateModel(`crud_t_${i}`, {
          name: `T ${i}`, difficulty: 'BEGINNER', category: 'BEGINNER',
        });
        sync.registerTemplate(`crud_t_${i}`, m);
        expect(sync.hasTemplate(`crud_t_${i}`)).toBe(true);
        const got = sync.getTemplate(`crud_t_${i}`);
        expect(got).toBeDefined();
        expect(got!.templateId).toBe(`crud_t_${i}`);
        sync.updateTemplate(`crud_t_${i}`, { name: 'Updated' });
        expect(sync.getTemplate(`crud_t_${i}`)!.name).toBe('Updated');
        sync.removeTemplate(`crud_t_${i}`);
        expect(sync.hasTemplate(`crud_t_${i}`)).toBe(false);
      });
    }

    it('getAll and getKeys for templates', () => {
      const sync = new CircuitWizardSynchronizer();
      for (let i = 0; i < 50; i++) {
        sync.registerTemplate(`all_t_${i}`, createDefaultCircuitTemplateModel(`all_t_${i}`, { name: `T${i}` }));
      }
      expect(sync.getAllTemplates().length).toBe(50);
      expect(sync.getTemplateKeys().length).toBe(50);
      sync.clearTemplates();
      expect(sync.getAllTemplates().length).toBe(0);
    });

    // GuidedBuild CRUD
    for (let i = 0; i < 30; i++) {
      it(`guidedBuild register/get/has/update/remove (iter ${i})`, () => {
        const sync = new CircuitWizardSynchronizer();
        const m = createDefaultGuidedBuildModel(`crud_gb_${i}`, {
          templateId: 'T', templateName: 'Test',
        });
        sync.registerGuidedBuild(`crud_gb_${i}`, m);
        expect(sync.hasGuidedBuild(`crud_gb_${i}`)).toBe(true);
        const got = sync.getGuidedBuild(`crud_gb_${i}`);
        expect(got).toBeDefined();
        expect(got!.buildId).toBe(`crud_gb_${i}`);
        sync.updateGuidedBuild(`crud_gb_${i}`, { templateName: 'Updated' });
        expect(sync.getGuidedBuild(`crud_gb_${i}`)!.templateName).toBe('Updated');
        sync.removeGuidedBuild(`crud_gb_${i}`);
        expect(sync.hasGuidedBuild(`crud_gb_${i}`)).toBe(false);
      });
    }

    it('getAll and getKeys for guided builds', () => {
      const sync = new CircuitWizardSynchronizer();
      for (let i = 0; i < 50; i++) {
        sync.registerGuidedBuild(`all_gb_${i}`, createDefaultGuidedBuildModel(`all_gb_${i}`, { templateId: 'T' }));
      }
      expect(sync.getAllGuidedBuilds().length).toBe(50);
      expect(sync.getGuidedBuildKeys().length).toBe(50);
      sync.clearGuidedBuilds();
      expect(sync.getAllGuidedBuilds().length).toBe(0);
    });

    // Step CRUD
    for (let i = 0; i < 30; i++) {
      it(`step register/get/has/update/remove (iter ${i})`, () => {
        const sync = new CircuitWizardSynchronizer();
        const m = createDefaultGuidedBuildStepModel(`crud_st_${i}`, {
          buildId: 'b1', instruction: 'I', stepNumber: i,
        });
        sync.registerStep(`crud_st_${i}`, m);
        expect(sync.hasStep(`crud_st_${i}`)).toBe(true);
        const got = sync.getStep(`crud_st_${i}`);
        expect(got).toBeDefined();
        expect(got!.stepId).toBe(`crud_st_${i}`);
        sync.updateStep(`crud_st_${i}`, { instruction: 'Updated' });
        expect(sync.getStep(`crud_st_${i}`)!.instruction).toBe('Updated');
        sync.removeStep(`crud_st_${i}`);
        expect(sync.hasStep(`crud_st_${i}`)).toBe(false);
      });
    }

    it('getAll and getKeys for steps', () => {
      const sync = new CircuitWizardSynchronizer();
      for (let i = 0; i < 50; i++) {
        sync.registerStep(`all_st_${i}`, createDefaultGuidedBuildStepModel(`all_st_${i}`, {
          buildId: 'b1', instruction: 'I', stepNumber: i,
        }));
      }
      expect(sync.getAllSteps().length).toBe(50);
      expect(sync.getStepKeys().length).toBe(50);
      sync.clearSteps();
      expect(sync.getAllSteps().length).toBe(0);
    });

    // Progress CRUD
    for (let i = 0; i < 30; i++) {
      it(`progress register/get/has/update/remove (iter ${i})`, () => {
        const sync = new CircuitWizardSynchronizer();
        const m = createDefaultLearningProgressModel(`crud_pr_${i}`, {
          userId: `user_${i}`,
        });
        sync.registerProgress(`crud_pr_${i}`, m);
        expect(sync.hasProgress(`crud_pr_${i}`)).toBe(true);
        const got = sync.getProgress(`crud_pr_${i}`);
        expect(got).toBeDefined();
        expect(got!.progressId).toBe(`crud_pr_${i}`);
        sync.updateProgress(`crud_pr_${i}`, { circuitsBuilt: 5 });
        expect(sync.getProgress(`crud_pr_${i}`)!.circuitsBuilt).toBe(5);
        sync.removeProgress(`crud_pr_${i}`);
        expect(sync.hasProgress(`crud_pr_${i}`)).toBe(false);
      });
    }

    it('getAll and getKeys for progress', () => {
      const sync = new CircuitWizardSynchronizer();
      for (let i = 0; i < 50; i++) {
        sync.registerProgress(`all_pr_${i}`, createDefaultLearningProgressModel(`all_pr_${i}`, { userId: `u_${i}` }));
      }
      expect(sync.getAllProgress().length).toBe(50);
      expect(sync.getProgressKeys().length).toBe(50);
      sync.clearProgress();
      expect(sync.getAllProgress().length).toBe(0);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §10: CircuitWizardSynchronizer — Template Library
  // ═════════════════════════════════════════════════════════════
  describe('§10 — CircuitWizardSynchronizer Template Library', () => {
    it(`initializeTemplateLibrary populates all ${ALL_TEMPLATE_IDS.length} templates`, () => {
      const sync = new CircuitWizardSynchronizer();
      sync.initializeTemplateLibrary();
      const allTemplates = sync.getAllTemplates();
      expect(allTemplates.length).toBe(ALL_TEMPLATE_IDS.length);
      for (const tid of ALL_TEMPLATE_IDS) {
        expect(sync.hasTemplate(tid)).toBe(true);
      }
    });

    for (const templateId of ALL_TEMPLATE_IDS) {
      it(`template "${templateId}" has valid components and wiringPlan`, () => {
        const sync = new CircuitWizardSynchronizer();
        sync.initializeTemplateLibrary();
        const tmpl = sync.getTemplate(templateId)!;
        expect(tmpl).toBeDefined();
        expect(tmpl.name).toBeTruthy();
        expect(tmpl.components.length).toBeGreaterThan(0);
        expect(tmpl.wiringPlan.length).toBeGreaterThan(0);
        expect(VALID_TEMPLATE_DIFFICULTIES).toContain(tmpl.difficulty);
        expect(VALID_TEMPLATE_CATEGORIES).toContain(tmpl.category);
        expect(tmpl.blocklyProgramId).toBeTruthy();
        expect(tmpl.estimatedTimeMinutes).toBeGreaterThan(0);
        // Each wire has required fields
        for (const wire of tmpl.wiringPlan) {
          expect(wire.sourceComponent).toBeTruthy();
          expect(wire.sourcePin).toBeTruthy();
          expect(wire.targetComponent).toBeTruthy();
          expect(wire.targetPin).toBeTruthy();
          expect(wire.wireColor).toBeTruthy();
          expect(wire.signalType).toBeTruthy();
        }
      });
    }

    it.each(VALID_TEMPLATE_CATEGORIES)('getTemplatesByCategory returns templates for "%s"', (cat) => {
      const sync = new CircuitWizardSynchronizer();
      sync.initializeTemplateLibrary();
      const templates = sync.getTemplatesByCategory(cat);
      for (const t of templates) {
        expect(t.category).toBe(cat);
      }
    });

    it.each(VALID_TEMPLATE_DIFFICULTIES)('getTemplatesByDifficulty returns templates for "%s"', (diff) => {
      const sync = new CircuitWizardSynchronizer();
      sync.initializeTemplateLibrary();
      const templates = sync.getTemplatesByDifficulty(diff);
      for (const t of templates) {
        expect(t.difficulty).toBe(diff);
      }
    });

    it('getTemplatesByCategory returns empty for invalid category', () => {
      const sync = new CircuitWizardSynchronizer();
      sync.initializeTemplateLibrary();
      const templates = sync.getTemplatesByCategory('INVALID' as any);
      expect(templates.length).toBe(0);
    });

    it('getTemplatesByDifficulty returns empty for invalid difficulty', () => {
      const sync = new CircuitWizardSynchronizer();
      sync.initializeTemplateLibrary();
      const templates = sync.getTemplatesByDifficulty('INVALID' as any);
      expect(templates.length).toBe(0);
    });

    it('all beginner templates have valid prerequisiteTemplates', () => {
      const sync = new CircuitWizardSynchronizer();
      sync.initializeTemplateLibrary();
      const beginnerTemplates = sync.getTemplatesByDifficulty('BEGINNER');
      for (const t of beginnerTemplates) {
        expect(Array.isArray(t.prerequisiteTemplates)).toBe(true);
        for (const prereq of t.prerequisiteTemplates) {
          // Prerequisite should be a valid template ID or empty
          expect(typeof prereq).toBe('string');
        }
      }
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §11: CircuitWizardSynchronizer — Guided Build Workflow
  // ═════════════════════════════════════════════════════════════
  describe('§11 — CircuitWizardSynchronizer Guided Build Workflow', () => {
    it('startGuidedBuild creates build with ordered steps for LED_BLINK', () => {
      const sync = new CircuitWizardSynchronizer();
      sync.initializeTemplateLibrary();
      const buildId = sync.startGuidedBuild('LED_BLINK');
      expect(buildId).toBeTruthy();
      const build = sync.getGuidedBuild(buildId);
      expect(build).toBeDefined();
      expect(build!.templateId).toBe('LED_BLINK');
      expect(build!.templateName).toBe('LED Blink');
      expect(build!.steps.length).toBeGreaterThan(0);
      expect(build!.totalSteps).toBe(build!.steps.length);
      expect(build!.currentStepIndex).toBe(0);
      expect(build!.isComplete).toBe(false);
    });

    it('startGuidedBuild returns empty for unknown template', () => {
      const sync = new CircuitWizardSynchronizer();
      sync.initializeTemplateLibrary();
      const buildId = sync.startGuidedBuild('NONEXISTENT');
      expect(buildId).toBe('');
    });

    it('steps order: PLACE_COMPONENT first, then WIRE, then CONFIG/GENERATE/VALIDATE', () => {
      const sync = new CircuitWizardSynchronizer();
      sync.initializeTemplateLibrary();
      const buildId = sync.startGuidedBuild('LED_BLINK');
      const build = sync.getGuidedBuild(buildId)!;
      const actions = build.steps.map(s => s.action);
      // Find first WIRE_CONNECTION
      const firstWireIdx = actions.indexOf('WIRE_CONNECTION');
      // All PLACE_COMPONENT should be before first WIRE_CONNECTION
      for (let j = 0; j < firstWireIdx; j++) {
        expect(actions[j]).toBe('PLACE_COMPONENT');
      }
      // CONFIGURE_GPIO, GENERATE_CODE, VALIDATE_CIRCUIT should be at end
      const lastThree = actions.slice(-3);
      expect(lastThree).toContain('CONFIGURE_GPIO');
      expect(lastThree).toContain('GENERATE_CODE');
      expect(lastThree).toContain('VALIDATE_CIRCUIT');
    });

    it('advanceGuidedStep marks steps as completed and increments index', () => {
      const sync = new CircuitWizardSynchronizer();
      sync.initializeTemplateLibrary();
      const buildId = sync.startGuidedBuild('BUZZER_BEEP');
      const firstStep = sync.getCurrentStep(buildId);
      expect(firstStep).toBeDefined();
      expect(firstStep!.isCompleted).toBe(false);
      const nextStep = sync.advanceGuidedStep(buildId);
      expect(nextStep).toBeDefined();
      const build = sync.getGuidedBuild(buildId)!;
      expect(build.currentStepIndex).toBe(1);
      expect(build.completedSteps).toBe(1);
    });

    it('advanceGuidedStep returns null when all steps done', () => {
      const sync = new CircuitWizardSynchronizer();
      sync.initializeTemplateLibrary();
      const buildId = sync.startGuidedBuild('BUZZER_BEEP');
      const build = sync.getGuidedBuild(buildId)!;
      const totalSteps = build.totalSteps;
      let lastResult: GuidedBuildStepModel | null = null;
      for (let j = 0; j < totalSteps; j++) {
        lastResult = sync.advanceGuidedStep(buildId);
      }
      expect(lastResult).toBeNull();
      const finalBuild = sync.getGuidedBuild(buildId)!;
      expect(finalBuild.isComplete).toBe(true);
      expect(finalBuild.completedSteps).toBe(totalSteps);
    });

    it('getCurrentStep returns correct current step', () => {
      const sync = new CircuitWizardSynchronizer();
      sync.initializeTemplateLibrary();
      const buildId = sync.startGuidedBuild('LED_BLINK');
      const step0 = sync.getCurrentStep(buildId);
      expect(step0).toBeDefined();
      expect(step0!.stepNumber).toBe(1);
      sync.advanceGuidedStep(buildId);
      const step1 = sync.getCurrentStep(buildId);
      expect(step1).toBeDefined();
      expect(step1!.stepNumber).toBe(2);
    });

    it('getCurrentStep returns null for completed build', () => {
      const sync = new CircuitWizardSynchronizer();
      sync.initializeTemplateLibrary();
      const buildId = sync.startGuidedBuild('BUZZER_BEEP');
      const build = sync.getGuidedBuild(buildId)!;
      for (let j = 0; j < build.totalSteps; j++) {
        sync.advanceGuidedStep(buildId);
      }
      expect(sync.getCurrentStep(buildId)).toBeNull();
    });

    it('getCurrentStep returns null for nonexistent build', () => {
      const sync = new CircuitWizardSynchronizer();
      expect(sync.getCurrentStep('nonexistent')).toBeNull();
    });

    it('full workflow: start → advance through all → complete for LED_BLINK', () => {
      const sync = new CircuitWizardSynchronizer();
      sync.initializeTemplateLibrary();
      const buildId = sync.startGuidedBuild('LED_BLINK');
      const build = sync.getGuidedBuild(buildId)!;
      const totalSteps = build.totalSteps;
      expect(totalSteps).toBeGreaterThan(3);
      for (let j = 0; j < totalSteps; j++) {
        const current = sync.getCurrentStep(buildId);
        expect(current).not.toBeNull();
        sync.advanceGuidedStep(buildId);
      }
      const finalBuild = sync.getGuidedBuild(buildId)!;
      expect(finalBuild.isComplete).toBe(true);
      expect(finalBuild.completedSteps).toBe(totalSteps);
    });

    for (const templateId of ['TRAFFIC_LIGHT', 'SERVO_SWEEP', 'DISTANCE_METER']) {
      it(`guided build can be started for "${templateId}"`, () => {
        const sync = new CircuitWizardSynchronizer();
        sync.initializeTemplateLibrary();
        const buildId = sync.startGuidedBuild(templateId);
        expect(buildId).toBeTruthy();
        const build = sync.getGuidedBuild(buildId)!;
        expect(build.steps.length).toBeGreaterThan(0);
        expect(build.templateId).toBe(templateId);
      });
    }
  });

  // ═════════════════════════════════════════════════════════════
  // §12: CircuitWizardSynchronizer — One-Click Build
  // ═════════════════════════════════════════════════════════════
  describe('§12 — CircuitWizardSynchronizer One-Click Build', () => {
    for (const templateId of ALL_TEMPLATE_IDS) {
      it(`buildCircuitOneClick returns valid data for "${templateId}"`, () => {
        const sync = new CircuitWizardSynchronizer();
        sync.initializeTemplateLibrary();
        const result = sync.buildCircuitOneClick(templateId);
        expect(result).not.toBeNull();
        expect(result!.components.length).toBeGreaterThan(0);
        expect(result!.wiringPlan.length).toBeGreaterThan(0);
        expect(result!.blocklyProgramId).toBeTruthy();
        expect(result!.estimatedTimeMinutes).toBeGreaterThan(0);
      });
    }

    it('buildCircuitOneClick returns null for unknown template', () => {
      const sync = new CircuitWizardSynchronizer();
      sync.initializeTemplateLibrary();
      const result = sync.buildCircuitOneClick('NONEXISTENT');
      expect(result).toBeNull();
    });

    it('buildCircuitOneClick returns deep copies', () => {
      const sync = new CircuitWizardSynchronizer();
      sync.initializeTemplateLibrary();
      const result = sync.buildCircuitOneClick('LED_BLINK')!;
      result.components.length = 0;
      const result2 = sync.buildCircuitOneClick('LED_BLINK')!;
      expect(result2.components.length).toBeGreaterThan(0);
    });

    it('generateComponentList returns components for LED_BLINK', () => {
      const sync = new CircuitWizardSynchronizer();
      sync.initializeTemplateLibrary();
      const comps = sync.generateComponentList('LED_BLINK');
      expect(comps.length).toBeGreaterThan(0);
      expect(comps.some(c => c.componentType === 'LED')).toBe(true);
    });

    it('generateWiringPlan returns wiring plan for LED_BLINK', () => {
      const sync = new CircuitWizardSynchronizer();
      sync.initializeTemplateLibrary();
      const plan = sync.generateWiringPlan('LED_BLINK');
      expect(plan.length).toBeGreaterThan(0);
      for (const wire of plan) {
        expect(wire.sourceComponent).toBeTruthy();
        expect(wire.sourcePin).toBeTruthy();
      }
    });

    it('generateBlocklyProgram returns program id for LED_BLINK', () => {
      const sync = new CircuitWizardSynchronizer();
      sync.initializeTemplateLibrary();
      expect(sync.generateBlocklyProgram('LED_BLINK')).toBe('led_blink');
    });

    it('generateBlocklyProgram returns empty for unknown template', () => {
      const sync = new CircuitWizardSynchronizer();
      expect(sync.generateBlocklyProgram('NONEXISTENT')).toBe('');
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §13: CircuitWizardSynchronizer — Learning Progress
  // ═════════════════════════════════════════════════════════════
  describe('§13 — CircuitWizardSynchronizer Learning Progress', () => {
    it('updateLearningProgress increments circuitsBuilt', () => {
      const sync = new CircuitWizardSynchronizer();
      sync.updateLearningProgress('user1', { type: 'CIRCUIT_BUILT' });
      sync.updateLearningProgress('user1', { type: 'CIRCUIT_BUILT' });
      const progress = sync.getProgress('progress_user1')!;
      expect(progress).toBeDefined();
      expect(progress.circuitsBuilt).toBe(2);
    });

    it('updateLearningProgress increments circuitsCompleted', () => {
      const sync = new CircuitWizardSynchronizer();
      sync.updateLearningProgress('user2', { type: 'CIRCUIT_COMPLETED', healthScore: 90 });
      const progress = sync.getProgress('progress_user2')!;
      expect(progress).toBeDefined();
      expect(progress.circuitsCompleted).toBe(1);
      expect(progress.healthScores).toEqual([90]);
      expect(progress.averageHealthScore).toBe(90);
    });

    it('updateLearningProgress tracks multiple health scores', () => {
      const sync = new CircuitWizardSynchronizer();
      sync.updateLearningProgress('user3', { type: 'CIRCUIT_COMPLETED', healthScore: 80 });
      sync.updateLearningProgress('user3', { type: 'CIRCUIT_COMPLETED', healthScore: 100 });
      const progress = sync.getProgress('progress_user3')!;
      expect(progress.circuitsCompleted).toBe(2);
      expect(progress.healthScores).toEqual([80, 100]);
      expect(progress.averageHealthScore).toBe(90);
    });

    it('updateLearningProgress increments mistakesCorrected', () => {
      const sync = new CircuitWizardSynchronizer();
      sync.updateLearningProgress('user4', { type: 'MISTAKE_CORRECTED' });
      sync.updateLearningProgress('user4', { type: 'MISTAKE_CORRECTED' });
      sync.updateLearningProgress('user4', { type: 'MISTAKE_CORRECTED' });
      const progress = sync.getProgress('progress_user4')!;
      expect(progress.mistakesCorrected).toBe(3);
    });

    it('updateLearningProgress increments guidedStepsCompleted', () => {
      const sync = new CircuitWizardSynchronizer();
      sync.updateLearningProgress('user5', { type: 'STEP_COMPLETED' });
      const progress = sync.getProgress('progress_user5')!;
      expect(progress.guidedStepsCompleted).toBe(1);
    });

    it('updateLearningProgress tracks templates completed', () => {
      const sync = new CircuitWizardSynchronizer();
      sync.updateLearningProgress('user6', { type: 'TEMPLATE_COMPLETED', templateId: 'LED_BLINK' });
      sync.updateLearningProgress('user6', { type: 'TEMPLATE_COMPLETED', templateId: 'TRAFFIC_LIGHT' });
      sync.updateLearningProgress('user6', { type: 'TEMPLATE_COMPLETED', templateId: 'LED_BLINK' }); // duplicate
      const progress = sync.getProgress('progress_user6')!;
      expect(progress.templatesCompleted.length).toBe(2);
      expect(progress.templatesCompleted).toContain('LED_BLINK');
      expect(progress.templatesCompleted).toContain('TRAFFIC_LIGHT');
    });

    it('updateLearningProgress does nothing for empty userId', () => {
      const sync = new CircuitWizardSynchronizer();
      sync.updateLearningProgress('', { type: 'CIRCUIT_BUILT' });
      expect(sync.getAllProgress().length).toBe(0);
    });

    it('calculateEducationalScore returns 0 for unknown user', () => {
      const sync = new CircuitWizardSynchronizer();
      const score = sync.calculateEducationalScore('nobody');
      expect(score).toBe(0);
    });

    it('calculateEducationalScore returns 0-100', () => {
      const sync = new CircuitWizardSynchronizer();
      // Build up some progress
      for (let i = 0; i < 10; i++) {
        sync.updateLearningProgress('scorer', { type: 'CIRCUIT_COMPLETED', healthScore: 80 });
      }
      for (let i = 0; i < 50; i++) {
        sync.updateLearningProgress('scorer', { type: 'STEP_COMPLETED' });
      }
      for (let i = 0; i < 20; i++) {
        sync.updateLearningProgress('scorer', { type: 'MISTAKE_CORRECTED' });
      }
      const score = sync.calculateEducationalScore('scorer');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('repairCircuit returns results for AUTO mode', () => {
      const sync = new CircuitWizardSynchronizer();
      const results = sync.repairCircuit(['issue_1', 'issue_2'], 'AUTO');
      expect(results.length).toBe(2);
      expect(results[0].action).toBe('AUTO_FIX');
      expect(results[0].isAutoFixed).toBe(true);
      expect(results[1].action).toBe('AUTO_FIX');
    });

    it('repairCircuit returns results for STEP_BY_STEP mode', () => {
      const sync = new CircuitWizardSynchronizer();
      const results = sync.repairCircuit(['issue_3'], 'STEP_BY_STEP');
      expect(results.length).toBe(1);
      expect(results[0].action).toBe('GUIDED_REPAIR');
      expect(results[0].isAutoFixed).toBe(false);
    });

    it('repairCircuit returns results for IGNORE mode', () => {
      const sync = new CircuitWizardSynchronizer();
      const results = sync.repairCircuit(['issue_4'], 'IGNORE');
      expect(results.length).toBe(1);
      expect(results[0].action).toBe('IGNORED');
      expect(results[0].isAutoFixed).toBe(false);
    });

    it('repairCircuit returns empty for empty issues', () => {
      const sync = new CircuitWizardSynchronizer();
      const results = sync.repairCircuit([], 'AUTO');
      expect(results.length).toBe(0);
    });

    it('getSnapshot returns complete wizard snapshot', () => {
      const sync = new CircuitWizardSynchronizer();
      sync.initializeTemplateLibrary();
      sync.startGuidedBuild('LED_BLINK');
      sync.updateLearningProgress('snap_user', { type: 'CIRCUIT_BUILT' });
      const snap = sync.getSnapshot();
      expect(snap.templates.length).toBe(ALL_TEMPLATE_IDS.length);
      expect(snap.guidedBuilds.length).toBe(1);
      expect(snap.steps.length).toBeGreaterThan(0);
      expect(snap.learningProgress.length).toBe(1);
    });

    it('clearAll resets everything', () => {
      const sync = new CircuitWizardSynchronizer();
      sync.initializeTemplateLibrary();
      sync.startGuidedBuild('LED_BLINK');
      sync.updateLearningProgress('clear_user', { type: 'CIRCUIT_BUILT' });
      sync.clearAll();
      expect(sync.getAllTemplates().length).toBe(0);
      expect(sync.getAllGuidedBuilds().length).toBe(0);
      expect(sync.getAllSteps().length).toBe(0);
      expect(sync.getAllProgress().length).toBe(0);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §14: Cross-System Integration
  // ═════════════════════════════════════════════════════════════
  describe('§14 — Cross-System Integration', () => {
    it('AutoWiring + ComponentKnowledge: knowledge-driven wire suggestions', () => {
      const autoWire = new AutoWiringSynchronizer();
      autoWire.initializeDefaultRules();
      const knowledge = new ComponentKnowledgeSynchronizer();
      knowledge.initializeDefaultKnowledge();

      // Get recommended GPIO from knowledge
      const gpio = knowledge.getRecommendedGpio('LED', 'ANODE');
      expect(gpio).toBe(13);

      // Get suggestions from auto-wiring
      const suggestions = autoWire.suggestWireRoutes('led_1', 'LED');
      const anodeSuggestion = suggestions.find(s => s.sourcePinName === 'ANODE');
      expect(anodeSuggestion).toBeDefined();
      expect(anodeSuggestion!.gpioNumber).toBe(gpio);
    });

    it('Knowledge + Wizard: wizard templates use known component types', () => {
      const knowledge = new ComponentKnowledgeSynchronizer();
      knowledge.initializeDefaultKnowledge();
      const wizard = new CircuitWizardSynchronizer();
      wizard.initializeTemplateLibrary();

      // Every component in every template should be a known type
      const allTemplates = wizard.getAllTemplates();
      for (const tmpl of allTemplates) {
        for (const comp of tmpl.components) {
          // Allow RESISTOR which is in DEFAULT_COMPONENT_KNOWLEDGE
          const known = knowledge.getKnowledgeByType(comp.componentType);
          expect(known).toBeDefined();
        }
      }
    });

    it('full workflow: select template → generate suggestions → validate → build', () => {
      const autoWire = new AutoWiringSynchronizer();
      autoWire.initializeDefaultRules();
      const wizard = new CircuitWizardSynchronizer();
      wizard.initializeTemplateLibrary();

      // Step 1: Select a template
      const template = wizard.getTemplate('LED_BLINK')!;
      expect(template).toBeDefined();

      // Step 2: Generate wiring suggestions via auto-wiring
      const componentList = template.components.map((c, idx) => ({
        componentId: `${c.label}_${idx}`,
        componentType: c.componentType,
      }));
      const planId = autoWire.generateWiringPlan('LED_BLINK_auto', componentList);
      expect(planId).toBeTruthy();

      // Step 3: Validate the plan
      const errors = autoWire.validateWiringPlan(planId);
      // May or may not have errors depending on GPIO overlap
      expect(Array.isArray(errors)).toBe(true);

      // Step 4: Apply the plan
      const ops = autoWire.applyWiringPlan(planId);
      expect(ops.length).toBeGreaterThan(0);
      for (const op of ops) {
        expect(op.action).toBe('ADD_WIRE');
      }
    });

    it('full workflow: start guided build → advance through → track progress', () => {
      const wizard = new CircuitWizardSynchronizer();
      wizard.initializeTemplateLibrary();

      // Start guided build
      const buildId = wizard.startGuidedBuild('BUZZER_BEEP');
      expect(buildId).toBeTruthy();

      // Track progress
      wizard.updateLearningProgress('student1', { type: 'CIRCUIT_BUILT' });

      // Advance through all steps
      const build = wizard.getGuidedBuild(buildId)!;
      for (let j = 0; j < build.totalSteps; j++) {
        wizard.updateLearningProgress('student1', { type: 'STEP_COMPLETED' });
        wizard.advanceGuidedStep(buildId);
      }

      // Mark template completed
      wizard.updateLearningProgress('student1', {
        type: 'TEMPLATE_COMPLETED', templateId: 'BUZZER_BEEP',
      });
      wizard.updateLearningProgress('student1', {
        type: 'CIRCUIT_COMPLETED', healthScore: 95,
      });

      const progress = wizard.getProgress('progress_student1')!;
      expect(progress.circuitsBuilt).toBe(1);
      expect(progress.circuitsCompleted).toBe(1);
      expect(progress.guidedStepsCompleted).toBe(build.totalSteps);
      expect(progress.templatesCompleted).toContain('BUZZER_BEEP');
      expect(progress.healthScores).toEqual([95]);
    });

    it('AutoWiring analyzeMissingWires finds gaps not covered by knowledge', () => {
      const autoWire = new AutoWiringSynchronizer();
      autoWire.initializeDefaultRules();
      const knowledge = new ComponentKnowledgeSynchronizer();
      knowledge.initializeDefaultKnowledge();

      // Create a component with some pins connected and some not
      const suggestions = autoWire.analyzeMissingWires([
        {
          componentId: 'servo_test',
          type: 'SERVO',
          pins: [
            { name: 'SIGNAL', connectedTo: 'wire_1' },
            { name: 'VCC', connectedTo: null },
            { name: 'GND', connectedTo: null },
          ],
        },
      ], ['wire_1']);
      // Should suggest VCC and GND connections
      expect(suggestions.some(s => s.sourcePinName === 'VCC')).toBe(true);
      expect(suggestions.some(s => s.sourcePinName === 'GND')).toBe(true);
      // SIGNAL is already connected, should NOT be suggested
      expect(suggestions.some(s => s.sourcePinName === 'SIGNAL')).toBe(false);
    });

    it('deep copy safety across all snapshots', () => {
      const autoWire = new AutoWiringSynchronizer();
      autoWire.initializeDefaultRules();
      const knowledge = new ComponentKnowledgeSynchronizer();
      knowledge.initializeDefaultKnowledge();
      const wizard = new CircuitWizardSynchronizer();
      wizard.initializeTemplateLibrary();

      // Get snapshots
      const awSnap = autoWire.getSnapshot();
      const ckSnap = knowledge.getSnapshot();
      const cwSnap = wizard.getSnapshot();

      // Mutate snapshots
      awSnap.rules.length = 0;
      ckSnap.entries.length = 0;
      cwSnap.templates.length = 0;

      // Verify internals are unaffected
      expect(autoWire.getAllRules().length).toBeGreaterThan(0);
      expect(knowledge.getAllKnowledge().length).toBeGreaterThan(0);
      expect(wizard.getAllTemplates().length).toBeGreaterThan(0);
    });

    for (let i = 0; i < 20; i++) {
      it(`cross-system batch iter ${i}: autoWire + knowledge consistency`, () => {
        const autoWire = new AutoWiringSynchronizer();
        autoWire.initializeDefaultRules();
        const knowledge = new ComponentKnowledgeSynchronizer();
        knowledge.initializeDefaultKnowledge();

        const compType = ALL_COMPONENT_TYPES[i % ALL_COMPONENT_TYPES.length];
        const knowledgeEntry = knowledge.getKnowledgeByType(compType);
        expect(knowledgeEntry).toBeDefined();

        const rule = autoWire.getRuleForComponentType(compType);
        // Not all knowledge entries have auto-wiring rules (e.g., ESP32, ARDUINO)
        if (rule) {
          expect(rule.componentType).toBe(compType);
          expect(rule.pinMappings.length).toBeGreaterThan(0);
        }
      });
    }

    it('wizard one-click + auto-wire integration', () => {
      const wizard = new CircuitWizardSynchronizer();
      wizard.initializeTemplateLibrary();
      const autoWire = new AutoWiringSynchronizer();
      autoWire.initializeDefaultRules();

      const oneClick = wizard.buildCircuitOneClick('FIRE_ALARM')!;
      expect(oneClick).not.toBeNull();
      expect(oneClick.components.length).toBeGreaterThan(0);

      // Generate auto-wire plan for the same components
      const compList = oneClick.components.map((c, idx) => ({
        componentId: `${c.label}_${idx}`,
        componentType: c.componentType,
      }));
      const planId = autoWire.generateWiringPlan('FIRE_ALARM_auto', compList);
      const plan = autoWire.getPlan(planId)!;
      expect(plan.wireSuggestions.length).toBeGreaterThan(0);
      expect(plan.components.length).toBe(compList.length);
    });
  });
});
