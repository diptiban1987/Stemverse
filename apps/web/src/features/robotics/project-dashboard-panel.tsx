'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  LayoutDashboard,
  HeartPulse,
  History,
  BarChart3,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Cpu,
  Zap,
  Cable,
  Gauge,
  Clock,
  RotateCcw,
  GitCompare,
  Save,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  Timer,
  Layers,
  CircuitBoard,
  Blocks,
  Play,
  FileCheck,
  Undo2,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// Phase 30A: Project Dashboard Panel
// Provides project overview, health monitoring, version history,
// and comprehensive statistics for a selected project.
// Follows the same component structure as CircuitWizardPanel.
// ═══════════════════════════════════════════════════════════════

export interface ProjectDashboardPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runtime: any;
  projectId?: string;
}

// ─── Tab & Filter Types ─────────────────────────────────────────

type DashboardTabId = 'overview' | 'health' | 'history' | 'statistics';

// ─── Internal Interfaces ────────────────────────────────────────

interface ProjectInfo {
  projectId: string;
  name: string;
  description: string;
  status: string;
  folderId: string;
  tags: string[];
  createdAt: number;
  modifiedAt: number;
  isFavorite: boolean;
  isPinned: boolean;
  complexity: number;
  healthScore: number;
}

interface MetadataInfo {
  metadataId: string;
  projectId: string;
  componentCount: number;
  wireCount: number;
  sensorCount: number;
  blocklyBlockCount: number;
  simulationRuns: number;
  lastHealthScore: number;
  estimatedComplexity: number;
}

interface VersionInfo {
  versionId: string;
  projectId: string;
  versionNumber: number;
  label: string;
  action: string;
  changeSummary: string;
  createdAt: number;
  sizeBytes: number;
}

interface AutoSaveInfo {
  entryId: string;
  projectId: string;
  savedAt: number;
  isDirty: boolean;
  sizeBytes: number;
}

interface StatisticsInfo {
  statisticsId: string;
  projectId: string;
  componentCount: number;
  wireCount: number;
  sensorCount: number;
  runtimeCount: number;
  healthScore: number;
  simulationRuns: number;
  lastModifiedAt: number;
  complexity: number;
  totalBuildTimeMinutes: number;
}

// ─── Tab Definitions ────────────────────────────────────────────

const DASHBOARD_TABS: { id: DashboardTabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'health', label: 'Health', icon: HeartPulse },
  { id: 'history', label: 'History', icon: History },
  { id: 'statistics', label: 'Statistics', icon: BarChart3 },
];

// ─── Utility Functions ──────────────────────────────────────────

function statusColor(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'text-emerald-400 bg-emerald-500/20';
    case 'ARCHIVED':
      return 'text-amber-400 bg-amber-500/20';
    case 'DELETED':
      return 'text-red-400 bg-red-500/20';
    case 'TEMPLATE':
      return 'text-blue-400 bg-blue-500/20';
    default:
      return 'text-slate-400 bg-slate-500/20';
  }
}

function healthScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-lime-400';
  if (score >= 40) return 'text-amber-400';
  if (score >= 20) return 'text-orange-400';
  return 'text-red-400';
}

function healthBarGradient(score: number): string {
  if (score >= 80) return 'from-emerald-500 to-emerald-400';
  if (score >= 60) return 'from-lime-500 to-lime-400';
  if (score >= 40) return 'from-amber-500 to-amber-400';
  if (score >= 20) return 'from-orange-500 to-orange-400';
  return 'from-red-500 to-red-400';
}

function healthLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  if (score >= 20) return 'Poor';
  return 'Critical';
}

function complexityLabel(score: number): string {
  if (score >= 80) return 'Very Complex';
  if (score >= 60) return 'Complex';
  if (score >= 40) return 'Moderate';
  if (score >= 20) return 'Simple';
  return 'Trivial';
}

function complexityColor(score: number): string {
  if (score >= 80) return 'text-red-400 bg-red-500/20';
  if (score >= 60) return 'text-orange-400 bg-orange-500/20';
  if (score >= 40) return 'text-amber-400 bg-amber-500/20';
  if (score >= 20) return 'text-lime-400 bg-lime-500/20';
  return 'text-emerald-400 bg-emerald-500/20';
}

