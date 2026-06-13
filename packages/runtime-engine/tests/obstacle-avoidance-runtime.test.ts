// ═══════════════════════════════════════════════════════════════
// Phase 25B: Virtual Obstacle Avoidance Runtime — Tests
// 18 sections, 250,000+ assertions, stress iterations = 500
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';

import {
  // Constants
  DEFAULT_AVOIDANCE_FRONT_THRESHOLD_CM,
  DEFAULT_AVOIDANCE_SIDE_THRESHOLD_CM,
  DEFAULT_AVOIDANCE_REAR_THRESHOLD_CM,
  DEFAULT_AVOIDANCE_CRITICAL_DISTANCE_CM,
  DEFAULT_AVOIDANCE_SCAN_RESOLUTION_DEG,
  DEFAULT_AVOIDANCE_SCAN_RANGE_DEG,
  DEFAULT_AVOIDANCE_PREDICTION_HORIZON_MS,
  DEFAULT_AVOIDANCE_CONFIDENCE_THRESHOLD,
  VALID_AVOIDANCE_STATES,
  VALID_AVOIDANCE_SEVERITIES,
  VALID_AVOIDANCE_NAVIGATION_ACTIONS,
  VALID_AVOIDANCE_DETECTION_ZONES,
  VALID_AVOIDANCE_RULE_PRIORITIES,
  VALID_AVOIDANCE_PREDICTION_STATES,

  // Factories
  createDefaultObstacleAvoidanceModel,
  createDefaultAvoidanceRuleModel,
  createDefaultObstacleDetectionModel,
  createDefaultNavigationDecisionModel,
  createDefaultSafeZoneModel,
  createDefaultCollisionPredictionModel,

  // Validators
  validateObstacleAvoidanceModel,
  validateAvoidanceRuleModel,
  validateObstacleDetectionModel,
  validateNavigationDecisionModel,
  validateSafeZoneModel,
  validateCollisionPredictionModel,

  // Duplicate validators
  validateDuplicateObstacleAvoidanceIds,
  validateDuplicateAvoidanceRuleIds,
  validateDuplicateObstacleDetectionIds,
  validateDuplicateNavigationDecisionIds,
  validateDuplicateSafeZoneIds,
  validateDuplicateCollisionPredictionIds,

  // Detection engine
  detectObstacleInZone,
  classifyObstacleSeverity,
  calculateObstacleBearing,
  isObstacleInDetectionZone,
  aggregateDetections,

  // Collision prediction engine
  predictTimeToCollision,
  predictImpactPoint,
  calculateCollisionProbability,
  calculateSafeDistanceMargin,
  createCollisionPrediction,

  // Navigation decision engine
  decideNavigationAction,
  evaluateStopCondition,
  evaluateReverseCondition,
  evaluateTurnDirection,
  shouldResumeForward,
  buildDecisionReason,

  // Differential drive integration
  predictFuturePosition,
  predictFutureHeading,
  checkFutureCollision,
  calculateStoppingDistance,

  // Line following integration
  shouldFollowLine,
  shouldAvoidObstacle,
  determineResumeLineFollowing,
  mergeLineAndAvoidanceBehavior,

  // Servo scanning integration
  generateScanAngles,
  createScanResult,
  findClearestDirection,
  buildScanProfile,

  // Blockly integration
  obstacleDetected,
  getObstacleDistance,
  avoidObstacle,
  scanDirection,
  scanLeft,
  scanRight,
  getAvoidanceState,

  // Registry & Synchronizer
  ObstacleAvoidanceRegistry,
  ObstacleAvoidanceSynchronizer,
} from '../src/stage/obstacle-avoidance-runtime';

import type {
  ObstacleAvoidanceModel,
  AvoidanceRuleModel,
  ObstacleDetectionModel,
  NavigationDecisionModel,
  SafeZoneModel,
  CollisionPredictionModel,
  ObstacleAvoidanceSnapshot,
  AvoidanceState,
  ObstacleSeverity,
  NavigationAction,
} from '../src/types';

const STRESS_ITERATIONS = 500;

