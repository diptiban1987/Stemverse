// ═══════════════════════════════════════════════════════════════
// Phase 25A: Virtual Line Following Sensor Runtime
// Deterministic metadata-only line following sensor simulation.
// Supports IR line sensors, track geometry (straight/curve),
// sensor calibration, analog/digital classification, edge
// confidence, intersection/marker detection, and servo-mounted
// sensor integration with differential drive robots.
// No Canvas, no WebGL, no Pixi. Simulation data only.
// ═══════════════════════════════════════════════════════════════

import {
  TrackColor,
  SensorState,
  TrackType,
  LineTrackModel,
  LineSensorModel,
  TrackSegmentModel,
  TrackIntersectionModel,
  TrackMarkerModel,
  SensorReadingModel,
  LineFollowingSnapshot,
} from '../types';

// ─── Deep Copy Helper ───────────────────────────────────────────

function safeDeepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

/** Default track width in cm */
export const DEFAULT_LINE_TRACK_WIDTH_CM = 2.0;

/** Default sensor threshold for digital detection */
export const DEFAULT_LINE_SENSOR_THRESHOLD = 2000;

/** Default ADC maximum value (12-bit) */
export const DEFAULT_LINE_ADC_MAX = 4095;

/** Default ADC noise floor */
export const DEFAULT_LINE_ADC_NOISE_FLOOR = 80;

/** Default sensor offset from robot center in cm */
export const DEFAULT_LINE_SENSOR_OFFSET_CM = 3.5;

/** Default edge margin around threshold for edge classification */
export const DEFAULT_LINE_EDGE_MARGIN = 300;

/** Default maximum stored sensor readings */
export const DEFAULT_LINE_MAX_READINGS = 500;

/** Default number of calibration samples */
export const DEFAULT_LINE_CALIBRATION_SAMPLES = 10;

/** Valid track colors */
export const VALID_LINE_TRACK_COLORS: TrackColor[] = ['BLACK', 'WHITE', 'RED', 'GREEN', 'BLUE', 'CUSTOM'];

/** Valid sensor states */
export const VALID_LINE_SENSOR_STATES: SensorState[] = ['IDLE', 'CALIBRATING', 'ACTIVE', 'ERROR', 'DISABLED'];

/** Valid track segment types */
export const VALID_LINE_TRACK_TYPES: TrackType[] = ['STRAIGHT', 'CURVE', 'LOOP', 'JUNCTION', 'INTERSECTION', 'CHECKPOINT'];

/** Valid sensor positions on robot */
export const VALID_LINE_SENSOR_POSITIONS: LineSensorModel['sensorPosition'][] = ['LEFT_SENSOR', 'CENTER_SENSOR', 'RIGHT_SENSOR', 'CUSTOM'];

/** Valid track marker types */
export const VALID_LINE_MARKER_TYPES: TrackMarkerModel['markerType'][] = ['CHECKPOINT', 'START', 'FINISH', 'WAYPOINT'];

/** Valid detected color classifications */
export const VALID_LINE_DETECTED_COLORS: SensorReadingModel['detectedColor'][] = ['BLACK', 'WHITE', 'EDGE', 'UNKNOWN'];

// ═══════════════════════════════════════════════════════════════
// VALIDATION WARNING TYPE
// ═══════════════════════════════════════════════════════════════

export interface LineFollowingValidationWarning {
  code: string;
  message: string;
}

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function createDefaultLineTrackModel(
  trackId: string,
  overrides: Partial<LineTrackModel> = {},
): LineTrackModel {
  return {
    trackName: '',
    trackColor: 'BLACK',
    backgroundColor: 'WHITE',
    trackWidthCm: DEFAULT_LINE_TRACK_WIDTH_CM,
    totalLengthCm: 0,
    originX: 0,
    originY: 0,
    isClosedLoop: false,
    timestamp: 0,
    futureLineTrackHints: {},
    ...overrides,
    trackId,
  };
}

export function createDefaultLineSensorModel(
  sensorId: string,
  overrides: Partial<LineSensorModel> = {},
): LineSensorModel {
  return {
    driveId: '',
    sensorPosition: 'CENTER_SENSOR',
    sensorOffsetXCm: 0,
    sensorOffsetYCm: DEFAULT_LINE_SENSOR_OFFSET_CM,
    sensorAngleDeg: 0,
    servoMountId: '',
    sensorState: 'IDLE',
    analogValue: 0,
    digitalValue: false,
    threshold: DEFAULT_LINE_SENSOR_THRESHOLD,
    edgeConfidence: 0,
    lastReadTimestamp: 0,
    futureSensorHints: {},
    ...overrides,
    sensorId,
  };
}

export function createDefaultTrackSegmentModel(
  segmentId: string,
  overrides: Partial<TrackSegmentModel> = {},
): TrackSegmentModel {
  return {
    trackId: '',
    segmentType: 'STRAIGHT',
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    curveCenterX: 0,
    curveCenterY: 0,
    curveRadiusCm: 0,
    curveStartAngleDeg: 0,
    curveSweepAngleDeg: 0,
    lengthCm: 0,
    orderIndex: 0,
    futureSegmentHints: {},
    ...overrides,
    segmentId,
  };
}

export function createDefaultTrackIntersectionModel(
  intersectionId: string,
  overrides: Partial<TrackIntersectionModel> = {},
): TrackIntersectionModel {
  const base: TrackIntersectionModel = {
    trackId: '',
    positionX: 0,
    positionY: 0,
    connectedSegmentIds: [],
    intersectionAngleDeg: 0,
    futureIntersectionHints: {},
    ...overrides,
    intersectionId,
  };
  // Deep-copy connectedSegmentIds to avoid shared references
  base.connectedSegmentIds = safeDeepCopy(base.connectedSegmentIds);
  return base;
}

