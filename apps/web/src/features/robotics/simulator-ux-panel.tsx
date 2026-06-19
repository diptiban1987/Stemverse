'use client';

import { useState, useCallback, useMemo } from 'react';
import type {
  SimulatorUXSnapshot,
} from '@stemverse/runtime-engine';

// ═══════════════════════════════════════════════════════════════
// Phase 31A: Simulator UX Panel
// Provides a simulator readiness dashboard with five tabs:
//   1. Component Scale Audit
//   2. Interaction Quality
//   3. Performance Monitor
//   4. Visual Theme
//   5. Readiness Score
// Follows the same component structure as CircuitValidationPanel
// and ProjectDashboardPanel.
// ═══════════════════════════════════════════════════════════════

// ─── Theme Constants ────────────────────────────────────────────

const THEME = {
  background: '#1a1a2e',
  surface: '#16213e',
  accent: '#0f3460',
  primary: '#e94560',
  text: '#eee',
  mutedText: '#888',
  success: '#00e676',
  warning: '#ffab40',
  error: '#ff5252',
  border: '#2a2a4a',
  surfaceHover: '#1c2a4e',
  cardShadow: '0 2px 8px rgba(0,0,0,0.3)',
  tabActiveGlow: '0 2px 0 #e94560',
} as const;

// ─── Tab Types ──────────────────────────────────────────────────

type SimulatorTabId =
  | 'scale-audit'
  | 'interaction'
  | 'performance'
  | 'theme'
  | 'readiness';

interface TabDefinition {
  id: SimulatorTabId;
  label: string;
  icon: string;
}

const TABS: TabDefinition[] = [
  { id: 'scale-audit', label: 'Scale Audit', icon: '📐' },
  { id: 'interaction', label: 'Interaction', icon: '🖱️' },
  { id: 'performance', label: 'Performance', icon: '⚡' },
  { id: 'theme', label: 'Visual Theme', icon: '🎨' },
  { id: 'readiness', label: 'Readiness', icon: '✅' },
];

// ─── Scale Calibration Status ───────────────────────────────────

type CalibrationStatus = 'CALIBRATED' | 'NEEDS_ADJUSTMENT' | 'MISSING_DATA';

interface ComponentCalibration {
  component: string;
  currentScale: number;
  calibratedScale: number;
  realSizeMm: string;
  status: CalibrationStatus;
}

// ─── Component Scale Audit Data (from Implementation Plan) ──────

const COMPONENT_CALIBRATION_DATA: ComponentCalibration[] = [
  { component: 'LED (5mm)', currentScale: 1.0, calibratedScale: 0.85, realSizeMm: '5.0 × 8.6', status: 'CALIBRATED' },
  { component: 'Resistor (¼W)', currentScale: 1.0, calibratedScale: 0.90, realSizeMm: '6.3 × 2.3', status: 'CALIBRATED' },
  { component: 'Capacitor (Ceramic)', currentScale: 1.0, calibratedScale: 0.88, realSizeMm: '5.0 × 7.5', status: 'CALIBRATED' },
  { component: 'Capacitor (Electrolytic)', currentScale: 1.0, calibratedScale: 0.82, realSizeMm: '8.0 × 12.0', status: 'NEEDS_ADJUSTMENT' },
  { component: 'Transistor (TO-92)', currentScale: 1.0, calibratedScale: 0.78, realSizeMm: '4.6 × 4.8', status: 'CALIBRATED' },
  { component: 'Diode (1N4007)', currentScale: 1.0, calibratedScale: 0.92, realSizeMm: '5.2 × 2.0', status: 'CALIBRATED' },
  { component: 'Push Button', currentScale: 1.0, calibratedScale: 0.95, realSizeMm: '6.0 × 6.0', status: 'CALIBRATED' },
  { component: 'Toggle Switch', currentScale: 1.0, calibratedScale: 0.80, realSizeMm: '12.7 × 6.5', status: 'NEEDS_ADJUSTMENT' },
  { component: 'Potentiometer', currentScale: 1.0, calibratedScale: 0.75, realSizeMm: '16.0 × 16.0', status: 'NEEDS_ADJUSTMENT' },
  { component: 'Buzzer', currentScale: 1.0, calibratedScale: 0.70, realSizeMm: '12.0 × 9.5', status: 'NEEDS_ADJUSTMENT' },
  { component: 'Motor (DC)', currentScale: 1.0, calibratedScale: 0.65, realSizeMm: '24.0 × 20.0', status: 'MISSING_DATA' },
  { component: 'Servo Motor', currentScale: 1.0, calibratedScale: 0.60, realSizeMm: '40.0 × 20.0', status: 'MISSING_DATA' },
  { component: 'IR Sensor', currentScale: 1.0, calibratedScale: 0.85, realSizeMm: '10.0 × 8.0', status: 'CALIBRATED' },
  { component: 'Ultrasonic Sensor', currentScale: 1.0, calibratedScale: 0.55, realSizeMm: '45.0 × 20.0', status: 'MISSING_DATA' },
  { component: 'LDR', currentScale: 1.0, calibratedScale: 0.90, realSizeMm: '5.0 × 2.1', status: 'CALIBRATED' },
  { component: 'Seven Segment Display', currentScale: 1.0, calibratedScale: 0.72, realSizeMm: '19.0 × 12.7', status: 'NEEDS_ADJUSTMENT' },
];

// ─── Interaction Quality Configuration ──────────────────────────

interface InteractionConfig {
  label: string;
  configured: boolean;
  details: string;
}

interface InteractionSection {
  title: string;
  icon: string;
  items: InteractionConfig[];
  mode: string;
}

