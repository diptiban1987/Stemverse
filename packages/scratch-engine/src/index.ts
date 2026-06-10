export * from './hardware-extension';
export * from './blockly-bridge';
export * from './sprite-stage';
export * from './opcode-registry';
export * from './hardware-runtime';
export * from './event-runtime';
export * from './variable-sync';
export * from './asset-resolve';

import VirtualMachine from 'scratch-vm';
import Renderer from 'scratch-render';
import { ScratchStorage as Storage } from 'scratch-storage';
import { ScratchEventRuntime } from './event-runtime';
import { ScratchHardwareRuntime } from './hardware-runtime';

export interface ScratchRuntime {
  vm: VirtualMachine;
  renderer: Renderer;
  hardware: ScratchHardwareRuntime;
  events: ScratchEventRuntime;
  start: () => void;
  stop: () => void;
  loadProject: (json: string) => Promise<void>;
  toJSON: () => string;
  greenFlag: () => void;
  stopAll: () => void;
  addSprite: (json: string) => Promise<unknown>;
  onTargetsUpdate: (cb: () => void) => void;
  getTargets: () => Array<{ name: string; isStage: boolean }>;
  executeHardware: (opcode: string, args: Record<string, number | undefined>) => number | void;
  dispose: () => void;
}

export async function createScratchRuntime(
  canvas: HTMLCanvasElement,
  width = 480,
  height = 360,
  boardSlug = 'arduino_uno',
): Promise<ScratchRuntime> {
  const storage = new Storage();
  const vm = new VirtualMachine(storage);
  vm.setCompatibilityMode(true);

  const renderer = new Renderer(canvas);
  vm.attachRenderer(renderer);
  vm.attachStorage(storage);
  renderer.resize(width, height);
  vm.start();

  const hardware = new ScratchHardwareRuntime(boardSlug);
  const events = new ScratchEventRuntime();

  let rafId = 0;
  const drawLoop = () => {
    renderer.draw();
    rafId = requestAnimationFrame(drawLoop);
  };
  drawLoop();

  return {
    vm,
    renderer,
    hardware,
    events,
    start: () => vm.start(),
    stop: () => vm.stopAll(),
    loadProject: (json) => vm.loadProject(json),
    toJSON: () => vm.toJSON(),
    greenFlag: () => {
      events.emit({ type: 'greenFlag' });
      vm.greenFlag();
    },
    stopAll: () => vm.stopAll(),
    addSprite: (json) => vm.addSprite(json),
    onTargetsUpdate: (cb) => vm.on('targetsUpdate', cb),
    getTargets: () =>
      vm.runtime.targets.map((t) => ({
        name: t.getName(),
        isStage: t.isStage,
      })),
    executeHardware: (opcode, args) =>
      hardware.executeOpcode(opcode as Parameters<ScratchHardwareRuntime['executeOpcode']>[0], args),
    dispose: () => {
      cancelAnimationFrame(rafId);
      hardware.getExtension().detach();
      vm.stopAll();
      vm.clear();
    },
  };
}

declare global {
  interface Window {
    STEMVerseScratch: {
      createScratchRuntime: typeof createScratchRuntime;
    };
  }
}

if (typeof window !== 'undefined') {
  window.STEMVerseScratch = { createScratchRuntime };
}
