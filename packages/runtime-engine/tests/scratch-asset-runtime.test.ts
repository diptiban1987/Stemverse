/**
 * Phase 42 — Scratch Asset Runtime Tests
 */
import { describe, it, expect } from 'vitest';
import {
  createCostume, renameCostume, duplicateCostume, setCostumeRotationCenter, setCostumeLayer,
  createSound, renameSound, duplicateSound, trimSound, setSoundVolume, getSoundTrimmedDuration,
  createBackdrop, renameBackdrop, duplicateBackdrop,
  createAssetLibrary, addCostumeToLibrary, removeCostumeFromLibrary, setCostumeIndex, nextCostume,
  addSoundToLibrary, removeSoundFromLibrary,
  createStageAssets, addBackdropToStage, removeBackdropFromStage, switchBackdrop, nextBackdrop, getCurrentBackdrop,
} from '../src/stage/scratch-asset-runtime';

describe('Assets: Costumes', () => {
  it('create/rename/duplicate — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let c = createCostume(`costume${i}`, 'svg', 'data:image/svg+xml,...', 96, 96);
      expect(c.format).toBe('svg');
      expect(c.rotationCenterX).toBe(48);
      c = renameCostume(c, 'renamed');
      expect(c.name).toBe('renamed');
      const dup = duplicateCostume(c);
      expect(dup.costumeId).not.toBe(c.costumeId);
      expect(dup.name).toBe('renamed copy');
    }
  });
  it('rotation center and layers', () => {
    for (let i = 0; i < 500; i++) {
      let c = createCostume(`c${i}`, 'png', 'data:...', 100, 100);
      c = setCostumeRotationCenter(c, 25, 75);
      expect(c.rotationCenterX).toBe(25);
      c = setCostumeLayer(c, 3);
      expect(c.layerOrder).toBe(3);
    }
  });
});

describe('Assets: Sounds', () => {
  it('create/rename/duplicate — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let s = createSound(`sound${i}`, 'wav', 'data:audio/wav,...', 5.0);
      expect(s.durationSeconds).toBe(5.0);
      s = renameSound(s, 'pop');
      expect(s.name).toBe('pop');
      const dup = duplicateSound(s);
      expect(dup.name).toBe('pop copy');
    }
  });
  it('trim and volume — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let s = createSound(`s${i}`, 'mp3', 'data:...', 10.0);
      s = trimSound(s, 2.0, 8.0);
      expect(getSoundTrimmedDuration(s)).toBe(6.0);
      s = setSoundVolume(s, 75);
      expect(s.volume).toBe(75);
      s = setSoundVolume(s, 150); // clamped
      expect(s.volume).toBe(100);
    }
  });
});

describe('Assets: Backdrops', () => {
  it('create/rename/duplicate — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let b = createBackdrop(`bg${i}`, 'svg', 'data:...');
      expect(b.width).toBe(480);
      b = renameBackdrop(b, 'forest');
      expect(b.name).toBe('forest');
      const dup = duplicateBackdrop(b);
      expect(dup.name).toBe('forest copy');
    }
  });
});

describe('Assets: Library', () => {
  it('costume library operations — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let lib = createAssetLibrary(`sprite_${i}`);
      const c1 = createCostume('walk1', 'svg', 'd:', 96, 96);
      const c2 = createCostume('walk2', 'svg', 'd:', 96, 96);
      lib = addCostumeToLibrary(lib, c1);
      lib = addCostumeToLibrary(lib, c2);
      expect(lib.costumes).toHaveLength(2);
      lib = setCostumeIndex(lib, 1);
      expect(lib.currentCostumeIndex).toBe(1);
      lib = nextCostume(lib);
      expect(lib.currentCostumeIndex).toBe(0);
      lib = removeCostumeFromLibrary(lib, lib.costumes[0].costumeId);
      expect(lib.costumes).toHaveLength(1);
    }
  });
  it('sound library — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let lib = createAssetLibrary(`sprite_${i}`);
      const s = createSound('pop', 'wav', 'd:', 1.0);
      lib = addSoundToLibrary(lib, s);
      expect(lib.sounds).toHaveLength(1);
      lib = removeSoundFromLibrary(lib, lib.sounds[0].soundId);
      expect(lib.sounds).toHaveLength(0);
    }
  });
});

describe('Assets: Stage', () => {
  it('backdrop management — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let stage = createStageAssets();
      const b1 = createBackdrop('forest', 'svg', 'd:');
      const b2 = createBackdrop('desert', 'png', 'd:');
      stage = addBackdropToStage(stage, b1);
      stage = addBackdropToStage(stage, b2);
      expect(stage.backdrops).toHaveLength(2);
      expect(getCurrentBackdrop(stage)?.name).toBe('forest');
      stage = switchBackdrop(stage, 1);
      expect(getCurrentBackdrop(stage)?.name).toBe('desert');
      stage = nextBackdrop(stage);
      expect(getCurrentBackdrop(stage)?.name).toBe('forest');
      stage = removeBackdropFromStage(stage, stage.backdrops[0].backdropId);
      expect(stage.backdrops).toHaveLength(1);
    }
  });
});