const INTERACTION_SECTIONS: InteractionSection[] = [
  {
    title: 'Hover Feedback',
    icon: '👆',
    mode: 'ACTIVE',
    items: [
      { label: 'Component highlight on hover', configured: true, details: 'Glow radius: 8px, color: #e94560' },
      { label: 'Pin tooltip display', configured: true, details: 'Delay: 200ms, offset: 12px' },
      { label: 'Wire segment highlight', configured: true, details: 'Stroke width increase: 2px' },
      { label: 'Cursor change on interactive areas', configured: true, details: 'pointer / grab / crosshair' },
      { label: 'Snap point indicators', configured: false, details: 'Not yet implemented' },
      { label: 'Connection preview on hover', configured: false, details: 'Pending wire-preview system' },
    ],
  },
  {
    title: 'Wire Creation',
    icon: '🔌',
    mode: 'BASIC',
    items: [
      { label: 'Click-to-start wire drawing', configured: true, details: 'From any output pin' },
      { label: 'Visual wire preview while dragging', configured: true, details: 'Dashed line, 50% opacity' },
      { label: 'Snap-to-pin on approach', configured: true, details: 'Snap radius: 15px' },
      { label: 'Invalid connection feedback', configured: true, details: 'Red flash + shake animation' },
      { label: 'Auto-routing around components', configured: false, details: 'Planned for Phase 32' },
      { label: 'Wire color coding by type', configured: false, details: 'Power/Ground/Signal colors' },
      { label: 'Bezier curve wire paths', configured: false, details: 'Currently using straight lines' },
    ],
  },
  {
    title: 'Selection System',
    icon: '🔲',
    mode: 'MULTI-SELECT',
    items: [
      { label: 'Single-click selection', configured: true, details: 'Blue border highlight' },
      { label: 'Multi-select with Shift+Click', configured: true, details: 'Additive selection' },
      { label: 'Rubber-band selection', configured: true, details: 'Drag to select region' },
      { label: 'Select-all shortcut (Ctrl+A)', configured: true, details: 'Keyboard shortcut active' },
      { label: 'Deselect on background click', configured: true, details: 'Clears all selections' },
      { label: 'Group selection operations', configured: false, details: 'Move/delete/copy groups' },
      { label: 'Selection count indicator', configured: false, details: 'Status bar integration' },
    ],
  },
];

// ─── Performance Monitor Metrics ────────────────────────────────

interface PerformanceMetric {
  label: string;
  value: number;
  unit: string;
  target: number;
  format: 'integer' | 'decimal' | 'percentage';
}

const DEFAULT_PERFORMANCE_METRICS: PerformanceMetric[] = [
  { label: 'FPS', value: 0, unit: 'fps', target: 60, format: 'integer' },
  { label: 'Frame Time', value: 0, unit: 'ms', target: 16.67, format: 'decimal' },
  { label: 'Object Count', value: 0, unit: 'objects', target: 500, format: 'integer' },
  { label: 'Wire Count', value: 0, unit: 'wires', target: 200, format: 'integer' },
  { label: 'Component Count', value: 0, unit: 'components', target: 100, format: 'integer' },
  { label: 'Render Calls', value: 0, unit: 'calls/frame', target: 50, format: 'integer' },
  { label: 'Memory Usage', value: 0, unit: 'MB', target: 256, format: 'decimal' },
  { label: 'Event Listeners', value: 0, unit: 'listeners', target: 100, format: 'integer' },
];

// ─── Visual Theme Colors ────────────────────────────────────────

interface ThemeColorSwatch {
  name: string;
  color: string;
  usage: string;
  category: 'workspace' | 'selection' | 'validation' | 'wire';
}

const THEME_COLORS: ThemeColorSwatch[] = [
  { name: 'Background', color: '#1a1a2e', usage: 'Main workspace background', category: 'workspace' },
  { name: 'Grid Primary', color: '#2a2a4a', usage: 'Major grid lines', category: 'workspace' },
  { name: 'Grid Secondary', color: '#222240', usage: 'Minor grid lines', category: 'workspace' },
  { name: 'Grid Dot', color: '#333355', usage: 'Grid dot pattern', category: 'workspace' },
  { name: 'Selection Border', color: '#4a9eff', usage: 'Selected component outline', category: 'selection' },
  { name: 'Selection Fill', color: 'rgba(74, 158, 255, 0.1)', usage: 'Rubber-band selection area', category: 'selection' },
  { name: 'Hover Glow', color: '#e94560', usage: 'Component hover highlight', category: 'selection' },
  { name: 'Multi-Select', color: '#7b68ee', usage: 'Multi-selected component border', category: 'selection' },
  { name: 'Wire Preview', color: 'rgba(233, 69, 96, 0.5)', usage: 'Wire being drawn', category: 'wire' },
  { name: 'Wire Active', color: '#00d26a', usage: 'Connected wire (signal active)', category: 'wire' },
  { name: 'Wire Inactive', color: '#666', usage: 'Connected wire (no signal)', category: 'wire' },
  { name: 'Wire Power', color: '#ff4444', usage: 'Power supply wires', category: 'wire' },
  { name: 'Wire Ground', color: '#333', usage: 'Ground connection wires', category: 'wire' },
  { name: 'Valid Connection', color: '#00d26a', usage: 'Valid drop target indicator', category: 'validation' },
  { name: 'Invalid Connection', color: '#ff6b6b', usage: 'Invalid drop target indicator', category: 'validation' },
  { name: 'Warning Zone', color: '#ffc107', usage: 'Potential issue highlight', category: 'validation' },
];

// ─── Readiness Score Data ───────────────────────────────────────

interface ReadinessCategory {
  label: string;
  score: number;
  maxScore: number;
  icon: string;
  details: string[];
}

const READINESS_CATEGORIES: ReadinessCategory[] = [
  {
    label: 'Interaction Score',
    score: 72,
    maxScore: 100,
    icon: '🖱️',
    details: [
      'Hover feedback: 4/6 features active',
      'Wire creation: 4/7 features active',
      'Selection system: 5/7 features active',
      'Keyboard shortcuts: partial',
    ],
  },
  {
    label: 'Visual Quality Score',
    score: 85,
    maxScore: 100,
    icon: '🎨',
    details: [
      'Theme consistency: excellent',
      'Color contrast: AA compliant',
      'Animation smoothness: good',
      'Icon clarity: excellent',
    ],
  },
  {
    label: 'Performance Score',
    score: 0,
    maxScore: 100,
    icon: '⚡',
    details: [
      'FPS: not yet measured',
      'Memory: not yet profiled',
      'Render optimization: pending',
      'Event handling: pending audit',
    ],
  },
  {
    label: 'Scale Calibration Score',
    score: 56,
    maxScore: 100,
    icon: '📐',
    details: [
      'Calibrated components: 8/16',
      'Needs adjustment: 5/16',
      'Missing data: 3/16',
      'Overall scale accuracy: moderate',
    ],
  },
];

// ─── Shared Inline Styles ───────────────────────────────────────

