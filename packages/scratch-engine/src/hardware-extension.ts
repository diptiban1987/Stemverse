/**
 * Scratch hardware extension layer — bridges STEMVerse board pins to Scratch VM peripherals.
 * Preserves scratch-vm; registers runtime hooks without replacing the VM.
 */

export type HardwarePinMode = 'input' | 'output' | 'analog' | 'pwm';

export type HardwarePinState = {
  pin: number;
  mode: HardwarePinMode;
  value: number;
};

export type HardwareExtensionConfig = {
  boardSlug: string;
  pins?: HardwarePinState[];
};

export type HardwareRuntimeHooks = {
  onPinWrite: (pin: number, value: number) => void;
  onPinRead: (pin: number) => number;
  onAttach: () => void;
  onDetach: () => void;
};

export class ScratchHardwareExtension {
  private pins = new Map<number, HardwarePinState>();
  private hooks: HardwareRuntimeHooks | null = null;

  constructor(private readonly config: HardwareExtensionConfig) {
    for (const p of config.pins ?? []) {
      this.pins.set(p.pin, { ...p });
    }
  }

  attach(hooks: HardwareRuntimeHooks): void {
    this.hooks = hooks;
    hooks.onAttach();
  }

  detach(): void {
    this.hooks?.onDetach();
    this.hooks = null;
  }

  writePin(pin: number, value: number): void {
    const mode = this.pins.get(pin)?.mode ?? 'output';
    this.pins.set(pin, { pin, mode, value });
    this.hooks?.onPinWrite(pin, value);
  }

  readPin(pin: number): number {
    const stored = this.pins.get(pin)?.value ?? 0;
    return this.hooks?.onPinRead(pin) ?? stored;
  }

  getBoardSlug(): string {
    return this.config.boardSlug;
  }

  exportState(): HardwarePinState[] {
    return Array.from(this.pins.values());
  }
}
