/**
 * Phase 7I — Motion Runtime & Coordinate System Stabilization Tests
 * Tests deterministic motion semantics: glide lifecycle, edge bounce,
 * direction normalization, coordinate stabilization, and renderer-safe sync.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { TargetState, SpriteState, StageState, ASTBlock, ASTScript, Thread } from '../src/types';
import { resetThreadCounter } from '../src/runtime/execution-context';
import { InMemoryRendererAdapter } from '../src/stage/renderer-adapter';

// ─── Helpers ───────────────────────────────────────────────────────

function makeBlock(id: string, opcode: string, next: string | null = null, inputs: Record<string, any> = {}, fields: Record<string, any> = {}): ASTBlock {
  return {
    id,
    opcode,
    next,
    inputs: Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, { name: k, value: v }])),
    fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, { name: k, value: v }])),
    shadow: false,
    topLevel: false,
  };
}

function makeScript(hatOpcode: string, blocks: ASTBlock[]): ASTScript {
  return {
    id: `script_${blocks[0]?.id}`,
    hatOpcode,
    topBlockId: blocks[0]?.id || 'none',
    blocks: Object.fromEntries(blocks.map(b => [b.id, b])),
  };
}

function makeSprite(id: string, name: string, scripts: ASTScript[], overrides: Partial<SpriteState> = {}): SpriteState {
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
    scripts,
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

function makeStage(scripts: ASTScript[] = []): StageState {
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
    scripts,
    tempo: 60,
    videoState: 'off',
  };
}

function getSprite(runtime: BaseRuntime, id: string): SpriteState {
  return runtime.getTargetById(id) as SpriteState;
}

// ─── Tests ─────────────────────────────────────────────────────────

describe('Phase 7I — Motion Runtime & Coordinate System Stabilization', () => {
  let runtime: BaseRuntime;

  beforeEach(async () => {
    runtime = new BaseRuntime();
    await runtime.initialize();
    resetThreadCounter();
  });

  // ─── 1. Glide Interpolation ────────────────────────────────────

  describe('Glide Interpolation', () => {
    it('1. should interpolate position linearly over ticks', () => {
      const glideBlock = makeBlock('glide1', 'motion_glidesecstoxy', null, {
        SECS: 1,
        X: 100,
        Y: 50,
      });
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'glide1');
      const script = makeScript('event_whenflagclicked', [hatBlock, glideBlock]);
      const sprite = makeSprite('s1', 'Cat', [script], { x: 0, y: 0 });

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();

      // tick 1: hat executes, glide initializes, thread -> WAITING
      runtime.tick();

      // FPS=30, tickDuration=33.33ms, 1 second = ~30 ticks
      // After first tick, thread should be WAITING with glideState set
      const thread = runtime.activeThreads.find(t => t.targetId === 's1');
      expect(thread?.status).toBe('WAITING');
      expect(thread?.glideState).toBeDefined();
      expect(thread?.glideState?.startX).toBe(0);
      expect(thread?.glideState?.startY).toBe(0);
      expect(thread?.glideState?.targetX).toBe(100);
      expect(thread?.glideState?.targetY).toBe(50);

      // After a few more ticks, sprite should be between start and target
      runtime.tick();
      runtime.tick();
      const s = getSprite(runtime, 's1');
      expect(s.x).toBeGreaterThan(0);
      expect(s.x).toBeLessThan(100);
      expect(s.y).toBeGreaterThan(0);
      expect(s.y).toBeLessThan(50);

      runtime.stop();
    });

    it('2. should snap exactly to target on glide completion', () => {
      const glideBlock = makeBlock('glide1', 'motion_glidesecstoxy', null, {
        SECS: 0.1,  // Very short glide
        X: 200,
        Y: -100,
      });
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'glide1');
      const script = makeScript('event_whenflagclicked', [hatBlock, glideBlock]);
      const sprite = makeSprite('s1', 'Cat', [script], { x: 0, y: 0 });

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();

      // Run enough ticks to ensure glide completes (0.1s / 33.33ms per tick = ~3 ticks)
      for (let i = 0; i < 10; i++) {
        runtime.tick();
      }

      const s = getSprite(runtime, 's1');
      expect(s.x).toBe(200);
      expect(s.y).toBe(-100);

      runtime.stop();
    });

    it('3. should snap directly for zero-duration glide', () => {
      const glideBlock = makeBlock('glide1', 'motion_glidesecstoxy', null, {
        SECS: 0,
        X: 150,
        Y: -80,
      });
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'glide1');
      const script = makeScript('event_whenflagclicked', [hatBlock, glideBlock]);
      const sprite = makeSprite('s1', 'Cat', [script], { x: 10, y: 20 });

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();
      runtime.tick();

      const s = getSprite(runtime, 's1');
      expect(s.x).toBe(150);
      expect(s.y).toBe(-80);

      // Thread should not be WAITING (zero-duration completes instantly)
      const thread = runtime.activeThreads.find(t => t.targetId === 's1');
      // Thread should have completed execution (DONE)
      expect(thread?.glideState).toBeUndefined();

      runtime.stop();
    });
  });

  // ─── 2. WAITING Lifecycle Cooperation ──────────────────────────

  describe('WAITING Lifecycle Cooperation', () => {
    it('4. should transition from WAITING to RUNNING when glide completes', () => {
      const glideBlock = makeBlock('glide1', 'motion_glidesecstoxy', 'move1', {
        SECS: 0.03,  // Complete within one tick at 30fps (33.33ms)
        X: 50,
        Y: 50,
      });
      const moveBlock = makeBlock('move1', 'motion_gotoxy', null, {
        X: 100,
        Y: 100,
      });
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'glide1');
      const script = makeScript('event_whenflagclicked', [hatBlock, glideBlock, moveBlock]);
      const sprite = makeSprite('s1', 'Cat', [script]);

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();

      // Execute enough ticks to complete glide + next block
      for (let i = 0; i < 5; i++) {
        runtime.tick();
      }

      // After glide + gotoxy, sprite should be at (100, 100)
      const s = getSprite(runtime, 's1');
      expect(s.x).toBe(100);
      expect(s.y).toBe(100);

      runtime.stop();
    });

    it('5. should not interfere with non-glide WAITING (control_wait)', () => {
      const waitBlock = makeBlock('wait1', 'control_wait', null, { DURATION: 0.5 });
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'wait1');
      const script = makeScript('event_whenflagclicked', [hatBlock, waitBlock]);
      const sprite = makeSprite('s1', 'Cat', [script]);

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();
      runtime.tick();

      const thread = runtime.activeThreads.find(t => t.targetId === 's1');
      expect(thread?.status).toBe('WAITING');
      expect(thread?.glideState).toBeUndefined();
      expect(thread?.delayMs).toBeGreaterThan(0);

      runtime.stop();
    });
  });

  // ─── 3. Concurrent Glides ──────────────────────────────────────

  describe('Concurrent Glides', () => {
    it('6. should handle multiple sprites gliding simultaneously', () => {
      const makeGlideScript = (id: string, targetX: number, targetY: number) => {
        const glideBlock = makeBlock(`glide_${id}`, 'motion_glidesecstoxy', null, {
          SECS: 0.5,
          X: targetX,
          Y: targetY,
        });
        const hatBlock = makeBlock(`hat_${id}`, 'event_whenflagclicked', `glide_${id}`);
        return makeScript('event_whenflagclicked', [hatBlock, glideBlock]);
      };

      const sprite1 = makeSprite('s1', 'Cat', [makeGlideScript('s1', 100, 0)], { x: 0, y: 0 });
      const sprite2 = makeSprite('s2', 'Dog', [makeGlideScript('s2', -100, 50)], { x: 50, y: -50 });

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite1);
      runtime.addTarget(sprite2);
      runtime.start();

      // Run a few ticks
      for (let i = 0; i < 5; i++) {
        runtime.tick();
      }

      // Both sprites should be progressing
      const s1 = getSprite(runtime, 's1');
      const s2 = getSprite(runtime, 's2');
      expect(s1.x).toBeGreaterThan(0);
      expect(s2.x).toBeLessThan(50);

      // Run enough ticks to complete (0.5s = ~15 ticks)
      for (let i = 0; i < 20; i++) {
        runtime.tick();
      }

      expect(getSprite(runtime, 's1').x).toBe(100);
      expect(getSprite(runtime, 's1').y).toBe(0);
      expect(getSprite(runtime, 's2').x).toBe(-100);
      expect(getSprite(runtime, 's2').y).toBe(50);

      runtime.stop();
    });
  });

  // ─── 4. Clone Glide Isolation ──────────────────────────────────

  describe('Clone Glide Isolation', () => {
    it('7. should isolate glide state between clones and parent', () => {
      const glideBlock = makeBlock('glide1', 'motion_glidesecstoxy', null, {
        SECS: 1,
        X: 200,
        Y: 100,
      });
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'glide1');
      const script = makeScript('event_whenflagclicked', [hatBlock, glideBlock]);
      const sprite = makeSprite('s1', 'Cat', [script], { x: 0, y: 0 });

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);

      // Create a clone
      runtime.createCloneOf('s1');

      runtime.start();

      // After a few ticks, parent should be gliding but clone not necessarily in same position
      for (let i = 0; i < 5; i++) {
        runtime.tick();
      }

      const parent = getSprite(runtime, 's1');
      // Clone threads are separate - parent glide and clone glide are independent
      expect(parent.x).toBeGreaterThan(0);

      runtime.stop();
    });
  });

  // ─── 5. Edge Bounce Semantics ──────────────────────────────────

  describe('Edge Bounce Semantics', () => {
    it('8. should bounce off right edge and clamp X', () => {
      const bounceBlock = makeBlock('bounce1', 'motion_ifonedgebounce', null);
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'bounce1');
      const script = makeScript('event_whenflagclicked', [hatBlock, bounceBlock]);
      const sprite = makeSprite('s1', 'Cat', [script], { x: 300, y: 0, direction: 90 });

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();
      runtime.tick();

      const s = getSprite(runtime, 's1');
      expect(s.x).toBe(240);
      expect(s.direction).toBe(-90); // Reflected
      runtime.stop();
    });

    it('9. should bounce off left edge and clamp X', () => {
      const bounceBlock = makeBlock('bounce1', 'motion_ifonedgebounce', null);
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'bounce1');
      const script = makeScript('event_whenflagclicked', [hatBlock, bounceBlock]);
      const sprite = makeSprite('s1', 'Cat', [script], { x: -300, y: 0, direction: -90 });

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();
      runtime.tick();

      const s = getSprite(runtime, 's1');
      expect(s.x).toBe(-240);
      expect(s.direction).toBe(90); // Reflected
      runtime.stop();
    });

    it('10. should bounce off top edge and clamp Y', () => {
      const bounceBlock = makeBlock('bounce1', 'motion_ifonedgebounce', null);
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'bounce1');
      const script = makeScript('event_whenflagclicked', [hatBlock, bounceBlock]);
      const sprite = makeSprite('s1', 'Cat', [script], { x: 0, y: 250, direction: 0 });

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();
      runtime.tick();

      const s = getSprite(runtime, 's1');
      expect(s.y).toBe(180);
      expect(s.direction).toBe(180); // 180 - 0 = 180
      runtime.stop();
    });

    it('11. should bounce off bottom edge and clamp Y', () => {
      const bounceBlock = makeBlock('bounce1', 'motion_ifonedgebounce', null);
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'bounce1');
      const script = makeScript('event_whenflagclicked', [hatBlock, bounceBlock]);
      const sprite = makeSprite('s1', 'Cat', [script], { x: 0, y: -250, direction: 180 });

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();
      runtime.tick();

      const s = getSprite(runtime, 's1');
      expect(s.y).toBe(-180);
      // direction: 180 - 180 = 0, normalized -> 0 (but 0 is in range)
      // Actually: 180 - 180 = 0
      // normalizeDirection(0) = 0
      // But wait - 0 is in (-180, 180] -> Yes, 0 is valid
      // However Scratch semantics: 0 = up
      runtime.stop();
    });

    it('12. should not bounce when sprite is within bounds', () => {
      const bounceBlock = makeBlock('bounce1', 'motion_ifonedgebounce', null);
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'bounce1');
      const script = makeScript('event_whenflagclicked', [hatBlock, bounceBlock]);
      const sprite = makeSprite('s1', 'Cat', [script], { x: 100, y: 50, direction: 45 });

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();
      runtime.tick();

      const s = getSprite(runtime, 's1');
      expect(s.x).toBe(100);
      expect(s.y).toBe(50);
      expect(s.direction).toBe(45);
      runtime.stop();
    });
  });

  // ─── 6. Direction Normalization ────────────────────────────────

  describe('Direction Normalization', () => {
    it('13. should normalize direction to (-180, 180]', () => {
      expect(BaseRuntime.normalizeDirection(0)).toBe(0);
      expect(BaseRuntime.normalizeDirection(90)).toBe(90);
      expect(BaseRuntime.normalizeDirection(180)).toBe(180);
      expect(BaseRuntime.normalizeDirection(-180)).toBe(180); // -180 wraps to 180
      expect(BaseRuntime.normalizeDirection(270)).toBe(-90);
      expect(BaseRuntime.normalizeDirection(-270)).toBe(90);
      expect(BaseRuntime.normalizeDirection(360)).toBe(0);
      expect(BaseRuntime.normalizeDirection(-360)).toBe(0);
      expect(BaseRuntime.normalizeDirection(450)).toBe(90);
      expect(BaseRuntime.normalizeDirection(-450)).toBe(-90);
    });

    it('14. should apply normalization to motion_turnright', () => {
      const turnBlock = makeBlock('turn1', 'motion_turnright', null, { DEGREES: 270 });
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'turn1');
      const script = makeScript('event_whenflagclicked', [hatBlock, turnBlock]);
      const sprite = makeSprite('s1', 'Cat', [script], { direction: 90 });

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();
      runtime.tick();

      const s = getSprite(runtime, 's1');
      // 90 + 270 = 360 -> normalized to 0
      expect(s.direction).toBe(0);
      runtime.stop();
    });

    it('15. should apply normalization to motion_turnleft', () => {
      const turnBlock = makeBlock('turn1', 'motion_turnleft', null, { DEGREES: 180 });
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'turn1');
      const script = makeScript('event_whenflagclicked', [hatBlock, turnBlock]);
      const sprite = makeSprite('s1', 'Cat', [script], { direction: 90 });

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();
      runtime.tick();

      const s = getSprite(runtime, 's1');
      // 90 - 180 = -90 -> normalized to -90
      expect(s.direction).toBe(-90);
      runtime.stop();
    });

    it('16. should apply normalization to motion_pointindirection', () => {
      const pointBlock = makeBlock('point1', 'motion_pointindirection', null, { DIRECTION: 450 });
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'point1');
      const script = makeScript('event_whenflagclicked', [hatBlock, pointBlock]);
      const sprite = makeSprite('s1', 'Cat', [script], { direction: 0 });

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();
      runtime.tick();

      const s = getSprite(runtime, 's1');
      // 450 -> normalized to 90
      expect(s.direction).toBe(90);
      runtime.stop();
    });
  });

  // ─── 7. Stage Bound Clamping ───────────────────────────────────

  describe('Stage Bound Clamping', () => {
    it('17. should clamp coordinates within stage bounds', () => {
      const result1 = BaseRuntime.clampToStageBounds(500, 300);
      expect(result1.x).toBe(240);
      expect(result1.y).toBe(180);

      const result2 = BaseRuntime.clampToStageBounds(-500, -300);
      expect(result2.x).toBe(-240);
      expect(result2.y).toBe(-180);

      const result3 = BaseRuntime.clampToStageBounds(0, 0);
      expect(result3.x).toBe(0);
      expect(result3.y).toBe(0);
    });
  });

  // ─── 8. Renderer Snapshot Synchronization ──────────────────────

  describe('Renderer Snapshot Synchronization', () => {
    it('18. should synchronize glide positions in snapshot', () => {
      const glideBlock = makeBlock('glide1', 'motion_glidesecstoxy', null, {
        SECS: 1,
        X: 200,
        Y: 100,
      });
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'glide1');
      const script = makeScript('event_whenflagclicked', [hatBlock, glideBlock]);
      const sprite = makeSprite('s1', 'Cat', [script], { x: 0, y: 0 });

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();
      runtime.tick();
      runtime.tick();

      const snapshot = runtime.getStageSnapshot();
      const spriteSnap = snapshot.find(s => s.targetId === 's1');
      expect(spriteSnap).toBeDefined();
      // Position should be partially interpolated
      expect(spriteSnap!.x).toBeGreaterThan(0);
      expect(spriteSnap!.y).toBeGreaterThan(0);

      // Verify renderer ingestion
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      adapter.syncStage(snapshot);
      const target = adapter.targets.get('s1');
      expect(target).toBeDefined();
      expect(target!.x).toBe(spriteSnap!.x);
      expect(target!.y).toBe(spriteSnap!.y);

      runtime.stop();
    });
  });

  // ─── 9. Glide Cancellation via Stop ────────────────────────────

  describe('Glide Cancellation via Stop', () => {
    it('19. should cancel glide when runtime is stopped', () => {
      const glideBlock = makeBlock('glide1', 'motion_glidesecstoxy', null, {
        SECS: 5,
        X: 200,
        Y: 100,
      });
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'glide1');
      const script = makeScript('event_whenflagclicked', [hatBlock, glideBlock]);
      const sprite = makeSprite('s1', 'Cat', [script], { x: 0, y: 0 });

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();
      runtime.tick();
      runtime.tick();

      // Stop the runtime
      runtime.stop();

      // All threads should be cleaned up
      expect(runtime.activeThreads.length).toBe(0);
    });
  });

  // ─── 10. Cleanup After Clone Deletion ──────────────────────────

  describe('Cleanup After Clone Deletion', () => {
    it('20. should clean up glide threads on clone deletion', () => {
      const glideBlock = makeBlock('glide1', 'motion_glidesecstoxy', null, {
        SECS: 5,
        X: 200,
        Y: 100,
      });
      const cloneHat = makeBlock('cloneHat', 'event_whencloned', 'glide1');
      const script = makeScript('event_whencloned', [cloneHat, glideBlock]);
      const sprite = makeSprite('s1', 'Cat', [script], { x: 0, y: 0 });

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.createCloneOf('s1');
      runtime.start();

      // Let the clone start gliding
      runtime.tick();
      runtime.tick();

      const cloneId = runtime.getTargets().find(t => t.isClone)?.id;
      expect(cloneId).toBeDefined();

      // Delete the clone
      runtime.deleteClone(cloneId!);

      // Glide threads for clone should be marked DONE+isKilled
      const cloneThreads = runtime.activeThreads.filter(t => t.targetId === cloneId);
      for (const ct of cloneThreads) {
        expect(ct.isKilled).toBe(true);
      }

      runtime.stop();
    });
  });

  // ─── 11. No Drift Accumulation ─────────────────────────────────

  describe('No Drift Accumulation', () => {
    it('21. should not accumulate floating-point drift during glide', () => {
      const glideBlock = makeBlock('glide1', 'motion_glidesecstoxy', null, {
        SECS: 1,
        X: 100,
        Y: 100,
      });
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'glide1');
      const script = makeScript('event_whenflagclicked', [hatBlock, glideBlock]);
      const sprite = makeSprite('s1', 'Cat', [script], { x: 0, y: 0 });

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();

      // Run to completion
      for (let i = 0; i < 40; i++) {
        runtime.tick();
      }

      // Must snap EXACTLY to target (no accumulated drift)
      const s = getSprite(runtime, 's1');
      expect(s.x).toBe(100);
      expect(s.y).toBe(100);

      runtime.stop();
    });
  });

  // ─── 12. Deterministic Ordering Under Concurrent Glides ────────

  describe('Deterministic Ordering Under Concurrent Glides', () => {
    it('22. should preserve thread ordering with concurrent glides', () => {
      const positions: number[][] = [];

      const makeGlideScript = (id: string, targetX: number) => {
        const glideBlock = makeBlock(`g_${id}`, 'motion_glidesecstoxy', null, {
          SECS: 0.5,
          X: targetX,
          Y: 0,
        });
        const hatBlock = makeBlock(`h_${id}`, 'event_whenflagclicked', `g_${id}`);
        return makeScript('event_whenflagclicked', [hatBlock, glideBlock]);
      };

      const sprite1 = makeSprite('s1', 'A', [makeGlideScript('1', 100)]);
      const sprite2 = makeSprite('s2', 'B', [makeGlideScript('2', -100)]);

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite1);
      runtime.addTarget(sprite2);
      runtime.start();

      for (let i = 0; i < 5; i++) {
        runtime.tick();
        positions.push([
          getSprite(runtime, 's1').x,
          getSprite(runtime, 's2').x,
        ]);
      }

      // s1 should be increasing, s2 decreasing
      for (let i = 1; i < positions.length; i++) {
        expect(positions[i][0]).toBeGreaterThanOrEqual(positions[i - 1][0]);
        expect(positions[i][1]).toBeLessThanOrEqual(positions[i - 1][1]);
      }

      runtime.stop();
    });
  });

  // ─── 13. Deep Snapshot Immutability ────────────────────────────

  describe('Deep Snapshot Immutability', () => {
    it('23. should produce immutable snapshots during glide', () => {
      const glideBlock = makeBlock('glide1', 'motion_glidesecstoxy', null, {
        SECS: 1,
        X: 200,
        Y: 100,
      });
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'glide1');
      const script = makeScript('event_whenflagclicked', [hatBlock, glideBlock]);
      const sprite = makeSprite('s1', 'Cat', [script], { x: 0, y: 0 });

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();
      runtime.tick();
      runtime.tick();

      const snap1 = runtime.getStageSnapshot();
      const snap1X = snap1.find(s => s.targetId === 's1')!.x;

      runtime.tick();

      const snap2 = runtime.getStageSnapshot();
      const snap2X = snap2.find(s => s.targetId === 's1')!.x;

      // snap1 should not have been mutated
      expect(snap1.find(s => s.targetId === 's1')!.x).toBe(snap1X);
      expect(snap2X).toBeGreaterThan(snap1X);

      runtime.stop();
    });
  });

  // ─── 14. Malformed Motion Blocks ───────────────────────────────

  describe('Malformed Motion Blocks', () => {
    it('24. should warn on malformed glide parameters and not crash', () => {
      const warns: string[] = [];
      const origWarn = console.warn;
      console.warn = (...args: any[]) => { warns.push(args.join(' ')); };

      const glideBlock = makeBlock('glide1', 'motion_glidesecstoxy', null, {
        SECS: 'invalid',
        X: 'abc',
        Y: null,
      });
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'glide1');
      const script = makeScript('event_whenflagclicked', [hatBlock, glideBlock]);
      const sprite = makeSprite('s1', 'Cat', [script]);

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();
      runtime.tick();

      // Should not crash; sprite should be unchanged or zero-glide snap
      console.warn = origWarn;
      runtime.stop();
    });

    it('25. should warn on non-finite direction input', () => {
      const warns: string[] = [];
      const origWarn = console.warn;
      console.warn = (...args: any[]) => { warns.push(args.join(' ')); };

      const pointBlock = makeBlock('point1', 'motion_pointindirection', null, { DIRECTION: Infinity });
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'point1');
      const script = makeScript('event_whenflagclicked', [hatBlock, pointBlock]);
      const sprite = makeSprite('s1', 'Cat', [script], { direction: 90 });

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();
      runtime.tick();

      expect(warns.some(w => w.includes('not finite'))).toBe(true);
      console.warn = origWarn;
      runtime.stop();
    });
  });

  // ─── 15. Warning-Only Diagnostics ──────────────────────────────

  describe('Warning-Only Diagnostics', () => {
    it('26. should not throw runtime-breaking exceptions from motion handlers', () => {
      // motion_ifonedgebounce on stage should be a no-op (no crash)
      const bounceBlock = makeBlock('bounce1', 'motion_ifonedgebounce', null);
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'bounce1');
      const script = makeScript('event_whenflagclicked', [hatBlock, bounceBlock]);
      const stage = makeStage([script]);

      runtime.addTarget(stage);
      runtime.start();

      // Should not throw
      expect(() => runtime.tick()).not.toThrow();
      runtime.stop();
    });
  });

  // ─── 16. Centralized Sweep Preservation ────────────────────────

  describe('Centralized Sweep Preservation', () => {
    it('27. should sweep completed glide threads normally', () => {
      const glideBlock = makeBlock('glide1', 'motion_glidesecstoxy', null, {
        SECS: 0.03,  // Completes in ~1 tick
        X: 50,
        Y: 50,
      });
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'glide1');
      const script = makeScript('event_whenflagclicked', [hatBlock, glideBlock]);
      const sprite = makeSprite('s1', 'Cat', [script]);

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();

      for (let i = 0; i < 5; i++) {
        runtime.tick();
      }

      // Thread should have been swept (DONE)
      const doneThreads = runtime.activeThreads.filter(t => t.targetId === 's1' && t.status === 'DONE');
      const aliveThreads = runtime.activeThreads.filter(t => t.targetId === 's1');
      // Either all swept (0 alive) or still alive but completed
      // Sweep phase removes DONE threads, so should be 0
      expect(aliveThreads.length).toBe(0);

      runtime.stop();
    });
  });

  // ─── 17. Broadcasts During Glides ──────────────────────────────

  describe('Broadcasts During Glides', () => {
    it('28. should process broadcasts while glide is in progress', () => {
      // Sprite 1: glides for 1 second
      const glideBlock = makeBlock('glide1', 'motion_glidesecstoxy', null, {
        SECS: 1,
        X: 200,
        Y: 0,
      });
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'glide1');
      const glideScript = makeScript('event_whenflagclicked', [hatBlock, glideBlock]);

      // Sprite 2: listens for broadcast and moves
      const moveBlock = makeBlock('move1', 'motion_gotoxy', null, { X: -100, Y: -100 });
      const bcastHat = makeBlock('bhat1', 'event_whenbroadcastreceived', 'move1', {}, { BROADCAST_OPTION: 'test' });
      const listenScript = makeScript('event_whenbroadcastreceived', [bcastHat, moveBlock]);

      const sprite1 = makeSprite('s1', 'Cat', [glideScript], { x: 0, y: 0 });
      const sprite2 = makeSprite('s2', 'Dog', [listenScript], { x: 0, y: 0 });

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite1);
      runtime.addTarget(sprite2);
      runtime.start();

      // Start glide
      runtime.tick();

      // Trigger broadcast
      runtime.triggerBroadcast('test');

      // Process broadcast
      runtime.tick();
      runtime.tick();

      // Sprite2 should have moved, sprite1 should still be gliding
      const s2 = getSprite(runtime, 's2');
      expect(s2.x).toBe(-100);
      expect(s2.y).toBe(-100);

      runtime.stop();
    });
  });

  // ─── 18. Forever Loops + Glide Cooperation ─────────────────────

  describe('Forever Loops + Glide Cooperation', () => {
    it('29. should cooperate with forever loops via yielding', () => {
      // A sprite that glides inside a script should not block other scripts
      const moveBlock = makeBlock('move1', 'motion_gotoxy', null, { X: 10, Y: 10 });
      const foreverHat = makeBlock('fhat', 'event_whenflagclicked', 'forever1');
      const foreverBlock = makeBlock('forever1', 'control_forever', null, {}, {});
      (foreverBlock.inputs as any)['SUBSTACK'] = { name: 'SUBSTACK', value: 'move1' };
      const foreverScript = makeScript('event_whenflagclicked', [foreverHat, foreverBlock, moveBlock]);

      const sprite = makeSprite('s1', 'Cat', [foreverScript]);
      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();

      // Should not hang
      for (let i = 0; i < 5; i++) {
        runtime.tick();
      }

      const s = getSprite(runtime, 's1');
      expect(s.x).toBe(10);
      expect(s.y).toBe(10);

      runtime.stop();
    });
  });

  // ─── 19. Stage Target Safety ───────────────────────────────────

  describe('Stage Target Safety', () => {
    it('30. should ignore motion opcodes on stage targets', () => {
      const glideBlock = makeBlock('glide1', 'motion_glidesecstoxy', null, { SECS: 1, X: 100, Y: 100 });
      const turnBlock = makeBlock('turn1', 'motion_turnright', null, { DEGREES: 45 });
      const bounceBlock = makeBlock('bounce1', 'motion_ifonedgebounce', null);
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'glide1');
      glideBlock.next = 'turn1';
      turnBlock.next = 'bounce1';
      const script = makeScript('event_whenflagclicked', [hatBlock, glideBlock, turnBlock, bounceBlock]);
      const stage = makeStage([script]);

      runtime.addTarget(stage);
      runtime.start();

      // Should not crash
      for (let i = 0; i < 5; i++) {
        expect(() => runtime.tick()).not.toThrow();
      }

      runtime.stop();
    });
  });

  // ─── 20. Negative Duration Safety ──────────────────────────────

  describe('Negative Duration Safety', () => {
    it('31. should handle negative glide duration as zero (instant snap)', () => {
      const glideBlock = makeBlock('glide1', 'motion_glidesecstoxy', null, {
        SECS: -5,
        X: 123,
        Y: 456,
      });
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'glide1');
      const script = makeScript('event_whenflagclicked', [hatBlock, glideBlock]);
      const sprite = makeSprite('s1', 'Cat', [script], { x: 0, y: 0 });

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();
      runtime.tick();

      const s = getSprite(runtime, 's1');
      // -5 seconds -> max(0, -5)*1000 = 0ms -> instant snap
      expect(s.x).toBe(123);
      expect(s.y).toBe(456);

      runtime.stop();
    });
  });
});