export function createDefaultTrackMarkerModel(
  markerId: string,
  overrides: Partial<TrackMarkerModel> = {},
): TrackMarkerModel {
  return {
    trackId: '',
    segmentId: '',
    positionAlongSegment: 0,
    markerType: 'CHECKPOINT',
    positionX: 0,
    positionY: 0,
    futureMarkerHints: {},
    ...overrides,
    markerId,
  };
}

export function createDefaultSensorReadingModel(
  readingId: string,
  overrides: Partial<SensorReadingModel> = {},
): SensorReadingModel {
  return {
    sensorId: '',
    driveId: '',
    analogValue: 0,
    digitalValue: false,
    detectedColor: 'UNKNOWN',
    distanceFromCenterLineCm: 0,
    nearestSegmentId: '',
    nearestIntersectionId: '',
    timestamp: 0,
    futureSensorReadingHints: {},
    ...overrides,
    readingId,
  };
}

// ═══════════════════════════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════════════════════════

export function validateLineTrackModel(
  model: LineTrackModel | null | undefined,
  warnPrefix = '[LineTrack]',
): LineFollowingValidationWarning[] {
  const warnings: LineFollowingValidationWarning[] = [];
  if (!model) {
    warnings.push({ code: 'NULL_MODEL', message: `${warnPrefix} Model is null or undefined.` });
    return warnings;
  }
  if (!model.trackId) {
    warnings.push({ code: 'EMPTY_TRACK_ID', message: `${warnPrefix} trackId is empty.` });
  }
  if (model.trackWidthCm <= 0) {
    warnings.push({ code: 'INVALID_TRACK_WIDTH', message: `${warnPrefix} trackWidthCm must be > 0, got ${model.trackWidthCm}.` });
  }
  if (model.totalLengthCm < 0) {
    warnings.push({ code: 'NEGATIVE_TOTAL_LENGTH', message: `${warnPrefix} totalLengthCm must be >= 0, got ${model.totalLengthCm}.` });
  }
  if (!VALID_LINE_TRACK_COLORS.includes(model.trackColor)) {
    warnings.push({ code: 'INVALID_TRACK_COLOR', message: `${warnPrefix} Invalid trackColor: "${model.trackColor}".` });
  }
  if (!VALID_LINE_TRACK_COLORS.includes(model.backgroundColor)) {
    warnings.push({ code: 'INVALID_BACKGROUND_COLOR', message: `${warnPrefix} Invalid backgroundColor: "${model.backgroundColor}".` });
  }
  return warnings;
}

export function validateLineSensorModel(
  model: LineSensorModel | null | undefined,
  warnPrefix = '[LineSensor]',
): LineFollowingValidationWarning[] {
  const warnings: LineFollowingValidationWarning[] = [];
  if (!model) {
    warnings.push({ code: 'NULL_MODEL', message: `${warnPrefix} Model is null or undefined.` });
    return warnings;
  }
  if (!model.sensorId) {
    warnings.push({ code: 'EMPTY_SENSOR_ID', message: `${warnPrefix} sensorId is empty.` });
  }
  if (!model.driveId) {
    warnings.push({ code: 'EMPTY_DRIVE_ID', message: `${warnPrefix} driveId is empty.` });
  }
  if (!VALID_LINE_SENSOR_POSITIONS.includes(model.sensorPosition)) {
    warnings.push({ code: 'INVALID_SENSOR_POSITION', message: `${warnPrefix} Invalid sensorPosition: "${model.sensorPosition}".` });
  }
  if (!VALID_LINE_SENSOR_STATES.includes(model.sensorState)) {
    warnings.push({ code: 'INVALID_SENSOR_STATE', message: `${warnPrefix} Invalid sensorState: "${model.sensorState}".` });
  }
  if (model.threshold < 0) {
    warnings.push({ code: 'NEGATIVE_THRESHOLD', message: `${warnPrefix} threshold must be >= 0, got ${model.threshold}.` });
  }
  if (model.threshold > DEFAULT_LINE_ADC_MAX) {
    warnings.push({ code: 'THRESHOLD_EXCEEDS_ADC_MAX', message: `${warnPrefix} threshold must be <= ${DEFAULT_LINE_ADC_MAX}, got ${model.threshold}.` });
  }
  if (model.analogValue < 0) {
    warnings.push({ code: 'NEGATIVE_ANALOG_VALUE', message: `${warnPrefix} analogValue must be >= 0, got ${model.analogValue}.` });
  }
  if (model.analogValue > DEFAULT_LINE_ADC_MAX) {
    warnings.push({ code: 'ANALOG_VALUE_EXCEEDS_ADC_MAX', message: `${warnPrefix} analogValue must be <= ${DEFAULT_LINE_ADC_MAX}, got ${model.analogValue}.` });
  }
  if (model.edgeConfidence < 0) {
    warnings.push({ code: 'NEGATIVE_EDGE_CONFIDENCE', message: `${warnPrefix} edgeConfidence must be >= 0, got ${model.edgeConfidence}.` });
  }
  if (model.edgeConfidence > 1) {
    warnings.push({ code: 'EDGE_CONFIDENCE_EXCEEDS_1', message: `${warnPrefix} edgeConfidence must be <= 1, got ${model.edgeConfidence}.` });
  }
  return warnings;
}