const styles = {
  panel: {
    backgroundColor: THEME.background,
    color: THEME.text,
    fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
    fontSize: '13px',
    lineHeight: '1.5',
    borderRadius: '8px',
    border: `1px solid ${THEME.border}`,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    minHeight: '400px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: THEME.surface,
    borderBottom: `1px solid ${THEME.border}`,
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '15px',
    fontWeight: 600,
    color: THEME.text,
    letterSpacing: '0.3px',
  },
  headerBadge: {
    fontSize: '10px',
    padding: '2px 8px',
    borderRadius: '10px',
    backgroundColor: THEME.primary,
    color: '#fff',
    fontWeight: 600,
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
  },
  tabBar: {
    display: 'flex',
    backgroundColor: THEME.surface,
    borderBottom: `1px solid ${THEME.border}`,
    overflowX: 'auto' as const,
    scrollbarWidth: 'none' as const,
  },
  tab: (isActive: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 14px',
    fontSize: '12px',
    fontWeight: isActive ? 600 : 400,
    color: isActive ? THEME.primary : THEME.mutedText,
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: isActive ? `2px solid ${THEME.primary}` : '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
    letterSpacing: '0.2px',
  }),
  tabContent: {
    flex: 1,
    overflow: 'auto',
    padding: '16px',
  },
  card: {
    backgroundColor: THEME.surface,
    borderRadius: '6px',
    border: `1px solid ${THEME.border}`,
    padding: '14px',
    marginBottom: '12px',
    boxShadow: THEME.cardShadow,
  },
  cardTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: THEME.text,
    marginBottom: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: THEME.text,
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: `1px solid ${THEME.border}`,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '12px',
  },
  th: {
    textAlign: 'left' as const,
    padding: '8px 10px',
    fontSize: '11px',
    fontWeight: 600,
    color: THEME.mutedText,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    borderBottom: `1px solid ${THEME.border}`,
    backgroundColor: THEME.accent,
    whiteSpace: 'nowrap' as const,
  },
  td: {
    padding: '8px 10px',
    borderBottom: `1px solid ${THEME.border}`,
    color: THEME.text,
    verticalAlign: 'middle' as const,
  },
  statusDot: (status: CalibrationStatus) => ({
    display: 'inline-block',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    marginRight: '6px',
    backgroundColor:
      status === 'CALIBRATED'
        ? THEME.success
        : status === 'NEEDS_ADJUSTMENT'
          ? THEME.warning
          : THEME.error,
    boxShadow:
      status === 'CALIBRATED'
        ? `0 0 6px ${THEME.success}40`
        : status === 'NEEDS_ADJUSTMENT'
          ? `0 0 6px ${THEME.warning}40`
          : `0 0 6px ${THEME.error}40`,
  }),
  statusLabel: (status: CalibrationStatus) => ({
    color:
      status === 'CALIBRATED'
        ? THEME.success
        : status === 'NEEDS_ADJUSTMENT'
          ? THEME.warning
          : THEME.error,
    fontWeight: 500,
    fontSize: '11px',
  }),
  checkIcon: (ok: boolean) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    fontSize: '12px',
    backgroundColor: ok ? `${THEME.success}20` : `${THEME.error}20`,
    color: ok ? THEME.success : THEME.error,
    flexShrink: 0,
  }),
  progressBarOuter: {
    width: '100%',
    height: '8px',
    borderRadius: '4px',
    backgroundColor: `${THEME.accent}80`,
    overflow: 'hidden',
  },
  progressBarInner: (percent: number, color: string) => ({
    width: `${Math.min(100, Math.max(0, percent))}%`,
    height: '100%',
    borderRadius: '4px',
    backgroundColor: color,
    transition: 'width 0.5s ease',
  }),
  bigNumber: {
    fontSize: '48px',
    fontWeight: 700,
    lineHeight: 1,
    letterSpacing: '-1px',
  },
  metricCard: {
    backgroundColor: THEME.accent,
    borderRadius: '6px',
    padding: '12px 16px',
    textAlign: 'center' as const,
    border: `1px solid ${THEME.border}`,
  },
  metricValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: THEME.text,
    lineHeight: 1.2,
  },
  metricLabel: {
    fontSize: '11px',
    color: THEME.mutedText,
    marginTop: '4px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  metricUnit: {
    fontSize: '12px',
    color: THEME.mutedText,
    fontWeight: 400,
  },
  colorSwatch: (color: string) => ({
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    backgroundColor: color,
    border: `1px solid ${THEME.border}`,
    flexShrink: 0,
    boxShadow: `0 0 8px ${color}40`,
  }),
  modeIndicator: (mode: string) => ({
    display: 'inline-block',
    fontSize: '10px',
    padding: '2px 8px',
    borderRadius: '10px',
    fontWeight: 600,
    letterSpacing: '0.5px',
    backgroundColor:
      mode === 'ACTIVE'
        ? `${THEME.success}20`
        : mode === 'MULTI-SELECT'
          ? `${THEME.primary}20`
          : `${THEME.warning}20`,
    color:
      mode === 'ACTIVE'
        ? THEME.success
        : mode === 'MULTI-SELECT'
          ? THEME.primary
          : THEME.warning,
  }),
  trafficLight: (score: number) => {
    const color = score >= 75 ? THEME.success : score >= 40 ? THEME.warning : THEME.error;
    return {
      display: 'inline-block',
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      backgroundColor: color,
      boxShadow: `0 0 8px ${color}60`,
      marginRight: '8px',
    };
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  grid4: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
  },
  flexRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  flexRowBetween: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 0',
    borderBottom: `1px solid ${THEME.border}`,
  },
  itemLabel: {
    flex: 1,
    fontSize: '12px',
    color: THEME.text,
  },
  itemDetail: {
    fontSize: '11px',
    color: THEME.mutedText,
    flex: 1,
  },
  noData: {
    textAlign: 'center' as const,
    padding: '40px 20px',
    color: THEME.mutedText,
    fontSize: '13px',
  },
  divider: {
    height: '1px',
    backgroundColor: THEME.border,
    margin: '16px 0',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
  },
  legendDot: (color: string) => ({
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: color,
    marginRight: '6px',
  }),
} as const;

// ─── Utility Functions ──────────────────────────────────────────

function formatMetricValue(value: number, format: 'integer' | 'decimal' | 'percentage'): string {
  switch (format) {
    case 'integer':
      return Math.round(value).toString();
    case 'decimal':
      return value.toFixed(2);
    case 'percentage':
      return `${Math.round(value)}%`;
    default:
      return value.toString();
  }
}

function getScoreColor(score: number): string {
  if (score >= 75) return THEME.success;
  if (score >= 40) return THEME.warning;
  return THEME.error;
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 25) return 'Poor';
  return 'Critical';
}

// ─── Snapshot-Based Readiness Score ─────────────────────────────

interface ReadinessBreakdown {
  hover: number;
  wire: number;
  selection: number;
  performance: number;
  total: number;
}

/**
 * Computes a 0-100 readiness score from a live SimulatorUXSnapshot.
 * Each category contributes 0-25 points.
 */
