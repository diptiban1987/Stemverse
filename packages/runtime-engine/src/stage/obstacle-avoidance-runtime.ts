// ═══════════════════════════════════════════════════════════════
// Phase 25B: Virtual Obstacle Avoidance Runtime
// Deterministic metadata-only obstacle avoidance simulation.
// Supports HC-SR04 sensor integration, detection zones (FRONT/LEFT/RIGHT/REAR),
// collision prediction, navigation decision engine, differential drive integration,
// line following integration, servo scanning, and Blockly runtime APIs.
// No Canvas, no WebGL, no Pixi. Simulation data only.
// ═══════════════════════════════════════════════════════════════

import {
  AvoidanceState,
  ObstacleSeverity,
  NavigationAction,
  ObstacleAvoidanceModel,
  AvoidanceRuleModel,
  ObstacleDetectionModel,
  NavigationDecisionModel,
  SafeZoneModel,
  CollisionPredictionModel,
  ObstacleAvoidanceSnapshot,
} from '../types';

// ─── Deep Copy Helper ───────────────────────────────────────────

function safeDeepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

/** Default front obstacle threshold in cm */
export const DEFAULT_AVOIDANCE_FRONT_THRESHOLD_CM = 20;

/** Default side (left/right) obstacle threshold in cm */
export const DEFAULT_AVOIDANCE_SIDE_THRESHOLD_CM = 15;

/** Default rear obstacle threshold in cm */
export const DEFAULT_AVOIDANCE_REAR_THRESHOLD_CM = 10;

/** Default critical distance in cm — immediate stop required */
export const DEFAULT_AVOIDANCE_CRITICAL_DISTANCE_CM = 5;

/** Default servo scan resolution in degrees */
export const DEFAULT_AVOIDANCE_SCAN_RESOLUTION_DEG = 15;

/** Default servo scan range in degrees */
export const DEFAULT_AVOIDANCE_SCAN_RANGE_DEG = 180;

/** Default collision prediction horizon in milliseconds */
export const DEFAULT_AVOIDANCE_PREDICTION_HORIZON_MS = 2000;

/** Default confidence threshold for detection acceptance */
export const DEFAULT_AVOIDANCE_CONFIDENCE_THRESHOLD = 0.5;

/** Valid avoidance states */
export const VALID_AVOIDANCE_STATES: AvoidanceState[] = [
  'IDLE', 'SCANNING', 'AVOIDING', 'RECOVERING', 'STOPPED', 'ERROR',
];

/** Valid obstacle severity levels */
export const VALID_AVOIDANCE_SEVERITIES: ObstacleSeverity[] = [
  'NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL',
];

/** Valid navigation action commands */
export const VALID_AVOIDANCE_NAVIGATION_ACTIONS: NavigationAction[] = [
  'FORWARD', 'STOP', 'REVERSE', 'TURN_LEFT', 'TURN_RIGHT', 'SPIN_LEFT', 'SPIN_RIGHT', 'FOLLOW_PATH',
];

/** Valid detection zones */
export const VALID_AVOIDANCE_DETECTION_ZONES: ('FRONT' | 'LEFT' | 'RIGHT' | 'REAR')[] = [
  'FRONT', 'LEFT', 'RIGHT', 'REAR',
];

/** Valid rule priority levels (1 = highest) */
export const VALID_AVOIDANCE_RULE_PRIORITIES: number[] = [1, 2, 3, 4, 5];

/** Valid prediction states for collision tracking */
export const VALID_AVOIDANCE_PREDICTION_STATES: string[] = [
  'PENDING', 'ACTIVE', 'EXPIRED', 'CLEARED',
];

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a default ObstacleAvoidanceModel with sensible defaults.
 * Returns a deep copy to ensure immutability.
 */
export function createDefaultObstacleAvoidanceModel(
  overrides: Partial<ObstacleAvoidanceModel> = {},
): ObstacleAvoidanceModel {
  return safeDeepCopy({
    avoidanceId: '',
    driveId: '',
    esp32Id: '',
    avoidanceState: 'IDLE' as AvoidanceState,
    frontSensorId: '',
    leftSensorId: '',
    rightSensorId: '',
    rearSensorId: '',
    activeRuleIds: [],
    currentAction: 'FORWARD' as NavigationAction,
    lastDecisionId: '',
    isEnabled: true,
    timestamp: 0,
    futureAvoidanceHints: {},
    ...overrides,
  });
}

/**
 * Create a default AvoidanceRuleModel with sensible defaults.
 * Returns a deep copy to ensure immutability.
 */
export function createDefaultAvoidanceRuleModel(
  overrides: Partial<AvoidanceRuleModel> = {},
): AvoidanceRuleModel {
  return safeDeepCopy({
    ruleId: '',
    avoidanceId: '',
    ruleName: '',
    detectionZone: 'FRONT' as const,
    thresholdCm: DEFAULT_AVOIDANCE_FRONT_THRESHOLD_CM,
    criticalDistanceCm: DEFAULT_AVOIDANCE_CRITICAL_DISTANCE_CM,
    priority: 1,
    actionOnTrigger: 'STOP' as NavigationAction,
    isActive: true,
    futureRuleHints: {},
    ...overrides,
  });
}

/**
 * Create a default ObstacleDetectionModel with sensible defaults.
 * distanceCm defaults to 400 (HC-SR04 max range).
 * Returns a deep copy to ensure immutability.
 */
export function createDefaultObstacleDetectionModel(
  overrides: Partial<ObstacleDetectionModel> = {},
): ObstacleDetectionModel {
  return safeDeepCopy({
    detectionId: '',
    avoidanceId: '',
    sensorId: '',
    distanceCm: 400,
    bearingDeg: 0,
    detectionZone: 'FRONT' as const,
    severity: 'NONE' as ObstacleSeverity,
    confidence: 0,
    timestamp: 0,
    futureDetectionHints: {},
    ...overrides,
  });
}

/**
 * Create a default NavigationDecisionModel with sensible defaults.
 * All distances default to 400 (max range = clear path).
 * Returns a deep copy to ensure immutability.
 */
