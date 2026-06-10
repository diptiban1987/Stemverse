import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { InMemoryRendererAdapter } from '../src/stage/renderer-adapter';
import { SpriteState, StageState, ASTBlock, ASTScript } from '../src/types';
import { resetThreadCounter } from '../src/runtime/execution-context';

function makeBlock(id: string, opcode: string, next: string | null = null, inputs: Record<string, any> = {}, fields: Record<string, any> = {}): ASTBlock {
  return { id, opcode, next, inputs: Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, { name: k, value: v }])), fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, { name: k, value: v }])), shadow: false, topLevel: false };
}

function makeScript(hatOpcode: string, blocks: ASTBlock[]): ASTScript {
  return { id: 'script_' + (blocks[0]?.id || 'none'), hatOpcode, topBlockId: blocks[0]?.id || 'none', blocks: Object.fromEntries(blocks.map(b => [b.id, b])) };
}

function makeSprite(id: string, name: string, scripts: ASTScript[] = [], overrides: Partial<SpriteState> = {}): SpriteState {
  return { id, name, isStage: false, variables: {}, lists: {}, costumes: [], currentCostumeIndex: 0, sounds: [], volume: 100, scripts, x: 0, y: 0, direction: 90, visible: true, size: 100, draggable: false, rotationStyle: 'all around', ...overrides };
}

function makeStage(scripts: ASTScript[] = [], overrides: Partial<StageState> = {}): StageState {
  return { id: 'stage', name: 'Stage', isStage: true, variables: {}, lists: {}, costumes: [], currentCostumeIndex: 0, sounds: [], volume: 100, scripts, tempo: 60, videoState: 'off', ...overrides };
}

async function createRuntime(): Promise<BaseRuntime> {
  const rt = new BaseRuntime();
  await rt.initialize();
  resetThreadCounter();
  return rt;
}

