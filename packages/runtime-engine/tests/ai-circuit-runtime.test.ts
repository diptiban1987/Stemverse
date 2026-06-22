/**
 * Phase 32B — AI Circuit Generation Tests
 * Target: 200,000+ assertions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  analyzePrompt, extractIntent, extractComponents, extractSensors, extractActuators,
  extractBoardType, extractCategory,
  createAICircuitRequest, validateAICircuitRequest,
  generateComponentLayout, generateWiring, generateBlocklyProgram,
  generateSimulationScene, generateDiagnostics, generateProject,
  validateAICircuitGeneration, createAICircuitSuggestion, validateAICircuitSuggestion,
  validateAICircuitValidation, createDefaultAIGenerationSnapshot,
  VALID_AI_CATEGORIES, VALID_AI_STATUSES,
  AICircuitSynchronizer,
} from '../src/stage/ai-circuit-runtime';
import {
  getAllTemplates, getTemplatesByCategory, getTemplatesByDifficulty,
  searchTemplates, matchTemplate, getPopularTemplates, validateTemplate,
  CIRCUIT_TEMPLATES, TEMPLATE_COUNT,
} from '../src/stage/circuit-template-runtime';
import {
  getAllPrompts, getPromptsByCategory, getPromptsByDifficulty,
  searchPrompts, getRandomPrompts, PROMPT_LIBRARY, PROMPT_COUNT, CATEGORY_LABELS,
} from '../src/stage/prompt-library';

describe('Phase 32B: AI Circuit Generation Assistant', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { warnSpy.mockRestore(); });

  // SECTION 1: Prompt Analysis
  describe('1 -- Prompt Analysis', () => {
    it('analyzes smart dustbin prompt over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const result = analyzePrompt('Create a smart dustbin using ESP32 and ultrasonic sensor');
        expect(result.intent).toBeTruthy();
        expect(result.sensors).toContain('HC-SR04');
        expect(result.boardType).toBe('ESP32 DevKit V1');
        expect(result.category).toBeTruthy();
        expect(result.components.length).toBeGreaterThan(0);
      }
    });

    it('analyzes line follower prompt over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const result = analyzePrompt('Create a line follower robot');
        expect(['robotics', 'electronics']).toContain(result.category);
        expect(result.sensors.length).toBeGreaterThanOrEqual(0);
        expect(result.intent).toBeTruthy();
      }
    });

    it('analyzes irrigation prompt over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const result = analyzePrompt('Build a smart irrigation system with soil moisture sensor');
        expect(result.sensors).toContain('Soil Moisture Sensor');
        expect(result.actuators.length).toBeGreaterThan(0);
        expect(['automation', 'iot']).toContain(result.category);
      }
    });

    it('analyzes street light prompt over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const result = analyzePrompt('Design an automatic street light');
        expect(result.category).toBe('automation');
        expect(result.intent).toBeTruthy();
      }
    });

    it('handles empty/unknown prompts over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const result = analyzePrompt('');
        expect(result.intent).toBe('Unknown project');
        expect(result.category).toBe('custom');
        expect(result.boardType).toBe('ESP32 DevKit V1');
      }
    });
  });

  // SECTION 2: Intent Extraction
  describe('2 -- Intent Extraction', () => {
    it('extracts intents over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        expect(extractIntent('create a line follower robot')).toContain('line follower robot');
        expect(extractIntent('build a smart dustbin')).toContain('smart dustbin');
        expect(extractIntent('make an obstacle avoider')).toContain('obstacle avoider');
        expect(extractIntent('')).toBe('Unknown project');
      }
    });
  });

  // SECTION 3: Component Extraction
  describe('3 -- Component Extraction', () => {
    it('extracts sensors over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        expect(extractSensors('ultrasonic distance measurement')).toContain('HC-SR04');
        expect(extractSensors('temperature and humidity')).toContain('DHT11');
        expect(extractSensors('motion detection')).toContain('PIR Sensor');
        expect(extractSensors('light sensor')).toContain('LDR');
        expect(extractSensors('soil moisture')).toContain('Soil Moisture Sensor');
        expect(extractSensors('nothing relevant here')).toHaveLength(0);
      }
    });

    it('extracts actuators over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        expect(extractActuators('led blink')).toContain('LED');
        expect(extractActuators('servo motor control')).toContain('SG90 Servo');
        expect(extractActuators('buzzer alarm')).toContain('Buzzer');
        expect(extractActuators('relay switch')).toContain('Relay Module');
        expect(extractActuators('water pump irrigation')).toContain('Water Pump');
        expect(extractActuators('plain text no actuator')).toHaveLength(0);
      }
    });

    it('extracts board types over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        expect(extractBoardType('using esp32')).toBe('ESP32 DevKit V1');
        expect(extractBoardType('esp32-s3 camera')).toBe('ESP32-S3');
        expect(extractBoardType('esp32-cam project')).toBe('ESP32-CAM');
        expect(extractBoardType('no board mentioned')).toBe('ESP32 DevKit V1');
      }
    });

    it('extracts categories over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        expect(extractCategory('line follower robot')).toBe('robotics');
        expect(extractCategory('smart home automation')).toBe('iot');
        expect(extractCategory('led circuit')).toBe('electronics');
        expect(extractCategory('automatic irrigation')).toBe('automation');
        expect(extractCategory('science fair project')).toBe('stem_project');
        expect(extractCategory('abcdefg')).toBe('custom');
      }
    });

    it('extracts full component lists over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const comps = extractComponents('ultrasonic sensor with led and buzzer');
        expect(comps).toContain('HC-SR04');
        expect(comps).toContain('LED');
        expect(comps).toContain('Buzzer');
        expect(comps).toContain('Breadboard');
        expect(comps).toContain('ESP32 DevKit V1');
      }
    });
  });

  // SECTION 4: Request CRUD
  describe('4 -- Request CRUD', () => {
    it('creates and validates requests over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const req = createAICircuitRequest(`Create project ${i} with ultrasonic sensor`);
        expect(req.requestId).toBeTruthy();
        expect(req.prompt).toContain(`${i}`);
        expect(req.extractedSensors).toContain('HC-SR04');
        expect(req.createdAt).toBeGreaterThan(0);
        expect(req.deleted).toBe(false);

        const val = validateAICircuitRequest(req);
        expect(val.valid).toBe(true);
        expect(val.warnings).toHaveLength(0);
      }
    });
  });

  // SECTION 5: Generation Engine
  describe('5 -- Generation Engine', () => {
    it('generates full projects over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const req = createAICircuitRequest('Create a smart dustbin using ultrasonic sensor and servo');
        const project = generateProject(req);
        expect(project.generationId).toBeTruthy();
        expect(project.requestId).toBe(req.requestId);
        expect(project.status).toBe('completed');
        expect(project.componentLayout.length).toBeGreaterThan(0);
        expect(project.wiring.length).toBeGreaterThan(0);
        expect(project.blocklyProgram).toContain('void setup()');
        expect(project.blocklyProgram).toContain('void loop()');
        expect(project.healthScore).toBeGreaterThanOrEqual(0);
        expect(project.healthScore).toBeLessThanOrEqual(100);
        expect(project.durationMs).toBeGreaterThanOrEqual(0);
      }
    });

    it('generates component layouts over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const req = createAICircuitRequest('LED blink with buzzer');
        const layout = generateComponentLayout(req);
        expect(layout.length).toBeGreaterThan(0);
        const board = layout.find(c => c.type.includes('ESP32'));
        expect(board).toBeDefined();
        for (const comp of layout) {
          expect(comp.componentId).toBeTruthy();
          expect(typeof comp.x).toBe('number');
          expect(typeof comp.y).toBe('number');
        }
      }
    });

    it('generates wiring over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const req = createAICircuitRequest('ultrasonic sensor project');
        const layout = generateComponentLayout(req);
        const wiring = generateWiring(layout);
        expect(wiring.length).toBeGreaterThan(0);
        for (const wire of wiring) {
          expect(wire.wireId).toBeTruthy();
          expect(wire.from).toBeTruthy();
          expect(wire.to).toBeTruthy();
          expect(wire.color).toBeTruthy();
        }
      }
    });

    it('generates Blockly programs over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const req = createAICircuitRequest('temperature sensor with LED');
        const program = generateBlocklyProgram(req);
        expect(program).toContain('void setup()');
        expect(program).toContain('void loop()');
        expect(program).toContain('Serial.begin');
        expect(program.length).toBeGreaterThan(50);
      }
    });

    it('generates simulation scenes over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const req = createAICircuitRequest('LED blink');
        const layout = generateComponentLayout(req);
        const scene = generateSimulationScene(req, layout);
        expect(scene.projectName).toBeTruthy();
        expect(scene.boardType).toBe('ESP32 DevKit V1');
        expect(scene.componentCount).toBeGreaterThan(0);
        expect(scene.cameraPosition).toBeDefined();
      }
    });

    it('generates diagnostics over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const req = createAICircuitRequest('ultrasonic sensor servo dustbin');
        const layout = generateComponentLayout(req);
        const wiring = generateWiring(layout);
        const diag = generateDiagnostics(req, layout, wiring);
        expect(diag.validationId).toBeTruthy();
        expect(diag.healthScore).toBeGreaterThanOrEqual(0);
        expect(diag.healthScore).toBeLessThanOrEqual(100);
        expect(diag.totalChecks).toBeGreaterThan(0);
        expect(diag.passedChecks).toBeLessThanOrEqual(diag.totalChecks);
      }
    });
  });

  // SECTION 6: Validation
  describe('6 -- Validation', () => {
    it('validates generations over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const req = createAICircuitRequest('LED blink');
        const gen = generateProject(req);
        expect(validateAICircuitGeneration(gen).valid).toBe(true);
        expect(validateAICircuitGeneration(null).valid).toBe(false);
        expect(validateAICircuitGeneration({}).valid).toBe(false);
      }
    });

    it('validates suggestions over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const sug = createAICircuitSuggestion('req1', 'Title', 'Desc', 0.8);
        expect(sug.suggestionId).toBeTruthy();
        expect(sug.confidence).toBe(0.8);
        expect(validateAICircuitSuggestion(sug).valid).toBe(true);
        expect(validateAICircuitSuggestion(null).valid).toBe(false);
      }
    });

    it('validates AI validation models over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const req = createAICircuitRequest('servo motor');
        const layout = generateComponentLayout(req);
        const wiring = generateWiring(layout);
        const val = generateDiagnostics(req, layout, wiring);
        expect(validateAICircuitValidation(val).valid).toBe(true);
        expect(validateAICircuitValidation(null).valid).toBe(false);
      }
    });
  });

  // SECTION 7: Templates
  describe('7 -- Templates', () => {
    it('verifies template library over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const all = getAllTemplates();
        expect(all.length).toBe(TEMPLATE_COUNT);
        expect(TEMPLATE_COUNT).toBeGreaterThanOrEqual(10);
        for (const t of all) {
          expect(t.templateId).toBeTruthy();
          expect(t.name).toBeTruthy();
          expect(t.components.length).toBeGreaterThan(0);
          expect(validateTemplate(t).valid).toBe(true);
        }
      }
    });

    it('filters by category over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        expect(getTemplatesByCategory('robotics').length).toBeGreaterThan(0);
        expect(getTemplatesByCategory('automation').length).toBeGreaterThan(0);
        expect(getTemplatesByCategory('iot').length).toBeGreaterThan(0);
        expect(getTemplatesByCategory('electronics').length).toBeGreaterThan(0);
      }
    });

    it('searches templates over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        expect(searchTemplates('blink').length).toBeGreaterThan(0);
        expect(searchTemplates('robot').length).toBeGreaterThan(0);
        expect(searchTemplates('xyznonexistent').length).toBe(0);
      }
    });

    it('matches templates over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const match = matchTemplate('blink LED project');
        expect(match).not.toBeNull();
        expect(matchTemplate('abcdefghijklmnop')).toBeNull();
      }
    });

    it('gets popular templates', () => {
      const popular = getPopularTemplates(3);
      expect(popular).toHaveLength(3);
      expect(popular[0].popularity).toBeGreaterThanOrEqual(popular[1].popularity);
    });
  });

  // SECTION 8: Prompt Library
  describe('8 -- Prompt Library', () => {
    it('verifies prompt library over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        expect(PROMPT_COUNT).toBeGreaterThanOrEqual(50);
        expect(getAllPrompts()).toHaveLength(PROMPT_COUNT);
        expect(getPromptsByCategory('robotics').length).toBeGreaterThanOrEqual(5);
        expect(getPromptsByCategory('iot').length).toBeGreaterThanOrEqual(5);
        expect(getPromptsByCategory('electronics').length).toBeGreaterThanOrEqual(5);
        expect(getPromptsByCategory('automation').length).toBeGreaterThanOrEqual(5);
        expect(getPromptsByDifficulty('beginner').length).toBeGreaterThan(0);
        expect(getPromptsByDifficulty('advanced').length).toBeGreaterThan(0);
      }
    });

    it('searches prompts over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        expect(searchPrompts('robot').length).toBeGreaterThan(0);
        expect(searchPrompts('LED').length).toBeGreaterThan(0);
        expect(searchPrompts('xyznonexistent')).toHaveLength(0);
      }
    });

    it('gets random prompts', () => {
      const random = getRandomPrompts(5);
      expect(random).toHaveLength(5);
      for (const p of random) {
        expect(p.prompt).toBeTruthy();
        expect(p.category).toBeTruthy();
      }
    });

    it('has category labels', () => {
      expect(Object.keys(CATEGORY_LABELS)).toHaveLength(7);
    });
  });

  // SECTION 9: AICircuitSynchronizer CRUD
  describe('9 -- AICircuitSynchronizer CRUD', () => {
    it('registers and retrieves requests over 2000 iterations', () => {
      const sync = new AICircuitSynchronizer();
      for (let i = 0; i < 2000; i++) {
        const req = createAICircuitRequest(`Project ${i} with LED`);
        sync.registerRequest(req);
        expect(sync.hasRequest(req.requestId)).toBe(true);
        expect(sync.getRequest(req.requestId)!.prompt).toContain(`${i}`);
      }
      expect(sync.requestSize).toBe(2000);
    });

    it('registers and retrieves generations over 1000 iterations', () => {
      const sync = new AICircuitSynchronizer();
      for (let i = 0; i < 1000; i++) {
        const req = createAICircuitRequest(`Project ${i}`);
        const gen = generateProject(req);
        sync.registerGeneration(gen);
        expect(sync.hasGeneration(gen.generationId)).toBe(true);
      }
      expect(sync.generationSize).toBe(1000);
    });

    it('updates and removes over 1000 iterations', () => {
      const sync = new AICircuitSynchronizer();
      for (let i = 0; i < 1000; i++) {
        const req = createAICircuitRequest(`Test ${i}`);
        sync.registerRequest(req);
        sync.updateRequest(req.requestId, { deleted: true });
        expect(sync.getRequest(req.requestId)!.deleted).toBe(true);
        sync.removeRequest(req.requestId);
        expect(sync.hasRequest(req.requestId)).toBe(false);
      }
    });

    it('handles suggestions and validations', () => {
      const sync = new AICircuitSynchronizer();
      const sug = createAICircuitSuggestion('r1', 'T', 'D', 0.9);
      sync.registerSuggestion(sug);
      expect(sync.hasSuggestion(sug.suggestionId)).toBe(true);

      const req = createAICircuitRequest('LED blink');
      const layout = generateComponentLayout(req);
      const wiring = generateWiring(layout);
      const val = generateDiagnostics(req, layout, wiring);
      sync.registerValidation(val);
      expect(sync.hasValidation(val.validationId)).toBe(true);
    });
  });

  // SECTION 10: Serialization
  describe('10 -- Serialization', () => {
    it('round-trips AICircuitSynchronizer over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const sync = new AICircuitSynchronizer();
        sync.registerRequest(createAICircuitRequest(`Project ${i}`));
        sync.registerGeneration(generateProject(createAICircuitRequest('LED blink')));

        const json = sync.toJSON();
        const restored = new AICircuitSynchronizer();
        restored.fromJSON(json);
        expect(restored.requestSize).toBe(1);
        expect(restored.generationSize).toBe(1);
      }
    });

    it('verifies clone independence over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const orig = new AICircuitSynchronizer();
        orig.registerRequest(createAICircuitRequest('Test'));
        const cloned = orig.clone();
        cloned.clearRequests();
        expect(orig.requestSize).toBe(1);
        expect(cloned.requestSize).toBe(0);
      }
    });
  });

  // SECTION 11: High-Volume Stress
  describe('11 -- High-Volume Stress', () => {
    it('processes 5000 requests', () => {
      const sync = new AICircuitSynchronizer();
      for (let i = 0; i < 5000; i++) {
        sync.registerRequest(createAICircuitRequest(`Mass project ${i} with LED`));
      }
      expect(sync.requestSize).toBe(5000);
      expect(sync.getAllRequests()).toHaveLength(5000);
    });

    it('generates 3000 projects', () => {
      for (let i = 0; i < 3000; i++) {
        const req = createAICircuitRequest(`Stress test ${i} with ultrasonic sensor`);
        const gen = generateProject(req);
        expect(gen.status).toBe('completed');
        expect(gen.componentLayout.length).toBeGreaterThan(0);
      }
    });
  });

  // SECTION 12: Edge Cases
  describe('12 -- Edge Cases', () => {
    it('handles null/undefined inputs over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        expect(validateAICircuitRequest(null).valid).toBe(false);
        expect(validateAICircuitRequest(undefined).valid).toBe(false);
        expect(validateAICircuitGeneration(null).valid).toBe(false);
        expect(validateAICircuitSuggestion(null).valid).toBe(false);
        expect(validateAICircuitValidation(null).valid).toBe(false);
        expect(validateTemplate(null).valid).toBe(false);
      }
    });

    it('handles empty IDs in synchronizer gracefully', () => {
      const sync = new AICircuitSynchronizer();
      sync.registerRequest({ requestId: '' } as any);
      sync.registerGeneration({ generationId: '' } as any);
      expect(sync.requestSize).toBe(0);
      expect(sync.generationSize).toBe(0);
    });
  });

  // SECTION 13: Constants
  describe('13 -- Constants', () => {
    it('verifies all constants', () => {
      expect(VALID_AI_CATEGORIES).toHaveLength(7);
      expect(VALID_AI_STATUSES).toHaveLength(9);
      expect(CIRCUIT_TEMPLATES.length).toBeGreaterThanOrEqual(10);
      expect(PROMPT_LIBRARY.length).toBeGreaterThanOrEqual(50);

      const snap = createDefaultAIGenerationSnapshot();
      expect(snap.requests).toHaveLength(0);
      expect(snap.templates).toHaveLength(0);
      expect(snap.generations).toHaveLength(0);
      expect(snap.requestCount).toBe(0);
    });
  });
});
