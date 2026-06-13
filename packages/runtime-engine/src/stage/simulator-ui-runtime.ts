import {
  WorkspaceTool,
  UndoActionType,
  ConnectionWarningLevel,
  PaletteCategory,
  UndoActionModel,
  UndoHistoryModel,
  CameraGestureModel,
  ConnectionWarningModel,
  ConnectionValidationModel,
  PaletteComponentModel,
  PaletteCategoryModel,
  PaletteStateModel,
  WorkspaceToolModel,
  PinInspectorModel,
  SimulatorUISnapshot,
} from '../types';

// ─── DEEP COPY UTILITY ───────────────────────────────────────────────────────

function safeDeepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

/** Maximum number of undo actions retained in history */
export const DEFAULT_SIMUI_UNDO_MAX_CAPACITY = 1000;

/** Default camera zoom level (1.0 = 100%) */
export const DEFAULT_SIMUI_ZOOM = 1.0;

/** Minimum allowed zoom level */
export const DEFAULT_SIMUI_MIN_ZOOM = 0.1;

/** Maximum allowed zoom level */
export const DEFAULT_SIMUI_MAX_ZOOM = 5.0;

/** Zoom increment per scroll step */
export const DEFAULT_SIMUI_ZOOM_STEP = 0.1;

/** Camera pan speed multiplier */
export const DEFAULT_SIMUI_PAN_SPEED = 1.0;

/** Camera smoothing interpolation factor */
export const DEFAULT_SIMUI_SMOOTHING_FACTOR = 0.15;

/** Maximum number of recent palette items */
export const DEFAULT_SIMUI_MAX_RECENT = 10;

/** Default active workspace tool */
export const DEFAULT_SIMUI_ACTIVE_TOOL: WorkspaceTool = 'select';

/** All valid workspace tool types */
export const VALID_SIMUI_TOOLS: WorkspaceTool[] = [
  'select',
  'move',
  'rotate',
  'wire',
  'delete',
  'pan',
];

/** All valid undo action types */
export const VALID_SIMUI_UNDO_TYPES: UndoActionType[] = [
  'placement',
  'movement',
  'wiring',
  'deletion',
  'rotation',
  'property_change',
  'wire_deletion',
];

/** All valid connection warning severity levels */
export const VALID_SIMUI_WARNING_LEVELS: ConnectionWarningLevel[] = [
  'info',
  'warning',
  'error',
];

/** All valid palette categories */
export const VALID_SIMUI_CATEGORIES: PaletteCategory[] = [
  'boards',
  'sensors',
  'displays',
  'actuators',
  'power',
  'basic_components',
  'communication',
];

/** Default palette categories with display metadata */
export const DEFAULT_SIMUI_PALETTE_CATEGORIES: PaletteCategoryModel[] = [
  { categoryId: 'boards', displayName: 'Boards', icon: 'cpu', sortOrder: 0, metadata: {} },
  { categoryId: 'sensors', displayName: 'Sensors', icon: 'radar', sortOrder: 1, metadata: {} },
  { categoryId: 'displays', displayName: 'Displays', icon: 'monitor', sortOrder: 2, metadata: {} },
  { categoryId: 'actuators', displayName: 'Actuators', icon: 'settings', sortOrder: 3, metadata: {} },
  { categoryId: 'power', displayName: 'Power', icon: 'zap', sortOrder: 4, metadata: {} },
  { categoryId: 'basic_components', displayName: 'Basic Components', icon: 'box', sortOrder: 5, metadata: {} },
  { categoryId: 'communication', displayName: 'Communication', icon: 'wifi', sortOrder: 6, metadata: {} },
];

/** Default palette components — the full library of available components */
export const DEFAULT_SIMUI_PALETTE_COMPONENTS: PaletteComponentModel[] = [
  // Boards
  { componentId: 'esp32_devkit', assetId: 'esp32_devkit', displayName: 'ESP32 DevKit', category: 'boards', description: 'ESP32 development board with WiFi and Bluetooth', isFavorite: false, lastUsedAt: 0, usageCount: 0, metadata: {} },
  { componentId: 'arduino_uno', assetId: 'arduino_uno', displayName: 'Arduino Uno', category: 'boards', description: 'Arduino Uno R3 microcontroller board', isFavorite: false, lastUsedAt: 0, usageCount: 0, metadata: {} },
  { componentId: 'arduino_nano', assetId: 'arduino_nano', displayName: 'Arduino Nano', category: 'boards', description: 'Arduino Nano compact microcontroller board', isFavorite: false, lastUsedAt: 0, usageCount: 0, metadata: {} },

  // Sensors
  { componentId: 'hcsr04', assetId: 'hcsr04', displayName: 'HC-SR04', category: 'sensors', description: 'Ultrasonic distance sensor with trigger and echo pins', isFavorite: false, lastUsedAt: 0, usageCount: 0, metadata: {} },
  { componentId: 'ir_sensor', assetId: 'ir_sensor', displayName: 'IR Sensor', category: 'sensors', description: 'Infrared proximity and obstacle detection sensor', isFavorite: false, lastUsedAt: 0, usageCount: 0, metadata: {} },
  { componentId: 'mq2', assetId: 'mq2', displayName: 'MQ2', category: 'sensors', description: 'Gas and smoke detection sensor module', isFavorite: false, lastUsedAt: 0, usageCount: 0, metadata: {} },
  { componentId: 'dht11', assetId: 'dht11', displayName: 'DHT11', category: 'sensors', description: 'Temperature and humidity sensor', isFavorite: false, lastUsedAt: 0, usageCount: 0, metadata: {} },

  // Displays
  { componentId: 'oled_display', assetId: 'oled_display', displayName: 'OLED', category: 'displays', description: '0.96 inch I2C OLED display module 128x64', isFavorite: false, lastUsedAt: 0, usageCount: 0, metadata: {} },
  { componentId: 'lcd1602', assetId: 'lcd1602', displayName: 'LCD1602', category: 'displays', description: '16x2 character LCD display with I2C backpack', isFavorite: false, lastUsedAt: 0, usageCount: 0, metadata: {} },

  // Actuators
  { componentId: 'servo', assetId: 'servo', displayName: 'Servo', category: 'actuators', description: 'SG90 micro servo motor with 180 degree rotation', isFavorite: false, lastUsedAt: 0, usageCount: 0, metadata: {} },
  { componentId: 'relay', assetId: 'relay', displayName: 'Relay', category: 'actuators', description: 'Single channel relay module for switching loads', isFavorite: false, lastUsedAt: 0, usageCount: 0, metadata: {} },

  // Basic Components
  { componentId: 'led', assetId: 'led', displayName: 'LED', category: 'basic_components', description: 'Light emitting diode in various colors', isFavorite: false, lastUsedAt: 0, usageCount: 0, metadata: {} },
  { componentId: 'resistor', assetId: 'resistor', displayName: 'Resistor', category: 'basic_components', description: 'Through-hole resistor with selectable resistance', isFavorite: false, lastUsedAt: 0, usageCount: 0, metadata: {} },
  { componentId: 'buzzer', assetId: 'buzzer', displayName: 'Buzzer', category: 'basic_components', description: 'Piezo buzzer for tone generation', isFavorite: false, lastUsedAt: 0, usageCount: 0, metadata: {} },
  { componentId: 'potentiometer', assetId: 'potentiometer', displayName: 'Potentiometer', category: 'basic_components', description: 'Variable resistor with rotary knob', isFavorite: false, lastUsedAt: 0, usageCount: 0, metadata: {} },
  { componentId: 'push_button', assetId: 'push_button', displayName: 'Push Button', category: 'basic_components', description: 'Momentary tactile push button switch', isFavorite: false, lastUsedAt: 0, usageCount: 0, metadata: {} },
  { componentId: 'breadboard_830', assetId: 'breadboard_830', displayName: 'Breadboard 830', category: 'basic_components', description: 'Full-size 830 point solderless breadboard', isFavorite: false, lastUsedAt: 0, usageCount: 0, metadata: {} },
  { componentId: 'breadboard_400', assetId: 'breadboard_400', displayName: 'Breadboard 400', category: 'basic_components', description: 'Half-size 400 point solderless breadboard', isFavorite: false, lastUsedAt: 0, usageCount: 0, metadata: {} },
  { componentId: 'breadboard_mini', assetId: 'breadboard_mini', displayName: 'Breadboard Mini', category: 'basic_components', description: 'Mini 170 point solderless breadboard', isFavorite: false, lastUsedAt: 0, usageCount: 0, metadata: {} },
];