export function computeReadinessScore(
  snapshot: SimulatorUXSnapshot | undefined,
): ReadinessBreakdown {
  if (!snapshot) {
    return { hover: 0, wire: 0, selection: 0, performance: 0, total: 0 };
  }

  // Hover system score (0-25): based on hover feedback registry count
  const activeHovers = snapshot.hoverFeedbacks.filter((h) => h.isActive).length;
  const hoverRegistryCount = snapshot.hoverFeedbacks.length;
  const hover = Math.min(
    25,
    hoverRegistryCount >= 1 ? 10 + Math.min(15, activeHovers * 5) : 0,
  );

  // Wire workflow score (0-25): based on wire creation state
  let wire = 0;
  if (snapshot.wireCreationStates.length > 0) {
    const latest = snapshot.wireCreationStates[snapshot.wireCreationStates.length - 1];
    if (latest.phase === 'IDLE') wire = 25;
    else if (latest.phase === 'ROUTING' || latest.phase === 'TARGET_HOVER') wire = 18;
    else if (latest.phase === 'SOURCE_SELECTED') wire = 12;
    else if (latest.phase === 'COMPLETING') wire = 22;
    else wire = 5;
  } else {
    wire = 15; // No wire state means idle system — partial credit
  }

  // Selection system score (0-25): based on selection model state
  let selection = 0;
  if (snapshot.professionalSelections.length > 0) {
    const sel = snapshot.professionalSelections[0];
    selection = 10;
    if (sel.handles.length > 0) selection += 8;
    if (sel.selectionMode === 'MULTI' || sel.selectionMode === 'BOX') selection += 4;
    if (sel.hasClipboardData) selection += 3;
    selection = Math.min(25, selection);
  } else {
    selection = 10; // System exists but nothing selected — partial credit
  }

  // Performance score (0-25): based on FPS metrics
  let performance = 0;
  if (snapshot.performanceMetrics.length > 0) {
    const metrics = snapshot.performanceMetrics[snapshot.performanceMetrics.length - 1];
    if (metrics.fps >= 55) performance = 25;
    else if (metrics.fps >= 40) performance = 20;
    else if (metrics.fps >= 25) performance = 15;
    else if (metrics.fps >= 15) performance = 8;
    else performance = 3;
  }

  const total = hover + wire + selection + performance;
  return { hover, wire, selection, performance, total };
}

function computeOverallReadiness(categories: ReadinessCategory[]): number {
  if (categories.length === 0) return 0;
  const totalScore = categories.reduce((sum, c) => sum + c.score, 0);
  const totalMax = categories.reduce((sum, c) => sum + c.maxScore, 0);
  return totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
}

function getCalibrationSummary(data: ComponentCalibration[]): {
  calibrated: number;
  needsAdjustment: number;
  missingData: number;
  total: number;
} {
  return {
    calibrated: data.filter((d) => d.status === 'CALIBRATED').length,
    needsAdjustment: data.filter((d) => d.status === 'NEEDS_ADJUSTMENT').length,
    missingData: data.filter((d) => d.status === 'MISSING_DATA').length,
    total: data.length,
  };
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'workspace':
      return '#6c7ae0';
    case 'selection':
      return '#4a9eff';
    case 'validation':
      return '#ffc107';
    case 'wire':
      return '#00d26a';
    default:
      return THEME.mutedText;
  }
}

function getCategoryLabel(category: string): string {
  switch (category) {
    case 'workspace':
      return 'Workspace';
    case 'selection':
      return 'Selection';
    case 'validation':
      return 'Validation';
    case 'wire':
      return 'Wire';
    default:
      return category;
  }
}

// ─── Sub-Components ─────────────────────────────────────────────

function StatusBadge({ status }: { status: CalibrationStatus }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      <span style={styles.statusDot(status)} />
      <span style={styles.statusLabel(status)}>
        {status === 'CALIBRATED'
          ? 'Calibrated'
          : status === 'NEEDS_ADJUSTMENT'
            ? 'Needs Adjustment'
            : 'Missing Data'}
      </span>
    </span>
  );
}

function CheckMark({ ok }: { ok: boolean }) {
  return (
    <span style={styles.checkIcon(ok)}>
      {ok ? '✓' : '✕'}
    </span>
  );
}

function ProgressBar({
  percent,
  color,
  height,
}: {
  percent: number;
  color?: string;
  height?: number;
}) {
  const barColor = color || getScoreColor(percent);
  const barHeight = height || 8;
  return (
    <div
      style={{
        ...styles.progressBarOuter,
        height: `${barHeight}px`,
      }}
    >
      <div style={styles.progressBarInner(percent, barColor)} />
    </div>
  );
}

function TrafficLight({ score }: { score: number }) {
  return <span style={styles.trafficLight(score)} />;
}

function ScaleSummaryCards({ data }: { data: ComponentCalibration[] }) {
  const summary = getCalibrationSummary(data);
  return (
    <div style={styles.grid3}>
      <div style={{ ...styles.metricCard, borderLeft: `3px solid ${THEME.success}` }}>
        <div style={{ ...styles.metricValue, color: THEME.success }}>{summary.calibrated}</div>
        <div style={styles.metricLabel}>Calibrated</div>
      </div>
      <div style={{ ...styles.metricCard, borderLeft: `3px solid ${THEME.warning}` }}>
        <div style={{ ...styles.metricValue, color: THEME.warning }}>
          {summary.needsAdjustment}
        </div>
        <div style={styles.metricLabel}>Needs Adjustment</div>
      </div>
      <div style={{ ...styles.metricCard, borderLeft: `3px solid ${THEME.error}` }}>
        <div style={{ ...styles.metricValue, color: THEME.error }}>{summary.missingData}</div>
        <div style={styles.metricLabel}>Missing Data</div>
      </div>
    </div>
  );
}

// ─── Tab Content Components ─────────────────────────────────────

