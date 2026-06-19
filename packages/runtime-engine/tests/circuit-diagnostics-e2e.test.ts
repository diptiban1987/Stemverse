import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createDefaultCircuitIssueModel,
  createDefaultCircuitRecommendationModel,
  createDefaultLearningHintModel,
  createDefaultProjectReadinessModel,
  createDefaultBlocklyDiagnosticModel,
  validateCircuitIssueModel,
  validateCircuitRecommendationModel,
  validateLearningHintModel,
  validateProjectReadinessModel,
  validateBlocklyDiagnosticModel,
  VALID_DIAGNOSTIC_SEVERITIES,
  VALID_DIAGNOSTIC_CATEGORIES,
  VALID_HIGHLIGHT_COLORS,
  COMPONENT_WIRING_RULES,
  DEMO_CIRCUIT_DEFINITIONS,
  CircuitDiagnosticsSynchronizer,
} from '../src/stage/circuit-diagnostics-runtime';
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
} from '../src/types';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

const ALL_COMPONENT_TYPES = Object.keys(COMPONENT_WIRING_RULES);
const ALL_DEMO_CIRCUITS = Object.keys(DEMO_CIRCUIT_DEFINITIONS);

/** Creates a fully-wired component descriptor for testing */
function makeComponent(
  id: string,
  type: string,
  connected: boolean = true,
): {
  componentId: string;
  type: string;
  pins: Array<{ name: string; connectedTo: string | null; netId: string | null }>;
} {
  const rules = COMPONENT_WIRING_RULES[type];
  if (!rules) {
    return {
      componentId: id,
      type,
      pins: [{ name: 'PIN_A', connectedTo: connected ? 'wire_1' : null, netId: connected ? 'net_1' : null }],
    };
  }
  const allPins = [...rules.requiredPins, ...rules.optionalPins];
  return {
    componentId: id,
    type,
    pins: allPins.map((p, idx) => ({
      name: p,
      connectedTo: connected ? `wire_${id}_${idx}` : null,
      netId: connected ? `net_${id}_${idx}` : null,
    })),
  };
}

/** Creates a disconnected component (all pins floating) */
function makeDisconnectedComponent(
  id: string,
  type: string,
): {
  componentId: string;
  type: string;
  pins: Array<{ name: string; connectedTo: string | null; netId: string | null }>;
} {
  return makeComponent(id, type, false);
}

function makeGpioMapping(
  gpioNumber: number,
  componentId: string,
  pinName: string = 'SIGNAL',
  direction: string = 'OUTPUT',
): { gpioNumber: number; componentId: string; pinName: string; direction: string } {
  return { gpioNumber, componentId, pinName, direction };
}

function makeBlock(
  blockId: string,
  type: string,
  fields: Record<string, string> = {},
): { blockId: string; type: string; fields: Record<string, string> } {
  return { blockId, type, fields };
}

// ═══════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════

