import { describe, it, expect } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import {
  WiringSessionModel,
  WirePreviewModel,
  WireConnectionModel,
  PinConnectionModel,
  StageState,
} from '../src/types';
import {
  createDefaultWiringSessionModel,
  createDefaultWirePreviewModel,
  createDefaultWireConnectionModel,
  createDefaultPinConnectionModel,
  validateWiringSessionModel,
  validateWirePreviewModel,
  validateWireConnectionModel,
  validatePinConnectionModel,
  validateDuplicateWiringSessionIds,
  validateDuplicateWirePreviewIds,
  validateDuplicateWireConnectionIds,
  validateDuplicatePinConnectionIds,
  checkDuplicateWireConnection,
} from '../src/stage';
import { resetThreadCounter } from '../src/runtime/execution-context';

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

function runtime(): BaseRuntime {
  const rt = new BaseRuntime();
  rt.initialize();
  resetThreadCounter();
  rt.addTarget(makeStage());
  return rt;
}

function session(i: number, id?: string, overrides: Partial<WiringSessionModel> = {}): WiringSessionModel {
  return createDefaultWiringSessionModel(id || `session_${i}`, {
    startPinId: `pin_a_${i}`,
    currentColor: 'red',
    currentPoints: [{ x: i, y: i * 2 }],
    isRoutingActive: true,
    ...overrides,
  });
}

function preview(i: number, id?: string, overrides: Partial<WirePreviewModel> = {}): WirePreviewModel {
  return createDefaultWirePreviewModel(id || `preview_${i}`, {
    points: [{ x: i * 2, y: i * 3 }],
    color: 'blue',
    isValidTarget: true,
    ...overrides,
  });
}

function connection(i: number, id?: string, overrides: Partial<WireConnectionModel> = {}): WireConnectionModel {
  return createDefaultWireConnectionModel(id || `connection_${i}`, {
    startPinId: `pin_a_${i}`,
    endPinId: `pin_b_${i}`,
    color: 'green',
    routePoints: [{ x: i, y: i * 4 }],
    ...overrides,
  });
}

function pinConn(i: number, id?: string, overrides: Partial<PinConnectionModel> = {}): PinConnectionModel {
  return createDefaultPinConnectionModel(id || `pinConn_${i}`, {
    pinId: `pin_${i}`,
    connectedWireIds: [`connection_${i}`],
    ...overrides,
  });
}

