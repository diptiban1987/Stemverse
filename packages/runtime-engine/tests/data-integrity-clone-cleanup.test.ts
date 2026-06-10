import { describe, it, expect, beforeEach } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import {
  SpriteState,
  StageState,
  CostumeData,
  SoundData,
  RuntimeComponent,
  RuntimeConnection,
  RuntimePin,
} from '../src/types';
import { resetThreadCounter } from '../src/runtime/execution-context';

function makeSprite(id: string, name: string, overrides: Partial<SpriteState> = {}): SpriteState {
  return {
    id,
    name,
    isStage: false,
    variables: {},
    lists: {},
    costumes: [],
    currentCostumeIndex: 0,
    sounds: [],
    volume: 100,
    scripts: [],
    x: 0,
    y: 0,
    direction: 90,
    visible: true,
    size: 100,
    draggable: false,
    rotationStyle: 'all around',
    ...overrides,
  };
}

function makeStage(overrides: Partial<StageState> = {}): StageState {
  return {
    id: 'stage',
    name: 'Stage',
    isStage: true,
    variables: {},
    lists: {},
    costumes: [],
    currentCostumeIndex: 0,
    sounds: [],
    volume: 100,
    scripts: [],
    tempo: 60,
    videoState: 'off',
    ...overrides,
  };
}

function createRuntime(): BaseRuntime {
  const rt = new BaseRuntime();
  rt.initialize();
  resetThreadCounter();
  return rt;
}

// ═══════════════════════════════════════════════════════════════════════
// PRIORITY 1: Asset Restoration Round-Trip
// ═══════════════════════════════════════════════════════════════════════

