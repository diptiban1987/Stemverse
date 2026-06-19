'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  Cpu,
  Zap,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Shield,
  Lightbulb,
  BookOpen,
  Wrench,
  Info,
  BarChart3,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// Phase 29A: Circuit Validation Panel — Upgraded
// Extended with tab system, category filters, educational feedback,
// fix suggestions, project readiness, and learning hints.
// Backward-compatible with Phase 28B data sources.
// ═══════════════════════════════════════════════════════════════

export interface CircuitValidationPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runtime: any;
  activeGraphId?: string;
}

// ─── Tab & Filter Types ─────────────────────────────────────────

type TabId = 'overview' | 'errors' | 'warnings' | 'suggestions' | 'learning';
type CategoryFilter = 'ALL' | 'ELECTRICAL' | 'BLOCKLY' | 'RUNTIME' | 'HARDWARE';

interface DiagnosticIssue {
  issueId: string;
  code: string;
  severity: string;
  category: string;
  componentId: string;
  pinName: string;
  gpioNumber: number;
  title: string;
  message: string;
  whyWrong: string;
  howToFix: string;
  expectedOutcome: string;
  highlightColor: string;
  affectedIds: string[];
}

interface DiagnosticRecommendation {
  recommendationId: string;
  issueId: string;
  title: string;
  description: string;
  actionType: string;
  targetComponentId: string;
  isAutoFixable: boolean;
}

interface DiagnosticHint {
  hintId: string;
  componentType: string;
  difficulty: string;
  title: string;
  explanation: string;
  example: string;
  relatedConcept: string;
}

interface DiagnosticReadiness {
  hardwarePercent: number;
  codePercent: number;
  electricalPercent: number;
  simulationPercent: number;
  overallPercent: number;
  criticalIssues: string[];
  notReadyReasons: string[];
  isReady: boolean;
}

interface BlocklyDiag {
  diagnosticId: string;
  code: string;
  severity: string;
  blockId: string;
  gpioNumber: number;
  title: string;
  message: string;
  howToFix: string;
}

interface ValidationIssue {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

interface HealthSummary {
  readinessPercent: number;
  errorCount: number;
  warningCount: number;
  healthGrade: string;
  totalComponents: number;
  totalWires: number;
  totalNets: number;
  disconnectedComponents: string[];
  unmappedGpios: number[];
}

interface GpioConflict {
  conflictId: string;
  gpioNumber: number;
  conflictType: string;
  severity: string;
  description: string;
}

// ─── Utility Functions ──────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: typeof Shield }[] = [
  { id: 'overview', label: 'Overview', icon: Shield },
  { id: 'errors', label: 'Errors', icon: XCircle },
  { id: 'warnings', label: 'Warnings', icon: AlertTriangle },
  { id: 'suggestions', label: 'Tips', icon: Lightbulb },
  { id: 'learning', label: 'Learn', icon: BookOpen },
];

const CATEGORIES: { id: CategoryFilter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'ELECTRICAL', label: 'Electrical' },
  { id: 'BLOCKLY', label: 'Blockly' },
  { id: 'RUNTIME', label: 'Runtime' },
  { id: 'HARDWARE', label: 'Hardware' },
];

function severityColor(severity: string): string {
  switch (severity) {
    case 'CRITICAL':
    case 'ERROR':
    case 'error':
      return 'text-red-500';
    case 'WARNING':
    case 'warning':
      return 'text-amber-500';
    case 'SUGGESTION':
      return 'text-blue-400';
    default:
      return 'text-blue-400';
  }
}

function severityBorder(severity: string): string {
  switch (severity) {
    case 'CRITICAL':
    case 'ERROR':
    case 'error':
      return 'border-l-2 border-red-500';
    case 'WARNING':
    case 'warning':
      return 'border-l-2 border-amber-500';
    case 'SUGGESTION':
      return 'border-l-2 border-blue-400';
    default:
      return 'border-l-2 border-blue-400';
  }
}