function ScaleAuditTab() {
  const summary = getCalibrationSummary(COMPONENT_CALIBRATION_DATA);
  const calibrationPercent = Math.round((summary.calibrated / summary.total) * 100);

  return (
    <div>
      {/* Summary Header */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>
          <span>📐</span>
          <span>Component Scale Calibration Overview</span>
        </div>
        <ScaleSummaryCards data={COMPONENT_CALIBRATION_DATA} />
        <div style={{ marginTop: '12px' }}>
          <div style={styles.flexRowBetween}>
            <span style={{ fontSize: '12px', color: THEME.mutedText }}>
              Overall Calibration Progress
            </span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: getScoreColor(calibrationPercent) }}>
              {calibrationPercent}%
            </span>
          </div>
          <div style={{ marginTop: '6px' }}>
            <ProgressBar percent={calibrationPercent} height={6} />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ ...styles.card, padding: '10px 14px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '11px' }}>
          <span style={styles.flexRow}>
            <span style={styles.legendDot(THEME.success)} />
            Calibrated
          </span>
          <span style={styles.flexRow}>
            <span style={styles.legendDot(THEME.warning)} />
            Needs Adjustment
          </span>
          <span style={styles.flexRow}>
            <span style={styles.legendDot(THEME.error)} />
            Missing Data
          </span>
        </div>
      </div>

      {/* Calibration Table */}
      <div style={{ ...styles.card, padding: '0', overflow: 'hidden' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Component</th>
              <th style={{ ...styles.th, textAlign: 'center' as const }}>Current Scale</th>
              <th style={{ ...styles.th, textAlign: 'center' as const }}>Calibrated Scale</th>
              <th style={styles.th}>Real Size (mm)</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {COMPONENT_CALIBRATION_DATA.map((row, idx) => (
              <tr
                key={row.component}
                style={{
                  backgroundColor: idx % 2 === 0 ? 'transparent' : `${THEME.accent}30`,
                  transition: 'background-color 0.15s ease',
                }}
              >
                <td style={{ ...styles.td, fontWeight: 500 }}>{row.component}</td>
                <td style={{ ...styles.td, textAlign: 'center' as const, fontFamily: 'monospace' }}>
                  {row.currentScale.toFixed(2)}
                </td>
                <td style={{ ...styles.td, textAlign: 'center' as const, fontFamily: 'monospace' }}>
                  {row.calibratedScale.toFixed(2)}
                </td>
                <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: '11px' }}>
                  {row.realSizeMm}
                </td>
                <td style={styles.td}>
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Scale Deviation Chart (Visual) */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>
          <span>📊</span>
          <span>Scale Deviation from Target</span>
        </div>
        {COMPONENT_CALIBRATION_DATA.map((row) => {
          const deviation = Math.abs(row.currentScale - row.calibratedScale);
          const deviationPercent = Math.round(deviation * 100);
          return (
            <div key={row.component} style={{ marginBottom: '8px' }}>
              <div style={styles.flexRowBetween}>
                <span style={{ fontSize: '11px', color: THEME.text, minWidth: '160px' }}>
                  {row.component}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    color: getScoreColor(100 - deviationPercent * 3),
                  }}
                >
                  Δ {(deviation * 100).toFixed(0)}%
                </span>
              </div>
              <ProgressBar
                percent={deviationPercent * 3}
                color={getScoreColor(100 - deviationPercent * 3)}
                height={4}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InteractionQualityTab() {
  const totalItems = INTERACTION_SECTIONS.reduce((sum, s) => sum + s.items.length, 0);
  const configuredItems = INTERACTION_SECTIONS.reduce(
    (sum, s) => sum + s.items.filter((i) => i.configured).length,
    0,
  );
  const interactionPercent = Math.round((configuredItems / totalItems) * 100);

  return (
    <div>
      {/* Overview Card */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>
          <span>🖱️</span>
          <span>Interaction Quality Overview</span>
        </div>
        <div style={styles.grid3}>
          <div style={styles.metricCard}>
            <div style={styles.metricValue}>{configuredItems}</div>
            <div style={styles.metricLabel}>Active Features</div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricValue}>{totalItems - configuredItems}</div>
            <div style={styles.metricLabel}>Pending</div>
          </div>
          <div style={styles.metricCard}>
            <div style={{ ...styles.metricValue, color: getScoreColor(interactionPercent) }}>
              {interactionPercent}%
            </div>
            <div style={styles.metricLabel}>Coverage</div>
          </div>
        </div>
        <div style={{ marginTop: '12px' }}>
          <ProgressBar percent={interactionPercent} height={6} />
        </div>
      </div>

      {/* Interaction Sections */}
      {INTERACTION_SECTIONS.map((section) => {
        const sectionConfigured = section.items.filter((i) => i.configured).length;
        const sectionTotal = section.items.length;
        const sectionPercent = Math.round((sectionConfigured / sectionTotal) * 100);

        return (
          <div key={section.title} style={styles.card}>
            <div style={styles.flexRowBetween}>
              <div style={styles.cardTitle}>
                <span>{section.icon}</span>
                <span>{section.title}</span>
              </div>
              <div style={styles.flexRow}>
                <span style={styles.modeIndicator(section.mode)}>{section.mode}</span>
                <span
                  style={{
                    fontSize: '11px',
                    color: getScoreColor(sectionPercent),
                    fontWeight: 600,
                  }}
                >
                  {sectionConfigured}/{sectionTotal}
                </span>
              </div>
            </div>

            {section.items.map((item) => (
              <div key={item.label} style={styles.itemRow}>
                <CheckMark ok={item.configured} />
                <span style={styles.itemLabel}>{item.label}</span>
                <span style={styles.itemDetail}>{item.details}</span>
              </div>
            ))}

            <div style={{ marginTop: '8px' }}>
              <ProgressBar percent={sectionPercent} height={4} />
            </div>
          </div>
        );
      })}

      {/* Keyboard Shortcuts Summary */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <span>⌨️</span>
          <span>Keyboard Shortcut Coverage</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[
            { key: 'Ctrl+A', action: 'Select All', active: true },
            { key: 'Delete', action: 'Delete Selected', active: true },
            { key: 'Ctrl+Z', action: 'Undo', active: true },
            { key: 'Ctrl+Y', action: 'Redo', active: true },
            { key: 'Ctrl+C', action: 'Copy', active: false },
            { key: 'Ctrl+V', action: 'Paste', active: false },
            { key: 'Ctrl+D', action: 'Duplicate', active: false },
            { key: 'Escape', action: 'Cancel Operation', active: true },
            { key: 'Space', action: 'Pan Mode', active: false },
            { key: 'Ctrl+G', action: 'Toggle Grid', active: false },
          ].map((shortcut) => (
            <div key={shortcut.key} style={styles.flexRowBetween}>
              <div style={styles.flexRow}>
                <CheckMark ok={shortcut.active} />
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    backgroundColor: THEME.accent,
                    padding: '2px 6px',
                    borderRadius: '3px',
                    color: THEME.text,
                  }}
                >
                  {shortcut.key}
                </span>
              </div>
              <span style={{ fontSize: '12px', color: shortcut.active ? THEME.text : THEME.mutedText }}>
                {shortcut.action}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PerformanceMonitorTab() {
  const metrics = DEFAULT_PERFORMANCE_METRICS;
  const fpsMetric = metrics.find((m) => m.label === 'FPS');
  const frameTimeMetric = metrics.find((m) => m.label === 'Frame Time');

  return (
    <div>
      {/* FPS Hero Display */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>
          <span>⚡</span>
          <span>Real-Time Performance</span>
        </div>
        <div style={{ ...styles.grid2, marginBottom: '16px' }}>
          <div
            style={{
              ...styles.metricCard,
              padding: '24px',
              borderLeft: `3px solid ${THEME.primary}`,
            }}
          >
            <div style={{ ...styles.bigNumber, color: THEME.mutedText }}>
              {fpsMetric ? formatMetricValue(fpsMetric.value, fpsMetric.format) : '0'}
            </div>
            <div style={{ ...styles.metricLabel, fontSize: '12px', marginTop: '8px' }}>
              Frames Per Second
            </div>
            <div
              style={{
                marginTop: '8px',
                fontSize: '11px',
                color: THEME.mutedText,
              }}
            >
              Target: 60 fps
            </div>
          </div>
          <div
            style={{
              ...styles.metricCard,
              padding: '24px',
              borderLeft: `3px solid ${THEME.accent}`,
            }}
          >
            <div style={{ ...styles.bigNumber, color: THEME.mutedText }}>
              {frameTimeMetric
                ? formatMetricValue(frameTimeMetric.value, frameTimeMetric.format)
                : '0.00'}
            </div>
            <div style={{ ...styles.metricLabel, fontSize: '12px', marginTop: '8px' }}>
              Frame Time (ms)
            </div>
            <div
              style={{
                marginTop: '8px',
                fontSize: '11px',
                color: THEME.mutedText,
              }}
            >
              Target: ≤ 16.67 ms
            </div>
          </div>
        </div>
      </div>

      {/* Metric Grid */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <span>📊</span>
          <span>Detailed Metrics</span>
        </div>
        <div style={styles.grid2}>
          {metrics.map((metric) => {
            const percent =
              metric.target > 0
                ? Math.min(100, Math.round((metric.value / metric.target) * 100))
                : 0;
            return (
              <div key={metric.label} style={styles.metricCard}>
                <div style={{ fontSize: '11px', color: THEME.mutedText, marginBottom: '4px' }}>
                  {metric.label}
                </div>
                <div style={styles.flexRow}>
                  <span style={{ fontSize: '20px', fontWeight: 700, color: THEME.text }}>
                    {formatMetricValue(metric.value, metric.format)}
                  </span>
                  <span style={styles.metricUnit}>{metric.unit}</span>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <ProgressBar percent={percent} height={4} />
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: THEME.mutedText,
                    marginTop: '4px',
                    textAlign: 'right' as const,
                  }}
                >
                  Target: {metric.target} {metric.unit}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance Budget */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <span>💰</span>
          <span>Performance Budget</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { label: 'Max Components', budget: 100, current: 0, unit: 'components' },
            { label: 'Max Wires', budget: 200, current: 0, unit: 'wires' },
            { label: 'Max Event Listeners', budget: 100, current: 0, unit: 'listeners' },
            { label: 'Max DOM Nodes', budget: 1500, current: 0, unit: 'nodes' },
            { label: 'Max Texture Memory', budget: 128, current: 0, unit: 'MB' },
            { label: 'Max Animation Frames', budget: 60, current: 0, unit: 'fps' },
          ].map((budget) => {
            const percent =
              budget.budget > 0
                ? Math.round((budget.current / budget.budget) * 100)
                : 0;
            return (
              <div key={budget.label}>
                <div style={styles.flexRowBetween}>
                  <span style={{ fontSize: '12px', color: THEME.text }}>{budget.label}</span>
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: THEME.mutedText }}>
                    {budget.current} / {budget.budget} {budget.unit}
                  </span>
                </div>
                <div style={{ marginTop: '4px' }}>
                  <ProgressBar percent={percent} height={4} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance Notes */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <span>📝</span>
          <span>Performance Notes</span>
        </div>
        <div
          style={{
            fontSize: '12px',
            color: THEME.mutedText,
            lineHeight: 1.6,
          }}
        >
          <p style={{ marginBottom: '8px' }}>
            Performance monitoring is not yet active. All metrics currently show placeholder
            values. Connect the performance profiler to begin real-time monitoring.
          </p>
          <p style={{ marginBottom: '8px' }}>
            <strong style={{ color: THEME.text }}>Optimization targets:</strong>
          </p>
          <ul style={{ paddingLeft: '16px', margin: 0 }}>
            <li>Maintain 60 FPS with up to 100 components on screen</li>
            <li>Keep frame time under 16.67ms for smooth rendering</li>
            <li>Minimize re-renders through React.memo and useMemo</li>
            <li>Virtualize long lists and off-screen components</li>
            <li>Batch DOM updates during wire creation operations</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function VisualThemeTab() {
  const categories = ['workspace', 'selection', 'wire', 'validation'] as const;

  return (
    <div>
      {/* Theme Preview */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>
          <span>🎨</span>
          <span>Dark Theme Color Palette</span>
        </div>

        {/* Workspace Preview Box */}
        <div
          style={{
            width: '100%',
            height: '120px',
            backgroundColor: THEME.background,
            borderRadius: '6px',
            border: `1px solid ${THEME.border}`,
            position: 'relative',
            overflow: 'hidden',
            marginBottom: '16px',
          }}
        >
          {/* Simulated grid */}
          <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
            {Array.from({ length: 15 }).map((_, i) => (
              <line
                key={`v-${i}`}
                x1={i * 30}
                y1={0}
                x2={i * 30}
                y2={120}
                stroke="#2a2a4a"
                strokeWidth={i % 5 === 0 ? 1 : 0.5}
                opacity={i % 5 === 0 ? 0.6 : 0.3}
              />
            ))}
            {Array.from({ length: 5 }).map((_, i) => (
              <line
                key={`h-${i}`}
                x1={0}
                y1={i * 30}
                x2={450}
                y2={i * 30}
                stroke="#2a2a4a"
                strokeWidth={i % 4 === 0 ? 1 : 0.5}
                opacity={i % 4 === 0 ? 0.6 : 0.3}
              />
            ))}
            {/* Simulated component box */}
            <rect
              x={60}
              y={30}
              width={60}
              height={40}
              rx={4}
              fill={THEME.surface}
              stroke="#4a9eff"
              strokeWidth={2}
            />
            <text x={90} y={55} textAnchor="middle" fill={THEME.text} fontSize={10}>
              LED
            </text>
            {/* Simulated wire */}
            <line x1={120} y1={50} x2={200} y2={50} stroke="#00d26a" strokeWidth={2} />
            {/* Simulated hover component */}
            <rect
              x={200}
              y={30}
              width={70}
              height={40}
              rx={4}
              fill={THEME.surface}
              stroke={THEME.primary}
              strokeWidth={2}
              opacity={0.9}
            />
            <text x={235} y={55} textAnchor="middle" fill={THEME.text} fontSize={10}>
              Resistor
            </text>
            {/* Hover glow simulation */}
            <rect
              x={197}
              y={27}
              width={76}
              height={46}
              rx={6}
              fill="none"
              stroke={THEME.primary}
              strokeWidth={1}
              opacity={0.3}
            />
          </svg>
        </div>
      </div>

      {/* Color Palette By Category */}
      {categories.map((category) => {
        const categoryColors = THEME_COLORS.filter((c) => c.category === category);
        return (
          <div key={category} style={styles.card}>
            <div style={styles.cardTitle}>
              <span style={styles.legendDot(getCategoryColor(category))} />
              <span>{getCategoryLabel(category)} Colors</span>
              <span
                style={{
                  fontSize: '10px',
                  color: THEME.mutedText,
                  marginLeft: 'auto',
                }}
              >
                {categoryColors.length} swatches
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {categoryColors.map((swatch) => (
                <div key={swatch.name} style={styles.flexRow}>
                  <div style={styles.colorSwatch(swatch.color)} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: THEME.text }}>
                      {swatch.name}
                    </div>
                    <div style={{ fontSize: '11px', color: THEME.mutedText }}>{swatch.usage}</div>
                  </div>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      color: THEME.mutedText,
                      backgroundColor: THEME.accent,
                      padding: '2px 6px',
                      borderRadius: '3px',
                    }}
                  >
                    {swatch.color}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Theme Consistency Notes */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <span>📋</span>
          <span>Theme Consistency Checklist</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[
            { label: 'Background gradient consistency', ok: true },
            { label: 'Border color uniformity', ok: true },
            { label: 'Font family consistency', ok: true },
            { label: 'Icon size standardization', ok: true },
            { label: 'Hover state color mapping', ok: true },
            { label: 'Selection highlight contrast ratio', ok: true },
            { label: 'Wire color distinguishability', ok: false },
            { label: 'Dark mode text readability (AAA)', ok: false },
            { label: 'Animation easing consistency', ok: true },
            { label: 'Shadow depth hierarchy', ok: true },
          ].map((check) => (
            <div key={check.label} style={styles.flexRow}>
              <CheckMark ok={check.ok} />
              <span
                style={{
                  fontSize: '12px',
                  color: check.ok ? THEME.text : THEME.mutedText,
                }}
              >
                {check.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Spacing & Typography */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <span>🔤</span>
          <span>Typography & Spacing Defaults</span>
        </div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Property</th>
              <th style={styles.th}>Value</th>
              <th style={styles.th}>Usage</th>
            </tr>
          </thead>
          <tbody>
            {[
              { property: 'Font Family', value: "Inter, Segoe UI, system-ui", usage: 'Primary text' },
              { property: 'Font Size (Base)', value: '13px', usage: 'Body text' },
              { property: 'Font Size (Small)', value: '11px', usage: 'Labels, captions' },
              { property: 'Font Size (Header)', value: '15px', usage: 'Section titles' },
              { property: 'Line Height', value: '1.5', usage: 'All text blocks' },
              { property: 'Border Radius (Card)', value: '6px', usage: 'Cards, panels' },
              { property: 'Border Radius (Button)', value: '4px', usage: 'Buttons, inputs' },
              { property: 'Spacing (XS)', value: '4px', usage: 'Tight gaps' },
              { property: 'Spacing (SM)', value: '8px', usage: 'Default gaps' },
              { property: 'Spacing (MD)', value: '12px', usage: 'Card padding' },
              { property: 'Spacing (LG)', value: '16px', usage: 'Section margins' },
              { property: 'Transition Duration', value: '0.2s ease', usage: 'Hover, focus states' },
            ].map((row, idx) => (
              <tr
                key={row.property}
                style={{
                  backgroundColor: idx % 2 === 0 ? 'transparent' : `${THEME.accent}30`,
                }}
              >
                <td style={{ ...styles.td, fontWeight: 500 }}>{row.property}</td>
                <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: '11px' }}>
                  {row.value}
                </td>
                <td style={{ ...styles.td, color: THEME.mutedText }}>{row.usage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReadinessScoreTab() {
  const overallScore = computeOverallReadiness(READINESS_CATEGORIES);
  const overallColor = getScoreColor(overallScore);
  const overallLabel = getScoreLabel(overallScore);

  return (
    <div>
      {/* Overall Score Hero */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>
          <span>✅</span>
          <span>Phase 31A Simulator Readiness</span>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '24px 0',
          }}
        >
          {/* Score Circle */}
          <div
            style={{
              position: 'relative',
              width: '160px',
              height: '160px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="160"
              height="160"
              viewBox="0 0 160 160"
              style={{ position: 'absolute', top: 0, left: 0 }}
            >
              {/* Background circle */}
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke={THEME.accent}
                strokeWidth="8"
              />
              {/* Score arc */}
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke={overallColor}
                strokeWidth="8"
                strokeDasharray={`${(overallScore / 100) * 440} 440`}
                strokeDashoffset="0"
                strokeLinecap="round"
                transform="rotate(-90 80 80)"
                style={{ transition: 'stroke-dasharray 0.8s ease' }}
              />
            </svg>
            <div style={{ textAlign: 'center', zIndex: 1 }}>
              <div style={{ ...styles.bigNumber, color: overallColor }}>{overallScore}</div>
              <div style={{ fontSize: '14px', color: THEME.mutedText, marginTop: '2px' }}>%</div>
            </div>
          </div>

          <div
            style={{
              marginTop: '16px',
              fontSize: '16px',
              fontWeight: 600,
              color: overallColor,
              letterSpacing: '0.3px',
            }}
          >
            {overallLabel}
          </div>
          <div style={{ marginTop: '4px', fontSize: '12px', color: THEME.mutedText }}>
            Overall Readiness Score
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <span>📊</span>
          <span>Score Breakdown</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {READINESS_CATEGORIES.map((category) => {
            const categoryPercent = Math.round(
              (category.score / category.maxScore) * 100,
            );
            const categoryColor = getScoreColor(categoryPercent);

            return (
              <div key={category.label}>
                <div style={styles.flexRowBetween}>
                  <div style={styles.flexRow}>
                    <TrafficLight score={categoryPercent} />
                    <span style={{ fontSize: '12px' }}>{category.icon}</span>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: THEME.text }}>
                      {category.label}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: categoryColor,
                      fontFamily: 'monospace',
                    }}
                  >
                    {category.score}/{category.maxScore}
                  </span>
                </div>
                <div style={{ marginTop: '6px' }}>
                  <ProgressBar
                    percent={categoryPercent}
                    color={categoryColor}
                    height={10}
                  />
                </div>
                <div
                  style={{
                    marginTop: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                  }}
                >
                  {category.details.map((detail, dIdx) => (
                    <div
                      key={dIdx}
                      style={{
                        fontSize: '11px',
                        color: THEME.mutedText,
                        paddingLeft: '28px',
                      }}
                    >
                      • {detail}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Traffic Light Legend */}
      <div style={{ ...styles.card, padding: '10px 14px' }}>
        <div
          style={{
            display: 'flex',
            gap: '20px',
            flexWrap: 'wrap',
            fontSize: '11px',
            alignItems: 'center',
          }}
        >
          <span style={{ fontWeight: 600, color: THEME.mutedText }}>Legend:</span>
          <span style={styles.flexRow}>
            <span style={styles.legendDot(THEME.success)} />
            ≥ 75% — Ready
          </span>
          <span style={styles.flexRow}>
            <span style={styles.legendDot(THEME.warning)} />
            40–74% — In Progress
          </span>
          <span style={styles.flexRow}>
            <span style={styles.legendDot(THEME.error)} />
            &lt; 40% — Needs Work
          </span>
        </div>
      </div>

      {/* Readiness Checklist */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <span>📋</span>
          <span>Readiness Checklist</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[
            { label: 'Component scale calibration data loaded', done: true },
            { label: 'Hover feedback system configured', done: true },
            { label: 'Wire creation workflow functional', done: true },
            { label: 'Selection system with multi-select', done: true },
            { label: 'Dark theme colors defined', done: true },
            { label: 'Typography standards set', done: true },
            { label: 'Performance monitoring connected', done: false },
            { label: 'All 16 components calibrated', done: false },
            { label: 'Auto-routing system implemented', done: false },
            { label: 'Copy/paste shortcuts active', done: false },
            { label: 'Wire color coding by type', done: false },
            { label: 'AAA contrast compliance', done: false },
            { label: 'Performance budget enforced', done: false },
            { label: 'Group selection operations', done: false },
          ].map((item) => (
            <div key={item.label} style={styles.flexRow}>
              <CheckMark ok={item.done} />
              <span
                style={{
                  fontSize: '12px',
                  color: item.done ? THEME.text : THEME.mutedText,
                  textDecoration: item.done ? 'none' : 'none',
                }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
        <div style={styles.divider} />
        <div style={styles.flexRowBetween}>
          <span style={{ fontSize: '12px', color: THEME.mutedText }}>
            Completed: 6 / 14 items
          </span>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: getScoreColor(43),
            }}
          >
            43%
          </span>
        </div>
        <div style={{ marginTop: '6px' }}>
          <ProgressBar percent={43} height={6} />
        </div>
      </div>

      {/* Next Steps */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <span>🚀</span>
          <span>Next Steps for Phase 31B</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            {
              priority: 'HIGH',
              task: 'Connect performance profiler for real-time FPS/memory tracking',
            },
            {
              priority: 'HIGH',
              task: 'Complete scale calibration for remaining 8 components',
            },
            {
              priority: 'MEDIUM',
              task: 'Implement auto-routing for wire paths around components',
            },
            {
              priority: 'MEDIUM',
              task: 'Add copy/paste/duplicate keyboard shortcuts',
            },
            {
              priority: 'MEDIUM',
              task: 'Implement wire color coding by signal type',
            },
            {
              priority: 'LOW',
              task: 'Achieve AAA contrast compliance for all text',
            },
            {
              priority: 'LOW',
              task: 'Add group selection operations (move, delete, copy)',
            },
            {
              priority: 'LOW',
              task: 'Implement pan mode with Space key',
            },
          ].map((step, idx) => (
            <div key={idx} style={styles.flexRow}>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '3px',
                  minWidth: '52px',
                  textAlign: 'center' as const,
                  backgroundColor:
                    step.priority === 'HIGH'
                      ? `${THEME.error}20`
                      : step.priority === 'MEDIUM'
                        ? `${THEME.warning}20`
                        : `${THEME.success}20`,
                  color:
                    step.priority === 'HIGH'
                      ? THEME.error
                      : step.priority === 'MEDIUM'
                        ? THEME.warning
                        : THEME.success,
                }}
              >
                {step.priority}
              </span>
              <span style={{ fontSize: '12px', color: THEME.text }}>{step.task}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════

export interface SimulatorUXPanelProps {
  snapshot?: SimulatorUXSnapshot;
}

export function SimulatorUXPanel({ snapshot }: SimulatorUXPanelProps) {
  const [activeTab, setActiveTab] = useState<SimulatorTabId>('scale-audit');
  const [collapsed, setCollapsed] = useState(false);
  const snapshotScore = useMemo(() => computeReadinessScore(snapshot), [snapshot]);

  const handleTabChange = useCallback((tabId: SimulatorTabId) => {
    setActiveTab(tabId);
  }, []);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  // ─── Tab content renderer ──────────────────────────────────────

  const tabContent = useMemo(() => {
    switch (activeTab) {
      case 'scale-audit':
        return <ScaleAuditTab />;
      case 'interaction':
        return <InteractionQualityTab />;
      case 'performance':
        return <PerformanceMonitorTab />;
      case 'theme':
        return <VisualThemeTab />;
      case 'readiness':
        return <ReadinessScoreTab />;
      default:
        return null;
    }
  }, [activeTab]);

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <span style={{ fontSize: '18px' }}>🖥️</span>
          <span>Simulator UX Dashboard</span>
          <span style={styles.headerBadge}>Phase 31A</span>
        </div>
        <button
          onClick={toggleCollapse}
          style={{
            background: 'none',
            border: 'none',
            color: THEME.mutedText,
            cursor: 'pointer',
            fontSize: '18px',
            padding: '4px 8px',
            borderRadius: '4px',
            transition: 'color 0.2s ease',
          }}
          title={collapsed ? 'Expand panel' : 'Collapse panel'}
        >
          {collapsed ? '▼' : '▲'}
        </button>
      </div>

      {/* Collapsed state */}
      {collapsed ? (
        <div
          style={{
            padding: '8px 16px',
            fontSize: '12px',
            color: THEME.mutedText,
            backgroundColor: THEME.surface,
            borderTop: `1px solid ${THEME.border}`,
          }}
        >
          Panel collapsed — click ▼ to expand
        </div>
      ) : (
        <>
          {/* Tab Bar */}
          <div style={styles.tabBar}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                style={styles.tab(activeTab === tab.id)}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={styles.tabContent}>{tabContent}</div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 16px',
              backgroundColor: THEME.surface,
              borderTop: `1px solid ${THEME.border}`,
              fontSize: '11px',
              color: THEME.mutedText,
            }}
          >
            <span>Simulator UX Panel v31A</span>
            <span>
              {snapshot ? (
                <>Live: {snapshotScore.total}/100 • {getScoreLabel(snapshotScore.total)}</>
              ) : (
                <>Readiness: {computeOverallReadiness(READINESS_CATEGORIES)}% • {getScoreLabel(computeOverallReadiness(READINESS_CATEGORIES))}</>
              )}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default SimulatorUXPanel;
