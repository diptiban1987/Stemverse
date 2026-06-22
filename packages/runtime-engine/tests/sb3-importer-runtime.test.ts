/**
 * Phase 42 — SB3 Importer Runtime Tests
 */
import { describe, it, expect } from 'vitest';
import {
  parseSB3Project, importSB3, migrateToSTEMVerse, migrateToBlockly, getSupportedFormats,
} from '../src/stage/sb3-importer-runtime';

const SAMPLE_SB3 = {
  targets: [
    { isStage: true, name: 'Stage', variables: { v1: ['my var', 0] }, lists: { l1: ['my list', [1, 2, 3]] }, broadcasts: { b1: 'start' }, blocks: { blk1: { opcode: 'event_whenflagclicked', topLevel: true, x: 10, y: 10 } }, costumes: [{ name: 'backdrop1', assetId: 'abc', dataFormat: 'svg', rotationCenterX: 240, rotationCenterY: 180 }], sounds: [], currentCostume: 0, volume: 100 },
    { isStage: false, name: 'Cat', x: 0, y: 0, size: 100, direction: 90, visible: true, rotationStyle: 'all around', variables: {}, lists: {}, broadcasts: {}, blocks: { blk2: { opcode: 'motion_movesteps', topLevel: false, inputs: { STEPS: [1, [4, '10']] } }, blk3: { opcode: 'looks_say', topLevel: false } }, costumes: [{ name: 'costume1', assetId: 'def', dataFormat: 'svg' }], sounds: [{ name: 'meow', assetId: 'snd1', dataFormat: 'wav', rate: 44100, sampleCount: 44100 }], currentCostume: 0, volume: 100 },
  ],
  monitors: [{ opcode: 'data_variable', params: { VARIABLE: 'my var' }, visible: true, x: 5, y: 5, width: 100, height: 20 }],
  extensions: ['pen'],
  meta: { semver: '3.0.0', vm: '0.2.0', agent: 'scratch-test' },
};

describe('SB3 Importer: Parse', () => {
  it('parse project — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const project = parseSB3Project(SAMPLE_SB3 as any, `Project ${i}`);
      expect(project.name).toBe(`Project ${i}`);
      expect(project.format).toBe('sb3');
      expect(project.targets).toHaveLength(2);
      expect(project.targets[0].isStage).toBe(true);
      expect(project.targets[1].name).toBe('Cat');
      expect(project.monitors).toHaveLength(1);
    }
  });
  it('parse variables and lists', () => {
    for (let i = 0; i < 500; i++) {
      const project = parseSB3Project(SAMPLE_SB3 as any);
      const stage = project.targets[0];
      expect(stage.variables).toHaveLength(1);
      expect(stage.variables[0].name).toBe('my var');
      expect(stage.lists).toHaveLength(1);
      expect(stage.lists[0].items).toEqual([1, 2, 3]);
      expect(stage.broadcasts).toHaveLength(1);
    }
  });
});

describe('SB3 Importer: Import', () => {
  it('import full project — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const result = importSB3(SAMPLE_SB3 as any, `Test ${i}`);
      expect(result.spritesImported).toBe(1);
      expect(result.variablesImported).toBe(1);
      expect(result.listsImported).toBe(1);
      expect(result.broadcastsImported).toBe(1);
      expect(result.costumesImported).toBe(2);
      expect(result.soundsImported).toBe(1);
      expect(result.blocksImported).toBe(3);
      expect(result.errors).toHaveLength(0);
    }
  });
});

describe('SB3 Importer: Migration', () => {
  it('migrate to STEMVerse — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const project = parseSB3Project(SAMPLE_SB3 as any);
      const result = migrateToSTEMVerse(project);
      expect(result.targetFormat).toBe('stemverse');
      expect(result.spritesConverted).toBe(1);
      expect(result.blocksConverted).toBe(3);
      expect(result.assetsConverted).toBe(3);
    }
  });
  it('migrate to Blockly — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const project = parseSB3Project(SAMPLE_SB3 as any);
      const result = migrateToBlockly(project);
      expect(result.targetFormat).toBe('blockly');
      expect(result.spritesConverted).toBe(1);
    }
  });
  it('supported formats', () => {
    for (let i = 0; i < 500; i++) {
      expect(getSupportedFormats()).toEqual(['sb3', 'sb2', 'sprite3']);
    }
  });
});
