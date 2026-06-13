// ═══════════════════════════════════════════════════════════════
// Phase 25A: Virtual Line Following Sensor Runtime — Tests
// 18 sections, 200,000+ assertions, stress iterations = 500
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';

import {
  // Constants
  DEFAULT_LINE_TRACK_WIDTH_CM,
  DEFAULT_LINE_SENSOR_THRESHOLD,
  DEFAULT_LINE_ADC_MAX,
  DEFAULT_LINE_ADC_NOISE_FLOOR,
  DEFAULT_LINE_SENSOR_OFFSET_CM,
  DEFAULT_LINE_EDGE_MARGIN,
  DEFAULT_LINE_MAX_READINGS,
  DEFAULT_LINE_CALIBRATION_SAMPLES,
  VALID_LINE_TRACK_COLORS,
  VALID_LINE_SENSOR_STATES,
  VALID_LINE_TRACK_TYPES,
  VALID_LINE_SENSOR_POSITIONS,
  VALID_LINE_MARKER_TYPES,
  VALID_LINE_DETECTED_COLORS,

  // Factories
  createDefaultLineTrackModel,
  createDefaultLineSensorModel,
  createDefaultTrackSegmentModel,
  createDefaultTrackIntersectionModel,
  createDefaultTrackMarkerModel,
  createDefaultSensorReadingModel,

  // Validators
  validateLineTrackModel,
  validateLineSensorModel,
  validateTrackSegmentModel,
  validateTrackIntersectionModel,
  validateTrackMarkerModel,
  validateSensorReadingModel,

  // Duplicate validators
  validateDuplicateLineTrackIds,
  validateDuplicateLineSensorIds,
  validateDuplicateTrackSegmentIds,
  validateDuplicateTrackIntersectionIds,
  validateDuplicateTrackMarkerIds,
  validateDuplicateSensorReadingIds,

  // Track geometry engine
  calculateSegmentLength,
  getPointOnSegment,
  getNearestPointOnSegment,
  calculateSegmentHeading,
  isPointNearTrack,
  buildTrackPolyline,

  // IR sensor detection engine
  calculateSensorWorldPosition,
  sampleTrackAtPoint,
  calculateAnalogValue,
  calculateDigitalValue,
  calculateEdgeConfidence,
  classifyDetectedColor,

  // Sensor calibration
  calibrateSensor,
  applyCalibrationOffset,
  resetCalibration,

  // Differential drive integration
  updateSensorPositionsForDrive,
  calculateDistanceFromCenterLine,
  detectNearestSegment,
  detectNearestIntersection,

  // Servo integration
  applySensorServoAngle,
  calculateServoMountedPosition,

  // Blockly integration
  readLineSensor,
  readAllLineSensors,
  sampleTrack,
  calibrateAllSensors,

  // Registry & Synchronizer
  LineFollowingRegistry,
  LineFollowingSynchronizer,
} from '../src/stage/line-following-runtime';

import type {
  LineTrackModel,
  LineSensorModel,
  TrackSegmentModel,
  TrackIntersectionModel,
  TrackMarkerModel,
  SensorReadingModel,
  LineFollowingSnapshot,
  TrackColor,
  SensorState,
  TrackType,
} from '../src/types';

const STRESS_ITERATIONS = 500;

// ═══════════════════════════════════════════════════════════════
// SECTION 1: Factory Defaults
// ═══════════════════════════════════════════════════════════════

