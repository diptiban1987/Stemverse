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

// Phase 34A: Classroom Management, Assignments & Analytics
export * from './classroom-management-runtime';
export * from './assignment-management-runtime';

// Phase 34B: Auto Grading, Certification & Competition
export * from './auto-grading-runtime';
export * from './certification-runtime';
export * from './competition-runtime';

// Phase 35A: Cloud Platform & Public Project Gallery
export * from './project-gallery-runtime';

// Phase 35B: Marketplace & Template Exchange
export * from './marketplace-runtime';

// Phase 36A: Multi-Tenant Deployment
export * from './tenant-runtime';
export * from './organization-runtime';
export * from './deployment-management-runtime';

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

// Phase 36C: Platform Integration & Authentication
export {
  signup, signin, signout, refreshToken, forgotPassword,
  resetPassword, verifyEmail,
  canAccess, canModify, canPublish, canGrade, canJudge,
  createSession as createAuthSession,
  revokeSession, revokeAllSessions, getActiveSessions, isSessionValid,
  createToken, validateToken,
  createDefaultAuthSnapshot,
  AuthSynchronizer,
} from './auth-runtime';
export * from './api-layer-runtime';

// Phase 36D: Runtime Integration Wiring
export * from './integration-wiring-runtime';

// Phase 37A: Mobile, PWA & Offline Learning
export * from './pwa-runtime';
export * from './mobile-workspace-runtime';
export {
  downloadLesson, advanceLessonStep, isLessonComplete, getLessonProgress,
  downloadAssignment, submitOfflineAssignment, isAssignmentOverdue, gradeOfflineAssignment,
  downloadTemplate, getTemplatesByCategory as getOfflineTemplatesByCategory,
  getTotalTemplateSize,
  downloadCompetitionPack, submitCompetitionEntry, isCompetitionDeadlinePassed,
  createCompletionTracker, markLessonCompleted, markAssignmentSubmitted,
  markTemplateCached, syncTracker, getTrackerSummary,
  OfflineLearningSynchronizer,
} from './offline-learning-runtime';
export type {
  OfflineLesson, OfflineAssignment, OfflineTemplate,
  OfflineCompetitionPack, OfflineCompletionTracker,
} from './offline-learning-runtime';

// Phase 37B: Production Deployment Pipeline
export * from './ci-cd-runtime';
export * from './observability-runtime';
export * from './security-hardening-runtime';
export {
  createBackup, completeBackup, failBackup, isBackupExpired,
  evictExpiredBackups, createRestore, completeRestore,
  failRestore as failRestoreJob,
  createRetentionPolicy, getDefaultRetentionPolicies,
  createBackupSchedule, getDefaultSchedules as getDefaultBackupSchedules,
  BackupSynchronizer,
} from './backup-runtime';
export type {
  BackupType, BackupStatus, BackupTarget, BackupJob,
  RestoreJob, RetentionPolicy, BackupSchedule,
} from './backup-runtime';
export {
  createRelease, promoteRelease, compareVersions,
  getLatestByChannel, createFeatureFlag, enableFeatureFlag,
  disableFeatureFlag, setFeatureFlagPercentage, isFeatureEnabled,
  getDefaultFeatureFlags, createMigration, applyMigration,
  rollbackMigration, getPendingMigrations, validateMigrationOrder,
  ReleaseManagementSynchronizer,
} from './release-management-runtime';
export type {
  ReleaseChannel, FeatureFlagStatus, ReleaseVersion,
  FeatureFlag, MigrationStep,
} from './release-management-runtime';