function gradeColor(grade: string): string {
  switch (grade) {
    case 'A+':
    case 'A':
      return 'text-emerald-400';
    case 'B':
      return 'text-green-400';
    case 'C':
      return 'text-amber-400';
    case 'D':
      return 'text-orange-400';
    default:
      return 'text-red-400';
  }
}

function gradeBg(grade: string): string {
  switch (grade) {
    case 'A+':
    case 'A':
      return 'bg-emerald-500/20';
    case 'B':
      return 'bg-green-500/20';
    case 'C':
      return 'bg-amber-500/20';
    case 'D':
      return 'bg-orange-500/20';
    default:
      return 'bg-red-500/20';
  }
}

function difficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'BEGINNER':
      return 'text-emerald-400 bg-emerald-500/20';
    case 'INTERMEDIATE':
      return 'text-amber-400 bg-amber-500/20';
    case 'ADVANCED':
      return 'text-red-400 bg-red-500/20';
    default:
      return 'text-blue-400 bg-blue-500/20';
  }
}

function progressBarColor(percent: number): string {
  if (percent >= 80) return 'bg-emerald-500';
  if (percent >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

// ─── Component ──────────────────────────────────────────────────

export function CircuitValidationPanel({
  runtime,
  activeGraphId,
}: CircuitValidationPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [showIssues, setShowIssues] = useState(true);
  const [showConflicts, setShowConflicts] = useState(true);
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // ─── Compute validation state from runtime ──────────────────
  const {
    health,
    issues: legacyIssues,
    conflicts,
    diagnosticIssues,
    recommendations,
    learningHints,
    blocklyDiagnostics,
    readiness,
    healthScore,
    healthGrade,
  } = useMemo(() => {
    const defaultHealth: HealthSummary = {
      readinessPercent: 0,
      errorCount: 0,
      warningCount: 0,
      healthGrade: 'F',
      totalComponents: 0,
      totalWires: 0,
      totalNets: 0,
      disconnectedComponents: [],
      unmappedGpios: [],
    };
    const defaultIssues: ValidationIssue[] = [];
    const defaultConflicts: GpioConflict[] = [];
    const defaultDiagIssues: DiagnosticIssue[] = [];
    const defaultRecs: DiagnosticRecommendation[] = [];
    const defaultHints: DiagnosticHint[] = [];
    const defaultBlockly: BlocklyDiag[] = [];
    const defaultReadiness: DiagnosticReadiness | null = null;

    if (!runtime) {
      return {
        health: defaultHealth,
        issues: defaultIssues,
        conflicts: defaultConflicts,
        diagnosticIssues: defaultDiagIssues,
        recommendations: defaultRecs,
        learningHints: defaultHints,
        blocklyDiagnostics: defaultBlockly,
        readiness: defaultReadiness,
        healthScore: 0,
        healthGrade: 'F',
      };
    }

    const circuitSync = runtime.circuitGraphSynchronizer;
    const gpioSync = runtime.gpioOwnershipSynchronizer;
    const diagSync = runtime.circuitDiagnosticsSynchronizer;

    // ── Phase 28B data ─────────────────────────────────────────
    let parsedHealth = defaultHealth;
    const parsedIssues: ValidationIssue[] = [];
    const parsedConflicts: GpioConflict[] = [];

    if (circuitSync) {
      let graphId = activeGraphId || '';
      if (!graphId) {
        const graphKeys = circuitSync.getCircuitGraphKeys?.() || [];
        graphId = graphKeys.length > 0 ? graphKeys[graphKeys.length - 1] : '';
      }

      if (graphId) {
        const warnings = circuitSync.validateCircuitGraphById?.(graphId) || [];
        for (const w of warnings) {
          let severity: 'error' | 'warning' | 'info' = 'warning';
          if (w.code === 'SHORT_CIRCUIT') severity = 'error';
          else if (w.code === 'FLOATING_PIN') severity = 'info';
          parsedIssues.push({ code: w.code, message: w.message, severity });
        }

        if (circuitSync.calculateProjectHealth) {
          const mappedGpios: number[] = [];
          const allMappings = circuitSync.getAllCircuitMappings?.() || [];
          for (const m of allMappings) {
            if (m.gpioNumber >= 0) mappedGpios.push(m.gpioNumber);
          }
          const h = circuitSync.calculateProjectHealth(graphId, mappedGpios, true);
          if (h) {
            parsedHealth = {
              readinessPercent: h.readinessPercent ?? 0,
              errorCount: h.errorCount ?? 0,
              warningCount: h.warningCount ?? 0,
              healthGrade: h.healthGrade ?? 'F',
              totalComponents: h.totalComponents ?? 0,
              totalWires: h.totalWires ?? 0,
              totalNets: h.totalNets ?? 0,
              disconnectedComponents: h.disconnectedComponents ?? [],
              unmappedGpios: h.unmappedGpios ?? [],
            };
          }
        }
      }
    }

    if (gpioSync) {
      const allConflicts = gpioSync.getAllConflicts?.() || [];
      for (const c of allConflicts) {
        parsedConflicts.push({
          conflictId: c.conflictId,
          gpioNumber: c.gpioNumber,
          conflictType: c.conflictType,
          severity: c.severity,
          description: c.description,
        });
      }
    }

    // ── Phase 29A diagnostic data ──────────────────────────────
    let diagIssues: DiagnosticIssue[] = defaultDiagIssues;
    let recs: DiagnosticRecommendation[] = defaultRecs;
    let hints: DiagnosticHint[] = defaultHints;
    let blockly: BlocklyDiag[] = defaultBlockly;
    let rdy: DiagnosticReadiness | null = defaultReadiness;
    let hScore = 0;
    let hGrade = 'F';

    if (diagSync) {
      const snapshot = diagSync.getSnapshot?.();
      if (snapshot) {
        diagIssues = (snapshot.issues || []).map((i: DiagnosticIssue) => ({
          issueId: i.issueId || '',
          code: i.code || '',
          severity: i.severity || 'INFO',
          category: i.category || 'ELECTRICAL',
          componentId: i.componentId || '',
          pinName: i.pinName || '',
          gpioNumber: i.gpioNumber ?? -1,
          title: i.title || '',
          message: i.message || '',
          whyWrong: i.whyWrong || '',
          howToFix: i.howToFix || '',
          expectedOutcome: i.expectedOutcome || '',
          highlightColor: i.highlightColor || 'YELLOW',
          affectedIds: i.affectedIds || [],
        }));

        recs = (snapshot.recommendations || []).map((r: DiagnosticRecommendation) => ({
          recommendationId: r.recommendationId || '',
          issueId: r.issueId || '',
          title: r.title || '',
          description: r.description || '',
          actionType: r.actionType || '',
          targetComponentId: r.targetComponentId || '',
          isAutoFixable: r.isAutoFixable ?? false,
        }));

        hints = (snapshot.learningHints || []).map((h: DiagnosticHint) => ({
          hintId: h.hintId || '',
          componentType: h.componentType || '',
          difficulty: h.difficulty || 'BEGINNER',
          title: h.title || '',
          explanation: h.explanation || '',
          example: h.example || '',
          relatedConcept: h.relatedConcept || '',
        }));

        blockly = (snapshot.blocklyDiagnostics || []).map((b: BlocklyDiag) => ({
          diagnosticId: b.diagnosticId || '',
          code: b.code || '',
          severity: b.severity || 'INFO',
          blockId: b.blockId || '',
          gpioNumber: b.gpioNumber ?? -1,
          title: b.title || '',
          message: b.message || '',
          howToFix: b.howToFix || '',
        }));

        if (snapshot.projectReadiness) {
          const pr = snapshot.projectReadiness;
          rdy = {
            hardwarePercent: pr.hardwarePercent ?? 0,
            codePercent: pr.codePercent ?? 0,
            electricalPercent: pr.electricalPercent ?? 0,
            simulationPercent: pr.simulationPercent ?? 0,
            overallPercent: pr.overallPercent ?? 0,
            criticalIssues: pr.criticalIssues || [],
            notReadyReasons: pr.notReadyReasons || [],
            isReady: pr.isReady ?? false,
          };
        }

        hScore = snapshot.healthScore ?? 0;
        hGrade = snapshot.healthGrade || 'F';
      }
    }

    // Override health grade with Phase 29A data if available
    if (diagSync && hGrade) {
      parsedHealth.healthGrade = hGrade;
    }

    return {
      health: parsedHealth,
      issues: parsedIssues,
      conflicts: parsedConflicts,
      diagnosticIssues: diagIssues,
      recommendations: recs,
      learningHints: hints,
      blocklyDiagnostics: blockly,
      readiness: rdy,
      healthScore: hScore,
      healthGrade: hGrade,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, activeGraphId, refreshKey]);

  // ─── Derived counts ─────────────────────────────────────────
  const errorCount = diagnosticIssues.filter((i) => i.severity === 'ERROR').length;
  const warningCount = diagnosticIssues.filter((i) => i.severity === 'WARNING').length;
  const suggestionCount = diagnosticIssues.filter((i) => i.severity === 'SUGGESTION').length + blocklyDiagnostics.length;
  const displayGrade = healthGrade || health.healthGrade;

  // ─── Filtered issues by category ────────────────────────────
  const filteredIssues = useMemo(() => {
    if (categoryFilter === 'ALL') return diagnosticIssues;
    return diagnosticIssues.filter((i) => i.category === categoryFilter);
  }, [diagnosticIssues, categoryFilter]);

  const filteredByTab = useMemo(() => {
    switch (activeTab) {
      case 'errors':
        return filteredIssues.filter((i) => i.severity === 'ERROR');
      case 'warnings':
        return filteredIssues.filter((i) => i.severity === 'WARNING');
      case 'suggestions':
        return filteredIssues.filter((i) => i.severity === 'SUGGESTION' || i.severity === 'INFO');
      default:
        return filteredIssues;
    }
  }, [filteredIssues, activeTab]);

  // ─── Collapsed State ────────────────────────────────────────
  if (!expanded) {
    return (
      <div className="rounded-lg border border-border bg-card p-3">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setExpanded(true)}
        >
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Circuit Health</h3>
          </div>
          <div className="flex items-center gap-2">
            {errorCount > 0 && (
              <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-400 font-medium">
                {errorCount}
              </span>
            )}
            {warningCount > 0 && (
              <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-400 font-medium">
                {warningCount}
              </span>
            )}
            <span className={`text-lg font-bold ${gradeColor(displayGrade)}`}>
              {displayGrade}
            </span>
            <ChevronRight className="h-4 w-4 text-muted" />
          </div>
        </button>
      </div>
    );
  }

  const hasErrors = errorCount > 0 || health.errorCount > 0 || legacyIssues.some((i) => i.severity === 'error');
  const hasWarnings = warningCount > 0 || health.warningCount > 0 || legacyIssues.some((i) => i.severity === 'warning');

  // ─── Expanded State ─────────────────────────────────────────
  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="flex items-center gap-2 text-left"
          onClick={() => setExpanded(false)}
        >
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Circuit Health</h3>
          <ChevronDown className="h-3 w-3 text-muted" />
        </button>
        <button
          type="button"
          className="rounded p-1 hover:bg-muted/20 transition-colors"
          onClick={refresh}
          title="Refresh validation"
        >
          <RefreshCw className="h-3.5 w-3.5 text-muted" />
        </button>
      </div>

      {/* Health Grade + Score */}
      <div className="flex items-center gap-3">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-lg ${gradeBg(displayGrade)}`}
        >
          <span className={`text-2xl font-bold ${gradeColor(displayGrade)}`}>
            {displayGrade}
          </span>
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">Health Score</span>
            <span className="text-xs font-medium">{healthScore || health.readinessPercent}/100</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted/20">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${progressBarColor(healthScore || health.readinessPercent)}`}
              style={{ width: `${Math.min(100, healthScore || health.readinessPercent)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md bg-muted/10 px-2 py-1.5">
          <Cpu className="mx-auto h-3.5 w-3.5 text-blue-400 mb-0.5" />
          <span className="text-xs font-medium">{health.totalComponents}</span>
          <span className="block text-[10px] text-muted">Components</span>
        </div>
        <div className="rounded-md bg-muted/10 px-2 py-1.5">
          <Zap className="mx-auto h-3.5 w-3.5 text-amber-400 mb-0.5" />
          <span className="text-xs font-medium">{health.totalWires}</span>
          <span className="block text-[10px] text-muted">Wires</span>
        </div>
        <div className="rounded-md bg-muted/10 px-2 py-1.5">
          <Activity className="mx-auto h-3.5 w-3.5 text-emerald-400 mb-0.5" />
          <span className="text-xs font-medium">{health.totalNets}</span>
          <span className="block text-[10px] text-muted">Nets</span>
        </div>
      </div>

      {/* ═══ Phase 29A: Tab Bar ═══════════════════════════════════ */}
      <div className="flex gap-0.5 rounded-md bg-muted/10 p-0.5">
        {TABS.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          let badge = 0;
          if (tab.id === 'errors') badge = errorCount;
          else if (tab.id === 'warnings') badge = warningCount;
          else if (tab.id === 'suggestions') badge = suggestionCount;
          else if (tab.id === 'learning') badge = learningHints.length;

          return (
            <button
              key={tab.id}
              type="button"
              className={`flex-1 flex items-center justify-center gap-1 rounded px-1.5 py-1 text-[10px] font-medium transition-colors ${
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted hover:text-foreground/70'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <TabIcon className="h-3 w-3" />
              <span className="hidden sm:inline">{tab.label}</span>
              {badge > 0 && (
                <span className={`ml-0.5 rounded-full px-1 text-[9px] font-bold ${
                  tab.id === 'errors' ? 'bg-red-500/20 text-red-400' :
                  tab.id === 'warnings' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ═══ Category Filter ═════════════════════════════════════ */}
      {(activeTab === 'errors' || activeTab === 'warnings' || activeTab === 'suggestions') && (
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                categoryFilter === cat.id
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted/10 text-muted hover:text-foreground/70'
              }`}
              onClick={() => setCategoryFilter(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* ═══ Tab Content ═════════════════════════════════════════ */}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-3">
          {/* Status Summary */}
          {!hasErrors && !hasWarnings && health.totalComponents > 0 && (
            <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-emerald-300">All checks passed</span>
            </div>
          )}
          {hasErrors && (
            <div className="flex items-center gap-2 rounded-md bg-red-500/10 px-3 py-2">
              <XCircle className="h-4 w-4 text-red-400" />
              <span className="text-xs text-red-300">
                {errorCount || health.errorCount} error{(errorCount || health.errorCount) !== 1 ? 's' : ''} found
              </span>
            </div>
          )}
          {hasWarnings && !hasErrors && (
            <div className="flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-amber-300">
                {warningCount || health.warningCount} warning{(warningCount || health.warningCount) !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Project Readiness (Phase 29A) */}
          {readiness && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium">Project Readiness</span>
                {readiness.isReady && (
                  <CheckCircle2 className="h-3 w-3 text-emerald-400 ml-auto" />
                )}
              </div>
              {[
                { label: 'Hardware', value: readiness.hardwarePercent },
                { label: 'Code', value: readiness.codePercent },
                { label: 'Electrical', value: readiness.electricalPercent },
                { label: 'Simulation', value: readiness.simulationPercent },
              ].map((dim) => (
                <div key={dim.label} className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted">{dim.label}</span>
                    <span className="text-[10px] font-medium">{dim.value}%</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-muted/20">
                    <div
                      className={`h-1 rounded-full transition-all duration-500 ${progressBarColor(dim.value)}`}
                      style={{ width: `${Math.min(100, dim.value)}%` }}
                    />
                  </div>
                </div>
              ))}
              {readiness.criticalIssues.length > 0 && (
                <div className="mt-1">
                  {readiness.criticalIssues.map((ci, idx) => (
                    <div key={idx} className="flex items-start gap-1 text-[10px] text-red-400">
                      <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>{ci}</span>
                    </div>
                  ))}
                </div>
              )}
              {readiness.notReadyReasons.length > 0 && (
                <div className="mt-1">
                  {readiness.notReadyReasons.map((nr, idx) => (
                    <div key={idx} className="flex items-start gap-1 text-[10px] text-amber-400">
                      <Info className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>{nr}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Legacy Validation Issues */}
          {legacyIssues.length > 0 && (
            <div>
              <button
                type="button"
                className="flex w-full items-center gap-1.5 text-left"
                onClick={() => setShowIssues((v) => !v)}
              >
                {showIssues ? (
                  <ChevronDown className="h-3 w-3 text-muted" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted" />
                )}
                <span className="text-xs font-medium">
                  Validation Issues ({legacyIssues.length})
                </span>
              </button>
              {showIssues && (
                <ul className="mt-1.5 max-h-36 space-y-1 overflow-y-auto">
                  {legacyIssues.map((issue, i) => (
                    <li
                      key={`${issue.code}-${i}`}
                      className={`rounded-md bg-background px-2 py-1.5 text-xs ${severityBorder(issue.severity)}`}
                    >
                      <span className={`font-mono text-[10px] ${severityColor(issue.severity)}`}>
                        {issue.code}
                      </span>
                      <p className="text-muted mt-0.5">{issue.message}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* GPIO Conflicts */}
          {conflicts.length > 0 && (
            <div>
              <button
                type="button"
                className="flex w-full items-center gap-1.5 text-left"
                onClick={() => setShowConflicts((v) => !v)}
              >
                {showConflicts ? (
                  <ChevronDown className="h-3 w-3 text-muted" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted" />
                )}
                <span className="text-xs font-medium">
                  GPIO Conflicts ({conflicts.length})
                </span>
              </button>
              {showConflicts && (
                <ul className="mt-1.5 max-h-36 space-y-1 overflow-y-auto">
                  {conflicts.map((c) => (
                    <li
                      key={c.conflictId}
                      className={`rounded-md bg-background px-2 py-1.5 text-xs ${severityBorder(c.severity)}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono text-[10px] ${severityColor(c.severity)}`}>
                          GPIO {c.gpioNumber}
                        </span>
                        <span className="text-[10px] text-muted">•</span>
                        <span className="text-[10px] text-muted">{c.conflictType}</span>
                      </div>
                      <p className="text-muted mt-0.5">{c.description}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Disconnected Components */}
          {health.disconnectedComponents.length > 0 && (
            <div className="rounded-md bg-amber-500/10 px-3 py-2">
              <span className="text-[10px] font-medium text-amber-400 uppercase tracking-wide">
                Disconnected
              </span>
              <div className="mt-1 flex flex-wrap gap-1">
                {health.disconnectedComponents.map((c) => (
                  <span
                    key={c}
                    className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300 font-mono"
                  >
                  {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Unmapped GPIOs */}
          {health.unmappedGpios.length > 0 && (
            <div className="rounded-md bg-blue-500/10 px-3 py-2">
              <span className="text-[10px] font-medium text-blue-400 uppercase tracking-wide">
                Unmapped GPIOs
              </span>
              <div className="mt-1 flex flex-wrap gap-1">
                {health.unmappedGpios.map((g) => (
                  <span
                    key={g}
                    className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-300 font-mono"
                  >
                  GPIO {g}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Errors / Warnings / Suggestions Tabs (Phase 29A) */}
      {(activeTab === 'errors' || activeTab === 'warnings' || activeTab === 'suggestions') && (
        <div className="space-y-2">
          {filteredByTab.length === 0 && (
            <div className="py-3 text-center">
              <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-400/40 mb-1" />
              <p className="text-[10px] text-muted">
                {activeTab === 'errors' ? 'No errors found' :
                 activeTab === 'warnings' ? 'No warnings found' :
                 'No suggestions'}
              </p>
            </div>
          )}
          <ul className="max-h-60 space-y-1.5 overflow-y-auto">
            {filteredByTab.map((issue) => {
              const isExpanded = expandedIssueId === issue.issueId;
              const rec = recommendations.find((r) => r.issueId === issue.issueId);

              return (
                <li
                  key={issue.issueId}
                  className={`rounded-md bg-background text-xs transition-all ${severityBorder(issue.severity)}`}
                >
                  <button
                    type="button"
                    className="flex w-full items-start gap-1.5 px-2 py-1.5 text-left"
                    onClick={() => setExpandedIssueId(isExpanded ? null : issue.issueId)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono text-[10px] ${severityColor(issue.severity)}`}>
                          {issue.code}
                        </span>
                        <span className="rounded bg-muted/20 px-1 text-[9px] text-muted">
                          {issue.category}
                        </span>
                      </div>
                      <p className="font-medium mt-0.5">{issue.title}</p>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3 text-muted shrink-0 mt-0.5" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-muted shrink-0 mt-0.5" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-2 pb-2 space-y-1.5">
                      {/* What's wrong */}
                      <div className="rounded bg-muted/5 px-2 py-1">
                        <span className="text-[9px] font-medium text-muted uppercase">What&apos;s wrong</span>
                        <p className="text-[10px] text-foreground/80 mt-0.5">{issue.message}</p>
                      </div>

                      {/* Why it's wrong */}
                      {issue.whyWrong && (
                        <div className="rounded bg-muted/5 px-2 py-1">
                          <span className="text-[9px] font-medium text-muted uppercase">Why it matters</span>
                          <p className="text-[10px] text-foreground/80 mt-0.5">{issue.whyWrong}</p>
                        </div>
                      )}

                      {/* How to fix */}
                      {issue.howToFix && (
                        <div className="rounded bg-emerald-500/5 px-2 py-1">
                          <span className="text-[9px] font-medium text-emerald-400 uppercase">How to fix</span>
                          <p className="text-[10px] text-foreground/80 mt-0.5">{issue.howToFix}</p>
                        </div>
                      )}

                      {/* Expected outcome */}
                      {issue.expectedOutcome && (
                        <div className="rounded bg-blue-500/5 px-2 py-1">
                          <span className="text-[9px] font-medium text-blue-400 uppercase">Expected result</span>
                          <p className="text-[10px] text-foreground/80 mt-0.5">{issue.expectedOutcome}</p>
                        </div>
                      )}

                      {/* Fix suggestion */}
                      {rec && (
                        <div className="flex items-start gap-1.5 rounded bg-primary/5 px-2 py-1.5">
                          <Wrench className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] font-medium text-primary">{rec.title}</span>
                            <p className="text-[10px] text-muted mt-0.5">{rec.description}</p>
                            {rec.isAutoFixable && (
                              <span className="inline-block mt-0.5 rounded bg-emerald-500/20 px-1 text-[9px] text-emerald-400 font-medium">
                                Auto-fixable
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Affected IDs */}
                      {issue.affectedIds.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {issue.affectedIds.slice(0, 5).map((aid) => (
                            <span
                              key={aid}
                              className="rounded bg-muted/20 px-1 py-0.5 text-[9px] font-mono text-muted"
                            >
                              {aid}
                            </span>
                          ))}
                          {issue.affectedIds.length > 5 && (
                            <span className="text-[9px] text-muted">
                              +{issue.affectedIds.length - 5} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Blockly diagnostics in suggestions tab */}
          {activeTab === 'suggestions' && blocklyDiagnostics.length > 0 && (
            <div className="mt-2">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Cpu className="h-3 w-3 text-purple-400" />
                <span className="text-[10px] font-medium text-purple-300">Blockly Code Analysis</span>
              </div>
              <ul className="space-y-1">
                {blocklyDiagnostics.map((bd) => (
                  <li
                    key={bd.diagnosticId}
                    className={`rounded-md bg-background px-2 py-1.5 text-xs ${severityBorder(bd.severity)}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`font-mono text-[10px] ${severityColor(bd.severity)}`}>
                        {bd.code}
                      </span>
                      {bd.gpioNumber >= 0 && (
                        <span className="text-[10px] text-muted">GPIO {bd.gpioNumber}</span>
                      )}
                    </div>
                    <p className="font-medium mt-0.5">{bd.title}</p>
                    <p className="text-muted mt-0.5">{bd.message}</p>
                    {bd.howToFix && (
                      <p className="text-[10px] text-emerald-400/80 mt-0.5">→ {bd.howToFix}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Learning Tab (Phase 29A) */}
      {activeTab === 'learning' && (
        <div className="space-y-2">
          {learningHints.length === 0 && (
            <div className="py-3 text-center">
              <BookOpen className="mx-auto h-5 w-5 text-muted/40 mb-1" />
              <p className="text-[10px] text-muted">No learning hints yet</p>
              <p className="text-[9px] text-muted/60 mt-0.5">
                Build circuits to get educational guidance
              </p>
            </div>
          )}
          <ul className="max-h-60 space-y-2 overflow-y-auto">
            {learningHints.map((hint) => (
              <li
                key={hint.hintId}
                className="rounded-md bg-background px-3 py-2 border-l-2 border-blue-400"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Lightbulb className="h-3 w-3 text-amber-400" />
                  <span className="text-xs font-medium">{hint.title}</span>
                  <span className={`ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-medium ${difficultyColor(hint.difficulty)}`}>
                    {hint.difficulty}
                  </span>
                </div>
                {hint.componentType && (
                  <span className="inline-block rounded bg-purple-500/20 px-1 py-0.5 text-[9px] text-purple-400 font-mono mb-1">
                    {hint.componentType}
                  </span>
                )}
                <p className="text-[10px] text-foreground/80">{hint.explanation}</p>
                {hint.example && (
                  <div className="mt-1.5 rounded bg-muted/10 px-2 py-1">
                    <span className="text-[9px] font-medium text-muted uppercase">Example</span>
                    <p className="text-[10px] text-foreground/70 mt-0.5">{hint.example}</p>
                  </div>
                )}
                {hint.relatedConcept && (
                  <div className="mt-1 flex items-center gap-1">
                    <BookOpen className="h-2.5 w-2.5 text-muted" />
                    <span className="text-[9px] text-muted">Related: {hint.relatedConcept}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Empty State */}
      {health.totalComponents === 0 && legacyIssues.length === 0 && conflicts.length === 0 && diagnosticIssues.length === 0 && (
        <div className="py-2 text-center">
          <Cpu className="mx-auto h-6 w-6 text-muted/40 mb-1" />
          <p className="text-xs text-muted">No circuit data yet</p>
          <p className="text-[10px] text-muted/60 mt-0.5">
            Place components and wires to see validation
          </p>
        </div>
      )}
    </div>
  );
}