function actionColor(action: string): string {
  switch (action) {
    case 'SAVE':
      return 'text-blue-400 bg-blue-500/20';
    case 'AUTO_SAVE':
      return 'text-slate-400 bg-slate-500/20';
    case 'CHECKPOINT':
      return 'text-purple-400 bg-purple-500/20';
    case 'ROLLBACK':
      return 'text-amber-400 bg-amber-500/20';
    case 'IMPORT':
      return 'text-emerald-400 bg-emerald-500/20';
    default:
      return 'text-slate-400 bg-slate-500/20';
  }
}

function actionIcon(action: string) {
  switch (action) {
    case 'SAVE':
      return Save;
    case 'AUTO_SAVE':
      return Timer;
    case 'CHECKPOINT':
      return FileCheck;
    case 'ROLLBACK':
      return Undo2;
    case 'IMPORT':
      return Layers;
    default:
      return Save;
  }
}

function formatTimestamp(ts: number): string {
  if (!ts) return '—';
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return 'Just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  if (diff < 604800_000) return `${Math.floor(diff / 86400_000)}d ago`;
  return d.toLocaleDateString();
}

function formatFullDate(ts: number): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString();
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function trendIcon(current: number, previous: number) {
  if (current > previous) return TrendingUp;
  if (current < previous) return TrendingDown;
  return Minus;
}

function trendColor(current: number, previous: number, higherIsBetter: boolean): string {
  if (current === previous) return 'text-slate-400';
  if (higherIsBetter) {
    return current > previous ? 'text-emerald-400' : 'text-red-400';
  }
  return current < previous ? 'text-emerald-400' : 'text-red-400';
}

// ─── Component ──────────────────────────────────────────────────