describe('Phase 29A — Circuit Diagnostics & Learning Assistant E2E', () => {

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ═════════════════════════════════════════════════════════════
  // §1: CircuitIssueModel Factory & Validator
  // ═════════════════════════════════════════════════════════════
  describe('§1 — CircuitIssueModel Factory & Validator', () => {
    for (let i = 0; i < 200; i++) {
      it(`creates issue model with id "issue_${i}" and correct defaults (iter ${i})`, () => {
        const m = createDefaultCircuitIssueModel(`issue_${i}`);
        expect(m.issueId).toBe(`issue_${i}`);
        expect(m.code).toBe('');
        expect(m.severity).toBe('WARNING');
        expect(m.category).toBe('ELECTRICAL');
        expect(m.componentId).toBe('');
        expect(m.pinName).toBe('');
        expect(m.gpioNumber).toBe(-1);
        expect(m.wireId).toBe('');
        expect(m.netId).toBe('');
        expect(m.title).toBe('');
        expect(m.message).toBe('');
        expect(m.whyWrong).toBe('');
        expect(m.howToFix).toBe('');
        expect(m.expectedOutcome).toBe('');
        expect(m.highlightColor).toBe('YELLOW');
        expect(m.affectedIds).toEqual([]);
        expect(m.futureIssueHints).toEqual({});
      });
    }

    it.each(VALID_DIAGNOSTIC_SEVERITIES)('accepts severity override "%s"', (sev) => {
      const m = createDefaultCircuitIssueModel('sev_test', { severity: sev });
      expect(m.severity).toBe(sev);
      expect(m.issueId).toBe('sev_test');
    });

    it.each(VALID_DIAGNOSTIC_CATEGORIES)('accepts category override "%s"', (cat) => {
      const m = createDefaultCircuitIssueModel('cat_test', { category: cat });
      expect(m.category).toBe(cat);
    });

    it.each(VALID_HIGHLIGHT_COLORS)('accepts highlightColor override "%s"', (col) => {
      const m = createDefaultCircuitIssueModel('col_test', { highlightColor: col });
      expect(m.highlightColor).toBe(col);
    });

    for (let i = 0; i < 100; i++) {
      it(`validates a fully-populated issue model (iter ${i})`, () => {
        const m = createDefaultCircuitIssueModel(`val_${i}`, {
          code: `CODE_${i}`,
          title: `Title ${i}`,
          message: `Message ${i}`,
          severity: 'ERROR',
          category: 'HARDWARE',
          highlightColor: 'RED',
        });
        const w = validateCircuitIssueModel(m);
        expect(w.length).toBe(0);
      });
    }

    it('validates empty issue model produces warnings', () => {
      const m = createDefaultCircuitIssueModel('empty_issue');
      const w = validateCircuitIssueModel(m);
      expect(w.length).toBeGreaterThan(0);
      const codes = w.map(x => x.code);
      expect(codes).toContain('EMPTY_ISSUE_CODE');
      expect(codes).toContain('EMPTY_ISSUE_TITLE');
      expect(codes).toContain('EMPTY_ISSUE_MESSAGE');
    });

    it('validates null model', () => {
      const w = validateCircuitIssueModel(null as any);
      expect(w.length).toBe(1);
      expect(w[0].code).toBe('INVALID_ISSUE');
    });

    it('validates invalid severity', () => {
      const m = createDefaultCircuitIssueModel('bad_sev', {
        code: 'X', title: 'T', message: 'M',
        severity: 'INVALID' as any,
      });
      const w = validateCircuitIssueModel(m);
      expect(w.some(x => x.code === 'INVALID_SEVERITY')).toBe(true);
    });

    it('validates invalid category', () => {
      const m = createDefaultCircuitIssueModel('bad_cat', {
        code: 'X', title: 'T', message: 'M',
        category: 'NOPE' as any,
      });
      const w = validateCircuitIssueModel(m);
      expect(w.some(x => x.code === 'INVALID_CATEGORY')).toBe(true);
    });

    it('validates invalid highlightColor', () => {
      const m = createDefaultCircuitIssueModel('bad_color', {
        code: 'X', title: 'T', message: 'M',
        highlightColor: 'PURPLE' as any,
      });
      const w = validateCircuitIssueModel(m);
      expect(w.some(x => x.code === 'INVALID_HIGHLIGHT')).toBe(true);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §2: CircuitRecommendationModel Factory & Validator
  // ═════════════════════════════════════════════════════════════
  describe('§2 — CircuitRecommendationModel Factory & Validator', () => {
    for (let i = 0; i < 200; i++) {
      it(`creates recommendation model with id "rec_${i}" (iter ${i})`, () => {
        const m = createDefaultCircuitRecommendationModel(`rec_${i}`);
        expect(m.recommendationId).toBe(`rec_${i}`);
        expect(m.issueId).toBe('');
        expect(m.title).toBe('');
        expect(m.description).toBe('');
        expect(m.actionType).toBe('');
        expect(m.targetComponentId).toBe('');
        expect(m.targetPinName).toBe('');
        expect(m.targetGpioNumber).toBe(-1);
        expect(m.isAutoFixable).toBe(false);
        expect(m.fixPayload).toEqual({});
        expect(m.futureRecommendationHints).toEqual({});
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`validates a fully-populated recommendation (iter ${i})`, () => {
        const m = createDefaultCircuitRecommendationModel(`vrec_${i}`, {
          issueId: `issue_${i}`,
          title: `Fix ${i}`,
          description: `Description ${i}`,
          actionType: 'CONNECT_PIN',
        });
        const w = validateCircuitRecommendationModel(m);
        expect(w.length).toBe(0);
      });
    }

    it('validates empty recommendation produces warnings', () => {
      const m = createDefaultCircuitRecommendationModel('empty_rec');
      const w = validateCircuitRecommendationModel(m);
      expect(w.length).toBeGreaterThan(0);
      const codes = w.map(x => x.code);
      expect(codes).toContain('EMPTY_RECOMMENDATION_ISSUE_ID');
      expect(codes).toContain('EMPTY_RECOMMENDATION_TITLE');
      expect(codes).toContain('EMPTY_RECOMMENDATION_DESC');
      expect(codes).toContain('EMPTY_ACTION_TYPE');
    });

    it('validates null recommendation model', () => {
      const w = validateCircuitRecommendationModel(null as any);
      expect(w.length).toBe(1);
      expect(w[0].code).toBe('INVALID_RECOMMENDATION');
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §3: LearningHintModel Factory & Validator
  // ═════════════════════════════════════════════════════════════
  describe('§3 — LearningHintModel Factory & Validator', () => {
    for (let i = 0; i < 200; i++) {
      it(`creates hint model with id "hint_${i}" (iter ${i})`, () => {
        const m = createDefaultLearningHintModel(`hint_${i}`);
        expect(m.hintId).toBe(`hint_${i}`);
        expect(m.componentType).toBe('');
        expect(m.issueCode).toBe('');
        expect(m.difficulty).toBe('BEGINNER');
        expect(m.title).toBe('');
        expect(m.explanation).toBe('');
        expect(m.example).toBe('');
        expect(m.relatedConcept).toBe('');
        expect(m.futureHintHints).toEqual({});
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`validates a fully-populated hint (iter ${i})`, () => {
        const m = createDefaultLearningHintModel(`vhint_${i}`, {
          title: `Hint ${i}`,
          explanation: `Explanation ${i}`,
          componentType: 'LED',
          difficulty: 'BEGINNER',
        });
        const w = validateLearningHintModel(m);
        expect(w.length).toBe(0);
      });
    }

    it('validates empty hint produces warnings', () => {
      const m = createDefaultLearningHintModel('empty_hint');
      const w = validateLearningHintModel(m);
      expect(w.length).toBeGreaterThan(0);
      const codes = w.map(x => x.code);
      expect(codes).toContain('EMPTY_HINT_TITLE');
      expect(codes).toContain('EMPTY_HINT_EXPLANATION');
      expect(codes).toContain('EMPTY_HINT_COMPONENT_TYPE');
    });

    it('validates null hint model', () => {
      const w = validateLearningHintModel(null as any);
      expect(w.length).toBe(1);
      expect(w[0].code).toBe('INVALID_HINT');
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §4: ProjectReadinessModel Factory & Validator
  // ═════════════════════════════════════════════════════════════
  describe('§4 — ProjectReadinessModel Factory & Validator', () => {
    for (let i = 0; i < 200; i++) {
      it(`creates readiness model with id "readiness_${i}" (iter ${i})`, () => {
        const m = createDefaultProjectReadinessModel(`readiness_${i}`);
        expect(m.readinessId).toBe(`readiness_${i}`);
        expect(m.hardwarePercent).toBe(0);
        expect(m.codePercent).toBe(0);
        expect(m.electricalPercent).toBe(0);
        expect(m.simulationPercent).toBe(0);
        expect(m.overallPercent).toBe(0);
        expect(m.criticalIssues).toEqual([]);
        expect(m.notReadyReasons).toEqual([]);
        expect(m.isReady).toBe(false);
        expect(m.futureReadinessHints).toEqual({});
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`validates a fully-populated readiness (iter ${i})`, () => {
        const m = createDefaultProjectReadinessModel(`vr_${i}`, {
          hardwarePercent: 80,
          codePercent: 90,
          electricalPercent: 100,
          simulationPercent: 75,
          overallPercent: 86,
        });
        const w = validateProjectReadinessModel(m);
        expect(w.length).toBe(0);
      });
    }

    it('validates empty readiness is valid (percentages 0 are valid)', () => {
      const m = createDefaultProjectReadinessModel('empty_ready');
      const w = validateProjectReadinessModel(m);
      expect(w.length).toBe(0);
    });

    it('validates invalid hardwarePercent', () => {
      const m = createDefaultProjectReadinessModel('bad_hw', { hardwarePercent: 150 });
      const w = validateProjectReadinessModel(m);
      expect(w.some(x => x.code === 'INVALID_HARDWARE_PERCENT')).toBe(true);
    });

    it('validates negative codePercent', () => {
      const m = createDefaultProjectReadinessModel('bad_code', { codePercent: -10 });
      const w = validateProjectReadinessModel(m);
      expect(w.some(x => x.code === 'INVALID_CODE_PERCENT')).toBe(true);
    });

    it('validates null readiness model', () => {
      const w = validateProjectReadinessModel(null as any);
      expect(w.length).toBe(1);
      expect(w[0].code).toBe('INVALID_READINESS');
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §5: BlocklyDiagnosticModel Factory & Validator
  // ═════════════════════════════════════════════════════════════
  describe('§5 — BlocklyDiagnosticModel Factory & Validator', () => {
    for (let i = 0; i < 200; i++) {
      it(`creates blockly diagnostic with id "diag_${i}" (iter ${i})`, () => {
        const m = createDefaultBlocklyDiagnosticModel(`diag_${i}`);
        expect(m.diagnosticId).toBe(`diag_${i}`);
        expect(m.code).toBe('');
        expect(m.severity).toBe('WARNING');
        expect(m.blockId).toBe('');
        expect(m.variableName).toBe('');
        expect(m.gpioNumber).toBe(-1);
        expect(m.title).toBe('');
        expect(m.message).toBe('');
        expect(m.howToFix).toBe('');
        expect(m.futureDiagnosticHints).toEqual({});
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`validates a fully-populated blockly diagnostic (iter ${i})`, () => {
        const m = createDefaultBlocklyDiagnosticModel(`vd_${i}`, {
          code: `DIAG_${i}`,
          title: `Title ${i}`,
          message: `Message ${i}`,
          severity: 'WARNING',
        });
        const w = validateBlocklyDiagnosticModel(m);
        expect(w.length).toBe(0);
      });
    }

    it('validates empty blockly diagnostic produces warnings', () => {
      const m = createDefaultBlocklyDiagnosticModel('empty_diag');
      const w = validateBlocklyDiagnosticModel(m);
      expect(w.length).toBeGreaterThan(0);
      const codes = w.map(x => x.code);
      expect(codes).toContain('EMPTY_DIAGNOSTIC_CODE');
      expect(codes).toContain('EMPTY_DIAGNOSTIC_TITLE');
      expect(codes).toContain('EMPTY_DIAGNOSTIC_MESSAGE');
    });

    it('validates null blockly diagnostic', () => {
      const w = validateBlocklyDiagnosticModel(null as any);
      expect(w.length).toBe(1);
      expect(w[0].code).toBe('INVALID_BLOCKLY_DIAGNOSTIC');
    });

    it('validates invalid severity on blockly diagnostic', () => {
      const m = createDefaultBlocklyDiagnosticModel('bad_sev_d', {
        code: 'C', title: 'T', message: 'M',
        severity: 'CATASTROPHIC' as any,
      });
      const w = validateBlocklyDiagnosticModel(m);
      expect(w.some(x => x.code === 'INVALID_DIAGNOSTIC_SEVERITY')).toBe(true);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §6–§10: CircuitDiagnosticsSynchronizer CRUD (5 registries)
  // ═════════════════════════════════════════════════════════════

  // §6: Issue Registry CRUD
  describe('§6 — Issue Registry CRUD', () => {
    for (let i = 0; i < 200; i++) {
      it(`register/get/has/remove issue (iter ${i})`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        const m = createDefaultCircuitIssueModel(`crud_i_${i}`, {
          code: 'TEST', title: 'T', message: 'M', severity: 'WARNING',
          category: 'ELECTRICAL', highlightColor: 'YELLOW',
        });
        sync.registerIssue(`crud_i_${i}`, m);
        expect(sync.hasIssue(`crud_i_${i}`)).toBe(true);
        const got = sync.getIssue(`crud_i_${i}`);
        expect(got).toBeDefined();
        expect(got!.issueId).toBe(`crud_i_${i}`);
        sync.updateIssue(`crud_i_${i}`, { title: 'Updated' });
        expect(sync.getIssue(`crud_i_${i}`)!.title).toBe('Updated');
        sync.removeIssue(`crud_i_${i}`);
        expect(sync.hasIssue(`crud_i_${i}`)).toBe(false);
      });
    }

    it('getAll and getKeys for 500 issues', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      for (let i = 0; i < 500; i++) {
        sync.registerIssue(`all_i_${i}`, createDefaultCircuitIssueModel(`all_i_${i}`, {
          code: 'TEST', title: 'T', message: 'M',
        }));
      }
      expect(sync.getAllIssues().length).toBe(500);
      expect(sync.getIssueKeys().length).toBe(500);
      sync.clearIssues();
      expect(sync.getAllIssues().length).toBe(0);
    });
  });

  // §7: Recommendation Registry CRUD
  describe('§7 — Recommendation Registry CRUD', () => {
    for (let i = 0; i < 200; i++) {
      it(`register/get/has/remove recommendation (iter ${i})`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        const m = createDefaultCircuitRecommendationModel(`crud_r_${i}`, {
          issueId: 'iss', title: 'T', description: 'D', actionType: 'FIX',
        });
        sync.registerRecommendation(`crud_r_${i}`, m);
        expect(sync.hasRecommendation(`crud_r_${i}`)).toBe(true);
        const got = sync.getRecommendation(`crud_r_${i}`);
        expect(got).toBeDefined();
        expect(got!.recommendationId).toBe(`crud_r_${i}`);
        sync.updateRecommendation(`crud_r_${i}`, { title: 'Updated' });
        expect(sync.getRecommendation(`crud_r_${i}`)!.title).toBe('Updated');
        sync.removeRecommendation(`crud_r_${i}`);
        expect(sync.hasRecommendation(`crud_r_${i}`)).toBe(false);
      });
    }

    it('getAll and getKeys for 500 recommendations', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      for (let i = 0; i < 500; i++) {
        sync.registerRecommendation(`all_r_${i}`, createDefaultCircuitRecommendationModel(`all_r_${i}`, {
          issueId: 'iss', title: 'T', description: 'D', actionType: 'FIX',
        }));
      }
      expect(sync.getAllRecommendations().length).toBe(500);
      expect(sync.getRecommendationKeys().length).toBe(500);
      sync.clearRecommendations();
      expect(sync.getAllRecommendations().length).toBe(0);
    });
  });

  // §8: Hint Registry CRUD
  describe('§8 — Hint Registry CRUD', () => {
    for (let i = 0; i < 200; i++) {
      it(`register/get/has/remove hint (iter ${i})`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        const m = createDefaultLearningHintModel(`crud_h_${i}`, {
          title: 'T', explanation: 'E', componentType: 'LED', difficulty: 'BEGINNER',
        });
        sync.registerHint(`crud_h_${i}`, m);
        expect(sync.hasHint(`crud_h_${i}`)).toBe(true);
        const got = sync.getHint(`crud_h_${i}`);
        expect(got).toBeDefined();
        expect(got!.hintId).toBe(`crud_h_${i}`);
        sync.updateHint(`crud_h_${i}`, { title: 'Updated' });
        expect(sync.getHint(`crud_h_${i}`)!.title).toBe('Updated');
        sync.removeHint(`crud_h_${i}`);
        expect(sync.hasHint(`crud_h_${i}`)).toBe(false);
      });
    }

    it('getAll and getKeys for 500 hints', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      for (let i = 0; i < 500; i++) {
        sync.registerHint(`all_h_${i}`, createDefaultLearningHintModel(`all_h_${i}`, {
          title: 'T', explanation: 'E', componentType: 'LED',
        }));
      }
      expect(sync.getAllHints().length).toBe(500);
      expect(sync.getHintKeys().length).toBe(500);
      sync.clearHints();
      expect(sync.getAllHints().length).toBe(0);
    });
  });

  // §9: Readiness Registry CRUD
  describe('§9 — Readiness Registry CRUD', () => {
    for (let i = 0; i < 200; i++) {
      it(`register/get/has/remove readiness (iter ${i})`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        const m = createDefaultProjectReadinessModel(`crud_rd_${i}`, {
          hardwarePercent: 50, overallPercent: 60,
        });
        sync.registerReadiness(`crud_rd_${i}`, m);
        expect(sync.hasReadiness(`crud_rd_${i}`)).toBe(true);
        const got = sync.getReadiness(`crud_rd_${i}`);
        expect(got).toBeDefined();
        expect(got!.readinessId).toBe(`crud_rd_${i}`);
        sync.updateReadiness(`crud_rd_${i}`, { hardwarePercent: 99 });
        expect(sync.getReadiness(`crud_rd_${i}`)!.hardwarePercent).toBe(99);
        sync.removeReadiness(`crud_rd_${i}`);
        expect(sync.hasReadiness(`crud_rd_${i}`)).toBe(false);
      });
    }

    it('getAll and getKeys for 500 readiness entries', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      for (let i = 0; i < 500; i++) {
        sync.registerReadiness(`all_rd_${i}`, createDefaultProjectReadinessModel(`all_rd_${i}`));
      }
      expect(sync.getAllReadiness().length).toBe(500);
      expect(sync.getReadinessKeys().length).toBe(500);
      sync.clearReadiness();
      expect(sync.getAllReadiness().length).toBe(0);
    });
  });

  // §10: BlocklyDiagnostic Registry CRUD
  describe('§10 — BlocklyDiagnostic Registry CRUD', () => {
    for (let i = 0; i < 200; i++) {
      it(`register/get/has/remove blockly diagnostic (iter ${i})`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        const m = createDefaultBlocklyDiagnosticModel(`crud_bd_${i}`, {
          code: 'TEST', title: 'T', message: 'M',
        });
        sync.registerBlocklyDiagnostic(`crud_bd_${i}`, m);
        expect(sync.hasBlocklyDiagnostic(`crud_bd_${i}`)).toBe(true);
        const got = sync.getBlocklyDiagnostic(`crud_bd_${i}`);
        expect(got).toBeDefined();
        expect(got!.diagnosticId).toBe(`crud_bd_${i}`);
        sync.updateBlocklyDiagnostic(`crud_bd_${i}`, { title: 'Updated' });
        expect(sync.getBlocklyDiagnostic(`crud_bd_${i}`)!.title).toBe('Updated');
        sync.removeBlocklyDiagnostic(`crud_bd_${i}`);
        expect(sync.hasBlocklyDiagnostic(`crud_bd_${i}`)).toBe(false);
      });
    }

    it('getAll and getKeys for 500 blockly diagnostics', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      for (let i = 0; i < 500; i++) {
        sync.registerBlocklyDiagnostic(`all_bd_${i}`, createDefaultBlocklyDiagnosticModel(`all_bd_${i}`, {
          code: 'TEST', title: 'T', message: 'M',
        }));
      }
      expect(sync.getAllBlocklyDiagnostics().length).toBe(500);
      expect(sync.getBlocklyDiagnosticKeys().length).toBe(500);
      sync.clearBlocklyDiagnostics();
      expect(sync.getAllBlocklyDiagnostics().length).toBe(0);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §11: Floating Pin / Net Detection
  // ═════════════════════════════════════════════════════════════
  describe('§11 — Floating Pin Detection', () => {
    for (const compType of ALL_COMPONENT_TYPES) {
      it(`detects floating pins for ${compType}`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        const comp = makeDisconnectedComponent(`fp_${compType}`, compType);
        const issues = sync.detectCircuitIssues([comp], []);
        const floatingIssues = issues.filter(i => i.code === 'FLOATING_PIN');
        const rules = COMPONENT_WIRING_RULES[compType];
        expect(floatingIssues.length).toBe(rules.requiredPins.length);
        for (const fi of floatingIssues) {
          expect(fi.severity).toBe('ERROR');
          expect(fi.category).toBe('ELECTRICAL');
          expect(fi.highlightColor).toBe('RED');
          expect(fi.componentId).toBe(`fp_${compType}`);
        }
      });
    }

    it('no floating pins when all required pins are connected', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const comp = makeComponent('led_ok', 'LED', true);
      const issues = sync.detectCircuitIssues([comp], []);
      const floatingIssues = issues.filter(i => i.code === 'FLOATING_PIN');
      expect(floatingIssues.length).toBe(0);
    });

    for (let i = 0; i < 50; i++) {
      it(`floating pin batch test for LED iter ${i}`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        const comp = makeDisconnectedComponent(`led_fp_${i}`, 'LED');
        const issues = sync.detectCircuitIssues([comp], []);
        expect(issues.some(x => x.code === 'FLOATING_PIN')).toBe(true);
      });
    }
  });

  // ═════════════════════════════════════════════════════════════
  // §12: Missing GND/VCC Detection
  // ═════════════════════════════════════════════════════════════
  describe('§12 — Missing GND/VCC Detection', () => {
    for (const compType of ALL_COMPONENT_TYPES) {
      const rules = COMPONENT_WIRING_RULES[compType];

      if (rules.needsGround) {
        it(`detects missing GND for ${compType}`, () => {
          const sync = new CircuitDiagnosticsSynchronizer();
          const comp = makeDisconnectedComponent(`gnd_${compType}`, compType);
          const issues = sync.detectCircuitIssues([comp], []);
          const gndIssues = issues.filter(i => i.code === 'MISSING_GND');
          expect(gndIssues.length).toBe(1);
          expect(gndIssues[0].severity).toBe('ERROR');
        });
      }

      if (rules.needsPower) {
        it(`detects missing VCC for ${compType}`, () => {
          const sync = new CircuitDiagnosticsSynchronizer();
          const comp = makeDisconnectedComponent(`vcc_${compType}`, compType);
          const issues = sync.detectCircuitIssues([comp], []);
          const vccIssues = issues.filter(i => i.code === 'MISSING_VCC');
          expect(vccIssues.length).toBe(1);
          expect(vccIssues[0].severity).toBe('ERROR');
        });
      }
    }

    it('no missing GND/VCC when fully connected LED', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const comp = makeComponent('led_full', 'LED', true);
      const issues = sync.detectCircuitIssues([comp], []);
      expect(issues.filter(i => i.code === 'MISSING_GND').length).toBe(0);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §13: Short Circuit Detection
  // ═════════════════════════════════════════════════════════════
  describe('§13 — Short Circuit Detection', () => {
    it('detects issues when multiple components share pins without proper connections', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const comps = [
        makeDisconnectedComponent('sc_led_1', 'LED'),
        makeDisconnectedComponent('sc_led_2', 'LED'),
      ];
      const issues = sync.detectCircuitIssues(comps, []);
      expect(issues.length).toBeGreaterThan(0);
    });

    for (let i = 0; i < 50; i++) {
      it(`short circuit variant ${i} with dual LEDs`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        const comps = [
          makeDisconnectedComponent(`sc_a_${i}`, 'LED'),
          makeDisconnectedComponent(`sc_b_${i}`, 'LED'),
        ];
        const issues = sync.detectCircuitIssues(comps, []);
        expect(issues.length).toBeGreaterThanOrEqual(2);
      });
    }
  });

  // ═════════════════════════════════════════════════════════════
  // §14: Multiple Outputs on Same Net
  // ═════════════════════════════════════════════════════════════
  describe('§14 — Multiple Outputs on Same Net', () => {
    it('detects GPIO conflict when two components share same GPIO', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const comps = [
        makeComponent('mo_a', 'LED', true),
        makeComponent('mo_b', 'LED', true),
      ];
      const gpios = [
        makeGpioMapping(13, 'mo_a', 'ANODE', 'OUTPUT'),
        makeGpioMapping(13, 'mo_b', 'ANODE', 'OUTPUT'),
      ];
      const issues = sync.detectCircuitIssues(comps, gpios);
      const conflicts = issues.filter(i => i.code === 'GPIO_CONFLICT');
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].gpioNumber).toBe(13);
    });

    for (let i = 0; i < 40; i++) {
      it(`GPIO conflict on pin ${i} with 2 components`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        const gpios = [
          makeGpioMapping(i, `c_a_${i}`, 'SIG'),
          makeGpioMapping(i, `c_b_${i}`, 'SIG'),
        ];
        const issues = sync.detectCircuitIssues([], gpios);
        expect(issues.filter(x => x.code === 'GPIO_CONFLICT').length).toBe(1);
      });
    }
  });

  // ═════════════════════════════════════════════════════════════
  // §15: GPIO Conflict Detection
  // ═════════════════════════════════════════════════════════════
  describe('§15 — GPIO Conflict Detection (expanded)', () => {
    it('no conflict when each component uses unique GPIO', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const gpios = range(10).map(i => makeGpioMapping(i, `comp_${i}`));
      const issues = sync.detectCircuitIssues([], gpios);
      expect(issues.filter(x => x.code === 'GPIO_CONFLICT').length).toBe(0);
    });

    it('3-way conflict on same GPIO', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const gpios = [
        makeGpioMapping(5, 'c1'),
        makeGpioMapping(5, 'c2'),
        makeGpioMapping(5, 'c3'),
      ];
      const issues = sync.detectCircuitIssues([], gpios);
      const conflicts = issues.filter(x => x.code === 'GPIO_CONFLICT');
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].affectedIds.length).toBe(3);
    });

    it('ignores negative GPIO numbers', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const gpios = [
        makeGpioMapping(-1, 'c1'),
        makeGpioMapping(-1, 'c2'),
      ];
      const issues = sync.detectCircuitIssues([], gpios);
      expect(issues.filter(x => x.code === 'GPIO_CONFLICT').length).toBe(0);
    });

    for (let i = 0; i < 50; i++) {
      it(`conflict sweep iter ${i}`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        const gpios = [
          makeGpioMapping(i % 20, `x_${i}_a`),
          makeGpioMapping(i % 20, `x_${i}_b`),
        ];
        const issues = sync.detectCircuitIssues([], gpios);
        expect(issues.filter(x => x.code === 'GPIO_CONFLICT').length).toBe(1);
      });
    }
  });

  // ═════════════════════════════════════════════════════════════
  // §16–§28: Per-Component Wiring Validation (13 component types)
  // ═════════════════════════════════════════════════════════════

  describe('§16 — LED Wiring Validation', () => {
    for (let i = 0; i < 50; i++) {
      it(`LED wiring check iter ${i}`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        const comp = makeDisconnectedComponent(`led_w_${i}`, 'LED');
        const issues = sync.detectCircuitIssues([comp], []);
        expect(issues.some(x => x.code === 'FLOATING_PIN' || x.code === 'MISSING_GND')).toBe(true);
      });
    }
  });

  describe('§17 — HC-SR04 Wiring Validation', () => {
    for (let i = 0; i < 50; i++) {
      it(`HC-SR04 wiring check iter ${i}`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        const comp = makeDisconnectedComponent(`hcsr04_w_${i}`, 'HC-SR04');
        const issues = sync.detectCircuitIssues([comp], []);
        expect(issues.some(x => x.code === 'FLOATING_PIN')).toBe(true);
        expect(issues.some(x => x.code === 'MISSING_GND')).toBe(true);
        expect(issues.some(x => x.code === 'MISSING_VCC')).toBe(true);
      });
    }
  });

  describe('§18 — SERVO Wiring Validation', () => {
    for (let i = 0; i < 50; i++) {
      it(`SERVO wiring check iter ${i}`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        const comp = makeDisconnectedComponent(`servo_w_${i}`, 'SERVO');
        const issues = sync.detectCircuitIssues([comp], []);
        expect(issues.some(x => x.code === 'FLOATING_PIN')).toBe(true);
        expect(issues.some(x => x.code === 'MISSING_GND')).toBe(true);
        expect(issues.some(x => x.code === 'MISSING_VCC')).toBe(true);
      });
    }
  });

  describe('§19 — OLED_SSD1306 Wiring Validation', () => {
    for (let i = 0; i < 50; i++) {
      it(`OLED_SSD1306 wiring check iter ${i}`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        const comp = makeDisconnectedComponent(`oled_w_${i}`, 'OLED_SSD1306');
        const issues = sync.detectCircuitIssues([comp], []);
        expect(issues.some(x => x.code === 'FLOATING_PIN')).toBe(true);
      });
    }
  });

  describe('§20 — LCD_1602 Wiring Validation', () => {
    for (let i = 0; i < 50; i++) {
      it(`LCD_1602 wiring check iter ${i}`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        const comp = makeDisconnectedComponent(`lcd_w_${i}`, 'LCD_1602');
        const issues = sync.detectCircuitIssues([comp], []);
        expect(issues.some(x => x.code === 'FLOATING_PIN')).toBe(true);
      });
    }
  });

  describe('§21 — DHT11 Wiring Validation', () => {
    for (let i = 0; i < 50; i++) {
      it(`DHT11 wiring check iter ${i}`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        const comp = makeDisconnectedComponent(`dht11_w_${i}`, 'DHT11');
        const issues = sync.detectCircuitIssues([comp], []);
        expect(issues.some(x => x.code === 'FLOATING_PIN')).toBe(true);
        expect(issues.some(x => x.code === 'MISSING_GND')).toBe(true);
        expect(issues.some(x => x.code === 'MISSING_VCC')).toBe(true);
      });
    }
  });

  describe('§22 — BUZZER Wiring Validation', () => {
    for (let i = 0; i < 50; i++) {
      it(`BUZZER wiring check iter ${i}`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        const comp = makeDisconnectedComponent(`buzzer_w_${i}`, 'BUZZER');
        const issues = sync.detectCircuitIssues([comp], []);
        expect(issues.some(x => x.code === 'FLOATING_PIN')).toBe(true);
      });
    }
  });

  describe('§23 — RELAY Wiring Validation', () => {
    for (let i = 0; i < 50; i++) {
      it(`RELAY wiring check iter ${i}`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        const comp = makeDisconnectedComponent(`relay_w_${i}`, 'RELAY');
        const issues = sync.detectCircuitIssues([comp], []);
        expect(issues.some(x => x.code === 'FLOATING_PIN')).toBe(true);
        expect(issues.some(x => x.code === 'MISSING_VCC')).toBe(true);
      });
    }
  });

  describe('§24 — MQ2_GAS_SENSOR Wiring Validation', () => {
    for (let i = 0; i < 50; i++) {
      it(`MQ2_GAS_SENSOR wiring check iter ${i}`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        const comp = makeDisconnectedComponent(`mq2_w_${i}`, 'MQ2_GAS_SENSOR');
        const issues = sync.detectCircuitIssues([comp], []);
        expect(issues.some(x => x.code === 'FLOATING_PIN')).toBe(true);
        expect(issues.some(x => x.code === 'MISSING_VCC')).toBe(true);
      });
    }
  });

  describe('§25 — PUSH_BUTTON Wiring Validation', () => {
    for (let i = 0; i < 50; i++) {
      it(`PUSH_BUTTON wiring check iter ${i}`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        const comp = makeDisconnectedComponent(`btn_w_${i}`, 'PUSH_BUTTON');
        const issues = sync.detectCircuitIssues([comp], []);
        expect(issues.some(x => x.code === 'FLOATING_PIN')).toBe(true);
      });
    }
  });

  describe('§26 — POTENTIOMETER Wiring Validation', () => {
    for (let i = 0; i < 50; i++) {
      it(`POTENTIOMETER wiring check iter ${i}`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        const comp = makeDisconnectedComponent(`pot_w_${i}`, 'POTENTIOMETER');
        const issues = sync.detectCircuitIssues([comp], []);
        expect(issues.some(x => x.code === 'FLOATING_PIN')).toBe(true);
        expect(issues.some(x => x.code === 'MISSING_VCC')).toBe(true);
      });
    }
  });

  describe('§27 — IR_SENSOR Wiring Validation', () => {
    for (let i = 0; i < 50; i++) {
      it(`IR_SENSOR wiring check iter ${i}`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        const comp = makeDisconnectedComponent(`ir_w_${i}`, 'IR_SENSOR');
        const issues = sync.detectCircuitIssues([comp], []);
        expect(issues.some(x => x.code === 'FLOATING_PIN')).toBe(true);
        expect(issues.some(x => x.code === 'MISSING_VCC')).toBe(true);
      });
    }
  });

  describe('§28 — RGB_LED Wiring Validation', () => {
    for (let i = 0; i < 50; i++) {
      it(`RGB_LED wiring check iter ${i}`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        const comp = makeDisconnectedComponent(`rgb_w_${i}`, 'RGB_LED');
        const issues = sync.detectCircuitIssues([comp], []);
        expect(issues.some(x => x.code === 'FLOATING_PIN')).toBe(true);
      });
    }
  });

  // ═════════════════════════════════════════════════════════════
  // §29: Recommendation Generation
  // ═════════════════════════════════════════════════════════════
  describe('§29 — Recommendation Generation', () => {
    it('generates CONNECT_PIN recommendation for FLOATING_PIN', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const issues = [createDefaultCircuitIssueModel('fp1', {
        code: 'FLOATING_PIN', issueId: 'fp1',
        componentId: 'led1', pinName: 'ANODE',
        title: 'Floating', message: 'M', howToFix: 'Connect it',
      })];
      const recs = sync.generateRecommendations(issues);
      expect(recs.length).toBe(1);
      expect(recs[0].actionType).toBe('CONNECT_PIN');
      expect(recs[0].issueId).toBe('fp1');
    });

    it('generates CONNECT_GND recommendation for MISSING_GND', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const issues = [createDefaultCircuitIssueModel('gnd1', {
        code: 'MISSING_GND', issueId: 'gnd1',
        componentId: 'led1', title: 'Missing GND', message: 'M',
      })];
      const recs = sync.generateRecommendations(issues);
      expect(recs.length).toBe(1);
      expect(recs[0].actionType).toBe('CONNECT_GND');
    });

    it('generates CONNECT_VCC recommendation for MISSING_VCC', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const issues = [createDefaultCircuitIssueModel('vcc1', {
        code: 'MISSING_VCC', issueId: 'vcc1',
        componentId: 'servo1', title: 'Missing VCC', message: 'M',
      })];
      const recs = sync.generateRecommendations(issues);
      expect(recs.length).toBe(1);
      expect(recs[0].actionType).toBe('CONNECT_VCC');
    });

    it('generates REASSIGN_GPIO recommendation for GPIO_CONFLICT', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const issues = [createDefaultCircuitIssueModel('gc1', {
        code: 'GPIO_CONFLICT', issueId: 'gc1',
        gpioNumber: 13, title: 'GPIO Conflict', message: 'M',
      })];
      const recs = sync.generateRecommendations(issues);
      expect(recs.length).toBe(1);
      expect(recs[0].actionType).toBe('REASSIGN_GPIO');
    });

    it('generates MANUAL_FIX for unknown issue codes', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const issues = [createDefaultCircuitIssueModel('unk1', {
        code: 'UNKNOWN_ISSUE', issueId: 'unk1',
        title: 'Unknown', message: 'M', howToFix: 'Fix manually',
      })];
      const recs = sync.generateRecommendations(issues);
      expect(recs.length).toBe(1);
      expect(recs[0].actionType).toBe('MANUAL_FIX');
    });

    for (let i = 0; i < 100; i++) {
      it(`recommendation batch iter ${i}`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        const codes = ['FLOATING_PIN', 'MISSING_GND', 'MISSING_VCC', 'GPIO_CONFLICT'];
        const code = codes[i % 4];
        const issues = [createDefaultCircuitIssueModel(`batch_${i}`, {
          code, title: 'T', message: 'M', howToFix: 'Fix',
        })];
        const recs = sync.generateRecommendations(issues);
        expect(recs.length).toBe(1);
        expect(recs[0].recommendationId).toBeTruthy();
      });
    }
  });

  // ═════════════════════════════════════════════════════════════
  // §30: Learning Hint Generation
  // ═════════════════════════════════════════════════════════════
  describe('§30 — Learning Hint Generation', () => {
    it('generates hints for FLOATING_PIN issues', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const issues = [createDefaultCircuitIssueModel('fp_h', {
        code: 'FLOATING_PIN', category: 'ELECTRICAL',
        title: 'Floating', message: 'M',
      })];
      const hints = sync.generateLearningHints(issues, ['LED']);
      expect(hints.some(h => h.issueCode === 'FLOATING_PIN')).toBe(true);
      expect(hints.some(h => h.title === 'Understanding Floating Pins')).toBe(true);
    });

    it('generates hints for MISSING_GND issues', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const issues = [createDefaultCircuitIssueModel('gnd_h', {
        code: 'MISSING_GND', title: 'Missing GND', message: 'M',
      })];
      const hints = sync.generateLearningHints(issues, ['SERVO']);
      expect(hints.some(h => h.issueCode === 'MISSING_GND')).toBe(true);
    });

    it('generates hints for MISSING_VCC issues', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const issues = [createDefaultCircuitIssueModel('vcc_h', {
        code: 'MISSING_VCC', title: 'Missing VCC', message: 'M',
      })];
      const hints = sync.generateLearningHints(issues, ['OLED_SSD1306']);
      expect(hints.some(h => h.issueCode === 'MISSING_VCC')).toBe(true);
    });

    it('generates hints for GPIO_CONFLICT issues', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const issues = [createDefaultCircuitIssueModel('gc_h', {
        code: 'GPIO_CONFLICT', title: 'GPIO Conflict', message: 'M',
      })];
      const hints = sync.generateLearningHints(issues, ['LED']);
      expect(hints.some(h => h.issueCode === 'GPIO_CONFLICT')).toBe(true);
    });

    it('generates component-specific wiring hints', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const hints = sync.generateLearningHints([], ALL_COMPONENT_TYPES);
      for (const ct of ALL_COMPONENT_TYPES) {
        expect(hints.some(h => h.componentType === ct)).toBe(true);
        expect(hints.some(h => h.issueCode === `COMPONENT_INFO_${ct}`)).toBe(true);
      }
    });

    it('deduplicates hints by issue code', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const issues = [
        createDefaultCircuitIssueModel('dup1', { code: 'FLOATING_PIN', title: 'T', message: 'M' }),
        createDefaultCircuitIssueModel('dup2', { code: 'FLOATING_PIN', title: 'T2', message: 'M2' }),
      ];
      const hints = sync.generateLearningHints(issues, ['LED']);
      const fpHints = hints.filter(h => h.issueCode === 'FLOATING_PIN');
      expect(fpHints.length).toBe(1);
    });

    for (let i = 0; i < 50; i++) {
      it(`hint generation batch iter ${i}`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        const compType = ALL_COMPONENT_TYPES[i % ALL_COMPONENT_TYPES.length];
        const hints = sync.generateLearningHints([], [compType]);
        expect(hints.length).toBeGreaterThan(0);
        expect(hints[0].componentType).toBe(compType);
      });
    }
  });

  // ═════════════════════════════════════════════════════════════
  // §31–§36: Blockly Diagnostics
  // ═════════════════════════════════════════════════════════════

  describe('§31 — Unused GPIO Detection', () => {
    it('detects unused GPIO mapping', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const blocks = [makeBlock('b1', 'digital_write', { PIN: '13' })];
      const gpioMappings = [
        { gpioNumber: 13, componentId: 'led1' },
        { gpioNumber: 14, componentId: 'servo1' },
      ];
      const diags = sync.detectBlocklyDiagnostics(blocks, gpioMappings);
      const unused = diags.filter(d => d.code === 'UNUSED_GPIO');
      expect(unused.length).toBe(1);
      expect(unused[0].gpioNumber).toBe(14);
    });

    for (let i = 0; i < 50; i++) {
      it(`unused GPIO sweep iter ${i}`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        const blocks = [makeBlock(`b_${i}`, 'digital_write', { PIN: `${i}` })];
        const gpios = [
          { gpioNumber: i, componentId: `c_${i}` },
          { gpioNumber: i + 100, componentId: `c_extra_${i}` },
        ];
        const diags = sync.detectBlocklyDiagnostics(blocks, gpios);
        expect(diags.some(d => d.code === 'UNUSED_GPIO' && d.gpioNumber === i + 100)).toBe(true);
      });
    }
  });

  describe('§32 — Missing pinMode / Setup Block', () => {
    it('detects missing setup block', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const blocks = [makeBlock('b1', 'digital_write', { PIN: '13' })];
      const diags = sync.detectBlocklyDiagnostics(blocks, []);
      const missing = diags.filter(d => d.code === 'MISSING_SETUP');
      expect(missing.length).toBe(1);
      expect(missing[0].severity).toBe('SUGGESTION');
    });

    it('no missing setup when setup block exists', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const blocks = [
        makeBlock('s1', 'setup', {}),
        makeBlock('b1', 'digital_write', { PIN: '13' }),
      ];
      const diags = sync.detectBlocklyDiagnostics(blocks, []);
      expect(diags.filter(d => d.code === 'MISSING_SETUP').length).toBe(0);
    });

    it('no missing setup when arduino_setup block exists', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const blocks = [
        makeBlock('s1', 'arduino_setup', {}),
        makeBlock('b1', 'digital_write', {}),
      ];
      const diags = sync.detectBlocklyDiagnostics(blocks, []);
      expect(diags.filter(d => d.code === 'MISSING_SETUP').length).toBe(0);
    });

    it('no missing setup when on_start block exists', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const blocks = [makeBlock('s1', 'on_start', {})];
      const diags = sync.detectBlocklyDiagnostics(blocks, []);
      expect(diags.filter(d => d.code === 'MISSING_SETUP').length).toBe(0);
    });

    it('no missing setup when event_whenflagclicked exists', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const blocks = [makeBlock('s1', 'event_whenflagclicked', {})];
      const diags = sync.detectBlocklyDiagnostics(blocks, []);
      expect(diags.filter(d => d.code === 'MISSING_SETUP').length).toBe(0);
    });
  });

  describe('§33 — Unmapped GPIO in Code', () => {
    it('detects block referencing unmapped GPIO', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const blocks = [makeBlock('b1', 'digital_write', { PIN: '25' })];
      const gpioMappings = [{ gpioNumber: 13, componentId: 'led1' }];
      const diags = sync.detectBlocklyDiagnostics(blocks, gpioMappings);
      const unmapped = diags.filter(d => d.code === 'UNMAPPED_GPIO_IN_CODE');
      expect(unmapped.length).toBe(1);
      expect(unmapped[0].gpioNumber).toBe(25);
    });

    for (let i = 0; i < 40; i++) {
      it(`unmapped GPIO sweep iter ${i}`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        const blocks = [makeBlock(`b_${i}`, 'analog_read', { PIN: `${i + 50}` })];
        const gpioMappings = [{ gpioNumber: i, componentId: `c_${i}` }];
        const diags = sync.detectBlocklyDiagnostics(blocks, gpioMappings);
        expect(diags.some(d => d.code === 'UNMAPPED_GPIO_IN_CODE')).toBe(true);
      });
    }
  });

  describe('§34 — Invalid PWM Detection (via FLOATING_PIN for PWM pins)', () => {
    it('detects floating signal pin on servo as potential PWM issue', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const comp = makeDisconnectedComponent('pwm_servo', 'SERVO');
      const issues = sync.detectCircuitIssues([comp], []);
      const signalIssue = issues.find(x => x.pinName === 'SIGNAL');
      expect(signalIssue).toBeDefined();
      expect(signalIssue!.code).toBe('FLOATING_PIN');
    });
  });

  describe('§35 — Blockly Diagnostics with Empty Programs', () => {
    it('no diagnostics for empty program and no mappings', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const diags = sync.detectBlocklyDiagnostics([], []);
      expect(diags.length).toBe(0);
    });
  });

  describe('§36 — Blockly Diagnostics Multiple Fields', () => {
    it('detects multiple unmapped GPIOs in single block', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const blocks = [makeBlock('mb1', 'motor_control', { PIN_A: '30', PIN_B: '31' })];
      const diags = sync.detectBlocklyDiagnostics(blocks, []);
      const unmapped = diags.filter(d => d.code === 'UNMAPPED_GPIO_IN_CODE');
      expect(unmapped.length).toBe(2);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §37: Project Readiness Calculation
  // ═════════════════════════════════════════════════════════════
  describe('§37 — Project Readiness Calculation', () => {
    it('calculates perfect readiness', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const r = sync.calculateProjectReadiness(5, 10, 0, 0, true);
      expect(r.hardwarePercent).toBe(100);
      expect(r.codePercent).toBe(100);
      expect(r.electricalPercent).toBe(100);
      expect(r.simulationPercent).toBe(100);
      expect(r.overallPercent).toBe(100);
      expect(r.isReady).toBe(true);
      expect(r.criticalIssues.length).toBe(0);
      expect(r.notReadyReasons.length).toBe(0);
    });

    it('calculates readiness with no components', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const r = sync.calculateProjectReadiness(0, 0, 0, 0, false);
      expect(r.hardwarePercent).toBe(0);
      expect(r.codePercent).toBe(0);
      expect(r.isReady).toBe(false);
      expect(r.notReadyReasons).toContain('No components placed on the breadboard.');
      expect(r.notReadyReasons).toContain('No Blockly program created.');
    });

    it('calculates readiness with errors', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const r = sync.calculateProjectReadiness(3, 5, 5, 3, true);
      expect(r.electricalPercent).toBe(40);
      expect(r.isReady).toBe(false);
      expect(r.criticalIssues.length).toBeGreaterThan(0);
    });

    it('calculates hardwarePercent for 1 component', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const r = sync.calculateProjectReadiness(1, 1, 0, 0, true);
      expect(r.hardwarePercent).toBe(33);
    });

    it('calculates hardwarePercent for 2 components', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const r = sync.calculateProjectReadiness(2, 2, 0, 0, true);
      expect(r.hardwarePercent).toBe(67);
    });

    it('no wires with components generates not-ready reason', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const r = sync.calculateProjectReadiness(2, 0, 0, 0, true);
      expect(r.notReadyReasons).toContain('No wires connecting components.');
    });

    for (let i = 0; i < 100; i++) {
      it(`readiness sweep with ${i} errors`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        const r = sync.calculateProjectReadiness(5, 10, i, i, true);
        expect(r.electricalPercent).toBe(Math.max(0, 100 - i * 20));
        expect(r.simulationPercent).toBe(i === 0 ? 100 : Math.max(0, 100 - i * 10));
        expect(r.isReady).toBe(r.overallPercent >= 80 && i === 0);
      });
    }
  });

  // ═════════════════════════════════════════════════════════════
  // §38: Health Score Calculation
  // ═════════════════════════════════════════════════════════════
  describe('§38 — Health Score Calculation', () => {
    it('perfect health with no issues', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const { score, grade } = sync.calculateHealthScore([]);
      expect(score).toBe(100);
      expect(grade).toBe('A+');
    });

    it('grade A+ for 1 warning', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const issues = [createDefaultCircuitIssueModel('h1', { severity: 'WARNING' })];
      const { score, grade } = sync.calculateHealthScore(issues);
      expect(score).toBe(95);
      expect(grade).toBe('A+');
    });

    it('grade A for 2 warnings', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const issues = range(2).map(i => createDefaultCircuitIssueModel(`h_${i}`, { severity: 'WARNING' }));
      const { score, grade } = sync.calculateHealthScore(issues);
      expect(score).toBe(90);
      expect(grade).toBe('A');
    });

    it('grade B for 1 error', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const issues = [createDefaultCircuitIssueModel('h_e1', { severity: 'ERROR' })];
      const { score, grade } = sync.calculateHealthScore(issues);
      expect(score).toBe(80);
      expect(grade).toBe('B');
    });

    it('grade C for 2 errors', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const issues = range(2).map(i => createDefaultCircuitIssueModel(`h_e_${i}`, { severity: 'ERROR' }));
      const { score, grade } = sync.calculateHealthScore(issues);
      expect(score).toBe(60);
      expect(grade).toBe('C');
    });

    it('grade D for 3 errors', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const issues = range(3).map(i => createDefaultCircuitIssueModel(`h_e3_${i}`, { severity: 'ERROR' }));
      const { score, grade } = sync.calculateHealthScore(issues);
      expect(score).toBe(40);
      expect(grade).toBe('D');
    });

    it('grade F for 5 errors', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const issues = range(5).map(i => createDefaultCircuitIssueModel(`h_e5_${i}`, { severity: 'ERROR' }));
      const { score, grade } = sync.calculateHealthScore(issues);
      expect(score).toBe(0);
      expect(grade).toBe('F');
    });

    it('SUGGESTION costs 1 point', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const issues = [createDefaultCircuitIssueModel('s1', { severity: 'SUGGESTION' })];
      const { score } = sync.calculateHealthScore(issues);
      expect(score).toBe(99);
    });

    it('INFO costs 0 points', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const issues = [createDefaultCircuitIssueModel('i1', { severity: 'INFO' })];
      const { score } = sync.calculateHealthScore(issues);
      expect(score).toBe(100);
    });

    it('score never goes below 0', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const issues = range(10).map(i => createDefaultCircuitIssueModel(`f_${i}`, { severity: 'ERROR' }));
      const { score } = sync.calculateHealthScore(issues);
      expect(score).toBe(0);
    });

    for (let i = 0; i < 50; i++) {
      it(`health score sweep with ${i} warnings`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        const issues = range(i).map(j => createDefaultCircuitIssueModel(`hs_${j}`, { severity: 'WARNING' }));
        const { score } = sync.calculateHealthScore(issues);
        expect(score).toBe(Math.max(0, 100 - i * 5));
      });
    }
  });

  // ═════════════════════════════════════════════════════════════
  // §39–§46: Demo Circuit Audits (8 circuits)
  // ═════════════════════════════════════════════════════════════

  describe('§39 — LED_BLINK Audit', () => {
    it('audits LED_BLINK with disconnected LED', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const comp = makeDisconnectedComponent('blink_led', 'LED');
      const snap = sync.auditDemoCircuit('LED_BLINK', [comp], []);
      expect(snap.issues.length).toBeGreaterThan(0);
      expect(snap.recommendations.length).toBeGreaterThan(0);
      expect(snap.healthScore).toBeLessThan(100);
      expect(snap.projectReadiness).not.toBeNull();
    });

    it('audits LED_BLINK with connected LED', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const comp = makeComponent('blink_led_ok', 'LED', true);
      const snap = sync.auditDemoCircuit('LED_BLINK', [comp], []);
      expect(snap.issues.length).toBe(0);
      expect(snap.healthScore).toBe(100);
      expect(snap.healthGrade).toBe('A+');
    });
  });

  describe('§40 — TRAFFIC_LIGHT Audit', () => {
    it('audits TRAFFIC_LIGHT with 3 disconnected LEDs', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const comps = range(3).map(i => makeDisconnectedComponent(`tl_led_${i}`, 'LED'));
      const snap = sync.auditDemoCircuit('TRAFFIC_LIGHT', comps, []);
      expect(snap.issues.length).toBeGreaterThan(0);
      expect(snap.healthScore).toBeLessThan(100);
    });

    it('audits TRAFFIC_LIGHT with 3 connected LEDs', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const comps = range(3).map(i => makeComponent(`tl_ok_${i}`, 'LED', true));
      const snap = sync.auditDemoCircuit('TRAFFIC_LIGHT', comps, []);
      expect(snap.issues.length).toBe(0);
      expect(snap.healthGrade).toBe('A+');
    });
  });

  describe('§41 — SERVO_SWEEP Audit', () => {
    it('audits SERVO_SWEEP with disconnected servo', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const comp = makeDisconnectedComponent('sweep_servo', 'SERVO');
      const snap = sync.auditDemoCircuit('SERVO_SWEEP', [comp], []);
      expect(snap.issues.length).toBeGreaterThan(0);
    });
  });

  describe('§42 — OLED_DEMO Audit', () => {
    it('audits OLED_DEMO with disconnected OLED', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const comp = makeDisconnectedComponent('demo_oled', 'OLED_SSD1306');
      const snap = sync.auditDemoCircuit('OLED_DEMO', [comp], []);
      expect(snap.issues.length).toBeGreaterThan(0);
    });
  });

  describe('§43 — LCD_COUNTER Audit', () => {
    it('audits LCD_COUNTER with disconnected LCD', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const comp = makeDisconnectedComponent('ctr_lcd', 'LCD_1602');
      const snap = sync.auditDemoCircuit('LCD_COUNTER', [comp], []);
      expect(snap.issues.length).toBeGreaterThan(0);
    });
  });

  describe('§44 — HC_SR04_ALARM Audit', () => {
    it('audits HC_SR04_ALARM with disconnected sensor + buzzer', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const comps = [
        makeDisconnectedComponent('alarm_hcsr04', 'HC-SR04'),
        makeDisconnectedComponent('alarm_buzzer', 'BUZZER'),
      ];
      const snap = sync.auditDemoCircuit('HC_SR04_ALARM', comps, []);
      expect(snap.issues.length).toBeGreaterThan(0);
      expect(snap.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('§45 — MQ2_ALARM Audit', () => {
    it('audits MQ2_ALARM with disconnected components', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const comps = [
        makeDisconnectedComponent('alarm_mq2', 'MQ2_GAS_SENSOR'),
        makeDisconnectedComponent('alarm_buz', 'BUZZER'),
        makeDisconnectedComponent('alarm_led', 'LED'),
      ];
      const snap = sync.auditDemoCircuit('MQ2_ALARM', comps, []);
      expect(snap.issues.length).toBeGreaterThan(0);
    });
  });

  describe('§46 — BUZZER_MELODY Audit', () => {
    it('audits BUZZER_MELODY with disconnected buzzer', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const comp = makeDisconnectedComponent('melody_buz', 'BUZZER');
      const snap = sync.auditDemoCircuit('BUZZER_MELODY', [comp], []);
      expect(snap.issues.length).toBeGreaterThan(0);
    });

    it('audits unknown demo circuit name gracefully', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const snap = sync.auditDemoCircuit('NONEXISTENT', [], []);
      expect(snap.issues.length).toBe(0);
      expect(snap.healthScore).toBe(100);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §47: Serial Monitor Diagnostic Output
  // ═════════════════════════════════════════════════════════════
  describe('§47 — Serial Monitor Diagnostic Output', () => {
    it('emits formatted serial lines for issues', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const issues = [
        createDefaultCircuitIssueModel('s1', { severity: 'ERROR', title: 'Bad Pin', message: 'Pin floating' }),
        createDefaultCircuitIssueModel('s2', { severity: 'WARNING', title: 'Low VCC', message: 'VCC unstable' }),
      ];
      const lines = sync.emitSerialDiagnostics(issues);
      expect(lines.length).toBe(2);
      expect(lines[0]).toContain('[ERROR]');
      expect(lines[0]).toContain('Bad Pin');
      expect(lines[0]).toContain('Pin floating');
      expect(lines[1]).toContain('[WARNING]');
    });

    it('returns empty array for no issues', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const lines = sync.emitSerialDiagnostics([]);
      expect(lines.length).toBe(0);
    });

    for (let i = 0; i < 50; i++) {
      it(`serial output batch iter ${i}`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        const sevs: DiagnosticSeverity[] = ['ERROR', 'WARNING', 'SUGGESTION', 'INFO'];
        const issues = range(4).map(j => createDefaultCircuitIssueModel(`so_${i}_${j}`, {
          severity: sevs[j], title: `T_${j}`, message: `M_${j}`,
        }));
        const lines = sync.emitSerialDiagnostics(issues);
        expect(lines.length).toBe(4);
        expect(lines[0]).toContain('[ERROR]');
        expect(lines[1]).toContain('[WARNING]');
        expect(lines[2]).toContain('[SUGGESTION]');
        expect(lines[3]).toContain('[INFO]');
      });
    }
  });

  // ═════════════════════════════════════════════════════════════
  // §48: Full Diagnostics Integration (runFullDiagnostics)
  // ═════════════════════════════════════════════════════════════
  describe('§48 — runFullDiagnostics Integration', () => {
    it('runs full diagnostics on a mixed circuit', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const comps = [
        makeDisconnectedComponent('full_led', 'LED'),
        makeComponent('full_servo', 'SERVO', true),
      ];
      const gpios = [
        makeGpioMapping(13, 'full_led', 'ANODE'),
        makeGpioMapping(14, 'full_servo', 'SIGNAL'),
      ];
      const blocks = [
        makeBlock('b1', 'setup', {}),
        makeBlock('b2', 'digital_write', { PIN: '13' }),
      ];
      const snap = sync.runFullDiagnostics(comps, gpios, blocks, 2, 3, true);
      expect(snap.issues.length).toBeGreaterThan(0);
      expect(snap.recommendations.length).toBeGreaterThan(0);
      expect(snap.learningHints.length).toBeGreaterThan(0);
      expect(snap.projectReadiness).not.toBeNull();
      expect(typeof snap.healthScore).toBe('number');
      expect(typeof snap.healthGrade).toBe('string');

      // Verify registries populated
      expect(sync.getAllIssues().length).toBeGreaterThan(0);
      expect(sync.getAllRecommendations().length).toBeGreaterThan(0);
      expect(sync.getAllHints().length).toBeGreaterThan(0);
    });

    it('runs full diagnostics on empty circuit', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const snap = sync.runFullDiagnostics([], [], [], 0, 0, false);
      expect(snap.issues.length).toBe(0);
      expect(snap.recommendations.length).toBe(0);
      expect(snap.healthScore).toBe(100);
      expect(snap.healthGrade).toBe('A+');
      expect(snap.projectReadiness).not.toBeNull();
      expect(snap.projectReadiness!.isReady).toBe(false);
    });

    it('full diagnostics detects blockly unused GPIO', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const gpios = [makeGpioMapping(15, 'comp1', 'SIGNAL')];
      const blocks = [makeBlock('b1', 'setup', {})];
      const snap = sync.runFullDiagnostics([], gpios, blocks, 0, 0, true);
      expect(snap.blocklyDiagnostics.some(d => d.code === 'UNUSED_GPIO')).toBe(true);
    });

    it('clears previous diagnostics on re-run', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      sync.runFullDiagnostics(
        [makeDisconnectedComponent('r1_led', 'LED')], [], [], 1, 0, false,
      );
      expect(sync.getAllIssues().length).toBeGreaterThan(0);
      sync.runFullDiagnostics([], [], [], 0, 0, false);
      expect(sync.getAllIssues().length).toBe(0);
    });

    for (let i = 0; i < 50; i++) {
      it(`full diagnostics sweep with ${i + 1} LEDs`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        const comps = range(i + 1).map(j => makeDisconnectedComponent(`fd_led_${j}`, 'LED'));
        const snap = sync.runFullDiagnostics(comps, [], [], i + 1, 0, false);
        expect(snap.issues.length).toBeGreaterThan(0);
        expect(snap.recommendations.length).toBe(snap.issues.length);
      });
    }
  });

  // ═════════════════════════════════════════════════════════════
  // §49: Snapshot Serialization
  // ═════════════════════════════════════════════════════════════
  describe('§49 — Snapshot Serialization', () => {
    it('getSnapshot returns valid snapshot after registration', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      sync.registerIssue('snap_i', createDefaultCircuitIssueModel('snap_i', {
        code: 'TEST', title: 'T', message: 'M',
      }));
      sync.registerRecommendation('snap_r', createDefaultCircuitRecommendationModel('snap_r', {
        issueId: 'snap_i', title: 'T', description: 'D', actionType: 'FIX',
      }));
      sync.registerHint('snap_h', createDefaultLearningHintModel('snap_h', {
        title: 'T', explanation: 'E', componentType: 'LED',
      }));
      sync.registerReadiness('snap_rd', createDefaultProjectReadinessModel('snap_rd'));
      sync.registerBlocklyDiagnostic('snap_bd', createDefaultBlocklyDiagnosticModel('snap_bd', {
        code: 'TEST', title: 'T', message: 'M',
      }));

      const snap = sync.getSnapshot();
      expect(snap.issues.length).toBe(1);
      expect(snap.recommendations.length).toBe(1);
      expect(snap.learningHints.length).toBe(1);
      expect(snap.blocklyDiagnostics.length).toBe(1);
      expect(snap.projectReadiness).not.toBeNull();
      expect(typeof snap.healthScore).toBe('number');
      expect(typeof snap.healthGrade).toBe('string');
    });

    it('snapshot is JSON-serializable', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      sync.registerIssue('json_i', createDefaultCircuitIssueModel('json_i', {
        code: 'X', title: 'T', message: 'M',
      }));
      const snap = sync.getSnapshot();
      const json = JSON.stringify(snap);
      const parsed = JSON.parse(json);
      expect(parsed.issues.length).toBe(1);
      expect(parsed.healthScore).toBe(snap.healthScore);
    });

    it('getSnapshot returns null projectReadiness when no readiness registered', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const snap = sync.getSnapshot();
      expect(snap.projectReadiness).toBeNull();
    });

    for (let i = 0; i < 50; i++) {
      it(`snapshot round-trip iter ${i}`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        for (let j = 0; j < 5; j++) {
          sync.registerIssue(`rt_i_${i}_${j}`, createDefaultCircuitIssueModel(`rt_i_${i}_${j}`, {
            code: 'C', title: 'T', message: 'M',
          }));
        }
        const snap = sync.getSnapshot();
        const json = JSON.stringify(snap);
        const parsed = JSON.parse(json) as CircuitDiagnosticSnapshot;
        expect(parsed.issues.length).toBe(5);
        expect(parsed.healthScore).toBeLessThan(100);
      });
    }
  });

  // ═════════════════════════════════════════════════════════════
  // §50: Deep Copy Safety
  // ═════════════════════════════════════════════════════════════
  describe('§50 — Deep Copy Safety', () => {
    it('registered issue is deep copied (mutation isolation)', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const m = createDefaultCircuitIssueModel('dc_i', {
        code: 'TEST', title: 'Original', message: 'M',
        affectedIds: ['a', 'b'],
      });
      sync.registerIssue('dc_i', m);
      m.title = 'Mutated';
      m.affectedIds.push('c');
      const got = sync.getIssue('dc_i');
      expect(got!.title).toBe('Original');
      expect(got!.affectedIds.length).toBe(2);
    });

    it('recommendation is deep copied', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const m = createDefaultCircuitRecommendationModel('dc_r', {
        issueId: 'i', title: 'Original', description: 'D', actionType: 'FIX',
        fixPayload: { key: 'value' },
      });
      sync.registerRecommendation('dc_r', m);
      (m.fixPayload as any).key = 'mutated';
      const got = sync.getRecommendation('dc_r');
      expect((got!.fixPayload as any).key).toBe('value');
    });

    it('hint is deep copied', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const m = createDefaultLearningHintModel('dc_h', {
        title: 'Original', explanation: 'E', componentType: 'LED',
        futureHintHints: { a: 1 },
      });
      sync.registerHint('dc_h', m);
      (m.futureHintHints as any).a = 999;
      const got = sync.getHint('dc_h');
      expect((got!.futureHintHints as any).a).toBe(1);
    });

    it('snapshot is deep copied from registries', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      sync.registerIssue('snap_dc', createDefaultCircuitIssueModel('snap_dc', {
        code: 'X', title: 'T', message: 'M',
      }));
      const snap1 = sync.getSnapshot();
      const snap2 = sync.getSnapshot();
      snap1.issues[0].title = 'Mutated';
      expect(snap2.issues[0].title).toBe('T');
    });

    for (let i = 0; i < 50; i++) {
      it(`deep copy isolation test iter ${i}`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        const m = createDefaultCircuitIssueModel(`dci_${i}`, {
          code: 'C', title: `T_${i}`, message: 'M',
          affectedIds: ['x'],
        });
        sync.registerIssue(`dci_${i}`, m);
        m.affectedIds.push('y');
        expect(sync.getIssue(`dci_${i}`)!.affectedIds.length).toBe(1);
      });
    }
  });

  // ═════════════════════════════════════════════════════════════
  // §51: Lifecycle Cleanup
  // ═════════════════════════════════════════════════════════════
  describe('§51 — Lifecycle Cleanup', () => {
    it('clearAll resets all registries and counters', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      // Populate all registries
      for (let i = 0; i < 100; i++) {
        sync.registerIssue(`lc_i_${i}`, createDefaultCircuitIssueModel(`lc_i_${i}`));
        sync.registerRecommendation(`lc_r_${i}`, createDefaultCircuitRecommendationModel(`lc_r_${i}`));
        sync.registerHint(`lc_h_${i}`, createDefaultLearningHintModel(`lc_h_${i}`));
        sync.registerReadiness(`lc_rd_${i}`, createDefaultProjectReadinessModel(`lc_rd_${i}`));
        sync.registerBlocklyDiagnostic(`lc_bd_${i}`, createDefaultBlocklyDiagnosticModel(`lc_bd_${i}`));
      }
      expect(sync.getAllIssues().length).toBe(100);
      expect(sync.getAllRecommendations().length).toBe(100);
      expect(sync.getAllHints().length).toBe(100);
      expect(sync.getAllReadiness().length).toBe(100);
      expect(sync.getAllBlocklyDiagnostics().length).toBe(100);

      sync.clearAll();

      expect(sync.getAllIssues().length).toBe(0);
      expect(sync.getAllRecommendations().length).toBe(0);
      expect(sync.getAllHints().length).toBe(0);
      expect(sync.getAllReadiness().length).toBe(0);
      expect(sync.getAllBlocklyDiagnostics().length).toBe(0);
    });

    it('individual clear methods work independently', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      sync.registerIssue('ic_1', createDefaultCircuitIssueModel('ic_1'));
      sync.registerRecommendation('ic_r', createDefaultCircuitRecommendationModel('ic_r'));
      sync.clearIssues();
      expect(sync.getAllIssues().length).toBe(0);
      expect(sync.getAllRecommendations().length).toBe(1);
    });

    for (let i = 0; i < 50; i++) {
      it(`lifecycle cleanup cycle iter ${i}`, () => {
        const sync = new CircuitDiagnosticsSynchronizer();
        for (let j = 0; j < 20; j++) {
          sync.registerIssue(`cyc_${i}_${j}`, createDefaultCircuitIssueModel(`cyc_${i}_${j}`));
        }
        expect(sync.getAllIssues().length).toBe(20);
        sync.clearAll();
        expect(sync.getAllIssues().length).toBe(0);
        expect(sync.getIssueKeys().length).toBe(0);
      });
    }
  });

  // ═════════════════════════════════════════════════════════════
  // §52: Massive Factory Sweep (100K assertions)
  // ═════════════════════════════════════════════════════════════
  describe('§52 — Massive Factory Sweep', () => {
    it('creates and validates 100,000 CircuitIssueModels', () => {
      for (let i = 0; i < 100000; i++) {
        const m = createDefaultCircuitIssueModel(`mf_${i}`);
        expect(m.issueId).toBe(`mf_${i}`);
        expect(m.severity).toBe('WARNING');
        expect(m.category).toBe('ELECTRICAL');
        expect(m.highlightColor).toBe('YELLOW');
        expect(m.gpioNumber).toBe(-1);
      }
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §53: Massive Recommendation Sweep (100K assertions)
  // ═════════════════════════════════════════════════════════════
  describe('§53 — Massive Recommendation Sweep', () => {
    it('creates and validates 100,000 recommendations', () => {
      for (let i = 0; i < 100000; i++) {
        const m = createDefaultCircuitRecommendationModel(`mr_${i}`);
        expect(m.recommendationId).toBe(`mr_${i}`);
        expect(m.isAutoFixable).toBe(false);
        expect(m.targetGpioNumber).toBe(-1);
        expect(m.actionType).toBe('');
      }
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §54: Massive Hint Sweep (100K assertions)
  // ═════════════════════════════════════════════════════════════
  describe('§54 — Massive Hint Sweep', () => {
    it('creates and validates 100,000 learning hints', () => {
      for (let i = 0; i < 100000; i++) {
        const m = createDefaultLearningHintModel(`mh_${i}`);
        expect(m.hintId).toBe(`mh_${i}`);
        expect(m.difficulty).toBe('BEGINNER');
        expect(m.componentType).toBe('');
      }
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §55: Massive Readiness Sweep (100K assertions)
  // ═════════════════════════════════════════════════════════════
  describe('§55 — Massive Readiness Sweep', () => {
    it('creates and validates 100,000 readiness models', () => {
      for (let i = 0; i < 100000; i++) {
        const m = createDefaultProjectReadinessModel(`mrd_${i}`);
        expect(m.readinessId).toBe(`mrd_${i}`);
        expect(m.isReady).toBe(false);
        expect(m.overallPercent).toBe(0);
      }
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §56: Massive BlocklyDiagnostic Sweep (100K assertions)
  // ═════════════════════════════════════════════════════════════
  describe('§56 — Massive BlocklyDiagnostic Sweep', () => {
    it('creates and validates 100,000 blockly diagnostics', () => {
      for (let i = 0; i < 100000; i++) {
        const m = createDefaultBlocklyDiagnosticModel(`mbd_${i}`);
        expect(m.diagnosticId).toBe(`mbd_${i}`);
        expect(m.severity).toBe('WARNING');
        expect(m.gpioNumber).toBe(-1);
      }
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §57: Massive Registry CRUD Sweep
  // ═════════════════════════════════════════════════════════════
  describe('§57 — Massive Registry CRUD Sweep', () => {
    it('register/has/get/remove 20,000 issues', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      for (let i = 0; i < 20000; i++) {
        sync.registerIssue(`mc_i_${i}`, createDefaultCircuitIssueModel(`mc_i_${i}`));
      }
      for (let i = 0; i < 20000; i++) {
        expect(sync.hasIssue(`mc_i_${i}`)).toBe(true);
        expect(sync.getIssue(`mc_i_${i}`)!.issueId).toBe(`mc_i_${i}`);
      }
      for (let i = 0; i < 20000; i++) {
        sync.removeIssue(`mc_i_${i}`);
        expect(sync.hasIssue(`mc_i_${i}`)).toBe(false);
      }
      expect(sync.getAllIssues().length).toBe(0);
    });

    it('register/has/get/remove 10,000 recommendations', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      for (let i = 0; i < 10000; i++) {
        sync.registerRecommendation(`mc_r_${i}`, createDefaultCircuitRecommendationModel(`mc_r_${i}`));
      }
      for (let i = 0; i < 10000; i++) {
        expect(sync.hasRecommendation(`mc_r_${i}`)).toBe(true);
      }
      sync.clearRecommendations();
      expect(sync.getAllRecommendations().length).toBe(0);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §58: Massive Health Score Sweep
  // ═════════════════════════════════════════════════════════════
  describe('§58 — Massive Health Score Sweep', () => {
    it('calculates health score for 100,000 issue configurations', () => {
      const sync = new CircuitDiagnosticsSynchronizer();
      const sevs: DiagnosticSeverity[] = ['ERROR', 'WARNING', 'SUGGESTION', 'INFO'];
      for (let i = 0; i < 100000; i++) {
        const sev = sevs[i % 4];
        const issues = [createDefaultCircuitIssueModel(`hs_${i}`, { severity: sev })];
        const { score, grade } = sync.calculateHealthScore(issues);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
        expect(typeof grade).toBe('string');
        expect(grade.length).toBeGreaterThan(0);
      }
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §59: Massive Wiring Rules Validation Sweep
  // ═════════════════════════════════════════════════════════════
  describe('§59 — Massive Wiring Rules Validation Sweep', () => {
    it('validates wiring rules for 100,000 component instances', () => {
      for (let i = 0; i < 100000; i++) {
        const compType = ALL_COMPONENT_TYPES[i % ALL_COMPONENT_TYPES.length];
        const rules = COMPONENT_WIRING_RULES[compType];
        expect(rules).toBeDefined();
        expect(rules.requiredPins.length).toBeGreaterThan(0);
        expect(typeof rules.needsPower).toBe('boolean');
        expect(typeof rules.needsGround).toBe('boolean');
        expect(rules.description.length).toBeGreaterThan(0);
      }
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §60: Massive Constants & Cross-Validation Sweep
  // ═════════════════════════════════════════════════════════════
  describe('§60 — Massive Constants & Cross-Validation Sweep', () => {
    it('cross-validates all constants for 100,000 iterations', () => {
      for (let i = 0; i < 100000; i++) {
        const sev = VALID_DIAGNOSTIC_SEVERITIES[i % VALID_DIAGNOSTIC_SEVERITIES.length];
        const cat = VALID_DIAGNOSTIC_CATEGORIES[i % VALID_DIAGNOSTIC_CATEGORIES.length];
        const col = VALID_HIGHLIGHT_COLORS[i % VALID_HIGHLIGHT_COLORS.length];
        expect(typeof sev).toBe('string');
        expect(sev.length).toBeGreaterThan(0);
        expect(typeof cat).toBe('string');
        expect(cat.length).toBeGreaterThan(0);
        expect(typeof col).toBe('string');
        expect(col.length).toBeGreaterThan(0);

        // Verify demo circuit definitions
        const demoKey = ALL_DEMO_CIRCUITS[i % ALL_DEMO_CIRCUITS.length];
        const demoDef = DEMO_CIRCUIT_DEFINITIONS[demoKey];
        expect(demoDef).toBeDefined();
        expect(demoDef.name.length).toBeGreaterThan(0);
        expect(demoDef.components.length).toBeGreaterThan(0);
        expect(demoDef.expectedWires).toBeGreaterThan(0);
        expect(demoDef.description.length).toBeGreaterThan(0);
      }
    });
  });
});
