import {
  SignalEffectModel,
  SignalPropagationModel,
  SignalColorModel,
  SignalActivityModel,
  VisibilityState,
  SignalEffectSnapshot,
} from '../types';

import { RenderRegistry } from './render-registry';
import { ValidationWarning } from './scene-model';

const DEFAULT_VISIBILITY_STATE: VisibilityState = 'VISIBLE';

function safeDeepCopy<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createDefaultSignalEffectModel(
  signalEffectId = 'default_signal_effect',
  overrides: Partial<SignalEffectModel> = {},
): SignalEffectModel {
  return {
    signalEffectId,
    signalId: 'default_signal',
    effectType: 'GLOW',
    displayName: `Signal Effect ${signalEffectId}`,
    effectState: 'ACTIVE',
    effectIntensity: 1.0,
    effectPriority: 0,
    visibilityState: DEFAULT_VISIBILITY_STATE,
    futureRendererHints: {},
    ...overrides,
  };
}

export function createDefaultSignalPropagationModel(
  propagationId = 'default_propagation',
  overrides: Partial<SignalPropagationModel> = {},
): SignalPropagationModel {
  return {
    propagationId,
    signalId: 'default_signal',
    sourceNodeId: 'default_source',
    targetNodeId: 'default_target',
    propagationSpeed: 1.0,
    propagationDelay: 0,
    propagationState: 'PROPAGATING',
    futurePropagationHints: {},
    ...overrides,
  };
}

export function createDefaultSignalColorModel(
  colorId = 'default_color',
  overrides: Partial<SignalColorModel> = {},
): SignalColorModel {
  return {
    colorId,
    signalId: 'default_signal',
    colorHex: '#FF0000',
    alpha: 1.0,
    colorTransition: 'NONE',
    futureColorHints: {},
    ...overrides,
  };
}

export function createDefaultSignalActivityModel(
  activityId = 'default_activity',
  overrides: Partial<SignalActivityModel> = {},
): SignalActivityModel {
  return {
    activityId,
    signalId: 'default_signal',
    activityType: 'DIGITAL',
    activityState: 'HIGH',
    intensity: 1.0,
    frequency: 0,
    dutyCycle: 1.0,
    futureActivityHints: {},
    ...overrides,
  };
}

const VALID_VISIBILITY_STATES: VisibilityState[] = [
  'VISIBLE', 'HIDDEN', 'PARENT_HIDDEN',
];

