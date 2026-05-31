import type {
  ComponentRuntimeState,
  Dht22State,
  HcSr04State,
  LedState,
  BuzzerState,
  ServoState,
  SimComponentPlacement,
  SimComponentType,
  PinStateMap,
} from '../types';

export const DEFAULT_DHT22: Pick<Dht22State, 'temperatureC' | 'humidityPercent'> = {
  temperatureC: 24,
  humidityPercent: 55,
};

export const DEFAULT_HC_SR04: Pick<HcSr04State, 'distanceCm'> = {
  distanceCm: 30,
};

export function createDefaultComponentState(
  placement: SimComponentPlacement,
): ComponentRuntimeState {
  switch (placement.type) {
    case 'led':
      return {
        led: { on: false, pin: placement.boardPin },
      };
    case 'buzzer':
      return {
        buzzer: { active: false, frequency: 0, pin: placement.boardPin },
      };
    case 'servo':
      return {
        servo: { angle: 90, pin: placement.boardPin },
      };
    case 'dht22':
      return {
        dht22: {
          pin: placement.boardPin,
          ...DEFAULT_DHT22,
        },
      };
    case 'hc_sr04':
      return {
        hcSr04: {
          triggerPin: placement.boardPin,
          echoPin: placement.echoPin ?? placement.boardPin + 1,
          ...DEFAULT_HC_SR04,
        },
      };
    default:
      return {};
  }
}

export function applyPinToComponents(
  pinStates: PinStateMap,
  placements: SimComponentPlacement[],
  states: Record<string, ComponentRuntimeState>,
): Record<string, ComponentRuntimeState> {
  const next = { ...states };

  for (const placement of placements) {
    const current = next[placement.id] ?? createDefaultComponentState(placement);

    if (placement.type === 'led') {
      const level = pinStates[placement.boardPin] ?? 'LOW';
      next[placement.id] = {
        led: { pin: placement.boardPin, on: level === 'HIGH' },
      };
      continue;
    }

    if (placement.type === 'servo' && current.servo) {
      next[placement.id] = { servo: { ...current.servo } };
      continue;
    }

    if (placement.type === 'buzzer' && current.buzzer) {
      next[placement.id] = { buzzer: { ...current.buzzer } };
      continue;
    }

    if (placement.type === 'dht22' && current.dht22) {
      next[placement.id] = { dht22: { ...current.dht22 } };
      continue;
    }

    if (placement.type === 'hc_sr04' && current.hcSr04) {
      next[placement.id] = { hcSr04: { ...current.hcSr04 } };
    }
  }

  return next;
}

export function updateServoAngle(
  states: Record<string, ComponentRuntimeState>,
  componentId: string,
  angle: number,
): Record<string, ComponentRuntimeState> {
  const prev = states[componentId];
  if (!prev?.servo) return states;
  return {
    ...states,
    [componentId]: {
      servo: { ...prev.servo, angle: Math.max(0, Math.min(180, angle)) },
    },
  };
}

export function updateBuzzerTone(
  states: Record<string, ComponentRuntimeState>,
  componentId: string,
  frequency: number,
  active: boolean,
): Record<string, ComponentRuntimeState> {
  const prev = states[componentId];
  if (!prev?.buzzer) return states;
  return {
    ...states,
    [componentId]: {
      buzzer: { ...prev.buzzer, frequency, active },
    },
  };
}

export function updateDht22(
  states: Record<string, ComponentRuntimeState>,
  componentId: string,
  temperatureC: number,
  humidityPercent: number,
): Record<string, ComponentRuntimeState> {
  const prev = states[componentId];
  if (!prev?.dht22) return states;
  return {
    ...states,
    [componentId]: {
      dht22: {
        ...prev.dht22,
        temperatureC,
        humidityPercent: Math.max(0, Math.min(100, humidityPercent)),
      },
    },
  };
}

export function updateHcSr04Distance(
  states: Record<string, ComponentRuntimeState>,
  componentId: string,
  distanceCm: number,
): Record<string, ComponentRuntimeState> {
  const prev = states[componentId];
  if (!prev?.hcSr04) return states;
  return {
    ...states,
    [componentId]: {
      hcSr04: {
        ...prev.hcSr04,
        distanceCm: Math.max(2, Math.min(400, distanceCm)),
      },
    },
  };
}

export function paletteComponentLabel(type: SimComponentType): string {
  const labels: Record<SimComponentType, string> = {
    led: 'LED',
    buzzer: 'Buzzer',
    servo: 'Servo',
    dht22: 'DHT22',
    hc_sr04: 'HC-SR04',
  };
  return labels[type];
}

export function defaultPinForComponent(type: SimComponentType): number {
  const pins: Record<SimComponentType, number> = {
    led: 13,
    buzzer: 8,
    servo: 9,
    dht22: 4,
    hc_sr04: 5,
  };
  return pins[type];
}

export function defaultEchoPinForHcSr04(triggerPin: number): number {
  return triggerPin + 1;
}