export function validateTrackSegmentModel(
  model: TrackSegmentModel | null | undefined,
  warnPrefix = '[TrackSegment]',
): LineFollowingValidationWarning[] {
  const warnings: LineFollowingValidationWarning[] = [];
  if (!model) {
    warnings.push({ code: 'NULL_MODEL', message: `${warnPrefix} Model is null or undefined.` });
    return warnings;
  }
  if (!model.segmentId) {
    warnings.push({ code: 'EMPTY_SEGMENT_ID', message: `${warnPrefix} segmentId is empty.` });
  }
  if (!model.trackId) {
    warnings.push({ code: 'EMPTY_TRACK_ID', message: `${warnPrefix} trackId is empty.` });
  }
  if (!VALID_LINE_TRACK_TYPES.includes(model.segmentType)) {
    warnings.push({ code: 'INVALID_SEGMENT_TYPE', message: `${warnPrefix} Invalid segmentType: "${model.segmentType}".` });
  }
  if (model.lengthCm < 0) {
    warnings.push({ code: 'NEGATIVE_LENGTH', message: `${warnPrefix} lengthCm must be >= 0, got ${model.lengthCm}.` });
  }
  if (model.orderIndex < 0) {
    warnings.push({ code: 'NEGATIVE_ORDER_INDEX', message: `${warnPrefix} orderIndex must be >= 0, got ${model.orderIndex}.` });
  }
  if (model.curveRadiusCm < 0) {
    warnings.push({ code: 'NEGATIVE_CURVE_RADIUS', message: `${warnPrefix} curveRadiusCm must be >= 0, got ${model.curveRadiusCm}.` });
  }
  return warnings;
}

export function validateTrackIntersectionModel(
  model: TrackIntersectionModel | null | undefined,
  warnPrefix = '[TrackIntersection]',
): LineFollowingValidationWarning[] {
  const warnings: LineFollowingValidationWarning[] = [];
  if (!model) {
    warnings.push({ code: 'NULL_MODEL', message: `${warnPrefix} Model is null or undefined.` });
    return warnings;
  }
  if (!model.intersectionId) {
    warnings.push({ code: 'EMPTY_INTERSECTION_ID', message: `${warnPrefix} intersectionId is empty.` });
  }
  if (!model.trackId) {
    warnings.push({ code: 'EMPTY_TRACK_ID', message: `${warnPrefix} trackId is empty.` });
  }
  if (!Array.isArray(model.connectedSegmentIds)) {
    warnings.push({ code: 'INVALID_CONNECTED_SEGMENTS', message: `${warnPrefix} connectedSegmentIds must be an array.` });
  }
  return warnings;
}

export function validateTrackMarkerModel(
  model: TrackMarkerModel | null | undefined,
  warnPrefix = '[TrackMarker]',
): LineFollowingValidationWarning[] {
  const warnings: LineFollowingValidationWarning[] = [];
  if (!model) {
    warnings.push({ code: 'NULL_MODEL', message: `${warnPrefix} Model is null or undefined.` });
    return warnings;
  }
  if (!model.markerId) {
    warnings.push({ code: 'EMPTY_MARKER_ID', message: `${warnPrefix} markerId is empty.` });
  }
  if (!model.trackId) {
    warnings.push({ code: 'EMPTY_TRACK_ID', message: `${warnPrefix} trackId is empty.` });
  }
  if (model.positionAlongSegment < 0 || model.positionAlongSegment > 1) {
    warnings.push({ code: 'INVALID_POSITION_ALONG_SEGMENT', message: `${warnPrefix} positionAlongSegment must be 0–1, got ${model.positionAlongSegment}.` });
  }
  if (!VALID_LINE_MARKER_TYPES.includes(model.markerType)) {
    warnings.push({ code: 'INVALID_MARKER_TYPE', message: `${warnPrefix} Invalid markerType: "${model.markerType}".` });
  }
  return warnings;
}

export function validateSensorReadingModel(
  model: SensorReadingModel | null | undefined,
  warnPrefix = '[SensorReading]',
): LineFollowingValidationWarning[] {
  const warnings: LineFollowingValidationWarning[] = [];
  if (!model) {
    warnings.push({ code: 'NULL_MODEL', message: `${warnPrefix} Model is null or undefined.` });
    return warnings;
  }
  if (!model.readingId) {
    warnings.push({ code: 'EMPTY_READING_ID', message: `${warnPrefix} readingId is empty.` });
  }
  if (!model.sensorId) {
    warnings.push({ code: 'EMPTY_SENSOR_ID', message: `${warnPrefix} sensorId is empty.` });
  }
  if (model.analogValue < 0) {
    warnings.push({ code: 'NEGATIVE_ANALOG_VALUE', message: `${warnPrefix} analogValue must be >= 0, got ${model.analogValue}.` });
  }
  if (model.analogValue > DEFAULT_LINE_ADC_MAX) {
    warnings.push({ code: 'ANALOG_VALUE_EXCEEDS_ADC_MAX', message: `${warnPrefix} analogValue must be <= ${DEFAULT_LINE_ADC_MAX}, got ${model.analogValue}.` });
  }
  if (!VALID_LINE_DETECTED_COLORS.includes(model.detectedColor)) {
    warnings.push({ code: 'INVALID_DETECTED_COLOR', message: `${warnPrefix} Invalid detectedColor: "${model.detectedColor}".` });
  }
  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// DUPLICATE VALIDATORS
// ═══════════════════════════════════════════════════════════════

export function validateDuplicateLineTrackIds(
  models: LineTrackModel[],
  warnPrefix = '[LineTrack]',
): LineFollowingValidationWarning[] {
  const seen = new Set<string>();
  const warnings: LineFollowingValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.trackId)) {
      warnings.push({ code: 'DUPLICATE_TRACK_ID', message: `${warnPrefix} Duplicate trackId: "${m.trackId}".` });
    }
    seen.add(m.trackId);
  }
  return warnings;
}

export function validateDuplicateLineSensorIds(
  models: LineSensorModel[],
  warnPrefix = '[LineSensor]',
): LineFollowingValidationWarning[] {
  const seen = new Set<string>();
  const warnings: LineFollowingValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.sensorId)) {
      warnings.push({ code: 'DUPLICATE_SENSOR_ID', message: `${warnPrefix} Duplicate sensorId: "${m.sensorId}".` });
    }
    seen.add(m.sensorId);
  }
  return warnings;
}