/** Cursor style mapping for each workspace tool */
export const DEFAULT_SIMUI_TOOL_CURSORS: Record<WorkspaceTool, string> = {
  select: 'default',
  move: 'grab',
  rotate: 'crosshair',
  wire: 'crosshair',
  delete: 'not-allowed',
  pan: 'grab',
};

/** Keyboard shortcut mapping to workspace tools */
export const DEFAULT_SIMUI_TOOL_SHORTCUTS: Record<string, WorkspaceTool> = {
  v: 'select',
  m: 'move',
  r: 'rotate',
  w: 'wire',
  x: 'delete',
  space: 'pan',
};

// ─── FACTORY FUNCTIONS ───────────────────────────────────────────────────────

/** Create a default UndoActionModel with safe defaults */
export function createDefaultUndoActionModel(
  actionId = 'default_undo_action',
  overrides: Partial<UndoActionModel> = {},
): UndoActionModel {
  return {
    actionId,
    type: 'placement',
    timestamp: 0,
    description: '',
    beforeState: {},
    afterState: {},
    metadata: {},
    ...overrides,
  };
}

/** Create a default UndoHistoryModel with empty stacks */
export function createDefaultUndoHistoryModel(
  historyId = 'default_undo_history',
  overrides: Partial<UndoHistoryModel> = {},
): UndoHistoryModel {
  return {
    historyId,
    undoStack: [],
    redoStack: [],
    maxCapacity: DEFAULT_SIMUI_UNDO_MAX_CAPACITY,
    metadata: {},
    ...overrides,
  };
}

/** Create a default CameraGestureModel with standard zoom/pan settings */
export function createDefaultCameraGestureModel(
  gestureId = 'default_camera_gesture',
  overrides: Partial<CameraGestureModel> = {},
): CameraGestureModel {
  return {
    gestureId,
    zoom: DEFAULT_SIMUI_ZOOM,
    panX: 0,
    panY: 0,
    minZoom: DEFAULT_SIMUI_MIN_ZOOM,
    maxZoom: DEFAULT_SIMUI_MAX_ZOOM,
    zoomStep: DEFAULT_SIMUI_ZOOM_STEP,
    panSpeed: DEFAULT_SIMUI_PAN_SPEED,
    smoothingEnabled: true,
    smoothingFactor: DEFAULT_SIMUI_SMOOTHING_FACTOR,
    metadata: {},
    ...overrides,
  };
}

/** Create a default ConnectionWarningModel */
export function createDefaultConnectionWarningModel(
  warningId = 'default_connection_warning',
  overrides: Partial<ConnectionWarningModel> = {},
): ConnectionWarningModel {
  return {
    warningId,
    level: 'info',
    type: 'general',
    message: '',
    affectedObjectIds: [],
    affectedPinIds: [],
    metadata: {},
    ...overrides,
  };
}

/** Create a default ConnectionValidationModel with empty warnings */
export function createDefaultConnectionValidationModel(
  validationId = 'default_connection_validation',
  overrides: Partial<ConnectionValidationModel> = {},
): ConnectionValidationModel {
  return {
    validationId,
    warnings: [],
    lastValidatedAt: 0,
    autoValidateEnabled: true,
    metadata: {},
    ...overrides,
  };
}

/** Create a default PaletteComponentModel */
export function createDefaultPaletteComponentModel(
  componentId = 'default_palette_component',
  overrides: Partial<PaletteComponentModel> = {},
): PaletteComponentModel {
  return {
    componentId,
    assetId: componentId,
    displayName: `Component ${componentId}`,
    category: 'basic_components',
    description: '',
    isFavorite: false,
    lastUsedAt: 0,
    usageCount: 0,
    metadata: {},
    ...overrides,
  };
}

/** Create a default PaletteCategoryModel */
export function createDefaultPaletteCategoryModel(
  categoryId = 'default_palette_category',
  overrides: Partial<PaletteCategoryModel> = {},
): PaletteCategoryModel {
  return {
    categoryId,
    displayName: `Category ${categoryId}`,
    icon: 'box',
    sortOrder: 0,
    metadata: {},
    ...overrides,
  };
}

/** Create a default PaletteStateModel */
export function createDefaultPaletteStateModel(
  stateId = 'default_palette_state',
  overrides: Partial<PaletteStateModel> = {},
): PaletteStateModel {
  return {
    stateId,
    searchQuery: '',
    activeCategory: '',
    showFavoritesOnly: false,
    recentComponentIds: [],
    maxRecentCount: DEFAULT_SIMUI_MAX_RECENT,
    metadata: {},
    ...overrides,
  };
}

/** Create a default WorkspaceToolModel */
export function createDefaultWorkspaceToolModel(
  toolId = 'default_workspace_tool',
  overrides: Partial<WorkspaceToolModel> = {},
): WorkspaceToolModel {
  return {
    toolId,
    activeTool: DEFAULT_SIMUI_ACTIVE_TOOL,
    previousTool: DEFAULT_SIMUI_ACTIVE_TOOL,
    isToolLocked: false,
    metadata: {},
    ...overrides,
  };
}

/** Create a default PinInspectorModel */
export function createDefaultPinInspectorModel(
  inspectorId = 'default_pin_inspector',
  overrides: Partial<PinInspectorModel> = {},
): PinInspectorModel {
  return {
    inspectorId,
    hoveredPinId: '',
    pinName: '',
    gpioNumber: -1,
    voltage: 0,
    pwmSupport: false,
    adcSupport: false,
    connectionState: 'floating',
    connectedWireIds: [],
    metadata: {},
    ...overrides,
  };
}

// ─── MODEL VALIDATORS ────────────────────────────────────────────────────────

/** Validate UndoHistoryModel, returning warning strings */
export function validateUndoHistoryModel(model: UndoHistoryModel): string[] {
  const warnings: string[] = [];
  if (!model.historyId) warnings.push('UndoHistoryModel: historyId is empty');
  if (model.maxCapacity < 1) warnings.push(`UndoHistoryModel [${model.historyId}]: maxCapacity (${model.maxCapacity}) must be >= 1`);
  if (model.undoStack.length > model.maxCapacity) {
    warnings.push(`UndoHistoryModel [${model.historyId}]: undoStack length (${model.undoStack.length}) exceeds maxCapacity (${model.maxCapacity})`);
  }
  return warnings;
}

/** Validate CameraGestureModel, returning warning strings */
export function validateCameraGestureModel(model: CameraGestureModel): string[] {
  const warnings: string[] = [];
  if (!model.gestureId) warnings.push('CameraGestureModel: gestureId is empty');
  if (model.minZoom <= 0) warnings.push(`CameraGestureModel [${model.gestureId}]: minZoom (${model.minZoom}) must be > 0`);
  if (model.maxZoom < model.minZoom) warnings.push(`CameraGestureModel [${model.gestureId}]: maxZoom (${model.maxZoom}) must be >= minZoom (${model.minZoom})`);
  if (model.zoom < model.minZoom || model.zoom > model.maxZoom) {
    warnings.push(`CameraGestureModel [${model.gestureId}]: zoom (${model.zoom}) is outside [${model.minZoom}, ${model.maxZoom}]`);
  }
  if (model.zoomStep <= 0) warnings.push(`CameraGestureModel [${model.gestureId}]: zoomStep (${model.zoomStep}) must be > 0`);
  if (model.panSpeed <= 0) warnings.push(`CameraGestureModel [${model.gestureId}]: panSpeed (${model.panSpeed}) must be > 0`);
  if (model.smoothingFactor < 0 || model.smoothingFactor > 1) {
    warnings.push(`CameraGestureModel [${model.gestureId}]: smoothingFactor (${model.smoothingFactor}) must be in [0, 1]`);
  }
  return warnings;
}

