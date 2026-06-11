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