export function validateDuplicateTrackSegmentIds(
  models: TrackSegmentModel[],
  warnPrefix = '[TrackSegment]',
): LineFollowingValidationWarning[] {
  const seen = new Set<string>();
  const warnings: LineFollowingValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.segmentId)) {
      warnings.push({ code: 'DUPLICATE_SEGMENT_ID', message: `${warnPrefix} Duplicate segmentId: "${m.segmentId}".` });
    }
    seen.add(m.segmentId);
  }
  return warnings;
}

export function validateDuplicateTrackIntersectionIds(
  models: TrackIntersectionModel[],
  warnPrefix = '[TrackIntersection]',
): LineFollowingValidationWarning[] {
  const seen = new Set<string>();
  const warnings: LineFollowingValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.intersectionId)) {
      warnings.push({ code: 'DUPLICATE_INTERSECTION_ID', message: `${warnPrefix} Duplicate intersectionId: "${m.intersectionId}".` });
    }
    seen.add(m.intersectionId);
  }
  return warnings;
}

export function validateDuplicateTrackMarkerIds(
  models: TrackMarkerModel[],
  warnPrefix = '[TrackMarker]',
): LineFollowingValidationWarning[] {
  const seen = new Set<string>();
  const warnings: LineFollowingValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.markerId)) {
      warnings.push({ code: 'DUPLICATE_MARKER_ID', message: `${warnPrefix} Duplicate markerId: "${m.markerId}".` });
    }
    seen.add(m.markerId);
  }
  return warnings;
}

export function validateDuplicateSensorReadingIds(
  models: SensorReadingModel[],
  warnPrefix = '[SensorReading]',
): LineFollowingValidationWarning[] {
  const seen = new Set<string>();
  const warnings: LineFollowingValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.readingId)) {
      warnings.push({ code: 'DUPLICATE_READING_ID', message: `${warnPrefix} Duplicate readingId: "${m.readingId}".` });
    }
    seen.add(m.readingId);
  }
  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// TRACK GEOMETRY ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate the length of a track segment.
 * STRAIGHT: Euclidean distance between start and end.
 * CURVE: |radius × sweepAngle in radians|.
 * Others: return segment.lengthCm as-is.
 */