/** Validate ConnectionValidationModel, returning warning strings */
export function validateConnectionValidationModel(model: ConnectionValidationModel): string[] {
  const warnings: string[] = [];
  if (!model.validationId) warnings.push('ConnectionValidationModel: validationId is empty');
  for (const w of model.warnings) {
    if (!w.warningId) warnings.push(`ConnectionValidationModel [${model.validationId}]: contains a warning with empty warningId`);
    if (!VALID_SIMUI_WARNING_LEVELS.includes(w.level)) {
      warnings.push(`ConnectionValidationModel [${model.validationId}]: warning [${w.warningId}] has invalid level '${w.level}'`);
    }
    if (!w.message) warnings.push(`ConnectionValidationModel [${model.validationId}]: warning [${w.warningId}] has empty message`);
  }
  return warnings;
}

/** Validate ConnectionWarningModel, returning warning strings */
export function validateConnectionWarningModel(model: ConnectionWarningModel): string[] {
  const warnings: string[] = [];
  if (!model.warningId) warnings.push('ConnectionWarningModel: warningId is empty');
  if (!VALID_SIMUI_WARNING_LEVELS.includes(model.level)) {
    warnings.push(`ConnectionWarningModel [${model.warningId}]: invalid level '${model.level}'`);
  }
  if (!model.message) warnings.push(`ConnectionWarningModel [${model.warningId}]: message is empty`);
  return warnings;
}

/** Validate PaletteComponentModel, returning warning strings */
export function validatePaletteComponentModel(model: PaletteComponentModel): string[] {
  const warnings: string[] = [];
  if (!model.componentId) warnings.push('PaletteComponentModel: componentId is empty');
  if (!model.displayName) warnings.push(`PaletteComponentModel [${model.componentId}]: displayName is empty`);
  if (!model.assetId) warnings.push(`PaletteComponentModel [${model.componentId}]: assetId is empty`);
  if (!VALID_SIMUI_CATEGORIES.includes(model.category)) {
    warnings.push(`PaletteComponentModel [${model.componentId}]: invalid category '${model.category}'`);
  }
  if (model.usageCount < 0) warnings.push(`PaletteComponentModel [${model.componentId}]: usageCount (${model.usageCount}) must be >= 0`);
  return warnings;
}

/** Validate PaletteCategoryModel, returning warning strings */
export function validatePaletteCategoryModel(model: PaletteCategoryModel): string[] {
  const warnings: string[] = [];
  if (!model.categoryId) warnings.push('PaletteCategoryModel: categoryId is empty');
  if (!model.displayName) warnings.push(`PaletteCategoryModel [${model.categoryId}]: displayName is empty`);
  if (!model.icon) warnings.push(`PaletteCategoryModel [${model.categoryId}]: icon is empty`);
  if (model.sortOrder < 0) warnings.push(`PaletteCategoryModel [${model.categoryId}]: sortOrder (${model.sortOrder}) must be >= 0`);
  return warnings;
}

/** Validate PaletteStateModel, returning warning strings */
export function validatePaletteStateModel(model: PaletteStateModel): string[] {
  const warnings: string[] = [];
  if (!model.stateId) warnings.push('PaletteStateModel: stateId is empty');
  if (model.maxRecentCount < 0) warnings.push(`PaletteStateModel [${model.stateId}]: maxRecentCount (${model.maxRecentCount}) must be >= 0`);
  if (model.recentComponentIds.length > model.maxRecentCount) {
    warnings.push(`PaletteStateModel [${model.stateId}]: recentComponentIds length (${model.recentComponentIds.length}) exceeds maxRecentCount (${model.maxRecentCount})`);
  }
  return warnings;
}

/** Validate WorkspaceToolModel, returning warning strings */
export function validateWorkspaceToolModel(model: WorkspaceToolModel): string[] {
  const warnings: string[] = [];
  if (!model.toolId) warnings.push('WorkspaceToolModel: toolId is empty');
  if (!VALID_SIMUI_TOOLS.includes(model.activeTool)) {
    warnings.push(`WorkspaceToolModel [${model.toolId}]: invalid activeTool '${model.activeTool}'`);
  }
  if (!VALID_SIMUI_TOOLS.includes(model.previousTool)) {
    warnings.push(`WorkspaceToolModel [${model.toolId}]: invalid previousTool '${model.previousTool}'`);
  }
  return warnings;
}

/** Validate PinInspectorModel, returning warning strings */
export function validatePinInspectorModel(model: PinInspectorModel): string[] {
  const warnings: string[] = [];
  if (!model.inspectorId) warnings.push('PinInspectorModel: inspectorId is empty');
  if (model.gpioNumber < -1) warnings.push(`PinInspectorModel [${model.inspectorId}]: gpioNumber (${model.gpioNumber}) is invalid`);
  if (model.voltage < 0) warnings.push(`PinInspectorModel [${model.inspectorId}]: voltage (${model.voltage}) must be >= 0`);
  const validStates = ['connected', 'floating', 'power', 'ground'];
  if (!validStates.includes(model.connectionState)) {
    warnings.push(`PinInspectorModel [${model.inspectorId}]: invalid connectionState '${model.connectionState}'`);
  }
  return warnings;
}

// ─── DUPLICATE VALIDATORS ────────────────────────────────────────────────────

/** Check for duplicate UndoHistoryModel entries by historyId */
export function checkDuplicateUndoHistoryModels(models: UndoHistoryModel[]): string[] {
  const warnings: string[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.historyId)) {
      warnings.push(`Duplicate UndoHistoryModel historyId: '${m.historyId}'`);
    }
    seen.add(m.historyId);
  }
  return warnings;
}

/** Check for duplicate CameraGestureModel entries by gestureId */
export function checkDuplicateCameraGestureModels(models: CameraGestureModel[]): string[] {
  const warnings: string[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.gestureId)) {
      warnings.push(`Duplicate CameraGestureModel gestureId: '${m.gestureId}'`);
    }
    seen.add(m.gestureId);
  }
  return warnings;
}

/** Check for duplicate ConnectionValidationModel entries by validationId */
export function checkDuplicateConnectionValidationModels(models: ConnectionValidationModel[]): string[] {
  const warnings: string[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.validationId)) {
      warnings.push(`Duplicate ConnectionValidationModel validationId: '${m.validationId}'`);
    }
    seen.add(m.validationId);
  }
  return warnings;
}

/** Check for duplicate PaletteComponentModel entries by componentId */
export function checkDuplicatePaletteComponentModels(models: PaletteComponentModel[]): string[] {
  const warnings: string[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.componentId)) {
      warnings.push(`Duplicate PaletteComponentModel componentId: '${m.componentId}'`);
    }
    seen.add(m.componentId);
  }
  return warnings;
}

/** Check for duplicate PaletteCategoryModel entries by categoryId */
export function checkDuplicatePaletteCategoryModels(models: PaletteCategoryModel[]): string[] {
  const warnings: string[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.categoryId)) {
      warnings.push(`Duplicate PaletteCategoryModel categoryId: '${m.categoryId}'`);
    }
    seen.add(m.categoryId);
  }
  return warnings;
}

/** Check for duplicate PaletteStateModel entries by stateId */
export function checkDuplicatePaletteStateModels(models: PaletteStateModel[]): string[] {
  const warnings: string[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.stateId)) {
      warnings.push(`Duplicate PaletteStateModel stateId: '${m.stateId}'`);
    }
    seen.add(m.stateId);
  }
  return warnings;
}