export function createDefaultNavigationDecisionModel(
  overrides: Partial<NavigationDecisionModel> = {},
): NavigationDecisionModel {
  return safeDeepCopy({
    decisionId: '',
    avoidanceId: '',
    selectedAction: 'FORWARD' as NavigationAction,
    previousAction: 'FORWARD' as NavigationAction,
    decisionReason: '',
    triggerDetectionId: '',
    frontDistanceCm: 400,
    leftDistanceCm: 400,
    rightDistanceCm: 400,
    rearDistanceCm: 400,
    decisionTimestamp: 0,
    futureDecisionHints: {},
    ...overrides,
  });
}

/**
 * Create a default SafeZoneModel with sensible defaults.
 * Returns a deep copy to ensure immutability.
 */
export function createDefaultSafeZoneModel(
  overrides: Partial<SafeZoneModel> = {},
): SafeZoneModel {
  return safeDeepCopy({
    zoneId: '',
    avoidanceId: '',
    zoneName: '',
    centerX: 0,
    centerY: 0,
    radiusCm: 50,
    minX: -50,
    minY: -50,
    maxX: 50,
    maxY: 50,
    isSafe: true,
    lastCheckedTimestamp: 0,
    futureZoneHints: {},
    ...overrides,
  });
}

/**
 * Create a default CollisionPredictionModel with sensible defaults.
 * timeToCollisionMs defaults to Infinity (no collision predicted).
 * Returns a deep copy to ensure immutability.
 */
