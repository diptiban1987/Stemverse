import type {
  SimulatorEngineOptions,
  SimulatorRunState,
  SimulatorState,
  SimComponentPlacement,
  SimComponentType,
  VirtualBoardId,
  WorkspaceBlockSnapshot,
} from '../types';
import { HardwareLayer } from '../layers/hardware-layer';
import { ElectricalLayer } from '../layers/electrical-layer';
import { LogicLayer } from '../layers/logic-layer';
import { VisualizationLayer } from '../layers/visualization-layer';
import {
  defaultEchoPinForHcSr04,
  defaultPinForComponent,
  paletteComponentLabel,
} from '../components/behaviors';
import { extractBlocksFromWorkspaceJson } from './workspace-blocks';

let componentCounter = 0;

export class SimulatorEngine {
  private hardware: HardwareLayer;
  private electrical: ElectricalLayer;
  private logic: LogicLayer;
  private visualization: VisualizationLayer;
  private runState: SimulatorRunState = 'idle';
  private tick = 0;
  private componentStates: SimulatorState['componentStates'] = {};
  private serialLog: string[] = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onStateChange?: (state: SimulatorState) => void;

  constructor(options: SimulatorEngineOptions = {}) {
    const boardId = options.boardId ?? 'arduino_uno';
    this.hardware = new HardwareLayer(boardId);
    this.electrical = new ElectricalLayer();
    this.logic = new LogicLayer();
    this.visualization = new VisualizationLayer();
    this.onStateChange = options.onStateChange;
  }

  mountVisualization(container: HTMLElement): void {
    this.visualization.mount(container);
    this.emit();
  }

  resizeVisualization(): void {
    this.visualization.resize();
  }

  zoomIn(): void {
    this.visualization.zoomIn();
  }

  zoomOut(): void {
    this.visualization.zoomOut();
  }

  resetView(): void {
    this.visualization.resetView();
  }

  setBoard(boardId: VirtualBoardId): void {
    this.hardware.setBoard(boardId);
    this.componentStates = this.logic.initComponentStates(this.hardware.getComponents());
    this.emit();
  }

  getState(): SimulatorState {
    return {
      boardId: this.hardware.getBoardId(),
      runState: this.runState,
      tick: this.tick,
      pinStates: this.hardware.getPinStates(),
      components: this.hardware.getComponents(),
      componentStates: { ...this.componentStates },
      serialLog: [...this.serialLog],
    };
  }

  addComponent(
    type: SimComponentType,
    options: { boardPin?: number; echoPin?: number; label?: string } = {},
  ): string {
    const id = `sim_${type}_${++componentCounter}`;
    const boardPin = options.boardPin ?? defaultPinForComponent(type);
    const placement: SimComponentPlacement = {
      id,
      type,
      label: options.label ?? paletteComponentLabel(type),
      boardPin,
      echoPin: type === 'hc_sr04' ? (options.echoPin ?? defaultEchoPinForHcSr04(boardPin)) : undefined,
      position: { x: 0, y: 0.35, z: 0 },
    };

    if (this.electrical.isPinUsed(this.hardware.getComponents(), boardPin)) {
      throw new Error(`Pin ${boardPin} is already in use`);
    }

    this.hardware.addComponent(placement);
    this.componentStates[id] = this.logic.initComponentStates([placement])[id]!;
    this.emit();
    return id;
  }

  removeComponent(id: string): void {
    this.hardware.removeComponent(id);
    delete this.componentStates[id];
    this.emit();
  }

  updateComponent(placement: SimComponentPlacement): void {
    this.hardware.updateComponent(placement);
    this.emit();
  }