/** Check for duplicate WorkspaceToolModel entries by toolId */
export function checkDuplicateWorkspaceToolModels(models: WorkspaceToolModel[]): string[] {
  const warnings: string[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.toolId)) {
      warnings.push(`Duplicate WorkspaceToolModel toolId: '${m.toolId}'`);
    }
    seen.add(m.toolId);
  }
  return warnings;
}

/** Check for duplicate PinInspectorModel entries by inspectorId */
export function checkDuplicatePinInspectorModels(models: PinInspectorModel[]): string[] {
  const warnings: string[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.inspectorId)) {
      warnings.push(`Duplicate PinInspectorModel inspectorId: '${m.inspectorId}'`);
    }
    seen.add(m.inspectorId);
  }
  return warnings;
}

// ─── UNDO/REDO ENGINE ────────────────────────────────────────────────────────

/**
 * Push a new undo action onto the history stack.
 * Clears the redo stack (branching invalidation) and enforces maxCapacity.
 */
export function pushUndoAction(
  history: UndoHistoryModel,
  action: UndoActionModel,
): UndoHistoryModel {
  const result = safeDeepCopy(history);
  result.undoStack.push(safeDeepCopy(action));
  result.redoStack = [];

  // Enforce capacity — remove oldest entries from the bottom
  while (result.undoStack.length > result.maxCapacity) {
    result.undoStack.shift();
  }

  return result;
}

/**
 * Pop the most recent action from the undo stack and push it to the redo stack.
 * Returns the updated history and the popped action (null if stack was empty).
 */
export function undoAction(
  history: UndoHistoryModel,
): { history: UndoHistoryModel; action: UndoActionModel | null } {
  const result = safeDeepCopy(history);
  if (result.undoStack.length === 0) {
    return { history: result, action: null };
  }
  const action = result.undoStack.pop()!;
  result.redoStack.push(action);
  return { history: result, action: safeDeepCopy(action) };
}

/**
 * Pop the most recent action from the redo stack and push it back to the undo stack.
 * Returns the updated history and the popped action (null if stack was empty).
 */
export function redoAction(
  history: UndoHistoryModel,
): { history: UndoHistoryModel; action: UndoActionModel | null } {
  const result = safeDeepCopy(history);
  if (result.redoStack.length === 0) {
    return { history: result, action: null };
  }
  const action = result.redoStack.pop()!;
  result.undoStack.push(action);
  return { history: result, action: safeDeepCopy(action) };
}

/** Check if there are actions available to undo */
export function canUndo(history: UndoHistoryModel): boolean {
  return history.undoStack.length > 0;
}

/** Check if there are actions available to redo */
export function canRedo(history: UndoHistoryModel): boolean {
  return history.redoStack.length > 0;
}

/** Clear both undo and redo stacks, returning a fresh history */
export function clearUndoHistory(history: UndoHistoryModel): UndoHistoryModel {
  const result = safeDeepCopy(history);
  result.undoStack = [];
  result.redoStack = [];
  return result;
}

/** Get the number of actions in the undo stack */
export function getUndoStackSize(history: UndoHistoryModel): number {
  return history.undoStack.length;
}

/** Get the number of actions in the redo stack */
export function getRedoStackSize(history: UndoHistoryModel): number {
  return history.redoStack.length;
}

/** Peek at the most recent undo action without removing it */
export function peekUndo(history: UndoHistoryModel): UndoActionModel | null {
  if (history.undoStack.length === 0) return null;
  return safeDeepCopy(history.undoStack[history.undoStack.length - 1]);
}

/** Peek at the most recent redo action without removing it */
export function peekRedo(history: UndoHistoryModel): UndoActionModel | null {
  if (history.redoStack.length === 0) return null;
  return safeDeepCopy(history.redoStack[history.redoStack.length - 1]);
}

/** Create an undo action for component placement */
export function createPlacementAction(
  objectId: string,
  objectType: string,
  x: number,
  y: number,
): UndoActionModel {
  return createDefaultUndoActionModel(`placement_${objectId}_${Date.now()}`, {
    type: 'placement',
    description: `Place ${objectType} at (${x}, ${y})`,
    beforeState: {},
    afterState: { objectId, objectType, x, y },
    metadata: { objectId, objectType, x, y },
  });
}

/** Create an undo action for component movement */
export function createMovementAction(
  objectId: string,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): UndoActionModel {
  return createDefaultUndoActionModel(`movement_${objectId}_${Date.now()}`, {
    type: 'movement',
    description: `Move ${objectId} from (${fromX}, ${fromY}) to (${toX}, ${toY})`,
    beforeState: { objectId, x: fromX, y: fromY },
    afterState: { objectId, x: toX, y: toY },
    metadata: { objectId, fromX, fromY, toX, toY },
  });
}

/** Create an undo action for wire connection */
export function createWiringAction(
  wireId: string,
  fromPinId: string,
  toPinId: string,
  color: string,
): UndoActionModel {
  return createDefaultUndoActionModel(`wiring_${wireId}_${Date.now()}`, {
    type: 'wiring',
    description: `Wire ${fromPinId} → ${toPinId} (${color})`,
    beforeState: {},
    afterState: { wireId, fromPinId, toPinId, color },
    metadata: { wireId, fromPinId, toPinId, color },
  });
}

/** Create an undo action for component deletion */
export function createDeletionAction(
  objectId: string,
  objectType: string,
  x: number,
  y: number,
): UndoActionModel {
  return createDefaultUndoActionModel(`deletion_${objectId}_${Date.now()}`, {
    type: 'deletion',
    description: `Delete ${objectType} at (${x}, ${y})`,
    beforeState: { objectId, objectType, x, y },
    afterState: {},
    metadata: { objectId, objectType, x, y },
  });
}

/** Create an undo action for component rotation */
export function createRotationAction(
  objectId: string,
  fromAngle: number,
  toAngle: number,
): UndoActionModel {
  return createDefaultUndoActionModel(`rotation_${objectId}_${Date.now()}`, {
    type: 'rotation',
    description: `Rotate ${objectId} from ${fromAngle}° to ${toAngle}°`,
    beforeState: { objectId, angle: fromAngle },
    afterState: { objectId, angle: toAngle },
    metadata: { objectId, fromAngle, toAngle },
  });
}

/** Create an undo action for property change */
export function createPropertyChangeAction(
  objectId: string,
  propertyName: string,
  oldValue: unknown,
  newValue: unknown,
): UndoActionModel {
  return createDefaultUndoActionModel(`property_${objectId}_${propertyName}_${Date.now()}`, {
    type: 'property_change',
    description: `Change ${propertyName} on ${objectId}`,
    beforeState: { objectId, propertyName, value: oldValue },
    afterState: { objectId, propertyName, value: newValue },
    metadata: { objectId, propertyName, oldValue, newValue },
  });
}

/** Create an undo action for wire deletion */
export function createWireDeletionAction(
  wireId: string,
  fromPinId: string,
  toPinId: string,
  color: string,
): UndoActionModel {
  return createDefaultUndoActionModel(`wire_deletion_${wireId}_${Date.now()}`, {
    type: 'wire_deletion',
    description: `Delete wire ${fromPinId} → ${toPinId} (${color})`,
    beforeState: { wireId, fromPinId, toPinId, color },
    afterState: {},
    metadata: { wireId, fromPinId, toPinId, color },
  });
}

// ─── CAMERA GESTURE ENGINE ──────────────────────────────────────────────────

/**
 * Apply mouse wheel zoom centered on cursor position.
 * Adjusts panX/panY to keep the cursor point stationary relative to world space.
 */
