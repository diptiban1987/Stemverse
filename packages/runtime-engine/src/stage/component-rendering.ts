import {
  ComponentRenderModel,
  ComponentBoundsModel,
  ComponentLabelModel,
  ComponentLabelPosition,
  ComponentPinRenderModel,
  ComponentType,
  VisibilityState,
  PinDirection,
  ComponentRenderSnapshot,
} from '../types';

import { RenderRegistry } from './render-registry';
import { ValidationWarning } from './scene-model';

const DEFAULT_COMPONENT_TYPE: ComponentType = 'CUSTOM';
const DEFAULT_VISIBILITY_STATE: VisibilityState = 'VISIBLE';
const DEFAULT_LABEL_POSITION: ComponentLabelPosition = 'TOP';
const DEFAULT_PIN_DIRECTION: PinDirection = 'INPUT';

function safeDeepCopy<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createDefaultComponentRenderModel(
  componentRenderId = 'default_component_render',
  overrides: Partial<ComponentRenderModel> = {},
): ComponentRenderModel {
  return {
    componentRenderId,
    componentId: 'default_component',
    componentType: DEFAULT_COMPONENT_TYPE,
    displayName: `Component Render ${componentRenderId}`,
    renderNodeId: 'default_render_node',
    layerId: 'default_layer',
    visibilityState: DEFAULT_VISIBILITY_STATE,
    selectionState: false,
    focusState: false,
    futureRendererHints: {},
    ...overrides,
  };
}

export function createDefaultComponentBoundsModel(
  componentRenderId = 'default_component_render',
  overrides: Partial<ComponentBoundsModel> = {},
): ComponentBoundsModel {
  return {
    componentRenderId,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    scale: 1,
    anchorPoints: [],
    futureLayoutHints: {},
    ...overrides,
  };
}

export function createDefaultComponentLabelModel(
  labelId = 'default_component_label',
  overrides: Partial<ComponentLabelModel> = {},
): ComponentLabelModel {
  return {
    labelId,
    labelText: `Label ${labelId}`,
    position: DEFAULT_LABEL_POSITION,
    visibility: DEFAULT_VISIBILITY_STATE,
    futureStylingHints: {},
    ...overrides,
  };
}

export function createDefaultComponentPinRenderModel(
  pinRenderId = 'default_pin_render',
  overrides: Partial<ComponentPinRenderModel> = {},
): ComponentPinRenderModel {
  return {
    pinRenderId,
    pinId: 'default_pin',
    pinType: 'GENERIC',
    pinPosition: { x: 0, y: 0 },
    pinDirection: DEFAULT_PIN_DIRECTION,
    futureConnectionHints: {},
    ...overrides,
  };
}

const VALID_COMPONENT_TYPES: ComponentType[] = [
  'LED', 'BUTTON', 'SERVO', 'ULTRASONIC_SENSOR', 'DHT_SENSOR',
  'OLED_DISPLAY', 'LCD_DISPLAY', 'BUZZER', 'ESP32', 'ARDUINO', 'CUSTOM',
];

const VALID_VISIBILITY_STATES: VisibilityState[] = [
  'VISIBLE', 'HIDDEN', 'PARENT_HIDDEN',
];

const VALID_LABEL_POSITIONS: ComponentLabelPosition[] = [
  'TOP', 'BOTTOM', 'LEFT', 'RIGHT', 'CENTER',
];

const VALID_PIN_DIRECTIONS: PinDirection[] = [
  'INPUT', 'OUTPUT', 'BIDIRECTIONAL',
];

