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
export * from './component-svg-extended';
export * from './simulator-ui-runtime';
export * from './component-asset-extensions';
export * from './component-scale-runtime';
export * from './snap-preview-runtime';
export * from './selection-runtime';
export * from './circuit-graph-runtime';
export * from './blockly-circuit-generator';
export * from './gpio-ownership-runtime';
export * from './circuit-sync-runtime';
export * from './circuit-diagnostics-runtime';

// Phase 29B: Auto-Wiring Assistant & Guided Circuit Builder
export * from './auto-wiring-runtime';
export * from './component-knowledge-runtime';
export * from './circuit-wizard-runtime';

// Phase 30A: Project Library, Save/Load & Versioning
export * from './project-library-runtime';
export * from './project-version-runtime';
export * from './auto-save-runtime';
export * from './project-thumbnail-runtime';

// Phase 30B: Classroom, Sharing, Assignments & Collaboration
export * from './classroom-runtime';
export * from './project-sharing-runtime';
export * from './assignment-runtime';
export * from './collaboration-runtime';

// Phase 31B: Cloud Sync, Offline Workspace & Project Persistence
export * from './workspace-persistence-runtime';

// Phase 31C: Project Timeline, History, Checkpoints & Recovery
export * from './project-timeline-runtime';

// Phase 32A: Real ESP32 Device Upload Pipeline
export * from './web-serial-runtime';
export * from './device-upload-runtime';

// Phase 32B: AI Circuit Generation Assistant
export * from './ai-circuit-runtime';
export * from './circuit-template-runtime';
export * from './prompt-library';

// Phase 33A: Real Device Programming Studio & Debug Console
export * from './device-debug-runtime';

// Phase 33B: Real-Time Multiuser Collaboration & Shared Editing
export * from './realtime-collaboration-runtime';

// Phase 31A: Professional Simulator UX
// Note: calculateSelectionBounds is re-exported as calculateUXSelectionBounds
// to avoid collision with workspace-runtime's calculateSelectionBounds
export {
  calculateSelectionBounds as calculateUXSelectionBounds,
} from './simulator-ux-runtime';

// Re-export everything else from simulator-ux-runtime except the colliding name
export {
  // Factory functions
  createDefaultHoverFeedbackModel,
  createDefaultHoverStateModel,
  createDefaultContextMenuItemModel,
  createDefaultContextMenuStateModel,
  createDefaultSelectionHandleModel,
  createDefaultProfessionalSelectionModel,
  createDefaultWireCreationStateModel,
  createDefaultWireValidationOverlayModel,
  createDefaultCameraAnimationModel,
  createDefaultMinimapModel,
  createDefaultPaletteDragModel,
  createDefaultPaletteFilterModel,
  createDefaultPerformanceMetricsModel,
  createDefaultWorkspaceThemeConfigModel,
  // Constants
  VALID_HOVER_TARGET_TYPES,
  VALID_CURSOR_STYLES,
  VALID_CONTEXT_MENU_ACTIONS,
  VALID_SELECTION_MODES,
  VALID_HANDLE_TYPES,
  VALID_WIRE_CREATION_PHASES,
  VALID_WIRE_VALIDATION_STATUSES,
  VALID_CAMERA_EASINGS,
  VALID_NAVIGATION_MODES,
  // Domain logic
  mapHoverTargetToCursor,
  calculateBoxSelectionIntersection,
  calculateSnapTarget,
  getValidationOverlayColor,
  interpolateCameraAnimation,
  applyEasing,
  calculateFitToProjectBounds,
  filterPaletteComponents,
  // Validators
  validateHoverFeedbackModel,
  validateHoverStateModel,
  validateContextMenuItemModel,
  validateContextMenuStateModel,
  validateSelectionHandleModel,
  validateProfessionalSelectionModel,
  validateWireCreationStateModel,
  validateWireValidationOverlayModel,
  validateCameraAnimationModel,
  validateMinimapModel,
  validatePaletteDragModel,
  validatePaletteFilterModel,
  validatePerformanceMetricsModel,
  validateWorkspaceThemeConfigModel,
  // Duplicate validators
  validateDuplicateHoverFeedbackIds,
  validateDuplicateHoverStateIds,
  validateDuplicateContextMenuItemIds,
  validateDuplicateContextMenuStateIds,
  validateDuplicateSelectionHandleIds,
  validateDuplicateProfessionalSelectionIds,
  validateDuplicateWireCreationStateIds,
  validateDuplicateWireValidationOverlayIds,
  validateDuplicateCameraAnimationIds,
  validateDuplicateMinimapIds,
  validateDuplicatePaletteDragIds,
  validateDuplicatePaletteFilterIds,
  validateDuplicatePerformanceMetricsIds,
  validateDuplicateWorkspaceThemeConfigIds,
  // Domain functions
  updateHoverFeedback,
  clearHoverFeedback,
  buildContextMenuItems,
  showContextMenu,
  hideContextMenu,
  startWireCreation,
  updateWirePreview,
  completeWire,
  cancelWire,
  tickCameraAnimation,
  applyCameraEasing,
  updateSimulatorPerformanceMetrics,
  // Synchronizer
  SimulatorUXSynchronizer,
} from './simulator-ux-runtime';