export function applyMouseWheelZoom(
  gesture: CameraGestureModel,
  delta: number,
  cursorX: number,
  cursorY: number,
): CameraGestureModel {
  const result = safeDeepCopy(gesture);
  const direction = delta > 0 ? -1 : 1;
  const oldZoom = result.zoom;
  const newZoom = Math.max(result.minZoom, Math.min(result.maxZoom, oldZoom + direction * result.zoomStep));

  if (newZoom !== oldZoom) {
    // Adjust pan so the cursor position remains stable in world space
    const zoomRatio = newZoom / oldZoom;
    result.panX = cursorX - (cursorX - result.panX) * zoomRatio;
    result.panY = cursorY - (cursorY - result.panY) * zoomRatio;
    result.zoom = newZoom;
  }

  return result;
}

/**
 * Apply a pan delta (translation) to the camera.
 * Multiplied by panSpeed for consistent feel across zoom levels.
 */
export function applyPanDelta(
  gesture: CameraGestureModel,
  deltaX: number,
  deltaY: number,
): CameraGestureModel {
  const result = safeDeepCopy(gesture);
  result.panX += deltaX * result.panSpeed;
  result.panY += deltaY * result.panSpeed;
  return result;
}

/**
 * Fit the camera to show the given content bounds within the viewport.
 * Centers the content and calculates the optimal zoom level.
 */
export function fitToContent(
  gesture: CameraGestureModel,
  contentBounds: { x: number; y: number; width: number; height: number },
  viewportWidth: number,
  viewportHeight: number,
  padding = 50,
): CameraGestureModel {
  const result = safeDeepCopy(gesture);

  const effectiveWidth = viewportWidth - padding * 2;
  const effectiveHeight = viewportHeight - padding * 2;

  if (contentBounds.width <= 0 || contentBounds.height <= 0) {
    return result;
  }

  const scaleX = effectiveWidth / contentBounds.width;
  const scaleY = effectiveHeight / contentBounds.height;
  const fitZoom = Math.min(scaleX, scaleY);

  result.zoom = Math.max(result.minZoom, Math.min(result.maxZoom, fitZoom));

  // Center content in viewport
  const contentCenterX = contentBounds.x + contentBounds.width / 2;
  const contentCenterY = contentBounds.y + contentBounds.height / 2;
  result.panX = viewportWidth / 2 - contentCenterX * result.zoom;
  result.panY = viewportHeight / 2 - contentCenterY * result.zoom;

  return result;
}

/**
 * Center the workspace at the origin in the given viewport.
 */
export function centerWorkspace(
  gesture: CameraGestureModel,
  viewportWidth: number,
  viewportHeight: number,
): CameraGestureModel {
  const result = safeDeepCopy(gesture);
  result.panX = viewportWidth / 2;
  result.panY = viewportHeight / 2;
  return result;
}

/**
 * Zoom to fit a collection of object bounds within the viewport.
 * Calculates the enclosing bounding rectangle and delegates to fitToContent.
 */
export function zoomToFit(
  gesture: CameraGestureModel,
  objectBounds: Array<{ x: number; y: number; width: number; height: number }>,
  viewportWidth: number,
  viewportHeight: number,
): CameraGestureModel {
  if (objectBounds.length === 0) {
    return centerWorkspace(gesture, viewportWidth, viewportHeight);
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const bounds of objectBounds) {
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  }

  const enclosing = {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };

  return fitToContent(gesture, enclosing, viewportWidth, viewportHeight);
}

/**
 * Linearly interpolate between current and target camera state.
 * Useful for smooth animated transitions.
 */
export function lerpCameraState(
  current: CameraGestureModel,
  target: CameraGestureModel,
  factor: number,
): CameraGestureModel {
  const t = Math.max(0, Math.min(1, factor));
  const result = safeDeepCopy(current);
  result.zoom = current.zoom + (target.zoom - current.zoom) * t;
  result.panX = current.panX + (target.panX - current.panX) * t;
  result.panY = current.panY + (target.panY - current.panY) * t;
  return result;
}

/**
 * Clamp the zoom level to the configured min/max bounds.
 */
export function clampZoom(gesture: CameraGestureModel): CameraGestureModel {
  const result = safeDeepCopy(gesture);
  result.zoom = Math.max(result.minZoom, Math.min(result.maxZoom, result.zoom));
  return result;
}

/**
 * Convert screen coordinates to world coordinates given the camera gesture state.
 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  gesture: CameraGestureModel,
): { x: number; y: number } {
  return {
    x: (screenX - gesture.panX) / gesture.zoom,
    y: (screenY - gesture.panY) / gesture.zoom,
  };
}

/**
 * Convert world coordinates to screen coordinates given the camera gesture state.
 */
export function worldToScreen(
  worldX: number,
  worldY: number,
  gesture: CameraGestureModel,
): { x: number; y: number } {
  return {
    x: worldX * gesture.zoom + gesture.panX,
    y: worldY * gesture.zoom + gesture.panY,
  };
}

/**
 * Calculate the visible world-space bounds for the given viewport dimensions.
 */
export function getVisibleBounds(
  gesture: CameraGestureModel,
  viewportWidth: number,
  viewportHeight: number,
): { x: number; y: number; width: number; height: number } {
  const topLeft = screenToWorld(0, 0, gesture);
  const bottomRight = screenToWorld(viewportWidth, viewportHeight, gesture);
  return {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };
}

// ─── CONNECTION VALIDATOR ────────────────────────────────────────────────────

/** Wire descriptor used by connection validation functions */
interface WireDescriptor {
  wireId: string;
  fromPinId: string;
  toPinId: string;
  color: string;
}

/** Node descriptor used by connection validation functions */
interface NodeDescriptor {
  nodeId: string;
  pinIds: string[];
  voltage: number;
}

/** Pin descriptor used by connection validation functions */
interface PinDescriptor {
  pinId: string;
  componentId: string;
  signalType: string;
}

/**
 * Detect short circuits: multiple power sources at different voltages
 * connected through the same net.
 */
export function detectShortCircuits(
  wires: WireDescriptor[],
  nodes: NodeDescriptor[],
): ConnectionWarningModel[] {
  const warnings: ConnectionWarningModel[] = [];

  // Build adjacency: pin → set of connected pins via wires
  const adjacency = new Map<string, Set<string>>();
  for (const wire of wires) {
    if (!adjacency.has(wire.fromPinId)) adjacency.set(wire.fromPinId, new Set());
    if (!adjacency.has(wire.toPinId)) adjacency.set(wire.toPinId, new Set());
    adjacency.get(wire.fromPinId)!.add(wire.toPinId);
    adjacency.get(wire.toPinId)!.add(wire.fromPinId);
  }

  // Build pin → node lookup
  const pinToNode = new Map<string, NodeDescriptor>();
  for (const node of nodes) {
    for (const pinId of node.pinIds) {
      pinToNode.set(pinId, node);
    }
  }

  // BFS to find connected components, then check voltage conflicts
  const visited = new Set<string>();
  const allPins = Array.from(adjacency.keys());

  for (const startPin of allPins) {
    if (visited.has(startPin)) continue;

    const component: string[] = [];
    const queue = [startPin];
    visited.add(startPin);

    while (queue.length > 0) {
      const current = queue.shift()!;
      component.push(current);
      const neighbors = adjacency.get(current);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
    }

    // Check for conflicting voltages in this connected component
    const voltages = new Set<number>();
    const powerPins: string[] = [];
    for (const pinId of component) {
      const node = pinToNode.get(pinId);
      if (node && node.voltage !== 0) {
        voltages.add(node.voltage);
        powerPins.push(pinId);
      }
    }

    if (voltages.size > 1) {
      warnings.push(createDefaultConnectionWarningModel(
        `short_circuit_${component.join('_')}`,
        {
          level: 'error',
          type: 'short_circuit',
          message: `Short circuit detected: conflicting voltages (${Array.from(voltages).join('V, ')}V) in connected net`,
          affectedObjectIds: component,
          affectedPinIds: powerPins,
          metadata: { voltages: Array.from(voltages) },
        },
      ));
    }
  }

  return warnings;
}

/**
 * Detect duplicate wires: multiple wires connecting the same pair of pins.
 */
