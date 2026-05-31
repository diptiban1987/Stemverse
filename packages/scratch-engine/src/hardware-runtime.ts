import { ScratchHardwareExtension, type HardwarePinState } from './hardware-extension';

export type HardwareOpcode =
  | 'stemverse_digital_write'
  | 'stemverse_digital_read'
  | 'stemverse_analog_read'
  | 'stemverse_servo_write'
  | 'stemverse_buzzer_tone';

export type HardwareOpcodeArgs = {
  pin?: number;
  value?: number;
  angle?: number;
  frequency?: number;
  duration?: number;
};

/**
 * Executes STEMVerse hardware opcodes against GPIO simulation hooks.
 * Called from Scratch extension layer — does not modify scratch-vm internals.
 */
export class ScratchHardwareRuntime {
  private readonly extension: ScratchHardwareExtension;
  private broadcastHandlers = new Map<string, Set<() => void>>();

  constructor(boardSlug: string, initialPins: HardwarePinState[] = []) {
    this.extension = new ScratchHardwareExtension({ boardSlug, pins: initialPins });
    this.extension.attach({
      onAttach: () => undefined,
      onDetach: () => undefined,
      onPinWrite: () => undefined,
      onPinRead: (pin) =>
        this.extension.exportState().find((p) => p.pin === pin)?.value ?? 0,
    });
  }

  getExtension(): ScratchHardwareExtension {
    return this.extension;
  }

  executeOpcode(opcode: HardwareOpcode, args: HardwareOpcodeArgs): number | void {
    switch (opcode) {
      case 'stemverse_digital_write':
        if (args.pin != null && args.value != null) {
          this.extension.writePin(args.pin, args.value ? 1 : 0);
        }
        return;
      case 'stemverse_digital_read':
        return args.pin != null ? this.extension.readPin(args.pin) : 0;
      case 'stemverse_analog_read':
        return args.pin != null ? this.extension.readPin(args.pin) : 0;
      case 'stemverse_servo_write':
        if (args.pin != null && args.angle != null) {
          this.extension.writePin(args.pin, Math.max(0, Math.min(180, args.angle)));
        }
        return;
      case 'stemverse_buzzer_tone':
        if (args.pin != null && args.frequency != null) {
          this.extension.writePin(args.pin, args.frequency);
        }
        return;
      default:
        return;
    }
  }

  broadcast(message: string): void {
    const handlers = this.broadcastHandlers.get(message);
    handlers?.forEach((h) => h());
  }

  onBroadcast(message: string, handler: () => void): () => void {
    if (!this.broadcastHandlers.has(message)) {
      this.broadcastHandlers.set(message, new Set());
    }
    this.broadcastHandlers.get(message)!.add(handler);
    return () => this.broadcastHandlers.get(message)?.delete(handler);
  }

  exportPinState(): HardwarePinState[] {
    return this.extension.exportState();
  }
}