describe('Phase 7O: Camera, Viewport & Stage Transform Foundation', () => {

  // ── 1. Camera Position ─────────────────────────────────────────

  it('default camera state is x=0, y=0, zoom=1, rotation=0', async () => {
    const rt = await createRuntime();
    const cam = rt.getCameraState();
    expect(cam.x).toBe(0);
    expect(cam.y).toBe(0);
    expect(cam.zoom).toBe(1);
    expect(cam.rotation).toBe(0);
  });

  it('setCameraPosition updates camera x and y', async () => {
    const rt = await createRuntime();
    rt.setCameraPosition(100, 200);
    const cam = rt.getCameraState();
    expect(cam.x).toBe(100);
    expect(cam.y).toBe(200);
  });

  it('setCameraPosition with negative coordinates', async () => {
    const rt = await createRuntime();
    rt.setCameraPosition(-50, -75);
    const cam = rt.getCameraState();
    expect(cam.x).toBe(-50);
    expect(cam.y).toBe(-75);
  });

  it('setCameraPosition with zero coordinates', async () => {
    const rt = await createRuntime();
    rt.setCameraPosition(10, 20);
    rt.setCameraPosition(0, 0);
    const cam = rt.getCameraState();
    expect(cam.x).toBe(0);
    expect(cam.y).toBe(0);
  });

  it('setCameraPosition with large world coordinates', async () => {
    const rt = await createRuntime();
    rt.setCameraPosition(100000, -100000);
    const cam = rt.getCameraState();
    expect(cam.x).toBe(100000);
    expect(cam.y).toBe(-100000);
  });

  it('setCameraPosition ignores NaN x', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rt.setCameraPosition(NaN, 10);
    expect(rt.getCameraState().x).toBe(0);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('setCameraPosition ignores NaN y', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rt.setCameraPosition(10, NaN);
    expect(rt.getCameraState().y).toBe(0);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('setCameraPosition ignores Infinity x', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rt.setCameraPosition(Infinity, 10);
    expect(rt.getCameraState().x).toBe(0);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('setCameraPosition ignores -Infinity y', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rt.setCameraPosition(10, -Infinity);
    expect(rt.getCameraState().y).toBe(0);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  // ── 2. Camera Zoom ─────────────────────────────────────────────

  it('setCameraZoom updates zoom', async () => {
    const rt = await createRuntime();
    rt.setCameraZoom(2);
    expect(rt.getCameraState().zoom).toBe(2);
  });

  it('setCameraZoom with fractional zoom', async () => {
    const rt = await createRuntime();
    rt.setCameraZoom(0.5);
    expect(rt.getCameraState().zoom).toBe(0.5);
  });

  it('setCameraZoom with very small positive zoom', async () => {
    const rt = await createRuntime();
    rt.setCameraZoom(0.001);
    expect(rt.getCameraState().zoom).toBe(0.001);
  });

  it('setCameraZoom rejects zoom of 0', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rt.setCameraZoom(0);
    expect(rt.getCameraState().zoom).toBe(1);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('setCameraZoom rejects negative zoom', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rt.setCameraZoom(-1);
    expect(rt.getCameraState().zoom).toBe(1);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('setCameraZoom rejects NaN zoom', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rt.setCameraZoom(NaN);
    expect(rt.getCameraState().zoom).toBe(1);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('setCameraZoom rejects Infinity zoom', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rt.setCameraZoom(Infinity);
    expect(rt.getCameraState().zoom).toBe(1);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  // ── 3. Camera Rotation ─────────────────────────────────────────

  it('setCameraRotation updates rotation', async () => {
    const rt = await createRuntime();
    rt.setCameraRotation(45);
    expect(rt.getCameraState().rotation).toBe(45);
  });

  it('setCameraRotation with negative rotation', async () => {
    const rt = await createRuntime();
    rt.setCameraRotation(-90);
    expect(rt.getCameraState().rotation).toBe(-90);
  });

  it('setCameraRotation rejects NaN', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rt.setCameraRotation(NaN);
    expect(rt.getCameraState().rotation).toBe(0);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('setCameraRotation rejects Infinity', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rt.setCameraRotation(Infinity);
    expect(rt.getCameraState().rotation).toBe(0);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  // ── 4. Viewport Resizing ───────────────────────────────────────

  it('default viewport is 480x360', async () => {
    const rt = await createRuntime();
    const vp = rt.getViewportState();
    expect(vp.width).toBe(480);
    expect(vp.height).toBe(360);
  });

  it('setViewportSize updates dimensions', async () => {
    const rt = await createRuntime();
    rt.setViewportSize(960, 720);
    const vp = rt.getViewportState();
    expect(vp.width).toBe(960);
    expect(vp.height).toBe(720);
  });

  it('setViewportSize with minimum allowed values 1x1', async () => {
    const rt = await createRuntime();
    rt.setViewportSize(1, 1);
    const vp = rt.getViewportState();
    expect(vp.width).toBe(1);
    expect(vp.height).toBe(1);
  });

  it('setViewportSize rejects width less than 1', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rt.setViewportSize(0, 100);
    expect(rt.getViewportState().width).toBe(480);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('setViewportSize rejects height less than 1', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rt.setViewportSize(100, 0);
    expect(rt.getViewportState().height).toBe(360);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('setViewportSize rejects NaN width', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rt.setViewportSize(NaN, 100);
    expect(rt.getViewportState().width).toBe(480);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('setViewportSize rejects NaN height', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rt.setViewportSize(100, NaN);
    expect(rt.getViewportState().height).toBe(360);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('setViewportSize rejects Infinity width', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rt.setViewportSize(Infinity, 100);
    expect(rt.getViewportState().width).toBe(480);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('setViewportSize rejects negative dimensions', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rt.setViewportSize(-10, -10);
    expect(rt.getViewportState().width).toBe(480);
    expect(rt.getViewportState().height).toBe(360);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  // ── 5. World-to-Screen Transforms ──────────────────────────────

  it('computeScreenTransforms at default camera/viewport', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Sprite1', [], { x: 0, y: 0 }));
    rt.computeScreenTransforms();
    const target = rt.getTargetById('s1');
    expect(target!.screenX).toBe(240);
    expect(target!.screenY).toBe(180);
  });

  it('computeScreenTransforms with offset camera', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.setCameraPosition(100, 0);
    rt.computeScreenTransforms();
    rt.addTarget(makeSprite('s1', 'Sprite1', [], { x: 100, y: 0 }));
    rt.computeScreenTransforms();
    const target = rt.getTargetById('s1');
    expect(target!.screenX).toBe(240);
    expect(target!.screenY).toBe(180);
  });

  it('computeScreenTransforms with zoom 2', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.setCameraZoom(2);
    rt.addTarget(makeSprite('s1', 'Sprite1', [], { x: 0, y: 0 }));
    rt.computeScreenTransforms();
    const target = rt.getTargetById('s1');
    expect(target!.screenX).toBe(240);
    expect(target!.screenY).toBe(180);
  });

  it('computeScreenTransforms with camera offset and sprite offset', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.setCameraPosition(50, 50);
    rt.addTarget(makeSprite('s1', 'Sprite1', [], { x: 100, y: 100 }));
    rt.computeScreenTransforms();
    const target = rt.getTargetById('s1');
    expect(target!.screenX).toBe((100 - 50) * 1 + 480 / 2);
    expect(target!.screenY).toBe((100 - 50) * 1 + 360 / 2);
  });

  it('computeScreenTransforms skips stage target', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.computeScreenTransforms();
    const stage = rt.getTargetById('stage');
    expect(stage!.screenX).toBeUndefined();
    expect(stage!.screenY).toBeUndefined();
  });

  it('computeScreenTransforms with zoom and offset combined', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.setCameraPosition(10, 20);
    rt.setCameraZoom(2);
    rt.addTarget(makeSprite('s1', 'Sprite1', [], { x: 60, y: 70 }));
    rt.computeScreenTransforms();
    const target = rt.getTargetById('s1');
    expect(target!.screenX).toBe((60 - 10) * 2 + 240);
    expect(target!.screenY).toBe((70 - 20) * 2 + 180);
  });

  it('computeScreenTransforms with large world coordinates', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.setCameraPosition(0, 0);
    rt.setCameraZoom(1);
    rt.addTarget(makeSprite('s1', 'Sprite1', [], { x: 10000, y: -10000 }));
    rt.computeScreenTransforms();
    const target = rt.getTargetById('s1');
    expect(target!.screenX).toBe(10000 + 240);
    expect(target!.screenY).toBe(-10000 + 180);
  });

  it('computeScreenTransforms with negative sprite coordinates', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.setCameraPosition(0, 0);
    rt.addTarget(makeSprite('s1', 'Sprite1', [], { x: -100, y: -200 }));
    rt.computeScreenTransforms();
    const target = rt.getTargetById('s1');
    expect(target!.screenX).toBe(-100 + 240);
    expect(target!.screenY).toBe(-200 + 180);
  });

  it('computeScreenTransforms uses worldTransform when available', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Parent', [], { x: 100, y: 50 }));
    rt.addTarget(makeSprite('s2', 'Child', [], { x: 10, y: 5 }));
    rt.attachTargetToParent('s2', 's1');
    rt.computeScreenTransforms();
    const child = rt.getTargetById('s2');
    const childWorldX = child!.worldTransform!.worldX;
    const childWorldY = child!.worldTransform!.worldY;
    expect(child!.screenX).toBe((childWorldX - 0) * 1 + 240);
    expect(child!.screenY).toBe((childWorldY - 0) * 1 + 180);
  });

  // ── 6. Screen Transform Updates After Motion ────────────────────

  it('screen transforms update after camera position change', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Sprite1', [], { x: 0, y: 0 }));
    rt.computeScreenTransforms();
    expect(rt.getTargetById('s1')!.screenX).toBe(240);
    rt.setCameraPosition(100, 0);
    rt.computeScreenTransforms();
    expect(rt.getTargetById('s1')!.screenX).toBe((0 - 100) * 1 + 240);
  });

  it('screen transforms update after zoom change', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Sprite1', [], { x: 100, y: 100 }));
    rt.computeScreenTransforms();
    expect(rt.getTargetById('s1')!.screenX).toBe(100 + 240);
    rt.setCameraZoom(2);
    rt.computeScreenTransforms();
    expect(rt.getTargetById('s1')!.screenX).toBe((100 - 0) * 2 + 240);
  });

  it('screen transforms update after viewport change', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Sprite1', [], { x: 0, y: 0 }));
    rt.computeScreenTransforms();
    expect(rt.getTargetById('s1')!.screenX).toBe(240);
    rt.setViewportSize(960, 720);
    rt.computeScreenTransforms();
    expect(rt.getTargetById('s1')!.screenX).toBe(0 * 1 + 960 / 2);
    expect(rt.getTargetById('s1')!.screenY).toBe(0 * 1 + 720 / 2);
  });

  it('screen transforms update after sprite motion', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Sprite1', [], { x: 0, y: 0 }));
    rt.computeScreenTransforms();
    expect(rt.getTargetById('s1')!.screenX).toBe(240);
    const sprite = rt.getTargetById('s1') as SpriteState;
    sprite.x = 100;
    if (sprite.localTransform) {
      sprite.localTransform.x = 100;
    }
    rt.computeWorldTransforms();
    rt.computeScreenTransforms();
    expect(rt.getTargetById('s1')!.screenX).toBe(100 + 240);
  });

  // ── 7. Snapshot Isolation ──────────────────────────────────────

  it('getCameraState returns deep copy', async () => {
    const rt = await createRuntime();
    const cam1 = rt.getCameraState();
    cam1.x = 999;
    const cam2 = rt.getCameraState();
    expect(cam2.x).toBe(0);
  });

  it('getViewportState returns deep copy', async () => {
    const rt = await createRuntime();
    const vp1 = rt.getViewportState();
    vp1.width = 9999;
    const vp2 = rt.getViewportState();
    expect(vp2.width).toBe(480);
  });

  it('snapshot camera is deep-copied', async () => {
    const rt = await createRuntime();
    rt.setCameraPosition(50, 60);
    rt.addTarget(makeStage());
    const snap = rt.getStageSnapshot();
    const stageSnap = snap.find(s => s.targetId === 'stage');
    expect(stageSnap!.camera).toEqual({ x: 50, y: 60, zoom: 1, rotation: 0 });
    stageSnap!.camera!.x = 999;
    const snap2 = rt.getStageSnapshot();
    const stageSnap2 = snap2.find(s => s.targetId === 'stage');
    expect(stageSnap2!.camera!.x).toBe(50);
  });

  it('snapshot viewport is deep-copied', async () => {
    const rt = await createRuntime();
    rt.setViewportSize(800, 600);
    rt.addTarget(makeStage());
    const snap = rt.getStageSnapshot();
    const stageSnap = snap.find(s => s.targetId === 'stage');
    expect(stageSnap!.viewport).toEqual({ width: 800, height: 600 });
    stageSnap!.viewport!.width = 9999;
    const snap2 = rt.getStageSnapshot();
    const stageSnap2 = snap2.find(s => s.targetId === 'stage');
    expect(stageSnap2!.viewport!.width).toBe(800);
  });

  it('snapshot screenX/screenY is deep-copied', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Sprite1', [], { x: 50, y: 60 }));
    rt.computeScreenTransforms();
    const snap = rt.getStageSnapshot();
    const spriteSnap = snap.find(s => s.targetId === 's1');
    expect(spriteSnap!.screenX).toBeDefined();
    expect(spriteSnap!.screenY).toBeDefined();
  });

  it('snapshot does not expose mutable runtime references', async () => {
    const rt = await createRuntime();
    rt.setCameraPosition(10, 20);
    rt.addTarget(makeStage());
    const snap1 = rt.getStageSnapshot();
    rt.setCameraPosition(99, 99);
    const snap2 = rt.getStageSnapshot();
    const s1 = snap1.find(s => s.targetId === 'stage');
    const s2 = snap2.find(s => s.targetId === 'stage');
    expect(s1!.camera!.x).toBe(10);
    expect(s2!.camera!.x).toBe(99);
  });

  // ── 8. Renderer Isolation ──────────────────────────────────────

  it('renderer adapter receives camera in snapshot', async () => {
    const rt = await createRuntime();
    rt.setCameraPosition(10, 20);
    rt.setCameraZoom(2);
    rt.addTarget(makeStage());
    const adapter = new InMemoryRendererAdapter();
    adapter.initialize();
    const snap = rt.getStageSnapshot();
    adapter.syncStage(snap);
    const stageTarget = adapter.targets.get('stage');
    expect(stageTarget!.camera).toEqual({ x: 10, y: 20, zoom: 2, rotation: 0 });
  });

  it('renderer adapter receives viewport in snapshot', async () => {
    const rt = await createRuntime();
    rt.setViewportSize(800, 600);
    rt.addTarget(makeStage());
    const adapter = new InMemoryRendererAdapter();
    adapter.initialize();
    const snap = rt.getStageSnapshot();
    adapter.syncStage(snap);
    const stageTarget = adapter.targets.get('stage');
    expect(stageTarget!.viewport).toEqual({ width: 800, height: 600 });
  });

  it('renderer adapter receives screenX/screenY for sprites', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Sprite1', [], { x: 100, y: 50 }));
    rt.computeScreenTransforms();
    const adapter = new InMemoryRendererAdapter();
    adapter.initialize();
    const snap = rt.getStageSnapshot();
    adapter.syncStage(snap);
    const spriteTarget = adapter.targets.get('s1');
    expect(spriteTarget!.screenX).toBe(100 + 240);
    expect(spriteTarget!.screenY).toBe(50 + 180);
  });

  it('renderer camera metadata is deep-copied from snapshot', async () => {
    const rt = await createRuntime();
    rt.setCameraPosition(42, 84);
    rt.addTarget(makeStage());
    const adapter = new InMemoryRendererAdapter();
    adapter.initialize();
    const snap = rt.getStageSnapshot();
    adapter.syncStage(snap);
    const stageTarget = adapter.targets.get('stage');
    stageTarget!.camera!.x = 999;
    const stageTarget2 = adapter.targets.get('stage');
    expect(stageTarget2!.camera!.x).toBe(999);
    const snap2 = rt.getStageSnapshot();
    const stageSnap2 = snap2.find(s => s.targetId === 'stage');
    expect(stageSnap2!.camera!.x).toBe(42);
  });

  it('renderer adapter syncs updated camera on second sync', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    const adapter = new InMemoryRendererAdapter();
    adapter.initialize();
    adapter.syncStage(rt.getStageSnapshot());
    rt.setCameraPosition(200, 300);
    adapter.syncStage(rt.getStageSnapshot());
    const stageTarget = adapter.targets.get('stage');
    expect(stageTarget!.camera!.x).toBe(200);
    expect(stageTarget!.camera!.y).toBe(300);
  });

  it('renderer adapter syncs updated viewport on second sync', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    const adapter = new InMemoryRendererAdapter();
    adapter.initialize();
    adapter.syncStage(rt.getStageSnapshot());
    rt.setViewportSize(1024, 768);
    adapter.syncStage(rt.getStageSnapshot());
    const stageTarget = adapter.targets.get('stage');
    expect(stageTarget!.viewport!.width).toBe(1024);
    expect(stageTarget!.viewport!.height).toBe(768);
  });

  it('renderer adapter syncs updated screenX/screenY on second sync', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Sprite1', [], { x: 0, y: 0 }));
    rt.computeScreenTransforms();
    const adapter = new InMemoryRendererAdapter();
    adapter.initialize();
    adapter.syncStage(rt.getStageSnapshot());
    rt.setCameraPosition(100, 0);
    rt.computeScreenTransforms();
    adapter.syncStage(rt.getStageSnapshot());
    const spriteTarget = adapter.targets.get('s1');
    expect(spriteTarget!.screenX).toBe((0 - 100) * 1 + 240);
  });

  // ── 9. Clone Behavior ─────────────────────────────────────────

  it('clones inherit computed screen transforms only', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Sprite1', [], { x: 50, y: 60 }));
    rt.computeScreenTransforms();
    const parentScreenX = rt.getTargetById('s1')!.screenX;
    const parentScreenY = rt.getTargetById('s1')!.screenY;
    rt.createCloneOf('s1');
    const targets = rt.getTargets();
    const clone = targets.find(t => t.isClone && t.cloneSourceId === 's1');
    expect(clone).toBeDefined();
    expect(clone!.screenX).toBeUndefined();
    expect(clone!.screenY).toBeUndefined();
  });

  it('clones never own camera state', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Sprite1'));
    rt.createCloneOf('s1');
    const targets = rt.getTargets();
    const clone = targets.find(t => t.isClone);
    const cam1 = rt.getCameraState();
    const cam2 = rt.getCameraState();
    expect(cam1).toEqual(cam2);
  });

  it('clone screen transforms can be computed after creation', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Sprite1', [], { x: 30, y: 40 }));
    rt.createCloneOf('s1');
    rt.computeScreenTransforms();
    const targets = rt.getTargets();
    const clone = targets.find(t => t.isClone && t.cloneSourceId === 's1') as SpriteState;
    expect(clone).toBeDefined();
    expect(clone!.screenX).toBe(30 + 240);
    expect(clone!.screenY).toBe(40 + 180);
  });

  // ── 10. Initialize Cleanup ─────────────────────────────────────

  it('initialize resets camera state', async () => {
    const rt = await createRuntime();
    rt.setCameraPosition(100, 200);
    rt.setCameraZoom(3);
    rt.setCameraRotation(45);
    await rt.initialize();
    const cam = rt.getCameraState();
    expect(cam.x).toBe(0);
    expect(cam.y).toBe(0);
    expect(cam.zoom).toBe(1);
    expect(cam.rotation).toBe(0);
  });

  it('initialize resets viewport state', async () => {
    const rt = await createRuntime();
    rt.setViewportSize(960, 720);
    await rt.initialize();
    const vp = rt.getViewportState();
    expect(vp.width).toBe(480);
    expect(vp.height).toBe(360);
  });

  // ── 11. Stop Cleanup ───────────────────────────────────────────

  it('stop resets camera state', async () => {
    const rt = await createRuntime();
    rt.setCameraPosition(100, 200);
    rt.setCameraZoom(3);
    rt.setCameraRotation(45);
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Sprite1', [], { x: 50, y: 60 }));
    rt.computeScreenTransforms();
    rt.start();
    rt.stop();
    const cam = rt.getCameraState();
    expect(cam.x).toBe(0);
    expect(cam.y).toBe(0);
    expect(cam.zoom).toBe(1);
    expect(cam.rotation).toBe(0);
  });

  it('stop resets viewport state', async () => {
    const rt = await createRuntime();
    rt.setViewportSize(960, 720);
    rt.start();
    rt.stop();
    const vp = rt.getViewportState();
    expect(vp.width).toBe(480);
    expect(vp.height).toBe(360);
  });

  it('stop clears computed screen transforms from targets', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Sprite1', [], { x: 50, y: 60 }));
    rt.computeScreenTransforms();
    expect(rt.getTargetById('s1')!.screenX).toBeDefined();
    rt.start();
    rt.stop();
    expect(rt.getTargetById('s1')!.screenX).toBeUndefined();
    expect(rt.getTargetById('s1')!.screenY).toBeUndefined();
  });

  // ── 12. Deterministic Ordering ────────────────────────────────

  it('computeScreenTransforms processes targets deterministically', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A', [], { x: 10, y: 20 }));
    rt.addTarget(makeSprite('s2', 'B', [], { x: 30, y: 40 }));
    rt.computeScreenTransforms();
    const t1 = rt.getTargetById('s1');
    const t2 = rt.getTargetById('s2');
    expect(t1!.screenX).toBe(10 + 240);
    expect(t1!.screenY).toBe(20 + 180);
    expect(t2!.screenX).toBe(30 + 240);
    expect(t2!.screenY).toBe(40 + 180);
  });

  it('same camera state produces same screen transforms', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Sprite1', [], { x: 42, y: -17 }));
    rt.computeScreenTransforms();
    const sx1 = rt.getTargetById('s1')!.screenX;
    const sy1 = rt.getTargetById('s1')!.screenY;
    rt.computeScreenTransforms();
    const sx2 = rt.getTargetById('s1')!.screenX;
    const sy2 = rt.getTargetById('s1')!.screenY;
    expect(sx1).toBe(sx2);
    expect(sy1).toBe(sy2);
  });

  // ── 13. Metadata Deep Copy Safety ──────────────────────────────

  it('modifying returned camera state does not affect runtime', async () => {
    const rt = await createRuntime();
    rt.setCameraPosition(10, 20);
    const cam = rt.getCameraState();
    cam.x = 999;
    cam.zoom = 0;
    cam.rotation = 360;
    expect(rt.getCameraState().x).toBe(10);
    expect(rt.getCameraState().zoom).toBe(1);
    expect(rt.getCameraState().rotation).toBe(0);
  });

  it('modifying returned viewport state does not affect runtime', async () => {
    const rt = await createRuntime();
    rt.setViewportSize(800, 600);
    const vp = rt.getViewportState();
    vp.width = 0;
    vp.height = -1;
    expect(rt.getViewportState().width).toBe(800);
    expect(rt.getViewportState().height).toBe(600);
  });

  // ── 14. Renderer Sync Correctness ─────────────────────────────

  it('renderer sync correctly for multiple sprites with camera offset', async () => {
    const rt = await createRuntime();
    rt.setCameraPosition(50, 50);
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Sprite1', [], { x: 50, y: 50 }));
    rt.addTarget(makeSprite('s2', 'Sprite2', [], { x: 150, y: 150 }));
    rt.computeScreenTransforms();
    const adapter = new InMemoryRendererAdapter();
    adapter.initialize();
    adapter.syncStage(rt.getStageSnapshot());
    const t1 = adapter.targets.get('s1');
    const t2 = adapter.targets.get('s2');
    expect(t1!.screenX).toBe((50 - 50) * 1 + 240);
    expect(t1!.screenY).toBe((50 - 50) * 1 + 180);
    expect(t2!.screenX).toBe((150 - 50) * 1 + 240);
    expect(t2!.screenY).toBe((150 - 50) * 1 + 180);
  });

  it('renderer sync correctly with zoom and camera offset', async () => {
    const rt = await createRuntime();
    rt.setCameraPosition(10, 20);
    rt.setCameraZoom(2);
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Sprite1', [], { x: 60, y: 70 }));
    rt.computeScreenTransforms();
    const adapter = new InMemoryRendererAdapter();
    adapter.initialize();
    adapter.syncStage(rt.getStageSnapshot());
    const t1 = adapter.targets.get('s1');
    expect(t1!.screenX).toBe((60 - 10) * 2 + 240);
    expect(t1!.screenY).toBe((70 - 20) * 2 + 180);
  });

  it('non-stage targets in renderer do not receive camera/viewport', async () => {
    const rt = await createRuntime();
    rt.setCameraPosition(10, 20);
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Sprite1'));
    rt.computeScreenTransforms();
    const adapter = new InMemoryRendererAdapter();
    adapter.initialize();
    adapter.syncStage(rt.getStageSnapshot());
    const spriteTarget = adapter.targets.get('s1');
    expect(spriteTarget!.camera).toBeUndefined();
    expect(spriteTarget!.viewport).toBeUndefined();
  });

  // ── 15. Nested Hierarchy + Camera Integration ──────────────────

  it('hierarchy children get correct screen transforms', async () => {
    const rt = await createRuntime();
    rt.setCameraPosition(0, 0);
    rt.setCameraZoom(1);
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('parent', 'Parent', [], { x: 100, y: 100 }));
    rt.addTarget(makeSprite('child', 'Child', [], { x: 10, y: 10 }));
    rt.attachTargetToParent('child', 'parent');
    rt.computeScreenTransforms();
    const child = rt.getTargetById('child');
    const worldX = child!.worldTransform!.worldX;
    const worldY = child!.worldTransform!.worldY;
    expect(child!.screenX).toBe((worldX - 0) * 1 + 240);
    expect(child!.screenY).toBe((worldY - 0) * 1 + 180);
  });

  it('hierarchy children screen transforms respect camera offset', async () => {
    const rt = await createRuntime();
    rt.setCameraPosition(50, 50);
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('parent', 'Parent', [], { x: 100, y: 100 }));
    rt.addTarget(makeSprite('child', 'Child', [], { x: 10, y: 10 }));
    rt.attachTargetToParent('child', 'parent');
    rt.computeScreenTransforms();
    const child = rt.getTargetById('child');
    const worldX = child!.worldTransform!.worldX;
    const worldY = child!.worldTransform!.worldY;
    expect(child!.screenX).toBe((worldX - 50) * 1 + 240);
    expect(child!.screenY).toBe((worldY - 50) * 1 + 180);
  });

  // ── 16. Warnings-Only Diagnostics ─────────────────────────────

  it('invalid camera position only warns, never throws', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => rt.setCameraPosition(NaN, NaN)).not.toThrow();
    expect(() => rt.setCameraPosition(Infinity, Infinity)).not.toThrow();
    warnSpy.mockRestore();
  });

  it('invalid zoom only warns, never throws', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => rt.setCameraZoom(0)).not.toThrow();
    expect(() => rt.setCameraZoom(-1)).not.toThrow();
    expect(() => rt.setCameraZoom(NaN)).not.toThrow();
    warnSpy.mockRestore();
  });

  it('invalid rotation only warns, never throws', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => rt.setCameraRotation(NaN)).not.toThrow();
    expect(() => rt.setCameraRotation(Infinity)).not.toThrow();
    warnSpy.mockRestore();
  });

  it('invalid viewport only warns, never throws', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => rt.setViewportSize(0, 0)).not.toThrow();
    expect(() => rt.setViewportSize(NaN, NaN)).not.toThrow();
    expect(() => rt.setViewportSize(-1, -1)).not.toThrow();
    warnSpy.mockRestore();
  });

  it('warnings-only on undefined camera position', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => rt.setCameraPosition(undefined as any, 10)).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('warnings-only on undefined zoom', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => rt.setCameraZoom(undefined as any)).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('warnings-only on undefined viewport dimensions', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => rt.setViewportSize(undefined as any, undefined as any)).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

});