export function detectDuplicateWires(wires: WireDescriptor[]): ConnectionWarningModel[] {
  const warnings: ConnectionWarningModel[] = [];
  const seen = new Set<string>();

  for (const wire of wires) {
    // Normalize pair order for comparison
    const pair = [wire.fromPinId, wire.toPinId].sort().join('↔');
    if (seen.has(pair)) {
      warnings.push(createDefaultConnectionWarningModel(
        `duplicate_wire_${wire.wireId}`,
        {
          level: 'warning',
          type: 'duplicate_wire',
          message: `Duplicate wire detected between ${wire.fromPinId} and ${wire.toPinId}`,
          affectedObjectIds: [wire.wireId],
          affectedPinIds: [wire.fromPinId, wire.toPinId],
          metadata: { wireId: wire.wireId },
        },
      ));
    }
    seen.add(pair);
  }

  return warnings;
}

/**
 * Detect floating pins: pins that are not connected to any wire
 * but whose signal type suggests they should be.
 */
export function detectFloatingPins(
  pins: PinDescriptor[],
  wires: WireDescriptor[],
): ConnectionWarningModel[] {
  const warnings: ConnectionWarningModel[] = [];

  // Build set of all connected pin IDs
  const connectedPins = new Set<string>();
  for (const wire of wires) {
    connectedPins.add(wire.fromPinId);
    connectedPins.add(wire.toPinId);
  }

  for (const pin of pins) {
    if (!connectedPins.has(pin.pinId)) {
      const signalType = pin.signalType.toUpperCase();
      // Only warn for signal pins (DIGITAL, ANALOG), not POWER/GND/RESET
      if (signalType === 'DIGITAL' || signalType === 'ANALOG') {
        warnings.push(createDefaultConnectionWarningModel(
          `floating_pin_${pin.pinId}`,
          {
            level: 'info',
            type: 'floating_pin',
            message: `Pin ${pin.pinId} on ${pin.componentId} is not connected`,
            affectedObjectIds: [pin.componentId],
            affectedPinIds: [pin.pinId],
            metadata: { signalType: pin.signalType },
          },
        ));
      }
    }
  }

  return warnings;
}

/**
 * Detect invalid GPIO usage: two output pins connected directly together
 * or analog pins connected to digital-only sources.
 */
export function detectInvalidGpioUsage(
  pins: PinDescriptor[],
  wires: WireDescriptor[],
): ConnectionWarningModel[] {
  const warnings: ConnectionWarningModel[] = [];

  // Build pin lookup
  const pinMap = new Map<string, PinDescriptor>();
  for (const pin of pins) {
    pinMap.set(pin.pinId, pin);
  }

  for (const wire of wires) {
    const fromPin = pinMap.get(wire.fromPinId);
    const toPin = pinMap.get(wire.toPinId);
    if (!fromPin || !toPin) continue;

    const fromType = fromPin.signalType.toUpperCase();
    const toType = toPin.signalType.toUpperCase();

    // Check for POWER connected directly to GND (dead short)
    if (
      (fromType === 'POWER' && toType === 'GND') ||
      (fromType === 'GND' && toType === 'POWER')
    ) {
      warnings.push(createDefaultConnectionWarningModel(
        `invalid_gpio_${wire.wireId}`,
        {
          level: 'error',
          type: 'invalid_gpio',
          message: `Power pin directly connected to ground via wire ${wire.wireId}`,
          affectedObjectIds: [wire.wireId],
          affectedPinIds: [wire.fromPinId, wire.toPinId],
          metadata: { fromType, toType },
        },
      ));
    }

    // Check for analog pin connected to digital-only pin (signal mismatch warning)
    if (
      (fromType === 'ANALOG' && toType === 'DIGITAL') ||
      (fromType === 'DIGITAL' && toType === 'ANALOG')
    ) {
      warnings.push(createDefaultConnectionWarningModel(
        `gpio_mismatch_${wire.wireId}`,
        {
          level: 'warning',
          type: 'signal_mismatch',
          message: `Signal type mismatch: ${fromType} pin connected to ${toType} pin via wire ${wire.wireId}`,
          affectedObjectIds: [wire.wireId],
          affectedPinIds: [wire.fromPinId, wire.toPinId],
          metadata: { fromType, toType },
        },
      ));
    }
  }

  return warnings;
}

/**
 * Detect power rail conflicts: multiple nodes claiming different voltages
 * on the same power rail.
 */
export function detectPowerRailConflicts(nodes: NodeDescriptor[]): ConnectionWarningModel[] {
  const warnings: ConnectionWarningModel[] = [];

  // Group nodes by shared pins to find overlapping power rails
  const voltageByPin = new Map<string, { voltage: number; nodeId: string }[]>();
  for (const node of nodes) {
    if (node.voltage === 0) continue; // Skip ground nodes
    for (const pinId of node.pinIds) {
      if (!voltageByPin.has(pinId)) voltageByPin.set(pinId, []);
      voltageByPin.get(pinId)!.push({ voltage: node.voltage, nodeId: node.nodeId });
    }
  }

  for (const [pinId, entries] of voltageByPin) {
    const uniqueVoltages = new Set(entries.map(e => e.voltage));
    if (uniqueVoltages.size > 1) {
      warnings.push(createDefaultConnectionWarningModel(
        `power_rail_conflict_${pinId}`,
        {
          level: 'error',
          type: 'power_rail_conflict',
          message: `Power rail conflict at pin ${pinId}: voltages ${Array.from(uniqueVoltages).join('V, ')}V`,
          affectedObjectIds: entries.map(e => e.nodeId),
          affectedPinIds: [pinId],
          metadata: { voltages: Array.from(uniqueVoltages) },
        },
      ));
    }
  }

  return warnings;
}

/**
 * Run all connection validation checks and return a complete validation model.
 */
export function validateAllConnections(
  wires: WireDescriptor[],
  pins: PinDescriptor[],
  nodes: NodeDescriptor[],
): ConnectionValidationModel {
  const allWarnings: ConnectionWarningModel[] = [
    ...detectShortCircuits(wires, nodes),
    ...detectDuplicateWires(wires),
    ...detectFloatingPins(pins, wires),
    ...detectInvalidGpioUsage(pins, wires),
    ...detectPowerRailConflicts(nodes),
  ];

  return createDefaultConnectionValidationModel(`validation_${Date.now()}`, {
    warnings: allWarnings,
    lastValidatedAt: Date.now(),
    autoValidateEnabled: true,
  });
}

/**
 * Get a count of warnings broken down by severity level.
 */
export function getWarningCount(
  validation: ConnectionValidationModel,
): { info: number; warning: number; error: number; total: number } {
  let info = 0;
  let warning = 0;
  let error = 0;

  for (const w of validation.warnings) {
    switch (w.level) {
      case 'info': info++; break;
      case 'warning': warning++; break;
      case 'error': error++; break;
    }
  }

  return { info, warning, error, total: info + warning + error };
}

/**
 * Check if the validation contains any error-level warnings.
 */
export function hasErrors(validation: ConnectionValidationModel): boolean {
  return validation.warnings.some(w => w.level === 'error');
}

/**
 * Clear all warnings from a validation model.
 */
export function clearWarnings(validation: ConnectionValidationModel): ConnectionValidationModel {
  const result = safeDeepCopy(validation);
  result.warnings = [];
  return result;
}

// ─── PALETTE ENGINE ─────────────────────────────────────────────────────────

/**
 * Filter palette components by category.
 */
export function filterByCategory(
  components: PaletteComponentModel[],
  category: PaletteCategory,
): PaletteComponentModel[] {
  return safeDeepCopy(components.filter(c => c.category === category));
}

/**
 * Filter palette components by search query.
 * Case-insensitive match on displayName and description.
 */
