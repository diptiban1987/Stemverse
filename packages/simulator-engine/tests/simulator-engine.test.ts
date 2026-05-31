import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  SimulatorEngine,
  extractBlocksFromWorkspaceJson,
  listVirtualBoards,
  paletteComponentLabel,
} from '../src';

describe('simulator-engine', () => {
  let engine: SimulatorEngine;

  beforeEach(() => {
    engine = new SimulatorEngine({ boardId: 'arduino_uno' });
  });

  afterEach(() => {
    engine.dispose();
  });

  it('lists virtual boards', () => {
    const boards = listVirtualBoards();
    expect(boards.map((b) => b.id)).toEqual(['esp32', 'esp32_s3', 'arduino_uno']);
  });

  it('adds components and updates LED via digital write blocks', () => {
    const ledId = engine.addComponent('led', { boardPin: 13 });
    expect(ledId).toMatch(/^sim_led_/);

    engine.loadWorkspaceBlocks([
      {
        id: 'prog',
        type: 'stemverse_program',
        fields: {},
        children: {
          setup: [],
          loop: [
            {
              id: 'w1',
              type: 'stemverse_digital_write',
              fields: { PIN: 13, VALUE: 'HIGH' },
            },
          ],
        },
      },
    ]);

    engine.start(50);
    const state = engine.getState();
    expect(state.runState).toBe('running');
    expect(state.componentStates[ledId]?.led?.on).toBe(true);
    engine.stop();
  });

  it('updates servo angle from blocks', () => {
    const servoId = engine.addComponent('servo', { boardPin: 9 });
    engine.loadWorkspaceBlocks([
      {
        id: 'prog',
        type: 'stemverse_program',
        fields: {},
        children: {
          setup: [],
          loop: [
            {
              id: 's1',
              type: 'stemverse_servo_write',
              fields: { PIN: 9, ANGLE: 45 },
            },
          ],
        },
      },
    ]);

    engine.start(50);
    expect(engine.getState().componentStates[servoId]?.servo?.angle).toBe(45);
    engine.stop();
  });

  it('reads DHT22 and HC-SR04 manual overrides', () => {
    const dhtId = engine.addComponent('dht22', { boardPin: 4 });
    const sonarId = engine.addComponent('hc_sr04', { boardPin: 5, echoPin: 18 });

    engine.setComponentManualState(dhtId, { temperatureC: 30, humidityPercent: 70 });
    engine.setComponentManualState(sonarId, { distanceCm: 12 });

    expect(engine.readSensor('dht22', 'temperature')).toBe(30);
    expect(engine.readSensor('dht22', 'humidity')).toBe(70);
    expect(engine.readSensor('hc_sr04', 'distance_cm')).toBe(12);
  });

  it('extracts blocks from workspace JSON', () => {
    const blocks = extractBlocksFromWorkspaceJson({
      blocks: {
        blocks: [
          {
            id: 'p1',
            type: 'stemverse_program',
            fields: {},
            inputs: {
              LOOP: {
                block: {
                  id: 'd1',
                  type: 'stemverse_digital_write',
                  fields: { PIN: 13, VALUE: 'LOW' },
                },
              },
            },
          },
        ],
      },
    });

    expect(blocks[0]?.type).toBe('stemverse_program');
    expect(blocks[0]?.children?.loop?.[0]?.type).toBe('stemverse_digital_write');
  });

  it('resets simulation state', () => {
    engine.addComponent('led');
    engine.start(50);
    engine.reset();
    const state = engine.getState();
    expect(state.runState).toBe('idle');
    expect(state.tick).toBe(0);
  });

  it('labels palette components', () => {
    expect(paletteComponentLabel('hc_sr04')).toBe('HC-SR04');
  });
});