describe('Phase 25A: Line Following Runtime', () => {

  describe('Section 1: Factory Defaults', () => {
    it('should create default LineTrackModel with correct defaults', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultLineTrackModel(`track-${i}`);
        expect(model.trackId).toBe(`track-${i}`);
        expect(model.trackName).toBe('');
        expect(model.trackColor).toBe('BLACK');
        expect(model.backgroundColor).toBe('WHITE');
        expect(model.trackWidthCm).toBe(DEFAULT_LINE_TRACK_WIDTH_CM);
        expect(model.totalLengthCm).toBe(0);
        expect(model.originX).toBe(0);
        expect(model.originY).toBe(0);
        expect(model.isClosedLoop).toBe(false);
        expect(model.timestamp).toBe(0);
        expect(model.futureLineTrackHints).toEqual({});
      }
    });

    it('should create LineTrackModel with overrides (ID always wins)', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultLineTrackModel(`t-${i}`, {
          trackId: 'wrong',
          trackName: `Track ${i}`,
          trackWidthCm: 5,
          totalLengthCm: 100,
        });
        expect(model.trackId).toBe(`t-${i}`);
        expect(model.trackName).toBe(`Track ${i}`);
        expect(model.trackWidthCm).toBe(5);
        expect(model.totalLengthCm).toBe(100);
      }
    });

    it('should create default LineSensorModel with correct defaults', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultLineSensorModel(`sensor-${i}`);
        expect(model.sensorId).toBe(`sensor-${i}`);
        expect(model.driveId).toBe('');
        expect(model.sensorPosition).toBe('CENTER_SENSOR');
        expect(model.sensorOffsetXCm).toBe(0);
        expect(model.sensorOffsetYCm).toBe(DEFAULT_LINE_SENSOR_OFFSET_CM);
        expect(model.sensorAngleDeg).toBe(0);
        expect(model.servoMountId).toBe('');
        expect(model.sensorState).toBe('IDLE');
        expect(model.analogValue).toBe(0);
        expect(model.digitalValue).toBe(false);
        expect(model.threshold).toBe(DEFAULT_LINE_SENSOR_THRESHOLD);
        expect(model.edgeConfidence).toBe(0);
        expect(model.lastReadTimestamp).toBe(0);
        expect(model.futureSensorHints).toEqual({});
      }
    });

    it('should create default TrackSegmentModel with correct defaults', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultTrackSegmentModel(`seg-${i}`);
        expect(model.segmentId).toBe(`seg-${i}`);
        expect(model.trackId).toBe('');
        expect(model.segmentType).toBe('STRAIGHT');
        expect(model.startX).toBe(0);
        expect(model.startY).toBe(0);
        expect(model.endX).toBe(0);
        expect(model.endY).toBe(0);
        expect(model.curveCenterX).toBe(0);
        expect(model.curveCenterY).toBe(0);
        expect(model.curveRadiusCm).toBe(0);
        expect(model.curveStartAngleDeg).toBe(0);
        expect(model.curveSweepAngleDeg).toBe(0);
        expect(model.lengthCm).toBe(0);
        expect(model.orderIndex).toBe(0);
        expect(model.futureSegmentHints).toEqual({});
      }
    });

    it('should create default TrackIntersectionModel with correct defaults', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultTrackIntersectionModel(`inter-${i}`);
        expect(model.intersectionId).toBe(`inter-${i}`);
        expect(model.trackId).toBe('');
        expect(model.positionX).toBe(0);
        expect(model.positionY).toBe(0);
        expect(model.connectedSegmentIds).toEqual([]);
        expect(model.intersectionAngleDeg).toBe(0);
        expect(model.futureIntersectionHints).toEqual({});
      }
    });

    it('should create default TrackMarkerModel with correct defaults', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultTrackMarkerModel(`marker-${i}`);
        expect(model.markerId).toBe(`marker-${i}`);
        expect(model.trackId).toBe('');
        expect(model.segmentId).toBe('');
        expect(model.positionAlongSegment).toBe(0);
        expect(model.markerType).toBe('CHECKPOINT');
        expect(model.positionX).toBe(0);
        expect(model.positionY).toBe(0);
        expect(model.futureMarkerHints).toEqual({});
      }
    });

    it('should create default SensorReadingModel with correct defaults', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultSensorReadingModel(`reading-${i}`);
        expect(model.readingId).toBe(`reading-${i}`);
        expect(model.sensorId).toBe('');
        expect(model.driveId).toBe('');
        expect(model.analogValue).toBe(0);
        expect(model.digitalValue).toBe(false);
        expect(model.detectedColor).toBe('UNKNOWN');
        expect(model.distanceFromCenterLineCm).toBe(0);
        expect(model.nearestSegmentId).toBe('');
        expect(model.nearestIntersectionId).toBe('');
        expect(model.timestamp).toBe(0);
        expect(model.futureSensorReadingHints).toEqual({});
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 2: Validation — LineTrackModel
  // ═══════════════════════════════════════════════════════════════

  describe('Section 2: Validation — LineTrackModel', () => {
    it('should return NULL_MODEL warning for null input', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const w = validateLineTrackModel(null);
        expect(w.length).toBe(1);
        expect(w[0].code).toBe('NULL_MODEL');
      }
    });

    it('should return NULL_MODEL warning for undefined input', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const w = validateLineTrackModel(undefined);
        expect(w.length).toBe(1);
        expect(w[0].code).toBe('NULL_MODEL');
      }
    });

    it('should return EMPTY_TRACK_ID for empty trackId', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultLineTrackModel('');
        const w = validateLineTrackModel(model);
        expect(w.some(x => x.code === 'EMPTY_TRACK_ID')).toBe(true);
      }
    });

    it('should return INVALID_TRACK_COLOR for invalid trackColor', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultLineTrackModel(`t-${i}`, {
          trackColor: 'INVALID' as TrackColor,
        });
        const w = validateLineTrackModel(model);
        expect(w.some(x => x.code === 'INVALID_TRACK_COLOR')).toBe(true);
      }
    });

    it('should return INVALID_TRACK_WIDTH for negative trackWidthCm', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultLineTrackModel(`t-${i}`, { trackWidthCm: -1 });
        const w = validateLineTrackModel(model);
        expect(w.some(x => x.code === 'INVALID_TRACK_WIDTH')).toBe(true);
      }
    });

    it('should return no warnings for a valid model', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultLineTrackModel(`t-${i}`);
        const w = validateLineTrackModel(model);
        expect(w.length).toBe(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 3: Validation — LineSensorModel
  // ═══════════════════════════════════════════════════════════════

  describe('Section 3: Validation — LineSensorModel', () => {
    it('should return NULL_MODEL warning for null input', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const w = validateLineSensorModel(null);
        expect(w.length).toBe(1);
        expect(w[0].code).toBe('NULL_MODEL');
      }
    });

    it('should return EMPTY_SENSOR_ID for empty sensorId', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultLineSensorModel('');
        const w = validateLineSensorModel(model);
        expect(w.some(x => x.code === 'EMPTY_SENSOR_ID')).toBe(true);
      }
    });

    it('should return INVALID_SENSOR_POSITION for invalid sensorPosition', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultLineSensorModel(`s-${i}`, {
          driveId: 'drive1',
          sensorPosition: 'INVALID_POS' as LineSensorModel['sensorPosition'],
        });
        const w = validateLineSensorModel(model);
        expect(w.some(x => x.code === 'INVALID_SENSOR_POSITION')).toBe(true);
      }
    });

    it('should return INVALID_SENSOR_STATE for invalid sensorState', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultLineSensorModel(`s-${i}`, {
          driveId: 'drive1',
          sensorState: 'BROKEN' as SensorState,
        });
        const w = validateLineSensorModel(model);
        expect(w.some(x => x.code === 'INVALID_SENSOR_STATE')).toBe(true);
      }
    });

    it('should return NEGATIVE_THRESHOLD for negative threshold', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultLineSensorModel(`s-${i}`, {
          driveId: 'drive1',
          threshold: -100,
        });
        const w = validateLineSensorModel(model);
        expect(w.some(x => x.code === 'NEGATIVE_THRESHOLD')).toBe(true);
      }
    });

    it('should return THRESHOLD_EXCEEDS_ADC_MAX for threshold > ADC_MAX', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultLineSensorModel(`s-${i}`, {
          driveId: 'drive1',
          threshold: DEFAULT_LINE_ADC_MAX + 1,
        });
        const w = validateLineSensorModel(model);
        expect(w.some(x => x.code === 'THRESHOLD_EXCEEDS_ADC_MAX')).toBe(true);
      }
    });

    it('should return NEGATIVE_EDGE_CONFIDENCE for edgeConfidence < 0', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultLineSensorModel(`s-${i}`, {
          driveId: 'drive1',
          edgeConfidence: -0.5,
        });
        const w = validateLineSensorModel(model);
        expect(w.some(x => x.code === 'NEGATIVE_EDGE_CONFIDENCE')).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 4: Validation — TrackSegmentModel
  // ═══════════════════════════════════════════════════════════════

  describe('Section 4: Validation — TrackSegmentModel', () => {
    it('should return NULL_MODEL warning for null input', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const w = validateTrackSegmentModel(null);
        expect(w.length).toBe(1);
        expect(w[0].code).toBe('NULL_MODEL');
      }
    });

    it('should return EMPTY_SEGMENT_ID for empty segmentId', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultTrackSegmentModel('');
        const w = validateTrackSegmentModel(model);
        expect(w.some(x => x.code === 'EMPTY_SEGMENT_ID')).toBe(true);
      }
    });

    it('should return INVALID_SEGMENT_TYPE for invalid segmentType', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultTrackSegmentModel(`seg-${i}`, {
          trackId: 'track1',
          segmentType: 'ZIGZAG' as TrackType,
        });
        const w = validateTrackSegmentModel(model);
        expect(w.some(x => x.code === 'INVALID_SEGMENT_TYPE')).toBe(true);
      }
    });

    it('should return NEGATIVE_LENGTH for negative lengthCm', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultTrackSegmentModel(`seg-${i}`, {
          trackId: 'track1',
          lengthCm: -10,
        });
        const w = validateTrackSegmentModel(model);
        expect(w.some(x => x.code === 'NEGATIVE_LENGTH')).toBe(true);
      }
    });

    it('should return NEGATIVE_CURVE_RADIUS for negative curveRadiusCm', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultTrackSegmentModel(`seg-${i}`, {
          trackId: 'track1',
          curveRadiusCm: -5,
        });
        const w = validateTrackSegmentModel(model);
        expect(w.some(x => x.code === 'NEGATIVE_CURVE_RADIUS')).toBe(true);
      }
    });

    it('should return no warnings for a valid model', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultTrackSegmentModel(`seg-${i}`, { trackId: 'track1' });
        const w = validateTrackSegmentModel(model);
        expect(w.length).toBe(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 5: Validation — TrackIntersectionModel
  // ═══════════════════════════════════════════════════════════════

  describe('Section 5: Validation — TrackIntersectionModel', () => {
    it('should return NULL_MODEL warning for null input', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const w = validateTrackIntersectionModel(null);
        expect(w.length).toBe(1);
        expect(w[0].code).toBe('NULL_MODEL');
      }
    });

    it('should return EMPTY_INTERSECTION_ID for empty intersectionId', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultTrackIntersectionModel('');
        const w = validateTrackIntersectionModel(model);
        expect(w.some(x => x.code === 'EMPTY_INTERSECTION_ID')).toBe(true);
      }
    });

    it('should return EMPTY_TRACK_ID for empty trackId', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultTrackIntersectionModel(`inter-${i}`);
        const w = validateTrackIntersectionModel(model);
        expect(w.some(x => x.code === 'EMPTY_TRACK_ID')).toBe(true);
      }
    });

    it('should return INVALID_CONNECTED_SEGMENTS when connectedSegmentIds is not an array', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultTrackIntersectionModel(`inter-${i}`, {
          trackId: 'track1',
        });
        // Force connectedSegmentIds to non-array
        (model as any).connectedSegmentIds = 'not-an-array';
        const w = validateTrackIntersectionModel(model);
        expect(w.some(x => x.code === 'INVALID_CONNECTED_SEGMENTS')).toBe(true);
      }
    });

    it('should return no warnings for a valid model', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultTrackIntersectionModel(`inter-${i}`, {
          trackId: 'track1',
          connectedSegmentIds: ['seg1', 'seg2'],
        });
        const w = validateTrackIntersectionModel(model);
        expect(w.length).toBe(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 6: Validation — TrackMarkerModel
  // ═══════════════════════════════════════════════════════════════

  describe('Section 6: Validation — TrackMarkerModel', () => {
    it('should return NULL_MODEL warning for null input', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const w = validateTrackMarkerModel(null);
        expect(w.length).toBe(1);
        expect(w[0].code).toBe('NULL_MODEL');
      }
    });

    it('should return EMPTY_MARKER_ID for empty markerId', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultTrackMarkerModel('');
        const w = validateTrackMarkerModel(model);
        expect(w.some(x => x.code === 'EMPTY_MARKER_ID')).toBe(true);
      }
    });

    it('should return EMPTY_TRACK_ID for empty trackId', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultTrackMarkerModel(`m-${i}`);
        const w = validateTrackMarkerModel(model);
        expect(w.some(x => x.code === 'EMPTY_TRACK_ID')).toBe(true);
      }
    });

    it('should return INVALID_POSITION_ALONG_SEGMENT for positionAlongSegment > 1', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultTrackMarkerModel(`m-${i}`, {
          trackId: 'track1',
          positionAlongSegment: 1.5,
        });
        const w = validateTrackMarkerModel(model);
        expect(w.some(x => x.code === 'INVALID_POSITION_ALONG_SEGMENT')).toBe(true);
      }
    });

    it('should return INVALID_POSITION_ALONG_SEGMENT for positionAlongSegment < 0', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultTrackMarkerModel(`m-${i}`, {
          trackId: 'track1',
          positionAlongSegment: -0.1,
        });
        const w = validateTrackMarkerModel(model);
        expect(w.some(x => x.code === 'INVALID_POSITION_ALONG_SEGMENT')).toBe(true);
      }
    });

    it('should return INVALID_MARKER_TYPE for invalid markerType', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultTrackMarkerModel(`m-${i}`, {
          trackId: 'track1',
          markerType: 'INVALID' as TrackMarkerModel['markerType'],
        });
        const w = validateTrackMarkerModel(model);
        expect(w.some(x => x.code === 'INVALID_MARKER_TYPE')).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 7: Validation — SensorReadingModel
  // ═══════════════════════════════════════════════════════════════

  describe('Section 7: Validation — SensorReadingModel', () => {
    it('should return NULL_MODEL warning for null input', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const w = validateSensorReadingModel(null);
        expect(w.length).toBe(1);
        expect(w[0].code).toBe('NULL_MODEL');
      }
    });

    it('should return EMPTY_READING_ID for empty readingId', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultSensorReadingModel('');
        const w = validateSensorReadingModel(model);
        expect(w.some(x => x.code === 'EMPTY_READING_ID')).toBe(true);
      }
    });

    it('should return EMPTY_SENSOR_ID for empty sensorId', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultSensorReadingModel(`r-${i}`);
        const w = validateSensorReadingModel(model);
        expect(w.some(x => x.code === 'EMPTY_SENSOR_ID')).toBe(true);
      }
    });

    it('should return NEGATIVE_ANALOG_VALUE for negative analogValue', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultSensorReadingModel(`r-${i}`, {
          sensorId: 'sensor1',
          analogValue: -100,
        });
        const w = validateSensorReadingModel(model);
        expect(w.some(x => x.code === 'NEGATIVE_ANALOG_VALUE')).toBe(true);
      }
    });

    it('should return ANALOG_VALUE_EXCEEDS_ADC_MAX for analogValue > ADC_MAX', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultSensorReadingModel(`r-${i}`, {
          sensorId: 'sensor1',
          analogValue: DEFAULT_LINE_ADC_MAX + 1,
        });
        const w = validateSensorReadingModel(model);
        expect(w.some(x => x.code === 'ANALOG_VALUE_EXCEEDS_ADC_MAX')).toBe(true);
      }
    });

    it('should return INVALID_DETECTED_COLOR for invalid detectedColor', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultSensorReadingModel(`r-${i}`, {
          sensorId: 'sensor1',
          detectedColor: 'PURPLE' as SensorReadingModel['detectedColor'],
        });
        const w = validateSensorReadingModel(model);
        expect(w.some(x => x.code === 'INVALID_DETECTED_COLOR')).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 8: Duplicate Validators
  // ═══════════════════════════════════════════════════════════════

  describe('Section 8: Duplicate Validators', () => {
    it('should return 0 warnings for unique LineTrack IDs, 1+ for duplicates', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const unique = [
          createDefaultLineTrackModel('a'),
          createDefaultLineTrackModel('b'),
        ];
        expect(validateDuplicateLineTrackIds(unique).length).toBe(0);

        const duped = [
          createDefaultLineTrackModel('a'),
          createDefaultLineTrackModel('a'),
        ];
        expect(validateDuplicateLineTrackIds(duped).length).toBeGreaterThanOrEqual(1);
        expect(validateDuplicateLineTrackIds(duped)[0].code).toBe('DUPLICATE_TRACK_ID');
      }
    });

    it('should return 0 warnings for unique LineSensor IDs, 1+ for duplicates', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const unique = [
          createDefaultLineSensorModel('a'),
          createDefaultLineSensorModel('b'),
        ];
        expect(validateDuplicateLineSensorIds(unique).length).toBe(0);

        const duped = [
          createDefaultLineSensorModel('x'),
          createDefaultLineSensorModel('x'),
        ];
        expect(validateDuplicateLineSensorIds(duped).length).toBeGreaterThanOrEqual(1);
        expect(validateDuplicateLineSensorIds(duped)[0].code).toBe('DUPLICATE_SENSOR_ID');
      }
    });

    it('should return 0 warnings for unique TrackSegment IDs, 1+ for duplicates', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const unique = [
          createDefaultTrackSegmentModel('a'),
          createDefaultTrackSegmentModel('b'),
        ];
        expect(validateDuplicateTrackSegmentIds(unique).length).toBe(0);

        const duped = [
          createDefaultTrackSegmentModel('x'),
          createDefaultTrackSegmentModel('x'),
        ];
        expect(validateDuplicateTrackSegmentIds(duped).length).toBeGreaterThanOrEqual(1);
        expect(validateDuplicateTrackSegmentIds(duped)[0].code).toBe('DUPLICATE_SEGMENT_ID');
      }
    });

    it('should return 0 warnings for unique TrackIntersection IDs, 1+ for duplicates', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const unique = [
          createDefaultTrackIntersectionModel('a'),
          createDefaultTrackIntersectionModel('b'),
        ];
        expect(validateDuplicateTrackIntersectionIds(unique).length).toBe(0);

        const duped = [
          createDefaultTrackIntersectionModel('x'),
          createDefaultTrackIntersectionModel('x'),
        ];
        expect(validateDuplicateTrackIntersectionIds(duped).length).toBeGreaterThanOrEqual(1);
        expect(validateDuplicateTrackIntersectionIds(duped)[0].code).toBe('DUPLICATE_INTERSECTION_ID');
      }
    });

    it('should return 0 warnings for unique TrackMarker IDs, 1+ for duplicates', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const unique = [
          createDefaultTrackMarkerModel('a'),
          createDefaultTrackMarkerModel('b'),
        ];
        expect(validateDuplicateTrackMarkerIds(unique).length).toBe(0);

        const duped = [
          createDefaultTrackMarkerModel('x'),
          createDefaultTrackMarkerModel('x'),
        ];
        expect(validateDuplicateTrackMarkerIds(duped).length).toBeGreaterThanOrEqual(1);
        expect(validateDuplicateTrackMarkerIds(duped)[0].code).toBe('DUPLICATE_MARKER_ID');
      }
    });

    it('should return 0 warnings for unique SensorReading IDs, 1+ for duplicates', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const unique = [
          createDefaultSensorReadingModel('a'),
          createDefaultSensorReadingModel('b'),
        ];
        expect(validateDuplicateSensorReadingIds(unique).length).toBe(0);

        const duped = [
          createDefaultSensorReadingModel('x'),
          createDefaultSensorReadingModel('x'),
        ];
        expect(validateDuplicateSensorReadingIds(duped).length).toBeGreaterThanOrEqual(1);
        expect(validateDuplicateSensorReadingIds(duped)[0].code).toBe('DUPLICATE_READING_ID');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 9: Track Geometry Engine
  // ═══════════════════════════════════════════════════════════════

  describe('Section 9: Track Geometry Engine', () => {
    it('should calculateSegmentLength for straight segment (Euclidean)', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const seg = createDefaultTrackSegmentModel(`seg-${i}`, {
          trackId: 'track1',
          segmentType: 'STRAIGHT',
          startX: 0, startY: 0,
          endX: 100, endY: 0,
        });
        const len = calculateSegmentLength(seg);
        expect(len).toBeCloseTo(100, 5);
      }
    });

    it('should calculateSegmentLength for diagonal straight segment', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const seg = createDefaultTrackSegmentModel(`seg-${i}`, {
          trackId: 'track1',
          segmentType: 'STRAIGHT',
          startX: 0, startY: 0,
          endX: 3, endY: 4,
        });
        const len = calculateSegmentLength(seg);
        expect(len).toBeCloseTo(5, 5);
      }
    });

    it('should calculateSegmentLength for curve segment (arc length)', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        // Quarter circle: radius=10, sweep=90°
        const seg = createDefaultTrackSegmentModel(`seg-${i}`, {
          trackId: 'track1',
          segmentType: 'CURVE',
          curveRadiusCm: 10,
          curveSweepAngleDeg: 90,
        });
        const len = calculateSegmentLength(seg);
        const expected = 10 * 90 * Math.PI / 180; // 10 * π/2
        expect(len).toBeCloseTo(expected, 5);
      }
    });

    it('should getPointOnSegment at t=0 (start) for straight segment', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const seg = createDefaultTrackSegmentModel(`seg-${i}`, {
          trackId: 'track1',
          segmentType: 'STRAIGHT',
          startX: 10, startY: 20,
          endX: 110, endY: 20,
        });
        const pt = getPointOnSegment(seg, 0);
        expect(pt.x).toBeCloseTo(10, 5);
        expect(pt.y).toBeCloseTo(20, 5);
      }
    });

    it('should getPointOnSegment at t=0.5 (midpoint) for straight segment', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const seg = createDefaultTrackSegmentModel(`seg-${i}`, {
          trackId: 'track1',
          segmentType: 'STRAIGHT',
          startX: 0, startY: 0,
          endX: 100, endY: 0,
        });
        const pt = getPointOnSegment(seg, 0.5);
        expect(pt.x).toBeCloseTo(50, 5);
        expect(pt.y).toBeCloseTo(0, 5);
      }
    });

    it('should getPointOnSegment at t=1 (end) for straight segment', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const seg = createDefaultTrackSegmentModel(`seg-${i}`, {
          trackId: 'track1',
          segmentType: 'STRAIGHT',
          startX: 0, startY: 0,
          endX: 100, endY: 50,
        });
        const pt = getPointOnSegment(seg, 1);
        expect(pt.x).toBeCloseTo(100, 5);
        expect(pt.y).toBeCloseTo(50, 5);
      }
    });

    it('should getPointOnSegment for curve segment at t=0', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        // Arc: center=(0,0), radius=10, start=0°, sweep=90°
        const seg = createDefaultTrackSegmentModel(`seg-${i}`, {
          trackId: 'track1',
          segmentType: 'CURVE',
          curveCenterX: 0, curveCenterY: 0,
          curveRadiusCm: 10,
          curveStartAngleDeg: 0,
          curveSweepAngleDeg: 90,
        });
        const pt = getPointOnSegment(seg, 0);
        expect(pt.x).toBeCloseTo(10, 5);
        expect(pt.y).toBeCloseTo(0, 5);
      }
    });

    it('should getNearestPointOnSegment for point on straight segment', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const seg = createDefaultTrackSegmentModel(`seg-${i}`, {
          trackId: 'track1',
          segmentType: 'STRAIGHT',
          startX: 0, startY: 0,
          endX: 100, endY: 0,
        });
        const result = getNearestPointOnSegment(seg, 50, 5);
        expect(result.x).toBeCloseTo(50, 5);
        expect(result.y).toBeCloseTo(0, 5);
        expect(result.distance).toBeCloseTo(5, 5);
        expect(result.t).toBeCloseTo(0.5, 5);
      }
    });

    it('should calculateSegmentHeading for straight segment along X-axis', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const seg = createDefaultTrackSegmentModel(`seg-${i}`, {
          trackId: 'track1',
          segmentType: 'STRAIGHT',
          startX: 0, startY: 0,
          endX: 100, endY: 0,
        });
        const heading = calculateSegmentHeading(seg, 0.5);
        expect(heading).toBeCloseTo(0, 5);
      }
    });

    it('should isPointNearTrack return true for point on line', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const seg = createDefaultTrackSegmentModel('seg1', {
          trackId: 'track1',
          segmentType: 'STRAIGHT',
          startX: 0, startY: 0,
          endX: 100, endY: 0,
        });
        const result = isPointNearTrack([seg], 50, 0, 2);
        expect(result).toBe(true);
        // On edge of track
        const edgeResult = isPointNearTrack([seg], 50, 0.9, 2);
        expect(edgeResult).toBe(true);
        // Point too far away
        const farResult = isPointNearTrack([seg], 50, 10, 2);
        expect(farResult).toBe(false);
        // Empty segments
        const emptyResult = isPointNearTrack([], 50, 0, 2);
        expect(emptyResult).toBe(false);
      }
    });

    it('should buildTrackPolyline with correct number of points', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const seg = createDefaultTrackSegmentModel('seg1', {
          trackId: 'track1',
          segmentType: 'STRAIGHT',
          startX: 0, startY: 0,
          endX: 100, endY: 0,
        });
        const points = buildTrackPolyline([seg], 10);
        expect(points.length).toBe(10);
        expect(points[0].x).toBeCloseTo(0, 5);
        expect(points[0].y).toBeCloseTo(0, 5);
        expect(points[9].x).toBeCloseTo(100, 5);
        expect(points[9].y).toBeCloseTo(0, 5);
        // Minimum resolution of 2 enforced
        const minPoints = buildTrackPolyline([seg], 1);
        expect(minPoints.length).toBe(2);
        // Empty segments
        const emptyPoints = buildTrackPolyline([], 10);
        expect(emptyPoints.length).toBe(0);
        // Multiple segments
        const seg2 = createDefaultTrackSegmentModel('seg2', {
          trackId: 'track1',
          segmentType: 'STRAIGHT',
          startX: 100, startY: 0,
          endX: 200, endY: 0,
        });
        const multiPoints = buildTrackPolyline([seg, seg2], 5);
        expect(multiPoints.length).toBe(10);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 10: IR Sensor Detection Engine
  // ═══════════════════════════════════════════════════════════════

  describe('Section 10: IR Sensor Detection Engine', () => {
    it('should calculateSensorWorldPosition at heading=0 (no rotation)', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const pos = calculateSensorWorldPosition(50, 0, 0, 3.5, 0, 0);
        expect(pos.x).toBeCloseTo(53.5, 5);
        expect(pos.y).toBeCloseTo(0, 5);
        expect(pos.angleDeg).toBeCloseTo(0, 5);
        // Forward offset (Y)
        const posY = calculateSensorWorldPosition(50, 0, 0, 0, 3.5, 0);
        expect(posY.x).toBeCloseTo(50, 5);
        expect(posY.y).toBeCloseTo(3.5, 5);
        // With sensor angle
        const posA = calculateSensorWorldPosition(0, 0, 0, 0, 0, 45);
        expect(posA.angleDeg).toBeCloseTo(45, 5);
      }
    });

    it('should calculateSensorWorldPosition at heading=90 (rotated)', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const pos = calculateSensorWorldPosition(0, 0, 90, 3.5, 0, 0);
        expect(pos.x).toBeCloseTo(0, 4);
        expect(pos.y).toBeCloseTo(3.5, 4);
        expect(pos.angleDeg).toBeCloseTo(90, 5);
        // heading=180
        const pos180 = calculateSensorWorldPosition(0, 0, 180, 3.5, 0, 0);
        expect(pos180.x).toBeCloseTo(-3.5, 4);
        expect(pos180.y).toBeCloseTo(0, 4);
      }
    });

    it('should sampleTrackAtPoint on line returns small distance', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const seg = createDefaultTrackSegmentModel('seg1', {
          trackId: 'track1',
          segmentType: 'STRAIGHT',
          startX: 0, startY: 0,
          endX: 100, endY: 0,
        });
        const result = sampleTrackAtPoint([seg], 50, 0, 2);
        expect(result.nearestDistance).toBeCloseTo(0, 5);
        expect(result.nearestSegmentId).toBe('seg1');
      }
    });

    it('should sampleTrackAtPoint off line returns large distance', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const seg = createDefaultTrackSegmentModel('seg1', {
          trackId: 'track1',
          segmentType: 'STRAIGHT',
          startX: 0, startY: 0,
          endX: 100, endY: 0,
        });
        const result = sampleTrackAtPoint([seg], 50, 20, 2);
        expect(result.nearestDistance).toBeCloseTo(20, 5);
      }
    });

    it('should calculateAnalogValue on line (distance=0) returns ADC_MAX', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const value = calculateAnalogValue(0, 2);
        expect(value).toBe(DEFAULT_LINE_ADC_MAX);
        // Partially on line (distance=0.5, halfWidth=1)
        const partial = calculateAnalogValue(0.5, 2);
        expect(partial).toBe(Math.round(DEFAULT_LINE_ADC_MAX * 0.5));
        expect(partial).toBeGreaterThan(0);
        expect(partial).toBeLessThan(DEFAULT_LINE_ADC_MAX);
      }
    });

    it('should calculateAnalogValue at edge (distance=halfWidth) returns 0 or noise floor', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        // At exactly halfWidth, formula: ADC_MAX * max(0, 1 - 1) = 0, but round(0) = 0
        // Actually dist < halfWidth check fails, so it returns noiseFloor
        const value = calculateAnalogValue(1.0, 2);
        expect(value).toBe(DEFAULT_LINE_ADC_NOISE_FLOOR);
        // Value is always clamped to [0, adcMax]
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(DEFAULT_LINE_ADC_MAX);
      }
    });

    it('should calculateAnalogValue off line returns noise floor', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const value = calculateAnalogValue(10, 2);
        expect(value).toBe(DEFAULT_LINE_ADC_NOISE_FLOOR);
        expect(typeof value).toBe('number');
      }
    });

    it('should calculateDigitalValue correctly', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(calculateDigitalValue(2500, 2000)).toBe(true);
        expect(calculateDigitalValue(1500, 2000)).toBe(false);
        expect(calculateDigitalValue(2000, 2000)).toBe(true);
        // Boundary: 0 threshold
        expect(calculateDigitalValue(0, 0)).toBe(true);
        expect(calculateDigitalValue(1, 0)).toBe(true);
        // Boundary: max threshold
        expect(calculateDigitalValue(DEFAULT_LINE_ADC_MAX, DEFAULT_LINE_ADC_MAX)).toBe(true);
        expect(calculateDigitalValue(DEFAULT_LINE_ADC_MAX - 1, DEFAULT_LINE_ADC_MAX)).toBe(false);
      }
    });

    it('should calculateEdgeConfidence near threshold', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        // At threshold exactly => confidence = 1
        const conf1 = calculateEdgeConfidence(2000, 2000, 300);
        expect(conf1).toBeCloseTo(1, 5);
        // Far from threshold => confidence = 0
        const conf2 = calculateEdgeConfidence(0, 2000, 300);
        expect(conf2).toBe(0);
        // Halfway in margin => 0.5
        const conf3 = calculateEdgeConfidence(2150, 2000, 300);
        expect(conf3).toBeCloseTo(0.5, 5);
        // edge margin = 0 => always 0
        const conf4 = calculateEdgeConfidence(2000, 2000, 0);
        expect(conf4).toBe(0);
        // Confidence is always in [0, 1]
        expect(conf1).toBeGreaterThanOrEqual(0);
        expect(conf1).toBeLessThanOrEqual(1);
      }
    });

    it('should classifyDetectedColor BLACK/WHITE/EDGE/UNKNOWN', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(classifyDetectedColor(4000, 2000, 300)).toBe('BLACK');
        expect(classifyDetectedColor(100, 2000, 300)).toBe('WHITE');
        expect(classifyDetectedColor(2000, 2000, 300)).toBe('EDGE');
        expect(classifyDetectedColor(-1, 2000, 300)).toBe('UNKNOWN');
        // At exact boundary: threshold + edgeMargin = BLACK
        expect(classifyDetectedColor(2300, 2000, 300)).toBe('BLACK');
        // At exact boundary: threshold - edgeMargin = WHITE
        expect(classifyDetectedColor(1700, 2000, 300)).toBe('WHITE');
        // Just inside edge range
        expect(classifyDetectedColor(2299, 2000, 300)).toBe('EDGE');
        expect(classifyDetectedColor(1701, 2000, 300)).toBe('EDGE');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 11: Sensor Calibration
  // ═══════════════════════════════════════════════════════════════

  describe('Section 11: Sensor Calibration', () => {
    it('should calibrateSensor set threshold to midpoint of white and black', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const sensor = createDefaultLineSensorModel(`s-${i}`, { driveId: 'drive1' });
        const calibrated = calibrateSensor(sensor, 200, 3800);
        expect(calibrated.threshold).toBe(2000);
        expect(calibrated.sensorState).toBe('ACTIVE');
        expect(calibrated.sensorId).toBe(`s-${i}`);
      }
    });

    it('should calibrateSensor clamp threshold to [0, ADC_MAX]', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const sensor = createDefaultLineSensorModel(`s-${i}`, { driveId: 'drive1' });
        const calibrated = calibrateSensor(sensor, 0, 10000);
        expect(calibrated.threshold).toBeLessThanOrEqual(DEFAULT_LINE_ADC_MAX);
        expect(calibrated.threshold).toBeGreaterThanOrEqual(0);
      }
    });

    it('should calibrateSensor not mutate original sensor (immutability)', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const sensor = createDefaultLineSensorModel(`s-${i}`, { driveId: 'drive1' });
        const origThreshold = sensor.threshold;
        calibrateSensor(sensor, 200, 3800);
        expect(sensor.threshold).toBe(origThreshold);
        expect(sensor.sensorState).toBe('IDLE');
      }
    });

    it('should applyCalibrationOffset adjust threshold', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const sensor = createDefaultLineSensorModel(`s-${i}`, { driveId: 'drive1', threshold: 2000 });
        const adjusted = applyCalibrationOffset(sensor, 500);
        expect(adjusted.threshold).toBe(2500);
        // Negative offset
        const adjusted2 = applyCalibrationOffset(sensor, -500);
        expect(adjusted2.threshold).toBe(1500);
      }
    });

    it('should applyCalibrationOffset clamp to [0, ADC_MAX]', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const sensor = createDefaultLineSensorModel(`s-${i}`, { driveId: 'drive1', threshold: 100 });
        const adjusted = applyCalibrationOffset(sensor, -200);
        expect(adjusted.threshold).toBe(0);
        const sensor2 = createDefaultLineSensorModel(`s2-${i}`, { driveId: 'drive1', threshold: 4000 });
        const adjusted2 = applyCalibrationOffset(sensor2, 500);
        expect(adjusted2.threshold).toBe(DEFAULT_LINE_ADC_MAX);
      }
    });

    it('should resetCalibration restore defaults', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const sensor = createDefaultLineSensorModel(`s-${i}`, {
          driveId: 'drive1',
          threshold: 3000,
          sensorState: 'ACTIVE',
        });
        const reset = resetCalibration(sensor);
        expect(reset.threshold).toBe(DEFAULT_LINE_SENSOR_THRESHOLD);
        expect(reset.sensorState).toBe('IDLE');
        expect(reset.sensorId).toBe(`s-${i}`);
        expect(reset.driveId).toBe('drive1');
        // Original not mutated
        expect(sensor.threshold).toBe(3000);
        expect(sensor.sensorState).toBe('ACTIVE');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 12: Differential Drive Integration
  // ═══════════════════════════════════════════════════════════════

  describe('Section 12: Differential Drive Integration', () => {
    const makeStraightSegment = () => createDefaultTrackSegmentModel('seg1', {
      trackId: 'track1',
      segmentType: 'STRAIGHT',
      startX: 0, startY: 0,
      endX: 100, endY: 0,
    });

    it('should updateSensorPositionsForDrive compute world positions', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const sensors = [
          createDefaultLineSensorModel('left', { driveId: 'drive1', sensorOffsetXCm: -3.5, sensorOffsetYCm: 0 }),
          createDefaultLineSensorModel('center', { driveId: 'drive1', sensorOffsetXCm: 0, sensorOffsetYCm: 3.5 }),
          createDefaultLineSensorModel('right', { driveId: 'drive1', sensorOffsetXCm: 3.5, sensorOffsetYCm: 0 }),
        ];
        const updated = updateSensorPositionsForDrive(sensors, 50, 0, 0);
        expect(updated.length).toBe(3);
        // Left sensor: (50 + (-3.5)*cos(0) - 0*sin(0), 0 + (-3.5)*sin(0) + 0*cos(0)) = (46.5, 0)
        expect((updated[0].futureSensorHints as any)._worldX).toBeCloseTo(46.5, 4);
        expect((updated[0].futureSensorHints as any)._worldY).toBeCloseTo(0, 4);
        // Center sensor: (50 + 0 - 3.5*sin(0), 0 + 0 + 3.5*cos(0)) = (50, 3.5)
        expect((updated[1].futureSensorHints as any)._worldX).toBeCloseTo(50, 4);
        expect((updated[1].futureSensorHints as any)._worldY).toBeCloseTo(3.5, 4);
      }
    });

    it('should updateSensorPositionsForDrive not mutate original sensors', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const sensors = [
          createDefaultLineSensorModel('s1', { driveId: 'drive1' }),
        ];
        const origHints = { ...sensors[0].futureSensorHints };
        updateSensorPositionsForDrive(sensors, 50, 0, 0);
        expect(sensors[0].futureSensorHints).toEqual(origHints);
      }
    });

    it('should updateSensorPositionsForDrive apply servo angle when servoMountId set', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const sensors = [
          createDefaultLineSensorModel('s1', {
            driveId: 'drive1',
            servoMountId: 'servo1',
            sensorOffsetXCm: 0,
            sensorOffsetYCm: 3.5,
            sensorAngleDeg: 0,
          }),
        ];
        const updated = updateSensorPositionsForDrive(sensors, 0, 0, 0, 45);
        expect((updated[0].futureSensorHints as any)._worldAngleDeg).toBeCloseTo(45, 4);
      }
    });

    it('should calculateDistanceFromCenterLine return 0 for point on line', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const seg = makeStraightSegment();
        const dist = calculateDistanceFromCenterLine([seg], 50, 0, 2);
        expect(Math.abs(dist)).toBeCloseTo(0, 4);
      }
    });

    it('should calculateDistanceFromCenterLine return nonzero for offset point', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const seg = makeStraightSegment();
        const dist = calculateDistanceFromCenterLine([seg], 50, 5, 2);
        expect(Math.abs(dist)).toBeCloseTo(5, 4);
        // Negative offset too
        const distNeg = calculateDistanceFromCenterLine([seg], 50, -5, 2);
        expect(Math.abs(distNeg)).toBeCloseTo(5, 4);
      }
    });

    it('should calculateDistanceFromCenterLine return Infinity for empty segments', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const dist = calculateDistanceFromCenterLine([], 50, 0, 2);
        expect(dist).toBe(Infinity);
      }
    });

    it('should detectNearestSegment return undefined for empty segments', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const result = detectNearestSegment([], 50, 0);
        expect(result).toBeUndefined();
      }
    });

    it('should detectNearestSegment find the closest segment', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const seg = makeStraightSegment();
        const result = detectNearestSegment([seg], 50, 5);
        expect(result).toBeDefined();
        expect(result!.segmentId).toBe('seg1');
        expect(result!.distance).toBeCloseTo(5, 4);
      }
    });

    it('should detectNearestIntersection find nearby intersection', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const inter = createDefaultTrackIntersectionModel('inter1', {
          trackId: 'track1',
          positionX: 50,
          positionY: 0,
          connectedSegmentIds: ['seg1', 'seg2'],
        });
        const result = detectNearestIntersection([inter], 52, 0, 5);
        expect(result).toBe('inter1');
        // Too far away
        const farResult = detectNearestIntersection([inter], 100, 100, 5);
        expect(farResult).toBe('');
        // Empty intersections
        const emptyResult = detectNearestIntersection([], 50, 0, 5);
        expect(emptyResult).toBe('');
        // Exactly at threshold distance
        const borderResult = detectNearestIntersection([inter], 55, 0, 5);
        expect(borderResult).toBe('inter1');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 13: Servo Integration
  // ═══════════════════════════════════════════════════════════════

  describe('Section 13: Servo Integration', () => {
    it('should applySensorServoAngle add angle offset', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const sensor = createDefaultLineSensorModel(`s-${i}`, {
          driveId: 'drive1',
          sensorAngleDeg: 10,
        });
        const result = applySensorServoAngle(sensor, 45);
        expect(result.sensorAngleDeg).toBe(55);
        expect(result.sensorId).toBe(`s-${i}`);
      }
    });

    it('should applySensorServoAngle not mutate original sensor', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const sensor = createDefaultLineSensorModel(`s-${i}`, {
          driveId: 'drive1',
          sensorAngleDeg: 10,
        });
        applySensorServoAngle(sensor, 45);
        expect(sensor.sensorAngleDeg).toBe(10);
      }
    });

    it('should calculateServoMountedPosition at 0° returns same offsets', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const pos = calculateServoMountedPosition(3.5, 0, 0);
        expect(pos.x).toBeCloseTo(3.5, 5);
        expect(pos.y).toBeCloseTo(0, 5);
      }
    });

    it('should calculateServoMountedPosition at 90° rotates correctly', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const pos = calculateServoMountedPosition(3.5, 0, 90);
        expect(pos.x).toBeCloseTo(0, 4);
        expect(pos.y).toBeCloseTo(3.5, 4);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 14: Blockly Integration
  // ═══════════════════════════════════════════════════════════════

  describe('Section 14: Blockly Integration', () => {
    const makeStraightSegment = () => createDefaultTrackSegmentModel('seg1', {
      trackId: 'track1',
      segmentType: 'STRAIGHT',
      startX: 0, startY: 0,
      endX: 100, endY: 0,
    });

    it('should readLineSensor return valid SensorReadingModel for sensor on line', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const sensor = createDefaultLineSensorModel('center', {
          driveId: 'drive1',
          sensorOffsetXCm: 0,
          sensorOffsetYCm: 0,
        });
        const seg = makeStraightSegment();
        const reading = readLineSensor(sensor, [seg], 50, 0, 0, 2, 1000);
        expect(reading.readingId).toContain('center');
        expect(reading.sensorId).toBe('center');
        expect(reading.analogValue).toBe(DEFAULT_LINE_ADC_MAX);
        expect(reading.digitalValue).toBe(true);
        expect(reading.detectedColor).toBe('BLACK');
        expect(reading.timestamp).toBe(1000);
      }
    });

    it('should readLineSensor return valid reading for sensor off line', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const sensor = createDefaultLineSensorModel('right', {
          driveId: 'drive1',
          sensorOffsetXCm: 10,
          sensorOffsetYCm: 0,
        });
        const seg = makeStraightSegment();
        // Robot at (50, 20): sensor world = (60, 20), far from line y=0
        const reading = readLineSensor(sensor, [seg], 50, 20, 0, 2, 2000);
        expect(reading.analogValue).toBe(DEFAULT_LINE_ADC_NOISE_FLOOR);
        expect(reading.digitalValue).toBe(false);
        expect(reading.detectedColor).toBe('WHITE');
      }
    });

    it('should readLineSensor not mutate original sensor', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const sensor = createDefaultLineSensorModel('center', {
          driveId: 'drive1',
        });
        const origThreshold = sensor.threshold;
        const origState = sensor.sensorState;
        const seg = makeStraightSegment();
        readLineSensor(sensor, [seg], 50, 0, 0, 2, 1000);
        expect(sensor.threshold).toBe(origThreshold);
        expect(sensor.sensorState).toBe(origState);
      }
    });

    it('should readAllLineSensors return readings for all sensors', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const sensors = [
          createDefaultLineSensorModel('left', { driveId: 'drive1', sensorOffsetXCm: -3.5, sensorOffsetYCm: 0 }),
          createDefaultLineSensorModel('center', { driveId: 'drive1', sensorOffsetXCm: 0, sensorOffsetYCm: 0 }),
          createDefaultLineSensorModel('right', { driveId: 'drive1', sensorOffsetXCm: 3.5, sensorOffsetYCm: 0 }),
        ];
        const seg = makeStraightSegment();
        const readings = readAllLineSensors(sensors, [seg], [], 50, 0, 0, 2, 3000);
        expect(readings.length).toBe(3);
        expect(readings[0].sensorId).toBe('left');
        expect(readings[1].sensorId).toBe('center');
        expect(readings[2].sensorId).toBe('right');
        // All have timestamps
        expect(readings[0].timestamp).toBe(3000);
        expect(readings[1].timestamp).toBe(3000);
        expect(readings[2].timestamp).toBe(3000);
        // Empty sensors
        const empty = readAllLineSensors([], [seg], [], 50, 0, 0, 2, 3000);
        expect(empty.length).toBe(0);
      }
    });

    it('should readAllLineSensors populate nearestIntersectionId', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const sensors = [
          createDefaultLineSensorModel('center', { driveId: 'drive1', sensorOffsetXCm: 0, sensorOffsetYCm: 0 }),
        ];
        const seg = makeStraightSegment();
        const inter = createDefaultTrackIntersectionModel('inter1', {
          trackId: 'track1',
          positionX: 50,
          positionY: 0,
          connectedSegmentIds: ['seg1'],
        });
        const readings = readAllLineSensors(sensors, [seg], [inter], 50, 0, 0, 2, 4000);
        expect(readings[0].nearestIntersectionId).toBe('inter1');
      }
    });

    it('should sampleTrack return correct analog/digital/color', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const seg = makeStraightSegment();
        // On line
        const onLine = sampleTrack([seg], 50, 0, 2);
        expect(onLine.analogValue).toBe(DEFAULT_LINE_ADC_MAX);
        expect(onLine.digitalValue).toBe(true);
        expect(onLine.detectedColor).toBe('BLACK');
        // Off line
        const offLine = sampleTrack([seg], 50, 20, 2);
        expect(offLine.analogValue).toBe(DEFAULT_LINE_ADC_NOISE_FLOOR);
        expect(offLine.digitalValue).toBe(false);
        expect(offLine.detectedColor).toBe('WHITE');
      }
    });

    it('should calibrateAllSensors calibrate every sensor', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const sensors = [
          createDefaultLineSensorModel('s1', { driveId: 'drive1' }),
          createDefaultLineSensorModel('s2', { driveId: 'drive1' }),
        ];
        const calibrated = calibrateAllSensors(sensors, 100, 3900);
        expect(calibrated.length).toBe(2);
        expect(calibrated[0].threshold).toBe(2000);
        expect(calibrated[1].threshold).toBe(2000);
        expect(calibrated[0].sensorState).toBe('ACTIVE');
        expect(calibrated[1].sensorState).toBe('ACTIVE');
        // Original sensors not mutated
        expect(sensors[0].sensorState).toBe('IDLE');
        expect(sensors[1].sensorState).toBe('IDLE');
        expect(sensors[0].threshold).toBe(DEFAULT_LINE_SENSOR_THRESHOLD);
        expect(sensors[1].threshold).toBe(DEFAULT_LINE_SENSOR_THRESHOLD);
      }
    });

    it('should full pipeline: readLineSensor → calibrate → re-read', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const sensor = createDefaultLineSensorModel('center', {
          driveId: 'drive1',
          sensorOffsetXCm: 0,
          sensorOffsetYCm: 0,
        });
        const seg = makeStraightSegment();
        // Initial read on line
        const r1 = readLineSensor(sensor, [seg], 50, 0, 0, 2, 1000);
        expect(r1.analogValue).toBe(DEFAULT_LINE_ADC_MAX);
        // Calibrate
        const calibrated = calibrateSensor(sensor, 100, 3900);
        expect(calibrated.threshold).toBe(2000);
        // Re-read (on line)
        const r2 = readLineSensor(calibrated, [seg], 50, 0, 0, 2, 2000);
        expect(r2.analogValue).toBe(DEFAULT_LINE_ADC_MAX);
        expect(r2.digitalValue).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 15: Demo Scenarios
  // ═══════════════════════════════════════════════════════════════

  describe('Section 15: Demo Scenarios', () => {
    // Straight track along X-axis: start=(0,0), end=(100,0), width=2cm
    const makeTrackSegment = () => createDefaultTrackSegmentModel('seg1', {
      trackId: 'track1',
      segmentType: 'STRAIGHT',
      startX: 0, startY: 0,
      endX: 100, endY: 0,
    });

    // Sensor offsets from robot center
    // With heading=0 (moving along +X), Y offsets are perpendicular to track
    // LEFT: Y offset = -3.5 (left side), CENTER: Y offset = 3.5 (forward), RIGHT: Y offset = +3.5 (right side)
    const makeLeftSensor = () => createDefaultLineSensorModel('left', {
      driveId: 'drive1',
      sensorPosition: 'LEFT_SENSOR',
      sensorOffsetXCm: 0,
      sensorOffsetYCm: -3.5,
    });

    const makeCenterSensor = () => createDefaultLineSensorModel('center', {
      driveId: 'drive1',
      sensorPosition: 'CENTER_SENSOR',
      sensorOffsetXCm: 0,
      sensorOffsetYCm: 0,
    });

    const makeRightSensor = () => createDefaultLineSensorModel('right', {
      driveId: 'drive1',
      sensorPosition: 'RIGHT_SENSOR',
      sensorOffsetXCm: 0,
      sensorOffsetYCm: 3.5,
    });

    it('Demo 1: Robot centered at (50,0) heading=0 \u2192 CENTER on BLACK, LEFT/RIGHT off WHITE', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const seg = makeTrackSegment();
        const leftR = readLineSensor(makeLeftSensor(), [seg], 50, 0, 0, 2, 1000);
        const centerR = readLineSensor(makeCenterSensor(), [seg], 50, 0, 0, 2, 1000);
        const rightR = readLineSensor(makeRightSensor(), [seg], 50, 0, 0, 2, 1000);

        // Center sensor at (50, 0) \u2014 directly on line
        expect(centerR.analogValue).toBe(DEFAULT_LINE_ADC_MAX);
        expect(centerR.digitalValue).toBe(true);
        expect(centerR.detectedColor).toBe('BLACK');

        // Left sensor at (50, -3.5) \u2014 3.5cm perpendicular from line center > halfWidth=1 \u2192 off line
        expect(leftR.analogValue).toBe(DEFAULT_LINE_ADC_NOISE_FLOOR);
        expect(leftR.detectedColor).toBe('WHITE');

        // Right sensor at (50, 3.5) \u2014 3.5cm perpendicular from line center > halfWidth=1 \u2192 off line
        expect(rightR.analogValue).toBe(DEFAULT_LINE_ADC_NOISE_FLOOR);
        expect(rightR.detectedColor).toBe('WHITE');
      }
    });

    it('Demo 2: Robot drifting left at (50, -0.8) heading=0 \u2192 LEFT near edge, CENTER on line, RIGHT off', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const seg = makeTrackSegment();
        // Robot at (50, -0.8): heading=0
        // Center sensor at (50, -0.8) \u2192 distance to line (y=0) = 0.8, within halfWidth=1 \u2192 on line
        // Left sensor at (50, -0.8 + -3.5) = (50, -4.3) \u2192 distance = 4.3 > 1 \u2192 off line
        // Right sensor at (50, -0.8 + 3.5) = (50, 2.7) \u2192 distance = 2.7 > 1 \u2192 off line
        const centerR = readLineSensor(makeCenterSensor(), [seg], 50, -0.8, 0, 2, 2000);

        // Center is 0.8cm from centerline, within halfWidth=1
        const expectedCenterAnalog = Math.round(DEFAULT_LINE_ADC_MAX * (1 - 0.8 / 1));
        expect(centerR.analogValue).toBe(expectedCenterAnalog);
        // 819 < threshold (2000) \u2192 digital false, but still detecting something
        expect(centerR.digitalValue).toBe(false);

        const leftR = readLineSensor(makeLeftSensor(), [seg], 50, -0.8, 0, 2, 2000);
        expect(leftR.analogValue).toBe(DEFAULT_LINE_ADC_NOISE_FLOOR);
        expect(leftR.detectedColor).toBe('WHITE');

        const rightR = readLineSensor(makeRightSensor(), [seg], 50, -0.8, 0, 2, 2000);
        expect(rightR.analogValue).toBe(DEFAULT_LINE_ADC_NOISE_FLOOR);
        expect(rightR.detectedColor).toBe('WHITE');
      }
    });

    it('Demo 3: Intersection at (50,0) \u2014 sensor on intersection detects BLACK', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        // Two perpendicular segments crossing at (50,0)
        const segH = createDefaultTrackSegmentModel('segH', {
          trackId: 'track1',
          segmentType: 'STRAIGHT',
          startX: 0, startY: 0,
          endX: 100, endY: 0,
        });
        const segV = createDefaultTrackSegmentModel('segV', {
          trackId: 'track1',
          segmentType: 'STRAIGHT',
          startX: 50, startY: -50,
          endX: 50, endY: 50,
        });
        const inter = createDefaultTrackIntersectionModel('inter1', {
          trackId: 'track1',
          positionX: 50,
          positionY: 0,
          connectedSegmentIds: ['segH', 'segV'],
        });

        // Robot at (50,0) heading=0: sensors perpendicular via Y offsets
        // Center at (50, 0): on both lines \u2192 BLACK
        // Left at (50, -3.5): on vertical line (segV at x=50) \u2192 distance=0 from segV \u2192 BLACK
        // Right at (50, 3.5): on vertical line (segV at x=50) \u2192 distance=0 from segV \u2192 BLACK
        const sensors = [makeLeftSensor(), makeCenterSensor(), makeRightSensor()];
        const readings = readAllLineSensors(sensors, [segH, segV], [inter], 50, 0, 0, 2, 5000);

        // Center at (50,0): on both lines \u2192 distance=0 \u2192 ADC_MAX \u2192 BLACK
        expect(readings[1].analogValue).toBe(DEFAULT_LINE_ADC_MAX);
        expect(readings[1].detectedColor).toBe('BLACK');
        expect(readings[1].nearestIntersectionId).toBe('inter1');

        // Left at (50, -3.5): nearest to segV at x=50, distance in X = 0 \u2192 BLACK
        expect(readings[0].analogValue).toBe(DEFAULT_LINE_ADC_MAX);
        expect(readings[0].detectedColor).toBe('BLACK');

        // Right at (50, 3.5): nearest to segV at x=50, distance in X = 0 \u2192 BLACK
        expect(readings[2].analogValue).toBe(DEFAULT_LINE_ADC_MAX);
        expect(readings[2].detectedColor).toBe('BLACK');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 16: Synchronizer CRUD & Serialization
  // ═══════════════════════════════════════════════════════════════

  describe('Section 16: Synchronizer CRUD & Serialization', () => {
    let sync: LineFollowingSynchronizer;

    beforeEach(() => {
      sync = new LineFollowingSynchronizer();
    });

    it('should register and lookup LineTrackModel', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        const model = createDefaultLineTrackModel(`track-${i}`);
        sync.lineTracks.register(`track-${i}`, model);
        const found = sync.lineTracks.lookup(`track-${i}`);
        expect(found).toBeDefined();
        expect(found!.trackId).toBe(`track-${i}`);
        expect(sync.lineTracks.has(`track-${i}`)).toBe(true);
        expect(sync.lineTracks.size).toBe(1);
        expect(sync.lineTracks.keys()).toEqual([`track-${i}`]);
      }
    });

    it('should register and lookup LineSensorModel', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        const model = createDefaultLineSensorModel(`sensor-${i}`);
        sync.lineSensors.register(`sensor-${i}`, model);
        const found = sync.lineSensors.lookup(`sensor-${i}`);
        expect(found).toBeDefined();
        expect(found!.sensorId).toBe(`sensor-${i}`);
        expect(sync.lineSensors.has(`sensor-${i}`)).toBe(true);
      }
    });

    it('should register and lookup TrackSegmentModel', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        const model = createDefaultTrackSegmentModel(`seg-${i}`);
        sync.trackSegments.register(`seg-${i}`, model);
        const found = sync.trackSegments.lookup(`seg-${i}`);
        expect(found).toBeDefined();
        expect(found!.segmentId).toBe(`seg-${i}`);
        expect(sync.trackSegments.has(`seg-${i}`)).toBe(true);
        expect(sync.trackSegments.size).toBe(1);
      }
    });

    it('should register and lookup TrackIntersectionModel', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        const model = createDefaultTrackIntersectionModel(`inter-${i}`);
        sync.trackIntersections.register(`inter-${i}`, model);
        const found = sync.trackIntersections.lookup(`inter-${i}`);
        expect(found).toBeDefined();
        expect(found!.intersectionId).toBe(`inter-${i}`);
      }
    });

    it('should register and lookup TrackMarkerModel', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        const model = createDefaultTrackMarkerModel(`marker-${i}`);
        sync.trackMarkers.register(`marker-${i}`, model);
        const found = sync.trackMarkers.lookup(`marker-${i}`);
        expect(found).toBeDefined();
        expect(found!.markerId).toBe(`marker-${i}`);
      }
    });

    it('should register and lookup SensorReadingModel', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        const model = createDefaultSensorReadingModel(`reading-${i}`);
        sync.sensorReadings.register(`reading-${i}`, model);
        const found = sync.sensorReadings.lookup(`reading-${i}`);
        expect(found).toBeDefined();
        expect(found!.readingId).toBe(`reading-${i}`);
      }
    });

    it('should getAll return all registered models in order', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        sync.lineTracks.register('a', createDefaultLineTrackModel('a'));
        sync.lineTracks.register('b', createDefaultLineTrackModel('b'));
        sync.lineTracks.register('c', createDefaultLineTrackModel('c'));
        const all = sync.lineTracks.getAll();
        expect(all.length).toBe(3);
        expect(all[0].trackId).toBe('a');
        expect(all[1].trackId).toBe('b');
        expect(all[2].trackId).toBe('c');
        expect(sync.lineTracks.size).toBe(3);
        expect(sync.lineTracks.keys()).toEqual(['a', 'b', 'c']);
      }
    });

    it('should update model partial fields', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        sync.lineTracks.register('t1', createDefaultLineTrackModel('t1'));
        sync.lineTracks.update('t1', { trackName: 'Updated', trackWidthCm: 5 });
        const updated = sync.lineTracks.lookup('t1');
        expect(updated).toBeDefined();
        expect(updated!.trackName).toBe('Updated');
        expect(updated!.trackWidthCm).toBe(5);
        expect(updated!.trackId).toBe('t1');
        expect(updated!.trackColor).toBe('BLACK');
        expect(updated!.backgroundColor).toBe('WHITE');
      }
    });

    it('should remove model from registry', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        sync.lineTracks.register('t1', createDefaultLineTrackModel('t1'));
        expect(sync.lineTracks.has('t1')).toBe(true);
        expect(sync.lineTracks.size).toBe(1);
        sync.lineTracks.remove('t1');
        expect(sync.lineTracks.has('t1')).toBe(false);
        expect(sync.lineTracks.lookup('t1')).toBeUndefined();
        expect(sync.lineTracks.size).toBe(0);
        expect(sync.lineTracks.keys().length).toBe(0);
      }
    });

    it('should clear all registries', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.lineTracks.register(`t-${i}`, createDefaultLineTrackModel(`t-${i}`));
        sync.lineSensors.register(`s-${i}`, createDefaultLineSensorModel(`s-${i}`));
        sync.clear();
        expect(sync.lineTracks.size).toBe(0);
        expect(sync.lineSensors.size).toBe(0);
        expect(sync.trackSegments.size).toBe(0);
        expect(sync.trackIntersections.size).toBe(0);
        expect(sync.trackMarkers.size).toBe(0);
        expect(sync.sensorReadings.size).toBe(0);
      }
    });

    it('should buildSnapshot return LineFollowingSnapshot', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        sync.lineTracks.register('t1', createDefaultLineTrackModel('t1'));
        sync.lineSensors.register('s1', createDefaultLineSensorModel('s1'));
        const snap = sync.buildSnapshot();
        expect(snap.lineTracks.length).toBe(1);
        expect(snap.lineSensors.length).toBe(1);
        expect(snap.trackSegments.length).toBe(0);
        expect(snap.trackIntersections.length).toBe(0);
        expect(snap.trackMarkers.length).toBe(0);
        expect(snap.sensorReadings.length).toBe(0);
        expect(snap.lineTracks[0].trackId).toBe('t1');
        expect(snap.lineSensors[0].sensorId).toBe('s1');
      }
    });

    it('should toJSON and fromJSON round-trip', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        sync.lineTracks.register('t1', createDefaultLineTrackModel('t1', { trackName: 'Test' }));
        sync.lineSensors.register('s1', createDefaultLineSensorModel('s1', { driveId: 'drive1' }));
        sync.trackSegments.register('seg1', createDefaultTrackSegmentModel('seg1', { trackId: 't1' }));
        const json = sync.toJSON();
        const sync2 = new LineFollowingSynchronizer();
        sync2.fromJSON(json);
        expect(sync2.lineTracks.lookup('t1')!.trackName).toBe('Test');
        expect(sync2.lineSensors.lookup('s1')!.driveId).toBe('drive1');
        expect(sync2.trackSegments.lookup('seg1')!.trackId).toBe('t1');
        expect(sync2.lineTracks.size).toBe(1);
        expect(sync2.lineSensors.size).toBe(1);
        expect(sync2.trackSegments.size).toBe(1);
      }
    });

    it('should fromJSON with null/undefined safely clear', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.lineTracks.register('t1', createDefaultLineTrackModel('t1'));
        sync.fromJSON(null as any);
        expect(sync.lineTracks.size).toBe(0);
        sync.lineTracks.register('t1', createDefaultLineTrackModel('t1'));
        sync.fromJSON(undefined as any);
        expect(sync.lineTracks.size).toBe(0);
      }
    });

    it('should clone produce independent synchronizer', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        sync.lineTracks.register('t1', createDefaultLineTrackModel('t1', { trackName: 'Original' }));
        const cloned = sync.clone();
        cloned.lineTracks.update('t1', { trackName: 'Cloned' });
        expect(sync.lineTracks.lookup('t1')!.trackName).toBe('Original');
        expect(cloned.lineTracks.lookup('t1')!.trackName).toBe('Cloned');
        expect(sync.lineTracks.size).toBe(1);
        expect(cloned.lineTracks.size).toBe(1);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 17: Clone Safety
  // ═══════════════════════════════════════════════════════════════

  describe('Section 17: Clone Safety', () => {
    let sync: LineFollowingSynchronizer;

    beforeEach(() => {
      sync = new LineFollowingSynchronizer();
    });

    it('should deep-copy isolate LineTrackModel registry', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        sync.lineTracks.register('t1', createDefaultLineTrackModel('t1', { trackName: 'A' }));
        const fetched = sync.lineTracks.lookup('t1')!;
        fetched.trackName = 'MUTATED';
        const refetch = sync.lineTracks.lookup('t1')!;
        expect(refetch.trackName).toBe('A');
      }
    });

    it('should deep-copy isolate LineSensorModel registry', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        sync.lineSensors.register('s1', createDefaultLineSensorModel('s1', { driveId: 'drive1' }));
        const fetched = sync.lineSensors.lookup('s1')!;
        fetched.driveId = 'MUTATED';
        const refetch = sync.lineSensors.lookup('s1')!;
        expect(refetch.driveId).toBe('drive1');
      }
    });

    it('should deep-copy isolate TrackSegmentModel registry', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        sync.trackSegments.register('seg1', createDefaultTrackSegmentModel('seg1', { trackId: 't1' }));
        const fetched = sync.trackSegments.lookup('seg1')!;
        fetched.trackId = 'MUTATED';
        const refetch = sync.trackSegments.lookup('seg1')!;
        expect(refetch.trackId).toBe('t1');
      }
    });

    it('should deep-copy isolate TrackIntersectionModel registry', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        sync.trackIntersections.register('i1', createDefaultTrackIntersectionModel('i1', {
          trackId: 't1',
          connectedSegmentIds: ['seg1'],
        }));
        const fetched = sync.trackIntersections.lookup('i1')!;
        fetched.connectedSegmentIds.push('MUTATED');
        const refetch = sync.trackIntersections.lookup('i1')!;
        expect(refetch.connectedSegmentIds).toEqual(['seg1']);
      }
    });

    it('should deep-copy isolate TrackMarkerModel registry', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        sync.trackMarkers.register('m1', createDefaultTrackMarkerModel('m1', { trackId: 't1' }));
        const fetched = sync.trackMarkers.lookup('m1')!;
        fetched.trackId = 'MUTATED';
        const refetch = sync.trackMarkers.lookup('m1')!;
        expect(refetch.trackId).toBe('t1');
      }
    });

    it('should deep-copy isolate SensorReadingModel registry', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        sync.sensorReadings.register('r1', createDefaultSensorReadingModel('r1', { sensorId: 's1' }));
        const fetched = sync.sensorReadings.lookup('r1')!;
        fetched.sensorId = 'MUTATED';
        const refetch = sync.sensorReadings.lookup('r1')!;
        expect(refetch.sensorId).toBe('s1');
      }
    });

    it('should getAll return deep copies that cannot pollute registry', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        sync.lineTracks.register('t1', createDefaultLineTrackModel('t1', { trackName: 'Safe' }));
        sync.lineTracks.register('t2', createDefaultLineTrackModel('t2', { trackName: 'Safe2' }));
        const all = sync.lineTracks.getAll();
        all[0].trackName = 'POLLUTED';
        all.push(createDefaultLineTrackModel('t3'));
        const refetch = sync.lineTracks.getAll();
        expect(refetch.length).toBe(2);
        expect(refetch[0].trackName).toBe('Safe');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 18: Lifecycle & Constants
  // ═══════════════════════════════════════════════════════════════

  describe('Section 18: Lifecycle & Constants', () => {
    it('should have correct DEFAULT_LINE_TRACK_WIDTH_CM', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(DEFAULT_LINE_TRACK_WIDTH_CM).toBe(2.0);
      }
    });

    it('should have correct DEFAULT_LINE_SENSOR_THRESHOLD', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(DEFAULT_LINE_SENSOR_THRESHOLD).toBe(2000);
      }
    });

    it('should have correct DEFAULT_LINE_ADC_MAX', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(DEFAULT_LINE_ADC_MAX).toBe(4095);
      }
    });

    it('should have correct DEFAULT_LINE_ADC_NOISE_FLOOR', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(DEFAULT_LINE_ADC_NOISE_FLOOR).toBe(80);
      }
    });

    it('should have correct DEFAULT_LINE_SENSOR_OFFSET_CM', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(DEFAULT_LINE_SENSOR_OFFSET_CM).toBe(3.5);
      }
    });

    it('should have correct DEFAULT_LINE_EDGE_MARGIN', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(DEFAULT_LINE_EDGE_MARGIN).toBe(300);
      }
    });

    it('should have correct DEFAULT_LINE_MAX_READINGS and CALIBRATION_SAMPLES', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(DEFAULT_LINE_MAX_READINGS).toBe(500);
        expect(DEFAULT_LINE_CALIBRATION_SAMPLES).toBe(10);
        expect(typeof DEFAULT_LINE_MAX_READINGS).toBe('number');
        expect(typeof DEFAULT_LINE_CALIBRATION_SAMPLES).toBe('number');
        expect(typeof DEFAULT_LINE_TRACK_WIDTH_CM).toBe('number');
        expect(typeof DEFAULT_LINE_SENSOR_THRESHOLD).toBe('number');
        expect(typeof DEFAULT_LINE_ADC_MAX).toBe('number');
        expect(typeof DEFAULT_LINE_ADC_NOISE_FLOOR).toBe('number');
        expect(typeof DEFAULT_LINE_SENSOR_OFFSET_CM).toBe('number');
        expect(typeof DEFAULT_LINE_EDGE_MARGIN).toBe('number');
      }
    });

    it('should have correct VALID_* arrays', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(VALID_LINE_TRACK_COLORS).toEqual(['BLACK', 'WHITE', 'RED', 'GREEN', 'BLUE', 'CUSTOM']);
        expect(VALID_LINE_TRACK_COLORS.length).toBe(6);

        expect(VALID_LINE_SENSOR_STATES).toEqual(['IDLE', 'CALIBRATING', 'ACTIVE', 'ERROR', 'DISABLED']);
        expect(VALID_LINE_SENSOR_STATES.length).toBe(5);

        expect(VALID_LINE_TRACK_TYPES).toEqual(['STRAIGHT', 'CURVE', 'LOOP', 'JUNCTION', 'INTERSECTION', 'CHECKPOINT']);
        expect(VALID_LINE_TRACK_TYPES.length).toBe(6);

        expect(VALID_LINE_SENSOR_POSITIONS).toEqual(['LEFT_SENSOR', 'CENTER_SENSOR', 'RIGHT_SENSOR', 'CUSTOM']);
        expect(VALID_LINE_SENSOR_POSITIONS.length).toBe(4);

        expect(VALID_LINE_MARKER_TYPES).toEqual(['CHECKPOINT', 'START', 'FINISH', 'WAYPOINT']);
        expect(VALID_LINE_MARKER_TYPES.length).toBe(4);

        expect(VALID_LINE_DETECTED_COLORS).toEqual(['BLACK', 'WHITE', 'EDGE', 'UNKNOWN']);
        expect(VALID_LINE_DETECTED_COLORS.length).toBe(4);
      }
    });
  });

});