export function filterBySearch(
  components: PaletteComponentModel[],
  query: string,
): PaletteComponentModel[] {
  if (!query.trim()) return safeDeepCopy(components);
  const lowerQuery = query.toLowerCase();
  return safeDeepCopy(
    components.filter(
      c =>
        c.displayName.toLowerCase().includes(lowerQuery) ||
        c.description.toLowerCase().includes(lowerQuery),
    ),
  );
}

/**
 * Toggle the isFavorite flag for a specific component by componentId.
 * Returns a new array with the toggled component.
 */
export function toggleFavorite(
  components: PaletteComponentModel[],
  componentId: string,
): PaletteComponentModel[] {
  return safeDeepCopy(
    components.map(c =>
      c.componentId === componentId
        ? { ...c, isFavorite: !c.isFavorite }
        : c,
    ),
  );
}

/**
 * Add a component to the recent list.
 * Adds to front, deduplicates, and trims to maxRecentCount.
 */
export function addToRecent(
  state: PaletteStateModel,
  componentId: string,
): PaletteStateModel {
  const result = safeDeepCopy(state);
  // Remove existing occurrence to avoid duplicates
  result.recentComponentIds = result.recentComponentIds.filter(id => id !== componentId);
  // Add to front
  result.recentComponentIds.unshift(componentId);
  // Trim to maxRecentCount
  if (result.recentComponentIds.length > result.maxRecentCount) {
    result.recentComponentIds = result.recentComponentIds.slice(0, result.maxRecentCount);
  }
  return result;
}

/**
 * Get the PaletteComponentModel objects for all recent component IDs.
 * Preserves recency order, skips IDs not found in allComponents.
 */
export function getRecentComponents(
  state: PaletteStateModel,
  allComponents: PaletteComponentModel[],
): PaletteComponentModel[] {
  const componentMap = new Map<string, PaletteComponentModel>();
  for (const c of allComponents) {
    componentMap.set(c.componentId, c);
  }

  const result: PaletteComponentModel[] = [];
  for (const id of state.recentComponentIds) {
    const found = componentMap.get(id);
    if (found) result.push(found);
  }

  return safeDeepCopy(result);
}

/**
 * Get all components marked as favorites.
 */
export function getFavoriteComponents(
  components: PaletteComponentModel[],
): PaletteComponentModel[] {
  return safeDeepCopy(components.filter(c => c.isFavorite));
}

/**
 * Sort components by usage count in descending order.
 */
export function sortByUsageCount(
  components: PaletteComponentModel[],
): PaletteComponentModel[] {
  const copy = safeDeepCopy(components);
  copy.sort((a, b) => b.usageCount - a.usageCount);
  return copy;
}

/**
 * Sort components by display name alphabetically.
 */
export function sortByName(
  components: PaletteComponentModel[],
): PaletteComponentModel[] {
  const copy = safeDeepCopy(components);
  copy.sort((a, b) => a.displayName.localeCompare(b.displayName));
  return copy;
}

/**
 * Group components by category, returning a Map keyed by category string.
 */
export function getComponentsByCategory(
  components: PaletteComponentModel[],
): Map<string, PaletteComponentModel[]> {
  const result = new Map<string, PaletteComponentModel[]>();
  for (const c of components) {
    if (!result.has(c.category)) result.set(c.category, []);
    result.get(c.category)!.push(safeDeepCopy(c));
  }
  return result;
}

/**
 * Create a default PaletteStateModel pre-populated with the default palette components.
 * The recent list is empty but all categories are loaded.
 */
export function createDefaultPaletteState(): PaletteStateModel {
  return createDefaultPaletteStateModel('default_palette_state', {
    searchQuery: '',
    activeCategory: '',
    showFavoritesOnly: false,
    recentComponentIds: [],
    maxRecentCount: DEFAULT_SIMUI_MAX_RECENT,
  });
}

// ─── WORKSPACE TOOL ENGINE ──────────────────────────────────────────────────

/**
 * Set the active workspace tool. Stores the previous tool for revert support.
 */
export function setActiveTool(
  model: WorkspaceToolModel,
  tool: WorkspaceTool,
): WorkspaceToolModel {
  if (!VALID_SIMUI_TOOLS.includes(tool)) {
    console.warn(`setActiveTool: invalid tool '${tool}', ignoring`);
    return safeDeepCopy(model);
  }
  const result = safeDeepCopy(model);
  result.previousTool = result.activeTool;
  result.activeTool = tool;
  return result;
}

/**
 * Get the cursor style string for the current active tool.
 */
export function getToolCursor(model: WorkspaceToolModel): string {
  return DEFAULT_SIMUI_TOOL_CURSORS[model.activeTool] || 'default';
}

/**
 * Resolve a keyboard key to a WorkspaceTool using the shortcut map.
 * Returns null if the key is not a valid shortcut.
 */
export function resolveKeyboardShortcut(key: string): WorkspaceTool | null {
  return DEFAULT_SIMUI_TOOL_SHORTCUTS[key.toLowerCase()] || null;
}

/**
 * Toggle the tool lock state. When locked, the tool persists after a single use.
 */
export function toggleToolLock(model: WorkspaceToolModel): WorkspaceToolModel {
  const result = safeDeepCopy(model);
  result.isToolLocked = !result.isToolLocked;
  return result;
}

/**
 * Revert to the previously active tool (undo last tool change).
 */
export function revertToPreviousTool(model: WorkspaceToolModel): WorkspaceToolModel {
  const result = safeDeepCopy(model);
  const temp = result.activeTool;
  result.activeTool = result.previousTool;
  result.previousTool = temp;
  return result;
}

// ─── PIN INSPECTOR ENGINE ───────────────────────────────────────────────────

/** Pin definition descriptor for inspector tooltip */
interface PinDefinition {
  name: string;
  number: number;
  signalType: 'DIGITAL' | 'ANALOG' | 'POWER' | 'GND' | 'RESET';
  pixelX: number;
  pixelY: number;
}

/**
 * Create a PinInspectorModel from a pin definition, component ID, and wires.
 * Determines GPIO number, voltage, capabilities, and connection state.
 */
export function createPinTooltipData(
  pinDef: PinDefinition,
  componentId: string,
  wires: WireDescriptor[],
): PinInspectorModel {
  // Determine GPIO number from pin number
  const gpioNumber = pinDef.number;

  // Determine voltage based on component type heuristic and signal type
  let voltage = 0;
  if (pinDef.signalType === 'GND') {
    voltage = 0;
  } else if (pinDef.signalType === 'POWER') {
    // Heuristic: ESP32 uses 3.3V, Arduino uses 5.0V
    if (componentId.toLowerCase().includes('esp32')) {
      voltage = 3.3;
    } else {
      voltage = 5.0;
    }
  } else if (pinDef.signalType === 'DIGITAL' || pinDef.signalType === 'ANALOG') {
    if (componentId.toLowerCase().includes('esp32')) {
      voltage = 3.3;
    } else {
      voltage = 5.0;
    }
  }

  // Determine capabilities
  const pwmSupport = pinDef.signalType === 'DIGITAL';
  const adcSupport = pinDef.signalType === 'ANALOG';

  // Determine connection state
  const pinId = `${componentId}_pin_${pinDef.number}`;
  const connectedWireIds = getConnectedWires(pinId, wires);
  let connectionState: string;

  if (pinDef.signalType === 'POWER') {
    connectionState = 'power';
  } else if (pinDef.signalType === 'GND') {
    connectionState = 'ground';
  } else if (connectedWireIds.length > 0) {
    connectionState = 'connected';
  } else {
    connectionState = 'floating';
  }

  return createDefaultPinInspectorModel(`inspector_${pinId}`, {
    hoveredPinId: pinId,
    pinName: pinDef.name,
    gpioNumber,
    voltage,
    pwmSupport,
    adcSupport,
    connectionState,
    connectedWireIds,
    metadata: {
      componentId,
      signalType: pinDef.signalType,
      pixelX: pinDef.pixelX,
      pixelY: pinDef.pixelY,
    },
  });
}

/**
 * Get pin capabilities based on signal type.
 */