export function createDefaultCollisionPredictionModel(
  overrides: Partial<CollisionPredictionModel> = {},
): CollisionPredictionModel {
  // NOTE: JSON.stringify converts Infinity to null, so we deep-copy first
  // with a placeholder, then restore Infinity for timeToCollisionMs.
  const result = safeDeepCopy({
    predictionId: '',
    avoidanceId: '',
    detectionId: '',
    timeToCollisionMs: 0,
    predictedImpactX: 0,
    predictedImpactY: 0,
    collisionProbability: 0,
    safeDistanceMarginCm: 400,
    robotVelocityCmPerSec: 0,
    robotHeadingDeg: 0,
    predictionTimestamp: 0,
    futurePredictionHints: {},
    ...overrides,
  });
  // Restore Infinity if not overridden
  if (overrides.timeToCollisionMs === undefined) {
    result.timeToCollisionMs = Infinity;
  } else if (overrides.timeToCollisionMs === Infinity) {
    result.timeToCollisionMs = Infinity;
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════
// MODEL VALIDATORS
// ═══════════════════════════════════════════════════════════════

/**
 * Validate an ObstacleAvoidanceModel. Returns array of warning strings.
 * Never throws — collects warnings only.
 */
export function validateObstacleAvoidanceModel(
  model: ObstacleAvoidanceModel,
): string[] {
  const warnings: string[] = [];
  if (!model.avoidanceId) {
    warnings.push('[ObstacleAvoidance] avoidanceId is empty.');
  }
  if (!model.driveId) {
    warnings.push('[ObstacleAvoidance] driveId is empty.');
  }
  if (!model.esp32Id) {
    warnings.push('[ObstacleAvoidance] esp32Id is empty.');
  }
  if (!VALID_AVOIDANCE_STATES.includes(model.avoidanceState)) {
    warnings.push(`[ObstacleAvoidance] Invalid avoidanceState: "${model.avoidanceState}".`);
  }
  if (!VALID_AVOIDANCE_NAVIGATION_ACTIONS.includes(model.currentAction)) {
    warnings.push(`[ObstacleAvoidance] Invalid currentAction: "${model.currentAction}".`);
  }
  if (model.timestamp < 0) {
    warnings.push(`[ObstacleAvoidance] timestamp must be >= 0, got ${model.timestamp}.`);
  }
  if (!Array.isArray(model.activeRuleIds)) {
    warnings.push('[ObstacleAvoidance] activeRuleIds must be an array.');
  }
  return warnings;
}

/**
 * Validate an AvoidanceRuleModel. Returns array of warning strings.
 * Never throws — collects warnings only.
 */
export function validateAvoidanceRuleModel(
  model: AvoidanceRuleModel,
): string[] {
  const warnings: string[] = [];
  if (!model.ruleId) {
    warnings.push('[AvoidanceRule] ruleId is empty.');
  }
  if (!model.avoidanceId) {
    warnings.push('[AvoidanceRule] avoidanceId is empty.');
  }
  if (!VALID_AVOIDANCE_DETECTION_ZONES.includes(model.detectionZone)) {
    warnings.push(`[AvoidanceRule] Invalid detectionZone: "${model.detectionZone}".`);
  }
  if (model.thresholdCm < 0) {
    warnings.push(`[AvoidanceRule] thresholdCm must be >= 0, got ${model.thresholdCm}.`);
  }
  if (model.criticalDistanceCm < 0) {
    warnings.push(`[AvoidanceRule] criticalDistanceCm must be >= 0, got ${model.criticalDistanceCm}.`);
  }
  if (model.criticalDistanceCm > model.thresholdCm) {
    warnings.push(`[AvoidanceRule] criticalDistanceCm (${model.criticalDistanceCm}) should not exceed thresholdCm (${model.thresholdCm}).`);
  }
  if (model.priority < 1 || model.priority > 5) {
    warnings.push(`[AvoidanceRule] priority must be 1–5, got ${model.priority}.`);
  }
  if (!VALID_AVOIDANCE_NAVIGATION_ACTIONS.includes(model.actionOnTrigger)) {
    warnings.push(`[AvoidanceRule] Invalid actionOnTrigger: "${model.actionOnTrigger}".`);
  }
  return warnings;
}

/**
 * Validate an ObstacleDetectionModel. Returns array of warning strings.
 * Never throws — collects warnings only.
 */
export function validateObstacleDetectionModel(
  model: ObstacleDetectionModel,
): string[] {
  const warnings: string[] = [];
  if (!model.detectionId) {
    warnings.push('[ObstacleDetection] detectionId is empty.');
  }
  if (!model.avoidanceId) {
    warnings.push('[ObstacleDetection] avoidanceId is empty.');
  }
  if (!model.sensorId) {
    warnings.push('[ObstacleDetection] sensorId is empty.');
  }
  if (model.distanceCm < 0) {
    warnings.push(`[ObstacleDetection] distanceCm must be >= 0, got ${model.distanceCm}.`);
  }
  if (!VALID_AVOIDANCE_DETECTION_ZONES.includes(model.detectionZone)) {
    warnings.push(`[ObstacleDetection] Invalid detectionZone: "${model.detectionZone}".`);
  }
  if (!VALID_AVOIDANCE_SEVERITIES.includes(model.severity)) {
    warnings.push(`[ObstacleDetection] Invalid severity: "${model.severity}".`);
  }
  if (model.confidence < 0 || model.confidence > 1) {
    warnings.push(`[ObstacleDetection] confidence must be 0–1, got ${model.confidence}.`);
  }
  if (model.timestamp < 0) {
    warnings.push(`[ObstacleDetection] timestamp must be >= 0, got ${model.timestamp}.`);
  }
  return warnings;
}

/**
 * Validate a NavigationDecisionModel. Returns array of warning strings.
 * Never throws — collects warnings only.
 */
export function validateNavigationDecisionModel(
  model: NavigationDecisionModel,
): string[] {
  const warnings: string[] = [];
  if (!model.decisionId) {
    warnings.push('[NavigationDecision] decisionId is empty.');
  }
  if (!model.avoidanceId) {
    warnings.push('[NavigationDecision] avoidanceId is empty.');
  }
  if (!VALID_AVOIDANCE_NAVIGATION_ACTIONS.includes(model.selectedAction)) {
    warnings.push(`[NavigationDecision] Invalid selectedAction: "${model.selectedAction}".`);
  }
  if (!VALID_AVOIDANCE_NAVIGATION_ACTIONS.includes(model.previousAction)) {
    warnings.push(`[NavigationDecision] Invalid previousAction: "${model.previousAction}".`);
  }
  if (model.frontDistanceCm < 0) {
    warnings.push(`[NavigationDecision] frontDistanceCm must be >= 0, got ${model.frontDistanceCm}.`);
  }
  if (model.leftDistanceCm < 0) {
    warnings.push(`[NavigationDecision] leftDistanceCm must be >= 0, got ${model.leftDistanceCm}.`);
  }
  if (model.rightDistanceCm < 0) {
    warnings.push(`[NavigationDecision] rightDistanceCm must be >= 0, got ${model.rightDistanceCm}.`);
  }
  if (model.rearDistanceCm < 0) {
    warnings.push(`[NavigationDecision] rearDistanceCm must be >= 0, got ${model.rearDistanceCm}.`);
  }
  if (model.decisionTimestamp < 0) {
    warnings.push(`[NavigationDecision] decisionTimestamp must be >= 0, got ${model.decisionTimestamp}.`);
  }
  return warnings;
}

/**
 * Validate a SafeZoneModel. Returns array of warning strings.
 * Never throws — collects warnings only.
 */
export function validateSafeZoneModel(
  model: SafeZoneModel,
): string[] {
  const warnings: string[] = [];
  if (!model.zoneId) {
    warnings.push('[SafeZone] zoneId is empty.');
  }
  if (!model.avoidanceId) {
    warnings.push('[SafeZone] avoidanceId is empty.');
  }
  if (model.radiusCm < 0) {
    warnings.push(`[SafeZone] radiusCm must be >= 0, got ${model.radiusCm}.`);
  }
  if (model.minX > model.maxX) {
    warnings.push(`[SafeZone] minX (${model.minX}) should not exceed maxX (${model.maxX}).`);
  }
  if (model.minY > model.maxY) {
    warnings.push(`[SafeZone] minY (${model.minY}) should not exceed maxY (${model.maxY}).`);
  }
  if (model.lastCheckedTimestamp < 0) {
    warnings.push(`[SafeZone] lastCheckedTimestamp must be >= 0, got ${model.lastCheckedTimestamp}.`);
  }
  return warnings;
}

/**
 * Validate a CollisionPredictionModel. Returns array of warning strings.
 * Never throws — collects warnings only.
 */
export function validateCollisionPredictionModel(
  model: CollisionPredictionModel,
): string[] {
  const warnings: string[] = [];
  if (!model.predictionId) {
    warnings.push('[CollisionPrediction] predictionId is empty.');
  }
  if (!model.avoidanceId) {
    warnings.push('[CollisionPrediction] avoidanceId is empty.');
  }
  if (!model.detectionId) {
    warnings.push('[CollisionPrediction] detectionId is empty.');
  }
  if (model.timeToCollisionMs < 0) {
    warnings.push(`[CollisionPrediction] timeToCollisionMs must be >= 0, got ${model.timeToCollisionMs}.`);
  }
  if (model.collisionProbability < 0 || model.collisionProbability > 1) {
    warnings.push(`[CollisionPrediction] collisionProbability must be 0–1, got ${model.collisionProbability}.`);
  }
  if (model.robotVelocityCmPerSec < 0) {
    warnings.push(`[CollisionPrediction] robotVelocityCmPerSec must be >= 0, got ${model.robotVelocityCmPerSec}.`);
  }
  if (model.predictionTimestamp < 0) {
    warnings.push(`[CollisionPrediction] predictionTimestamp must be >= 0, got ${model.predictionTimestamp}.`);
  }
  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// DUPLICATE VALIDATORS
// ═══════════════════════════════════════════════════════════════

/**
 * Check for duplicate avoidanceIds across ObstacleAvoidanceModel[].
 * Returns array of warning strings.
 */
export function validateDuplicateObstacleAvoidanceIds(
  models: ObstacleAvoidanceModel[],
): string[] {
  const seen = new Set<string>();
  const warnings: string[] = [];
  for (const m of models) {
    if (seen.has(m.avoidanceId)) {
      warnings.push(`[ObstacleAvoidance] Duplicate avoidanceId: "${m.avoidanceId}".`);
    }
    seen.add(m.avoidanceId);
  }
  return warnings;
}

/**
 * Check for duplicate ruleIds across AvoidanceRuleModel[].
 * Returns array of warning strings.
 */
export function validateDuplicateAvoidanceRuleIds(
  models: AvoidanceRuleModel[],
): string[] {
  const seen = new Set<string>();
  const warnings: string[] = [];
  for (const m of models) {
    if (seen.has(m.ruleId)) {
      warnings.push(`[AvoidanceRule] Duplicate ruleId: "${m.ruleId}".`);
    }
    seen.add(m.ruleId);
  }
  return warnings;
}

/**
 * Check for duplicate detectionIds across ObstacleDetectionModel[].
 * Returns array of warning strings.
 */
export function validateDuplicateObstacleDetectionIds(
  models: ObstacleDetectionModel[],
): string[] {
  const seen = new Set<string>();
  const warnings: string[] = [];
  for (const m of models) {
    if (seen.has(m.detectionId)) {
      warnings.push(`[ObstacleDetection] Duplicate detectionId: "${m.detectionId}".`);
    }
    seen.add(m.detectionId);
  }
  return warnings;
}

/**
 * Check for duplicate decisionIds across NavigationDecisionModel[].
 * Returns array of warning strings.
 */
export function validateDuplicateNavigationDecisionIds(
  models: NavigationDecisionModel[],
): string[] {
  const seen = new Set<string>();
  const warnings: string[] = [];
  for (const m of models) {
    if (seen.has(m.decisionId)) {
      warnings.push(`[NavigationDecision] Duplicate decisionId: "${m.decisionId}".`);
    }
    seen.add(m.decisionId);
  }
  return warnings;
}

/**
 * Check for duplicate zoneIds across SafeZoneModel[].
 * Returns array of warning strings.
 */
export function validateDuplicateSafeZoneIds(
  models: SafeZoneModel[],
): string[] {
  const seen = new Set<string>();
  const warnings: string[] = [];
  for (const m of models) {
    if (seen.has(m.zoneId)) {
      warnings.push(`[SafeZone] Duplicate zoneId: "${m.zoneId}".`);
    }
    seen.add(m.zoneId);
  }
  return warnings;
}

/**
 * Check for duplicate predictionIds across CollisionPredictionModel[].
 * Returns array of warning strings.
 */
export function validateDuplicateCollisionPredictionIds(
  models: CollisionPredictionModel[],
): string[] {
  const seen = new Set<string>();
  const warnings: string[] = [];
  for (const m of models) {
    if (seen.has(m.predictionId)) {
      warnings.push(`[CollisionPrediction] Duplicate predictionId: "${m.predictionId}".`);
    }
    seen.add(m.predictionId);
  }
  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// DETECTION ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Detect an obstacle in a specific zone based on sensor distance.
 * Returns an ObstacleDetectionModel if distance < threshold, null otherwise.
 * Severity is classified automatically based on distance relative to threshold.
 */
export function detectObstacleInZone(
  sensorDistanceCm: number,
  sensorBearingDeg: number,
  zone: 'FRONT' | 'LEFT' | 'RIGHT' | 'REAR',
  thresholdCm: number,
  confidence: number = 1.0,
): ObstacleDetectionModel | null {
  if (sensorDistanceCm >= thresholdCm) {
    return null;
  }

  const severity = classifyObstacleSeverity(
    sensorDistanceCm,
    DEFAULT_AVOIDANCE_CRITICAL_DISTANCE_CM,
    thresholdCm,
  );

  return createDefaultObstacleDetectionModel({
    detectionId: `det_${zone}_${Date.now()}`,
    distanceCm: sensorDistanceCm,
    bearingDeg: sensorBearingDeg,
    detectionZone: zone,
    severity,
    confidence: Math.max(0, Math.min(1, confidence)),
    timestamp: Date.now(),
  });
}

/**
 * Classify the severity of an obstacle based on distance.
 * NONE: distance >= threshold (no obstacle)
 * CRITICAL: distance <= criticalCm
 * HIGH: distance <= criticalCm + (threshold - criticalCm) * 0.33
 * MEDIUM: distance <= criticalCm + (threshold - criticalCm) * 0.66
 * LOW: distance < threshold but above MEDIUM boundary
 */
export function classifyObstacleSeverity(
  distanceCm: number,
  criticalCm: number,
  thresholdCm: number,
): ObstacleSeverity {
  if (distanceCm >= thresholdCm) {
    return 'NONE';
  }
  if (distanceCm <= criticalCm) {
    return 'CRITICAL';
  }

  const range = thresholdCm - criticalCm;
  const distFromCritical = distanceCm - criticalCm;
  const ratio = distFromCritical / range;

  if (ratio <= 0.33) {
    return 'HIGH';
  }
  if (ratio <= 0.66) {
    return 'MEDIUM';
  }
  return 'LOW';
}

/**
 * Calculate world bearing of an obstacle given sensor angle and robot heading.
 * Returns (robotHeadingDeg + sensorAngleDeg) % 360, normalized to [0, 360).
 */
export function calculateObstacleBearing(
  sensorAngleDeg: number,
  robotHeadingDeg: number,
): number {
  const raw = (robotHeadingDeg + sensorAngleDeg) % 360;
  return raw < 0 ? raw + 360 : raw;
}

/**
 * Check if a given bearing falls within a detection zone.
 * FRONT: 315–360 and 0–45 (i.e., bearing < 45 or bearing >= 315)
 * LEFT: 45–135
 * RIGHT: 225–315
 * REAR: 135–225
 */
export function isObstacleInDetectionZone(
  bearingDeg: number,
  zone: 'FRONT' | 'LEFT' | 'RIGHT' | 'REAR',
): boolean {
  // Normalize bearing to [0, 360)
  let normalized = bearingDeg % 360;
  if (normalized < 0) normalized += 360;

  switch (zone) {
    case 'FRONT':
      return normalized < 45 || normalized >= 315;
    case 'LEFT':
      return normalized >= 45 && normalized < 135;
    case 'REAR':
      return normalized >= 135 && normalized < 225;
    case 'RIGHT':
      return normalized >= 225 && normalized < 315;
    default:
      return false;
  }
}

/**
 * Aggregate detections by zone, finding the closest detection per zone.
 * Returns an object with the closest detection for each zone, or null if no detection.
 */
export function aggregateDetections(
  detections: ObstacleDetectionModel[],
): {
  front: ObstacleDetectionModel | null;
  left: ObstacleDetectionModel | null;
  right: ObstacleDetectionModel | null;
  rear: ObstacleDetectionModel | null;
} {
  let front: ObstacleDetectionModel | null = null;
  let left: ObstacleDetectionModel | null = null;
  let right: ObstacleDetectionModel | null = null;
  let rear: ObstacleDetectionModel | null = null;

  for (const det of detections) {
    switch (det.detectionZone) {
      case 'FRONT':
        if (!front || det.distanceCm < front.distanceCm) {
          front = safeDeepCopy(det);
        }
        break;
      case 'LEFT':
        if (!left || det.distanceCm < left.distanceCm) {
          left = safeDeepCopy(det);
        }
        break;
      case 'RIGHT':
        if (!right || det.distanceCm < right.distanceCm) {
          right = safeDeepCopy(det);
        }
        break;
      case 'REAR':
        if (!rear || det.distanceCm < rear.distanceCm) {
          rear = safeDeepCopy(det);
        }
        break;
    }
  }

  return { front, left, right, rear };
}

// ═══════════════════════════════════════════════════════════════
// COLLISION PREDICTION ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Predict time to collision in milliseconds.
 * Returns distanceCm / velocityCmPerSec * 1000.
 * Returns Infinity if velocity <= 0 (not approaching).
 */
export function predictTimeToCollision(
  distanceCm: number,
  velocityCmPerSec: number,
): number {
  if (velocityCmPerSec <= 0) {
    return Infinity;
  }
  return (distanceCm / velocityCmPerSec) * 1000;
}

/**
 * Predict the impact point given robot position, heading, and distance.
 * x = robotX + distanceCm * cos(headingRad)
 * y = robotY + distanceCm * sin(headingRad)
 */
export function predictImpactPoint(
  robotX: number,
  robotY: number,
  headingDeg: number,
  distanceCm: number,
): { x: number; y: number } {
  const headingRad = headingDeg * Math.PI / 180;
  return {
    x: robotX + distanceCm * Math.cos(headingRad),
    y: robotY + distanceCm * Math.sin(headingRad),
  };
}

/**
 * Calculate collision probability based on distance, velocity, and threshold.
 * Formula: clamp(1 - (distanceCm / thresholdCm) + (velocityCmPerSec / 100) * 0.1, 0, 1)
 * Higher probability when closer and moving faster.
 */
export function calculateCollisionProbability(
  distanceCm: number,
  velocityCmPerSec: number,
  thresholdCm: number,
): number {
  if (thresholdCm <= 0) {
    return 0;
  }
  const raw = 1 - (distanceCm / thresholdCm) + (velocityCmPerSec / 100) * 0.1;
  return Math.max(0, Math.min(1, raw));
}

/**
 * Calculate the safe distance margin.
 * Returns distanceCm - stoppingDistanceCm.
 * Positive means there is margin; negative means a collision is likely.
 */
export function calculateSafeDistanceMargin(
  distanceCm: number,
  stoppingDistanceCm: number,
): number {
  return distanceCm - stoppingDistanceCm;
}

/**
 * Create a full CollisionPredictionModel by compositing prediction sub-functions.
 * Calls predictTimeToCollision, predictImpactPoint, calculateCollisionProbability,
 * and calculateSafeDistanceMargin to build a complete prediction.
 */
export function createCollisionPrediction(
  predictionId: string,
  avoidanceId: string,
  detectionId: string,
  robotX: number,
  robotY: number,
  headingDeg: number,
  distanceCm: number,
  velocityCmPerSec: number,
  thresholdCm: number,
  stoppingDistanceCm: number,
  timestamp: number,
): CollisionPredictionModel {
  const timeToCollisionMs = predictTimeToCollision(distanceCm, velocityCmPerSec);
  const impactPoint = predictImpactPoint(robotX, robotY, headingDeg, distanceCm);
  const collisionProbability = calculateCollisionProbability(distanceCm, velocityCmPerSec, thresholdCm);
  const safeDistanceMarginCm = calculateSafeDistanceMargin(distanceCm, stoppingDistanceCm);

  return createDefaultCollisionPredictionModel({
    predictionId,
    avoidanceId,
    detectionId,
    timeToCollisionMs,
    predictedImpactX: impactPoint.x,
    predictedImpactY: impactPoint.y,
    collisionProbability,
    safeDistanceMarginCm,
    robotVelocityCmPerSec: velocityCmPerSec,
    robotHeadingDeg: headingDeg,
    predictionTimestamp: timestamp,
  });
}

// ═══════════════════════════════════════════════════════════════
// NAVIGATION DECISION ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Core navigation decision function.
 * Evaluates distances from all four zones and determines the best action.
 *
 * Logic:
 * 1. If frontDistance <= criticalDistance → STOP ('Critical obstacle ahead')
 * 2. If frontDistance < frontThreshold → evaluate turn direction (toward clearer side)
 * 3. If both sides and front blocked → REVERSE ('Surrounded, reversing')
 * 4. Otherwise → FORWARD ('Path clear')
 */
export function decideNavigationAction(
  frontDistance: number,
  leftDistance: number,
  rightDistance: number,
  rearDistance: number,
  frontThreshold: number,
  sideThreshold: number,
  criticalDistance: number,
  currentAction: NavigationAction,
): { action: NavigationAction; reason: string } {
  // 1. Critical obstacle directly ahead
  if (frontDistance <= criticalDistance) {
    return { action: 'STOP' as NavigationAction, reason: 'Critical obstacle ahead' };
  }

  // 2. Front obstacle detected — evaluate turn direction
  if (frontDistance < frontThreshold) {
    const leftBlocked = leftDistance < sideThreshold;
    const rightBlocked = rightDistance < sideThreshold;

    // 3. Both sides and front are blocked — reverse
    if (leftBlocked && rightBlocked) {
      return { action: 'REVERSE' as NavigationAction, reason: 'Surrounded, reversing' };
    }

    // One or both sides are clear — turn toward clearer side
    if (leftBlocked) {
      return { action: 'TURN_RIGHT' as NavigationAction, reason: 'Obstacle ahead and left, turning right' };
    }
    if (rightBlocked) {
      return { action: 'TURN_LEFT' as NavigationAction, reason: 'Obstacle ahead and right, turning left' };
    }

    // Both sides clear — turn toward more clearance
    const turnDir = evaluateTurnDirection(leftDistance, rightDistance);
    const reason = turnDir === 'TURN_LEFT'
      ? 'Obstacle ahead, left has more clearance'
      : 'Obstacle ahead, right has more clearance';
    return { action: turnDir, reason };
  }

  // 4. Path is clear
  return { action: 'FORWARD' as NavigationAction, reason: 'Path clear' };
}

/**
 * Evaluate whether an emergency stop condition is met.
 * Returns true if frontDistance is at or below the critical distance.
 */
export function evaluateStopCondition(
  frontDistance: number,
  criticalCm: number,
): boolean {
  return frontDistance <= criticalCm;
}

/**
 * Evaluate whether a reverse maneuver is needed.
 * Returns true if front, left, and right are all below critical distance.
 */
export function evaluateReverseCondition(
  frontDistance: number,
  leftDistance: number,
  rightDistance: number,
  criticalCm: number,
): boolean {
  return frontDistance < criticalCm && leftDistance < criticalCm && rightDistance < criticalCm;
}

/**
 * Evaluate which direction to turn based on available clearance.
 * Returns TURN_LEFT if left has more or equal clearance, TURN_RIGHT otherwise.
 */
export function evaluateTurnDirection(
  leftDistance: number,
  rightDistance: number,
): 'TURN_LEFT' | 'TURN_RIGHT' {
  return leftDistance >= rightDistance ? 'TURN_LEFT' : 'TURN_RIGHT';
}

/**
 * Determine if it is safe to resume forward movement.
 * Returns true if all three forward-facing distances exceed the threshold.
 */
export function shouldResumeForward(
  frontDistance: number,
  leftDistance: number,
  rightDistance: number,
  thresholdCm: number,
): boolean {
  return frontDistance > thresholdCm && leftDistance > thresholdCm && rightDistance > thresholdCm;
}

/**
 * Build a human-readable decision reason string.
 * Format: "ACTION: Critical obstacle in ZONE at X.Xcm"
 */
export function buildDecisionReason(
  action: NavigationAction,
  triggerZone: string,
  distanceCm: number,
): string {
  return `${action}: Critical obstacle in ${triggerZone} at ${distanceCm.toFixed(1)}cm`;
}

// ═══════════════════════════════════════════════════════════════
// DIFFERENTIAL DRIVE INTEGRATION
// ═══════════════════════════════════════════════════════════════

/**
 * Predict future robot position using Euler integration.
 * x += velocity * cos(heading) * (deltaMs / 1000)
 * y += velocity * sin(heading) * (deltaMs / 1000)
 */
export function predictFuturePosition(
  posX: number,
  posY: number,
  headingDeg: number,
  velocityCmPerSec: number,
  deltaMs: number,
): { x: number; y: number; headingDeg: number } {
  const dt = deltaMs / 1000;
  const headingRad = headingDeg * Math.PI / 180;
  return {
    x: posX + velocityCmPerSec * Math.cos(headingRad) * dt,
    y: posY + velocityCmPerSec * Math.sin(headingRad) * dt,
    headingDeg,
  };
}

/**
 * Predict future heading after angular rotation.
 * Returns (headingDeg + angularVelDegPerSec * deltaMs / 1000) normalized to [0, 360).
 */
export function predictFutureHeading(
  headingDeg: number,
  angularVelDegPerSec: number,
  deltaMs: number,
): number {
  const dt = deltaMs / 1000;
  const raw = headingDeg + angularVelDegPerSec * dt;
  const normalized = raw % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

/**
 * Check if a future position will collide with an obstacle.
 * Returns true if Euclidean distance between future position and obstacle is < threshold.
 */
export function checkFutureCollision(
  futureX: number,
  futureY: number,
  obstacleX: number,
  obstacleY: number,
  thresholdCm: number,
): boolean {
  const dx = futureX - obstacleX;
  const dy = futureY - obstacleY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < thresholdCm;
}

/**
 * Calculate the stopping distance given velocity and deceleration.
 * Formula: v² / (2 * deceleration).
 * Returns 0 if velocity <= 0.
 */
export function calculateStoppingDistance(
  velocityCmPerSec: number,
  decelerationCmPerSec2: number,
): number {
  if (velocityCmPerSec <= 0) {
    return 0;
  }
  if (decelerationCmPerSec2 <= 0) {
    return Infinity;
  }
  return (velocityCmPerSec * velocityCmPerSec) / (2 * decelerationCmPerSec2);
}

// ═══════════════════════════════════════════════════════════════
// LINE FOLLOWING INTEGRATION
// ═══════════════════════════════════════════════════════════════

/**
 * Determine if it is safe to follow a line (no obstacles nearby).
 * Returns true if all distances exceed the threshold.
 */
export function shouldFollowLine(
  frontDistance: number,
  leftDistance: number,
  rightDistance: number,
  thresholdCm: number,
): boolean {
  return frontDistance > thresholdCm && leftDistance > thresholdCm && rightDistance > thresholdCm;
}

/**
 * Determine if obstacle avoidance should take priority over line following.
 * Returns true if frontDistance is below the threshold.
 */
export function shouldAvoidObstacle(
  frontDistance: number,
  thresholdCm: number,
): boolean {
  return frontDistance < thresholdCm;
}

/**
 * Determine if the robot should resume line following after avoiding an obstacle.
 * Returns true if wasAvoiding is true AND all distances exceed the threshold.
 */
export function determineResumeLineFollowing(
  frontDistance: number,
  leftDistance: number,
  rightDistance: number,
  thresholdCm: number,
  wasAvoiding: boolean,
): boolean {
  if (!wasAvoiding) {
    return false;
  }
  return frontDistance > thresholdCm && leftDistance > thresholdCm && rightDistance > thresholdCm;
}

/**
 * Merge line-following and obstacle-avoidance behaviors.
 * If avoidanceState is 'AVOIDING' or 'STOPPED', the avoidance action takes priority.
 * Otherwise, the line-following action is used.
 */
export function mergeLineAndAvoidanceBehavior(
  lineAction: NavigationAction,
  avoidanceAction: NavigationAction,
  avoidanceState: AvoidanceState,
): NavigationAction {
  if (avoidanceState === 'AVOIDING' || avoidanceState === 'STOPPED') {
    return avoidanceAction;
  }
  return lineAction;
}

// ═══════════════════════════════════════════════════════════════
// SERVO SCANNING INTEGRATION
// ═══════════════════════════════════════════════════════════════

/**
 * Generate an array of scan angles from rangeStartDeg to rangeEndDeg,
 * stepping by resolutionDeg.
 * Includes both start and end if they align with the resolution step.
 */
export function generateScanAngles(
  rangeStartDeg: number,
  rangeEndDeg: number,
  resolutionDeg: number,
): number[] {
  const angles: number[] = [];
  if (resolutionDeg <= 0) {
    return angles;
  }

  if (rangeStartDeg <= rangeEndDeg) {
    for (let angle = rangeStartDeg; angle <= rangeEndDeg; angle += resolutionDeg) {
      angles.push(angle);
    }
  } else {
    for (let angle = rangeStartDeg; angle >= rangeEndDeg; angle -= resolutionDeg) {
      angles.push(angle);
    }
  }

  return angles;
}

/**
 * Create a scan result record from a single servo scan measurement.
 */
export function createScanResult(
  angleDeg: number,
  distanceCm: number,
  timestamp: number,
): { angleDeg: number; distanceCm: number; timestamp: number } {
  return { angleDeg, distanceCm, timestamp };
}

/**
 * Find the clearest (maximum distance) direction from a set of scan results.
 * Returns the scan result with the greatest distance.
 * Returns { angleDeg: 0, distanceCm: 0 } if no results.
 */
export function findClearestDirection(
  scanResults: { angleDeg: number; distanceCm: number }[],
): { angleDeg: number; distanceCm: number } {
  if (scanResults.length === 0) {
    return { angleDeg: 0, distanceCm: 0 };
  }

  let best = scanResults[0];
  for (let i = 1; i < scanResults.length; i++) {
    if (scanResults[i].distanceCm > best.distanceCm) {
      best = scanResults[i];
    }
  }

  return { angleDeg: best.angleDeg, distanceCm: best.distanceCm };
}

/**
 * Build a scan profile summarizing scan results.
 * Returns min, max, average distance and the angle of the clearest direction.
 */
export function buildScanProfile(
  scanResults: { angleDeg: number; distanceCm: number }[],
): { minDistanceCm: number; maxDistanceCm: number; avgDistanceCm: number; clearAngleDeg: number } {
  if (scanResults.length === 0) {
    return {
      minDistanceCm: 0,
      maxDistanceCm: 0,
      avgDistanceCm: 0,
      clearAngleDeg: 0,
    };
  }

  let minDist = Infinity;
  let maxDist = -Infinity;
  let sumDist = 0;
  let clearAngle = 0;

  for (const result of scanResults) {
    if (result.distanceCm < minDist) {
      minDist = result.distanceCm;
    }
    if (result.distanceCm > maxDist) {
      maxDist = result.distanceCm;
      clearAngle = result.angleDeg;
    }
    sumDist += result.distanceCm;
  }

  return {
    minDistanceCm: minDist,
    maxDistanceCm: maxDist,
    avgDistanceCm: sumDist / scanResults.length,
    clearAngleDeg: clearAngle,
  };
}

// ═══════════════════════════════════════════════════════════════
// BLOCKLY RUNTIME APIs
// ═══════════════════════════════════════════════════════════════

/**
 * Check if any obstacle is detected below the given threshold.
 * Returns true if any detection has distance < thresholdCm.
 */
export function obstacleDetected(
  detections: ObstacleDetectionModel[],
  thresholdCm: number,
): boolean {
  for (const det of detections) {
    if (det.distanceCm < thresholdCm) {
      return true;
    }
  }
  return false;
}

/**
 * Get the closest obstacle distance in a specific detection zone.
 * Returns the minimum distance found in the zone, or 400 (max range) if none found.
 */
export function getObstacleDistance(
  detections: ObstacleDetectionModel[],
  zone: 'FRONT' | 'LEFT' | 'RIGHT' | 'REAR',
): number {
  let minDist = 400;
  for (const det of detections) {
    if (det.detectionZone === zone && det.distanceCm < minDist) {
      minDist = det.distanceCm;
    }
  }
  return minDist;
}

/**
 * High-level obstacle avoidance API for Blockly blocks.
 * Calls decideNavigationAction and wraps the result in a NavigationDecisionModel.
 */
export function avoidObstacle(
  frontDist: number,
  leftDist: number,
  rightDist: number,
  rearDist: number,
  frontThreshold: number,
  sideThreshold: number,
  criticalDistance: number,
  currentAction: NavigationAction,
): NavigationDecisionModel {
  const decision = decideNavigationAction(
    frontDist, leftDist, rightDist, rearDist,
    frontThreshold, sideThreshold, criticalDistance,
    currentAction,
  );

  return createDefaultNavigationDecisionModel({
    decisionId: `blockly_decision_${Date.now()}`,
    selectedAction: decision.action,
    previousAction: currentAction,
    decisionReason: decision.reason,
    frontDistanceCm: frontDist,
    leftDistanceCm: leftDist,
    rightDistanceCm: rightDist,
    rearDistanceCm: rearDist,
    decisionTimestamp: Date.now(),
  });
}

/**
 * Blockly scan direction — wraps createScanResult for a single measurement.
 */
export function scanDirection(
  angleDeg: number,
  distanceCm: number,
  timestamp: number,
): { angleDeg: number; distanceCm: number; timestamp: number } {
  return createScanResult(angleDeg, distanceCm, timestamp);
}

/**
 * Blockly scan left — finds the maximum distance in scan results
 * where angleDeg is between 45 and 135 (left zone).
 * Returns null if no results in that range.
 */
export function scanLeft(
  scanResults: { angleDeg: number; distanceCm: number }[],
): { angleDeg: number; distanceCm: number } | null {
  const leftResults = scanResults.filter(r => r.angleDeg >= 45 && r.angleDeg <= 135);
  if (leftResults.length === 0) {
    return null;
  }

  let best = leftResults[0];
  for (let i = 1; i < leftResults.length; i++) {
    if (leftResults[i].distanceCm > best.distanceCm) {
      best = leftResults[i];
    }
  }

  return { angleDeg: best.angleDeg, distanceCm: best.distanceCm };
}

/**
 * Blockly scan right — finds the maximum distance in scan results
 * where angleDeg is between 225 and 315 (right zone).
 * Returns null if no results in that range.
 */
export function scanRight(
  scanResults: { angleDeg: number; distanceCm: number }[],
): { angleDeg: number; distanceCm: number } | null {
  const rightResults = scanResults.filter(r => r.angleDeg >= 225 && r.angleDeg <= 315);
  if (rightResults.length === 0) {
    return null;
  }

  let best = rightResults[0];
  for (let i = 1; i < rightResults.length; i++) {
    if (rightResults[i].distanceCm > best.distanceCm) {
      best = rightResults[i];
    }
  }

  return { angleDeg: best.angleDeg, distanceCm: best.distanceCm };
}

/**
 * Get the current avoidance state from an ObstacleAvoidanceModel.
 * Simple accessor for Blockly integration.
 */
export function getAvoidanceState(
  avoidance: ObstacleAvoidanceModel,
): AvoidanceState {
  return avoidance.avoidanceState;
}

// ═══════════════════════════════════════════════════════════════
// OBSTACLE AVOIDANCE REGISTRY
// ═══════════════════════════════════════════════════════════════

/**
 * Registry helper — maintains Map + insertion-order array with deep-copy safety.
 * Identical pattern to LineFollowingRegistry.
 */
export class ObstacleAvoidanceRegistry<T> {
  private items = new Map<string, T>();
  private order: string[] = [];

  /** Register a new item. Deep-copies on write. */
  register(id: string, item: T): void {
    this.items.set(id, safeDeepCopy(item));
    if (!this.order.includes(id)) {
      this.order.push(id);
    }
  }

  /** Get an item by ID. Returns a deep copy or undefined. */
  get(id: string): T | undefined {
    const item = this.items.get(id);
    return item ? safeDeepCopy(item) : undefined;
  }

  /** Get all items in insertion order. Returns deep copies. */
  getAll(): T[] {
    return this.order
      .map(id => this.items.get(id))
      .filter((item): item is T => item !== undefined)
      .map(item => safeDeepCopy(item));
  }

  /** Update an existing item with partial data. Deep-copies on write. */
  update(id: string, updates: Partial<T>): boolean {
    const existing = this.items.get(id);
    if (!existing) {
      return false;
    }
    this.items.set(id, safeDeepCopy({ ...existing, ...updates } as T));
    return true;
  }

  /** Remove an item by ID. */
  remove(id: string): boolean {
    const existed = this.items.has(id);
    this.items.delete(id);
    this.order = this.order.filter(e => e !== id);
    return existed;
  }

  /** Clear all items. */
  clear(): void {
    this.items.clear();
    this.order = [];
  }

  /** Get all keys in insertion order. Returns a copy of the order array. */
  keys(): string[] {
    return [...this.order];
  }

  /** Check if an item exists by ID. */
  has(id: string): boolean {
    return this.items.has(id);
  }

  /** Get the number of registered items. */
  get size(): number {
    return this.items.size;
  }
}

// ═══════════════════════════════════════════════════════════════
// OBSTACLE AVOIDANCE SYNCHRONIZER
// ═══════════════════════════════════════════════════════════════

/**
 * ObstacleAvoidanceSynchronizer — manages all obstacle avoidance registries
 * and provides snapshot/serialization support.
 */
export class ObstacleAvoidanceSynchronizer {
  public obstacleAvoidances = new ObstacleAvoidanceRegistry<ObstacleAvoidanceModel>();
  public avoidanceRules = new ObstacleAvoidanceRegistry<AvoidanceRuleModel>();
  public obstacleDetections = new ObstacleAvoidanceRegistry<ObstacleDetectionModel>();
  public navigationDecisions = new ObstacleAvoidanceRegistry<NavigationDecisionModel>();
  public safeZones = new ObstacleAvoidanceRegistry<SafeZoneModel>();
  public collisionPredictions = new ObstacleAvoidanceRegistry<CollisionPredictionModel>();

  /** Build snapshot — returns an ObstacleAvoidanceSnapshot. */
  public buildSnapshot(): ObstacleAvoidanceSnapshot {
    return this.toJSON();
  }

  /** Clear all registries. */
  public clear(): void {
    this.obstacleAvoidances.clear();
    this.avoidanceRules.clear();
    this.obstacleDetections.clear();
    this.navigationDecisions.clear();
    this.safeZones.clear();
    this.collisionPredictions.clear();
  }

  /** Clone with deep copy. */
  public clone(): ObstacleAvoidanceSynchronizer {
    const cloned = new ObstacleAvoidanceSynchronizer();
    cloned.fromJSON(this.toJSON());
    return cloned;
  }

  /** Export to JSON snapshot. */
  public toJSON(): ObstacleAvoidanceSnapshot {
    return {
      obstacleAvoidances: this.obstacleAvoidances.getAll(),
      avoidanceRules: this.avoidanceRules.getAll(),
      obstacleDetections: this.obstacleDetections.getAll(),
      navigationDecisions: this.navigationDecisions.getAll(),
      safeZones: this.safeZones.getAll(),
      collisionPredictions: this.collisionPredictions.getAll(),
    };
  }

  /** Import from JSON snapshot. */
  public fromJSON(data: ObstacleAvoidanceSnapshot | null | undefined): void {
    this.clear();
    if (!data) return;

    if (Array.isArray(data.obstacleAvoidances)) {
      for (const m of data.obstacleAvoidances) this.obstacleAvoidances.register(m.avoidanceId, m);
    }
    if (Array.isArray(data.avoidanceRules)) {
      for (const m of data.avoidanceRules) this.avoidanceRules.register(m.ruleId, m);
    }
    if (Array.isArray(data.obstacleDetections)) {
      for (const m of data.obstacleDetections) this.obstacleDetections.register(m.detectionId, m);
    }
    if (Array.isArray(data.navigationDecisions)) {
      for (const m of data.navigationDecisions) this.navigationDecisions.register(m.decisionId, m);
    }
    if (Array.isArray(data.safeZones)) {
      for (const m of data.safeZones) this.safeZones.register(m.zoneId, m);
    }
    if (Array.isArray(data.collisionPredictions)) {
      for (const m of data.collisionPredictions) this.collisionPredictions.register(m.predictionId, m);
    }
  }
}
