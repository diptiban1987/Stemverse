import { RenderRegistry } from './render-registry';
import { ValidationWarning } from './scene-model';
import {
  HoverFeedbackModel, HoverStateModel, HoverTargetType, HoverCursorStyle,
  ContextMenuAction, ContextMenuItemModel, ContextMenuStateModel,
  SelectionMode, SelectionHandleType, SelectionHandleModel, ProfessionalSelectionModel,
  WireCreationPhase, WireCreationStateModel, WireValidationOverlayModel, WireValidationStatus,
  CameraNavigationMode, CameraEasing, CameraAnimationModel, MinimapModel,
  PaletteDragModel, PaletteFilterModel,
  PerformanceMetricsModel,
  WorkspaceThemeConfigModel,
  SimulatorUXSnapshot,
} from '../types';

// ─── HELPER ─────────────────────────────────────────────────────────────────────

function safeDeepCopy<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

// ─── FACTORY FUNCTIONS ──────────────────────────────────────────────────────────

export function createDefaultHoverFeedbackModel(
  feedbackId = 'default_hover_feedback',
  overrides: Partial<HoverFeedbackModel> = {},
): HoverFeedbackModel {
  return {
    feedbackId,
    hoveredObjectId: '',
    targetType: 'NONE',
    cursorStyle: 'default',
    glowColor: '#FFD700',
    glowIntensity: 0.5,
    glowRadius: 8,
    pinLabel: '',
    voltageLabel: '',
    tooltipText: '',
    positionX: 0,
    positionY: 0,
    isActive: false,
    futureHoverFeedbackHints: {},
    ...overrides,
  };
}

export function createDefaultHoverStateModel(
  stateId = 'default_hover_state',
  overrides: Partial<HoverStateModel> = {},
): HoverStateModel {
  return {
    stateId,
    currentHoverId: '',
    previousHoverId: '',
    currentTargetType: 'NONE',
    previousTargetType: 'NONE',
    hoverStartTimestamp: 0,
    hoverDurationMs: 0,
    isHovering: false,
    futureHoverStateHints: {},
    ...overrides,
  };
}

export function createDefaultContextMenuItemModel(
  itemId = 'default_context_item',
  overrides: Partial<ContextMenuItemModel> = {},
): ContextMenuItemModel {
  return {
    itemId,
    action: 'INSPECT',
    label: '',
    icon: '',
    enabled: true,
    shortcut: '',
    dividerAfter: false,
    futureMenuItemHints: {},
    ...overrides,
  };
}

export function createDefaultContextMenuStateModel(
  menuId = 'default_context_menu',
  overrides: Partial<ContextMenuStateModel> = {},
): ContextMenuStateModel {
  return {
    menuId,
    visible: false,
    positionX: 0,
    positionY: 0,
    targetObjectId: '',
    targetObjectType: 'NONE',
    items: [],
    futureContextMenuHints: {},
    ...overrides,
  };
}

export function createDefaultSelectionHandleModel(
  handleId = 'default_handle',
  overrides: Partial<SelectionHandleModel> = {},
): SelectionHandleModel {
  return {
    handleId,
    handleType: 'RESIZE_N',
    positionX: 0,
    positionY: 0,
    cursor: 'default',
    isActive: false,
    futureHandleHints: {},
    ...overrides,
  };
}

export function createDefaultProfessionalSelectionModel(
  selectionId = 'default_selection',
  overrides: Partial<ProfessionalSelectionModel> = {},
): ProfessionalSelectionModel {
  return {
    selectionId,
    selectedObjectIds: [],
    selectionMode: 'SINGLE',
    boundsX: 0,
    boundsY: 0,
    boundsWidth: 0,
    boundsHeight: 0,
    handles: [],
    isBoxSelecting: false,
    boxStartX: 0,
    boxStartY: 0,
    boxEndX: 0,
    boxEndY: 0,
    clipboardObjectIds: [],
    hasClipboardData: false,
    futureSelectionModelHints: {},
    ...overrides,
  };
}

export function createDefaultWireCreationStateModel(
  creationId = 'default_wire_creation',
  overrides: Partial<WireCreationStateModel> = {},
): WireCreationStateModel {
  return {
    creationId,
    phase: 'IDLE',
    sourcePinId: '',
    sourceComponentId: '',
    targetPinId: '',
    targetComponentId: '',
    previewPoints: [],
    wireColor: '#00FF00',
    isValidTarget: false,
    snapTargetPinId: '',
    snapDistance: 0,
    routingMode: 'AUTO',
    futureWireCreationHints: {},
    ...overrides,
  };
}

export function createDefaultWireValidationOverlayModel(
  overlayId = 'default_wire_overlay',
  overrides: Partial<WireValidationOverlayModel> = {},
): WireValidationOverlayModel {
  return {
    overlayId,
    wireId: '',
    status: 'valid',
    overlayColor: '#00FF00',
    message: '',
    affectedPinIds: [],
    pulseAnimation: false,
    futureOverlayHints: {},
    ...overrides,
  };
}

export function createDefaultCameraAnimationModel(
  animationId = 'default_camera_anim',
  overrides: Partial<CameraAnimationModel> = {},
): CameraAnimationModel {
  return {
    animationId,
    fromZoom: 1,
    toZoom: 1,
    fromPanX: 0,
    fromPanY: 0,
    toPanX: 0,
    toPanY: 0,
    durationMs: 300,
    elapsedMs: 0,
    progress: 0,
    easing: 'EASE_IN_OUT',
    isComplete: false,
    navigationMode: 'IDLE',
    futureCameraAnimationHints: {},
    ...overrides,
  };
}

export function createDefaultMinimapModel(
  minimapId = 'default_minimap',
  overrides: Partial<MinimapModel> = {},
): MinimapModel {
  return {
    minimapId,
    enabled: true,
    boundsX: 0,
    boundsY: 0,
    boundsWidth: 200,
    boundsHeight: 150,
    viewportRectX: 0,
    viewportRectY: 0,
    viewportRectWidth: 200,
    viewportRectHeight: 150,
    objectPositions: [],
    minimapScale: 0.1,
    futureMinimapHints: {},
    ...overrides,
  };
}

export function createDefaultPaletteDragModel(
  dragId = 'default_palette_drag',
  overrides: Partial<PaletteDragModel> = {},
): PaletteDragModel {
  return {
    dragId,
    draggedComponentId: '',
    draggedAssetId: '',
    dragStartX: 0,
    dragStartY: 0,
    currentX: 0,
    currentY: 0,
    previewVisible: false,
    snapTargetX: 0,
    snapTargetY: 0,
    isOverWorkspace: false,
    isDragging: false,
    futureDragHints: {},
    ...overrides,
  };
}

export function createDefaultPaletteFilterModel(
  filterId = 'default_palette_filter',
  overrides: Partial<PaletteFilterModel> = {},
): PaletteFilterModel {
  return {
    filterId,
    searchQuery: '',
    activeCategory: '',
    showFavoritesOnly: false,
    showRecentOnly: false,
    sortBy: 'name',
    sortDirection: 'asc',
    matchedComponentIds: [],
    totalResults: 0,
    futureFilterHints: {},
    ...overrides,
  };
}

export function createDefaultPerformanceMetricsModel(
  metricsId = 'default_performance',
  overrides: Partial<PerformanceMetricsModel> = {},
): PerformanceMetricsModel {
  return {
    metricsId,
    fps: 60,
    frameTimeMs: 16.67,
    averageFrameTimeMs: 16.67,
    renderCalls: 0,
    textureMemoryBytes: 0,
    geometryPoolSize: 0,
    objectCount: 0,
    visibleObjectCount: 0,
    wireCount: 0,
    componentCount: 0,
    lastUpdatedAt: 0,
    frameHistory: [],
    maxFrameHistoryLength: 60,
    futurePerformanceHints: {},
    ...overrides,
  };
}

export function createDefaultWorkspaceThemeConfigModel(
  themeId = 'default_theme',
  overrides: Partial<WorkspaceThemeConfigModel> = {},
): WorkspaceThemeConfigModel {
  return {
    themeId,
    themeName: 'Default',
    backgroundColor: '#1E1E1E',
    gridColor: '#333333',
    gridOpacity: 0.5,
    selectionColor: '#4A90D9',
    selectionOpacity: 0.35,
    hoverGlowColor: '#FFD700',
    hoverGlowIntensity: 0.6,
    wirePreviewColor: '#81C784',
    wirePreviewOpacity: 0.7,
    validationValidColor: '#00FF00',
    validationWarningColor: '#FFA500',
    validationErrorColor: '#FF0000',
    breadboardColor: '#F5F5DC',
    breadboardHoleColor: '#333333',
    pinHighlightColor: '#FFD54F',
    tooltipBackgroundColor: '#263238',
    tooltipTextColor: '#ECEFF1',
    futureThemeHints: {},
    ...overrides,
  };
}

// ─── VALIDATION CONSTANTS ───────────────────────────────────────────────────────