export function getPinCapabilities(
  signalType: string,
): { digital: boolean; analog: boolean; pwm: boolean; input: boolean; output: boolean } {
  const type = signalType.toUpperCase();
  switch (type) {
    case 'DIGITAL':
      return { digital: true, analog: false, pwm: true, input: true, output: true };
    case 'ANALOG':
      return { digital: false, analog: true, pwm: false, input: true, output: false };
    case 'POWER':
      return { digital: false, analog: false, pwm: false, input: false, output: true };
    case 'GND':
      return { digital: false, analog: false, pwm: false, input: false, output: false };
    case 'RESET':
      return { digital: true, analog: false, pwm: false, input: true, output: false };
    default:
      return { digital: false, analog: false, pwm: false, input: false, output: false };
  }
}

/**
 * Check if a pin is connected to any wire.
 */
export function isPinConnected(pinId: string, wires: WireDescriptor[]): boolean {
  return wires.some(w => w.fromPinId === pinId || w.toPinId === pinId);
}

/**
 * Get all wire IDs connected to a specific pin.
 */
export function getConnectedWires(pinId: string, wires: WireDescriptor[]): string[] {
  return wires
    .filter(w => w.fromPinId === pinId || w.toPinId === pinId)
    .map(w => w.wireId);
}

// ─── REGISTRY CLASS ─────────────────────────────────────────────────────────

/**
 * Generic registry for simulator UI models with Map storage
 * and deterministic insertion-order iteration.
 */
export class SimulatorUIRegistry<T extends { [key: string]: any }> {
  private readonly storage = new Map<string, T>();
  private readonly order: string[] = [];

  constructor(private readonly idKey: string) {}

  /** Register a new model. Overwrites if the id already exists. */
  register(id: string, model: T): void {
    if (!this.storage.has(id)) {
      this.order.push(id);
    }
    this.storage.set(id, safeDeepCopy(model));
  }

  /** Get a model by id. Returns a deep copy or undefined. */
  get(id: string): T | undefined {
    const item = this.storage.get(id);
    return item ? safeDeepCopy(item) : undefined;
  }

  /** Get all models in insertion order. Returns deep copies. */
  getAll(): T[] {
    return this.order
      .filter(id => this.storage.has(id))
      .map(id => safeDeepCopy(this.storage.get(id)!));
  }

  /** Update a model with a partial patch. Returns true if successful. */
  update(id: string, patch: Partial<T>): boolean {
    const existing = this.storage.get(id);
    if (!existing) return false;
    this.storage.set(id, { ...safeDeepCopy(existing), ...safeDeepCopy(patch) });
    return true;
  }

  /** Remove a model by id. Returns true if it existed. */
  remove(id: string): boolean {
    const existed = this.storage.delete(id);
    if (existed) {
      const idx = this.order.indexOf(id);
      if (idx !== -1) this.order.splice(idx, 1);
    }
    return existed;
  }

  /** Clear all models from the registry. */
  clear(): void {
    this.storage.clear();
    this.order.length = 0;
  }

  /** Get all registered keys in insertion order. */
  keys(): string[] {
    return [...this.order];
  }

  /** Check if a model exists by id. */
  has(id: string): boolean {
    return this.storage.has(id);
  }

  /** Number of models in the registry. */
  get size(): number {
    return this.storage.size;
  }

  /** Create a deep-copy clone of this registry. */
  clone(): SimulatorUIRegistry<T> {
    const cloned = new SimulatorUIRegistry<T>(this.idKey);
    for (const id of this.order) {
      const item = this.storage.get(id);
      if (item) cloned.register(id, safeDeepCopy(item));
    }
    return cloned;
  }

  /** Serialize the registry to a JSON-safe array. */
  toJSON(): T[] {
    return this.getAll();
  }

  /** Restore registry state from a JSON array. Clears existing data first. */
  fromJSON(json: T[]): void {
    this.clear();
    for (const item of json) {
      const id = item[this.idKey] as string;
      if (id) {
        this.register(id, item);
      }
    }
  }
}

// ─── SYNCHRONIZER CLASS ─────────────────────────────────────────────────────

/**
 * Central synchronizer that owns all simulator UI registries
 * and provides snapshot/serialization operations.
 */
export class SimulatorUISynchronizer {
  public readonly undoHistoryRegistry = new SimulatorUIRegistry<UndoHistoryModel>('historyId');
  public readonly cameraGestureRegistry = new SimulatorUIRegistry<CameraGestureModel>('gestureId');
  public readonly connectionValidationRegistry = new SimulatorUIRegistry<ConnectionValidationModel>('validationId');
  public readonly connectionWarningRegistry = new SimulatorUIRegistry<ConnectionWarningModel>('warningId');
  public readonly paletteComponentRegistry = new SimulatorUIRegistry<PaletteComponentModel>('componentId');
  public readonly paletteCategoryRegistry = new SimulatorUIRegistry<PaletteCategoryModel>('categoryId');
  public readonly paletteStateRegistry = new SimulatorUIRegistry<PaletteStateModel>('stateId');
  public readonly workspaceToolRegistry = new SimulatorUIRegistry<WorkspaceToolModel>('toolId');
  public readonly pinInspectorRegistry = new SimulatorUIRegistry<PinInspectorModel>('inspectorId');

  /**
   * Build a complete snapshot of all registries.
   */
  buildSnapshot(): SimulatorUISnapshot {
    return {
      undoHistories: this.undoHistoryRegistry.toJSON(),
      cameraGestures: this.cameraGestureRegistry.toJSON(),
      connectionValidations: this.connectionValidationRegistry.toJSON(),
      paletteComponents: this.paletteComponentRegistry.toJSON(),
      paletteCategories: this.paletteCategoryRegistry.toJSON(),
      paletteStates: this.paletteStateRegistry.toJSON(),
      workspaceTools: this.workspaceToolRegistry.toJSON(),
      pinInspectors: this.pinInspectorRegistry.toJSON(),
      connectionWarnings: this.connectionWarningRegistry.toJSON(),
    };
  }

  /**
   * Clear all registries.
   */
  clear(): void {
    this.undoHistoryRegistry.clear();
    this.cameraGestureRegistry.clear();
    this.connectionValidationRegistry.clear();
    this.connectionWarningRegistry.clear();
    this.paletteComponentRegistry.clear();
    this.paletteCategoryRegistry.clear();
    this.paletteStateRegistry.clear();
    this.workspaceToolRegistry.clear();
    this.pinInspectorRegistry.clear();
  }

  /**
   * Create a deep-copy clone of this synchronizer and all its registries.
   */
  clone(): SimulatorUISynchronizer {
    const cloned = new SimulatorUISynchronizer();
    const snapshot = this.buildSnapshot();
    cloned.fromJSON(snapshot);
    return cloned;
  }

  /**
   * Serialize the entire synchronizer to a JSON-safe snapshot object.
   */
  toJSON(): SimulatorUISnapshot {
    return this.buildSnapshot();
  }

  /**
   * Restore the synchronizer from a JSON snapshot. Clears existing data first.
   */
  fromJSON(snapshot: SimulatorUISnapshot): void {
    this.clear();
    this.undoHistoryRegistry.fromJSON(snapshot.undoHistories || []);
    this.cameraGestureRegistry.fromJSON(snapshot.cameraGestures || []);
    this.connectionValidationRegistry.fromJSON(snapshot.connectionValidations || []);
    this.paletteComponentRegistry.fromJSON(snapshot.paletteComponents || []);
    this.paletteCategoryRegistry.fromJSON(snapshot.paletteCategories || []);
    this.paletteStateRegistry.fromJSON(snapshot.paletteStates || []);
    this.workspaceToolRegistry.fromJSON(snapshot.workspaceTools || []);
    this.pinInspectorRegistry.fromJSON(snapshot.pinInspectors || []);
    this.connectionWarningRegistry.fromJSON(snapshot.connectionWarnings || []);
  }
}