export function validateComponentRenderModel(
  model: ComponentRenderModel,
  warnPrefix = '[ComponentRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_COMPONENT_RENDER', message: 'Component render model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.componentRenderId) {
    warnings.push({ code: 'INVALID_COMPONENT_RENDER_ID', message: 'Component render ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.componentId) {
    warnings.push({ code: 'INVALID_COMPONENT_ID', message: `Component render "${model.componentRenderId}" has empty componentId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_COMPONENT_TYPES.includes(model.componentType)) {
    warnings.push({ code: 'INVALID_COMPONENT_TYPE', message: `Component render "${model.componentRenderId}" has invalid componentType "${model.componentType}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.displayName) {
    warnings.push({ code: 'INVALID_DISPLAY_NAME', message: `Component render "${model.componentRenderId}" display name is empty.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.layerId) {
    warnings.push({ code: 'INVALID_LAYER_ID', message: `Component render "${model.componentRenderId}" layer ID is empty.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_VISIBILITY_STATES.includes(model.visibilityState)) {
    warnings.push({ code: 'INVALID_VISIBILITY_STATE', message: `Component render "${model.componentRenderId}" has invalid visibilityState "${model.visibilityState}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.selectionState !== 'boolean') {
    warnings.push({ code: 'INVALID_SELECTION_STATE', message: `Component render "${model.componentRenderId}" selectionState must be a boolean.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.focusState !== 'boolean') {
    warnings.push({ code: 'INVALID_FOCUS_STATE', message: `Component render "${model.componentRenderId}" focusState must be a boolean.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.futureRendererHints !== 'object' || model.futureRendererHints === null || Array.isArray(model.futureRendererHints)) {
    warnings.push({ code: 'INVALID_FUTURE_HINTS', message: `Component render "${model.componentRenderId}" has invalid futureRendererHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateComponentBoundsModel(
  bounds: ComponentBoundsModel,
  warnPrefix = '[ComponentRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!bounds || typeof bounds !== 'object') {
    warnings.push({ code: 'INVALID_COMPONENT_BOUNDS', message: 'Component bounds model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (typeof bounds.x !== 'number' || !Number.isFinite(bounds.x)) {
    warnings.push({ code: 'INVALID_BOUNDS_X', message: `Component bounds x must be a finite number, got ${bounds.x}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof bounds.y !== 'number' || !Number.isFinite(bounds.y)) {
    warnings.push({ code: 'INVALID_BOUNDS_Y', message: `Component bounds y must be a finite number, got ${bounds.y}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof bounds.width !== 'number' || !Number.isFinite(bounds.width) || bounds.width < 0) {
    warnings.push({ code: 'INVALID_BOUNDS_WIDTH', message: `Component bounds width must be a non-negative finite number, got ${bounds.width}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof bounds.height !== 'number' || !Number.isFinite(bounds.height) || bounds.height < 0) {
    warnings.push({ code: 'INVALID_BOUNDS_HEIGHT', message: `Component bounds height must be a non-negative finite number, got ${bounds.height}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof bounds.rotation !== 'number' || !Number.isFinite(bounds.rotation)) {
    warnings.push({ code: 'INVALID_BOUNDS_ROTATION', message: `Component bounds rotation must be a finite number, got ${bounds.rotation}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof bounds.scale !== 'number' || !Number.isFinite(bounds.scale) || bounds.scale <= 0) {
    warnings.push({ code: 'INVALID_BOUNDS_SCALE', message: `Component bounds scale must be a positive finite number, got ${bounds.scale}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(bounds.anchorPoints)) {
    warnings.push({ code: 'INVALID_ANCHOR_POINTS', message: 'Component bounds anchorPoints is not an array.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  } else {
    for (let i = 0; i < bounds.anchorPoints.length; i++) {
      const ap = bounds.anchorPoints[i];
      if (!ap || typeof ap.x !== 'number' || typeof ap.y !== 'number' || typeof ap.anchorId !== 'string') {
        warnings.push({ code: 'INVALID_ANCHOR_POINT', message: `Component bounds anchorPoints[${i}] is malformed.` });
        console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
      }
    }
  }
  if (typeof bounds.futureLayoutHints !== 'object' || bounds.futureLayoutHints === null || Array.isArray(bounds.futureLayoutHints)) {
    warnings.push({ code: 'INVALID_FUTURE_LAYOUT_HINTS', message: 'Component bounds has invalid futureLayoutHints.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateComponentLabelModel(
  label: ComponentLabelModel,
  warnPrefix = '[ComponentRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!label || typeof label !== 'object') {
    warnings.push({ code: 'INVALID_COMPONENT_LABEL', message: 'Component label model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!label.labelId) {
    warnings.push({ code: 'INVALID_LABEL_ID', message: 'Component label ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!label.labelText) {
    warnings.push({ code: 'INVALID_LABEL_TEXT', message: `Component label "${label.labelId}" label text is empty.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_LABEL_POSITIONS.includes(label.position)) {
    warnings.push({ code: 'INVALID_LABEL_POSITION', message: `Component label "${label.labelId}" has invalid position "${label.position}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_VISIBILITY_STATES.includes(label.visibility)) {
    warnings.push({ code: 'INVALID_LABEL_VISIBILITY', message: `Component label "${label.labelId}" has invalid visibility "${label.visibility}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof label.futureStylingHints !== 'object' || label.futureStylingHints === null || Array.isArray(label.futureStylingHints)) {
    warnings.push({ code: 'INVALID_FUTURE_STYLING_HINTS', message: `Component label "${label.labelId}" has invalid futureStylingHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateComponentPinRenderModel(
  pin: ComponentPinRenderModel,
  warnPrefix = '[ComponentRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!pin || typeof pin !== 'object') {
    warnings.push({ code: 'INVALID_COMPONENT_PIN_RENDER', message: 'Component pin render model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!pin.pinRenderId) {
    warnings.push({ code: 'INVALID_PIN_RENDER_ID', message: 'Component pin render ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!pin.pinId) {
    warnings.push({ code: 'INVALID_PIN_ID', message: `Pin render "${pin.pinRenderId}" has empty pinId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!pin.pinType) {
    warnings.push({ code: 'INVALID_PIN_TYPE', message: `Pin render "${pin.pinRenderId}" has empty pinType.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!pin.pinPosition || typeof pin.pinPosition.x !== 'number' || typeof pin.pinPosition.y !== 'number') {
    warnings.push({ code: 'INVALID_PIN_POSITION', message: `Pin render "${pin.pinRenderId}" has invalid pinPosition.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_PIN_DIRECTIONS.includes(pin.pinDirection)) {
    warnings.push({ code: 'INVALID_PIN_DIRECTION', message: `Pin render "${pin.pinRenderId}" has invalid pinDirection "${pin.pinDirection}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof pin.futureConnectionHints !== 'object' || pin.futureConnectionHints === null || Array.isArray(pin.futureConnectionHints)) {
    warnings.push({ code: 'INVALID_FUTURE_CONNECTION_HINTS', message: `Pin render "${pin.pinRenderId}" has invalid futureConnectionHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateDuplicateComponentRenderIds(
  models: ComponentRenderModel[],
  warnPrefix = '[ComponentRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) {
    warnings.push({ code: 'INVALID_MODELS_ARRAY', message: 'Component render models is not an array.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.componentRenderId)) {
      warnings.push({ code: 'DUPLICATE_COMPONENT_RENDER_ID', message: `Duplicate component render ID "${model.componentRenderId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.componentRenderId);
  }
  return warnings;
}

export function validateDuplicateLabelIds(
  labels: ComponentLabelModel[],
  warnPrefix = '[ComponentRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(labels)) return warnings;
  const seen = new Set<string>();
  for (const label of labels) {
    if (seen.has(label.labelId)) {
      warnings.push({ code: 'DUPLICATE_LABEL_ID', message: `Duplicate label ID "${label.labelId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(label.labelId);
  }
  return warnings;
}

export function validateDuplicatePinRenderIds(
  pins: ComponentPinRenderModel[],
  warnPrefix = '[ComponentRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(pins)) return warnings;
  const seen = new Set<string>();
  for (const pin of pins) {
    if (seen.has(pin.pinRenderId)) {
      warnings.push({ code: 'DUPLICATE_PIN_RENDER_ID', message: `Duplicate pin render ID "${pin.pinRenderId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(pin.pinRenderId);
  }
  return warnings;
}

export class ComponentRenderSynchronizer {
  private readonly componentRenderRegistry = new RenderRegistry<ComponentRenderModel>();
  private readonly componentBoundsRegistry = new RenderRegistry<ComponentBoundsModel>();
  private readonly componentLabelRegistry = new RenderRegistry<ComponentLabelModel>();
  private readonly componentPinRenderRegistry = new RenderRegistry<ComponentPinRenderModel>();

  private readonly warnPrefix = '[ComponentRenderSynchronizer]';

  public get componentRenders(): RenderRegistry<ComponentRenderModel> {
    return this.componentRenderRegistry;
  }

  public get componentBounds(): RenderRegistry<ComponentBoundsModel> {
    return this.componentBoundsRegistry;
  }

  public get componentLabels(): RenderRegistry<ComponentLabelModel> {
    return this.componentLabelRegistry;
  }

  public get componentPinRenders(): RenderRegistry<ComponentPinRenderModel> {
    return this.componentPinRenderRegistry;
  }

  public buildSnapshot(
    componentRenderModels: ComponentRenderModel[] = [],
    componentBoundsModels: ComponentBoundsModel[] = [],
    componentLabelModels: ComponentLabelModel[] = [],
    componentPinRenderModels: ComponentPinRenderModel[] = [],
  ): ComponentRenderSnapshot {
    validateDuplicateComponentRenderIds(componentRenderModels, this.warnPrefix);
    validateDuplicateLabelIds(componentLabelModels, this.warnPrefix);
    validateDuplicatePinRenderIds(componentPinRenderModels, this.warnPrefix);

    for (const model of componentRenderModels) {
      validateComponentRenderModel(model, this.warnPrefix);
      this.componentRenderRegistry.register(model.componentRenderId, model, this.warnPrefix);
    }

    for (const bounds of componentBoundsModels) {
      validateComponentBoundsModel(bounds, this.warnPrefix);
      this.componentBoundsRegistry.register(bounds.componentRenderId, bounds, this.warnPrefix);
    }

    for (const label of componentLabelModels) {
      validateComponentLabelModel(label, this.warnPrefix);
      this.componentLabelRegistry.register(label.labelId, label, this.warnPrefix);
    }

    for (const pin of componentPinRenderModels) {
      validateComponentPinRenderModel(pin, this.warnPrefix);
      this.componentPinRenderRegistry.register(pin.pinRenderId, pin, this.warnPrefix);
    }

    return {
      componentRenderModels: safeDeepCopy(componentRenderModels),
      componentBoundsModels: safeDeepCopy(componentBoundsModels),
      componentLabelModels: safeDeepCopy(componentLabelModels),
      componentPinRenderModels: safeDeepCopy(componentPinRenderModels),
    };
  }

  public clear(): void {
    this.componentRenderRegistry.clear();
    this.componentBoundsRegistry.clear();
    this.componentLabelRegistry.clear();
    this.componentPinRenderRegistry.clear();
  }

  public clone(): ComponentRenderSynchronizer {
    const cloned = new ComponentRenderSynchronizer();
    cloned.componentRenderRegistry.fromJSON(this.componentRenderRegistry.getAll(), m => m.componentRenderId, this.warnPrefix);
    cloned.componentBoundsRegistry.fromJSON(this.componentBoundsRegistry.getAll(), b => b.componentRenderId, this.warnPrefix);
    cloned.componentLabelRegistry.fromJSON(this.componentLabelRegistry.getAll(), l => l.labelId, this.warnPrefix);
    cloned.componentPinRenderRegistry.fromJSON(this.componentPinRenderRegistry.getAll(), p => p.pinRenderId, this.warnPrefix);
    return cloned;
  }

  public toJSON(): {
    componentRenderModels: ComponentRenderModel[];
    componentBoundsModels: ComponentBoundsModel[];
    componentLabelModels: ComponentLabelModel[];
    componentPinRenderModels: ComponentPinRenderModel[];
  } {
    return {
      componentRenderModels: this.componentRenderRegistry.getAll(),
      componentBoundsModels: this.componentBoundsRegistry.getAll(),
      componentLabelModels: this.componentLabelRegistry.getAll(),
      componentPinRenderModels: this.componentPinRenderRegistry.getAll(),
    };
  }

  public fromJSON(data: {
    componentRenderModels?: ComponentRenderModel[];
    componentBoundsModels?: ComponentBoundsModel[];
    componentLabelModels?: ComponentLabelModel[];
    componentPinRenderModels?: ComponentPinRenderModel[];
  }): void {
    this.clear();
    if (Array.isArray(data.componentRenderModels)) {
      for (const model of data.componentRenderModels) {
        this.componentRenderRegistry.register(model.componentRenderId, model, this.warnPrefix);
      }
    }
    if (Array.isArray(data.componentBoundsModels)) {
      for (const bounds of data.componentBoundsModels) {
        this.componentBoundsRegistry.register(bounds.componentRenderId, bounds, this.warnPrefix);
      }
    }
    if (Array.isArray(data.componentLabelModels)) {
      for (const label of data.componentLabelModels) {
        this.componentLabelRegistry.register(label.labelId, label, this.warnPrefix);
      }
    }
    if (Array.isArray(data.componentPinRenderModels)) {
      for (const pin of data.componentPinRenderModels) {
        this.componentPinRenderRegistry.register(pin.pinRenderId, pin, this.warnPrefix);
      }
    }
  }

  public sync(data: {
    componentRenderModels?: ComponentRenderModel[];
    componentBoundsModels?: ComponentBoundsModel[];
    componentLabelModels?: ComponentLabelModel[];
    componentPinRenderModels?: ComponentPinRenderModel[];
  }): void {
    this.fromJSON(data);
  }
}
