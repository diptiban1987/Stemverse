export type VirtualBoardId = 'esp32' | 'esp32_s3' | 'arduino_uno';

export type SimComponentType = 'led' | 'buzzer' | 'servo' | 'dht22' | 'hc_sr04';

export type SimulatorRunState = 'idle' | 'running' | 'stopped';

export type PinLevel = 'HIGH' | 'LOW';

export type PinStateMap = Record<number, PinLevel>;

export interface VirtualBoardDefinition {
  id: VirtualBoardId;
  name: string;
  pinCount: number;
  width: number;
  height: number;
  color: string;
}

export interface SimComponentPlacement {
  id: string;
  type: SimComponentType;
  label: string;
  boardPin: number;
  echoPin?: number;
  position: { x: number; y: number; z: number };
}

export interface LedState {
  on: boolean;
  pin: number;
}

export interface BuzzerState {
  active: boolean;
  frequency: number;
  pin: number;
}

export interface ServoState {
  angle: number;
  pin: number;
}

export interface Dht22State {
  temperatureC: number;
  humidityPercent: number;
  pin: number;
}

export interface HcSr04State {
  distanceCm: number;
  triggerPin: number;
  echoPin: number;
}

export interface ComponentRuntimeState {
  led?: LedState;
  buzzer?: BuzzerState;
  servo?: ServoState;
  dht22?: Dht22State;
  hcSr04?: HcSr04State;
}

export interface SimulatorState {
  boardId: VirtualBoardId;
  runState: SimulatorRunState;
  tick: number;
  pinStates: PinStateMap;
  components: SimComponentPlacement[];
  componentStates: Record<string, ComponentRuntimeState>;
  serialLog: string[];
}

export interface WorkspaceBlockSnapshot {
  id: string;
  type: string;
  fields: Record<string, string | number>;
  children?: {
    setup?: WorkspaceBlockSnapshot[];
    loop?: WorkspaceBlockSnapshot[];
    body?: WorkspaceBlockSnapshot[];
  };
}

export interface SimulatorEngineOptions {
  boardId?: VirtualBoardId;
  onStateChange?: (state: SimulatorState) => void;
}