export function ProjectDashboardPanel({ runtime, projectId }: ProjectDashboardPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<DashboardTabId>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [compareVersionId, setCompareVersionId] = useState<string | null>(null);
  const [comparisonResult, setComparisonResult] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // ─── Compute data from runtime ────────────────────────────────

  const project = useMemo(() => {
    const defaultProject: ProjectInfo | null = null;
    if (!runtime?.projectLibrarySynchronizer || !projectId) return defaultProject;

    try {
      const p = runtime.projectLibrarySynchronizer.getProject?.(projectId);
      if (!p) return defaultProject;
      return {
        projectId: p.projectId || '',
        name: p.name || 'Untitled',
        description: p.description || '',
        status: p.status || 'ACTIVE',
        folderId: p.folderId || '',
        tags: p.tags || [],
        createdAt: p.createdAt ?? 0,
        modifiedAt: p.modifiedAt ?? 0,
        isFavorite: p.isFavorite ?? false,
        isPinned: p.isPinned ?? false,
        complexity: p.complexity ?? 0,
        healthScore: p.healthScore ?? 0,
      } as ProjectInfo;
    } catch {
      return defaultProject;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, projectId, refreshKey]);

  const metadata = useMemo(() => {
    const defaultMeta: MetadataInfo | null = null;
    if (!runtime?.projectLibrarySynchronizer || !projectId) return defaultMeta;

    try {
      const allMetadata = runtime.projectLibrarySynchronizer.getAllMetadata?.() || [];
      const m = allMetadata.find((md: MetadataInfo) => md.projectId === projectId);
      if (!m) return defaultMeta;
      return {
        metadataId: m.metadataId || '',
        projectId: m.projectId || '',
        componentCount: m.componentCount ?? 0,
        wireCount: m.wireCount ?? 0,
        sensorCount: m.sensorCount ?? 0,
        blocklyBlockCount: m.blocklyBlockCount ?? 0,
        simulationRuns: m.simulationRuns ?? 0,
        lastHealthScore: m.lastHealthScore ?? 0,
        estimatedComplexity: m.estimatedComplexity ?? 0,
      } as MetadataInfo;
    } catch {
      return defaultMeta;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, projectId, refreshKey]);

  const versionHistory = useMemo(() => {
    const defaultVersions: VersionInfo[] = [];
    if (!runtime?.projectVersionSynchronizer || !projectId) return defaultVersions;

    try {
      const versions = runtime.projectVersionSynchronizer.getVersionHistory?.(projectId) || [];
      return versions.map((v: VersionInfo) => ({
        versionId: v.versionId || '',
        projectId: v.projectId || '',
        versionNumber: v.versionNumber ?? 0,
        label: v.label || `Version ${v.versionNumber ?? 0}`,
        action: v.action || 'SAVE',
        changeSummary: v.changeSummary || '',
        createdAt: v.createdAt ?? 0,
        sizeBytes: v.sizeBytes ?? 0,
      }));
    } catch {
      return defaultVersions;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, projectId, refreshKey]);

  const latestVersion = useMemo(() => {
    if (!runtime?.projectVersionSynchronizer || !projectId) return null;
    try {
      return runtime.projectVersionSynchronizer.getLatestVersion?.(projectId) || null;
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, projectId, refreshKey]);

  const autoSaves = useMemo(() => {
    const defaultEntries: AutoSaveInfo[] = [];
    if (!runtime?.autoSaveSynchronizer || !projectId) return defaultEntries;

    try {
      const entries = runtime.autoSaveSynchronizer.getRecoverySnapshots?.(projectId) || [];
      return entries.map((e: AutoSaveInfo) => ({
        entryId: e.entryId || '',
        projectId: e.projectId || '',
        savedAt: e.savedAt ?? 0,
        isDirty: e.isDirty ?? false,
        sizeBytes: e.sizeBytes ?? 0,
      }));
    } catch {
      return defaultEntries;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, projectId, refreshKey]);

  const statistics = useMemo(() => {
    const defaultStats: StatisticsInfo | null = null;
    if (!runtime?.projectThumbnailSynchronizer || !projectId) return defaultStats;

    try {
      const s = runtime.projectThumbnailSynchronizer.getStatisticsForProject?.(projectId);
      if (!s) return defaultStats;
      return {
        statisticsId: s.statisticsId || '',
        projectId: s.projectId || '',
        componentCount: s.componentCount ?? 0,
        wireCount: s.wireCount ?? 0,
        sensorCount: s.sensorCount ?? 0,
        runtimeCount: s.runtimeCount ?? 0,
        healthScore: s.healthScore ?? 0,
        simulationRuns: s.simulationRuns ?? 0,
        lastModifiedAt: s.lastModifiedAt ?? 0,
        complexity: s.complexity ?? 0,
        totalBuildTimeMinutes: s.totalBuildTimeMinutes ?? 0,
      } as StatisticsInfo;
    } catch {
      return defaultStats;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, projectId, refreshKey]);

  const isDirty = useMemo(() => {
    if (!runtime?.autoSaveSynchronizer || !projectId) return false;
    try {
      return runtime.autoSaveSynchronizer.isDirty?.(projectId) ?? false;
    } catch {
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, projectId, refreshKey]);

  const totalVersionsSize = useMemo(() => {
    return versionHistory.reduce((sum: number, v: VersionInfo) => sum + v.sizeBytes, 0);
  }, [versionHistory]);

  // ─── Action Handlers ──────────────────────────────────────────

  const handleSaveVersion = useCallback(() => {
    if (!runtime?.projectVersionSynchronizer || !projectId) return;
    setIsLoading(true);
    try {
      runtime.projectVersionSynchronizer.saveVersion?.(projectId, '{}', undefined, 'SAVE');
      showToast('Version saved');
    } catch {
      showToast('Failed to save version');
    } finally {
      setIsLoading(false);
      refresh();
    }
  }, [runtime, projectId, showToast, refresh]);

  const handleCheckpoint = useCallback(() => {
    if (!runtime?.projectVersionSynchronizer || !projectId) return;
    setIsLoading(true);
    try {
      runtime.projectVersionSynchronizer.autoCheckpoint?.(projectId, '{}');
      showToast('Checkpoint created');
    } catch {
      showToast('Failed to create checkpoint');
    } finally {
      setIsLoading(false);
      refresh();
    }
  }, [runtime, projectId, showToast, refresh]);

  const handleRestoreVersion = useCallback(
    (versionId: string) => {
      if (!runtime?.projectVersionSynchronizer) return;
      setIsLoading(true);
      try {
        const snapshot = runtime.projectVersionSynchronizer.restoreVersion?.(versionId);
        if (snapshot !== null && snapshot !== undefined) {
          showToast('Version restored');
        } else {
          showToast('Version not found');
        }
      } catch {
        showToast('Failed to restore version');
      } finally {
        setIsLoading(false);
        refresh();
      }
    },
    [runtime, showToast, refresh],
  );

  const handleRollback = useCallback(
    (versionId: string) => {
      if (!runtime?.projectVersionSynchronizer || !projectId) return;
      setIsLoading(true);
      try {
        runtime.projectVersionSynchronizer.rollbackToVersion?.(projectId, versionId);
        showToast('Rolled back to selected version');
      } catch {
        showToast('Rollback failed');
      } finally {
        setIsLoading(false);
        refresh();
      }
    },
    [runtime, projectId, showToast, refresh],
  );

  const handleCompareVersions = useCallback(() => {
    if (!runtime?.projectVersionSynchronizer || !selectedVersionId || !compareVersionId) return;
    try {
      const result = runtime.projectVersionSynchronizer.compareVersions?.(
        selectedVersionId,
        compareVersionId,
      );
      setComparisonResult(result || 'No differences detected');
      showToast('Versions compared');
    } catch {
      showToast('Failed to compare versions');
    }
  }, [runtime, selectedVersionId, compareVersionId, showToast]);

  const handleRecoverFromCrash = useCallback(() => {
    if (!runtime?.autoSaveSynchronizer || !projectId) return;
    setIsLoading(true);
    try {
      const entry = runtime.autoSaveSynchronizer.recoverFromCrash?.(projectId);
      if (entry) {
        showToast('Recovery snapshot loaded');
      } else {
        showToast('No recovery data found');
      }
    } catch {
      showToast('Recovery failed');
    } finally {
      setIsLoading(false);
      refresh();
    }
  }, [runtime, projectId, showToast, refresh]);

  const handlePruneVersions = useCallback(
    (keepCount: number) => {
      if (!runtime?.projectVersionSynchronizer || !projectId) return;
      setIsLoading(true);
      try {
        const removed = runtime.projectVersionSynchronizer.pruneVersions?.(projectId, keepCount);
        showToast(`Pruned ${removed ?? 0} old version(s)`);
      } catch {
        showToast('Failed to prune versions');
      } finally {
        setIsLoading(false);
        refresh();
      }
    },
    [runtime, projectId, showToast, refresh],
  );

  // ─── No Project Selected ─────────────────────────────────────

  if (!projectId) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/95 p-4">
        <div className="flex items-center gap-2 text-slate-400">
          <LayoutDashboard size={16} />
          <span className="text-sm">Select a project to view its dashboard</span>
        </div>
      </div>
    );
  }

  // ─── Render: Overview Tab ─────────────────────────────────────

  const renderOverviewTab = () => (
    <div className="space-y-3">
      {/* Project Info Card */}
      <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-white">{project?.name || 'Unknown Project'}</h4>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${statusColor(project?.status || 'ACTIVE')}`}>
                {project?.status || 'ACTIVE'}
              </span>
              {isDirty && (
                <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                  Unsaved
                </span>
              )}
            </div>
            {project?.description && (
              <p className="mt-1 text-xs text-slate-400">{project.description}</p>
            )}
          </div>
        </div>

        {/* Timestamps */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Clock size={11} />
            <span>Created: {formatFullDate(project?.createdAt || 0)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Clock size={11} />
            <span>Modified: {formatTimestamp(project?.modifiedAt || 0)}</span>
          </div>
        </div>

        {/* Tags */}
        {project?.tags && project.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {project.tags.map((tag, i) => (
              <span key={i} className="rounded-full bg-slate-700/50 px-1.5 py-0.5 text-[10px] text-slate-300">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-2 text-center">
          <Gauge size={16} className={`mx-auto mb-1 ${healthScoreColor(project?.healthScore || 0)}`} />
          <span className={`text-lg font-bold ${healthScoreColor(project?.healthScore || 0)}`}>
            {project?.healthScore || 0}
          </span>
          <span className="block text-[10px] text-slate-500">Health</span>
        </div>
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-2 text-center">
          <Cpu size={16} className="mx-auto mb-1 text-blue-400" />
          <span className="text-lg font-bold text-white">{metadata?.componentCount || 0}</span>
          <span className="block text-[10px] text-slate-500">Components</span>
        </div>
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-2 text-center">
          <Cable size={16} className="mx-auto mb-1 text-amber-400" />
          <span className="text-lg font-bold text-white">{metadata?.wireCount || 0}</span>
          <span className="block text-[10px] text-slate-500">Wires</span>
        </div>
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-2 text-center">
          <History size={16} className="mx-auto mb-1 text-purple-400" />
          <span className="text-lg font-bold text-white">{versionHistory.length}</span>
          <span className="block text-[10px] text-slate-500">Versions</span>
        </div>
      </div>

      {/* Complexity & Latest Version */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400">Complexity</span>
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${complexityColor(project?.complexity || 0)}`}>
              {complexityLabel(project?.complexity || 0)}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-700">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${healthBarGradient(100 - (project?.complexity || 0))}`}
              style={{ width: `${Math.min(project?.complexity || 0, 100)}%` }}
            />
          </div>
        </div>
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400">Latest Version</span>
            {latestVersion && (
              <span className="text-[10px] text-white font-medium">
                v{latestVersion.versionNumber}
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-[10px] text-slate-500">
            {latestVersion?.label || 'No versions saved yet'}
          </p>
        </div>
      </div>

      {/* Auto-Save Status */}
      <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Timer size={12} className="text-slate-400" />
            <span className="text-[10px] text-slate-400">Auto-Save</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-300">
              {autoSaves.length} snapshot{autoSaves.length !== 1 ? 's' : ''}
            </span>
            {isDirty && (
              <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                <AlertTriangle size={10} /> Unsaved changes
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Render: Health Tab ───────────────────────────────────────

  const renderHealthTab = () => {
    const score = project?.healthScore || statistics?.healthScore || 0;
    const scoreDeg = (score / 100) * 180;

    return (
      <div className="space-y-3">
        {/* Health Score Gauge */}
        <div className="flex flex-col items-center rounded-lg border border-slate-700/50 bg-slate-800/50 p-4">
          <div className="relative mb-2 h-20 w-40 overflow-hidden">
            {/* Gauge Background */}
            <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full border-8 border-slate-700"
                 style={{ clipPath: 'inset(0 0 50% 0)' }} />
            {/* Gauge Fill */}
            <div
              className={`absolute bottom-0 left-0 h-40 w-40 rounded-full border-8 border-transparent`}
              style={{
                clipPath: 'inset(0 0 50% 0)',
                borderTopColor: score >= 60 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444',
                borderRightColor: score >= 60 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444',
                transform: `rotate(${scoreDeg - 180}deg)`,
                transformOrigin: 'center center',
              }}
            />
            {/* Score Label */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
              <span className={`text-2xl font-bold ${healthScoreColor(score)}`}>{score}</span>
              <span className="text-xs text-slate-500">/100</span>
            </div>
          </div>
          <span className={`text-sm font-medium ${healthScoreColor(score)}`}>
            {healthLabel(score)}
          </span>
        </div>

        {/* Health Breakdown */}
        <div className="space-y-2">
          <h4 className="flex items-center gap-1 text-xs font-medium text-slate-300">
            <Activity size={12} /> Health Breakdown
          </h4>

          {/* Component Health */}
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Cpu size={12} className="text-blue-400" />
                <span className="text-xs text-slate-300">Components</span>
              </div>
              <span className="text-xs text-white font-medium">{metadata?.componentCount || 0}</span>
            </div>
            <div className="mt-1.5 h-1 w-full rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400"
                style={{ width: `${Math.min((metadata?.componentCount || 0) * 10, 100)}%` }}
              />
            </div>
          </div>

          {/* Wire Health */}
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Cable size={12} className="text-amber-400" />
                <span className="text-xs text-slate-300">Wiring</span>
              </div>
              <span className="text-xs text-white font-medium">{metadata?.wireCount || 0}</span>
            </div>
            <div className="mt-1.5 h-1 w-full rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400"
                style={{ width: `${Math.min((metadata?.wireCount || 0) * 8, 100)}%` }}
              />
            </div>
          </div>

          {/* Sensor Health */}
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Zap size={12} className="text-emerald-400" />
                <span className="text-xs text-slate-300">Sensors</span>
              </div>
              <span className="text-xs text-white font-medium">{metadata?.sensorCount || 0}</span>
            </div>
            <div className="mt-1.5 h-1 w-full rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                style={{ width: `${Math.min((metadata?.sensorCount || 0) * 15, 100)}%` }}
              />
            </div>
          </div>

          {/* Blockly Health */}
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Blocks size={12} className="text-purple-400" />
                <span className="text-xs text-slate-300">Blockly Blocks</span>
              </div>
              <span className="text-xs text-white font-medium">{metadata?.blocklyBlockCount || 0}</span>
            </div>
            <div className="mt-1.5 h-1 w-full rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-400"
                style={{ width: `${Math.min((metadata?.blocklyBlockCount || 0) * 5, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Diagnostics Summary */}
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Shield size={12} className="text-slate-400" />
              <span className="text-xs text-slate-300">Diagnostics</span>
            </div>
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
              score >= 80 ? 'text-emerald-400 bg-emerald-500/20' :
              score >= 50 ? 'text-amber-400 bg-amber-500/20' :
              'text-red-400 bg-red-500/20'
            }`}>
              {score >= 80 ? 'All Clear' : score >= 50 ? 'Warnings' : 'Issues Found'}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-slate-500">
            {score >= 80
              ? 'Circuit is healthy with no detected issues.'
              : score >= 50
              ? 'Some warnings detected. Review component connections.'
              : 'Critical issues found. Please review wiring and pin assignments.'}
          </p>
        </div>
      </div>
    );
  };

  // ─── Render: History Tab ──────────────────────────────────────

  const renderHistoryTab = () => (
    <div className="space-y-3">
      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSaveVersion}
          disabled={isLoading}
          className="flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-xs text-white hover:bg-blue-500 disabled:opacity-50"
        >
          <Save size={12} /> Save Version
        </button>
        <button
          onClick={handleCheckpoint}
          disabled={isLoading}
          className="flex items-center gap-1 rounded bg-purple-600 px-2.5 py-1 text-xs text-white hover:bg-purple-500 disabled:opacity-50"
        >
          <FileCheck size={12} /> Checkpoint
        </button>
        <button
          onClick={handleRecoverFromCrash}
          disabled={isLoading}
          className="flex items-center gap-1 rounded bg-amber-600 px-2.5 py-1 text-xs text-white hover:bg-amber-500 disabled:opacity-50"
        >
          <RotateCcw size={12} /> Recover
        </button>
      </div>

      {/* Version Comparison */}
      {versionHistory.length >= 2 && (
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-2.5">
          <h4 className="mb-1.5 flex items-center gap-1 text-xs font-medium text-slate-300">
            <GitCompare size={12} /> Compare Versions
          </h4>
          <div className="flex items-center gap-2">
            <select
              value={selectedVersionId || ''}
              onChange={(e) => setSelectedVersionId(e.target.value || null)}
              className="flex-1 rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-300"
            >
              <option value="">Version A…</option>
              {versionHistory.map((v: VersionInfo) => (
                <option key={v.versionId} value={v.versionId}>
                  v{v.versionNumber} — {v.label}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-500">vs</span>
            <select
              value={compareVersionId || ''}
              onChange={(e) => setCompareVersionId(e.target.value || null)}
              className="flex-1 rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-300"
            >
              <option value="">Version B…</option>
              {versionHistory.map((v: VersionInfo) => (
                <option key={v.versionId} value={v.versionId}>
                  v{v.versionNumber} — {v.label}
                </option>
              ))}
            </select>
            <button
              onClick={handleCompareVersions}
              disabled={!selectedVersionId || !compareVersionId}
              className="rounded bg-slate-700 px-2 py-0.5 text-[10px] text-white hover:bg-slate-600 disabled:opacity-50"
            >
              Compare
            </button>
          </div>
          {comparisonResult && (
            <pre className="mt-2 max-h-20 overflow-auto rounded bg-slate-900 p-2 text-[10px] text-slate-300">
              {comparisonResult}
            </pre>
          )}
        </div>
      )}

      {/* Version Timeline */}
      <div className="max-h-[300px] space-y-1 overflow-y-auto">
        {versionHistory.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-700 py-6 text-center text-xs text-slate-500">
            <History size={24} className="mx-auto mb-2 text-slate-600" />
            No versions saved yet
          </div>
        )}
        {versionHistory.map((v: VersionInfo, idx: number) => {
          const ActionIcon = actionIcon(v.action);
          return (
            <div
              key={v.versionId}
              className="flex items-start gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 p-2.5 transition-all hover:border-blue-500/30"
            >
              {/* Timeline Dot */}
              <div className="mt-0.5 flex flex-col items-center">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full ${actionColor(v.action)}`}>
                  <ActionIcon size={12} />
                </div>
                {idx < versionHistory.length - 1 && (
                  <div className="mt-0.5 h-4 w-px bg-slate-700" />
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-white">v{v.versionNumber}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${actionColor(v.action)}`}>
                    {v.action}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-slate-400">{v.label}</p>
                {v.changeSummary && (
                  <p className="mt-0.5 text-[10px] text-slate-500">{v.changeSummary}</p>
                )}
                <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-500">
                  <span>{formatTimestamp(v.createdAt)}</span>
                  <span>{formatBytes(v.sizeBytes)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleRestoreVersion(v.versionId)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-blue-400"
                  title="Restore this version"
                >
                  <RotateCcw size={12} />
                </button>
                <button
                  onClick={() => handleRollback(v.versionId)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-amber-400"
                  title="Rollback to this version"
                >
                  <Undo2 size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Auto-Save Recovery */}
      {autoSaves.length > 0 && (
        <div>
          <h4 className="mb-1.5 flex items-center gap-1 text-xs font-medium text-slate-300">
            <Timer size={12} /> Auto-Save Snapshots
          </h4>
          <div className="max-h-24 space-y-0.5 overflow-y-auto">
            {autoSaves.map((entry: AutoSaveInfo) => (
              <div
                key={entry.entryId}
                className="flex items-center justify-between rounded bg-slate-800/50 px-2.5 py-1.5 text-[10px]"
              >
                <div className="flex items-center gap-2">
                  <Timer size={10} className="text-slate-500" />
                  <span className="text-slate-300">{formatTimestamp(entry.savedAt)}</span>
                  <span className="text-slate-500">{formatBytes(entry.sizeBytes)}</span>
                  {entry.isDirty && (
                    <span className="text-amber-400">dirty</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prune / Storage Summary */}
      <div className="flex items-center justify-between text-[10px] text-slate-500">
        <span>
          {versionHistory.length} version{versionHistory.length !== 1 ? 's' : ''} · {formatBytes(totalVersionsSize)} total
        </span>
        {versionHistory.length > 5 && (
          <button
            onClick={() => handlePruneVersions(5)}
            className="text-amber-400 hover:text-amber-300"
          >
            Prune to 5
          </button>
        )}
      </div>
    </div>
  );

  // ─── Render: Statistics Tab ───────────────────────────────────

  const renderStatisticsTab = () => {
    const stats = statistics;
    const meta = metadata;

    return (
      <div className="space-y-3">
        {/* Primary Metrics Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-2.5 text-center">
            <Cpu size={16} className="mx-auto mb-1 text-blue-400" />
            <span className="text-lg font-bold text-white">
              {stats?.componentCount || meta?.componentCount || 0}
            </span>
            <span className="block text-[10px] text-slate-500">Components</span>
          </div>
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-2.5 text-center">
            <Cable size={16} className="mx-auto mb-1 text-amber-400" />
            <span className="text-lg font-bold text-white">
              {stats?.wireCount || meta?.wireCount || 0}
            </span>
            <span className="block text-[10px] text-slate-500">Wires</span>
          </div>
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-2.5 text-center">
            <Zap size={16} className="mx-auto mb-1 text-emerald-400" />
            <span className="text-lg font-bold text-white">
              {stats?.sensorCount || meta?.sensorCount || 0}
            </span>
            <span className="block text-[10px] text-slate-500">Sensors</span>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-2.5">
            <div className="flex items-center gap-1.5">
              <Blocks size={12} className="text-purple-400" />
              <span className="text-xs text-slate-300">Blockly Blocks</span>
            </div>
            <span className="text-lg font-bold text-white">{meta?.blocklyBlockCount || 0}</span>
          </div>
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-2.5">
            <div className="flex items-center gap-1.5">
              <CircuitBoard size={12} className="text-cyan-400" />
              <span className="text-xs text-slate-300">Runtimes</span>
            </div>
            <span className="text-lg font-bold text-white">{stats?.runtimeCount || 0}</span>
          </div>
        </div>

        {/* Simulation Stats */}
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-3">
          <h4 className="mb-2 flex items-center gap-1 text-xs font-medium text-slate-300">
            <Play size={12} /> Simulation
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] text-slate-400">Total Runs</span>
              <span className="block text-sm font-bold text-white">
                {stats?.simulationRuns || meta?.simulationRuns || 0}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400">Build Time</span>
              <span className="block text-sm font-bold text-white">
                {stats?.totalBuildTimeMinutes || 0}m
              </span>
            </div>
          </div>
        </div>

        {/* Health & Complexity Comparison */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Health Score</span>
              {meta && stats && (() => {
                const TIcon = trendIcon(stats.healthScore, meta.lastHealthScore);
                return (
                  <TIcon
                    size={12}
                    className={trendColor(stats.healthScore, meta.lastHealthScore, true)}
                  />
                );
              })()}
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className={`text-lg font-bold ${healthScoreColor(stats?.healthScore || project?.healthScore || 0)}`}>
                {stats?.healthScore || project?.healthScore || 0}
              </span>
              <span className="text-[10px] text-slate-500">/ 100</span>
            </div>
            <div className="mt-1 h-1 w-full rounded-full bg-slate-700">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${healthBarGradient(stats?.healthScore || project?.healthScore || 0)}`}
                style={{ width: `${stats?.healthScore || project?.healthScore || 0}%` }}
              />
            </div>
          </div>
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Complexity</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${complexityColor(stats?.complexity || project?.complexity || 0)}`}>
                {complexityLabel(stats?.complexity || project?.complexity || 0)}
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-bold text-white">
                {stats?.complexity || project?.complexity || 0}
              </span>
              <span className="text-[10px] text-slate-500">/ 100</span>
            </div>
            <div className="mt-1 h-1 w-full rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-slate-500 to-slate-400"
                style={{ width: `${stats?.complexity || project?.complexity || 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Storage Summary */}
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-2.5">
          <h4 className="mb-1.5 flex items-center gap-1 text-xs font-medium text-slate-300">
            <Layers size={12} /> Storage
          </h4>
          <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
            <div>
              <span className="text-slate-400">Versions</span>
              <span className="block text-xs font-medium text-white">{versionHistory.length}</span>
            </div>
            <div>
              <span className="text-slate-400">Auto-Saves</span>
              <span className="block text-xs font-medium text-white">{autoSaves.length}</span>
            </div>
            <div>
              <span className="text-slate-400">Total Size</span>
              <span className="block text-xs font-medium text-white">{formatBytes(totalVersionsSize)}</span>
            </div>
          </div>
        </div>

        {/* Last Modified */}
        <div className="text-[10px] text-slate-500">
          Last updated: {formatTimestamp(stats?.lastModifiedAt || project?.modifiedAt || 0)}
        </div>
      </div>
    );
  };

  // ─── Main Render ──────────────────────────────────────────────

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/95">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 p-3 text-left hover:bg-slate-800/50"
      >
        {expanded ? (
          <ChevronDown size={14} className="text-slate-400" />
        ) : (
          <ChevronRight size={14} className="text-slate-400" />
        )}
        <LayoutDashboard size={16} className="text-cyan-400" />
        <span className="flex-1 text-sm font-semibold text-white">Project Dashboard</span>
        {project && (
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${healthScoreColor(project.healthScore)}`}>
            {project.healthScore}%
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            refresh();
          }}
          className="rounded p-1 text-slate-400 hover:text-white"
          title="Refresh"
        >
          <RefreshCw size={12} />
        </button>
      </button>

      {expanded && (
        <div className="border-t border-slate-700 p-3">
          {/* Tab Bar */}
          <div className="mb-3 flex gap-1 overflow-x-auto">
            {DASHBOARD_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                    activeTab === tab.id
                      ? 'bg-cyan-600/30 text-cyan-400'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon size={12} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'health' && renderHealthTab()}
          {activeTab === 'history' && renderHistoryTab()}
          {activeTab === 'statistics' && renderStatisticsTab()}
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-slate-800 px-4 py-2 text-xs text-white shadow-lg border border-slate-600">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-emerald-400" />
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
}