describe('Phase 25B: Obstacle Avoidance Runtime', () => {

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1: Factory Defaults
  // ═══════════════════════════════════════════════════════════════

  describe('Section 1: Factory Defaults', () => {
    it('should create default ObstacleAvoidanceModel with correct defaults', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultObstacleAvoidanceModel();
        expect(model.avoidanceId).toBe('');
        expect(model.driveId).toBe('');
        expect(model.esp32Id).toBe('');
        expect(model.avoidanceState).toBe('IDLE');
        expect(model.frontSensorId).toBe('');
        expect(model.leftSensorId).toBe('');
        expect(model.rightSensorId).toBe('');
        expect(model.rearSensorId).toBe('');
        expect(model.activeRuleIds).toEqual([]);
        expect(model.currentAction).toBe('FORWARD');
        expect(model.lastDecisionId).toBe('');
        expect(model.isEnabled).toBe(true);
        expect(model.timestamp).toBe(0);
        expect(model.futureAvoidanceHints).toEqual({});
      }
    });

    it('should create ObstacleAvoidanceModel with overrides', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultObstacleAvoidanceModel({
          avoidanceId: `avd-${i}`,
          driveId: 'drive-1',
          avoidanceState: 'SCANNING',
          isEnabled: false,
        });
        expect(model.avoidanceId).toBe(`avd-${i}`);
        expect(model.driveId).toBe('drive-1');
        expect(model.avoidanceState).toBe('SCANNING');
        expect(model.isEnabled).toBe(false);
        expect(model.esp32Id).toBe('');
        expect(model.currentAction).toBe('FORWARD');
      }
    });

    it('should create default AvoidanceRuleModel with correct defaults', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultAvoidanceRuleModel();
        expect(model.ruleId).toBe('');
        expect(model.avoidanceId).toBe('');
        expect(model.ruleName).toBe('');
        expect(model.detectionZone).toBe('FRONT');
        expect(model.thresholdCm).toBe(DEFAULT_AVOIDANCE_FRONT_THRESHOLD_CM);
        expect(model.criticalDistanceCm).toBe(DEFAULT_AVOIDANCE_CRITICAL_DISTANCE_CM);
        expect(model.priority).toBe(1);
        expect(model.actionOnTrigger).toBe('STOP');
        expect(model.isActive).toBe(true);
        expect(model.futureRuleHints).toEqual({});
      }
    });

    it('should create default ObstacleDetectionModel with correct defaults', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultObstacleDetectionModel();
        expect(model.detectionId).toBe('');
        expect(model.avoidanceId).toBe('');
        expect(model.sensorId).toBe('');
        expect(model.distanceCm).toBe(400);
        expect(model.bearingDeg).toBe(0);
        expect(model.detectionZone).toBe('FRONT');
        expect(model.severity).toBe('NONE');
        expect(model.confidence).toBe(0);
        expect(model.timestamp).toBe(0);
        expect(model.futureDetectionHints).toEqual({});
      }
    });

    it('should create default NavigationDecisionModel with correct defaults', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultNavigationDecisionModel();
        expect(model.decisionId).toBe('');
        expect(model.avoidanceId).toBe('');
        expect(model.selectedAction).toBe('FORWARD');
        expect(model.previousAction).toBe('FORWARD');
        expect(model.decisionReason).toBe('');
        expect(model.triggerDetectionId).toBe('');
        expect(model.frontDistanceCm).toBe(400);
        expect(model.leftDistanceCm).toBe(400);
        expect(model.rightDistanceCm).toBe(400);
        expect(model.rearDistanceCm).toBe(400);
        expect(model.decisionTimestamp).toBe(0);
        expect(model.futureDecisionHints).toEqual({});
      }
    });

    it('should create default SafeZoneModel with correct defaults', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultSafeZoneModel();
        expect(model.zoneId).toBe('');
        expect(model.avoidanceId).toBe('');
        expect(model.zoneName).toBe('');
        expect(model.centerX).toBe(0);
        expect(model.centerY).toBe(0);
        expect(model.radiusCm).toBe(50);
        expect(model.minX).toBe(-50);
        expect(model.minY).toBe(-50);
        expect(model.maxX).toBe(50);
        expect(model.maxY).toBe(50);
        expect(model.isSafe).toBe(true);
        expect(model.lastCheckedTimestamp).toBe(0);
        expect(model.futureZoneHints).toEqual({});
      }
    });

    it('should create default CollisionPredictionModel with correct defaults', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultCollisionPredictionModel();
        expect(model.predictionId).toBe('');
        expect(model.avoidanceId).toBe('');
        expect(model.detectionId).toBe('');
        expect(model.timeToCollisionMs).toBe(Infinity);
        expect(model.predictedImpactX).toBe(0);
        expect(model.predictedImpactY).toBe(0);
        expect(model.collisionProbability).toBe(0);
        expect(model.safeDistanceMarginCm).toBe(400);
        expect(model.robotVelocityCmPerSec).toBe(0);
        expect(model.robotHeadingDeg).toBe(0);
        expect(model.predictionTimestamp).toBe(0);
        expect(model.futurePredictionHints).toEqual({});
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 2: Validation — ObstacleAvoidanceModel
  // ═══════════════════════════════════════════════════════════════

  describe('Section 2: Validation — ObstacleAvoidanceModel', () => {
    it('should return no warnings for a valid model', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultObstacleAvoidanceModel({
          avoidanceId: `avd-${i}`,
          driveId: 'drive-1',
          esp32Id: 'esp-1',
        });
        const warnings = validateObstacleAvoidanceModel(model);
        expect(warnings.length).toBe(0);
      }
    });

    it('should warn on empty avoidanceId', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultObstacleAvoidanceModel({
          driveId: 'drive-1',
          esp32Id: 'esp-1',
        });
        const warnings = validateObstacleAvoidanceModel(model);
        expect(warnings.length).toBeGreaterThan(0);
        expect(warnings.some(w => w.includes('avoidanceId'))).toBe(true);
      }
    });

    it('should warn on invalid avoidanceState', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultObstacleAvoidanceModel({
          avoidanceId: `avd-${i}`,
          driveId: 'drive-1',
          esp32Id: 'esp-1',
          avoidanceState: 'INVALID_STATE' as AvoidanceState,
        });
        const warnings = validateObstacleAvoidanceModel(model);
        expect(warnings.some(w => w.includes('avoidanceState'))).toBe(true);
      }
    });

    it('should warn on negative timestamp', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultObstacleAvoidanceModel({
          avoidanceId: `avd-${i}`,
          driveId: 'drive-1',
          esp32Id: 'esp-1',
          timestamp: -1,
        });
        const warnings = validateObstacleAvoidanceModel(model);
        expect(warnings.some(w => w.includes('timestamp'))).toBe(true);
      }
    });

    it('should still pass with very large values (warnings only)', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultObstacleAvoidanceModel({
          avoidanceId: `avd-${i}`,
          driveId: 'drive-1',
          esp32Id: 'esp-1',
          timestamp: 999999999,
        });
        const warnings = validateObstacleAvoidanceModel(model);
        expect(warnings.length).toBe(0);
      }
    });

    it('should not throw on models with unusual property values', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultObstacleAvoidanceModel({
          avoidanceId: `avd-${i}`,
          driveId: 'drive-1',
          esp32Id: 'esp-1',
          currentAction: 'INVALID_ACTION' as NavigationAction,
        });
        expect(() => validateObstacleAvoidanceModel(model)).not.toThrow();
        const warnings = validateObstacleAvoidanceModel(model);
        expect(warnings.some(w => w.includes('currentAction'))).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 3: Validation — AvoidanceRuleModel
  // ═══════════════════════════════════════════════════════════════

  describe('Section 3: Validation — AvoidanceRuleModel', () => {
    it('should return no warnings for a valid model', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultAvoidanceRuleModel({
          ruleId: `rule-${i}`,
          avoidanceId: 'avd-1',
        });
        const warnings = validateAvoidanceRuleModel(model);
        expect(warnings.length).toBe(0);
      }
    });

    it('should warn on empty ruleId', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultAvoidanceRuleModel({
          avoidanceId: 'avd-1',
        });
        const warnings = validateAvoidanceRuleModel(model);
        expect(warnings.some(w => w.includes('ruleId'))).toBe(true);
      }
    });

    it('should warn on invalid detectionZone', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultAvoidanceRuleModel({
          ruleId: `rule-${i}`,
          avoidanceId: 'avd-1',
          detectionZone: 'UP' as any,
        });
        const warnings = validateAvoidanceRuleModel(model);
        expect(warnings.some(w => w.includes('detectionZone'))).toBe(true);
      }
    });

    it('should warn on negative thresholdCm', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultAvoidanceRuleModel({
          ruleId: `rule-${i}`,
          avoidanceId: 'avd-1',
          thresholdCm: -5,
        });
        const warnings = validateAvoidanceRuleModel(model);
        expect(warnings.some(w => w.includes('thresholdCm'))).toBe(true);
      }
    });

    it('should warn when criticalDistanceCm exceeds thresholdCm', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultAvoidanceRuleModel({
          ruleId: `rule-${i}`,
          avoidanceId: 'avd-1',
          thresholdCm: 10,
          criticalDistanceCm: 15,
        });
        const warnings = validateAvoidanceRuleModel(model);
        expect(warnings.some(w => w.includes('criticalDistanceCm'))).toBe(true);
      }
    });

    it('should warn on out-of-range priority', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultAvoidanceRuleModel({
          ruleId: `rule-${i}`,
          avoidanceId: 'avd-1',
          priority: 0,
        });
        const warnings = validateAvoidanceRuleModel(model);
        expect(warnings.some(w => w.includes('priority'))).toBe(true);

        const model2 = createDefaultAvoidanceRuleModel({
          ruleId: `rule2-${i}`,
          avoidanceId: 'avd-1',
          priority: 6,
        });
        const warnings2 = validateAvoidanceRuleModel(model2);
        expect(warnings2.some(w => w.includes('priority'))).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 4: Validation — ObstacleDetectionModel
  // ═══════════════════════════════════════════════════════════════

  describe('Section 4: Validation — ObstacleDetectionModel', () => {
    it('should return no warnings for a valid model', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultObstacleDetectionModel({
          detectionId: `det-${i}`,
          avoidanceId: 'avd-1',
          sensorId: 'sensor-1',
        });
        const warnings = validateObstacleDetectionModel(model);
        expect(warnings.length).toBe(0);
      }
    });

    it('should warn on empty detectionId', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultObstacleDetectionModel({
          avoidanceId: 'avd-1',
          sensorId: 'sensor-1',
        });
        const warnings = validateObstacleDetectionModel(model);
        expect(warnings.some(w => w.includes('detectionId'))).toBe(true);
      }
    });

    it('should warn on invalid detectionZone', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultObstacleDetectionModel({
          detectionId: `det-${i}`,
          avoidanceId: 'avd-1',
          sensorId: 'sensor-1',
          detectionZone: 'ABOVE' as any,
        });
        const warnings = validateObstacleDetectionModel(model);
        expect(warnings.some(w => w.includes('detectionZone'))).toBe(true);
      }
    });

    it('should warn on negative distanceCm', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultObstacleDetectionModel({
          detectionId: `det-${i}`,
          avoidanceId: 'avd-1',
          sensorId: 'sensor-1',
          distanceCm: -10,
        });
        const warnings = validateObstacleDetectionModel(model);
        expect(warnings.some(w => w.includes('distanceCm'))).toBe(true);
      }
    });

    it('should warn on confidence out of range', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultObstacleDetectionModel({
          detectionId: `det-${i}`,
          avoidanceId: 'avd-1',
          sensorId: 'sensor-1',
          confidence: 1.5,
        });
        const warnings = validateObstacleDetectionModel(model);
        expect(warnings.some(w => w.includes('confidence'))).toBe(true);

        const model2 = createDefaultObstacleDetectionModel({
          detectionId: `det2-${i}`,
          avoidanceId: 'avd-1',
          sensorId: 'sensor-1',
          confidence: -0.5,
        });
        const warnings2 = validateObstacleDetectionModel(model2);
        expect(warnings2.some(w => w.includes('confidence'))).toBe(true);
      }
    });

    it('should not throw on any input', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultObstacleDetectionModel({
          detectionId: `det-${i}`,
          avoidanceId: 'avd-1',
          sensorId: 'sensor-1',
          severity: 'INVALID' as ObstacleSeverity,
        });
        expect(() => validateObstacleDetectionModel(model)).not.toThrow();
        const warnings = validateObstacleDetectionModel(model);
        expect(warnings.some(w => w.includes('severity'))).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 5: Validation — NavigationDecisionModel
  // ═══════════════════════════════════════════════════════════════

  describe('Section 5: Validation — NavigationDecisionModel', () => {
    it('should return no warnings for a valid model', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultNavigationDecisionModel({
          decisionId: `dec-${i}`,
          avoidanceId: 'avd-1',
        });
        const warnings = validateNavigationDecisionModel(model);
        expect(warnings.length).toBe(0);
      }
    });

    it('should warn on empty decisionId', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultNavigationDecisionModel({
          avoidanceId: 'avd-1',
        });
        const warnings = validateNavigationDecisionModel(model);
        expect(warnings.some(w => w.includes('decisionId'))).toBe(true);
      }
    });

    it('should warn on invalid selectedAction', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultNavigationDecisionModel({
          decisionId: `dec-${i}`,
          avoidanceId: 'avd-1',
          selectedAction: 'FLY' as NavigationAction,
        });
        const warnings = validateNavigationDecisionModel(model);
        expect(warnings.some(w => w.includes('selectedAction'))).toBe(true);
      }
    });

    it('should warn on negative frontDistanceCm', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultNavigationDecisionModel({
          decisionId: `dec-${i}`,
          avoidanceId: 'avd-1',
          frontDistanceCm: -1,
        });
        const warnings = validateNavigationDecisionModel(model);
        expect(warnings.some(w => w.includes('frontDistanceCm'))).toBe(true);
      }
    });

    it('should warn on negative rearDistanceCm', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultNavigationDecisionModel({
          decisionId: `dec-${i}`,
          avoidanceId: 'avd-1',
          rearDistanceCm: -1,
        });
        const warnings = validateNavigationDecisionModel(model);
        expect(warnings.some(w => w.includes('rearDistanceCm'))).toBe(true);
      }
    });

    it('should not throw on any input combination', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultNavigationDecisionModel({
          decisionId: `dec-${i}`,
          avoidanceId: 'avd-1',
          decisionTimestamp: -100,
        });
        expect(() => validateNavigationDecisionModel(model)).not.toThrow();
        const warnings = validateNavigationDecisionModel(model);
        expect(warnings.some(w => w.includes('decisionTimestamp'))).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 6: Validation — SafeZoneModel
  // ═══════════════════════════════════════════════════════════════

  describe('Section 6: Validation — SafeZoneModel', () => {
    it('should return no warnings for a valid model', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultSafeZoneModel({
          zoneId: `zone-${i}`,
          avoidanceId: 'avd-1',
        });
        const warnings = validateSafeZoneModel(model);
        expect(warnings.length).toBe(0);
      }
    });

    it('should warn on empty zoneId', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultSafeZoneModel({
          avoidanceId: 'avd-1',
        });
        const warnings = validateSafeZoneModel(model);
        expect(warnings.some(w => w.includes('zoneId'))).toBe(true);
      }
    });

    it('should warn on negative radiusCm', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultSafeZoneModel({
          zoneId: `zone-${i}`,
          avoidanceId: 'avd-1',
          radiusCm: -10,
        });
        const warnings = validateSafeZoneModel(model);
        expect(warnings.some(w => w.includes('radiusCm'))).toBe(true);
      }
    });

    it('should warn when minX exceeds maxX', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultSafeZoneModel({
          zoneId: `zone-${i}`,
          avoidanceId: 'avd-1',
          minX: 100,
          maxX: 10,
        });
        const warnings = validateSafeZoneModel(model);
        expect(warnings.some(w => w.includes('minX'))).toBe(true);
      }
    });

    it('should warn when minY exceeds maxY', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultSafeZoneModel({
          zoneId: `zone-${i}`,
          avoidanceId: 'avd-1',
          minY: 100,
          maxY: 10,
        });
        const warnings = validateSafeZoneModel(model);
        expect(warnings.some(w => w.includes('minY'))).toBe(true);
      }
    });

    it('should not throw on negative lastCheckedTimestamp', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultSafeZoneModel({
          zoneId: `zone-${i}`,
          avoidanceId: 'avd-1',
          lastCheckedTimestamp: -5,
        });
        expect(() => validateSafeZoneModel(model)).not.toThrow();
        const warnings = validateSafeZoneModel(model);
        expect(warnings.some(w => w.includes('lastCheckedTimestamp'))).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 7: Validation — CollisionPredictionModel
  // ═══════════════════════════════════════════════════════════════

  describe('Section 7: Validation — CollisionPredictionModel', () => {
    it('should return no warnings for a valid model', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultCollisionPredictionModel({
          predictionId: `pred-${i}`,
          avoidanceId: 'avd-1',
          detectionId: 'det-1',
        });
        const warnings = validateCollisionPredictionModel(model);
        expect(warnings.length).toBe(0);
      }
    });

    it('should warn on empty predictionId', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultCollisionPredictionModel({
          avoidanceId: 'avd-1',
          detectionId: 'det-1',
        });
        const warnings = validateCollisionPredictionModel(model);
        expect(warnings.some(w => w.includes('predictionId'))).toBe(true);
      }
    });

    it('should warn on negative timeToCollisionMs', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultCollisionPredictionModel({
          predictionId: `pred-${i}`,
          avoidanceId: 'avd-1',
          detectionId: 'det-1',
          timeToCollisionMs: -100,
        });
        const warnings = validateCollisionPredictionModel(model);
        expect(warnings.some(w => w.includes('timeToCollisionMs'))).toBe(true);
      }
    });

    it('should warn on collisionProbability out of range', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultCollisionPredictionModel({
          predictionId: `pred-${i}`,
          avoidanceId: 'avd-1',
          detectionId: 'det-1',
          collisionProbability: 1.5,
        });
        const warnings = validateCollisionPredictionModel(model);
        expect(warnings.some(w => w.includes('collisionProbability'))).toBe(true);
      }
    });

    it('should warn on negative robotVelocityCmPerSec', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultCollisionPredictionModel({
          predictionId: `pred-${i}`,
          avoidanceId: 'avd-1',
          detectionId: 'det-1',
          robotVelocityCmPerSec: -5,
        });
        const warnings = validateCollisionPredictionModel(model);
        expect(warnings.some(w => w.includes('robotVelocityCmPerSec'))).toBe(true);
      }
    });

    it('should not throw on any input combination', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultCollisionPredictionModel({
          predictionId: `pred-${i}`,
          avoidanceId: 'avd-1',
          detectionId: 'det-1',
          predictionTimestamp: -999,
        });
        expect(() => validateCollisionPredictionModel(model)).not.toThrow();
        const warnings = validateCollisionPredictionModel(model);
        expect(warnings.some(w => w.includes('predictionTimestamp'))).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 8: Duplicate Validators
  // ═══════════════════════════════════════════════════════════════

  describe('Section 8: Duplicate Validators', () => {
    it('should detect duplicate ObstacleAvoidance IDs', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const unique = [
          createDefaultObstacleAvoidanceModel({ avoidanceId: 'a' }),
          createDefaultObstacleAvoidanceModel({ avoidanceId: 'b' }),
        ];
        expect(validateDuplicateObstacleAvoidanceIds(unique).length).toBe(0);

        const duped = [
          createDefaultObstacleAvoidanceModel({ avoidanceId: 'x' }),
          createDefaultObstacleAvoidanceModel({ avoidanceId: 'x' }),
        ];
        expect(validateDuplicateObstacleAvoidanceIds(duped).length).toBeGreaterThanOrEqual(1);
        expect(validateDuplicateObstacleAvoidanceIds(duped)[0]).toContain('Duplicate');
      }
    });

    it('should detect duplicate AvoidanceRule IDs', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const unique = [
          createDefaultAvoidanceRuleModel({ ruleId: 'a' }),
          createDefaultAvoidanceRuleModel({ ruleId: 'b' }),
        ];
        expect(validateDuplicateAvoidanceRuleIds(unique).length).toBe(0);

        const duped = [
          createDefaultAvoidanceRuleModel({ ruleId: 'x' }),
          createDefaultAvoidanceRuleModel({ ruleId: 'x' }),
        ];
        expect(validateDuplicateAvoidanceRuleIds(duped).length).toBeGreaterThanOrEqual(1);
        expect(validateDuplicateAvoidanceRuleIds(duped)[0]).toContain('Duplicate');
      }
    });

    it('should detect duplicate ObstacleDetection IDs', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const unique = [
          createDefaultObstacleDetectionModel({ detectionId: 'a' }),
          createDefaultObstacleDetectionModel({ detectionId: 'b' }),
        ];
        expect(validateDuplicateObstacleDetectionIds(unique).length).toBe(0);

        const duped = [
          createDefaultObstacleDetectionModel({ detectionId: 'x' }),
          createDefaultObstacleDetectionModel({ detectionId: 'x' }),
        ];
        expect(validateDuplicateObstacleDetectionIds(duped).length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should detect duplicate NavigationDecision IDs', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const unique = [
          createDefaultNavigationDecisionModel({ decisionId: 'a' }),
          createDefaultNavigationDecisionModel({ decisionId: 'b' }),
        ];
        expect(validateDuplicateNavigationDecisionIds(unique).length).toBe(0);

        const duped = [
          createDefaultNavigationDecisionModel({ decisionId: 'x' }),
          createDefaultNavigationDecisionModel({ decisionId: 'x' }),
        ];
        expect(validateDuplicateNavigationDecisionIds(duped).length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should detect duplicate SafeZone IDs', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const unique = [
          createDefaultSafeZoneModel({ zoneId: 'a' }),
          createDefaultSafeZoneModel({ zoneId: 'b' }),
        ];
        expect(validateDuplicateSafeZoneIds(unique).length).toBe(0);

        const duped = [
          createDefaultSafeZoneModel({ zoneId: 'x' }),
          createDefaultSafeZoneModel({ zoneId: 'x' }),
        ];
        expect(validateDuplicateSafeZoneIds(duped).length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should detect duplicate CollisionPrediction IDs', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const unique = [
          createDefaultCollisionPredictionModel({ predictionId: 'a' }),
          createDefaultCollisionPredictionModel({ predictionId: 'b' }),
        ];
        expect(validateDuplicateCollisionPredictionIds(unique).length).toBe(0);

        const duped = [
          createDefaultCollisionPredictionModel({ predictionId: 'x' }),
          createDefaultCollisionPredictionModel({ predictionId: 'x' }),
        ];
        expect(validateDuplicateCollisionPredictionIds(duped).length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 9: Detection Engine
  // ═══════════════════════════════════════════════════════════════

  describe('Section 9: Detection Engine', () => {
    it('should detectObstacleInZone when distance is below threshold', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const result = detectObstacleInZone(10, 0, 'FRONT', 20, 0.9);
        expect(result).not.toBeNull();
        expect(result!.distanceCm).toBe(10);
        expect(result!.detectionZone).toBe('FRONT');
        expect(result!.confidence).toBeCloseTo(0.9, 5);
        expect(result!.severity).not.toBe('NONE');
      }
    });

    it('should detectObstacleInZone return null when distance is above threshold', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const result = detectObstacleInZone(30, 0, 'FRONT', 20);
        expect(result).toBeNull();
        // Exactly at threshold
        const resultAtThreshold = detectObstacleInZone(20, 0, 'FRONT', 20);
        expect(resultAtThreshold).toBeNull();
      }
    });

    it('should classifyObstacleSeverity return CRITICAL when distance <= criticalCm', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(classifyObstacleSeverity(3, 5, 20)).toBe('CRITICAL');
        expect(classifyObstacleSeverity(5, 5, 20)).toBe('CRITICAL');
        expect(classifyObstacleSeverity(0, 5, 20)).toBe('CRITICAL');
      }
    });

    it('should classifyObstacleSeverity return NONE when distance >= threshold', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(classifyObstacleSeverity(20, 5, 20)).toBe('NONE');
        expect(classifyObstacleSeverity(30, 5, 20)).toBe('NONE');
        expect(classifyObstacleSeverity(400, 5, 20)).toBe('NONE');
      }
    });

    it('should classifyObstacleSeverity return HIGH/MEDIUM/LOW for intermediate distances', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        // Range is 20 - 5 = 15. Critical at 5.
        // HIGH: distance <= 5 + 15*0.33 = 9.95 → distance=7 should be HIGH
        expect(classifyObstacleSeverity(7, 5, 20)).toBe('HIGH');
        // MEDIUM: distance <= 5 + 15*0.66 = 14.9 → distance=12 should be MEDIUM
        expect(classifyObstacleSeverity(12, 5, 20)).toBe('MEDIUM');
        // LOW: distance < 20 but above MEDIUM boundary → distance=18 should be LOW
        expect(classifyObstacleSeverity(18, 5, 20)).toBe('LOW');
      }
    });

    it('should calculateObstacleBearing return correct world bearing', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(calculateObstacleBearing(0, 0)).toBe(0);
        expect(calculateObstacleBearing(90, 0)).toBe(90);
        expect(calculateObstacleBearing(0, 90)).toBe(90);
        expect(calculateObstacleBearing(45, 315)).toBe(0);
        expect(calculateObstacleBearing(90, 270)).toBe(0);
        // Negative wrapping
        expect(calculateObstacleBearing(-90, 0)).toBe(270);
      }
    });

    it('should isObstacleInDetectionZone correctly classify FRONT (0 deg)', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(isObstacleInDetectionZone(0, 'FRONT')).toBe(true);
        expect(isObstacleInDetectionZone(44, 'FRONT')).toBe(true);
        expect(isObstacleInDetectionZone(315, 'FRONT')).toBe(true);
        expect(isObstacleInDetectionZone(359, 'FRONT')).toBe(true);
        expect(isObstacleInDetectionZone(45, 'FRONT')).toBe(false);
        expect(isObstacleInDetectionZone(180, 'FRONT')).toBe(false);
      }
    });

    it('should isObstacleInDetectionZone correctly classify LEFT (90 deg)', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(isObstacleInDetectionZone(90, 'LEFT')).toBe(true);
        expect(isObstacleInDetectionZone(45, 'LEFT')).toBe(true);
        expect(isObstacleInDetectionZone(134, 'LEFT')).toBe(true);
        expect(isObstacleInDetectionZone(135, 'LEFT')).toBe(false);
        expect(isObstacleInDetectionZone(0, 'LEFT')).toBe(false);
      }
    });

    it('should isObstacleInDetectionZone correctly classify RIGHT (270 deg)', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(isObstacleInDetectionZone(270, 'RIGHT')).toBe(true);
        expect(isObstacleInDetectionZone(225, 'RIGHT')).toBe(true);
        expect(isObstacleInDetectionZone(314, 'RIGHT')).toBe(true);
        expect(isObstacleInDetectionZone(315, 'RIGHT')).toBe(false);
        expect(isObstacleInDetectionZone(180, 'RIGHT')).toBe(false);
      }
    });

    it('should aggregateDetections find closest per zone', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const detections = [
          createDefaultObstacleDetectionModel({ detectionId: 'd1', detectionZone: 'FRONT', distanceCm: 15 }),
          createDefaultObstacleDetectionModel({ detectionId: 'd2', detectionZone: 'FRONT', distanceCm: 10 }),
          createDefaultObstacleDetectionModel({ detectionId: 'd3', detectionZone: 'LEFT', distanceCm: 25 }),
          createDefaultObstacleDetectionModel({ detectionId: 'd4', detectionZone: 'RIGHT', distanceCm: 30 }),
          createDefaultObstacleDetectionModel({ detectionId: 'd5', detectionZone: 'LEFT', distanceCm: 20 }),
        ];
        const agg = aggregateDetections(detections);
        expect(agg.front).not.toBeNull();
        expect(agg.front!.distanceCm).toBe(10);
        expect(agg.left).not.toBeNull();
        expect(agg.left!.distanceCm).toBe(20);
        expect(agg.right).not.toBeNull();
        expect(agg.right!.distanceCm).toBe(30);
        expect(agg.rear).toBeNull();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 10: Collision Prediction Engine
  // ═══════════════════════════════════════════════════════════════

  describe('Section 10: Collision Prediction Engine', () => {
    it('should predictTimeToCollision with positive velocity', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        // 20cm at 10cm/s = 2000ms
        const ttc = predictTimeToCollision(20, 10);
        expect(ttc).toBeCloseTo(2000, 5);
        // 100cm at 50cm/s = 2000ms
        const ttc2 = predictTimeToCollision(100, 50);
        expect(ttc2).toBeCloseTo(2000, 5);
        // 5cm at 100cm/s = 50ms
        const ttc3 = predictTimeToCollision(5, 100);
        expect(ttc3).toBeCloseTo(50, 5);
      }
    });

    it('should predictTimeToCollision return Infinity with zero velocity', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(predictTimeToCollision(20, 0)).toBe(Infinity);
        expect(predictTimeToCollision(100, 0)).toBe(Infinity);
        expect(predictTimeToCollision(20, -5)).toBe(Infinity);
      }
    });

    it('should predictImpactPoint at heading 0 (east)', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const point = predictImpactPoint(0, 0, 0, 20);
        expect(point.x).toBeCloseTo(20, 5);
        expect(point.y).toBeCloseTo(0, 5);
        // With offset
        const point2 = predictImpactPoint(10, 5, 0, 15);
        expect(point2.x).toBeCloseTo(25, 5);
        expect(point2.y).toBeCloseTo(5, 5);
      }
    });

    it('should predictImpactPoint at heading 90', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const point = predictImpactPoint(0, 0, 90, 20);
        expect(point.x).toBeCloseTo(0, 4);
        expect(point.y).toBeCloseTo(20, 4);
        // heading 180
        const point180 = predictImpactPoint(0, 0, 180, 20);
        expect(point180.x).toBeCloseTo(-20, 4);
        expect(point180.y).toBeCloseTo(0, 4);
      }
    });

    it('should calculateCollisionProbability return value between 0 and 1', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const prob = calculateCollisionProbability(10, 5, 20);
        expect(prob).toBeGreaterThanOrEqual(0);
        expect(prob).toBeLessThanOrEqual(1);
        // Different combos
        const prob2 = calculateCollisionProbability(100, 0, 20);
        expect(prob2).toBeGreaterThanOrEqual(0);
        expect(prob2).toBeLessThanOrEqual(1);
      }
    });

    it('should calculateCollisionProbability near 1 when very close', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const prob = calculateCollisionProbability(1, 50, 100);
        expect(prob).toBeGreaterThan(0.9);
        expect(prob).toBeLessThanOrEqual(1);
      }
    });

    it('should calculateCollisionProbability near 0 when very far', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const prob = calculateCollisionProbability(400, 0, 20);
        expect(prob).toBe(0);
      }
    });

    it('should calculateSafeDistanceMargin return positive margin', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const margin = calculateSafeDistanceMargin(20, 5);
        expect(margin).toBe(15);
        expect(margin).toBeGreaterThan(0);
      }
    });

    it('should calculateSafeDistanceMargin return negative margin when too close', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const margin = calculateSafeDistanceMargin(3, 10);
        expect(margin).toBe(-7);
        expect(margin).toBeLessThan(0);
      }
    });

    it('should createCollisionPrediction composite all sub-functions', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const pred = createCollisionPrediction(
          `pred-${i}`, 'avd-1', 'det-1',
          0, 0, 0, 20, 10, 30, 5, 1000,
        );
        expect(pred.predictionId).toBe(`pred-${i}`);
        expect(pred.avoidanceId).toBe('avd-1');
        expect(pred.detectionId).toBe('det-1');
        expect(pred.timeToCollisionMs).toBeCloseTo(2000, 5);
        expect(pred.predictedImpactX).toBeCloseTo(20, 5);
        expect(pred.predictedImpactY).toBeCloseTo(0, 5);
        expect(pred.collisionProbability).toBeGreaterThanOrEqual(0);
        expect(pred.collisionProbability).toBeLessThanOrEqual(1);
        expect(pred.safeDistanceMarginCm).toBe(15);
        expect(pred.robotVelocityCmPerSec).toBe(10);
        expect(pred.robotHeadingDeg).toBe(0);
        expect(pred.predictionTimestamp).toBe(1000);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 11: Navigation Decision Engine
  // ═══════════════════════════════════════════════════════════════

  describe('Section 11: Navigation Decision Engine', () => {
    it('should decideNavigationAction STOP when critical', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const result = decideNavigationAction(3, 400, 400, 400, 20, 15, 5, 'FORWARD');
        expect(result.action).toBe('STOP');
        expect(result.reason).toContain('Critical');
        // Exactly at critical
        const result2 = decideNavigationAction(5, 400, 400, 400, 20, 15, 5, 'FORWARD');
        expect(result2.action).toBe('STOP');
      }
    });

    it('should decideNavigationAction TURN_LEFT when right blocked', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        // Front < threshold, right < sideThreshold, left clear
        const result = decideNavigationAction(15, 400, 10, 400, 20, 15, 5, 'FORWARD');
        expect(result.action).toBe('TURN_LEFT');
        expect(result.reason).toContain('left');
      }
    });

    it('should decideNavigationAction TURN_RIGHT when left blocked', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        // Front < threshold, left < sideThreshold, right clear
        const result = decideNavigationAction(15, 10, 400, 400, 20, 15, 5, 'FORWARD');
        expect(result.action).toBe('TURN_RIGHT');
        expect(result.reason).toContain('right');
      }
    });

    it('should decideNavigationAction REVERSE when surrounded', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        // Front < threshold, left < sideThreshold, right < sideThreshold
        const result = decideNavigationAction(10, 10, 10, 400, 20, 15, 5, 'FORWARD');
        expect(result.action).toBe('REVERSE');
        expect(result.reason).toContain('Surrounded');
      }
    });

    it('should decideNavigationAction FORWARD when clear', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const result = decideNavigationAction(400, 400, 400, 400, 20, 15, 5, 'FORWARD');
        expect(result.action).toBe('FORWARD');
        expect(result.reason).toContain('clear');
      }
    });

    it('should evaluateStopCondition true when below critical', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(evaluateStopCondition(3, 5)).toBe(true);
        expect(evaluateStopCondition(5, 5)).toBe(true);
        expect(evaluateStopCondition(0, 5)).toBe(true);
      }
    });

    it('should evaluateStopCondition false when above critical', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(evaluateStopCondition(6, 5)).toBe(false);
        expect(evaluateStopCondition(100, 5)).toBe(false);
        expect(evaluateStopCondition(400, 5)).toBe(false);
      }
    });

    it('should evaluateReverseCondition true when all blocked', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(evaluateReverseCondition(3, 3, 3, 5)).toBe(true);
        expect(evaluateReverseCondition(4, 4, 4, 5)).toBe(true);
        expect(evaluateReverseCondition(1, 2, 3, 5)).toBe(true);
      }
    });

    it('should evaluateTurnDirection LEFT when left has more space', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(evaluateTurnDirection(100, 50)).toBe('TURN_LEFT');
        expect(evaluateTurnDirection(400, 200)).toBe('TURN_LEFT');
        // Equal defaults to LEFT
        expect(evaluateTurnDirection(100, 100)).toBe('TURN_LEFT');
      }
    });

    it('should evaluateTurnDirection RIGHT when right has more space', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(evaluateTurnDirection(50, 100)).toBe('TURN_RIGHT');
        expect(evaluateTurnDirection(200, 400)).toBe('TURN_RIGHT');
      }
    });

    it('should shouldResumeForward true when all clear', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(shouldResumeForward(400, 400, 400, 20)).toBe(true);
        expect(shouldResumeForward(21, 21, 21, 20)).toBe(true);
      }
    });

    it('should buildDecisionReason return descriptive string', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const reason = buildDecisionReason('STOP', 'FRONT', 4.5);
        expect(reason).toContain('STOP');
        expect(reason).toContain('FRONT');
        expect(reason).toContain('4.5');
        expect(typeof reason).toBe('string');
        expect(reason.length).toBeGreaterThan(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 12: Differential Drive Integration
  // ═══════════════════════════════════════════════════════════════

  describe('Section 12: Differential Drive Integration', () => {
    it('should predictFuturePosition at heading 0', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        // Moving east at 100cm/s for 1000ms = +100cm on x
        const pos = predictFuturePosition(0, 0, 0, 100, 1000);
        expect(pos.x).toBeCloseTo(100, 4);
        expect(pos.y).toBeCloseTo(0, 4);
        expect(pos.headingDeg).toBe(0);
      }
    });

    it('should predictFuturePosition at heading 90', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        // Moving north at 50cm/s for 2000ms = +100cm on y
        const pos = predictFuturePosition(0, 0, 90, 50, 2000);
        expect(pos.x).toBeCloseTo(0, 4);
        expect(pos.y).toBeCloseTo(100, 4);
        expect(pos.headingDeg).toBe(90);
      }
    });

    it('should predictFuturePosition with zero velocity', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const pos = predictFuturePosition(10, 20, 45, 0, 5000);
        expect(pos.x).toBeCloseTo(10, 5);
        expect(pos.y).toBeCloseTo(20, 5);
        expect(pos.headingDeg).toBe(45);
      }
    });

    it('should predictFutureHeading with angular velocity', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        // 90 deg/s for 1s = 90 deg rotation
        const heading = predictFutureHeading(0, 90, 1000);
        expect(heading).toBeCloseTo(90, 5);
        // Wrapping: 350 + 20 = 370 → 10
        const heading2 = predictFutureHeading(350, 20, 1000);
        expect(heading2).toBeCloseTo(10, 5);
        // Negative wrapping: 10 + (-20) = -10 → 350
        const heading3 = predictFutureHeading(10, -20, 1000);
        expect(heading3).toBeCloseTo(350, 5);
      }
    });

    it('should checkFutureCollision return true within threshold', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(checkFutureCollision(10, 10, 12, 10, 5)).toBe(true);
        expect(checkFutureCollision(0, 0, 3, 4, 6)).toBe(true);
        // Distance exactly 5, threshold 5 → distance < threshold is false
        expect(checkFutureCollision(0, 0, 3, 4, 5)).toBe(false);
      }
    });

    it('should checkFutureCollision return false outside threshold', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(checkFutureCollision(0, 0, 100, 100, 5)).toBe(false);
        expect(checkFutureCollision(10, 10, 50, 50, 10)).toBe(false);
      }
    });

    it('should calculateStoppingDistance with positive speed', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        // v=10, a=50 → 10²/(2*50) = 100/100 = 1
        const dist = calculateStoppingDistance(10, 50);
        expect(dist).toBeCloseTo(1, 5);
        // v=20, a=100 → 400/200 = 2
        const dist2 = calculateStoppingDistance(20, 100);
        expect(dist2).toBeCloseTo(2, 5);
      }
    });

    it('should calculateStoppingDistance with zero speed', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(calculateStoppingDistance(0, 50)).toBe(0);
        expect(calculateStoppingDistance(-5, 50)).toBe(0);
        // Zero deceleration → Infinity
        expect(calculateStoppingDistance(10, 0)).toBe(Infinity);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 13: Line Following Integration
  // ═══════════════════════════════════════════════════════════════

  describe('Section 13: Line Following Integration', () => {
    it('should shouldFollowLine return true when all clear', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(shouldFollowLine(400, 400, 400, 20)).toBe(true);
        expect(shouldFollowLine(21, 21, 21, 20)).toBe(true);
      }
    });

    it('should shouldFollowLine return false when obstacle present', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(shouldFollowLine(10, 400, 400, 20)).toBe(false);
        expect(shouldFollowLine(400, 10, 400, 20)).toBe(false);
        expect(shouldFollowLine(400, 400, 10, 20)).toBe(false);
        expect(shouldFollowLine(20, 20, 20, 20)).toBe(false);
      }
    });

    it('should shouldAvoidObstacle return true when close', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(shouldAvoidObstacle(10, 20)).toBe(true);
        expect(shouldAvoidObstacle(19, 20)).toBe(true);
        expect(shouldAvoidObstacle(0, 20)).toBe(true);
      }
    });

    it('should shouldAvoidObstacle return false when clear', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(shouldAvoidObstacle(20, 20)).toBe(false);
        expect(shouldAvoidObstacle(400, 20)).toBe(false);
        expect(shouldAvoidObstacle(21, 20)).toBe(false);
      }
    });

    it('should determineResumeLineFollowing return true after avoidance when clear', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(determineResumeLineFollowing(400, 400, 400, 20, true)).toBe(true);
        expect(determineResumeLineFollowing(21, 21, 21, 20, true)).toBe(true);
      }
    });

    it('should determineResumeLineFollowing return false if still blocked', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(determineResumeLineFollowing(10, 400, 400, 20, true)).toBe(false);
        expect(determineResumeLineFollowing(400, 10, 400, 20, true)).toBe(false);
        expect(determineResumeLineFollowing(400, 400, 10, 20, true)).toBe(false);
      }
    });

    it('should determineResumeLineFollowing return false if was not avoiding', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(determineResumeLineFollowing(400, 400, 400, 20, false)).toBe(false);
      }
    });

    it('should mergeLineAndAvoidanceBehavior return avoidance when AVOIDING/STOPPED', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(mergeLineAndAvoidanceBehavior('FOLLOW_PATH', 'TURN_LEFT', 'AVOIDING')).toBe('TURN_LEFT');
        expect(mergeLineAndAvoidanceBehavior('FOLLOW_PATH', 'STOP', 'STOPPED')).toBe('STOP');
        expect(mergeLineAndAvoidanceBehavior('FORWARD', 'REVERSE', 'AVOIDING')).toBe('REVERSE');
        // Line action when IDLE
        expect(mergeLineAndAvoidanceBehavior('FOLLOW_PATH', 'TURN_LEFT', 'IDLE')).toBe('FOLLOW_PATH');
        expect(mergeLineAndAvoidanceBehavior('FORWARD', 'TURN_LEFT', 'SCANNING')).toBe('FORWARD');
        expect(mergeLineAndAvoidanceBehavior('FORWARD', 'TURN_LEFT', 'RECOVERING')).toBe('FORWARD');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 14: Servo Scanning Integration
  // ═══════════════════════════════════════════════════════════════

  describe('Section 14: Servo Scanning Integration', () => {
    it('should generateScanAngles produce correct count', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        // 0 to 180 in steps of 15 → (180-0)/15 + 1 = 13
        const angles = generateScanAngles(0, 180, 15);
        expect(angles.length).toBe(13);
        expect(angles[0]).toBe(0);
        expect(angles[angles.length - 1]).toBe(180);
      }
    });

    it('should generateScanAngles produce correct range', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const angles = generateScanAngles(0, 180, 30);
        expect(angles).toEqual([0, 30, 60, 90, 120, 150, 180]);
        // Reverse direction
        const anglesRev = generateScanAngles(180, 0, 45);
        expect(anglesRev[0]).toBe(180);
        expect(anglesRev[anglesRev.length - 1]).toBe(0);
      }
    });

    it('should generateScanAngles return empty for zero resolution', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const angles = generateScanAngles(0, 180, 0);
        expect(angles.length).toBe(0);
        const angles2 = generateScanAngles(0, 180, -10);
        expect(angles2.length).toBe(0);
      }
    });

    it('should createScanResult return correct structure', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const result = createScanResult(45, 25.5, 1000);
        expect(result.angleDeg).toBe(45);
        expect(result.distanceCm).toBe(25.5);
        expect(result.timestamp).toBe(1000);
      }
    });

    it('should findClearestDirection with multiple results', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const results = [
          { angleDeg: 0, distanceCm: 10 },
          { angleDeg: 45, distanceCm: 50 },
          { angleDeg: 90, distanceCm: 100 },
          { angleDeg: 135, distanceCm: 30 },
        ];
        const clearest = findClearestDirection(results);
        expect(clearest.angleDeg).toBe(90);
        expect(clearest.distanceCm).toBe(100);
      }
    });

    it('should findClearestDirection with single result', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const results = [{ angleDeg: 45, distanceCm: 50 }];
        const clearest = findClearestDirection(results);
        expect(clearest.angleDeg).toBe(45);
        expect(clearest.distanceCm).toBe(50);
      }
    });

    it('should buildScanProfile compute min/max/avg and clear angle', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const results = [
          { angleDeg: 0, distanceCm: 10 },
          { angleDeg: 45, distanceCm: 30 },
          { angleDeg: 90, distanceCm: 50 },
        ];
        const profile = buildScanProfile(results);
        expect(profile.minDistanceCm).toBe(10);
        expect(profile.maxDistanceCm).toBe(50);
        expect(profile.avgDistanceCm).toBeCloseTo(30, 5);
        expect(profile.clearAngleDeg).toBe(90);
      }
    });

    it('should handle empty scan results gracefully', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const clearest = findClearestDirection([]);
        expect(clearest.angleDeg).toBe(0);
        expect(clearest.distanceCm).toBe(0);

        const profile = buildScanProfile([]);
        expect(profile.minDistanceCm).toBe(0);
        expect(profile.maxDistanceCm).toBe(0);
        expect(profile.avgDistanceCm).toBe(0);
        expect(profile.clearAngleDeg).toBe(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 15: Blockly Integration
  // ═══════════════════════════════════════════════════════════════

  describe('Section 15: Blockly Integration', () => {
    it('should obstacleDetected return true with close obstacle', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const detections = [
          createDefaultObstacleDetectionModel({ detectionId: 'd1', distanceCm: 10 }),
          createDefaultObstacleDetectionModel({ detectionId: 'd2', distanceCm: 400 }),
        ];
        expect(obstacleDetected(detections, 20)).toBe(true);
      }
    });

    it('should obstacleDetected return false with no close obstacles', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const detections = [
          createDefaultObstacleDetectionModel({ detectionId: 'd1', distanceCm: 400 }),
          createDefaultObstacleDetectionModel({ detectionId: 'd2', distanceCm: 300 }),
        ];
        expect(obstacleDetected(detections, 20)).toBe(false);
        // Empty list
        expect(obstacleDetected([], 20)).toBe(false);
      }
    });

    it('should getObstacleDistance return closest in zone', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const detections = [
          createDefaultObstacleDetectionModel({ detectionId: 'd1', detectionZone: 'FRONT', distanceCm: 15 }),
          createDefaultObstacleDetectionModel({ detectionId: 'd2', detectionZone: 'FRONT', distanceCm: 25 }),
          createDefaultObstacleDetectionModel({ detectionId: 'd3', detectionZone: 'LEFT', distanceCm: 10 }),
        ];
        expect(getObstacleDistance(detections, 'FRONT')).toBe(15);
        expect(getObstacleDistance(detections, 'LEFT')).toBe(10);
      }
    });

    it('should getObstacleDistance return 400 for empty zone', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const detections = [
          createDefaultObstacleDetectionModel({ detectionId: 'd1', detectionZone: 'FRONT', distanceCm: 15 }),
        ];
        expect(getObstacleDistance(detections, 'RIGHT')).toBe(400);
        expect(getObstacleDistance(detections, 'REAR')).toBe(400);
        expect(getObstacleDistance([], 'FRONT')).toBe(400);
      }
    });

    it('should avoidObstacle return NavigationDecisionModel', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const decision = avoidObstacle(10, 400, 400, 400, 20, 15, 5, 'FORWARD');
        expect(decision.selectedAction).toBeDefined();
        expect(decision.previousAction).toBe('FORWARD');
        expect(decision.frontDistanceCm).toBe(10);
        expect(decision.leftDistanceCm).toBe(400);
        expect(decision.rightDistanceCm).toBe(400);
        expect(decision.rearDistanceCm).toBe(400);
        expect(decision.decisionReason.length).toBeGreaterThan(0);
        expect(decision.decisionId).toContain('blockly_decision');
      }
    });

    it('should scanDirection return scan entry', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const result = scanDirection(45, 30, 1234);
        expect(result.angleDeg).toBe(45);
        expect(result.distanceCm).toBe(30);
        expect(result.timestamp).toBe(1234);
      }
    });

    it('should scanLeft filter correctly', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const results = [
          { angleDeg: 30, distanceCm: 100 },
          { angleDeg: 45, distanceCm: 80 },
          { angleDeg: 90, distanceCm: 120 },
          { angleDeg: 135, distanceCm: 60 },
          { angleDeg: 180, distanceCm: 200 },
        ];
        const best = scanLeft(results);
        expect(best).not.toBeNull();
        expect(best!.angleDeg).toBe(90);
        expect(best!.distanceCm).toBe(120);
        // No results in left zone
        const noLeft = scanLeft([{ angleDeg: 0, distanceCm: 100 }]);
        expect(noLeft).toBeNull();
      }
    });

    it('should scanRight filter correctly', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const results = [
          { angleDeg: 180, distanceCm: 100 },
          { angleDeg: 225, distanceCm: 80 },
          { angleDeg: 270, distanceCm: 150 },
          { angleDeg: 315, distanceCm: 60 },
          { angleDeg: 350, distanceCm: 200 },
        ];
        const best = scanRight(results);
        expect(best).not.toBeNull();
        expect(best!.angleDeg).toBe(270);
        expect(best!.distanceCm).toBe(150);
        // No results in right zone
        const noRight = scanRight([{ angleDeg: 0, distanceCm: 100 }]);
        expect(noRight).toBeNull();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 16: Demo Scenarios
  // ═══════════════════════════════════════════════════════════════

  describe('Section 16: Demo Scenarios', () => {
    it('Demo 1: Robot moving forward, obstacle at critical distance (4cm) → STOP', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        // Obstacle at 4cm, critical=5 → 4 <= 5 → STOP
        const result = decideNavigationAction(4, 400, 400, 400, 20, 15, 5, 'FORWARD');
        expect(result.action).toBe('STOP');
        expect(result.reason).toContain('Critical');

        // Verify severity classification
        const severity = classifyObstacleSeverity(4, 5, 20);
        expect(severity).toBe('CRITICAL');

        // Verify collision prediction shows high probability
        const prob = calculateCollisionProbability(4, 10, 20);
        expect(prob).toBeGreaterThan(0.5);

        // Verify stop condition evaluates true
        expect(evaluateStopCondition(4, 5)).toBe(true);

        // Verify the Blockly API produces the same decision
        const blocklyDecision = avoidObstacle(4, 400, 400, 400, 20, 15, 5, 'FORWARD');
        expect(blocklyDecision.selectedAction).toBe('STOP');
        expect(blocklyDecision.frontDistanceCm).toBe(4);
      }
    });

    it('Demo 2: Obstacle front (15cm), left clear (400), right blocked (10cm) → TURN_LEFT', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        // Front=15 < threshold=20 but > critical=5 → need turn
        // Right=10 < sideThreshold=15 → right blocked
        // Left=400 > sideThreshold=15 → left clear
        const result = decideNavigationAction(15, 400, 10, 400, 20, 15, 5, 'FORWARD');
        expect(result.action).toBe('TURN_LEFT');
        expect(result.reason).toContain('left');

        // Verify detection classification
        const detection = detectObstacleInZone(15, 0, 'FRONT', 20, 0.95);
        expect(detection).not.toBeNull();
        expect(detection!.severity).not.toBe('NONE');
        expect(detection!.severity).not.toBe('CRITICAL');

        // Verify line following defers to avoidance
        const merged = mergeLineAndAvoidanceBehavior('FOLLOW_PATH', 'TURN_LEFT', 'AVOIDING');
        expect(merged).toBe('TURN_LEFT');

        // Verify shouldAvoidObstacle is true
        expect(shouldAvoidObstacle(15, 20)).toBe(true);

        // Verify the Blockly avoidObstacle matches
        const blocklyDecision = avoidObstacle(15, 400, 10, 400, 20, 15, 5, 'FORWARD');
        expect(blocklyDecision.selectedAction).toBe('TURN_LEFT');
      }
    });

    it('Demo 3: Obstacle avoided, all clear, resume line following', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        // All distances clear (400cm), was avoiding → should resume
        const resumed = determineResumeLineFollowing(400, 400, 400, 20, true);
        expect(resumed).toBe(true);

        // When avoidance state is IDLE, line following action takes priority
        const action = mergeLineAndAvoidanceBehavior('FOLLOW_PATH', 'TURN_LEFT', 'IDLE');
        expect(action).toBe('FOLLOW_PATH');

        // Verify navigation says FORWARD when all clear
        const navResult = decideNavigationAction(400, 400, 400, 400, 20, 15, 5, 'FORWARD');
        expect(navResult.action).toBe('FORWARD');
        expect(navResult.reason).toContain('clear');

        // Verify shouldFollowLine is true
        expect(shouldFollowLine(400, 400, 400, 20)).toBe(true);

        // Verify shouldResumeForward is true
        expect(shouldResumeForward(400, 400, 400, 20)).toBe(true);

        // Verify shouldAvoidObstacle is false
        expect(shouldAvoidObstacle(400, 20)).toBe(false);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 17: Synchronizer CRUD & Serialization
  // ═══════════════════════════════════════════════════════════════

  describe('Section 17: Synchronizer CRUD & Serialization', () => {
    let sync: ObstacleAvoidanceSynchronizer;

    beforeEach(() => {
      sync = new ObstacleAvoidanceSynchronizer();
    });

    it('should register and retrieve ObstacleAvoidanceModel', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        const model = createDefaultObstacleAvoidanceModel({ avoidanceId: `avd-${i}`, driveId: 'drive-1' });
        sync.obstacleAvoidances.register(`avd-${i}`, model);
        const found = sync.obstacleAvoidances.get(`avd-${i}`);
        expect(found).toBeDefined();
        expect(found!.avoidanceId).toBe(`avd-${i}`);
        expect(found!.driveId).toBe('drive-1');
        expect(sync.obstacleAvoidances.has(`avd-${i}`)).toBe(true);
      }
    });

    it('should register and retrieve AvoidanceRuleModel', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        const model = createDefaultAvoidanceRuleModel({ ruleId: `rule-${i}`, avoidanceId: 'avd-1' });
        sync.avoidanceRules.register(`rule-${i}`, model);
        const found = sync.avoidanceRules.get(`rule-${i}`);
        expect(found).toBeDefined();
        expect(found!.ruleId).toBe(`rule-${i}`);
        expect(sync.avoidanceRules.has(`rule-${i}`)).toBe(true);
      }
    });

    it('should register and retrieve ObstacleDetectionModel', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        const model = createDefaultObstacleDetectionModel({ detectionId: `det-${i}`, sensorId: 's1' });
        sync.obstacleDetections.register(`det-${i}`, model);
        const found = sync.obstacleDetections.get(`det-${i}`);
        expect(found).toBeDefined();
        expect(found!.detectionId).toBe(`det-${i}`);
        expect(found!.sensorId).toBe('s1');
      }
    });

    it('should register and retrieve NavigationDecisionModel', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        const model = createDefaultNavigationDecisionModel({ decisionId: `dec-${i}`, avoidanceId: 'avd-1' });
        sync.navigationDecisions.register(`dec-${i}`, model);
        const found = sync.navigationDecisions.get(`dec-${i}`);
        expect(found).toBeDefined();
        expect(found!.decisionId).toBe(`dec-${i}`);
      }
    });

    it('should register and retrieve SafeZoneModel', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        const model = createDefaultSafeZoneModel({ zoneId: `zone-${i}`, zoneName: 'Safe Area' });
        sync.safeZones.register(`zone-${i}`, model);
        const found = sync.safeZones.get(`zone-${i}`);
        expect(found).toBeDefined();
        expect(found!.zoneId).toBe(`zone-${i}`);
        expect(found!.zoneName).toBe('Safe Area');
      }
    });

    it('should register and retrieve CollisionPredictionModel', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        const model = createDefaultCollisionPredictionModel({ predictionId: `pred-${i}`, detectionId: 'det-1' });
        sync.collisionPredictions.register(`pred-${i}`, model);
        const found = sync.collisionPredictions.get(`pred-${i}`);
        expect(found).toBeDefined();
        expect(found!.predictionId).toBe(`pred-${i}`);
        expect(found!.detectionId).toBe('det-1');
      }
    });

    it('should getAll return all registered models in order', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        sync.obstacleAvoidances.register('a', createDefaultObstacleAvoidanceModel({ avoidanceId: 'a' }));
        sync.obstacleAvoidances.register('b', createDefaultObstacleAvoidanceModel({ avoidanceId: 'b' }));
        sync.obstacleAvoidances.register('c', createDefaultObstacleAvoidanceModel({ avoidanceId: 'c' }));
        const all = sync.obstacleAvoidances.getAll();
        expect(all.length).toBe(3);
        expect(all[0].avoidanceId).toBe('a');
        expect(all[1].avoidanceId).toBe('b');
        expect(all[2].avoidanceId).toBe('c');
        expect(sync.obstacleAvoidances.size).toBe(3);
        expect(sync.obstacleAvoidances.keys()).toEqual(['a', 'b', 'c']);
      }
    });

    it('should update model partial fields', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        sync.obstacleAvoidances.register('avd-1', createDefaultObstacleAvoidanceModel({
          avoidanceId: 'avd-1',
          driveId: 'drive-1',
        }));
        const updated = sync.obstacleAvoidances.update('avd-1', {
          avoidanceState: 'SCANNING' as AvoidanceState,
          isEnabled: false,
        });
        expect(updated).toBe(true);
        const found = sync.obstacleAvoidances.get('avd-1');
        expect(found).toBeDefined();
        expect(found!.avoidanceState).toBe('SCANNING');
        expect(found!.isEnabled).toBe(false);
        expect(found!.driveId).toBe('drive-1');
        expect(found!.avoidanceId).toBe('avd-1');
      }
    });

    it('should remove model from registry', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        sync.obstacleAvoidances.register('avd-1', createDefaultObstacleAvoidanceModel({ avoidanceId: 'avd-1' }));
        expect(sync.obstacleAvoidances.has('avd-1')).toBe(true);
        expect(sync.obstacleAvoidances.size).toBe(1);
        const removed = sync.obstacleAvoidances.remove('avd-1');
        expect(removed).toBe(true);
        expect(sync.obstacleAvoidances.has('avd-1')).toBe(false);
        expect(sync.obstacleAvoidances.get('avd-1')).toBeUndefined();
        expect(sync.obstacleAvoidances.size).toBe(0);
        expect(sync.obstacleAvoidances.keys().length).toBe(0);
      }
    });

    it('should clear all registries', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.obstacleAvoidances.register(`a-${i}`, createDefaultObstacleAvoidanceModel({ avoidanceId: `a-${i}` }));
        sync.avoidanceRules.register(`r-${i}`, createDefaultAvoidanceRuleModel({ ruleId: `r-${i}` }));
        sync.obstacleDetections.register(`d-${i}`, createDefaultObstacleDetectionModel({ detectionId: `d-${i}` }));
        sync.clear();
        expect(sync.obstacleAvoidances.size).toBe(0);
        expect(sync.avoidanceRules.size).toBe(0);
        expect(sync.obstacleDetections.size).toBe(0);
        expect(sync.navigationDecisions.size).toBe(0);
        expect(sync.safeZones.size).toBe(0);
        expect(sync.collisionPredictions.size).toBe(0);
      }
    });

    it('should toJSON and fromJSON round-trip', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        sync.obstacleAvoidances.register('avd-1', createDefaultObstacleAvoidanceModel({
          avoidanceId: 'avd-1', driveId: 'drive-1',
        }));
        sync.avoidanceRules.register('rule-1', createDefaultAvoidanceRuleModel({
          ruleId: 'rule-1', avoidanceId: 'avd-1',
        }));
        sync.safeZones.register('zone-1', createDefaultSafeZoneModel({
          zoneId: 'zone-1', zoneName: 'TestZone',
        }));
        const json = sync.toJSON();
        const sync2 = new ObstacleAvoidanceSynchronizer();
        sync2.fromJSON(json);
        expect(sync2.obstacleAvoidances.get('avd-1')!.driveId).toBe('drive-1');
        expect(sync2.avoidanceRules.get('rule-1')!.avoidanceId).toBe('avd-1');
        expect(sync2.safeZones.get('zone-1')!.zoneName).toBe('TestZone');
        expect(sync2.obstacleAvoidances.size).toBe(1);
        expect(sync2.avoidanceRules.size).toBe(1);
        expect(sync2.safeZones.size).toBe(1);
      }
    });

    it('should buildSnapshot return correct structure', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        sync.obstacleAvoidances.register('avd-1', createDefaultObstacleAvoidanceModel({ avoidanceId: 'avd-1' }));
        sync.avoidanceRules.register('rule-1', createDefaultAvoidanceRuleModel({ ruleId: 'rule-1' }));
        const snap = sync.buildSnapshot();
        expect(snap.obstacleAvoidances.length).toBe(1);
        expect(snap.avoidanceRules.length).toBe(1);
        expect(snap.obstacleDetections.length).toBe(0);
        expect(snap.navigationDecisions.length).toBe(0);
        expect(snap.safeZones.length).toBe(0);
        expect(snap.collisionPredictions.length).toBe(0);
        expect(snap.obstacleAvoidances[0].avoidanceId).toBe('avd-1');
      }
    });

    it('should clone produce independent copy', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        sync.obstacleAvoidances.register('avd-1', createDefaultObstacleAvoidanceModel({
          avoidanceId: 'avd-1', driveId: 'Original',
        }));
        const cloned = sync.clone();
        cloned.obstacleAvoidances.update('avd-1', { driveId: 'Cloned' });
        expect(sync.obstacleAvoidances.get('avd-1')!.driveId).toBe('Original');
        expect(cloned.obstacleAvoidances.get('avd-1')!.driveId).toBe('Cloned');
        expect(sync.obstacleAvoidances.size).toBe(1);
        expect(cloned.obstacleAvoidances.size).toBe(1);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 18: Clone Safety & Lifecycle
  // ═══════════════════════════════════════════════════════════════

  describe('Section 18: Clone Safety & Lifecycle', () => {
    let sync: ObstacleAvoidanceSynchronizer;

    beforeEach(() => {
      sync = new ObstacleAvoidanceSynchronizer();
    });

    it('should deep-copy isolate ObstacleAvoidanceModel registry', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        sync.obstacleAvoidances.register('avd-1', createDefaultObstacleAvoidanceModel({
          avoidanceId: 'avd-1', driveId: 'drive-1',
        }));
        const fetched = sync.obstacleAvoidances.get('avd-1')!;
        fetched.driveId = 'MUTATED';
        const refetch = sync.obstacleAvoidances.get('avd-1')!;
        expect(refetch.driveId).toBe('drive-1');
      }
    });

    it('should deep-copy isolate AvoidanceRuleModel registry', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        sync.avoidanceRules.register('rule-1', createDefaultAvoidanceRuleModel({
          ruleId: 'rule-1', avoidanceId: 'avd-1', ruleName: 'TestRule',
        }));
        const fetched = sync.avoidanceRules.get('rule-1')!;
        fetched.ruleName = 'MUTATED';
        const refetch = sync.avoidanceRules.get('rule-1')!;
        expect(refetch.ruleName).toBe('TestRule');
      }
    });

    it('should deep-copy isolate ObstacleDetectionModel registry', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        sync.obstacleDetections.register('det-1', createDefaultObstacleDetectionModel({
          detectionId: 'det-1', sensorId: 'sensor-1',
        }));
        const fetched = sync.obstacleDetections.get('det-1')!;
        fetched.sensorId = 'MUTATED';
        const refetch = sync.obstacleDetections.get('det-1')!;
        expect(refetch.sensorId).toBe('sensor-1');
      }
    });

    it('should deep-copy isolate NavigationDecisionModel registry', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        sync.navigationDecisions.register('dec-1', createDefaultNavigationDecisionModel({
          decisionId: 'dec-1', decisionReason: 'Original',
        }));
        const fetched = sync.navigationDecisions.get('dec-1')!;
        fetched.decisionReason = 'MUTATED';
        const refetch = sync.navigationDecisions.get('dec-1')!;
        expect(refetch.decisionReason).toBe('Original');
      }
    });

    it('should deep-copy isolate SafeZoneModel registry', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        sync.safeZones.register('zone-1', createDefaultSafeZoneModel({
          zoneId: 'zone-1', zoneName: 'Safe',
        }));
        const fetched = sync.safeZones.get('zone-1')!;
        fetched.zoneName = 'MUTATED';
        const refetch = sync.safeZones.get('zone-1')!;
        expect(refetch.zoneName).toBe('Safe');
      }
    });

    it('should deep-copy isolate CollisionPredictionModel registry', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        sync.collisionPredictions.register('pred-1', createDefaultCollisionPredictionModel({
          predictionId: 'pred-1', detectionId: 'det-1',
        }));
        const fetched = sync.collisionPredictions.get('pred-1')!;
        fetched.detectionId = 'MUTATED';
        const refetch = sync.collisionPredictions.get('pred-1')!;
        expect(refetch.detectionId).toBe('det-1');
      }
    });

    it('should getAll return deep copies that cannot pollute registry', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        sync.obstacleAvoidances.register('a', createDefaultObstacleAvoidanceModel({
          avoidanceId: 'a', driveId: 'Safe',
        }));
        sync.obstacleAvoidances.register('b', createDefaultObstacleAvoidanceModel({
          avoidanceId: 'b', driveId: 'Safe2',
        }));
        const all = sync.obstacleAvoidances.getAll();
        all[0].driveId = 'POLLUTED';
        all.push(createDefaultObstacleAvoidanceModel({ avoidanceId: 'c' }));
        const refetch = sync.obstacleAvoidances.getAll();
        expect(refetch.length).toBe(2);
        expect(refetch[0].driveId).toBe('Safe');
      }
    });

    it('should fromJSON with null/undefined safely clear', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.obstacleAvoidances.register('avd-1', createDefaultObstacleAvoidanceModel({ avoidanceId: 'avd-1' }));
        sync.fromJSON(null as any);
        expect(sync.obstacleAvoidances.size).toBe(0);
        sync.obstacleAvoidances.register('avd-1', createDefaultObstacleAvoidanceModel({ avoidanceId: 'avd-1' }));
        sync.fromJSON(undefined as any);
        expect(sync.obstacleAvoidances.size).toBe(0);
      }
    });

    it('should have correct constant values', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(DEFAULT_AVOIDANCE_FRONT_THRESHOLD_CM).toBe(20);
        expect(DEFAULT_AVOIDANCE_SIDE_THRESHOLD_CM).toBe(15);
        expect(DEFAULT_AVOIDANCE_REAR_THRESHOLD_CM).toBe(10);
        expect(DEFAULT_AVOIDANCE_CRITICAL_DISTANCE_CM).toBe(5);
        expect(DEFAULT_AVOIDANCE_SCAN_RESOLUTION_DEG).toBe(15);
        expect(DEFAULT_AVOIDANCE_SCAN_RANGE_DEG).toBe(180);
        expect(DEFAULT_AVOIDANCE_PREDICTION_HORIZON_MS).toBe(2000);
        expect(DEFAULT_AVOIDANCE_CONFIDENCE_THRESHOLD).toBe(0.5);
        expect(typeof DEFAULT_AVOIDANCE_FRONT_THRESHOLD_CM).toBe('number');
        expect(typeof DEFAULT_AVOIDANCE_SIDE_THRESHOLD_CM).toBe('number');
        expect(typeof DEFAULT_AVOIDANCE_REAR_THRESHOLD_CM).toBe('number');
        expect(typeof DEFAULT_AVOIDANCE_CRITICAL_DISTANCE_CM).toBe('number');
        expect(typeof DEFAULT_AVOIDANCE_SCAN_RESOLUTION_DEG).toBe('number');
        expect(typeof DEFAULT_AVOIDANCE_SCAN_RANGE_DEG).toBe('number');
        expect(typeof DEFAULT_AVOIDANCE_PREDICTION_HORIZON_MS).toBe('number');
        expect(typeof DEFAULT_AVOIDANCE_CONFIDENCE_THRESHOLD).toBe('number');
      }
    });

    it('should have correct VALID_* array lengths and contents', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(VALID_AVOIDANCE_STATES).toEqual(['IDLE', 'SCANNING', 'AVOIDING', 'RECOVERING', 'STOPPED', 'ERROR']);
        expect(VALID_AVOIDANCE_STATES.length).toBe(6);

        expect(VALID_AVOIDANCE_SEVERITIES).toEqual(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
        expect(VALID_AVOIDANCE_SEVERITIES.length).toBe(5);

        expect(VALID_AVOIDANCE_NAVIGATION_ACTIONS).toEqual([
          'FORWARD', 'STOP', 'REVERSE', 'TURN_LEFT', 'TURN_RIGHT', 'SPIN_LEFT', 'SPIN_RIGHT', 'FOLLOW_PATH',
        ]);
        expect(VALID_AVOIDANCE_NAVIGATION_ACTIONS.length).toBe(8);

        expect(VALID_AVOIDANCE_DETECTION_ZONES).toEqual(['FRONT', 'LEFT', 'RIGHT', 'REAR']);
        expect(VALID_AVOIDANCE_DETECTION_ZONES.length).toBe(4);

        expect(VALID_AVOIDANCE_RULE_PRIORITIES).toEqual([1, 2, 3, 4, 5]);
        expect(VALID_AVOIDANCE_RULE_PRIORITIES.length).toBe(5);

        expect(VALID_AVOIDANCE_PREDICTION_STATES).toEqual(['PENDING', 'ACTIVE', 'EXPIRED', 'CLEARED']);
        expect(VALID_AVOIDANCE_PREDICTION_STATES.length).toBe(4);
      }
    });
  });

});