export const VALID_HOVER_TARGET_TYPES: HoverTargetType[] = ['COMPONENT', 'PIN', 'WIRE', 'BREADBOARD_HOLE', 'BREADBOARD', 'NONE'];
export const VALID_CURSOR_STYLES: HoverCursorStyle[] = ['default', 'pointer', 'grab', 'grabbing', 'crosshair', 'not-allowed', 'move'];
export const VALID_CONTEXT_MENU_ACTIONS: ContextMenuAction[] = ['DUPLICATE', 'DELETE', 'ROTATE_CW', 'ROTATE_CCW', 'BRING_FORWARD', 'SEND_BACKWARD', 'DISCONNECT', 'INSPECT', 'FOCUS_CAMERA'];
export const VALID_SELECTION_MODES: SelectionMode[] = ['SINGLE', 'MULTI', 'BOX', 'SHIFT'];
export const VALID_HANDLE_TYPES: SelectionHandleType[] = ['RESIZE_N', 'RESIZE_S', 'RESIZE_E', 'RESIZE_W', 'RESIZE_NE', 'RESIZE_NW', 'RESIZE_SE', 'RESIZE_SW', 'ROTATE'];
export const VALID_WIRE_CREATION_PHASES: WireCreationPhase[] = ['IDLE', 'SOURCE_SELECTED', 'ROUTING', 'TARGET_HOVER', 'COMPLETING', 'CANCELLED'];
export const VALID_WIRE_VALIDATION_STATUSES: WireValidationStatus[] = ['valid', 'warning', 'error'];
export const VALID_CAMERA_EASINGS: CameraEasing[] = ['LINEAR', 'EASE_IN', 'EASE_OUT', 'EASE_IN_OUT'];
export const VALID_NAVIGATION_MODES: CameraNavigationMode[] = ['IDLE', 'PANNING', 'ZOOMING', 'FIT_PROJECT', 'ZOOM_TO_SELECTION'];

// ─── DOMAIN LOGIC FUNCTIONS ─────────────────────────────────────────────────────

/** Maps a hover target type to the appropriate cursor style */
export function mapHoverTargetToCursor(targetType: HoverTargetType): HoverCursorStyle {
  switch (targetType) {
    case 'COMPONENT':
      return 'pointer';
    case 'PIN':
      return 'crosshair';
    case 'WIRE':
      return 'pointer';
    case 'BREADBOARD_HOLE':
      return 'crosshair';
    case 'BREADBOARD':
      return 'grab';
    case 'NONE':
    default:
      return 'default';
  }
}

