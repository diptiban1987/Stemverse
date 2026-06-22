/**
 * Phase 41A — AI Mentor Runtime Tests
 */
import { describe, it, expect } from 'vitest';
import {
  explainCircuit, explainBlockly, explainArduinoCode, explainSensor,
  explainComponent, explainError, generateHints, generateLearningPath,
  advanceLearningPath, getLearningPathProgress,
  reviewCircuit, reviewBlockly, reviewProject,
  generateAssignment, generateRubric, generateQuestion,
  detectStudentRisk, generateClassroomInsight, createTeacherAssistant,
} from '../src/stage/ai-mentor-runtime';

describe('AI Mentor: Explanations', () => {
  it('explainCircuit — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const exp = explainCircuit(['led', 'resistor'], 3);
      expect(exp.category).toBe('circuit');
      expect(exp.keyPoints.length).toBeGreaterThan(0);
      expect(exp.explanation).toContain('led');
    }
  });

  it('explainBlockly — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const exp = explainBlockly(['loop', 'if_else', 'gpio_write'], 15);
      expect(exp.category).toBe('blockly');
      expect(exp.difficulty).toBe('intermediate');
    }
  });

  it('explainArduinoCode — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const exp = explainArduinoCode(75, ['setup', 'loop', 'readSensor']);
      expect(exp.category).toBe('arduino');
      expect(exp.difficulty).toBe('advanced');
    }
  });

  it('explainSensor — known and unknown', () => {
    for (let i = 0; i < 500; i++) {
      const known = explainSensor('hcsr04');
      expect(known.category).toBe('sensor');
      expect(known.explanation).toContain('ultrasonic');
      const unknown = explainSensor('custom_sensor');
      expect(unknown.category).toBe('sensor');
    }
  });

  it('explainComponent — 7 known components', () => {
    const types = ['led', 'resistor', 'capacitor', 'sensor_ultrasonic', 'servo', 'motor_dc', 'esp32'];
    for (const t of types) {
      for (let i = 0; i < 70; i++) {
        const exp = explainComponent(t);
        expect(exp.category).toBe('component');
        expect(exp.explanation.length).toBeGreaterThan(10);
      }
    }
  });

  it('explainError — 8 error types', () => {
    const errors = ['short_circuit', 'no_power', 'floating_pin', 'overcurrent', 'reverse_polarity', 'missing_ground', 'compilation_error', 'runtime_error'];
    for (const e of errors) {
      for (let i = 0; i < 60; i++) {
        const exp = explainError(e);
        expect(exp.category).toBe('error');
        expect(exp.keyPoints.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('AI Mentor: Hints', () => {
  it('generateHints — LED warning', () => {
    for (let i = 0; i < 500; i++) {
      const hints = generateHints('ctx1', ['led']);
      expect(hints.length).toBeGreaterThan(0);
      expect(hints[0].severity).toBe('warning');
    }
  });

  it('generateHints — motor critical', () => {
    for (let i = 0; i < 500; i++) {
      const hints = generateHints('ctx2', ['motor_dc']);
      expect(hints.some(h => h.severity === 'critical')).toBe(true);
    }
  });

  it('generateHints — fallback for unknown', () => {
    for (let i = 0; i < 500; i++) {
      const hints = generateHints('ctx3', ['unknown_component']);
      expect(hints.length).toBeGreaterThan(0);
    }
  });
});

describe('AI Mentor: Learning Paths', () => {
  it('generate and advance learning path', () => {
    for (let i = 0; i < 500; i++) {
      let path = generateLearningPath(`user${i}`, ['basics'], 'robotics');
      expect(path.steps).toHaveLength(5);
      expect(getLearningPathProgress(path)).toBe(0);
      path = advanceLearningPath(path);
      expect(path.completedSteps).toBe(1);
      expect(getLearningPathProgress(path)).toBe(20);
      path = advanceLearningPath(path);
      expect(getLearningPathProgress(path)).toBe(40);
    }
  });
});

describe('AI Mentor: Circuit Review', () => {
  it('reviewCircuit — safe circuit', () => {
    for (let i = 0; i < 500; i++) {
      const review = reviewCircuit('c1', ['led', 'resistor'], 4, true, true);
      expect(review.safetyRating).toBe('safe');
      expect(review.qualityScore).toBe(100);
    }
  });

  it('reviewCircuit — dangerous circuit', () => {
    for (let i = 0; i < 500; i++) {
      const review = reviewCircuit('c2', ['led'], 2, false, false);
      expect(review.safetyRating).toBe('danger');
      expect(review.issues.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('AI Mentor: Blockly Review', () => {
  it('reviewBlockly — clean code', () => {
    for (let i = 0; i < 500; i++) {
      const review = reviewBlockly('p1', ['loop', 'if', 'gpio'], false, false);
      expect(review.logicScore).toBe(100);
      expect(review.performanceScore).toBe(95);
    }
  });

  it('reviewBlockly — buggy code', () => {
    for (let i = 0; i < 500; i++) {
      const review = reviewBlockly('p2', ['loop'], true, true);
      expect(review.bugs.length).toBe(2);
      expect(review.logicScore).toBeLessThan(100);
    }
  });
});

describe('AI Mentor: Project Review', () => {
  it('reviewProject — competition project', () => {
    for (let i = 0; i < 500; i++) {
      const review = reviewProject('p1', 8, 20, true, true);
      expect(review.overallScore).toBeGreaterThan(50);
      expect(review.robothronScore).toBeGreaterThan(0);
    }
  });
});

describe('AI Mentor: Teacher AI', () => {
  it('generateAssignment', () => {
    for (let i = 0; i < 500; i++) {
      const a = generateAssignment('t1', 'LED Circuits', 'beginner');
      expect(a.difficulty).toBe('beginner');
      expect(a.estimatedMinutes).toBe(30);
    }
  });

  it('generateRubric', () => {
    for (let i = 0; i < 500; i++) {
      const r = generateRubric('Circuit Design', 100);
      expect(r.criteria).toHaveLength(4);
      expect(r.maxScore).toBe(100);
    }
  });

  it('generateQuestion', () => {
    for (let i = 0; i < 500; i++) {
      const q = generateQuestion('resistor', 'intermediate');
      expect(q.type).toBe('multiple_choice');
      expect(q.distractors).toHaveLength(3);
    }
  });

  it('detectStudentRisk', () => {
    for (let i = 0; i < 500; i++) {
      const risk = detectStudentRisk('s1', 30, 25, 20);
      expect(risk).not.toBeNull();
      expect(risk!.riskLevel).toBe('high');
      const safe = detectStudentRisk('s2', 90, 85, 1);
      expect(safe).toBeNull();
    }
  });

  it('generateClassroomInsight', () => {
    for (let i = 0; i < 500; i++) {
      const insight = generateClassroomInsight(45, 60, 10, 30);
      expect(insight.type).toBe('engagement');
      expect(insight.actionable).toBe(true);
    }
  });

  it('createTeacherAssistant', () => {
    const ta = createTeacherAssistant('t1');
    expect(ta.teacherId).toBe('t1');
    expect(ta.generatedAssignments).toHaveLength(0);
  });
});