describe('Phase 7V.1 — Asset Restoration Round-Trip', () => {
  it('restores sprite costumes after export→import', () => {
    const rt = createRuntime();
    const costumes: CostumeData[] = [
      { id: 'c1', name: 'cat', type: 'costume', assetId: 'a1', dataFormat: 'svg' },
      { id: 'c2', name: 'dog', type: 'costume', assetId: 'a2', dataFormat: 'png' },
    ];
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', { costumes }));
    rt.registerCostume(costumes[0]);
    rt.registerCostume(costumes[1]);
    const p = rt.exportProject();
    const rt2 = createRuntime();
    rt2.importProject(p);
    const sprite = Array.from((rt2 as any).targets.values()).find((t: any) => t.id === 's1') as SpriteState;
    expect(sprite.costumes.length).toBe(2);
    expect(sprite.costumes[0].name).toBe('cat');
    expect(sprite.costumes[1].name).toBe('dog');
  });

  it('restores sprite sounds after export→import', () => {
    const rt = createRuntime();
    const sounds: SoundData[] = [
      { id: 'snd1', name: 'meow', type: 'sound', assetId: 'sa1', dataFormat: 'wav' },
      { id: 'snd2', name: 'bark', type: 'sound', assetId: 'sa2', dataFormat: 'mp3' },
    ];
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', { sounds }));
    rt.registerSound(sounds[0]);
    rt.registerSound(sounds[1]);
    const p = rt.exportProject();
    const rt2 = createRuntime();
    rt2.importProject(p);
    const sprite = Array.from((rt2 as any).targets.values()).find((t: any) => t.id === 's1') as SpriteState;
    expect(sprite.sounds.length).toBe(2);
    expect(sprite.sounds[0].name).toBe('meow');
    expect(sprite.sounds[1].name).toBe('bark');
  });

  it('restores stage costumes after export→import', () => {
    const rt = createRuntime();
    const costumes: CostumeData[] = [
      { id: 'sc1', name: 'stage-costume', type: 'costume', assetId: 'sa1', dataFormat: 'svg' },
    ];
    rt.addTarget(makeStage({ costumes }));
    rt.registerCostume(costumes[0]);
    const p = rt.exportProject();
    const rt2 = createRuntime();
    rt2.importProject(p);
    const stage = Array.from((rt2 as any).targets.values()).find((t: any) => t.isStage) as StageState;
    expect(stage.costumes.length).toBe(1);
    expect(stage.costumes[0].name).toBe('stage-costume');
  });

  it('restores stage sounds after export→import', () => {
    const rt = createRuntime();
    const sounds: SoundData[] = [
      { id: 'ss1', name: 'bgm', type: 'sound', assetId: 'sa1', dataFormat: 'mp3' },
    ];
    rt.addTarget(makeStage({ sounds }));
    rt.registerSound(sounds[0]);
    const p = rt.exportProject();
    const rt2 = createRuntime();
    rt2.importProject(p);
    const stage = Array.from((rt2 as any).targets.values()).find((t: any) => t.isStage) as StageState;
    expect(stage.sounds.length).toBe(1);
    expect(stage.sounds[0].name).toBe('bgm');
  });

  it('survives export→import→export with costumes and sounds', () => {
    const rt = createRuntime();
    const costumes: CostumeData[] = [
      { id: 'c1', name: 'cat', type: 'costume', assetId: 'a1', dataFormat: 'svg' },
    ];
    const sounds: SoundData[] = [
      { id: 'snd1', name: 'meow', type: 'sound', assetId: 'sa1', dataFormat: 'wav' },
    ];
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', { costumes, sounds }));
    rt.registerCostume(costumes[0]);
    rt.registerSound(sounds[0]);
    const p1 = rt.exportProject();
    const rt2 = createRuntime();
    rt2.importProject(p1);
    const p2 = rt2.exportProject();
    const cat1 = p1.targets.find(t => t.id === 's1')!;
    const cat2 = p2.targets.find(t => t.id === 's1')!;
    expect(cat1.costumes!.length).toBe(1);
    expect(cat2.costumes!.length).toBe(1);
    expect(cat1.costumes![0].name).toBe(cat2.costumes![0].name);
    expect(cat1.sounds!.length).toBe(1);
    expect(cat2.sounds!.length).toBe(1);
    expect(cat1.sounds![0].name).toBe(cat2.sounds![0].name);
  });

  it('restores currentCostumeIndex after export→import with costumes', () => {
    const rt = createRuntime();
    const costumes: CostumeData[] = [
      { id: 'c1', name: 'idle', type: 'costume', assetId: 'a1', dataFormat: 'svg' },
      { id: 'c2', name: 'walk', type: 'costume', assetId: 'a2', dataFormat: 'svg' },
    ];
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', { costumes, currentCostumeIndex: 1 }));
    const p = rt.exportProject();
    const rt2 = createRuntime();
    rt2.importProject(p);
    const sprite = Array.from((rt2 as any).targets.values()).find((t: any) => t.id === 's1') as SpriteState;
    expect(sprite.currentCostumeIndex).toBe(1);
    expect(sprite.costumes.length).toBe(2);
  });

  it('handles empty costumes array correctly on round-trip', () => {
    const rt = createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', { costumes: [] }));
    const p = rt.exportProject();
    const rt2 = createRuntime();
    rt2.importProject(p);
    const sprite = Array.from((rt2 as any).targets.values()).find((t: any) => t.id === 's1') as SpriteState;
    expect(sprite.costumes).toEqual([]);
  });

  it('isolation: modifying imported costumes does not affect original', () => {
    const rt = createRuntime();
    const costumes: CostumeData[] = [
      { id: 'c1', name: 'cat', type: 'costume', assetId: 'a1', dataFormat: 'svg' },
    ];
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', { costumes }));
    rt.registerCostume(costumes[0]);
    const p = rt.exportProject();
    const rt2 = createRuntime();
    rt2.importProject(p);
    const sprite2 = Array.from((rt2 as any).targets.values()).find((t: any) => t.id === 's1') as SpriteState;
    sprite2.costumes[0].name = 'modified';
    const sprite1 = Array.from((rt as any).targets.values()).find((t: any) => t.id === 's1') as SpriteState;
    expect(sprite1.costumes[0].name).toBe('cat');
  });

  it('export→import→export preserves asset bindings for multi-costume sprites', () => {
    const rt = createRuntime();
    const costumes: CostumeData[] = [
      { id: 'c1', name: 'idle', type: 'costume', assetId: 'a1', dataFormat: 'svg' },
      { id: 'c2', name: 'walk', type: 'costume', assetId: 'a2', dataFormat: 'svg' },
      { id: 'c3', name: 'jump', type: 'costume', assetId: 'a3', dataFormat: 'png' },
    ];
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', { costumes, currentCostumeIndex: 2 }));
    costumes.forEach(c => rt.registerCostume(c));
    const p1 = rt.exportProject();
    const rt2 = createRuntime();
    rt2.importProject(p1);
    const p2 = rt2.exportProject();
    const t1 = p1.targets.find(t => t.id === 's1')!;
    const t2 = p2.targets.find(t => t.id === 's1')!;
    expect(t1.costumes!.length).toBe(3);
    expect(t2.costumes!.length).toBe(3);
    expect(t2.currentCostumeIndex).toBe(2);
    expect(t2.costumes!.map(c => c.name)).toEqual(['idle', 'walk', 'jump']);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// PRIORITY 2: Clone Registry Cleanup
// ═══════════════════════════════════════════════════════════════════════

describe('Phase 7V.1 — Clone Registry Cleanup', () => {
  it('removeTarget cleans up pins from pinRegistry', () => {
    const rt = createRuntime();
    const pins: RuntimePin[] = [
      { id: 'p1', name: 'OUT', direction: 'OUTPUT', signalState: false },
    ];
    const components: RuntimeComponent[] = [
      { id: 'comp1', type: 'LED', name: 'Led', enabled: true, metadata: {}, deviceState: {}, pins },
    ];
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', { components }));
    rt.registerComponent(components[0]);
    rt.registerPin(pins[0]);
    expect((rt as any).pinRegistry.size).toBe(1);
    rt.removeTarget('s1');
    expect((rt as any).pinRegistry.size).toBe(0);
  });

  it('removeTarget cleans up components from componentRegistry', () => {
    const rt = createRuntime();
    const components: RuntimeComponent[] = [
      { id: 'comp1', type: 'LED', name: 'Led', enabled: true, metadata: {}, deviceState: {} },
    ];
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', { components }));
    rt.registerComponent(components[0]);
    expect((rt as any).componentRegistry.size).toBe(1);
    rt.removeTarget('s1');
    expect((rt as any).componentRegistry.size).toBe(0);
  });

  it('removeTarget cleans up connections referencing target components', () => {
    const rt = createRuntime();
    const pins1: RuntimePin[] = [
      { id: 'p1', name: 'OUT', direction: 'OUTPUT', signalState: false },
    ];
    const pins2: RuntimePin[] = [
      { id: 'p2', name: 'IN', direction: 'INPUT', signalState: false },
    ];
    const components1: RuntimeComponent[] = [
      { id: 'comp1', type: 'LED', name: 'Led', enabled: true, metadata: {}, deviceState: {}, pins: pins1 },
    ];
    const components2: RuntimeComponent[] = [
      { id: 'comp2', type: 'BUTTON', name: 'Btn', enabled: true, metadata: {}, deviceState: {}, pins: pins2 },
    ];
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', { components: components1 }));
    rt.addTarget(makeSprite('s2', 'Dog', { components: components2 }));
    rt.registerComponent(components1[0]);
    rt.registerComponent(components2[0]);
    rt.registerPin(pins1[0]);
    rt.registerPin(pins2[0]);
    const conn: RuntimeConnection = {
      id: 'conn1',
      sourceComponentId: 'comp1',
      sourcePinId: 'p1',
      targetComponentId: 'comp2',
      targetPinId: 'p2',
      enabled: true,
    };
    rt.registerConnection(conn);
    expect((rt as any).connectionRegistry.size).toBe(1);
    rt.removeTarget('s1');
    expect((rt as any).connectionRegistry.size).toBe(0);
  });

  it('removeTarget cleans up wire layouts for removed connections', () => {
    const rt = createRuntime();
    const pins1: RuntimePin[] = [
      { id: 'p1', name: 'OUT', direction: 'OUTPUT', signalState: false },
    ];
    const pins2: RuntimePin[] = [
      { id: 'p2', name: 'IN', direction: 'INPUT', signalState: false },
    ];
    const components1: RuntimeComponent[] = [
      { id: 'comp1', type: 'LED', name: 'Led', enabled: true, metadata: {}, deviceState: {}, pins: pins1 },
    ];
    const components2: RuntimeComponent[] = [
      { id: 'comp2', type: 'BUTTON', name: 'Btn', enabled: true, metadata: {}, deviceState: {}, pins: pins2 },
    ];
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', { components: components1 }));
    rt.addTarget(makeSprite('s2', 'Dog', { components: components2 }));
    rt.registerComponent(components1[0]);
    rt.registerComponent(components2[0]);
    rt.registerPin(pins1[0]);
    rt.registerPin(pins2[0]);
    const conn: RuntimeConnection = {
      id: 'conn1',
      sourceComponentId: 'comp1',
      sourcePinId: 'p1',
      targetComponentId: 'comp2',
      targetPinId: 'p2',
      enabled: true,
    };
    rt.registerConnection(conn);
    rt.registerWireLayout({ connectionId: 'conn1', points: [{ x: 0, y: 0 }, { x: 100, y: 100 }], color: '#ff0000', thickness: 2, visible: true });
    expect((rt as any).wireLayoutRegistry.size).toBe(1);
    rt.removeTarget('s1');
    expect((rt as any).wireLayoutRegistry.size).toBe(0);
  });

  it('removeTarget cleans up workspace layouts for removed components', () => {
    const rt = createRuntime();
    const components: RuntimeComponent[] = [
      { id: 'comp1', type: 'LED', name: 'Led', enabled: true, metadata: {}, deviceState: {} },
    ];
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', { components }));
    rt.registerComponent(components[0]);
    rt.registerWorkspaceLayout({ componentId: 'comp1', transform: { x: 10, y: 20, scale: 1, rotation: 0 }, zIndex: 0 });
    expect((rt as any).workspaceLayouts.size).toBe(1);
    rt.removeTarget('s1');
    expect((rt as any).workspaceLayouts.size).toBe(0);
  });

  it('removeTarget does not remove connections from other targets', () => {
    const rt = createRuntime();
    const pins1: RuntimePin[] = [
      { id: 'p1', name: 'OUT', direction: 'OUTPUT', signalState: false },
    ];
    const pins2: RuntimePin[] = [
      { id: 'p2', name: 'IN', direction: 'INPUT', signalState: false },
    ];
    const pins3: RuntimePin[] = [
      { id: 'p3', name: 'OUT', direction: 'OUTPUT', signalState: false },
    ];
    const pins4: RuntimePin[] = [
      { id: 'p4', name: 'IN', direction: 'INPUT', signalState: false },
    ];
    const components1: RuntimeComponent[] = [
      { id: 'comp1', type: 'LED', name: 'Led1', enabled: true, metadata: {}, deviceState: {}, pins: pins1 },
    ];
    const components2: RuntimeComponent[] = [
      { id: 'comp2', type: 'BUTTON', name: 'Btn1', enabled: true, metadata: {}, deviceState: {}, pins: pins2 },
    ];
    const components3: RuntimeComponent[] = [
      { id: 'comp3', type: 'LED', name: 'Led2', enabled: true, metadata: {}, deviceState: {}, pins: pins3 },
    ];
    const components4: RuntimeComponent[] = [
      { id: 'comp4', type: 'BUTTON', name: 'Btn2', enabled: true, metadata: {}, deviceState: {}, pins: pins4 },
    ];
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', { components: components1 }));
    rt.addTarget(makeSprite('s2', 'Dog', { components: components2 }));
    rt.addTarget(makeSprite('s3', 'Bird', { components: components3 }));
    rt.addTarget(makeSprite('s4', 'Fish', { components: components4 }));
    rt.registerComponent(components1[0]);
    rt.registerComponent(components2[0]);
    rt.registerComponent(components3[0]);
    rt.registerComponent(components4[0]);
    rt.registerPin(pins1[0]);
    rt.registerPin(pins2[0]);
    rt.registerPin(pins3[0]);
    rt.registerPin(pins4[0]);
    rt.registerConnection({ id: 'conn1', sourceComponentId: 'comp1', sourcePinId: 'p1', targetComponentId: 'comp2', targetPinId: 'p2', enabled: true });
    rt.registerConnection({ id: 'conn2', sourceComponentId: 'comp3', sourcePinId: 'p3', targetComponentId: 'comp4', targetPinId: 'p4', enabled: true });
    expect((rt as any).connectionRegistry.size).toBe(2);
    rt.removeTarget('s1');
    expect((rt as any).connectionRegistry.size).toBe(1);
    expect((rt as any).connectionRegistry.has('conn2')).toBe(true);
  });

  it('deleteClone cleans up clone pins from pinRegistry', () => {
    const rt = createRuntime();
    const pins: RuntimePin[] = [
      { id: 'p1', name: 'OUT', direction: 'OUTPUT', signalState: false },
    ];
    const components: RuntimeComponent[] = [
      { id: 'comp1', type: 'LED', name: 'Led', enabled: true, metadata: {}, deviceState: {}, pins },
    ];
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', { components }));
    rt.registerComponent(components[0]);
    rt.registerPin(pins[0]);
    rt.createCloneOf('s1');
    const clone = Array.from((rt as any).targets.values()).find((t: any) => t.isClone) as SpriteState;
    expect(clone).toBeDefined();
    expect((rt as any).pinRegistry.size).toBeGreaterThan(1);
    rt.deleteClone(clone.id);
    expect((rt as any).pinRegistry.size).toBe(1);
  });

  it('deleteClone cleans up clone components from componentRegistry', () => {
    const rt = createRuntime();
    const components: RuntimeComponent[] = [
      { id: 'comp1', type: 'LED', name: 'Led', enabled: true, metadata: {}, deviceState: {} },
    ];
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', { components }));
    rt.registerComponent(components[0]);
    rt.createCloneOf('s1');
    const clone = Array.from((rt as any).targets.values()).find((t: any) => t.isClone) as SpriteState;
    expect(clone).toBeDefined();
    const beforeCount = (rt as any).componentRegistry.size;
    rt.deleteClone(clone.id);
    expect((rt as any).componentRegistry.size).toBeLessThan(beforeCount);
  });

  it('removeTarget on parent cleans up child clone registries', () => {
    const rt = createRuntime();
    const pins: RuntimePin[] = [
      { id: 'p1', name: 'OUT', direction: 'OUTPUT', signalState: false },
    ];
    const components: RuntimeComponent[] = [
      { id: 'comp1', type: 'LED', name: 'Led', enabled: true, metadata: {}, deviceState: {}, pins },
    ];
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', { components }));
    rt.registerComponent(components[0]);
    rt.registerPin(pins[0]);
    rt.createCloneOf('s1');
    rt.createCloneOf('s1');
    expect((rt as any).pinRegistry.size).toBeGreaterThan(1);
    rt.removeTarget('s1');
    expect((rt as any).pinRegistry.size).toBe(0);
    expect((rt as any).componentRegistry.size).toBe(0);
  });

  it('removeTarget with no components does not corrupt registries', () => {
    const rt = createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat'));
    rt.registerComponent({ id: 'comp_other', type: 'LED', name: 'Other', enabled: true, metadata: {}, deviceState: {} });
    expect((rt as any).componentRegistry.size).toBe(1);
    rt.removeTarget('s1');
    expect((rt as any).componentRegistry.size).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Registry Count Verification
// ═══════════════════════════════════════════════════════════════════════

describe('Phase 7V.1 — Registry Count Verification', () => {
  it('all registries are empty after initialize', () => {
    const rt = createRuntime();
    const pins: RuntimePin[] = [
      { id: 'p1', name: 'OUT', direction: 'OUTPUT', signalState: false },
    ];
    const components: RuntimeComponent[] = [
      { id: 'comp1', type: 'LED', name: 'Led', enabled: true, metadata: {}, deviceState: {}, pins },
    ];
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', { components }));
    rt.registerComponent(components[0]);
    rt.registerPin(pins[0]);
    rt.registerConnection({ id: 'conn1', sourceComponentId: 'comp1', sourcePinId: 'p1', targetComponentId: 'comp2', targetPinId: 'p2', enabled: true });
    rt.registerWorkspaceLayout({ componentId: 'comp1', transform: { x: 0, y: 0, scale: 1, rotation: 0 }, zIndex: 0 });
    rt.registerWireLayout({ connectionId: 'conn1', points: [], color: '#000', thickness: 1, visible: true });
    rt.initialize();
    expect((rt as any).componentRegistry.size).toBe(0);
    expect((rt as any).pinRegistry.size).toBe(0);
    expect((rt as any).connectionRegistry.size).toBe(0);
    expect((rt as any).workspaceLayouts.size).toBe(0);
    expect((rt as any).wireLayoutRegistry.size).toBe(0);
  });

  it('registry counts are consistent after full target removal', () => {
    const rt = createRuntime();
    const pins1: RuntimePin[] = [
      { id: 'p1', name: 'OUT', direction: 'OUTPUT', signalState: false },
    ];
    const pins2: RuntimePin[] = [
      { id: 'p2', name: 'IN', direction: 'INPUT', signalState: false },
    ];
    const components1: RuntimeComponent[] = [
      { id: 'comp1', type: 'LED', name: 'Led', enabled: true, metadata: {}, deviceState: {}, pins: pins1 },
    ];
    const components2: RuntimeComponent[] = [
      { id: 'comp2', type: 'BUTTON', name: 'Btn', enabled: true, metadata: {}, deviceState: {}, pins: pins2 },
    ];
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', { components: components1 }));
    rt.addTarget(makeSprite('s2', 'Dog', { components: components2 }));
    rt.registerComponent(components1[0]);
    rt.registerComponent(components2[0]);
    rt.registerPin(pins1[0]);
    rt.registerPin(pins2[0]);
    rt.registerConnection({ id: 'conn1', sourceComponentId: 'comp1', sourcePinId: 'p1', targetComponentId: 'comp2', targetPinId: 'p2', enabled: true });
    rt.registerWorkspaceLayout({ componentId: 'comp1', transform: { x: 0, y: 0, scale: 1, rotation: 0 }, zIndex: 0 });
    rt.registerWorkspaceLayout({ componentId: 'comp2', transform: { x: 50, y: 50, scale: 1, rotation: 0 }, zIndex: 1 });
    rt.registerWireLayout({ connectionId: 'conn1', points: [], color: '#000', thickness: 1, visible: true });
    rt.removeTarget('s1');
    rt.removeTarget('s2');
    expect((rt as any).componentRegistry.size).toBe(0);
    expect((rt as any).pinRegistry.size).toBe(0);
    expect((rt as any).connectionRegistry.size).toBe(0);
    expect((rt as any).workspaceLayouts.size).toBe(0);
    expect((rt as any).wireLayoutRegistry.size).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Orphan Cleanup Verification
// ═══════════════════════════════════════════════════════════════════════

describe('Phase 7V.1 — Orphan Cleanup Verification', () => {
  it('no orphan pins remain after removing target with components', () => {
    const rt = createRuntime();
    const pins: RuntimePin[] = [
      { id: 'p1', name: 'OUT', direction: 'OUTPUT', signalState: false },
      { id: 'p2', name: 'IN', direction: 'INPUT', signalState: false },
    ];
    const components: RuntimeComponent[] = [
      { id: 'comp1', type: 'LED', name: 'Led', enabled: true, metadata: {}, deviceState: {}, pins },
    ];
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', { components }));
    rt.registerComponent(components[0]);
    rt.registerPin(pins[0]);
    rt.registerPin(pins[1]);
    rt.removeTarget('s1');
    expect(rt.getPin('p1')).toBeUndefined();
    expect(rt.getPin('p2')).toBeUndefined();
  });

  it('no orphan connections remain after removing one endpoint target', () => {
    const rt = createRuntime();
    const pins1: RuntimePin[] = [
      { id: 'p1', name: 'OUT', direction: 'OUTPUT', signalState: false },
    ];
    const pins2: RuntimePin[] = [
      { id: 'p2', name: 'IN', direction: 'INPUT', signalState: false },
    ];
    const components1: RuntimeComponent[] = [
      { id: 'comp1', type: 'LED', name: 'Led', enabled: true, metadata: {}, deviceState: {}, pins: pins1 },
    ];
    const components2: RuntimeComponent[] = [
      { id: 'comp2', type: 'BUTTON', name: 'Btn', enabled: true, metadata: {}, deviceState: {}, pins: pins2 },
    ];
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', { components: components1 }));
    rt.addTarget(makeSprite('s2', 'Dog', { components: components2 }));
    rt.registerComponent(components1[0]);
    rt.registerComponent(components2[0]);
    rt.registerPin(pins1[0]);
    rt.registerPin(pins2[0]);
    rt.registerConnection({ id: 'conn1', sourceComponentId: 'comp1', sourcePinId: 'p1', targetComponentId: 'comp2', targetPinId: 'p2', enabled: true });
    rt.removeTarget('s1');
    expect(rt.getConnection('conn1')).toBeUndefined();
  });

  it('no orphan wire layouts remain after removing connection', () => {
    const rt = createRuntime();
    const pins1: RuntimePin[] = [
      { id: 'p1', name: 'OUT', direction: 'OUTPUT', signalState: false },
    ];
    const pins2: RuntimePin[] = [
      { id: 'p2', name: 'IN', direction: 'INPUT', signalState: false },
    ];
    const components1: RuntimeComponent[] = [
      { id: 'comp1', type: 'LED', name: 'Led', enabled: true, metadata: {}, deviceState: {}, pins: pins1 },
    ];
    const components2: RuntimeComponent[] = [
      { id: 'comp2', type: 'BUTTON', name: 'Btn', enabled: true, metadata: {}, deviceState: {}, pins: pins2 },
    ];
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', { components: components1 }));
    rt.addTarget(makeSprite('s2', 'Dog', { components: components2 }));
    rt.registerComponent(components1[0]);
    rt.registerComponent(components2[0]);
    rt.registerPin(pins1[0]);
    rt.registerPin(pins2[0]);
    rt.registerConnection({ id: 'conn1', sourceComponentId: 'comp1', sourcePinId: 'p1', targetComponentId: 'comp2', targetPinId: 'p2', enabled: true });
    rt.registerWireLayout({ connectionId: 'conn1', points: [{ x: 0, y: 0 }, { x: 100, y: 100 }], color: '#000', thickness: 2, visible: true });
    rt.removeTarget('s1');
    expect(rt.getWireLayout('conn1')).toBeUndefined();
  });

  it('no orphan workspace layouts remain after removing target with components', () => {
    const rt = createRuntime();
    const components: RuntimeComponent[] = [
      { id: 'comp1', type: 'LED', name: 'Led', enabled: true, metadata: {}, deviceState: {} },
    ];
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', { components }));
    rt.registerComponent(components[0]);
    rt.registerWorkspaceLayout({ componentId: 'comp1', transform: { x: 10, y: 20, scale: 1, rotation: 0 }, zIndex: 0 });
    rt.removeTarget('s1');
    expect(rt.getWorkspaceLayout('comp1')).toBeUndefined();
  });

  it('no orphan components remain after removing target', () => {
    const rt = createRuntime();
    const components: RuntimeComponent[] = [
      { id: 'comp1', type: 'LED', name: 'Led', enabled: true, metadata: {}, deviceState: {} },
    ];
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', { components }));
    rt.registerComponent(components[0]);
    rt.removeTarget('s1');
    expect(rt.getComponent('comp1')).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// initialize() Synchronous Conversion
// ═══════════════════════════════════════════════════════════════════════

describe('Phase 7V.1 — initialize() Synchronous', () => {
  it('initialize returns void (not a Promise)', () => {
    const rt = new BaseRuntime();
    const result = rt.initialize();
    expect(result).toBeUndefined();
  });

  it('initialize cleans all registries synchronously', () => {
    const rt = createRuntime();
    const components: RuntimeComponent[] = [
      { id: 'comp1', type: 'LED', name: 'Led', enabled: true, metadata: {}, deviceState: {} },
    ];
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', { components }));
    rt.registerComponent(components[0]);
    rt.registerPin({ id: 'p1', name: 'OUT', direction: 'OUTPUT', signalState: false });
    rt.registerConnection({ id: 'conn1', sourceComponentId: 'comp1', sourcePinId: 'p1', targetComponentId: 'comp2', targetPinId: 'p2', enabled: true });
    rt.initialize();
    expect((rt as any).targets.size).toBe(0);
    expect((rt as any).componentRegistry.size).toBe(0);
    expect((rt as any).pinRegistry.size).toBe(0);
    expect((rt as any).connectionRegistry.size).toBe(0);
  });
});