/** Computes the bounding box that encloses all given rectangles */
export function calculateSelectionBounds(
  objects: Array<{ x: number; y: number; width: number; height: number }>,
): { x: number; y: number; width: number; height: number } {
  if (objects.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const obj of objects) {
    if (obj.x < minX) minX = obj.x;
    if (obj.y < minY) minY = obj.y;
    if (obj.x + obj.width > maxX) maxX = obj.x + obj.width;
    if (obj.y + obj.height > maxY) maxY = obj.y + obj.height;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Returns the IDs of objects whose bounding boxes intersect the given selection rectangle */
export function calculateBoxSelectionIntersection(
  objects: Array<{ id: string; x: number; y: number; width: number; height: number }>,
  boxX1: number, boxY1: number, boxX2: number, boxY2: number,
): string[] {
  const left = Math.min(boxX1, boxX2);
  const right = Math.max(boxX1, boxX2);
  const top = Math.min(boxY1, boxY2);
  const bottom = Math.max(boxY1, boxY2);
  return objects
    .filter((obj) => {
      const oRight = obj.x + obj.width;
      const oBottom = obj.y + obj.height;
      return obj.x < right && oRight > left && obj.y < bottom && oBottom > top;
    })
    .map((obj) => obj.id);
}

/** Finds the nearest pin within a snap radius, returns null if none */
export function calculateSnapTarget(
  mouseX: number, mouseY: number,
  pins: Array<{ pinId: string; x: number; y: number }>,
  radius: number,
): { pinId: string; x: number; y: number } | null {
  let nearest: { pinId: string; x: number; y: number } | null = null;
  let nearestDist = Infinity;
  for (const pin of pins) {
    const dist = Math.sqrt((mouseX - pin.x) ** 2 + (mouseY - pin.y) ** 2);
    if (dist <= radius && dist < nearestDist) {
      nearestDist = dist;
      nearest = pin;
    }
  }
  return nearest;
}

/** Returns a hex color string for a wire validation overlay status */
export function getValidationOverlayColor(status: WireValidationStatus): string {
  switch (status) {
    case 'valid':
      return '#00FF00';
    case 'warning':
      return '#FFA500';
    case 'error':
      return '#FF0000';
    default:
      return '#FFFFFF';
  }
}

/** Alias for tickCameraAnimation — advances a camera animation by deltaMs */
export function interpolateCameraAnimation(animation: CameraAnimationModel, deltaMs: number): CameraAnimationModel {
  const newElapsed = Math.min(animation.elapsedMs + deltaMs, animation.durationMs);
  const rawProgress = animation.durationMs > 0 ? newElapsed / animation.durationMs : 1;
  const easedProgress = applyEasing(rawProgress, animation.easing);
  return {
    ...animation,
    elapsedMs: newElapsed,
    progress: easedProgress,
    isComplete: newElapsed >= animation.durationMs,
  };
}

/** Applies an easing function to a progress value (0..1) */
export function applyEasing(progress: number, easing: CameraEasing): number {
  const t = Math.max(0, Math.min(1, progress));
  switch (easing) {
    case 'LINEAR':
      return t;
    case 'EASE_IN':
      return t * t;
    case 'EASE_OUT':
      return t * (2 - t);
    case 'EASE_IN_OUT':
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    default:
      return t;
  }
}

/** Computes camera zoom and pan to fit all objects within the viewport */
export function calculateFitToProjectBounds(
  objects: Array<{ x: number; y: number; width: number; height: number }>,
  viewportWidth: number, viewportHeight: number,
  padding = 0,
): { zoom: number; panX: number; panY: number } {
  if (objects.length === 0) {
    return { zoom: 1.0, panX: viewportWidth / 2, panY: viewportHeight / 2 };
  }
  const bounds = calculateSelectionBounds(objects);
  if (bounds.width === 0 || bounds.height === 0) {
    return { zoom: 1.0, panX: viewportWidth / 2, panY: viewportHeight / 2 };
  }
  const effectiveWidth = viewportWidth - padding * 2;
  const effectiveHeight = viewportHeight - padding * 2;
  const zoomX = effectiveWidth / bounds.width;
  const zoomY = effectiveHeight / bounds.height;
  const zoom = Math.min(zoomX, zoomY);
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const panX = viewportWidth / 2 - centerX * zoom;
  const panY = viewportHeight / 2 - centerY * zoom;
  return { zoom, panX, panY };
}

/** Filters palette components by a case-insensitive search query matching name and description */
export function filterPaletteComponents<T extends { displayName: string; description?: string }>(
  components: T[],
  query: string,
): T[] {
  if (!query || query.trim() === '') return [...components];
  const lowerQuery = query.toLowerCase();
  return components.filter((c) => {
    const nameMatch = c.displayName.toLowerCase().includes(lowerQuery);
    const descMatch = c.description ? c.description.toLowerCase().includes(lowerQuery) : false;
    return nameMatch || descMatch;
  });
}

// ─── MODEL VALIDATORS ───────────────────────────────────────────────────────────

export function validateHoverFeedbackModel(
  model: HoverFeedbackModel,
  warnPrefix = '[SimulatorUX]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_HOVER_FEEDBACK', message: 'Hover feedback model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.feedbackId) {
    warnings.push({ code: 'EMPTY_FEEDBACK_ID', message: 'Hover feedback ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.glowIntensity !== 'number' || isNaN(model.glowIntensity) || model.glowIntensity < 0) {
    warnings.push({ code: 'INVALID_GLOW_INTENSITY', message: `Hover feedback "${model.feedbackId}" has invalid glowIntensity.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.targetType === 'string' && model.targetType && !(VALID_HOVER_TARGET_TYPES as readonly string[]).includes(model.targetType)) {
    warnings.push({ code: 'INVALID_TARGET_TYPE', message: `Hover feedback "${model.feedbackId}" has invalid targetType "${model.targetType}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.cursorStyle === 'string' && model.cursorStyle && !(VALID_CURSOR_STYLES as readonly string[]).includes(model.cursorStyle)) {
    warnings.push({ code: 'INVALID_CURSOR_STYLE', message: `Hover feedback "${model.feedbackId}" has invalid cursorStyle "${model.cursorStyle}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.glowRadius !== 'number' || isNaN(model.glowRadius)) {
    warnings.push({ code: 'INVALID_GLOW_RADIUS', message: `Hover feedback "${model.feedbackId}" has invalid glowRadius.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.positionX !== 'number' || isNaN(model.positionX)) {
    warnings.push({ code: 'INVALID_POSITION_X', message: `Hover feedback "${model.feedbackId}" has invalid positionX.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.positionY !== 'number' || isNaN(model.positionY)) {
    warnings.push({ code: 'INVALID_POSITION_Y', message: `Hover feedback "${model.feedbackId}" has invalid positionY.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateHoverStateModel(
  model: HoverStateModel,
  warnPrefix = '[SimulatorUX]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_HOVER_STATE', message: 'Hover state model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.stateId) {
    warnings.push({ code: 'EMPTY_HOVER_STATE_ID', message: 'Hover state ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.hoverStartTimestamp !== 'number' || isNaN(model.hoverStartTimestamp)) {
    warnings.push({ code: 'INVALID_HOVER_TIMESTAMP', message: `Hover state "${model.stateId}" has invalid hoverStartTimestamp.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.hoverDurationMs !== 'number' || isNaN(model.hoverDurationMs) || model.hoverDurationMs < 0) {
    warnings.push({ code: 'INVALID_HOVER_DURATION', message: `Hover state "${model.stateId}" has invalid hoverDurationMs.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateContextMenuItemModel(
  model: ContextMenuItemModel,
  warnPrefix = '[SimulatorUX]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_MENU_ITEM', message: 'Context menu item model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.itemId) {
    warnings.push({ code: 'INVALID_ITEM_ID', message: 'Context menu item ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.label !== 'string' || !model.label) {
    warnings.push({ code: 'EMPTY_MENU_ITEM_LABEL', message: `Context menu item "${model.itemId}" has empty label.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.action === 'string' && model.action && !(VALID_CONTEXT_MENU_ACTIONS as readonly string[]).includes(model.action)) {
    warnings.push({ code: 'INVALID_MENU_ACTION', message: `Context menu item "${model.itemId}" has invalid action "${model.action}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateContextMenuStateModel(
  model: ContextMenuStateModel,
  warnPrefix = '[SimulatorUX]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_CONTEXT_MENU', message: 'Context menu state model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.menuId) {
    warnings.push({ code: 'EMPTY_MENU_ID', message: 'Context menu ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.positionX !== 'number' || isNaN(model.positionX)) {
    warnings.push({ code: 'INVALID_MENU_POSITION_X', message: `Context menu "${model.menuId}" has invalid positionX.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.positionY !== 'number' || isNaN(model.positionY)) {
    warnings.push({ code: 'INVALID_MENU_POSITION_Y', message: `Context menu "${model.menuId}" has invalid positionY.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.items)) {
    warnings.push({ code: 'INVALID_MENU_ITEMS', message: `Context menu "${model.menuId}" has invalid items array.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateSelectionHandleModel(
  model: SelectionHandleModel,
  warnPrefix = '[SimulatorUX]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_HANDLE', message: 'Selection handle model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.handleId) {
    warnings.push({ code: 'INVALID_HANDLE_ID', message: 'Selection handle ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.handleType === 'string' && model.handleType && !(VALID_HANDLE_TYPES as readonly string[]).includes(model.handleType)) {
    warnings.push({ code: 'INVALID_HANDLE_TYPE', message: `Selection handle "${model.handleId}" has invalid handleType "${model.handleType}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.positionX !== 'number' || isNaN(model.positionX)) {
    warnings.push({ code: 'INVALID_HANDLE_POSITION_X', message: `Selection handle "${model.handleId}" has invalid positionX.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.positionY !== 'number' || isNaN(model.positionY)) {
    warnings.push({ code: 'INVALID_HANDLE_POSITION_Y', message: `Selection handle "${model.handleId}" has invalid positionY.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateProfessionalSelectionModel(
  model: ProfessionalSelectionModel,
  warnPrefix = '[SimulatorUX]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_SELECTION', message: 'Professional selection model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.selectionId) {
    warnings.push({ code: 'EMPTY_SELECTION_ID', message: 'Selection ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.selectionMode === 'string' && model.selectionMode && !(VALID_SELECTION_MODES as readonly string[]).includes(model.selectionMode)) {
    warnings.push({ code: 'INVALID_SELECTION_MODE', message: `Selection "${model.selectionId}" has invalid selectionMode "${model.selectionMode}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.selectedObjectIds)) {
    warnings.push({ code: 'INVALID_SELECTED_OBJECT_IDS', message: `Selection "${model.selectionId}" has invalid selectedObjectIds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.boundsX !== 'number' || isNaN(model.boundsX)) {
    warnings.push({ code: 'INVALID_BOUNDS_X', message: `Selection "${model.selectionId}" has invalid boundsX.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.boundsY !== 'number' || isNaN(model.boundsY)) {
    warnings.push({ code: 'INVALID_BOUNDS_Y', message: `Selection "${model.selectionId}" has invalid boundsY.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.boundsWidth !== 'number' || isNaN(model.boundsWidth) || model.boundsWidth < 0) {
    warnings.push({ code: 'INVALID_BOUNDS_WIDTH', message: `Selection "${model.selectionId}" has invalid boundsWidth.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.boundsHeight !== 'number' || isNaN(model.boundsHeight) || model.boundsHeight < 0) {
    warnings.push({ code: 'INVALID_BOUNDS_HEIGHT', message: `Selection "${model.selectionId}" has invalid boundsHeight.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.handles)) {
    warnings.push({ code: 'INVALID_HANDLES_ARRAY', message: `Selection "${model.selectionId}" has invalid handles array.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateWireCreationStateModel(
  model: WireCreationStateModel,
  warnPrefix = '[SimulatorUX]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_WIRE_CREATION', message: 'Wire creation state model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.creationId) {
    warnings.push({ code: 'EMPTY_CREATION_ID', message: 'Wire creation ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.phase === 'string' && model.phase && !(VALID_WIRE_CREATION_PHASES as readonly string[]).includes(model.phase)) {
    warnings.push({ code: 'INVALID_CREATION_PHASE', message: `Wire creation "${model.creationId}" has invalid phase "${model.phase}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.previewPoints)) {
    warnings.push({ code: 'INVALID_PREVIEW_POINTS', message: `Wire creation "${model.creationId}" has invalid previewPoints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.snapDistance !== 'number' || isNaN(model.snapDistance) || model.snapDistance < 0) {
    warnings.push({ code: 'INVALID_SNAP_DISTANCE', message: `Wire creation "${model.creationId}" has invalid snapDistance.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateWireValidationOverlayModel(
  model: WireValidationOverlayModel,
  warnPrefix = '[SimulatorUX]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_OVERLAY', message: 'Wire validation overlay model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.overlayId) {
    warnings.push({ code: 'INVALID_OVERLAY_ID', message: 'Wire validation overlay ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.wireId !== 'string' || !model.wireId) {
    warnings.push({ code: 'INVALID_OVERLAY_WIRE_ID', message: `Wire overlay "${model.overlayId}" has invalid wireId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.status === 'string' && model.status && !(VALID_WIRE_VALIDATION_STATUSES as readonly string[]).includes(model.status)) {
    warnings.push({ code: 'INVALID_OVERLAY_STATUS', message: `Wire overlay "${model.overlayId}" has invalid status "${model.status}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.affectedPinIds)) {
    warnings.push({ code: 'INVALID_AFFECTED_PINS', message: `Wire overlay "${model.overlayId}" has invalid affectedPinIds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateCameraAnimationModel(
  model: CameraAnimationModel,
  warnPrefix = '[SimulatorUX]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_CAMERA_ANIMATION', message: 'Camera animation model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.animationId) {
    warnings.push({ code: 'INVALID_ANIMATION_ID', message: 'Camera animation ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.fromZoom !== 'number' || isNaN(model.fromZoom)) {
    warnings.push({ code: 'INVALID_FROM_ZOOM', message: `Camera animation "${model.animationId}" has invalid fromZoom.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.toZoom !== 'number' || isNaN(model.toZoom)) {
    warnings.push({ code: 'INVALID_TO_ZOOM', message: `Camera animation "${model.animationId}" has invalid toZoom.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.durationMs !== 'number' || isNaN(model.durationMs) || model.durationMs < 0) {
    warnings.push({ code: 'INVALID_DURATION', message: `Camera animation "${model.animationId}" has invalid durationMs.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.elapsedMs !== 'number' || isNaN(model.elapsedMs)) {
    warnings.push({ code: 'INVALID_ELAPSED_MS', message: `Camera animation "${model.animationId}" has invalid elapsedMs.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.progress !== 'number' || isNaN(model.progress)) {
    warnings.push({ code: 'INVALID_PROGRESS', message: `Camera animation "${model.animationId}" has invalid progress.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.easing === 'string' && model.easing && !(VALID_CAMERA_EASINGS as readonly string[]).includes(model.easing)) {
    warnings.push({ code: 'INVALID_EASING', message: `Camera animation "${model.animationId}" has invalid easing "${model.easing}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateMinimapModel(
  model: MinimapModel,
  warnPrefix = '[SimulatorUX]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_MINIMAP', message: 'Minimap model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.minimapId) {
    warnings.push({ code: 'INVALID_MINIMAP_ID', message: 'Minimap ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.boundsWidth !== 'number' || isNaN(model.boundsWidth) || model.boundsWidth <= 0) {
    warnings.push({ code: 'INVALID_MINIMAP_BOUNDS_WIDTH', message: `Minimap "${model.minimapId}" has invalid boundsWidth.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.boundsHeight !== 'number' || isNaN(model.boundsHeight) || model.boundsHeight <= 0) {
    warnings.push({ code: 'INVALID_MINIMAP_BOUNDS_HEIGHT', message: `Minimap "${model.minimapId}" has invalid boundsHeight.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.minimapScale !== 'number' || isNaN(model.minimapScale) || model.minimapScale <= 0) {
    warnings.push({ code: 'INVALID_MINIMAP_SCALE', message: `Minimap "${model.minimapId}" has invalid minimapScale.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.objectPositions)) {
    warnings.push({ code: 'INVALID_MINIMAP_OBJECTS', message: `Minimap "${model.minimapId}" has invalid objectPositions.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validatePaletteDragModel(
  model: PaletteDragModel,
  warnPrefix = '[SimulatorUX]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_PALETTE_DRAG', message: 'Palette drag model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.dragId) {
    warnings.push({ code: 'EMPTY_DRAG_ID', message: 'Palette drag ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.dragStartX !== 'number' || isNaN(model.dragStartX)) {
    warnings.push({ code: 'INVALID_DRAG_START_X', message: `Palette drag "${model.dragId}" has invalid dragStartX.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.dragStartY !== 'number' || isNaN(model.dragStartY)) {
    warnings.push({ code: 'INVALID_DRAG_START_Y', message: `Palette drag "${model.dragId}" has invalid dragStartY.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.currentX !== 'number' || isNaN(model.currentX)) {
    warnings.push({ code: 'INVALID_CURRENT_X', message: `Palette drag "${model.dragId}" has invalid currentX.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.currentY !== 'number' || isNaN(model.currentY)) {
    warnings.push({ code: 'INVALID_CURRENT_Y', message: `Palette drag "${model.dragId}" has invalid currentY.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validatePaletteFilterModel(
  model: PaletteFilterModel,
  warnPrefix = '[SimulatorUX]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_PALETTE_FILTER', message: 'Palette filter model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.filterId) {
    warnings.push({ code: 'INVALID_FILTER_ID', message: 'Palette filter ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.activeCategory !== 'string') {
    warnings.push({ code: 'INVALID_ACTIVE_CATEGORY', message: `Palette filter "${model.filterId}" has invalid activeCategory.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.totalResults !== 'number' || isNaN(model.totalResults) || model.totalResults < 0) {
    warnings.push({ code: 'INVALID_TOTAL_RESULTS', message: `Palette filter "${model.filterId}" has invalid totalResults.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.matchedComponentIds)) {
    warnings.push({ code: 'INVALID_MATCHED_IDS', message: `Palette filter "${model.filterId}" has invalid matchedComponentIds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validatePerformanceMetricsModel(
  model: PerformanceMetricsModel,
  warnPrefix = '[SimulatorUX]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_PERFORMANCE_METRICS', message: 'Performance metrics model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.metricsId) {
    warnings.push({ code: 'INVALID_METRICS_ID', message: 'Performance metrics ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.fps !== 'number' || isNaN(model.fps) || model.fps < 0) {
    warnings.push({ code: 'INVALID_FPS', message: `Performance metrics "${model.metricsId}" has invalid fps.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.frameTimeMs !== 'number' || isNaN(model.frameTimeMs) || model.frameTimeMs < 0) {
    warnings.push({ code: 'INVALID_FRAME_TIME', message: `Performance metrics "${model.metricsId}" has invalid frameTimeMs.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.averageFrameTimeMs !== 'number' || isNaN(model.averageFrameTimeMs)) {
    warnings.push({ code: 'INVALID_AVG_FRAME_TIME', message: `Performance metrics "${model.metricsId}" has invalid averageFrameTimeMs.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.frameHistory)) {
    warnings.push({ code: 'INVALID_FRAME_HISTORY', message: `Performance metrics "${model.metricsId}" has invalid frameHistory.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.maxFrameHistoryLength !== 'number' || isNaN(model.maxFrameHistoryLength) || model.maxFrameHistoryLength <= 0) {
    warnings.push({ code: 'INVALID_MAX_HISTORY', message: `Performance metrics "${model.metricsId}" has invalid maxFrameHistoryLength.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateWorkspaceThemeConfigModel(
  model: WorkspaceThemeConfigModel,
  warnPrefix = '[SimulatorUX]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_THEME', message: 'Workspace theme config model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.themeId) {
    warnings.push({ code: 'INVALID_THEME_ID', message: 'Workspace theme ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.themeName !== 'string' || !model.themeName) {
    warnings.push({ code: 'EMPTY_THEME_NAME', message: `Theme "${model.themeId}" has empty themeName.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.gridOpacity !== 'number' || isNaN(model.gridOpacity) || model.gridOpacity < 0 || model.gridOpacity > 1) {
    warnings.push({ code: 'INVALID_GRID_OPACITY', message: `Theme "${model.themeId}" has invalid gridOpacity (must be 0..1).` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.selectionOpacity !== 'number' || isNaN(model.selectionOpacity)) {
    warnings.push({ code: 'INVALID_SELECTION_OPACITY', message: `Theme "${model.themeId}" has invalid selectionOpacity.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.hoverGlowIntensity !== 'number' || isNaN(model.hoverGlowIntensity)) {
    warnings.push({ code: 'INVALID_HOVER_GLOW_INTENSITY', message: `Theme "${model.themeId}" has invalid hoverGlowIntensity.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.wirePreviewOpacity !== 'number' || isNaN(model.wirePreviewOpacity)) {
    warnings.push({ code: 'INVALID_WIRE_PREVIEW_OPACITY', message: `Theme "${model.themeId}" has invalid wirePreviewOpacity.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

// ─── DUPLICATE VALIDATORS ───────────────────────────────────────────────────────

export function validateDuplicateHoverFeedbackIds(models: HoverFeedbackModel[], warnPrefix = '[SimulatorUX]'): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.feedbackId)) {
      warnings.push({ code: 'DUPLICATE_FEEDBACK_ID', message: `Duplicate hover feedback ID "${m.feedbackId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.feedbackId);
  }
  return warnings;
}

export function validateDuplicateHoverStateIds(models: HoverStateModel[], warnPrefix = '[SimulatorUX]'): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.stateId)) {
      warnings.push({ code: 'DUPLICATE_HOVER_STATE_ID', message: `Duplicate hover state ID "${m.stateId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.stateId);
  }
  return warnings;
}

export function validateDuplicateContextMenuItemIds(models: ContextMenuItemModel[], warnPrefix = '[SimulatorUX]'): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.itemId)) {
      warnings.push({ code: 'DUPLICATE_CONTEXT_ITEM_ID', message: `Duplicate context menu item ID "${m.itemId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.itemId);
  }
  return warnings;
}

export function validateDuplicateContextMenuStateIds(models: ContextMenuStateModel[], warnPrefix = '[SimulatorUX]'): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.menuId)) {
      warnings.push({ code: 'DUPLICATE_MENU_ID', message: `Duplicate context menu ID "${m.menuId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.menuId);
  }
  return warnings;
}

export function validateDuplicateSelectionHandleIds(models: SelectionHandleModel[], warnPrefix = '[SimulatorUX]'): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.handleId)) {
      warnings.push({ code: 'DUPLICATE_HANDLE_ID', message: `Duplicate selection handle ID "${m.handleId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.handleId);
  }
  return warnings;
}

export function validateDuplicateProfessionalSelectionIds(models: ProfessionalSelectionModel[], warnPrefix = '[SimulatorUX]'): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.selectionId)) {
      warnings.push({ code: 'DUPLICATE_SELECTION_ID', message: `Duplicate professional selection ID "${m.selectionId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.selectionId);
  }
  return warnings;
}

export function validateDuplicateWireCreationStateIds(models: WireCreationStateModel[], warnPrefix = '[SimulatorUX]'): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.creationId)) {
      warnings.push({ code: 'DUPLICATE_WIRE_CREATION_ID', message: `Duplicate wire creation ID "${m.creationId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.creationId);
  }
  return warnings;
}

export function validateDuplicateWireValidationOverlayIds(models: WireValidationOverlayModel[], warnPrefix = '[SimulatorUX]'): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.overlayId)) {
      warnings.push({ code: 'DUPLICATE_WIRE_OVERLAY_ID', message: `Duplicate wire validation overlay ID "${m.overlayId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.overlayId);
  }
  return warnings;
}

export function validateDuplicateCameraAnimationIds(models: CameraAnimationModel[], warnPrefix = '[SimulatorUX]'): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.animationId)) {
      warnings.push({ code: 'DUPLICATE_CAMERA_ANIMATION_ID', message: `Duplicate camera animation ID "${m.animationId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.animationId);
  }
  return warnings;
}

export function validateDuplicateMinimapIds(models: MinimapModel[], warnPrefix = '[SimulatorUX]'): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.minimapId)) {
      warnings.push({ code: 'DUPLICATE_MINIMAP_ID', message: `Duplicate minimap ID "${m.minimapId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.minimapId);
  }
  return warnings;
}

export function validateDuplicatePaletteDragIds(models: PaletteDragModel[], warnPrefix = '[SimulatorUX]'): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.dragId)) {
      warnings.push({ code: 'DUPLICATE_DRAG_ID', message: `Duplicate palette drag ID "${m.dragId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.dragId);
  }
  return warnings;
}

export function validateDuplicatePaletteFilterIds(models: PaletteFilterModel[], warnPrefix = '[SimulatorUX]'): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.filterId)) {
      warnings.push({ code: 'DUPLICATE_FILTER_ID', message: `Duplicate palette filter ID "${m.filterId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.filterId);
  }
  return warnings;
}

export function validateDuplicatePerformanceMetricsIds(models: PerformanceMetricsModel[], warnPrefix = '[SimulatorUX]'): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.metricsId)) {
      warnings.push({ code: 'DUPLICATE_METRICS_ID', message: `Duplicate performance metrics ID "${m.metricsId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.metricsId);
  }
  return warnings;
}

export function validateDuplicateWorkspaceThemeConfigIds(models: WorkspaceThemeConfigModel[], warnPrefix = '[SimulatorUX]'): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.themeId)) {
      warnings.push({ code: 'DUPLICATE_THEME_ID', message: `Duplicate workspace theme ID "${m.themeId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.themeId);
  }
  return warnings;
}

// ─── DOMAIN LOGIC FUNCTIONS ─────────────────────────────────────────────────────

// Wire creation workflow

export function startWireCreation(sourcePin: string, sourceComponent: string): WireCreationStateModel {
  const id = `wire_create_${Date.now()}`;
  return createDefaultWireCreationStateModel(id, {
    phase: 'SOURCE_SELECTED',
    sourcePinId: sourcePin,
    sourceComponentId: sourceComponent,
    previewPoints: [],
  });
}

export function updateWirePreview(state: WireCreationStateModel, mouseX: number, mouseY: number): WireCreationStateModel {
  return {
    ...state,
    phase: 'ROUTING',
    previewPoints: [...state.previewPoints, { x: mouseX, y: mouseY }],
  };
}

export function completeWire(state: WireCreationStateModel, targetPin: string, targetComponent: string): WireCreationStateModel {
  return {
    ...state,
    phase: 'COMPLETING',
    targetPinId: targetPin,
    targetComponentId: targetComponent,
    isValidTarget: true,
  };
}

export function cancelWire(state: WireCreationStateModel): WireCreationStateModel {
  return {
    ...state,
    phase: 'CANCELLED',
    targetPinId: '',
    targetComponentId: '',
    previewPoints: [],
    isValidTarget: false,
    snapTargetPinId: '',
  };
}

// Hover feedback

export function updateHoverFeedback(targetId: string, targetType: HoverTargetType): HoverFeedbackModel {
  const cursorMap: Record<HoverTargetType, HoverCursorStyle> = {
    'COMPONENT': 'grab',
    'PIN': 'crosshair',
    'WIRE': 'pointer',
    'BREADBOARD_HOLE': 'crosshair',
    'BREADBOARD': 'default',
    'NONE': 'default',
  };
  return createDefaultHoverFeedbackModel(`hover_${targetId}`, {
    hoveredObjectId: targetId,
    targetType,
    cursorStyle: cursorMap[targetType],
    isActive: true,
  });
}

export function clearHoverFeedback(): HoverFeedbackModel {
  return createDefaultHoverFeedbackModel('hover_cleared', {
    hoveredObjectId: '',
    targetType: 'NONE',
    cursorStyle: 'default',
    isActive: false,
  });
}

// Context menu

export function buildContextMenuItems(targetType: HoverTargetType): ContextMenuItemModel[] {
  const items: ContextMenuItemModel[] = [];
  let counter = 0;

  const addItem = (action: ContextMenuAction, label: string, icon: string, shortcut: string, dividerAfter = false): void => {
    items.push(createDefaultContextMenuItemModel(`ctx_${counter++}`, {
      action,
      label,
      icon,
      shortcut,
      enabled: true,
      dividerAfter,
    }));
  };

  if (targetType === 'COMPONENT') {
    addItem('DUPLICATE', 'Duplicate', 'copy', 'Ctrl+D');
    addItem('DELETE', 'Delete', 'trash', 'Del', true);
    addItem('ROTATE_CW', 'Rotate Clockwise', 'rotate-cw', 'R');
    addItem('ROTATE_CCW', 'Rotate Counter-Clockwise', 'rotate-ccw', 'Shift+R', true);
    addItem('BRING_FORWARD', 'Bring Forward', 'layer-up', '');
    addItem('SEND_BACKWARD', 'Send Backward', 'layer-down', '', true);
    addItem('INSPECT', 'Inspect', 'info', 'I');
    addItem('FOCUS_CAMERA', 'Focus Camera', 'crosshair', 'F');
  } else if (targetType === 'WIRE') {
    addItem('DELETE', 'Delete Wire', 'trash', 'Del', true);
    addItem('DISCONNECT', 'Disconnect', 'unlink', '');
    addItem('INSPECT', 'Inspect', 'info', 'I');
  } else if (targetType === 'PIN') {
    addItem('INSPECT', 'Inspect Pin', 'info', 'I');
    addItem('FOCUS_CAMERA', 'Focus Camera', 'crosshair', 'F');
  }
  // BREADBOARD, NONE, and other types return empty menu

  return items;
}

export function showContextMenu(x: number, y: number, targetId: string, targetType: HoverTargetType): ContextMenuStateModel {
  return createDefaultContextMenuStateModel(`menu_${Date.now()}`, {
    visible: true,
    positionX: x,
    positionY: y,
    targetObjectId: targetId,
    targetObjectType: targetType,
    items: buildContextMenuItems(targetType),
  });
}

export function hideContextMenu(state: ContextMenuStateModel): ContextMenuStateModel {
  return {
    ...state,
    visible: false,
    items: [],
  };
}

// Selection

export function startBoxSelection(x: number, y: number): ProfessionalSelectionModel {
  return createDefaultProfessionalSelectionModel(`selection_${Date.now()}`, {
    selectionMode: 'BOX',
    isBoxSelecting: true,
    boxStartX: x,
    boxStartY: y,
    boxEndX: x,
    boxEndY: y,
    selectedObjectIds: [],
  });
}

export function updateBoxSelection(state: ProfessionalSelectionModel, x: number, y: number): ProfessionalSelectionModel {
  const minX = Math.min(state.boxStartX, x);
  const minY = Math.min(state.boxStartY, y);
  const maxX = Math.max(state.boxStartX, x);
  const maxY = Math.max(state.boxStartY, y);
  return {
    ...state,
    boxEndX: x,
    boxEndY: y,
    boundsX: minX,
    boundsY: minY,
    boundsWidth: maxX - minX,
    boundsHeight: maxY - minY,
  };
}

export function completeBoxSelection(state: ProfessionalSelectionModel): ProfessionalSelectionModel {
  return {
    ...state,
    isBoxSelecting: false,
    selectionMode: state.selectedObjectIds.length > 1 ? 'MULTI' : 'SINGLE',
  };
}

export function toggleShiftSelect(state: ProfessionalSelectionModel, objectId: string): ProfessionalSelectionModel {
  const existing = [...state.selectedObjectIds];
  const idx = existing.indexOf(objectId);
  if (idx !== -1) {
    existing.splice(idx, 1);
  } else {
    existing.push(objectId);
  }
  return {
    ...state,
    selectionMode: 'SHIFT',
    selectedObjectIds: existing,
  };
}

// Camera

export function animateCamera(
  fromZoom: number,
  fromPanX: number,
  fromPanY: number,
  toZoom: number,
  toPanX: number,
  toPanY: number,
  durationMs: number,
): CameraAnimationModel {
  return createDefaultCameraAnimationModel(`cam_anim_${Date.now()}`, {
    fromZoom,
    toZoom,
    fromPanX,
    fromPanY,
    toPanX,
    toPanY,
    durationMs,
    elapsedMs: 0,
    progress: 0,
    isComplete: false,
    navigationMode: 'ZOOMING',
  });
}

export function tickCameraAnimation(animation: CameraAnimationModel, deltaMs: number): CameraAnimationModel {
  const newElapsed = Math.min(animation.elapsedMs + deltaMs, animation.durationMs);
  const rawProgress = animation.durationMs > 0 ? newElapsed / animation.durationMs : 1;
  const easedProgress = applyCameraEasing(rawProgress, animation.easing);
  return {
    ...animation,
    elapsedMs: newElapsed,
    progress: easedProgress,
    isComplete: newElapsed >= animation.durationMs,
  };
}

export function applyCameraEasing(progress: number, easing: CameraEasing): number {
  const t = Math.max(0, Math.min(1, progress));
  switch (easing) {
    case 'LINEAR':
      return t;
    case 'EASE_IN':
      return t * t;
    case 'EASE_OUT':
      return t * (2 - t);
    case 'EASE_IN_OUT':
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    default:
      return t;
  }
}

// Performance

export function updateSimulatorPerformanceMetrics(
  model: PerformanceMetricsModel,
  fps: number,
  frameTimeMs: number,
): PerformanceMetricsModel {
  const history = [...model.frameHistory, frameTimeMs];
  if (history.length > model.maxFrameHistoryLength) {
    history.splice(0, history.length - model.maxFrameHistoryLength);
  }
  const sum = history.reduce((a, b) => a + b, 0);
  const avgFrameTime = history.length > 0 ? sum / history.length : frameTimeMs;
  return {
    ...model,
    fps,
    frameTimeMs,
    averageFrameTimeMs: avgFrameTime,
    frameHistory: history,
    lastUpdatedAt: Date.now(),
  };
}

// ─── SYNCHRONIZER CLASS ─────────────────────────────────────────────────────────

export class SimulatorUXSynchronizer {
  private readonly hoverFeedbackRegistry = new RenderRegistry<HoverFeedbackModel>();
  private readonly hoverStateRegistry = new RenderRegistry<HoverStateModel>();
  private readonly contextMenuItemRegistry = new RenderRegistry<ContextMenuItemModel>();
  private readonly contextMenuStateRegistry = new RenderRegistry<ContextMenuStateModel>();
  private readonly selectionHandleRegistry = new RenderRegistry<SelectionHandleModel>();
  private readonly professionalSelectionRegistry = new RenderRegistry<ProfessionalSelectionModel>();
  private readonly wireCreationStateRegistry = new RenderRegistry<WireCreationStateModel>();
  private readonly wireValidationOverlayRegistry = new RenderRegistry<WireValidationOverlayModel>();
  private readonly cameraAnimationRegistry = new RenderRegistry<CameraAnimationModel>();
  private readonly minimapRegistry = new RenderRegistry<MinimapModel>();
  private readonly paletteDragRegistry = new RenderRegistry<PaletteDragModel>();
  private readonly paletteFilterRegistry = new RenderRegistry<PaletteFilterModel>();
  private readonly performanceMetricsRegistry = new RenderRegistry<PerformanceMetricsModel>();
  private readonly workspaceThemeConfigRegistry = new RenderRegistry<WorkspaceThemeConfigModel>();

  private readonly warnPrefix = '[SimulatorUXSynchronizer]';

  // ── HoverFeedbackModel CRUD ──

  public registerHoverFeedback(idOrModel: string | HoverFeedbackModel, model?: HoverFeedbackModel): void {
    const m = typeof idOrModel === 'string' ? model! : idOrModel;
    validateHoverFeedbackModel(m, this.warnPrefix);
    this.hoverFeedbackRegistry.register(m.feedbackId, m, this.warnPrefix);
  }

  public getHoverFeedback(feedbackId: string): HoverFeedbackModel | undefined {
    return this.hoverFeedbackRegistry.lookup(feedbackId);
  }

  public getAllHoverFeedbacks(): HoverFeedbackModel[] {
    return this.hoverFeedbackRegistry.getAll();
  }

  public updateHoverFeedbackModel(feedbackId: string, partial: Partial<HoverFeedbackModel>): void {
    this.hoverFeedbackRegistry.update(feedbackId, partial, this.warnPrefix);
  }

  /** Alias for updateHoverFeedbackModel — backward compatibility */
  public updateHoverFeedback(feedbackId: string, partial: Partial<HoverFeedbackModel>): void {
    this.updateHoverFeedbackModel(feedbackId, partial);
  }

  public removeHoverFeedback(feedbackId: string): void {
    this.hoverFeedbackRegistry.remove(feedbackId, this.warnPrefix);
  }

  public clearHoverFeedbacks(): void {
    this.hoverFeedbackRegistry.clear();
  }

  public getHoverFeedbackKeys(): string[] {
    return this.hoverFeedbackRegistry.keys();
  }

  public hasHoverFeedback(feedbackId: string): boolean {
    return this.hoverFeedbackRegistry.has(feedbackId);
  }

  // ── HoverStateModel CRUD ──

  public registerHoverState(idOrModel: string | HoverStateModel, model?: HoverStateModel): void {
    const m = typeof idOrModel === 'string' ? model! : idOrModel;
    validateHoverStateModel(m, this.warnPrefix);
    this.hoverStateRegistry.register(m.stateId, m, this.warnPrefix);
  }

  public getHoverState(stateId: string): HoverStateModel | undefined {
    return this.hoverStateRegistry.lookup(stateId);
  }

  public getAllHoverStates(): HoverStateModel[] {
    return this.hoverStateRegistry.getAll();
  }

  public updateHoverStateModel(stateId: string, partial: Partial<HoverStateModel>): void {
    this.hoverStateRegistry.update(stateId, partial, this.warnPrefix);
  }

  public removeHoverState(stateId: string): void {
    this.hoverStateRegistry.remove(stateId, this.warnPrefix);
  }

  public clearHoverStates(): void {
    this.hoverStateRegistry.clear();
  }

  public getHoverStateKeys(): string[] {
    return this.hoverStateRegistry.keys();
  }

  public hasHoverState(stateId: string): boolean {
    return this.hoverStateRegistry.has(stateId);
  }

  // ── ContextMenuItemModel CRUD ──

  public registerContextMenuItem(idOrModel: string | ContextMenuItemModel, model?: ContextMenuItemModel): void {
    const m = typeof idOrModel === 'string' ? model! : idOrModel;
    validateContextMenuItemModel(m, this.warnPrefix);
    this.contextMenuItemRegistry.register(m.itemId, m, this.warnPrefix);
  }

  public getContextMenuItem(itemId: string): ContextMenuItemModel | undefined {
    return this.contextMenuItemRegistry.lookup(itemId);
  }

  public getAllContextMenuItems(): ContextMenuItemModel[] {
    return this.contextMenuItemRegistry.getAll();
  }

  public updateContextMenuItem(itemId: string, partial: Partial<ContextMenuItemModel>): void {
    this.contextMenuItemRegistry.update(itemId, partial, this.warnPrefix);
  }

  public removeContextMenuItem(itemId: string): void {
    this.contextMenuItemRegistry.remove(itemId, this.warnPrefix);
  }

  public clearContextMenuItems(): void {
    this.contextMenuItemRegistry.clear();
  }

  public getContextMenuItemKeys(): string[] {
    return this.contextMenuItemRegistry.keys();
  }

  public hasContextMenuItem(itemId: string): boolean {
    return this.contextMenuItemRegistry.has(itemId);
  }

  // ── ContextMenuStateModel CRUD ──

  public registerContextMenuState(idOrModel: string | ContextMenuStateModel, model?: ContextMenuStateModel): void {
    const m = typeof idOrModel === 'string' ? model! : idOrModel;
    validateContextMenuStateModel(m, this.warnPrefix);
    this.contextMenuStateRegistry.register(m.menuId, m, this.warnPrefix);
  }

  public getContextMenuState(menuId: string): ContextMenuStateModel | undefined {
    return this.contextMenuStateRegistry.lookup(menuId);
  }

  public getAllContextMenuStates(): ContextMenuStateModel[] {
    return this.contextMenuStateRegistry.getAll();
  }

  public updateContextMenuState(menuId: string, partial: Partial<ContextMenuStateModel>): void {
    this.contextMenuStateRegistry.update(menuId, partial, this.warnPrefix);
  }

  public removeContextMenuState(menuId: string): void {
    this.contextMenuStateRegistry.remove(menuId, this.warnPrefix);
  }

  public clearContextMenuStates(): void {
    this.contextMenuStateRegistry.clear();
  }

  public getContextMenuStateKeys(): string[] {
    return this.contextMenuStateRegistry.keys();
  }

  public hasContextMenuState(menuId: string): boolean {
    return this.contextMenuStateRegistry.has(menuId);
  }

  // ── SelectionHandleModel CRUD ──

  public registerSelectionHandle(idOrModel: string | SelectionHandleModel, model?: SelectionHandleModel): void {
    const m = typeof idOrModel === 'string' ? model! : idOrModel;
    validateSelectionHandleModel(m, this.warnPrefix);
    this.selectionHandleRegistry.register(m.handleId, m, this.warnPrefix);
  }

  public getSelectionHandle(handleId: string): SelectionHandleModel | undefined {
    return this.selectionHandleRegistry.lookup(handleId);
  }

  public getAllSelectionHandles(): SelectionHandleModel[] {
    return this.selectionHandleRegistry.getAll();
  }

  public updateSelectionHandle(handleId: string, partial: Partial<SelectionHandleModel>): void {
    this.selectionHandleRegistry.update(handleId, partial, this.warnPrefix);
  }

  public removeSelectionHandle(handleId: string): void {
    this.selectionHandleRegistry.remove(handleId, this.warnPrefix);
  }

  public clearSelectionHandles(): void {
    this.selectionHandleRegistry.clear();
  }

  public getSelectionHandleKeys(): string[] {
    return this.selectionHandleRegistry.keys();
  }

  public hasSelectionHandle(handleId: string): boolean {
    return this.selectionHandleRegistry.has(handleId);
  }

  // ── ProfessionalSelectionModel CRUD ──

  public registerProfessionalSelection(idOrModel: string | ProfessionalSelectionModel, model?: ProfessionalSelectionModel): void {
    const m = typeof idOrModel === 'string' ? model! : idOrModel;
    validateProfessionalSelectionModel(m, this.warnPrefix);
    this.professionalSelectionRegistry.register(m.selectionId, m, this.warnPrefix);
  }

  public getProfessionalSelection(selectionId: string): ProfessionalSelectionModel | undefined {
    return this.professionalSelectionRegistry.lookup(selectionId);
  }

  public getAllProfessionalSelections(): ProfessionalSelectionModel[] {
    return this.professionalSelectionRegistry.getAll();
  }

  public updateProfessionalSelection(selectionId: string, partial: Partial<ProfessionalSelectionModel>): void {
    this.professionalSelectionRegistry.update(selectionId, partial, this.warnPrefix);
  }

  public removeProfessionalSelection(selectionId: string): void {
    this.professionalSelectionRegistry.remove(selectionId, this.warnPrefix);
  }

  public clearProfessionalSelections(): void {
    this.professionalSelectionRegistry.clear();
  }

  public getProfessionalSelectionKeys(): string[] {
    return this.professionalSelectionRegistry.keys();
  }

  public hasProfessionalSelection(selectionId: string): boolean {
    return this.professionalSelectionRegistry.has(selectionId);
  }

  // ── WireCreationStateModel CRUD ──

  public registerWireCreationState(idOrModel: string | WireCreationStateModel, model?: WireCreationStateModel): void {
    const m = typeof idOrModel === 'string' ? model! : idOrModel;
    validateWireCreationStateModel(m, this.warnPrefix);
    this.wireCreationStateRegistry.register(m.creationId, m, this.warnPrefix);
  }

  public getWireCreationState(creationId: string): WireCreationStateModel | undefined {
    return this.wireCreationStateRegistry.lookup(creationId);
  }

  public getAllWireCreationStates(): WireCreationStateModel[] {
    return this.wireCreationStateRegistry.getAll();
  }

  public updateWireCreationState(creationId: string, partial: Partial<WireCreationStateModel>): void {
    this.wireCreationStateRegistry.update(creationId, partial, this.warnPrefix);
  }

  public removeWireCreationState(creationId: string): void {
    this.wireCreationStateRegistry.remove(creationId, this.warnPrefix);
  }

  public clearWireCreationStates(): void {
    this.wireCreationStateRegistry.clear();
  }

  public getWireCreationStateKeys(): string[] {
    return this.wireCreationStateRegistry.keys();
  }

  public hasWireCreationState(creationId: string): boolean {
    return this.wireCreationStateRegistry.has(creationId);
  }

  // ── WireValidationOverlayModel CRUD ──

  public registerWireValidationOverlay(idOrModel: string | WireValidationOverlayModel, model?: WireValidationOverlayModel): void {
    const m = typeof idOrModel === 'string' ? model! : idOrModel;
    validateWireValidationOverlayModel(m, this.warnPrefix);
    this.wireValidationOverlayRegistry.register(m.overlayId, m, this.warnPrefix);
  }

  public getWireValidationOverlay(overlayId: string): WireValidationOverlayModel | undefined {
    return this.wireValidationOverlayRegistry.lookup(overlayId);
  }

  public getAllWireValidationOverlays(): WireValidationOverlayModel[] {
    return this.wireValidationOverlayRegistry.getAll();
  }

  public updateWireValidationOverlay(overlayId: string, partial: Partial<WireValidationOverlayModel>): void {
    this.wireValidationOverlayRegistry.update(overlayId, partial, this.warnPrefix);
  }

  public removeWireValidationOverlay(overlayId: string): void {
    this.wireValidationOverlayRegistry.remove(overlayId, this.warnPrefix);
  }

  public clearWireValidationOverlays(): void {
    this.wireValidationOverlayRegistry.clear();
  }

  public getWireValidationOverlayKeys(): string[] {
    return this.wireValidationOverlayRegistry.keys();
  }

  public hasWireValidationOverlay(overlayId: string): boolean {
    return this.wireValidationOverlayRegistry.has(overlayId);
  }

  // ── CameraAnimationModel CRUD ──

  public registerCameraAnimation(idOrModel: string | CameraAnimationModel, model?: CameraAnimationModel): void {
    const m = typeof idOrModel === 'string' ? model! : idOrModel;
    validateCameraAnimationModel(m, this.warnPrefix);
    this.cameraAnimationRegistry.register(m.animationId, m, this.warnPrefix);
  }

  public getCameraAnimation(animationId: string): CameraAnimationModel | undefined {
    return this.cameraAnimationRegistry.lookup(animationId);
  }

  public getAllCameraAnimations(): CameraAnimationModel[] {
    return this.cameraAnimationRegistry.getAll();
  }

  public updateCameraAnimation(animationId: string, partial: Partial<CameraAnimationModel>): void {
    this.cameraAnimationRegistry.update(animationId, partial, this.warnPrefix);
  }

  public removeCameraAnimation(animationId: string): void {
    this.cameraAnimationRegistry.remove(animationId, this.warnPrefix);
  }

  public clearCameraAnimations(): void {
    this.cameraAnimationRegistry.clear();
  }

  public getCameraAnimationKeys(): string[] {
    return this.cameraAnimationRegistry.keys();
  }

  public hasCameraAnimation(animationId: string): boolean {
    return this.cameraAnimationRegistry.has(animationId);
  }

  // ── MinimapModel CRUD ──

  public registerMinimap(idOrModel: string | MinimapModel, model?: MinimapModel): void {
    const m = typeof idOrModel === 'string' ? model! : idOrModel;
    validateMinimapModel(m, this.warnPrefix);
    this.minimapRegistry.register(m.minimapId, m, this.warnPrefix);
  }

  public getMinimap(minimapId: string): MinimapModel | undefined {
    return this.minimapRegistry.lookup(minimapId);
  }

  public getAllMinimaps(): MinimapModel[] {
    return this.minimapRegistry.getAll();
  }

  public updateMinimap(minimapId: string, partial: Partial<MinimapModel>): void {
    this.minimapRegistry.update(minimapId, partial, this.warnPrefix);
  }

  public removeMinimap(minimapId: string): void {
    this.minimapRegistry.remove(minimapId, this.warnPrefix);
  }

  public clearMinimaps(): void {
    this.minimapRegistry.clear();
  }

  public getMinimapKeys(): string[] {
    return this.minimapRegistry.keys();
  }

  public hasMinimap(minimapId: string): boolean {
    return this.minimapRegistry.has(minimapId);
  }

  // ── PaletteDragModel CRUD ──

  public registerPaletteDrag(idOrModel: string | PaletteDragModel, model?: PaletteDragModel): void {
    const m = typeof idOrModel === 'string' ? model! : idOrModel;
    validatePaletteDragModel(m, this.warnPrefix);
    this.paletteDragRegistry.register(m.dragId, m, this.warnPrefix);
  }

  public getPaletteDrag(dragId: string): PaletteDragModel | undefined {
    return this.paletteDragRegistry.lookup(dragId);
  }

  public getAllPaletteDrags(): PaletteDragModel[] {
    return this.paletteDragRegistry.getAll();
  }

  public updatePaletteDrag(dragId: string, partial: Partial<PaletteDragModel>): void {
    this.paletteDragRegistry.update(dragId, partial, this.warnPrefix);
  }

  public removePaletteDrag(dragId: string): void {
    this.paletteDragRegistry.remove(dragId, this.warnPrefix);
  }

  public clearPaletteDrags(): void {
    this.paletteDragRegistry.clear();
  }

  public getPaletteDragKeys(): string[] {
    return this.paletteDragRegistry.keys();
  }

  public hasPaletteDrag(dragId: string): boolean {
    return this.paletteDragRegistry.has(dragId);
  }

  // ── PaletteFilterModel CRUD ──

  public registerPaletteFilter(idOrModel: string | PaletteFilterModel, model?: PaletteFilterModel): void {
    const m = typeof idOrModel === 'string' ? model! : idOrModel;
    validatePaletteFilterModel(m, this.warnPrefix);
    this.paletteFilterRegistry.register(m.filterId, m, this.warnPrefix);
  }

  public getPaletteFilter(filterId: string): PaletteFilterModel | undefined {
    return this.paletteFilterRegistry.lookup(filterId);
  }

  public getAllPaletteFilters(): PaletteFilterModel[] {
    return this.paletteFilterRegistry.getAll();
  }

  public updatePaletteFilter(filterId: string, partial: Partial<PaletteFilterModel>): void {
    this.paletteFilterRegistry.update(filterId, partial, this.warnPrefix);
  }

  public removePaletteFilter(filterId: string): void {
    this.paletteFilterRegistry.remove(filterId, this.warnPrefix);
  }

  public clearPaletteFilters(): void {
    this.paletteFilterRegistry.clear();
  }

  public getPaletteFilterKeys(): string[] {
    return this.paletteFilterRegistry.keys();
  }

  public hasPaletteFilter(filterId: string): boolean {
    return this.paletteFilterRegistry.has(filterId);
  }

  // ── PerformanceMetricsModel CRUD ──

  public registerPerformanceMetrics(idOrModel: string | PerformanceMetricsModel, model?: PerformanceMetricsModel): void {
    const m = typeof idOrModel === 'string' ? model! : idOrModel;
    validatePerformanceMetricsModel(m, this.warnPrefix);
    this.performanceMetricsRegistry.register(m.metricsId, m, this.warnPrefix);
  }

  public getPerformanceMetrics(metricsId: string): PerformanceMetricsModel | undefined {
    return this.performanceMetricsRegistry.lookup(metricsId);
  }

  public getAllPerformanceMetrics(): PerformanceMetricsModel[] {
    return this.performanceMetricsRegistry.getAll();
  }

  public updatePerformanceMetricsModel(metricsId: string, partial: Partial<PerformanceMetricsModel>): void {
    this.performanceMetricsRegistry.update(metricsId, partial, this.warnPrefix);
  }

  /** Alias for updatePerformanceMetricsModel — backward compatibility */
  public updatePerformanceMetrics(metricsId: string, partial: Partial<PerformanceMetricsModel>): void {
    this.updatePerformanceMetricsModel(metricsId, partial);
  }

  public removePerformanceMetrics(metricsId: string): void {
    this.performanceMetricsRegistry.remove(metricsId, this.warnPrefix);
  }

  public clearPerformanceMetrics(): void {
    this.performanceMetricsRegistry.clear();
  }

  public getPerformanceMetricsKeys(): string[] {
    return this.performanceMetricsRegistry.keys();
  }

  public hasPerformanceMetrics(metricsId: string): boolean {
    return this.performanceMetricsRegistry.has(metricsId);
  }

  // ── WorkspaceThemeConfigModel CRUD ──

  public registerWorkspaceThemeConfig(idOrModel: string | WorkspaceThemeConfigModel, model?: WorkspaceThemeConfigModel): void {
    const m = typeof idOrModel === 'string' ? model! : idOrModel;
    validateWorkspaceThemeConfigModel(m, this.warnPrefix);
    this.workspaceThemeConfigRegistry.register(m.themeId, m, this.warnPrefix);
  }

  public getWorkspaceThemeConfig(themeId: string): WorkspaceThemeConfigModel | undefined {
    return this.workspaceThemeConfigRegistry.lookup(themeId);
  }

  public getAllWorkspaceThemeConfigs(): WorkspaceThemeConfigModel[] {
    return this.workspaceThemeConfigRegistry.getAll();
  }

  public updateWorkspaceThemeConfig(themeId: string, partial: Partial<WorkspaceThemeConfigModel>): void {
    this.workspaceThemeConfigRegistry.update(themeId, partial, this.warnPrefix);
  }

  public removeWorkspaceThemeConfig(themeId: string): void {
    this.workspaceThemeConfigRegistry.remove(themeId, this.warnPrefix);
  }

  public clearWorkspaceThemeConfigs(): void {
    this.workspaceThemeConfigRegistry.clear();
  }

  public getWorkspaceThemeConfigKeys(): string[] {
    return this.workspaceThemeConfigRegistry.keys();
  }

  public hasWorkspaceThemeConfig(themeId: string): boolean {
    return this.workspaceThemeConfigRegistry.has(themeId);
  }

  // ── Snapshot / Serialization ──

  public buildSnapshot(
    hoverFeedbacks: HoverFeedbackModel[] = [],
    hoverStates: HoverStateModel[] = [],
    contextMenuStates: ContextMenuStateModel[] = [],
    professionalSelections: ProfessionalSelectionModel[] = [],
    wireCreationStates: WireCreationStateModel[] = [],
    wireValidationOverlays: WireValidationOverlayModel[] = [],
    cameraAnimations: CameraAnimationModel[] = [],
    minimapModels: MinimapModel[] = [],
    paletteDragModels: PaletteDragModel[] = [],
    paletteFilterModels: PaletteFilterModel[] = [],
    performanceMetrics: PerformanceMetricsModel[] = [],
    workspaceThemeConfigs: WorkspaceThemeConfigModel[] = [],
  ): SimulatorUXSnapshot {
    validateDuplicateHoverFeedbackIds(hoverFeedbacks, this.warnPrefix);
    validateDuplicateHoverStateIds(hoverStates, this.warnPrefix);
    validateDuplicateContextMenuStateIds(contextMenuStates, this.warnPrefix);
    validateDuplicateProfessionalSelectionIds(professionalSelections, this.warnPrefix);
    validateDuplicateWireCreationStateIds(wireCreationStates, this.warnPrefix);
    validateDuplicateWireValidationOverlayIds(wireValidationOverlays, this.warnPrefix);
    validateDuplicateCameraAnimationIds(cameraAnimations, this.warnPrefix);
    validateDuplicateMinimapIds(minimapModels, this.warnPrefix);
    validateDuplicatePaletteDragIds(paletteDragModels, this.warnPrefix);
    validateDuplicatePaletteFilterIds(paletteFilterModels, this.warnPrefix);
    validateDuplicatePerformanceMetricsIds(performanceMetrics, this.warnPrefix);
    validateDuplicateWorkspaceThemeConfigIds(workspaceThemeConfigs, this.warnPrefix);

    for (const m of hoverFeedbacks) {
      validateHoverFeedbackModel(m, this.warnPrefix);
      this.hoverFeedbackRegistry.register(m.feedbackId, m, this.warnPrefix);
    }
    for (const m of hoverStates) {
      validateHoverStateModel(m, this.warnPrefix);
      this.hoverStateRegistry.register(m.stateId, m, this.warnPrefix);
    }
    for (const m of contextMenuStates) {
      validateContextMenuStateModel(m, this.warnPrefix);
      this.contextMenuStateRegistry.register(m.menuId, m, this.warnPrefix);
    }
    for (const m of professionalSelections) {
      validateProfessionalSelectionModel(m, this.warnPrefix);
      this.professionalSelectionRegistry.register(m.selectionId, m, this.warnPrefix);
    }
    for (const m of wireCreationStates) {
      validateWireCreationStateModel(m, this.warnPrefix);
      this.wireCreationStateRegistry.register(m.creationId, m, this.warnPrefix);
    }
    for (const m of wireValidationOverlays) {
      validateWireValidationOverlayModel(m, this.warnPrefix);
      this.wireValidationOverlayRegistry.register(m.overlayId, m, this.warnPrefix);
    }
    for (const m of cameraAnimations) {
      validateCameraAnimationModel(m, this.warnPrefix);
      this.cameraAnimationRegistry.register(m.animationId, m, this.warnPrefix);
    }
    for (const m of minimapModels) {
      validateMinimapModel(m, this.warnPrefix);
      this.minimapRegistry.register(m.minimapId, m, this.warnPrefix);
    }
    for (const m of paletteDragModels) {
      validatePaletteDragModel(m, this.warnPrefix);
      this.paletteDragRegistry.register(m.dragId, m, this.warnPrefix);
    }
    for (const m of paletteFilterModels) {
      validatePaletteFilterModel(m, this.warnPrefix);
      this.paletteFilterRegistry.register(m.filterId, m, this.warnPrefix);
    }
    for (const m of performanceMetrics) {
      validatePerformanceMetricsModel(m, this.warnPrefix);
      this.performanceMetricsRegistry.register(m.metricsId, m, this.warnPrefix);
    }
    for (const m of workspaceThemeConfigs) {
      validateWorkspaceThemeConfigModel(m, this.warnPrefix);
      this.workspaceThemeConfigRegistry.register(m.themeId, m, this.warnPrefix);
    }

    return this.clone();
  }

  public clear(): void {
    this.hoverFeedbackRegistry.clear();
    this.hoverStateRegistry.clear();
    this.contextMenuItemRegistry.clear();
    this.contextMenuStateRegistry.clear();
    this.selectionHandleRegistry.clear();
    this.professionalSelectionRegistry.clear();
    this.wireCreationStateRegistry.clear();
    this.wireValidationOverlayRegistry.clear();
    this.cameraAnimationRegistry.clear();
    this.minimapRegistry.clear();
    this.paletteDragRegistry.clear();
    this.paletteFilterRegistry.clear();
    this.performanceMetricsRegistry.clear();
    this.workspaceThemeConfigRegistry.clear();
  }

  /** Alias for clear() — backward compatibility with test/consumer code */
  public clearAll(): void {
    this.clear();
  }

  /** Alias for clone() — backward compatibility with test/consumer code */
  public getSnapshot(): SimulatorUXSnapshot {
    return this.clone();
  }

  public clone(): SimulatorUXSnapshot {
    return {
      hoverFeedbacks: safeDeepCopy(this.hoverFeedbackRegistry.getAll()),
      hoverStates: safeDeepCopy(this.hoverStateRegistry.getAll()),
      contextMenuStates: safeDeepCopy(this.contextMenuStateRegistry.getAll()),
      professionalSelections: safeDeepCopy(this.professionalSelectionRegistry.getAll()),
      wireCreationStates: safeDeepCopy(this.wireCreationStateRegistry.getAll()),
      wireValidationOverlays: safeDeepCopy(this.wireValidationOverlayRegistry.getAll()),
      cameraAnimations: safeDeepCopy(this.cameraAnimationRegistry.getAll()),
      minimapModels: safeDeepCopy(this.minimapRegistry.getAll()),
      paletteDragModels: safeDeepCopy(this.paletteDragRegistry.getAll()),
      paletteFilterModels: safeDeepCopy(this.paletteFilterRegistry.getAll()),
      performanceMetrics: safeDeepCopy(this.performanceMetricsRegistry.getAll()),
      workspaceThemeConfigs: safeDeepCopy(this.workspaceThemeConfigRegistry.getAll()),
    };
  }

  public toJSON(): string {
    return JSON.stringify(this.clone());
  }

  public fromJSON(jsonOrObject: string | Partial<SimulatorUXSnapshot>): void {
    try {
      const data: Partial<SimulatorUXSnapshot> = typeof jsonOrObject === 'string'
        ? JSON.parse(jsonOrObject) as Partial<SimulatorUXSnapshot>
        : jsonOrObject;
      this.clear();
      if (data) {
        this.buildSnapshot(
          data.hoverFeedbacks || [],
          data.hoverStates || [],
          data.contextMenuStates || [],
          data.professionalSelections || [],
          data.wireCreationStates || [],
          data.wireValidationOverlays || [],
          data.cameraAnimations || [],
          data.minimapModels || [],
          data.paletteDragModels || [],
          data.paletteFilterModels || [],
          data.performanceMetrics || [],
          data.workspaceThemeConfigs || [],
        );
      }
    } catch (err: any) {
      console.warn(`${this.warnPrefix} failed to parse JSON snapshot: ${err.message}`);
    }
  }
}