export function validateSignalEffectModel(
  model: SignalEffectModel,
  warnPrefix = '[SignalEffects]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_SIGNAL_EFFECT', message: 'Signal effect model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.signalEffectId) {
    warnings.push({ code: 'INVALID_SIGNAL_EFFECT_ID', message: 'Signal effect ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.signalId) {
    warnings.push({ code: 'INVALID_SIGNAL_ID', message: `Signal effect "${model.signalEffectId}" has empty signalId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.effectType) {
    warnings.push({ code: 'INVALID_EFFECT_TYPE', message: `Signal effect "${model.signalEffectId}" has empty effectType.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.displayName) {
    warnings.push({ code: 'INVALID_DISPLAY_NAME', message: `Signal effect "${model.signalEffectId}" display name is empty.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.effectState) {
    warnings.push({ code: 'INVALID_EFFECT_STATE', message: `Signal effect "${model.signalEffectId}" has empty effectState.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.effectIntensity !== 'number' || !Number.isFinite(model.effectIntensity)) {
    warnings.push({ code: 'INVALID_EFFECT_INTENSITY', message: `Signal effect "${model.signalEffectId}" has invalid effectIntensity.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.effectPriority !== 'number' || !Number.isFinite(model.effectPriority)) {
    warnings.push({ code: 'INVALID_EFFECT_PRIORITY', message: `Signal effect "${model.signalEffectId}" has invalid effectPriority.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_VISIBILITY_STATES.includes(model.visibilityState)) {
    warnings.push({ code: 'INVALID_VISIBILITY_STATE', message: `Signal effect "${model.signalEffectId}" has invalid visibilityState "${model.visibilityState}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.futureRendererHints !== 'object' || model.futureRendererHints === null || Array.isArray(model.futureRendererHints)) {
    warnings.push({ code: 'INVALID_FUTURE_HINTS', message: `Signal effect "${model.signalEffectId}" has invalid futureRendererHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateSignalPropagationModel(
  propagation: SignalPropagationModel,
  warnPrefix = '[SignalEffects]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!propagation || typeof propagation !== 'object') {
    warnings.push({ code: 'INVALID_SIGNAL_PROPAGATION', message: 'Signal propagation model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!propagation.propagationId) {
    warnings.push({ code: 'INVALID_PROPAGATION_ID', message: 'Signal propagation ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!propagation.signalId) {
    warnings.push({ code: 'INVALID_SIGNAL_ID', message: `Signal propagation "${propagation.propagationId}" has empty signalId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!propagation.sourceNodeId) {
    warnings.push({ code: 'INVALID_SOURCE_NODE_ID', message: `Signal propagation "${propagation.propagationId}" has empty sourceNodeId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!propagation.targetNodeId) {
    warnings.push({ code: 'INVALID_TARGET_NODE_ID', message: `Signal propagation "${propagation.propagationId}" has empty targetNodeId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof propagation.propagationSpeed !== 'number' || !Number.isFinite(propagation.propagationSpeed) || propagation.propagationSpeed <= 0) {
    warnings.push({ code: 'INVALID_PROPAGATION_SPEED', message: `Signal propagation "${propagation.propagationId}" has invalid speed.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof propagation.propagationDelay !== 'number' || !Number.isFinite(propagation.propagationDelay) || propagation.propagationDelay < 0) {
    warnings.push({ code: 'INVALID_PROPAGATION_DELAY', message: `Signal propagation "${propagation.propagationId}" has invalid delay.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!propagation.propagationState) {
    warnings.push({ code: 'INVALID_PROPAGATION_STATE', message: `Signal propagation "${propagation.propagationId}" has empty state.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof propagation.futurePropagationHints !== 'object' || propagation.futurePropagationHints === null || Array.isArray(propagation.futurePropagationHints)) {
    warnings.push({ code: 'INVALID_FUTURE_PROPAGATION_HINTS', message: `Signal propagation "${propagation.propagationId}" has invalid futurePropagationHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateSignalColorModel(
  color: SignalColorModel,
  warnPrefix = '[SignalEffects]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!color || typeof color !== 'object') {
    warnings.push({ code: 'INVALID_SIGNAL_COLOR', message: 'Signal color model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!color.colorId) {
    warnings.push({ code: 'INVALID_COLOR_ID', message: 'Signal color ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!color.signalId) {
    warnings.push({ code: 'INVALID_SIGNAL_ID', message: `Signal color "${color.colorId}" has empty signalId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!color.colorHex) {
    warnings.push({ code: 'INVALID_COLOR_HEX', message: `Signal color "${color.colorId}" has empty colorHex.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof color.alpha !== 'number' || !Number.isFinite(color.alpha) || color.alpha < 0 || color.alpha > 1) {
    warnings.push({ code: 'INVALID_COLOR_ALPHA', message: `Signal color "${color.colorId}" has invalid alpha.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!color.colorTransition) {
    warnings.push({ code: 'INVALID_COLOR_TRANSITION', message: `Signal color "${color.colorId}" has empty colorTransition.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof color.futureColorHints !== 'object' || color.futureColorHints === null || Array.isArray(color.futureColorHints)) {
    warnings.push({ code: 'INVALID_FUTURE_COLOR_HINTS', message: `Signal color "${color.colorId}" has invalid futureColorHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateSignalActivityModel(
  activity: SignalActivityModel,
  warnPrefix = '[SignalEffects]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!activity || typeof activity !== 'object') {
    warnings.push({ code: 'INVALID_SIGNAL_ACTIVITY', message: 'Signal activity model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!activity.activityId) {
    warnings.push({ code: 'INVALID_ACTIVITY_ID', message: 'Signal activity ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!activity.signalId) {
    warnings.push({ code: 'INVALID_SIGNAL_ID', message: `Signal activity "${activity.activityId}" has empty signalId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!activity.activityType) {
    warnings.push({ code: 'INVALID_ACTIVITY_TYPE', message: `Signal activity "${activity.activityId}" has empty activityType.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!activity.activityState) {
    warnings.push({ code: 'INVALID_ACTIVITY_STATE', message: `Signal activity "${activity.activityId}" has empty activityState.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof activity.intensity !== 'number' || !Number.isFinite(activity.intensity)) {
    warnings.push({ code: 'INVALID_ACTIVITY_INTENSITY', message: `Signal activity "${activity.activityId}" has invalid intensity.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof activity.frequency !== 'number' || !Number.isFinite(activity.frequency) || activity.frequency < 0) {
    warnings.push({ code: 'INVALID_ACTIVITY_FREQUENCY', message: `Signal activity "${activity.activityId}" has invalid frequency.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof activity.dutyCycle !== 'number' || !Number.isFinite(activity.dutyCycle) || activity.dutyCycle < 0 || activity.dutyCycle > 1) {
    warnings.push({ code: 'INVALID_ACTIVITY_DUTY_CYCLE', message: `Signal activity "${activity.activityId}" has invalid dutyCycle.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof activity.futureActivityHints !== 'object' || activity.futureActivityHints === null || Array.isArray(activity.futureActivityHints)) {
    warnings.push({ code: 'INVALID_FUTURE_ACTIVITY_HINTS', message: `Signal activity "${activity.activityId}" has invalid futureActivityHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateDuplicateSignalEffectIds(
  models: SignalEffectModel[],
  warnPrefix = '[SignalEffects]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.signalEffectId)) {
      warnings.push({ code: 'DUPLICATE_SIGNAL_EFFECT_ID', message: `Duplicate signal effect ID "${model.signalEffectId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.signalEffectId);
  }
  return warnings;
}

export function validateDuplicateSignalPropagationIds(
  propagations: SignalPropagationModel[],
  warnPrefix = '[SignalEffects]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(propagations)) return warnings;
  const seen = new Set<string>();
  for (const prop of propagations) {
    if (seen.has(prop.propagationId)) {
      warnings.push({ code: 'DUPLICATE_PROPAGATION_ID', message: `Duplicate signal propagation ID "${prop.propagationId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(prop.propagationId);
  }
  return warnings;
}

export function validateDuplicateSignalColorIds(
  colors: SignalColorModel[],
  warnPrefix = '[SignalEffects]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(colors)) return warnings;
  const seen = new Set<string>();
  for (const color of colors) {
    if (seen.has(color.colorId)) {
      warnings.push({ code: 'DUPLICATE_COLOR_ID', message: `Duplicate signal color ID "${color.colorId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(color.colorId);
  }
  return warnings;
}

export function validateDuplicateSignalActivityIds(
  activities: SignalActivityModel[],
  warnPrefix = '[SignalEffects]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(activities)) return warnings;
  const seen = new Set<string>();
  for (const act of activities) {
    if (seen.has(act.activityId)) {
      warnings.push({ code: 'DUPLICATE_ACTIVITY_ID', message: `Duplicate signal activity ID "${act.activityId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(act.activityId);
  }
  return warnings;
}

export class SignalEffectSynchronizer {
  private readonly signalEffectRegistry = new RenderRegistry<SignalEffectModel>();
  private readonly signalPropagationRegistry = new RenderRegistry<SignalPropagationModel>();
  private readonly signalColorRegistry = new RenderRegistry<SignalColorModel>();
  private readonly signalActivityRegistry = new RenderRegistry<SignalActivityModel>();

  private readonly warnPrefix = '[SignalEffectSynchronizer]';

  public get signalEffects(): RenderRegistry<SignalEffectModel> {
    return this.signalEffectRegistry;
  }

  public get signalPropagations(): RenderRegistry<SignalPropagationModel> {
    return this.signalPropagationRegistry;
  }

  public get signalColors(): RenderRegistry<SignalColorModel> {
    return this.signalColorRegistry;
  }

  public get signalActivities(): RenderRegistry<SignalActivityModel> {
    return this.signalActivityRegistry;
  }

  public buildSnapshot(
    signalEffectModels: SignalEffectModel[] = [],
    signalPropagationModels: SignalPropagationModel[] = [],
    signalColorModels: SignalColorModel[] = [],
    signalActivityModels: SignalActivityModel[] = [],
  ): SignalEffectSnapshot {
    validateDuplicateSignalEffectIds(signalEffectModels, this.warnPrefix);
    validateDuplicateSignalPropagationIds(signalPropagationModels, this.warnPrefix);
    validateDuplicateSignalColorIds(signalColorModels, this.warnPrefix);
    validateDuplicateSignalActivityIds(signalActivityModels, this.warnPrefix);

    for (const model of signalEffectModels) {
      validateSignalEffectModel(model, this.warnPrefix);
      this.signalEffectRegistry.register(model.signalEffectId, model, this.warnPrefix);
    }

    for (const prop of signalPropagationModels) {
      validateSignalPropagationModel(prop, this.warnPrefix);
      this.signalPropagationRegistry.register(prop.propagationId, prop, this.warnPrefix);
    }

    for (const color of signalColorModels) {
      validateSignalColorModel(color, this.warnPrefix);
      this.signalColorRegistry.register(color.colorId, color, this.warnPrefix);
    }

    for (const act of signalActivityModels) {
      validateSignalActivityModel(act, this.warnPrefix);
      this.signalActivityRegistry.register(act.activityId, act, this.warnPrefix);
    }

    return {
      signalEffectModels: safeDeepCopy(signalEffectModels),
      signalPropagationModels: safeDeepCopy(signalPropagationModels),
      signalColorModels: safeDeepCopy(signalColorModels),
      signalActivityModels: safeDeepCopy(signalActivityModels),
    };
  }

  public clear(): void {
    this.signalEffectRegistry.clear();
    this.signalPropagationRegistry.clear();
    this.signalColorRegistry.clear();
    this.signalActivityRegistry.clear();
  }

  public clone(): SignalEffectSynchronizer {
    const cloned = new SignalEffectSynchronizer();
    cloned.signalEffectRegistry.fromJSON(this.signalEffectRegistry.getAll(), e => e.signalEffectId, this.warnPrefix);
    cloned.signalPropagationRegistry.fromJSON(this.signalPropagationRegistry.getAll(), p => p.propagationId, this.warnPrefix);
    cloned.signalColorRegistry.fromJSON(this.signalColorRegistry.getAll(), c => c.colorId, this.warnPrefix);
    cloned.signalActivityRegistry.fromJSON(this.signalActivityRegistry.getAll(), a => a.activityId, this.warnPrefix);
    return cloned;
  }

  public toJSON(): {
    signalEffectModels: SignalEffectModel[];
    signalPropagationModels: SignalPropagationModel[];
    signalColorModels: SignalColorModel[];
    signalActivityModels: SignalActivityModel[];
  } {
    return {
      signalEffectModels: this.signalEffectRegistry.getAll(),
      signalPropagationModels: this.signalPropagationRegistry.getAll(),
      signalColorModels: this.signalColorRegistry.getAll(),
      signalActivityModels: this.signalActivityRegistry.getAll(),
    };
  }

  public fromJSON(data: {
    signalEffectModels?: SignalEffectModel[];
    signalPropagationModels?: SignalPropagationModel[];
    signalColorModels?: SignalColorModel[];
    signalActivityModels?: SignalActivityModel[];
  }): void {
    this.clear();
    if (Array.isArray(data.signalEffectModels)) {
      for (const model of data.signalEffectModels) {
        this.signalEffectRegistry.register(model.signalEffectId, model, this.warnPrefix);
      }
    }
    if (Array.isArray(data.signalPropagationModels)) {
      for (const prop of data.signalPropagationModels) {
        this.signalPropagationRegistry.register(prop.propagationId, prop, this.warnPrefix);
      }
    }
    if (Array.isArray(data.signalColorModels)) {
      for (const color of data.signalColorModels) {
        this.signalColorRegistry.register(color.colorId, color, this.warnPrefix);
      }
    }
    if (Array.isArray(data.signalActivityModels)) {
      for (const act of data.signalActivityModels) {
        this.signalActivityRegistry.register(act.activityId, act, this.warnPrefix);
      }
    }
  }

  public sync(data: {
    signalEffectModels?: SignalEffectModel[];
    signalPropagationModels?: SignalPropagationModel[];
    signalColorModels?: SignalColorModel[];
    signalActivityModels?: SignalActivityModel[];
  }): void {
    this.fromJSON(data);
  }
}