// Phase 38A: Analytics, Reporting & Data Platform
export * from './analytics-runtime';
export {
  generateStudentReport, generateTeacherReport,
  generateSchoolReport as generateSchoolAnalyticsReport,
  generateCompetitionReport as generateCompetitionAnalyticsReport,
  generateMarketplaceReport as generateMarketplaceAnalyticsReport,
  generateDeviceUsageReport, generateCertificationReport,
  generatePlatformReport, reportToCSV, reportToJSON, reportToPdfModel,
  ReportingSynchronizer,
} from './reporting-runtime';
export type {
  ReportType, ReportFormat, ReportStatus, ReportModel,
  StudentReportData, TeacherReportData, SchoolReportData,
  CompetitionReportData, MarketplaceReportData, DeviceReportData,
  CertificationReportData, PlatformReportData,
} from './reporting-runtime';
export {
  createFact, getFactsByTable, getFactsByDimension,
  createDimension, updateDimension,
  createRollup, createDailyRollup, createWeeklyRollup, createMonthlyRollup,
  calculateTrend, detectGrowthRate,
  createPipeline as createWarehousePipeline,
  runPipeline as runWarehousePipeline,
  getDefaultPipelines as getDefaultWarehousePipelines,
  DataWarehouseSynchronizer,
} from './data-warehouse-runtime';
export type {
  RollupPeriod, DimensionType, FactRecord, DimensionRecord,
  RollupEntry, TrendPoint, AggregationPipeline,
} from './data-warehouse-runtime';
export * from './learning-analytics-runtime';

// Phase 38B: Internationalization, Localization & Accessibility
export * from './i18n-runtime';
export * from './accessibility-runtime';
export {
  calculateCoverage, getOverallCoverage, detectMissingTranslations,
  getAllMissingKeys, validateBundle, validateConsistency,
  exportBundleAsJSON, exportBundleAsCSV, importFromJSON,
  createLocalizationProject, LocalizationSynchronizer,
} from './localization-runtime';
export type {
  TranslationCoverage, BundleValidation, LocalizationProject, TranslationExport,
} from './localization-runtime';
export * from './translation-audit-runtime';

// Phase 39A: Enterprise, White-Label, Licensing & Subscription
export {
  createLicense, activateLicense, suspendLicense, renewLicense,
  upgradeLicense, downgradeLicense, expireLicense, transferLicense,
  addSeat, removeSeat, isLicenseValid, hasFeature,
  trackUsage as trackLicenseUsage, isOverQuota as isLicenseOverQuota,
  getLicenseDefaults, LicensingSynchronizer,
} from './licensing-runtime';
export type {
  LicenseType, LicenseStatus, License, LicenseUsageRecord,
} from './licensing-runtime';
export {
  PLAN_CATALOG, getPlanDefinition, getAllPlans,
  createSubscription, renewSubscription, cancelSubscription,
  pauseSubscription, upgradeSubscription, convertTrial, isTrialExpired,
  createInvoice, markInvoicePaid, markInvoiceOverdue, createLineItem,
  SubscriptionSynchronizer,
} from './subscription-runtime';
export type {
  SubscriptionPlan, BillingCycle,
  SubscriptionStatus as SubStatus,
  PlanDefinition, Subscription, Invoice, InvoiceLineItem,
} from './subscription-runtime';
export * from './white-label-runtime';
export {
  createQuota, consumeQuota, resetQuota, isQuotaExceeded,
  getQuotaPercent, checkQuotaAlert, increaseQuotaLimit,
  trackQuotaUsage, getDefaultQuotas as getDefaultPlanQuotas,
  QuotaSynchronizer,
} from './quota-runtime';
export type { QuotaMetric, QuotaLimit, QuotaUsageEvent, QuotaAlert } from './quota-runtime';
export * from './billing-runtime';
export * from './customer-success-runtime';

// Phase 39B: Gamification, Engagement & Community
export * from './achievement-runtime';
export {
  getLevelTable, calculateLevel, getBaseXp, awardXp,
  createUserLevel, addXpToUser, applyBonusMultiplier,
  XpSynchronizer,
} from './xp-runtime';
export type { XpSource, XpEvent, UserLevel, LevelDefinition } from './xp-runtime';
export * from './gamification-runtime';
