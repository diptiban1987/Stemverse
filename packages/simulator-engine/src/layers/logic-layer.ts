import type {
  ComponentRuntimeState,
  PinStateMap,
  SimComponentPlacement,
  WorkspaceBlockSnapshot,
} from '../types';
import {
  applyPinToComponents,
  createDefaultComponentState,
  updateBuzzerTone,
  updateServoAngle,
} from '../components/behaviors';

/**
 * Logic layer — interprets Blockly block snapshots and updates runtime state.
 */
export class LogicLayer {
  private blocks: WorkspaceBlockSnapshot[] = [];
  private loopIndex = 0;

  setBlocks(blocks: WorkspaceBlockSnapshot[]): void {
    this.blocks = blocks;
    this.loopIndex = 0;
  }

  reset(): void {
    this.loopIndex = 0;
  }

  getLoopBlocks(): WorkspaceBlockSnapshot[] {
    const program = this.blocks.find((b) => b.type === 'stemverse_program');
    return program?.children?.loop ?? [];
  }

  getSetupBlocks(): WorkspaceBlockSnapshot[] {
    const program = this.blocks.find((b) => b.type === 'stemverse_program');
    return program?.children?.setup ?? [];
  }

  runSetup(pinStates: PinStateMap): PinStateMap {
    const next = { ...pinStates };
    for (const block of this.getSetupBlocks()) {
      this.applyBlock(block, next);
    }
    return next;
  }

  tick(
    pinStates: PinStateMap,
    placements: SimComponentPlacement[],
    componentStates: Record<string, ComponentRuntimeState>,
  ): { pinStates: PinStateMap; componentStates: Record<string, ComponentRuntimeState> } {
    const loopBlocks = this.getLoopBlocks();
    if (loopBlocks.length === 0) {
      return { pinStates, componentStates };
    }

    const block = loopBlocks[this.loopIndex % loopBlocks.length];
    this.loopIndex += 1;

    const nextPins = { ...pinStates };
    this.applyBlock(block, nextPins);

    let nextStates = applyPinToComponents(nextPins, placements, componentStates);
    nextStates = this.applyBlockToComponents(block, placements, nextStates);

    return { pinStates: nextPins, componentStates: nextStates };
  }

  readSensorValue(
    sensor: string,
    property: string,
    componentStates: Record<string, ComponentRuntimeState>,
    placements: SimComponentPlacement[],
  ): number {
    if (sensor === 'dht22' || sensor === 'dht11') {
      const dht = placements.find((p) => p.type === 'dht22');
      if (!dht) return property === 'humidity' ? 50 : 22;
      const state = componentStates[dht.id]?.dht22;
      if (property === 'humidity') return state?.humidityPercent ?? 50;
      return state?.temperatureC ?? 22;
    }

    if (sensor === 'hc_sr04') {
      const sonar = placements.find((p) => p.type === 'hc_sr04');
      if (!sonar) return 30;
      return componentStates[sonar.id]?.hcSr04?.distanceCm ?? 30;
    }

    return 0;
  }

  private applyBlock(block: WorkspaceBlockSnapshot, pinStates: PinStateMap): void {
    const fields = block.fields;

    switch (block.type) {
      case 'stemverse_digital_write': {
        const pin = Number(fields.PIN ?? 13);
        const value = String(fields.VALUE ?? 'LOW');
        pinStates[pin] = value === 'HIGH' ? 'HIGH' : 'LOW';
        break;
      }
      case 'stemverse_toggle_pin': {
        const pin = Number(fields.PIN ?? 13);
        pinStates[pin] = pinStates[pin] === 'HIGH' ? 'LOW' : 'HIGH';
        break;
      }
      case 'stemverse_servo_write': {
        /* angle handled in applyBlockToComponents */
        break;
      }
      case 'stemverse_buzzer_play':
        break;
      case 'stemverse_delay':
        break;
      default:
        break;
    }
  }

  private applyBlockToComponents(
    block: WorkspaceBlockSnapshot,
    placements: SimComponentPlacement[],
    states: Record<string, ComponentRuntimeState>,
  ): Record<string, ComponentRuntimeState> {
    const fields = block.fields;

    if (block.type === 'stemverse_servo_write') {
      const pin = Number(fields.PIN ?? 9);
      const angle = Number(fields.ANGLE ?? 90);
      const servo = placements.find((p) => p.type === 'servo' && p.boardPin === pin);
      if (servo) return updateServoAngle(states, servo.id, angle);
    }

    if (block.type === 'stemverse_buzzer_play') {
      const pin = Number(fields.PIN ?? 8);
      const freq = Number(fields.FREQ ?? 1000);
      const buzzer = placements.find((p) => p.type === 'buzzer' && p.boardPin === pin);
      if (buzzer) return updateBuzzerTone(states, buzzer.id, freq, freq > 0);
    }

    return states;
  }

  initComponentStates(
    placements: SimComponentPlacement[],
  ): Record<string, ComponentRuntimeState> {
    const states: Record<string, ComponentRuntimeState> = {};
    for (const p of placements) {
      states[p.id] = createDefaultComponentState(p);
    }
    return states;
  }
}
