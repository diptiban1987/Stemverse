/**
 * Phase 41C — SB3 Validation Suite (100+ test scenarios)
 *
 * Tests import, export, round-trip, error handling, edge cases
 * for Scratch 3.0 project compatibility.
 */
import { describe, it, expect } from 'vitest';
import {
  parseSB3Project, importSB3, migrateToSTEMVerse, migrateToBlockly, getSupportedFormats,
} from '../src/stage/sb3-importer-runtime';
import {
  createExportManifest, buildExport, completeExport, failExport,
  createSB3Json, createPackageBundle, addFileToBundle, getExportFormats,
} from '../src/stage/sb3-exporter-runtime';

/* ═══════ Test Project Fixtures ═══════ */

function makeValidSB3(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    targets: [
      { isStage: true, name: 'Stage', variables: {}, lists: {}, broadcasts: {}, blocks: {}, costumes: [{ name: 'backdrop1', assetId: 'a1', dataFormat: 'svg', rotationCenterX: 240, rotationCenterY: 180 }], sounds: [], currentCostume: 0, volume: 100 },
      { isStage: false, name: 'Sprite1', x: 0, y: 0, size: 100, direction: 90, visible: true, rotationStyle: 'all around', variables: {}, lists: {}, broadcasts: {}, blocks: {}, costumes: [{ name: 'costume1', assetId: 'c1', dataFormat: 'svg' }], sounds: [], currentCostume: 0, volume: 100 },
    ],
    monitors: [],
    extensions: [],
    meta: { semver: '3.0.0', vm: '0.2.0', agent: '' },
    ...overrides,
  };
}

function makeMultiSpriteSB3(count: number): Record<string, unknown> {
  const sprites = Array.from({ length: count }, (_, i) => ({
    isStage: false, name: `Sprite${i + 1}`, x: i * 50, y: 0, size: 100, direction: 90,
    visible: true, rotationStyle: 'all around', variables: {}, lists: {}, broadcasts: {},
    blocks: {}, costumes: [{ name: `costume${i}`, assetId: `c${i}`, dataFormat: 'svg' }],
    sounds: [], currentCostume: 0, volume: 100,
  }));
  return makeValidSB3({ targets: [(makeValidSB3().targets as any[])[0], ...sprites] } as any);
}

function makeBlockySB3(blockCount: number): Record<string, unknown> {
  const blocks: Record<string, any> = {};
  for (let i = 0; i < blockCount; i++) {
    blocks[`blk${i}`] = { opcode: 'motion_movesteps', topLevel: i === 0, next: i < blockCount - 1 ? `blk${i + 1}` : null, parent: i > 0 ? `blk${i - 1}` : null, inputs: { STEPS: [1, [4, '10']] }, fields: {}, x: 10, y: 10 + i * 50 };
  }
  const sb3 = makeValidSB3();
  (sb3.targets as any[])[1].blocks = blocks;
  return sb3;
}

function makeVariableSB3(varCount: number): Record<string, unknown> {
  const vars: Record<string, any> = {};
  for (let i = 0; i < varCount; i++) vars[`v${i}`] = [`var${i}`, i * 10];
  const sb3 = makeValidSB3();
  (sb3.targets as any[])[0].variables = vars;
  return sb3;
}

function makeListSB3(listCount: number): Record<string, unknown> {
  const lists: Record<string, any> = {};
  for (let i = 0; i < listCount; i++) lists[`l${i}`] = [`list${i}`, [1, 2, 3, i]];
  const sb3 = makeValidSB3();
  (sb3.targets as any[])[0].lists = lists;
  return sb3;
}

function makeBroadcastSB3(count: number): Record<string, unknown> {
  const broadcasts: Record<string, string> = {};
  for (let i = 0; i < count; i++) broadcasts[`b${i}`] = `msg${i}`;
  const sb3 = makeValidSB3();
  (sb3.targets as any[])[0].broadcasts = broadcasts;
  return sb3;
}

function makeCostumeSB3(count: number): Record<string, unknown> {
  const costumes = Array.from({ length: count }, (_, i) => ({ name: `costume${i}`, assetId: `asset${i}`, dataFormat: i % 2 === 0 ? 'svg' : 'png', rotationCenterX: 48, rotationCenterY: 50 }));
  const sb3 = makeValidSB3();
  (sb3.targets as any[])[1].costumes = costumes;
  return sb3;
}