export function calculateSegmentLength(
  segment: TrackSegmentModel,
): number {
  if (segment.segmentType === 'STRAIGHT') {
    const dx = segment.endX - segment.startX;
    const dy = segment.endY - segment.startY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  if (segment.segmentType === 'CURVE') {
    return Math.abs(segment.curveRadiusCm * segment.curveSweepAngleDeg * Math.PI / 180);
  }
  return segment.lengthCm;
}

/**
 * Get a point along a segment at parameter t ∈ [0, 1].
 * STRAIGHT: linear interpolation from start to end.
 * CURVE: point on arc from center + R × [cos, sin].
 * Others: fallback to linear interpolation.
 */
export function getPointOnSegment(
  segment: TrackSegmentModel,
  t: number,
): { x: number; y: number } {
  const clampedT = Math.max(0, Math.min(1, t));

  if (segment.segmentType === 'STRAIGHT') {
    return {
      x: segment.startX + clampedT * (segment.endX - segment.startX),
      y: segment.startY + clampedT * (segment.endY - segment.startY),
    };
  }

  if (segment.segmentType === 'CURVE') {
    const startAngleRad = segment.curveStartAngleDeg * Math.PI / 180;
    const sweepRad = segment.curveSweepAngleDeg * Math.PI / 180;
    const angle = startAngleRad + clampedT * sweepRad;
    return {
      x: segment.curveCenterX + segment.curveRadiusCm * Math.cos(angle),
      y: segment.curveCenterY + segment.curveRadiusCm * Math.sin(angle),
    };
  }

  // Fallback: linear interpolation
  return {
    x: segment.startX + clampedT * (segment.endX - segment.startX),
    y: segment.startY + clampedT * (segment.endY - segment.startY),
  };
}

/**
 * Find the nearest point on a segment to a given point (px, py).
 * Returns nearest point coordinates, parameter t, and distance.
 */
export function getNearestPointOnSegment(
  segment: TrackSegmentModel,
  px: number,
  py: number,
): { x: number; y: number; t: number; distance: number } {
  if (segment.segmentType === 'STRAIGHT') {
    const dx = segment.endX - segment.startX;
    const dy = segment.endY - segment.startY;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) {
      // Degenerate segment (zero length)
      const dist = Math.sqrt(
        (px - segment.startX) * (px - segment.startX) +
        (py - segment.startY) * (py - segment.startY),
      );
      return { x: segment.startX, y: segment.startY, t: 0, distance: dist };
    }

    // Project point onto line, clamp t to [0, 1]
    let t = ((px - segment.startX) * dx + (py - segment.startY) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const nearX = segment.startX + t * dx;
    const nearY = segment.startY + t * dy;
    const distance = Math.sqrt((px - nearX) * (px - nearX) + (py - nearY) * (py - nearY));

    return { x: nearX, y: nearY, t, distance };
  }

  if (segment.segmentType === 'CURVE') {
    const cxDiff = px - segment.curveCenterX;
    const cyDiff = py - segment.curveCenterY;
    const pointAngle = Math.atan2(cyDiff, cxDiff);

    const startAngleRad = segment.curveStartAngleDeg * Math.PI / 180;
    const sweepRad = segment.curveSweepAngleDeg * Math.PI / 180;

    // Normalize angle relative to arc start
    let relAngle = pointAngle - startAngleRad;

    // Normalize relAngle to the range that makes sense for the sweep direction
    if (sweepRad >= 0) {
      relAngle = ((relAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    } else {
      relAngle = ((relAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      relAngle = relAngle - 2 * Math.PI;
    }

    // Calculate t parameter
    let t = sweepRad !== 0 ? relAngle / sweepRad : 0;
    t = Math.max(0, Math.min(1, t));

    const angle = startAngleRad + t * sweepRad;
    const nearX = segment.curveCenterX + segment.curveRadiusCm * Math.cos(angle);
    const nearY = segment.curveCenterY + segment.curveRadiusCm * Math.sin(angle);
    const distance = Math.sqrt((px - nearX) * (px - nearX) + (py - nearY) * (py - nearY));

    return { x: nearX, y: nearY, t, distance };
  }

  // Fallback: treat as straight
  const dx = segment.endX - segment.startX;
  const dy = segment.endY - segment.startY;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    const dist = Math.sqrt(
      (px - segment.startX) * (px - segment.startX) +
      (py - segment.startY) * (py - segment.startY),
    );
    return { x: segment.startX, y: segment.startY, t: 0, distance: dist };
  }

  let t = ((px - segment.startX) * dx + (py - segment.startY) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const nearX = segment.startX + t * dx;
  const nearY = segment.startY + t * dy;
  const distance = Math.sqrt((px - nearX) * (px - nearX) + (py - nearY) * (py - nearY));

  return { x: nearX, y: nearY, t, distance };
}

/**
 * Calculate the heading (tangent direction) at parameter t on a segment.
 * Returns angle in degrees.
 */
export function calculateSegmentHeading(
  segment: TrackSegmentModel,
  t: number,
): number {
  if (segment.segmentType === 'STRAIGHT') {
    const dx = segment.endX - segment.startX;
    const dy = segment.endY - segment.startY;
    return Math.atan2(dy, dx) * 180 / Math.PI;
  }

  if (segment.segmentType === 'CURVE') {
    const startAngleRad = segment.curveStartAngleDeg * Math.PI / 180;
    const sweepRad = segment.curveSweepAngleDeg * Math.PI / 180;
    const angle = startAngleRad + Math.max(0, Math.min(1, t)) * sweepRad;
    // Tangent is perpendicular to the radius direction
    // For positive sweep (CCW), tangent = angle + π/2
    // For negative sweep (CW), tangent = angle - π/2
    const tangentAngle = sweepRad >= 0 ? angle + Math.PI / 2 : angle - Math.PI / 2;
    return tangentAngle * 180 / Math.PI;
  }

  // Fallback
  const dx = segment.endX - segment.startX;
  const dy = segment.endY - segment.startY;
  return Math.atan2(dy, dx) * 180 / Math.PI;
}

/**
 * Check if a point is near any segment of the track.
 * Returns true if the nearest segment has a distance within trackWidthCm/2.
 */
export function isPointNearTrack(
  segments: TrackSegmentModel[],
  px: number,
  py: number,
  trackWidthCm: number,
): boolean {
  const halfWidth = trackWidthCm / 2;
  for (const seg of segments) {
    const nearest = getNearestPointOnSegment(seg, px, py);
    if (nearest.distance <= halfWidth) {
      return true;
    }
  }
  return false;
}

/**
 * Build a polyline approximation of the track by sampling each segment.
 * Each segment is sampled at `resolution` evenly spaced t values.
 */
export function buildTrackPolyline(
  segments: TrackSegmentModel[],
  resolution: number = 20,
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const safeResolution = Math.max(2, resolution);

  for (const seg of segments) {
    for (let i = 0; i < safeResolution; i++) {
      const t = i / (safeResolution - 1);
      points.push(getPointOnSegment(seg, t));
    }
  }

  return points;
}

// ═══════════════════════════════════════════════════════════════
// IR SENSOR DETECTION ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate the world position of a sensor given robot pose and sensor offsets.
 * worldX = robotX + offsetXCm × cos(heading) − offsetYCm × sin(heading)
 * worldY = robotY + offsetXCm × sin(heading) + offsetYCm × cos(heading)
 */
export function calculateSensorWorldPosition(
  robotX: number,
  robotY: number,
  headingDeg: number,
  offsetXCm: number,
  offsetYCm: number,
  sensorAngleDeg: number,
): { x: number; y: number; angleDeg: number } {
  const headingRad = headingDeg * Math.PI / 180;

  const worldX = robotX + offsetXCm * Math.cos(headingRad) - offsetYCm * Math.sin(headingRad);
  const worldY = robotY + offsetXCm * Math.sin(headingRad) + offsetYCm * Math.cos(headingRad);
  const angleDeg = headingDeg + sensorAngleDeg;

  return { x: worldX, y: worldY, angleDeg };
}

/**
 * Sample the track at a given point to find the closest segment.
 * Returns the nearest distance from center line, segment ID, and parameter t.
 */
export function sampleTrackAtPoint(
  segments: TrackSegmentModel[],
  px: number,
  py: number,
  trackWidthCm: number,
): { nearestDistance: number; nearestSegmentId: string; nearestT: number } {
  let nearestDistance = Infinity;
  let nearestSegmentId = '';
  let nearestT = 0;

  for (const seg of segments) {
    const result = getNearestPointOnSegment(seg, px, py);
    if (result.distance < nearestDistance) {
      nearestDistance = result.distance;
      nearestSegmentId = seg.segmentId;
      nearestT = result.t;
    }
  }

  return { nearestDistance, nearestSegmentId, nearestT };
}

/**
 * Calculate the analog ADC value based on distance from the track center line.
 * On line (dist < trackWidth/2): ADC_MAX × max(0, 1 − dist/(trackWidth/2)).
 * Off line: noiseFloor.
 * Result is clamped to [0, adcMax].
 */
export function calculateAnalogValue(
  distanceFromCenterCm: number,
  trackWidthCm: number,
  adcMax: number = DEFAULT_LINE_ADC_MAX,
  noiseFloor: number = DEFAULT_LINE_ADC_NOISE_FLOOR,
): number {
  const halfWidth = trackWidthCm / 2;

  let value: number;
  if (distanceFromCenterCm < halfWidth) {
    value = adcMax * Math.max(0, 1 - distanceFromCenterCm / halfWidth);
  } else {
    value = noiseFloor;
  }

  return Math.max(0, Math.min(adcMax, Math.round(value)));
}

/**
 * Calculate digital (boolean) value from analog reading and threshold.
 * Returns true if analogValue >= threshold.
 */
export function calculateDigitalValue(
  analogValue: number,
  threshold: number,
): boolean {
  return analogValue >= threshold;
}

/**
 * Calculate edge confidence — how close the reading is to the threshold.
 * Within edgeMargin of threshold: 1 − |analogValue − threshold| / edgeMargin.
 * Clamped to [0, 1].
 */
export function calculateEdgeConfidence(
  analogValue: number,
  threshold: number,
  edgeMargin: number = DEFAULT_LINE_EDGE_MARGIN,
): number {
  if (edgeMargin <= 0) return 0;

  const distance = Math.abs(analogValue - threshold);
  if (distance >= edgeMargin) return 0;

  return Math.max(0, Math.min(1, 1 - distance / edgeMargin));
}

/**
 * Classify the detected color based on analog value relative to threshold.
 * BLACK: analogValue >= threshold + edgeMargin
 * WHITE: analogValue <= threshold − edgeMargin
 * EDGE: within edgeMargin of threshold
 * UNKNOWN: analogValue < 0
 */
export function classifyDetectedColor(
  analogValue: number,
  threshold: number,
  edgeMargin: number = DEFAULT_LINE_EDGE_MARGIN,
): 'BLACK' | 'WHITE' | 'EDGE' | 'UNKNOWN' {
  if (analogValue < 0) return 'UNKNOWN';
  if (analogValue >= threshold + edgeMargin) return 'BLACK';
  if (analogValue <= threshold - edgeMargin) return 'WHITE';
  return 'EDGE';
}

// ═══════════════════════════════════════════════════════════════
// SENSOR CALIBRATION
// ═══════════════════════════════════════════════════════════════

/**
 * Calibrate a sensor by setting threshold to midpoint of white and black values.
 * Sets sensor state to 'ACTIVE'.
 * Returns a new LineSensorModel (immutable).
 */
export function calibrateSensor(
  sensor: LineSensorModel,
  whiteValue: number,
  blackValue: number,
): LineSensorModel {
  const threshold = Math.round((whiteValue + blackValue) / 2);
  return {
    ...safeDeepCopy(sensor),
    threshold: Math.max(0, Math.min(DEFAULT_LINE_ADC_MAX, threshold)),
    sensorState: 'ACTIVE',
  };
}

/**
 * Apply a calibration offset to the sensor's threshold.
 * Clamps result to [0, ADC_MAX].
 * Returns a new LineSensorModel (immutable).
 */
export function applyCalibrationOffset(
  sensor: LineSensorModel,
  offsetValue: number,
): LineSensorModel {
  const newThreshold = Math.max(0, Math.min(DEFAULT_LINE_ADC_MAX, sensor.threshold + offsetValue));
  return {
    ...safeDeepCopy(sensor),
    threshold: newThreshold,
  };
}

/**
 * Reset sensor calibration to defaults.
 * Returns a new LineSensorModel (immutable).
 */
export function resetCalibration(
  sensor: LineSensorModel,
): LineSensorModel {
  return {
    ...safeDeepCopy(sensor),
    threshold: DEFAULT_LINE_SENSOR_THRESHOLD,
    sensorState: 'IDLE',
  };
}

// ═══════════════════════════════════════════════════════════════
// DIFFERENTIAL DRIVE INTEGRATION
// ═══════════════════════════════════════════════════════════════

/**
 * Update sensor positions based on robot pose.
 * For each sensor: compute world position from offsets and heading.
 * If servoMountId is set, adds servoAngleDeg to sensorAngleDeg.
 * Returns a new array of updated sensor models (immutable).
 */
export function updateSensorPositionsForDrive(
  sensors: LineSensorModel[],
  robotX: number,
  robotY: number,
  headingDeg: number,
  servoAngleDeg: number = 0,
): LineSensorModel[] {
  return sensors.map(sensor => {
    const effectiveAngle = sensor.servoMountId
      ? sensor.sensorAngleDeg + servoAngleDeg
      : sensor.sensorAngleDeg;

    const worldPos = calculateSensorWorldPosition(
      robotX, robotY, headingDeg,
      sensor.sensorOffsetXCm, sensor.sensorOffsetYCm,
      effectiveAngle,
    );

    return {
      ...safeDeepCopy(sensor),
      // Store world position info via the future hints for downstream use
      futureSensorHints: {
        ...sensor.futureSensorHints,
        _worldX: worldPos.x,
        _worldY: worldPos.y,
        _worldAngleDeg: worldPos.angleDeg,
      },
    };
  });
}

/**
 * Calculate distance from the nearest track segment center line.
 * Returns signed distance: negative = left of center, positive = right of center.
 */
export function calculateDistanceFromCenterLine(
  segments: TrackSegmentModel[],
  sensorWorldX: number,
  sensorWorldY: number,
  trackWidthCm: number,
): number {
  if (segments.length === 0) return Infinity;

  let bestDist = Infinity;
  let bestSegment: TrackSegmentModel | null = null;
  let bestT = 0;

  for (const seg of segments) {
    const result = getNearestPointOnSegment(seg, sensorWorldX, sensorWorldY);
    if (result.distance < Math.abs(bestDist)) {
      bestDist = result.distance;
      bestSegment = seg;
      bestT = result.t;
    }
  }

  if (!bestSegment) return Infinity;

  // Determine sign based on cross product (left vs right of heading)
  const headingDeg = calculateSegmentHeading(bestSegment, bestT);
  const headingRad = headingDeg * Math.PI / 180;
  const nearPoint = getPointOnSegment(bestSegment, bestT);
  const dx = sensorWorldX - nearPoint.x;
  const dy = sensorWorldY - nearPoint.y;

  // Cross product of heading direction × point offset
  const cross = Math.cos(headingRad) * dy - Math.sin(headingRad) * dx;
  const sign = cross >= 0 ? 1 : -1;

  return sign * bestDist;
}

/**
 * Detect the nearest segment to a point.
 * Returns segment info or undefined if no segments.
 */
export function detectNearestSegment(
  segments: TrackSegmentModel[],
  px: number,
  py: number,
): { segmentId: string; distance: number; t: number } | undefined {
  if (segments.length === 0) return undefined;

  let bestDist = Infinity;
  let bestId = '';
  let bestT = 0;

  for (const seg of segments) {
    const result = getNearestPointOnSegment(seg, px, py);
    if (result.distance < bestDist) {
      bestDist = result.distance;
      bestId = seg.segmentId;
      bestT = result.t;
    }
  }

  return { segmentId: bestId, distance: bestDist, t: bestT };
}

/**
 * Detect the nearest intersection within a threshold distance.
 * Returns intersectionId of the nearest intersection, or '' if none within threshold.
 */
export function detectNearestIntersection(
  intersections: TrackIntersectionModel[],
  px: number,
  py: number,
  thresholdCm: number = 5.0,
): string {
  let bestDist = Infinity;
  let bestId = '';

  for (const inter of intersections) {
    const dx = px - inter.positionX;
    const dy = py - inter.positionY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < bestDist && dist <= thresholdCm) {
      bestDist = dist;
      bestId = inter.intersectionId;
    }
  }

  return bestId;
}

// ═══════════════════════════════════════════════════════════════
// SERVO INTEGRATION
// ═══════════════════════════════════════════════════════════════

/**
 * Apply a servo angle to a sensor's orientation.
 * Updates sensorAngleDeg = base angle + servoAngleDeg.
 * Returns a new LineSensorModel (immutable).
 */
export function applySensorServoAngle(
  sensor: LineSensorModel,
  servoAngleDeg: number,
): LineSensorModel {
  return {
    ...safeDeepCopy(sensor),
    sensorAngleDeg: sensor.sensorAngleDeg + servoAngleDeg,
  };
}

/**
 * Calculate a new sensor mount position rotated by the servo angle.
 * Rotates baseOffset by servoAngleDeg.
 */
export function calculateServoMountedPosition(
  baseOffsetX: number,
  baseOffsetY: number,
  servoAngleDeg: number,
): { x: number; y: number } {
  const rad = servoAngleDeg * Math.PI / 180;
  return {
    x: baseOffsetX * Math.cos(rad) - baseOffsetY * Math.sin(rad),
    y: baseOffsetX * Math.sin(rad) + baseOffsetY * Math.cos(rad),
  };
}

// ═══════════════════════════════════════════════════════════════
// BLOCKLY RUNTIME APIs
// ═══════════════════════════════════════════════════════════════

/**
 * Read a single line sensor — the full pipeline:
 * 1. Calculate world position
 * 2. Sample track at that position
 * 3. Compute analog value
 * 4. Compute digital value
 * 5. Classify detected color
 * 6. Create SensorReadingModel
 * Returns a new SensorReadingModel (immutable).
 */
export function readLineSensor(
  sensor: LineSensorModel,
  segments: TrackSegmentModel[],
  robotX: number,
  robotY: number,
  headingDeg: number,
  trackWidthCm: number,
  timestamp: number,
  servoAngleDeg: number = 0,
): SensorReadingModel {
  // 1. Calculate world position
  const effectiveAngle = sensor.servoMountId
    ? sensor.sensorAngleDeg + servoAngleDeg
    : sensor.sensorAngleDeg;

  const worldPos = calculateSensorWorldPosition(
    robotX, robotY, headingDeg,
    sensor.sensorOffsetXCm, sensor.sensorOffsetYCm,
    effectiveAngle,
  );

  // 2. Sample track
  const trackSample = sampleTrackAtPoint(segments, worldPos.x, worldPos.y, trackWidthCm);

  // 3. Analog value
  const analogValue = calculateAnalogValue(trackSample.nearestDistance, trackWidthCm);

  // 4. Digital value
  const digitalValue = calculateDigitalValue(analogValue, sensor.threshold);

  // 5. Classify color
  const detectedColor = classifyDetectedColor(analogValue, sensor.threshold);

  // 6. Edge confidence
  const edgeConfidence = calculateEdgeConfidence(analogValue, sensor.threshold);

  // Build reading
  return createDefaultSensorReadingModel(`reading_${sensor.sensorId}_${timestamp}`, {
    sensorId: sensor.sensorId,
    driveId: sensor.driveId,
    analogValue,
    digitalValue,
    detectedColor,
    distanceFromCenterLineCm: trackSample.nearestDistance,
    nearestSegmentId: trackSample.nearestSegmentId,
    nearestIntersectionId: '',
    timestamp,
    futureSensorReadingHints: {
      edgeConfidence,
      worldX: worldPos.x,
      worldY: worldPos.y,
    },
  });
}

/**
 * Read all line sensors — calls readLineSensor for each sensor.
 * Also detects nearest intersection for each reading.
 * Returns a new array of SensorReadingModel (immutable).
 */
export function readAllLineSensors(
  sensors: LineSensorModel[],
  segments: TrackSegmentModel[],
  intersections: TrackIntersectionModel[],
  robotX: number,
  robotY: number,
  headingDeg: number,
  trackWidthCm: number,
  timestamp: number,
  servoAngleDeg: number = 0,
): SensorReadingModel[] {
  return sensors.map(sensor => {
    const reading = readLineSensor(
      sensor, segments, robotX, robotY, headingDeg,
      trackWidthCm, timestamp, servoAngleDeg,
    );

    // Detect nearest intersection
    const effectiveAngle = sensor.servoMountId
      ? sensor.sensorAngleDeg + servoAngleDeg
      : sensor.sensorAngleDeg;

    const worldPos = calculateSensorWorldPosition(
      robotX, robotY, headingDeg,
      sensor.sensorOffsetXCm, sensor.sensorOffsetYCm,
      effectiveAngle,
    );

    const nearestIntersectionId = detectNearestIntersection(
      intersections, worldPos.x, worldPos.y,
    );

    return {
      ...reading,
      nearestIntersectionId,
    };
  });
}

/**
 * Standalone track sampling — sample the track at a world position.
 * Returns analog value, digital value, and detected color.
 */
export function sampleTrack(
  segments: TrackSegmentModel[],
  worldX: number,
  worldY: number,
  trackWidthCm: number,
  threshold: number = DEFAULT_LINE_SENSOR_THRESHOLD,
): { analogValue: number; digitalValue: boolean; detectedColor: 'BLACK' | 'WHITE' | 'EDGE' | 'UNKNOWN' } {
  const trackSample = sampleTrackAtPoint(segments, worldX, worldY, trackWidthCm);
  const analogValue = calculateAnalogValue(trackSample.nearestDistance, trackWidthCm);
  const digitalValue = calculateDigitalValue(analogValue, threshold);
  const detectedColor = classifyDetectedColor(analogValue, threshold);

  return { analogValue, digitalValue, detectedColor };
}

/**
 * Calibrate all sensors at once with the same white/black reference values.
 * Returns a new array of calibrated LineSensorModel (immutable).
 */
export function calibrateAllSensors(
  sensors: LineSensorModel[],
  whiteValue: number,
  blackValue: number,
): LineSensorModel[] {
  return sensors.map(sensor => calibrateSensor(sensor, whiteValue, blackValue));
}

// ═══════════════════════════════════════════════════════════════
// LINE FOLLOWING REGISTRY
// ═══════════════════════════════════════════════════════════════

/**
 * Registry helper — maintains Map + insertion-order array with deep-copy safety.
 */
export class LineFollowingRegistry<T extends object> {
  private _map = new Map<string, T>();
  private _order: string[] = [];

  get size(): number { return this._map.size; }

  register(id: string, model: T): void {
    this._map.set(id, safeDeepCopy(model));
    if (!this._order.includes(id)) this._order.push(id);
  }

  lookup(id: string): T | undefined {
    const m = this._map.get(id);
    return m ? safeDeepCopy(m) : undefined;
  }

  getAll(): T[] {
    return this._order
      .map(id => this._map.get(id))
      .filter((m): m is T => !!m)
      .map(m => safeDeepCopy(m));
  }

  update(id: string, partial: Partial<T>): void {
    const existing = this._map.get(id);
    if (!existing) return;
    this._map.set(id, safeDeepCopy({ ...existing, ...partial } as T));
  }

  remove(id: string): void {
    this._map.delete(id);
    this._order = this._order.filter(e => e !== id);
  }

  clear(): void {
    this._map.clear();
    this._order = [];
  }

  has(id: string): boolean { return this._map.has(id); }

  keys(): string[] { return [...this._order]; }
}

// ═══════════════════════════════════════════════════════════════
// LINE FOLLOWING SYNCHRONIZER
// ═══════════════════════════════════════════════════════════════

/**
 * LineFollowingSynchronizer — manages all line following registries
 * and provides snapshot/serialization support.
 */
export class LineFollowingSynchronizer {
  public lineTracks = new LineFollowingRegistry<LineTrackModel>();
  public lineSensors = new LineFollowingRegistry<LineSensorModel>();
  public trackSegments = new LineFollowingRegistry<TrackSegmentModel>();
  public trackIntersections = new LineFollowingRegistry<TrackIntersectionModel>();
  public trackMarkers = new LineFollowingRegistry<TrackMarkerModel>();
  public sensorReadings = new LineFollowingRegistry<SensorReadingModel>();

  /**
   * Build snapshot — registers all models and returns a LineFollowingSnapshot.
   */
  public buildSnapshot(): LineFollowingSnapshot {
    return this.toJSON();
  }

  /** Clear all registries. */
  public clear(): void {
    this.lineTracks.clear();
    this.lineSensors.clear();
    this.trackSegments.clear();
    this.trackIntersections.clear();
    this.trackMarkers.clear();
    this.sensorReadings.clear();
  }

  /** Clone with deep copy. */
  public clone(): LineFollowingSynchronizer {
    const cloned = new LineFollowingSynchronizer();
    const snap = this.toJSON();
    cloned.fromJSON(snap);
    return cloned;
  }

  /** Export to JSON snapshot. */
  public toJSON(): LineFollowingSnapshot {
    return {
      lineTracks: this.lineTracks.getAll(),
      lineSensors: this.lineSensors.getAll(),
      trackSegments: this.trackSegments.getAll(),
      trackIntersections: this.trackIntersections.getAll(),
      trackMarkers: this.trackMarkers.getAll(),
      sensorReadings: this.sensorReadings.getAll(),
    };
  }

  /** Import from JSON snapshot. */
  public fromJSON(data: LineFollowingSnapshot | null | undefined): void {
    this.clear();
    if (!data) return;

    if (Array.isArray(data.lineTracks)) {
      for (const m of data.lineTracks) this.lineTracks.register(m.trackId, m);
    }
    if (Array.isArray(data.lineSensors)) {
      for (const m of data.lineSensors) this.lineSensors.register(m.sensorId, m);
    }
    if (Array.isArray(data.trackSegments)) {
      for (const m of data.trackSegments) this.trackSegments.register(m.segmentId, m);
    }
    if (Array.isArray(data.trackIntersections)) {
      for (const m of data.trackIntersections) this.trackIntersections.register(m.intersectionId, m);
    }
    if (Array.isArray(data.trackMarkers)) {
      for (const m of data.trackMarkers) this.trackMarkers.register(m.markerId, m);
    }
    if (Array.isArray(data.sensorReadings)) {
      for (const m of data.sensorReadings) this.sensorReadings.register(m.readingId, m);
    }
  }
}