describe('Phase 20B: Interactive Wiring System Foundation Tests', () => {

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1: CRUD Operations (Loops of 1,200 assertions inside)
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 1: Wiring Session CRUD', () => {
    it('registers and retrieves wiring sessions', () => {
      for (let i = 0; i < 1200; i++) {
        const rt = runtime();
        rt.registerWiringSessionModel(session(i));
        const result = rt.getWiringSessionModel(`session_${i}`);
        expect(result).toBeDefined();
        expect(result!.sessionId).toBe(`session_${i}`);
        expect(result!.startPinId).toBe(`pin_a_${i}`);
      }
    });

    it('retrieves ordered wiring sessions list', () => {
      const rt = runtime();
      for (let i = 0; i < 1200; i++) {
        rt.registerWiringSessionModel(session(i, `session_${i}`));
      }
      const all = rt.getWiringSessionModels();
      expect(all.length).toBe(1200);
      expect(all[0].sessionId).toBe('session_0');
      expect(all[1199].sessionId).toBe('session_1199');
    });

    it('updates wiring sessions', () => {
      for (let i = 0; i < 1200; i++) {
        const rt = runtime();
        rt.registerWiringSessionModel(session(i));
        rt.updateWiringSessionModel(`session_${i}`, { isRoutingActive: false, currentColor: 'yellow' });
        const result = rt.getWiringSessionModel(`session_${i}`);
        expect(result!.isRoutingActive).toBe(false);
        expect(result!.currentColor).toBe('yellow');
      }
    });

    it('removes wiring sessions', () => {
      for (let i = 0; i < 1200; i++) {
        const rt = runtime();
        rt.registerWiringSessionModel(session(i));
        rt.removeWiringSessionModel(`session_${i}`);
        expect(rt.getWiringSessionModel(`session_${i}`)).toBeUndefined();
      }
    });
  });

  describe('SECTION 1: Wire Preview CRUD', () => {
    it('registers and retrieves wire previews', () => {
      for (let i = 0; i < 1200; i++) {
        const rt = runtime();
        rt.registerWirePreviewModel(preview(i));
        const result = rt.getWirePreviewModel(`preview_${i}`);
        expect(result).toBeDefined();
        expect(result!.previewId).toBe(`preview_${i}`);
        expect(result!.color).toBe('blue');
      }
    });

    it('retrieves ordered wire previews list', () => {
      const rt = runtime();
      for (let i = 0; i < 1200; i++) {
        rt.registerWirePreviewModel(preview(i, `preview_${i}`));
      }
      const all = rt.getWirePreviewModels();
      expect(all.length).toBe(1200);
    });

    it('updates wire previews', () => {
      for (let i = 0; i < 1200; i++) {
        const rt = runtime();
        rt.registerWirePreviewModel(preview(i));
        rt.updateWirePreviewModel(`preview_${i}`, { isValidTarget: false, color: 'orange' });
        const result = rt.getWirePreviewModel(`preview_${i}`);
        expect(result!.isValidTarget).toBe(false);
        expect(result!.color).toBe('orange');
      }
    });

    it('removes wire previews', () => {
      for (let i = 0; i < 1200; i++) {
        const rt = runtime();
        rt.registerWirePreviewModel(preview(i));
        rt.removeWirePreviewModel(`preview_${i}`);
        expect(rt.getWirePreviewModel(`preview_${i}`)).toBeUndefined();
      }
    });
  });

  describe('SECTION 1: Wire Connection CRUD', () => {
    it('registers and retrieves wire connections', () => {
      for (let i = 0; i < 1200; i++) {
        const rt = runtime();
        rt.registerWireConnectionModel(connection(i));
        const result = rt.getWireConnectionModel(`connection_${i}`);
        expect(result).toBeDefined();
        expect(result!.connectionId).toBe(`connection_${i}`);
        expect(result!.color).toBe('green');
      }
    });

    it('retrieves ordered wire connections list', () => {
      const rt = runtime();
      for (let i = 0; i < 1200; i++) {
        rt.registerWireConnectionModel(connection(i, `connection_${i}`));
      }
      const all = rt.getWireConnectionModels();
      expect(all.length).toBe(1200);
    });

    it('updates wire connections', () => {
      for (let i = 0; i < 1200; i++) {
        const rt = runtime();
        rt.registerWireConnectionModel(connection(i));
        rt.updateWireConnectionModel(`connection_${i}`, { color: 'white' });
        const result = rt.getWireConnectionModel(`connection_${i}`);
        expect(result!.color).toBe('white');
      }
    });

    it('removes wire connections', () => {
      for (let i = 0; i < 1200; i++) {
        const rt = runtime();
        rt.registerWireConnectionModel(connection(i));
        rt.removeWireConnectionModel(`connection_${i}`);
        expect(rt.getWireConnectionModel(`connection_${i}`)).toBeUndefined();
      }
    });
  });

  describe('SECTION 1: Pin Connection CRUD', () => {
    it('registers and retrieves pin connections', () => {
      for (let i = 0; i < 1200; i++) {
        const rt = runtime();
        rt.registerPinConnectionModel(pinConn(i));
        const result = rt.getPinConnectionModel(`pinConn_${i}`);
        expect(result).toBeDefined();
        expect(result!.pinConnectionId).toBe(`pinConn_${i}`);
        expect(result!.pinId).toBe(`pin_${i}`);
      }
    });

    it('retrieves ordered pin connections list', () => {
      const rt = runtime();
      for (let i = 0; i < 1200; i++) {
        rt.registerPinConnectionModel(pinConn(i, `pinConn_${i}`));
      }
      const all = rt.getPinConnectionModels();
      expect(all.length).toBe(1200);
    });

    it('updates pin connections', () => {
      for (let i = 0; i < 1200; i++) {
        const rt = runtime();
        rt.registerPinConnectionModel(pinConn(i));
        rt.updatePinConnectionModel(`pinConn_${i}`, { connectedWireIds: ['new_wire_id'] });
        const result = rt.getPinConnectionModel(`pinConn_${i}`);
        expect(result!.connectedWireIds).toContain('new_wire_id');
      }
    });

    it('removes pin connections', () => {
      for (let i = 0; i < 1200; i++) {
        const rt = runtime();
        rt.registerPinConnectionModel(pinConn(i));
        rt.removePinConnectionModel(`pinConn_${i}`);
        expect(rt.getPinConnectionModel(`pinConn_${i}`)).toBeUndefined();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 2: High-Level Interactive Wiring Workflows
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 2: High-Level Interactive Wiring Workflows', () => {
    it('simulates starting and cancelling a wiring session', () => {
      for (let i = 0; i < 1200; i++) {
        const rt = runtime();
        const sessId = `session_${i}`;
        const pinId = `pin_a_${i}`;
        const color = 'purple';

        rt.startWiring(sessId, pinId, color);

        const sess = rt.getWiringSessionModel(sessId);
        expect(sess).toBeDefined();
        expect(sess!.startPinId).toBe(pinId);
        expect(sess!.currentColor).toBe(color);

        const prev = rt.getWirePreviewModel(`preview_${sessId}`);
        expect(prev).toBeDefined();
        expect(prev!.color).toBe(color);

        // Cancel workflow
        rt.cancelWiring(sessId);
        expect(rt.getWiringSessionModel(sessId)).toBeUndefined();
        expect(rt.getWirePreviewModel(`preview_${sessId}`)).toBeUndefined();
      }
    });

    it('simulates starting and finishing a wiring session', () => {
      for (let i = 0; i < 1200; i++) {
        const rt = runtime();
        const sessId = `session_${i}`;
        const startPin = `pin_start_${i}`;
        const endPin = `pin_end_${i}`;
        const color = 'orange';

        rt.startWiring(sessId, startPin, color);

        // Update session points during routing preview simulation
        rt.updateWiringSessionModel(sessId, { currentPoints: [{ x: 10, y: 20 }] });

        rt.finishWiring(sessId, endPin);

        // Verify session and preview are cleared
        expect(rt.getWiringSessionModel(sessId)).toBeUndefined();
        expect(rt.getWirePreviewModel(`preview_${sessId}`)).toBeUndefined();

        // Verify connection is committed
        const conns = rt.getWireConnectionModels();
        expect(conns.length).toBe(1);
        const conn = conns[0];
        expect(conn.startPinId).toBe(startPin);
        expect(conn.endPinId).toBe(endPin);
        expect(conn.color).toBe(color);
        expect(conn.routePoints).toEqual([{ x: 10, y: 20 }]);

        // Verify pin connections are registered
        const pinConnStart = rt.getPinConnectionModel(`pin_conn_${startPin}`);
        expect(pinConnStart).toBeDefined();
        expect(pinConnStart!.connectedWireIds).toContain(conn.connectionId);

        const pinConnEnd = rt.getPinConnectionModel(`pin_conn_${endPin}`);
        expect(pinConnEnd).toBeDefined();
        expect(pinConnEnd!.connectedWireIds).toContain(conn.connectionId);
      }
    });

    it('simulates deleting an active wire connection', () => {
      for (let i = 0; i < 1200; i++) {
        const rt = runtime();
        const sessId = `session_${i}`;
        const startPin = `pin_start_${i}`;
        const endPin = `pin_end_${i}`;

        rt.startWiring(sessId, startPin, 'red');
        rt.finishWiring(sessId, endPin);

        const conns = rt.getWireConnectionModels();
        const conn = conns[0];
        const connId = conn.connectionId;

        // Verify pin connections exist
        expect(rt.getPinConnectionModel(`pin_conn_${startPin}`)!.connectedWireIds).toContain(connId);
        expect(rt.getPinConnectionModel(`pin_conn_${endPin}`)!.connectedWireIds).toContain(connId);

        // Delete connection
        rt.deleteWireConnection(connId);

        // Connection should be gone
        expect(rt.getWireConnectionModel(connId)).toBeUndefined();

        // Pin connections should be cleared
        expect(rt.getPinConnectionModel(`pin_conn_${startPin}`)!.connectedWireIds).not.toContain(connId);
        expect(rt.getPinConnectionModel(`pin_conn_${endPin}`)!.connectedWireIds).not.toContain(connId);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 3: Validations & Warning-Only Connection Checks
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 3: Validations & Warning-Only Connection Checks', () => {
    it('verifies validator warnings for malformed data', () => {
      for (let i = 0; i < 1200; i++) {
        // Invalid session
        const invalidSession = createDefaultWiringSessionModel(`session_${i}`, { sessionId: '', startPinId: '', currentColor: 'invalid_color' });
        const sessWarns = validateWiringSessionModel(invalidSession);
        expect(sessWarns.length).toBeGreaterThan(0);

        // Invalid preview
        const invalidPreview = createDefaultWirePreviewModel(`preview_${i}`, { previewId: '', color: 'invalid_color' });
        const prevWarns = validateWirePreviewModel(invalidPreview);
        expect(prevWarns.length).toBeGreaterThan(0);

        // Invalid connection
        const invalidConn = createDefaultWireConnectionModel(`connection_${i}`, { connectionId: '', startPinId: '', endPinId: '', color: 'invalid_color' });
        const connWarns = validateWireConnectionModel(invalidConn);
        expect(connWarns.length).toBeGreaterThan(0);

        // Invalid pin connection
        const invalidPin = createDefaultPinConnectionModel(`pinConn_${i}`, { pinConnectionId: '', pinId: '' });
        const pinWarns = validatePinConnectionModel(invalidPin);
        expect(pinWarns.length).toBeGreaterThan(0);
      }
    });

    it('verifies warning-only check for duplicate connections', () => {
      for (let i = 0; i < 1200; i++) {
        const conn1 = createDefaultWireConnectionModel(`conn1_${i}`, { startPinId: 'pinA', endPinId: 'pinB' });
        const conn2 = createDefaultWireConnectionModel(`conn2_${i}`, { startPinId: 'pinA', endPinId: 'pinB' }); // Same start/end
        const conn3 = createDefaultWireConnectionModel(`conn3_${i}`, { startPinId: 'pinB', endPinId: 'pinA' }); // Flipped start/end

        const list = [conn1, conn2, conn3];
        const dupWarns = checkDuplicateWireConnection(conn2, list);
        expect(dupWarns.length).toBeGreaterThan(0);
        expect(dupWarns[0].code).toBe('DUPLICATE_CONNECTION');

        const flippedWarns = checkDuplicateWireConnection(conn3, list);
        expect(flippedWarns.length).toBeGreaterThan(0);
        expect(flippedWarns[0].code).toBe('DUPLICATE_CONNECTION');
      }
    });

    it('verifies warning-only self-connection checks', () => {
      for (let i = 0; i < 1200; i++) {
        const selfConn = createDefaultWireConnectionModel(`conn_${i}`, { startPinId: 'pinA', endPinId: 'pinA' });
        const warns = validateWireConnectionModel(selfConn);
        const selfWarn = warns.find(w => w.code === 'SELF_CONNECTION');
        expect(selfWarn).toBeDefined();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 4: Serialization and Clone Safety
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 4: Serialization and Clone Safety', () => {
    it('verifies round-trip project serialization preserves wiring state', () => {
      for (let i = 0; i < 1200; i++) {
        const rt = runtime();
        const sess = session(i, `session_${i}`);
        const prev = preview(i, `preview_${i}`);
        const conn = connection(i, `connection_${i}`);
        const pin = pinConn(i, `pinConn_${i}`);

        rt.registerWiringSessionModel(sess);
        rt.registerWirePreviewModel(prev);
        rt.registerWireConnectionModel(conn);
        rt.registerPinConnectionModel(pin);

        // Export project
        const project = rt.exportProject();
        expect(project).toBeDefined();

        // Re-import to fresh runtime
        const freshRt = runtime();
        freshRt.importProject(project);

        // Verify state is restored
        const restoredSess = freshRt.getWiringSessionModel(`session_${i}`);
        expect(restoredSess).toBeDefined();
        expect(restoredSess!.startPinId).toBe(sess.startPinId);

        const restoredPrev = freshRt.getWirePreviewModel(`preview_${i}`);
        expect(restoredPrev).toBeDefined();
        expect(restoredPrev!.color).toBe(prev.color);

        const restoredConn = freshRt.getWireConnectionModel(`connection_${i}`);
        expect(restoredConn).toBeDefined();
        expect(restoredConn!.color).toBe(conn.color);

        const restoredPin = freshRt.getPinConnectionModel(`pinConn_${i}`);
        expect(restoredPin).toBeDefined();
        expect(restoredPin!.connectedWireIds).toEqual(pin.connectedWireIds);
      }
    });

    it('verifies deep clone clone-safety of registry returns', () => {
      const rt = runtime();
      const sess = session(0, 'session_test');
      rt.registerWiringSessionModel(sess);

      // Verify modifying retrieved model doesn't affect registry
      const retrieved = rt.getWiringSessionModel('session_test')!;
      retrieved.currentColor = 'black';
      expect(rt.getWiringSessionModel('session_test')!.currentColor).toBe('red');

      // Verify modifying updates input doesn't leak
      const updates = { currentColor: 'yellow' };
      rt.updateWiringSessionModel('session_test', updates);
      updates.currentColor = 'white';
      expect(rt.getWiringSessionModel('session_test')!.currentColor).toBe('yellow');
    });
  });
});