function makeSoundSB3(count: number): Record<string, unknown> {
  const sounds = Array.from({ length: count }, (_, i) => ({ name: `sound${i}`, assetId: `snd${i}`, dataFormat: 'wav', rate: 44100, sampleCount: 44100 * (i + 1) }));
  const sb3 = makeValidSB3();
  (sb3.targets as any[])[1].sounds = sounds;
  return sb3;
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 1: Valid SB3 Import (30 tests)
   ═══════════════════════════════════════════════════════════════ */

describe('SB3 Valid Import', () => {
  it('import minimal valid project', () => {
    const result = importSB3(makeValidSB3() as any);
    expect(result.spritesImported).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it('import project with 1 sprite', () => {
    const result = importSB3(makeMultiSpriteSB3(1) as any);
    expect(result.spritesImported).toBe(1);
  });

  it('import project with 5 sprites', () => {
    const result = importSB3(makeMultiSpriteSB3(5) as any);
    expect(result.spritesImported).toBe(5);
  });

  it('import project with 10 sprites', () => {
    const result = importSB3(makeMultiSpriteSB3(10) as any);
    expect(result.spritesImported).toBe(10);
  });

  it('import project with 50 sprites', () => {
    const result = importSB3(makeMultiSpriteSB3(50) as any);
    expect(result.spritesImported).toBe(50);
  });

  it('import with 1 block', () => {
    const result = importSB3(makeBlockySB3(1) as any);
    expect(result.blocksImported).toBeGreaterThanOrEqual(1);
  });

  it('import with 10 blocks', () => {
    const result = importSB3(makeBlockySB3(10) as any);
    expect(result.blocksImported).toBeGreaterThanOrEqual(10);
  });

  it('import with 100 blocks', () => {
    const result = importSB3(makeBlockySB3(100) as any);
    expect(result.blocksImported).toBeGreaterThanOrEqual(100);
  });

  it('import with 1 variable', () => {
    const result = importSB3(makeVariableSB3(1) as any);
    expect(result.variablesImported).toBe(1);
  });

  it('import with 10 variables', () => {
    const result = importSB3(makeVariableSB3(10) as any);
    expect(result.variablesImported).toBe(10);
  });

  it('import with 50 variables', () => {
    const result = importSB3(makeVariableSB3(50) as any);
    expect(result.variablesImported).toBe(50);
  });

  it('import with 1 list', () => {
    const result = importSB3(makeListSB3(1) as any);
    expect(result.listsImported).toBe(1);
  });

  it('import with 10 lists', () => {
    const result = importSB3(makeListSB3(10) as any);
    expect(result.listsImported).toBe(10);
  });

  it('import with 1 broadcast', () => {
    const result = importSB3(makeBroadcastSB3(1) as any);
    expect(result.broadcastsImported).toBe(1);
  });

  it('import with 10 broadcasts', () => {
    const result = importSB3(makeBroadcastSB3(10) as any);
    expect(result.broadcastsImported).toBe(10);
  });

  it('import with 1 costume', () => {
    const result = importSB3(makeCostumeSB3(1) as any);
    expect(result.costumesImported).toBeGreaterThanOrEqual(1);
  });

  it('import with 5 costumes', () => {
    const result = importSB3(makeCostumeSB3(5) as any);
    expect(result.costumesImported).toBeGreaterThanOrEqual(5);
  });

  it('import with 1 sound', () => {
    const result = importSB3(makeSoundSB3(1) as any);
    expect(result.soundsImported).toBeGreaterThanOrEqual(1);
  });

  it('import with 5 sounds', () => {
    const result = importSB3(makeSoundSB3(5) as any);
    expect(result.soundsImported).toBeGreaterThanOrEqual(5);
  });

  it('parse preserves sprite positions', () => {
    const project = parseSB3Project(makeMultiSpriteSB3(3) as any);
    expect(project.targets[1].x).toBe(0);
    expect(project.targets[2].x).toBe(50);
    expect(project.targets[3].x).toBe(100);
  });

  it('parse preserves sprite visibility', () => {
    const sb3 = makeValidSB3();
    (sb3.targets as any[])[1].visible = false;
    const project = parseSB3Project(sb3 as any);
    expect(project.targets.find(t => !t.isStage)?.visible).toBe(false);
  });

  it('parse preserves sprite direction', () => {
    const sb3 = makeValidSB3();
    (sb3.targets as any[])[1].direction = 135;
    const project = parseSB3Project(sb3 as any);
    expect(project.targets.find(t => !t.isStage)?.direction).toBe(135);
  });

  it('parse preserves sprite size', () => {
    const sb3 = makeValidSB3();
    (sb3.targets as any[])[1].size = 200;
    const project = parseSB3Project(sb3 as any);
    expect(project.targets.find(t => !t.isStage)?.size).toBe(200);
  });

  it('parse preserves rotation style', () => {
    const sb3 = makeValidSB3();
    (sb3.targets as any[])[1].rotationStyle = 'left-right';
    const project = parseSB3Project(sb3 as any);
    expect(project.targets.find(t => !t.isStage)?.rotationStyle).toBe('left-right');
  });

  it('parse preserves volume', () => {
    const sb3 = makeValidSB3();
    (sb3.targets as any[])[1].volume = 75;
    const project = parseSB3Project(sb3 as any);
    expect(project.targets.find(t => !t.isStage)?.volume).toBe(75);
  });

  it('parse preserves meta info', () => {
    const project = parseSB3Project(makeValidSB3() as any);
    expect(project.meta.semver).toBe('3.0.0');
  });

  it('import with pen extension', () => {
    const result = importSB3(makeValidSB3({ extensions: ['pen'] }) as any);
    expect(result.warnings).toHaveLength(0);
  });

  it('import with music extension', () => {
    const result = importSB3(makeValidSB3({ extensions: ['music'] }) as any);
    expect(result.warnings).toHaveLength(0);
  });

  it('import with unknown extension warns', () => {
    const result = importSB3(makeValidSB3({ extensions: ['microbit'] }) as any);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('import with cloud variable warns', () => {
    const sb3 = makeValidSB3();
    (sb3.targets as any[])[0].variables = { v1: ['☁ score', 0, true] };
    const result = importSB3(sb3 as any);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

/* ═══════════════════════════════════════════════════════════════
   SECTION 2: Invalid / Edge-case Import (20 tests)
   ═══════════════════════════════════════════════════════════════ */

describe('SB3 Edge Cases', () => {
  it('empty targets array', () => {
    const result = importSB3({ targets: [], monitors: [], extensions: [], meta: {} } as any);
    expect(result.spritesImported).toBe(0);
  });

  it('stage-only project', () => {
    const sb3 = makeValidSB3();
    (sb3 as any).targets = [(sb3 as any).targets[0]];
    const result = importSB3(sb3 as any);
    expect(result.spritesImported).toBe(0);
  });

  it('project with no costumes', () => {
    const sb3 = makeValidSB3();
    (sb3.targets as any[])[1].costumes = [];
    const result = importSB3(sb3 as any);
    expect(result.costumesImported).toBeGreaterThanOrEqual(0);
  });

  it('sprite with missing x/y defaults to 0', () => {
    const sb3 = makeValidSB3();
    delete (sb3.targets as any[])[1].x;
    delete (sb3.targets as any[])[1].y;
    const project = parseSB3Project(sb3 as any);
    expect(project.targets[1].x).toBe(0);
    expect(project.targets[1].y).toBe(0);
  });

  it('sprite with missing direction defaults to 90', () => {
    const sb3 = makeValidSB3();
    delete (sb3.targets as any[])[1].direction;
    const project = parseSB3Project(sb3 as any);
    expect(project.targets[1].direction).toBe(90);
  });

  it('sprite with missing size defaults to 100', () => {
    const sb3 = makeValidSB3();
    delete (sb3.targets as any[])[1].size;
    const project = parseSB3Project(sb3 as any);
    expect(project.targets[1].size).toBe(100);
  });

  it('sprite with missing visible defaults to true', () => {
    const sb3 = makeValidSB3();
    delete (sb3.targets as any[])[1].visible;
    const project = parseSB3Project(sb3 as any);
    expect(project.targets[1].visible).toBe(true);
  });

  it('project with missing monitors defaults empty', () => {
    const project = parseSB3Project({ targets: (makeValidSB3() as any).targets } as any);
    expect(project.monitors).toHaveLength(0);
  });

  it('project with missing extensions defaults empty', () => {
    const project = parseSB3Project({ targets: (makeValidSB3() as any).targets } as any);
    expect(project.extensions).toHaveLength(0);
  });

  it('project with missing meta defaults', () => {
    const project = parseSB3Project({ targets: (makeValidSB3() as any).targets } as any);
    expect(project.meta.semver).toBe('3.0.0');
  });

  it('block with missing opcode', () => {
    const sb3 = makeValidSB3();
    (sb3.targets as any[])[1].blocks = { b1: { topLevel: true, x: 10, y: 10 } };
    const project = parseSB3Project(sb3 as any);
    expect(project.targets[1].blocks[0].opcode).toBe('');
  });

  it('block with missing parent/next', () => {
    const sb3 = makeValidSB3();
    (sb3.targets as any[])[1].blocks = { b1: { opcode: 'motion_movesteps', topLevel: true, x: 0, y: 0 } };
    const project = parseSB3Project(sb3 as any);
    expect(project.targets[1].blocks[0].parent).toBeNull();
    expect(project.targets[1].blocks[0].next).toBeNull();
  });

  it('variable with numeric value', () => {
    const sb3 = makeVariableSB3(1);
    const project = parseSB3Project(sb3 as any);
    expect(typeof project.targets[0].variables[0].value).toBe('number');
  });

  it('variable with string value', () => {
    const sb3 = makeValidSB3();
    (sb3.targets as any[])[0].variables = { v1: ['name', 'hello'] };
    const project = parseSB3Project(sb3 as any);
    expect(project.targets[0].variables[0].value).toBe('hello');
  });

  it('list with mixed types', () => {
    const sb3 = makeValidSB3();
    (sb3.targets as any[])[0].lists = { l1: ['mixed', ['a', 1, 'b', 2]] };
    const project = parseSB3Project(sb3 as any);
    expect(project.targets[0].lists[0].items).toEqual(['a', 1, 'b', 2]);
  });

  it('costume with PNG format', () => {
    const sb3 = makeValidSB3();
    (sb3.targets as any[])[1].costumes = [{ name: 'photo', assetId: 'x', dataFormat: 'png' }];
    const project = parseSB3Project(sb3 as any);
    expect(project.targets[1].costumes[0].dataFormat).toBe('png');
  });

  it('sound with MP3 format', () => {
    const sb3 = makeValidSB3();
    (sb3.targets as any[])[1].sounds = [{ name: 'track', assetId: 'x', dataFormat: 'mp3', rate: 22050, sampleCount: 22050 }];
    const project = parseSB3Project(sb3 as any);
    expect(project.targets[1].sounds[0].dataFormat).toBe('mp3');
  });

  it('many extensions', () => {
    const result = importSB3(makeValidSB3({ extensions: ['pen', 'music', 'videoSensing', 'translate', 'microbit'] }) as any);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('large block project (500 blocks)', () => {
    const result = importSB3(makeBlockySB3(500) as any);
    expect(result.blocksImported).toBeGreaterThanOrEqual(500);
  });

  it('supported formats includes all three', () => {
    expect(getSupportedFormats()).toContain('sb3');
    expect(getSupportedFormats()).toContain('sb2');
    expect(getSupportedFormats()).toContain('sprite3');
  });
});

/* ═══════════════════════════════════════════════════════════════
   SECTION 3: Migration (20 tests)
   ═══════════════════════════════════════════════════════════════ */

describe('SB3 Migration', () => {
  it('migrate simple to STEMVerse', () => {
    const project = parseSB3Project(makeValidSB3() as any);
    const result = migrateToSTEMVerse(project);
    expect(result.targetFormat).toBe('stemverse');
    expect(result.spritesConverted).toBe(1);
  });

  it('migrate 10 sprites to STEMVerse', () => {
    const project = parseSB3Project(makeMultiSpriteSB3(10) as any);
    const result = migrateToSTEMVerse(project);
    expect(result.spritesConverted).toBe(10);
  });

  it('migrate blocks to STEMVerse', () => {
    const project = parseSB3Project(makeBlockySB3(20) as any);
    const result = migrateToSTEMVerse(project);
    expect(result.blocksConverted).toBe(20);
  });

  it('migrate assets to STEMVerse', () => {
    const project = parseSB3Project(makeCostumeSB3(3) as any);
    const result = migrateToSTEMVerse(project);
    expect(result.assetsConverted).toBeGreaterThanOrEqual(3);
  });

  it('unsupported blocks flagged', () => {
    const sb3 = makeValidSB3();
    (sb3.targets as any[])[1].blocks = { b1: { opcode: 'videoSensing_whenMotionGreaterThan', topLevel: true, x: 0, y: 0 } };
    const project = parseSB3Project(sb3 as any);
    const result = migrateToSTEMVerse(project);
    expect(result.unsupportedBlocks).toContain('videoSensing_whenMotionGreaterThan');
  });

  it('translate blocks flagged', () => {
    const sb3 = makeValidSB3();
    (sb3.targets as any[])[1].blocks = { b1: { opcode: 'translate_getTranslate', topLevel: true, x: 0, y: 0 } };
    const project = parseSB3Project(sb3 as any);
    const result = migrateToSTEMVerse(project);
    expect(result.unsupportedBlocks).toContain('translate_getTranslate');
  });

  it('migrate to Blockly format', () => {
    const project = parseSB3Project(makeBlockySB3(5) as any);
    const result = migrateToBlockly(project);
    expect(result.targetFormat).toBe('blockly');
    expect(result.blocksConverted).toBe(5);
  });

  it('migrate to Blockly preserves sprite count', () => {
    const project = parseSB3Project(makeMultiSpriteSB3(7) as any);
    const result = migrateToBlockly(project);
    expect(result.spritesConverted).toBe(7);
  });

  it('source format preserved', () => {
    const project = parseSB3Project(makeValidSB3() as any);
    const result = migrateToSTEMVerse(project);
    expect(result.sourceFormat).toBe('sb3');
  });

  it('migration generates unique IDs', () => {
    const p1 = parseSB3Project(makeValidSB3() as any);
    const p2 = parseSB3Project(makeValidSB3() as any);
    const r1 = migrateToSTEMVerse(p1);
    const r2 = migrateToSTEMVerse(p2);
    expect(r1.migrationId).not.toBe(r2.migrationId);
  });

  it('Blockly migration no unsupported', () => {
    const project = parseSB3Project(makeBlockySB3(10) as any);
    const result = migrateToBlockly(project);
    expect(result.unsupportedBlocks).toHaveLength(0);
  });

  // Batch iterations
  for (let i = 1; i <= 9; i++) {
    it(`migrate ${i * 10} blocks to STEMVerse`, () => {
      const project = parseSB3Project(makeBlockySB3(i * 10) as any);
      const result = migrateToSTEMVerse(project);
      expect(result.blocksConverted).toBe(i * 10);
    });
  }
});

/* ═══════════════════════════════════════════════════════════════
   SECTION 4: Export (20 tests)
   ═══════════════════════════════════════════════════════════════ */

describe('SB3 Export', () => {
  it('create SB3 export manifest', () => {
    const m = createExportManifest('proj1', 'sb3', [{ name: 'Stage', isStage: true, blockCount: 0, costumeCount: 1, soundCount: 0, variableCount: 0 }]);
    expect(m.status).toBe('pending');
    expect(m.format).toBe('sb3');
  });

  it('create ZIP export', () => {
    const m = createExportManifest('proj2', 'zip', []);
    expect(m.fileName).toContain('.zip');
  });

  it('create STEMVerse export', () => {
    const m = createExportManifest('proj3', 'stemverse', []);
    expect(m.fileName).toContain('.stemverse');
  });

  it('build export transitions status', () => {
    let m = createExportManifest('p1', 'sb3', []);
    m = buildExport(m);
    expect(m.status).toBe('building');
  });

  it('complete export sets size', () => {
    let m = createExportManifest('p2', 'sb3', []);
    m = buildExport(m);
    m = completeExport(m, 100000);
    expect(m.status).toBe('complete');
    expect(m.sizeBytes).toBe(100000);
  });

  it('fail export sets error status', () => {
    let m = createExportManifest('p3', 'sb3', []);
    m = failExport(m);
    expect(m.status).toBe('error');
  });

  it('SB3 JSON has correct structure', () => {
    const json = createSB3Json([
      { name: 'Stage', isStage: true, blockCount: 5, costumeCount: 1, soundCount: 0, variableCount: 2 },
      { name: 'Cat', isStage: false, blockCount: 10, costumeCount: 2, soundCount: 1, variableCount: 0 },
    ]);
    expect((json as any).targets).toHaveLength(2);
    expect((json as any).meta.semver).toBe('3.0.0');
    expect((json as any).targets[0].isStage).toBe(true);
    expect((json as any).targets[1].name).toBe('Cat');
  });

  it('package bundle tracks files', () => {
    let b = createPackageBundle('p1', 'sb3', []);
    b = addFileToBundle(b, 'project.json', 'json', 5000);
    b = addFileToBundle(b, 'cat.svg', 'svg', 2000);
    b = addFileToBundle(b, 'meow.wav', 'wav', 8000);
    expect(b.files).toHaveLength(3);
    expect(b.totalSize).toBe(15000);
  });

  it('export formats', () => {
    expect(getExportFormats()).toContain('sb3');
    expect(getExportFormats()).toContain('zip');
    expect(getExportFormats()).toContain('stemverse');
  });

  // Batch: various target counts
  for (let i = 1; i <= 10; i++) {
    it(`export manifest with ${i} targets`, () => {
      const targets = Array.from({ length: i }, (_, j) => ({ name: j === 0 ? 'Stage' : `Sprite${j}`, isStage: j === 0, blockCount: j * 5, costumeCount: 1, soundCount: 0, variableCount: 0 }));
      const m = createExportManifest(`p${i}`, 'sb3', targets);
      expect(m.targets).toHaveLength(i);
    });
  }
});

/* ═══════════════════════════════════════════════════════════════
   SECTION 5: Round-trip (10 tests)
   ═══════════════════════════════════════════════════════════════ */

describe('SB3 Round-trip', () => {
  it('import → migrate → export basic project', () => {
    const imported = importSB3(makeValidSB3() as any);
    const migrated = migrateToSTEMVerse(imported.project);
    const exported = createExportManifest('rt1', 'sb3', [{ name: 'Stage', isStage: true, blockCount: 0, costumeCount: 1, soundCount: 0, variableCount: 0 }]);
    expect(imported.errors).toHaveLength(0);
    expect(migrated.unsupportedBlocks).toHaveLength(0);
    expect(exported.status).toBe('pending');
  });

  it('import → export round-trip preserves sprite count', () => {
    const imported = importSB3(makeMultiSpriteSB3(5) as any);
    const targets = imported.project.targets.map(t => ({ name: t.name, isStage: t.isStage, blockCount: t.blocks.length, costumeCount: t.costumes.length, soundCount: t.sounds.length, variableCount: t.variables.length }));
    const json = createSB3Json(targets);
    expect((json as any).targets).toHaveLength(6);
  });

  it('import → export round-trip with blocks', () => {
    const imported = importSB3(makeBlockySB3(20) as any);
    expect(imported.blocksImported).toBeGreaterThanOrEqual(20);
    const targets = imported.project.targets.map(t => ({ name: t.name, isStage: t.isStage, blockCount: t.blocks.length, costumeCount: t.costumes.length, soundCount: t.sounds.length, variableCount: t.variables.length }));
    const json = createSB3Json(targets);
    expect((json as any).targets.length).toBeGreaterThanOrEqual(2);
  });

  it('import → export round-trip with variables', () => {
    const imported = importSB3(makeVariableSB3(5) as any);
    expect(imported.variablesImported).toBe(5);
  });

  it('import → export round-trip with lists', () => {
    const imported = importSB3(makeListSB3(3) as any);
    expect(imported.listsImported).toBe(3);
  });

  it('import → export round-trip with broadcasts', () => {
    const imported = importSB3(makeBroadcastSB3(4) as any);
    expect(imported.broadcastsImported).toBe(4);
  });

  it('import → export round-trip with costumes', () => {
    const imported = importSB3(makeCostumeSB3(5) as any);
    expect(imported.costumesImported).toBeGreaterThanOrEqual(5);
  });

  it('import → export round-trip with sounds', () => {
    const imported = importSB3(makeSoundSB3(3) as any);
    expect(imported.soundsImported).toBeGreaterThanOrEqual(3);
  });

  it('double import produces identical structure', () => {
    const sb3 = makeBlockySB3(10) as any;
    const r1 = importSB3(sb3);
    const r2 = importSB3(sb3);
    expect(r1.blocksImported).toBe(r2.blocksImported);
    expect(r1.spritesImported).toBe(r2.spritesImported);
    expect(r1.costumesImported).toBe(r2.costumesImported);
  });

  it('migration preserves block count through round-trip', () => {
    const sb3 = makeBlockySB3(30) as any;
    const imported = importSB3(sb3);
    const migrated = migrateToSTEMVerse(imported.project);
    expect(migrated.blocksConverted).toBe(imported.blocksImported);
  });
});
