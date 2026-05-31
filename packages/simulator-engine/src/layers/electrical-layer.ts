import type { PinStateMap, SimComponentPlacement } from '../types';

/**
 * Electrical layer — pin-to-component wiring and signal propagation.
 */
export class ElectricalLayer {
  propagate(
    pinStates: PinStateMap,
    components: SimComponentPlacement[],
  ): Map<string, { pin: number; level: 'HIGH' | 'LOW' }[]> {
    const signals = new Map<string, { pin: number; level: 'HIGH' | 'LOW' }[]>();

    for (const component of components) {
      const level = pinStates[component.boardPin] ?? 'LOW';
      const list = signals.get(component.id) ?? [];
      list.push({ pin: component.boardPin, level });
      if (component.echoPin !== undefined) {
        list.push({ pin: component.echoPin, level: pinStates[component.echoPin] ?? 'LOW' });
      }
      signals.set(component.id, list);
    }

    return signals;
  }

  isPinUsed(components: SimComponentPlacement[], pin: number, excludeId?: string): boolean {
    return components.some(
      (c) =>
        c.id !== excludeId &&
        (c.boardPin === pin || c.echoPin === pin),
    );
  }
}