  setComponentManualState(
    componentId: string,
    patch: Partial<{
      temperatureC: number;
      humidityPercent: number;
      distanceCm: number;
      servoAngle: number;
      buzzerFrequency: number;
      ledOn: boolean;
    }>,
  ): void {
    const placement = this.hardware.getComponents().find((c) => c.id === componentId);
    if (!placement) return;

    const current = this.componentStates[componentId] ?? {};

    if (placement.type === 'dht22' && current.dht22) {
      this.componentStates[componentId] = {
        dht22: {
          ...current.dht22,
          temperatureC: patch.temperatureC ?? current.dht22.temperatureC,
          humidityPercent: patch.humidityPercent ?? current.dht22.humidityPercent,
        },
      };
    }

    if (placement.type === 'hc_sr04' && current.hcSr04) {
      this.componentStates[componentId] = {
        hcSr04: {
          ...current.hcSr04,
          distanceCm: patch.distanceCm ?? current.hcSr04.distanceCm,
        },
      };
    }

    if (placement.type === 'servo' && current.servo && patch.servoAngle !== undefined) {
      this.componentStates[componentId] = {
        servo: { ...current.servo, angle: patch.servoAngle },
      };
    }

    if (placement.type === 'buzzer' && current.buzzer && patch.buzzerFrequency !== undefined) {
      this.componentStates[componentId] = {
        buzzer: {
          ...current.buzzer,
          frequency: patch.buzzerFrequency,
          active: patch.buzzerFrequency > 0,
        },
      };
    }

    if (placement.type === 'led' && current.led && patch.ledOn !== undefined) {
      this.componentStates[componentId] = {
        led: { ...current.led, on: patch.ledOn },
      };
      this.hardware.writePin(placement.boardPin, patch.ledOn ? 'HIGH' : 'LOW');
    }

    this.emit();
  }

  loadWorkspaceBlocks(blocks: WorkspaceBlockSnapshot[]): void {
    this.logic.setBlocks(blocks);
  }

  loadWorkspaceJson(workspaceJson: Record<string, unknown>): void {
    this.loadWorkspaceBlocks(extractBlocksFromWorkspaceJson(workspaceJson));
  }

  start(tickMs = 500): void {
    if (this.runState === 'running') return;

    const setupPins = this.logic.runSetup(this.hardware.getPinStates());
    for (const [pin, level] of Object.entries(setupPins)) {
      this.hardware.writePin(Number(pin), level);
    }

    this.componentStates = this.logic.initComponentStates(this.hardware.getComponents());
    this.componentStates = this.logic.tick(
      setupPins,
      this.hardware.getComponents(),
      this.componentStates,
    ).componentStates;

    this.runState = 'running';
    this.appendSerial('Simulation started');

    this.intervalId = setInterval(() => {
      this.tick += 1;
      const pins = this.hardware.getPinStates();
      const result = this.logic.tick(
        pins,
        this.hardware.getComponents(),
        this.componentStates,
      );
      for (const [pin, level] of Object.entries(result.pinStates)) {
        this.hardware.writePin(Number(pin), level);
      }
      this.componentStates = result.componentStates;
      this.electrical.propagate(result.pinStates, this.hardware.getComponents());
      this.emit();
    }, tickMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.runState = 'stopped';
    this.appendSerial('Simulation stopped');
    this.emit();
  }

  reset(): void {
    this.stop();
    this.tick = 0;
    this.runState = 'idle';
    this.hardware.resetPins();
    this.logic.reset();
    this.componentStates = this.logic.initComponentStates(this.hardware.getComponents());
    this.serialLog = [];
    this.appendSerial('Simulation reset');
    this.emit();
  }

  readSensor(sensor: string, property: string): number {
    return this.logic.readSensorValue(
      sensor,
      property,
      this.componentStates,
      this.hardware.getComponents(),
    );
  }

  dispose(): void {
    this.stop();
    this.visualization.dispose();
  }

  private appendSerial(line: string): void {
    this.serialLog = [...this.serialLog.slice(-99), `[${new Date().toISOString().slice(11, 19)}] ${line}`];
  }

  private emit(): void {
    const state = this.getState();
    this.visualization.render(state);
    this.onStateChange?.(state);
  }
}
