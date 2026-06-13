import { TargetId, CostumeData, SoundData } from '../types';

/**
 * Configurations for establishing a canvas stage size.
 * Defaults to standard Scratch dimension standards (480 x 360).
 */
export interface StageConfig {
  width: number;
  height: number;
  canvasId: string;
  backgroundColor?: number;
}

/**
 * Basic PixiJS Canvas wrapper stub to coordinate stage view layout.
 */
export interface IPixiStageWrapper {
  /**
   * Initializes PixiJS Application instance.
   * Minimal placeholder for future actual PixiJS canvas attaching.
   */
  initializeStage(config: StageConfig): Promise<void>;

  /**
   * Destroys and cleans up canvas rendering context.
   */
  destroyStage(): void;

  /**
   * Resizes standard Scratch stage coordinates to actual viewport layout.
   */
  resizeViewport(width: number, height: number): void;
}

/**
 * Representation of Stage visual layer properties.
 */
export interface IStageInfo {
  id: TargetId;
  width: number;
  height: number;
  costumes: CostumeData[];
  currentCostumeIndex: number;
  sounds: SoundData[];
}

/**
 * Representation of individual Sprite actors on the visual layer.
 */
export interface ISpriteInfo {
  id: TargetId;
  name: string;
  x: number;
  y: number;
  direction: number;
  size: number;
  visible: boolean;
  costumes: CostumeData[];
  currentCostumeIndex: number;
}

export * from './renderer-adapter';
export * from './pixi-renderer-adapter';
export * from './render-registry';
export * from './scene-model';
export * from './breadboard-workspace';
export * from './canvas-rendering';
export * from './component-rendering';
export * from './wire-rendering';
export * from './board-rendering';
export * from './signal-effects';
export * from './visual-themes';
export * from './animation-playback';
export * from './render-runtime';
export * from './render-execution';
export * from './visible-rendering';
export * from './scene-assembly';
export * from './visible-object-runtime';
export * from './electrical-connectivity';
export * from './signal-propagation-runtime';
export * from './interactive-sensor-runtime';
export * from './workspace-runtime';
export * from './component-asset-definitions';
export * from './component-asset-library';
export * from './breadboard-visual-model';
export * from './breadboard-visual-layout';
export * from './wire-geometry-model';
export * from './wire-routing-engine';
export * from './pixi-breadboard-renderer';
export * from './pixi-component-renderer';
export * from './pixi-wire-renderer';
export * from './pixi-scene-renderer';
export * from './interactive-placement-runtime';
export * from './interactive-wiring-runtime';
export * from './live-electrical-visualization-runtime';
export * from './virtual-esp32-execution-runtime';
export * from './blockly-execution-runtime';
export * from './hcsr04-runtime';
export * from './servo-runtime';
export * from './display-runtime';
export * from './serial-monitor-runtime';
export * from './logic-analyzer-runtime';
export * from './robotics-physics-runtime';
export * from './differential-drive-runtime';
export * from './line-following-runtime';
export * from './obstacle-avoidance-runtime';
export * from './high-fidelity-renderer-runtime';
export * from './component-svg-assets';
export * from './simulator-ui-runtime';
export * from './component-asset-extensions';
export * from './component-scale-runtime';
export * from './snap-preview-runtime';
export * from './selection-runtime';



