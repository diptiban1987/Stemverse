import type {
  ComponentActuatorRecord,
  ComponentBoardRecord,
  ComponentDisplayRecord,
  ComponentRegistrySnapshot,
  ComponentSensorRecord,
} from './types';
import { STATIC_ACTUATORS, STATIC_BOARDS, STATIC_DISPLAYS, STATIC_SENSORS } from './static-data';

let snapshot: ComponentRegistrySnapshot = {
  boards: [...STATIC_BOARDS],
  sensors: [...STATIC_SENSORS],
  actuators: [...STATIC_ACTUATORS],
  displays: [...STATIC_DISPLAYS],
  source: 'static',
};

export function getComponentRegistry(): ComponentRegistrySnapshot {
  return snapshot;
}

export function getRegistryBoard(slug: string): ComponentBoardRecord | undefined {
  return snapshot.boards.find((b) => b.slug === slug);
}

export function getRegistrySensor(slug: string): ComponentSensorRecord | undefined {
  return snapshot.sensors.find((s) => s.slug === slug);
}

export function getRegistryActuator(slug: string): ComponentActuatorRecord | undefined {
  return snapshot.actuators.find((a) => a.slug === slug);
}

export function listRegistrySensors(): ComponentSensorRecord[] {
  return snapshot.sensors.filter((s) => s.active !== false);
}

export function listRegistryActuators(): ComponentActuatorRecord[] {
  return snapshot.actuators.filter((a) => a.active !== false);
}

export function listRegistryBoards(): ComponentBoardRecord[] {
  return snapshot.boards.filter((b) => b.active !== false);
}

export function listRegistryDisplays(): ComponentDisplayRecord[] {
  return (snapshot.displays ?? []).filter((d) => d.active !== false);
}

export function getRegistryDisplay(slug: string): ComponentDisplayRecord | undefined {
  return snapshot.displays?.find((d) => d.slug === slug);
}

/** Hydrate registry from API/DB payload — future components load dynamically */
export function hydrateComponentRegistry(data: {
  boards?: ComponentBoardRecord[];
  sensors?: ComponentSensorRecord[];
  actuators?: ComponentActuatorRecord[];
  displays?: ComponentDisplayRecord[];
}): ComponentRegistrySnapshot {
  snapshot = {
    boards: data.boards?.length ? data.boards : [...STATIC_BOARDS],
    sensors: data.sensors?.length ? data.sensors : [...STATIC_SENSORS],
    actuators: data.actuators?.length ? data.actuators : [...STATIC_ACTUATORS],
    displays: data.displays?.length ? data.displays : [...STATIC_DISPLAYS],
    source: data.boards?.length || data.sensors?.length || data.actuators?.length || data.displays?.length
      ? 'database'
      : 'static',
  };
  return snapshot;
}

export function resetComponentRegistry(): void {
  snapshot = {
    boards: [...STATIC_BOARDS],
    sensors: [...STATIC_SENSORS],
    actuators: [...STATIC_ACTUATORS],
    displays: [...STATIC_DISPLAYS],
    source: 'static',
  };
}