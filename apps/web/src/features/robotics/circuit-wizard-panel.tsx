'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Wand2,
  Zap,
  BookOpen,
  Wrench,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Lightbulb,
  Cable,
  LayoutTemplate,
  GraduationCap,
  Rocket,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// Phase 30A: Circuit Wizard Panel
// Provides guided building, templates, auto-wiring, repair,
// and progress tracking for circuit construction.
// Follows the same component structure as CircuitValidationPanel.
// ═══════════════════════════════════════════════════════════════

export interface CircuitWizardPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runtime: any;
}

// ─── Tab & Filter Types ─────────────────────────────────────────

type WizardTabId = 'templates' | 'guided' | 'autowire' | 'repair' | 'progress';

type DifficultyFilter = 'ALL' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
type CategoryFilter = 'ALL' | 'ROBOTICS' | 'IOT' | 'DISPLAYS' | 'SENSORS';

// ─── Internal Interfaces ────────────────────────────────────────

interface TemplateInfo {
  templateId: string;
  name: string;
  description: string;
  difficulty: string;
  category: string;
  componentCount: number;
  wireCount: number;
  estimatedTimeMinutes: number;
}

interface GuidedStepInfo {
  stepId: string;
  stepNumber: number;
  action: string;
  targetComponentType: string;
  instruction: string;
  explanation: string;
  isCompleted: boolean;
}

interface WireSuggestionInfo {
  suggestionId: string;
  componentId: string;
  componentType: string;
  sourcePinName: string;
  targetPinName: string;
  wireColor: string;
  signalType: string;
  explanation: string;
  isRequired: boolean;
}

interface RepairResult {
  repairId: string;
  issueCode: string;
  description: string;
  action: string;
  status: string;
}

interface ProgressInfo {
  circuitsBuilt: number;
  circuitsCompleted: number;
  guidedStepsCompleted: number;
  mistakesCorrected: number;
  averageHealthScore: number;
  templatesCompleted: string[];
  educationalScore: number;
}

// ─── Tab / Filter Definitions ───────────────────────────────────

const WIZARD_TABS: { id: WizardTabId; label: string; icon: typeof Wand2 }[] = [
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
  { id: 'guided', label: 'Guided', icon: GraduationCap },
  { id: 'autowire', label: 'Auto-Wire', icon: Cable },
  { id: 'repair', label: 'Repair', icon: Wrench },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
];

const DIFFICULTIES: { id: DifficultyFilter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'BEGINNER', label: 'Beginner' },
  { id: 'INTERMEDIATE', label: 'Intermediate' },
  { id: 'ADVANCED', label: 'Advanced' },
];

const CATEGORIES: { id: CategoryFilter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'ROBOTICS', label: 'Robotics' },
  { id: 'IOT', label: 'IoT' },
  { id: 'DISPLAYS', label: 'Displays' },
  { id: 'SENSORS', label: 'Sensors' },
];

// ─── Utility Functions ──────────────────────────────────────────

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

function wireColorSwatch(color: string): string {
  switch (color?.toUpperCase()) {
    case 'RED':
      return '#ef4444';
    case 'BLACK':
      return '#374151';
    case 'GREEN':
      return '#22c55e';
    case 'BLUE':
      return '#3b82f6';
    case 'YELLOW':
      return '#eab308';
    case 'ORANGE':
      return '#f97316';
    case 'WHITE':
      return '#e5e7eb';
    case 'PURPLE':
      return '#a855f7';
    default:
      return '#6b7280';
  }
}

function signalTypeBadge(signalType: string): string {
  switch (signalType) {
    case 'POWER':
      return 'text-red-400 bg-red-500/20';
    case 'GROUND':
      return 'text-slate-400 bg-slate-500/20';
    case 'DIGITAL':
      return 'text-blue-400 bg-blue-500/20';
    case 'ANALOG':
      return 'text-amber-400 bg-amber-500/20';
    case 'I2C':
    case 'SPI':
    case 'UART':
      return 'text-purple-400 bg-purple-500/20';
    default:
      return 'text-blue-400 bg-blue-500/20';
  }
}

function repairStatusColor(status: string): string {
  switch (status) {
    case 'FIXED':
      return 'text-emerald-400';
    case 'FAILED':
      return 'text-red-400';
    case 'SKIPPED':
      return 'text-amber-400';
    default:
      return 'text-muted';
  }
}

// ─── Component ──────────────────────────────────────────────────

export function CircuitWizardPanel({ runtime }: CircuitWizardPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<WizardTabId>('templates');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyFilter>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('ALL');
  const [activeBuildId, setActiveBuildId] = useState<string | null>(null);
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [repairMode, setRepairMode] = useState<string>('AUTO');
  const [repairResults, setRepairResults] = useState<RepairResult[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // ─── Compute data from runtime ────────────────────────────────

  const templates = useMemo(() => {
    const defaultTemplates: TemplateInfo[] = [];
    if (!runtime?.circuitWizardSynchronizer) return defaultTemplates;

    try {
      const allTemplates = runtime.circuitWizardSynchronizer.getAllTemplates?.() || [];
      const mapped: TemplateInfo[] = allTemplates.map((t: TemplateInfo) => ({
        templateId: t.templateId || '',
        name: t.name || 'Untitled Template',
        description: t.description || '',
        difficulty: t.difficulty || 'BEGINNER',
        category: t.category || 'ROBOTICS',
        componentCount: t.componentCount ?? 0,
        wireCount: t.wireCount ?? 0,
        estimatedTimeMinutes: t.estimatedTimeMinutes ?? 10,
      }));

      return mapped.filter((t) => {
        if (selectedDifficulty !== 'ALL' && t.difficulty !== selectedDifficulty) return false;
        if (selectedCategory !== 'ALL' && t.category !== selectedCategory) return false;
        return true;
      });
    } catch {
      return defaultTemplates;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, selectedDifficulty, selectedCategory, refreshKey]);

  const guidedSteps = useMemo(() => {
    const defaultSteps: GuidedStepInfo[] = [];
    if (!runtime?.circuitWizardSynchronizer || !activeBuildId) return defaultSteps;

    try {
      const build = runtime.circuitWizardSynchronizer.getGuidedBuild?.(activeBuildId);
      if (!build?.steps) return defaultSteps;

      return (build.steps || []).map((s: GuidedStepInfo) => ({
        stepId: s.stepId || '',
        stepNumber: s.stepNumber ?? 0,
        action: s.action || 'PLACE',
        targetComponentType: s.targetComponentType || '',
        instruction: s.instruction || '',
        explanation: s.explanation || '',
        isCompleted: s.isCompleted ?? false,
      }));
    } catch {
      return defaultSteps;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, activeBuildId, refreshKey]);

  const wireSuggestions = useMemo(() => {
    const defaultSuggestions: WireSuggestionInfo[] = [];
    if (!runtime?.autoWiringSynchronizer) return defaultSuggestions;

    try {
      const allSuggestions = runtime.autoWiringSynchronizer.getAllSuggestions?.() || [];
      return allSuggestions.map((s: WireSuggestionInfo) => ({
        suggestionId: s.suggestionId || '',
        componentId: s.componentId || '',
        componentType: s.componentType || '',
        sourcePinName: s.sourcePinName || '',
        targetPinName: s.targetPinName || '',
        wireColor: s.wireColor || 'BLUE',
        signalType: s.signalType || 'DIGITAL',
        explanation: s.explanation || '',
        isRequired: s.isRequired ?? false,
      }));
    } catch {
      return defaultSuggestions;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, refreshKey]);

  const progress = useMemo(() => {
    const defaultProgress: ProgressInfo = {
      circuitsBuilt: 0,
      circuitsCompleted: 0,
      guidedStepsCompleted: 0,
      mistakesCorrected: 0,
      averageHealthScore: 0,
      templatesCompleted: [],
      educationalScore: 0,
    };
    if (!runtime?.circuitWizardSynchronizer) return defaultProgress;

    try {
      const allProgress = runtime.circuitWizardSynchronizer.getAllProgress?.();
      if (!allProgress) return defaultProgress;

      return {
        circuitsBuilt: allProgress.circuitsBuilt ?? 0,
        circuitsCompleted: allProgress.circuitsCompleted ?? 0,
        guidedStepsCompleted: allProgress.guidedStepsCompleted ?? 0,
        mistakesCorrected: allProgress.mistakesCorrected ?? 0,
        averageHealthScore: allProgress.averageHealthScore ?? 0,
        templatesCompleted: allProgress.templatesCompleted || [],
        educationalScore: allProgress.educationalScore ?? 0,
      };
    } catch {
      return defaultProgress;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, refreshKey]);

  // ─── Action Handlers ──────────────────────────────────────────

  const handleStartGuidedBuild = useCallback(
    async (templateId: string) => {
      if (!runtime?.circuitWizardSynchronizer) return;
      setIsLoading(true);
      try {
        const result = runtime.circuitWizardSynchronizer.startGuidedBuild?.(templateId);
        if (result?.buildId) {
          setActiveBuildId(result.buildId);
          setActiveTab('guided');
          showToast('Guided build started!');
        }
      } catch {
        showToast('Failed to start guided build');
      } finally {
        setIsLoading(false);
        refresh();
      }
    },
    [runtime, refresh, showToast],
  );

  const handleAdvanceStep = useCallback(async () => {
    if (!runtime?.circuitWizardSynchronizer || !activeBuildId) return;
    setIsLoading(true);
    try {
      runtime.circuitWizardSynchronizer.advanceGuidedStep?.(activeBuildId);
      showToast('Step completed!');
    } catch {
      showToast('Failed to advance step');
    } finally {
      setIsLoading(false);
      refresh();
    }
  }, [runtime, activeBuildId, refresh, showToast]);

  const handleOneClickBuild = useCallback(
    async (templateId: string) => {
      if (!runtime?.circuitWizardSynchronizer) return;
      setIsLoading(true);
      try {
        runtime.circuitWizardSynchronizer.buildCircuitOneClick?.(templateId);
        showToast('Circuit built successfully!');
      } catch {
        showToast('Failed to build circuit');
      } finally {
        setIsLoading(false);
        refresh();
      }
    },
    [runtime, refresh, showToast],
  );

  const handleAutoWire = useCallback(
    async (componentId: string, componentType: string) => {
      if (!runtime?.autoWiringSynchronizer) return;
      setIsLoading(true);
      try {
        runtime.autoWiringSynchronizer.suggestWireRoutes?.(componentId, componentType);
        showToast('Wire suggestions generated');
      } catch {
        showToast('Failed to generate wire suggestions');
      } finally {
        setIsLoading(false);
        refresh();
      }
    },
    [runtime, refresh, showToast],
  );

  const handleRepairCircuit = useCallback(
    async (mode: string) => {
      if (!runtime?.circuitWizardSynchronizer) return;
      setIsLoading(true);
      try {
        const result = runtime.circuitWizardSynchronizer.repairCircuit?.([], mode);
        if (result?.repairs) {
          setRepairResults(
            (result.repairs || []).map((r: RepairResult) => ({
              repairId: r.repairId || '',
              issueCode: r.issueCode || '',
              description: r.description || '',
              action: r.action || '',
              status: r.status || 'PENDING',
            })),
          );
          showToast(`Repair complete: ${result.repairs.length} action(s)`);
        }
      } catch {
        showToast('Repair failed');
      } finally {
        setIsLoading(false);
        refresh();
      }
    },
    [runtime, refresh, showToast],
  );

  // ─── Derived Values ───────────────────────────────────────────

  const completedSteps = guidedSteps.filter((s: GuidedStepInfo) => s.isCompleted).length;
  const totalSteps = guidedSteps.length;
  const buildProgressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const isBuildComplete = totalSteps > 0 && completedSteps === totalSteps;
  const currentStepIndex = guidedSteps.findIndex((s: GuidedStepInfo) => !s.isCompleted);
  const currentStep = currentStepIndex >= 0 ? guidedSteps[currentStepIndex] : null;

  const suggestionsByComponent = useMemo(() => {
    const grouped: Record<string, WireSuggestionInfo[]> = {};
    for (const s of wireSuggestions) {
      const key = s.componentId || 'unknown';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(s);
    }
    return grouped;
  }, [wireSuggestions]);

  const requiredSuggestionCount = wireSuggestions.filter((s: WireSuggestionInfo) => s.isRequired).length;
  const optionalSuggestionCount = wireSuggestions.length - requiredSuggestionCount;

  // ─── Collapsed State ──────────────────────────────────────────

  if (!expanded) {
    return (
      <div className="rounded-lg border border-border bg-card p-3">
        <button
          id="wizard-panel-expand-btn"
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setExpanded(true)}
        >
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Circuit Wizard</h3>
          </div>
          <div className="flex items-center gap-2">
            {templates.length > 0 && (
              <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-400 font-medium">
                {templates.length} templates
              </span>
            )}
            {activeBuildId && (
              <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-400 font-medium">
                Building
              </span>
            )}
            <ChevronRight className="h-4 w-4 text-muted" />
          </div>
        </button>
      </div>
    );
  }

  // ─── Expanded State ───────────────────────────────────────────

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-3">
      {/* Toast Message */}
      {toastMessage && (
        <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 animate-pulse">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs text-primary">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          id="wizard-panel-collapse-btn"
          type="button"
          className="flex items-center gap-2 text-left"
          onClick={() => setExpanded(false)}
        >
          <Wand2 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Circuit Wizard</h3>
          <ChevronDown className="h-3 w-3 text-muted" />
        </button>
        <div className="flex items-center gap-1">
          {isLoading && (
            <RefreshCw className="h-3.5 w-3.5 text-primary animate-spin" />
          )}
          <button
            id="wizard-refresh-btn"
            type="button"
            className="rounded p-1 hover:bg-muted/20 transition-colors"
            onClick={refresh}
            title="Refresh wizard data"
          >
            <RefreshCw className="h-3.5 w-3.5 text-muted" />
          </button>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md bg-muted/10 px-2 py-1.5">
          <LayoutTemplate className="mx-auto h-3.5 w-3.5 text-blue-400 mb-0.5" />
          <span className="text-xs font-medium">{templates.length}</span>
          <span className="block text-[10px] text-muted">Templates</span>
        </div>
        <div className="rounded-md bg-muted/10 px-2 py-1.5">
          <Cable className="mx-auto h-3.5 w-3.5 text-amber-400 mb-0.5" />
          <span className="text-xs font-medium">{wireSuggestions.length}</span>
          <span className="block text-[10px] text-muted">Wire Tips</span>
        </div>
        <div className="rounded-md bg-muted/10 px-2 py-1.5">
          <Rocket className="mx-auto h-3.5 w-3.5 text-emerald-400 mb-0.5" />
          <span className="text-xs font-medium">{progress.circuitsCompleted}</span>
          <span className="block text-[10px] text-muted">Completed</span>
        </div>
      </div>

      {/* ═══ Tab Bar ═══════════════════════════════════════════════ */}
      <div className="flex gap-0.5 rounded-md bg-muted/10 p-0.5">
        {WIZARD_TABS.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          let badge = 0;
          if (tab.id === 'templates') badge = templates.length;
          else if (tab.id === 'guided') badge = activeBuildId ? totalSteps - completedSteps : 0;
          else if (tab.id === 'autowire') badge = wireSuggestions.length;
          else if (tab.id === 'repair') badge = repairResults.length;

          return (
            <button
              key={tab.id}
              id={`wizard-tab-${tab.id}`}
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
                <span
                  className={`ml-0.5 rounded-full px-1 text-[9px] font-bold ${
                    tab.id === 'repair'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB: Templates                                            */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'templates' && (
        <div className="space-y-2">
          {/* Difficulty Filter */}
          <div className="flex gap-1 flex-wrap">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                id={`wizard-diff-${d.id}`}
                type="button"
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  selectedDifficulty === d.id
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted/10 text-muted hover:text-foreground/70'
                }`}
                onClick={() => setSelectedDifficulty(d.id)}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="flex gap-1 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                id={`wizard-cat-${cat.id}`}
                type="button"
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted/10 text-muted hover:text-foreground/70'
                }`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Empty State */}
          {templates.length === 0 && (
            <div className="py-3 text-center">
              <LayoutTemplate className="mx-auto h-5 w-5 text-muted/40 mb-1" />
              <p className="text-[10px] text-muted">No templates found</p>
              <p className="text-[9px] text-muted/60 mt-0.5">
                Try adjusting the difficulty or category filters
              </p>
            </div>
          )}

          {/* Template Cards */}
          <ul className="max-h-72 space-y-1.5 overflow-y-auto">
            {templates.map((template) => {
              const isExpanded = expandedTemplateId === template.templateId;

              return (
                <li
                  key={template.templateId}
                  id={`wizard-template-${template.templateId}`}
                  className="rounded-md bg-background text-xs border-l-2 border-blue-400 transition-all"
                >
                  <button
                    type="button"
                    className="flex w-full items-start gap-1.5 px-2 py-1.5 text-left"
                    onClick={() =>
                      setExpandedTemplateId(isExpanded ? null : template.templateId)
                    }
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium">{template.name}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${difficultyColor(template.difficulty)}`}
                        >
                          {template.difficulty}
                        </span>
                      </div>
                      <p className="text-muted mt-0.5 text-[10px]">
                        {template.description}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3 text-muted shrink-0 mt-0.5" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-muted shrink-0 mt-0.5" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-2 pb-2 space-y-1.5">
                      {/* Stats */}
                      <div className="flex gap-3 text-[10px] text-muted">
                        <div className="flex items-center gap-1">
                          <Cpu className="h-3 w-3" />
                          <span>{template.componentCount} components</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          <span>{template.wireCount} wires</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <RefreshCw className="h-3 w-3" />
                          <span>~{template.estimatedTimeMinutes} min</span>
                        </div>
                      </div>

                      {/* Category badge */}
                      <span className="inline-block rounded bg-purple-500/20 px-1 py-0.5 text-[9px] text-purple-400 font-mono">
                        {template.category}
                      </span>

                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-1">
                        <button
                          id={`wizard-guided-start-${template.templateId}`}
                          type="button"
                          className="flex items-center gap-1 rounded-md bg-primary/20 px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/30 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartGuidedBuild(template.templateId);
                          }}
                          disabled={isLoading}
                        >
                          <GraduationCap className="h-3 w-3" />
                          Start Guided Build
                        </button>
                        <button
                          id={`wizard-oneclick-${template.templateId}`}
                          type="button"
                          className="flex items-center gap-1 rounded-md bg-emerald-500/20 px-2 py-1 text-[10px] font-medium text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOneClickBuild(template.templateId);
                          }}
                          disabled={isLoading}
                        >
                          <Rocket className="h-3 w-3" />
                          One-Click Build
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB: Guided Build                                         */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'guided' && (
        <div className="space-y-2">
          {/* No active build */}
          {!activeBuildId && (
            <div className="py-3 text-center">
              <GraduationCap className="mx-auto h-5 w-5 text-muted/40 mb-1" />
              <p className="text-[10px] text-muted">No active guided build</p>
              <p className="text-[9px] text-muted/60 mt-0.5">
                Start a guided build from the Templates tab
              </p>
              <button
                id="wizard-goto-templates-btn"
                type="button"
                className="mt-2 rounded-md bg-primary/20 px-3 py-1 text-[10px] font-medium text-primary hover:bg-primary/30 transition-colors"
                onClick={() => setActiveTab('templates')}
              >
                Browse Templates
              </button>
            </div>
          )}

          {/* Active build */}
          {activeBuildId && (
            <>
              {/* Build completion celebration */}
              {isBuildComplete && (
                <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <div>
                    <span className="text-xs font-medium text-emerald-300">
                      Build Complete! 🎉
                    </span>
                    <p className="text-[10px] text-emerald-400/70 mt-0.5">
                      All {totalSteps} steps finished successfully
                    </p>
                  </div>
                </div>
              )}

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Build Progress</span>
                  <span className="text-[10px] text-muted">
                    {completedSteps} / {totalSteps} steps
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted/20">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${progressBarColor(buildProgressPercent)}`}
                    style={{ width: `${buildProgressPercent}%` }}
                  />
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-medium text-muted">
                    {buildProgressPercent}%
                  </span>
                </div>
              </div>

              {/* Current Step Card */}
              {currentStep && (
                <div className="rounded-md bg-primary/5 border border-primary/20 px-3 py-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Play className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] font-medium text-primary uppercase tracking-wide">
                      Current Step {currentStep.stepNumber}
                    </span>
                    <span className="ml-auto rounded bg-muted/20 px-1 py-0.5 text-[9px] text-muted font-mono">
                      {currentStep.action}
                    </span>
                  </div>
                  {currentStep.targetComponentType && (
                    <span className="inline-block rounded bg-purple-500/20 px-1 py-0.5 text-[9px] text-purple-400 font-mono mb-1">
                      {currentStep.targetComponentType}
                    </span>
                  )}
                  <p className="text-xs font-medium mt-1">{currentStep.instruction}</p>
                  {currentStep.explanation && (
                    <div className="rounded bg-muted/5 px-2 py-1 mt-1.5">
                      <span className="text-[9px] font-medium text-muted uppercase">
                        Why?
                      </span>
                      <p className="text-[10px] text-foreground/80 mt-0.5">
                        {currentStep.explanation}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step List */}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <BookOpen className="h-3 w-3 text-muted" />
                  <span className="text-[10px] font-medium text-muted uppercase tracking-wide">
                    All Steps
                  </span>
                </div>
                <ul className="max-h-36 space-y-1 overflow-y-auto">
                  {guidedSteps.map((step: GuidedStepInfo) => {
                    const isCurrent = currentStep?.stepId === step.stepId;
                    return (
                      <li
                        key={step.stepId}
                        id={`wizard-step-${step.stepId}`}
                        className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] ${
                          step.isCompleted
                            ? 'bg-emerald-500/5 text-emerald-400/70'
                            : isCurrent
                              ? 'bg-primary/10 text-foreground'
                              : 'bg-muted/5 text-muted'
                        }`}
                      >
                        {step.isCompleted ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                        ) : isCurrent ? (
                          <Play className="h-3 w-3 text-primary shrink-0" />
                        ) : (
                          <div className="h-3 w-3 rounded-full border border-muted/30 shrink-0" />
                        )}
                        <span className="font-medium">Step {step.stepNumber}</span>
                        <span className="text-muted">—</span>
                        <span className="truncate">{step.instruction}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Next Step Button */}
              {!isBuildComplete && (
                <button
                  id="wizard-advance-step-btn"
                  type="button"
                  className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary/20 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/30 transition-colors"
                  onClick={handleAdvanceStep}
                  disabled={isLoading}
                >
                  <Play className="h-3.5 w-3.5" />
                  Complete Current Step
                </button>
              )}

              {/* New build button when complete */}
              {isBuildComplete && (
                <button
                  id="wizard-new-build-btn"
                  type="button"
                  className="flex w-full items-center justify-center gap-1.5 rounded-md bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                  onClick={() => {
                    setActiveBuildId(null);
                    setActiveTab('templates');
                  }}
                >
                  <Rocket className="h-3.5 w-3.5" />
                  Start New Build
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB: Auto-Wire                                            */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'autowire' && (
        <div className="space-y-2">
          {/* Summary Row */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-[9px] text-red-400 font-medium">
                {requiredSuggestionCount} required
              </span>
              <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[9px] text-blue-400 font-medium">
                {optionalSuggestionCount} optional
              </span>
            </div>
          </div>

          {/* Empty State */}
          {wireSuggestions.length === 0 && (
            <div className="py-3 text-center">
              <Cable className="mx-auto h-5 w-5 text-muted/40 mb-1" />
              <p className="text-[10px] text-muted">No wire suggestions</p>
              <p className="text-[9px] text-muted/60 mt-0.5">
                Place components to get auto-wiring suggestions
              </p>
            </div>
          )}

          {/* Suggestions grouped by component */}
          <div className="max-h-60 space-y-2 overflow-y-auto">
            {Object.entries(suggestionsByComponent).map(([componentId, suggestions]) => (
              <div key={componentId} className="space-y-1">
                {/* Component header */}
                <div className="flex items-center gap-1.5">
                  <Cpu className="h-3 w-3 text-purple-400" />
                  <span className="text-[10px] font-medium text-purple-300">
                    {suggestions[0]?.componentType || componentId}
                  </span>
                  <span className="text-[9px] text-muted font-mono">
                    ({componentId})
                  </span>
                  <button
                    id={`wizard-autowire-${componentId}`}
                    type="button"
                    className="ml-auto rounded bg-blue-500/20 px-1.5 py-0.5 text-[9px] text-blue-400 font-medium hover:bg-blue-500/30 transition-colors"
                    onClick={() =>
                      handleAutoWire(componentId, suggestions[0]?.componentType || '')
                    }
                    disabled={isLoading}
                  >
                    Auto-Wire
                  </button>
                </div>

                {/* Wire suggestions */}
                <ul className="space-y-1">
                  {suggestions.map((suggestion) => (
                    <li
                      key={suggestion.suggestionId}
                      id={`wizard-wire-${suggestion.suggestionId}`}
                      className={`rounded-md bg-background px-2 py-1.5 text-xs border-l-2 ${
                        suggestion.isRequired
                          ? 'border-red-400'
                          : 'border-blue-400'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {/* Wire color swatch */}
                        <div
                          className="h-3 w-3 rounded-full shrink-0 border border-white/10"
                          style={{ backgroundColor: wireColorSwatch(suggestion.wireColor) }}
                          title={suggestion.wireColor}
                        />
                        <span className="font-mono text-[10px]">
                          {suggestion.sourcePinName}
                        </span>
                        <span className="text-muted text-[10px]">→</span>
                        <span className="font-mono text-[10px]">
                          {suggestion.targetPinName}
                        </span>
                        <span
                          className={`ml-auto rounded-full px-1 py-0.5 text-[9px] font-medium ${signalTypeBadge(suggestion.signalType)}`}
                        >
                          {suggestion.signalType}
                        </span>
                      </div>
                      {suggestion.isRequired && (
                        <span className="inline-block mt-0.5 rounded bg-red-500/20 px-1 text-[9px] text-red-400 font-medium">
                          Required
                        </span>
                      )}
                      {suggestion.explanation && (
                        <p className="text-[10px] text-muted mt-0.5">
                          {suggestion.explanation}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB: Repair                                               */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'repair' && (
        <div className="space-y-2">
          {/* Repair Mode Selection */}
          <div className="flex items-center gap-1.5 mb-1">
            <Wrench className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium">Repair Mode</span>
          </div>
          <div className="flex gap-1 flex-wrap">
            {['AUTO', 'STEP_BY_STEP', 'IGNORE'].map((mode) => (
              <button
                key={mode}
                id={`wizard-repair-mode-${mode}`}
                type="button"
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  repairMode === mode
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted/10 text-muted hover:text-foreground/70'
                }`}
                onClick={() => setRepairMode(mode)}
              >
                {mode === 'STEP_BY_STEP' ? 'Step-by-Step' : mode === 'AUTO' ? 'Auto' : 'Ignore'}
              </button>
            ))}
          </div>

          {/* Repair Action */}
          <button
            id="wizard-run-repair-btn"
            type="button"
            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/30 transition-colors"
            onClick={() => handleRepairCircuit(repairMode)}
            disabled={isLoading}
          >
            <Wrench className="h-3.5 w-3.5" />
            {isLoading ? 'Repairing...' : 'Run Repair'}
          </button>

          {/* Repair Results */}
          {repairResults.length === 0 && (
            <div className="py-3 text-center">
              <Wrench className="mx-auto h-5 w-5 text-muted/40 mb-1" />
              <p className="text-[10px] text-muted">No repair results yet</p>
              <p className="text-[9px] text-muted/60 mt-0.5">
                Run repair to diagnose and fix circuit issues
              </p>
            </div>
          )}

          {repairResults.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Lightbulb className="h-3 w-3 text-amber-400" />
                <span className="text-[10px] font-medium text-muted uppercase tracking-wide">
                  Repair Results ({repairResults.length})
                </span>
              </div>
              <ul className="max-h-48 space-y-1 overflow-y-auto">
                {repairResults.map((result) => (
                  <li
                    key={result.repairId}
                    id={`wizard-repair-${result.repairId}`}
                    className={`rounded-md bg-background px-2 py-1.5 text-xs border-l-2 ${
                      result.status === 'FIXED'
                        ? 'border-emerald-400'
                        : result.status === 'FAILED'
                          ? 'border-red-400'
                          : 'border-amber-400'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {result.status === 'FIXED' ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                      ) : result.status === 'FAILED' ? (
                        <XCircle className="h-3 w-3 text-red-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
                      )}
                      <span className="font-mono text-[10px]">{result.issueCode}</span>
                      <span className={`ml-auto text-[9px] font-medium ${repairStatusColor(result.status)}`}>
                        {result.status}
                      </span>
                    </div>
                    <p className="text-muted mt-0.5">{result.description}</p>
                    {result.action && (
                      <p className="text-[10px] text-foreground/70 mt-0.5">
                        → {result.action}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB: Progress                                             */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'progress' && (
        <div className="space-y-3">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md bg-muted/10 px-3 py-2 text-center">
              <span className="text-lg font-bold text-blue-400">
                {progress.circuitsBuilt}
              </span>
              <span className="block text-[10px] text-muted">Circuits Built</span>
            </div>
            <div className="rounded-md bg-muted/10 px-3 py-2 text-center">
              <span className="text-lg font-bold text-emerald-400">
                {progress.circuitsCompleted}
              </span>
              <span className="block text-[10px] text-muted">Completed</span>
            </div>
            <div className="rounded-md bg-muted/10 px-3 py-2 text-center">
              <span className="text-lg font-bold text-amber-400">
                {progress.guidedStepsCompleted}
              </span>
              <span className="block text-[10px] text-muted">Steps Done</span>
            </div>
            <div className="rounded-md bg-muted/10 px-3 py-2 text-center">
              <span className="text-lg font-bold text-purple-400">
                {progress.mistakesCorrected}
              </span>
              <span className="block text-[10px] text-muted">Mistakes Fixed</span>
            </div>
          </div>

          {/* Health Score Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium">Average Health Score</span>
              </div>
              <span className="text-xs font-medium">
                {progress.averageHealthScore}/100
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted/20">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${progressBarColor(progress.averageHealthScore)}`}
                style={{
                  width: `${Math.min(100, progress.averageHealthScore)}%`,
                }}
              />
            </div>
          </div>

          {/* Educational Score */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs font-medium">Educational Score</span>
              </div>
              <span className="text-xs font-medium">
                {progress.educationalScore}/100
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted/20">
              <div
                className="h-2 rounded-full transition-all duration-500 bg-blue-500"
                style={{
                  width: `${Math.min(100, progress.educationalScore)}%`,
                }}
              />
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <Lightbulb className="h-3 w-3 text-amber-400" />
              <span className="text-[9px] text-muted">
                {progress.educationalScore >= 80
                  ? 'Excellent understanding!'
                  : progress.educationalScore >= 50
                    ? 'Good progress, keep learning!'
                    : 'Build more circuits to improve your score'}
              </span>
            </div>
          </div>

          {/* Templates Completed */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span className="text-[10px] font-medium text-muted uppercase tracking-wide">
                Templates Completed ({progress.templatesCompleted.length})
              </span>
            </div>
            {progress.templatesCompleted.length === 0 && (
              <div className="py-2 text-center">
                <p className="text-[10px] text-muted">No templates completed yet</p>
                <p className="text-[9px] text-muted/60 mt-0.5">
                  Complete guided builds to track your progress
                </p>
              </div>
            )}
            {progress.templatesCompleted.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {progress.templatesCompleted.map((templateId: string) => (
                  <span
                    key={templateId}
                    className="flex items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300 font-mono"
                  >
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    {templateId}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Empty overall state */}
          {progress.circuitsBuilt === 0 &&
            progress.circuitsCompleted === 0 &&
            progress.guidedStepsCompleted === 0 && (
              <div className="py-2 text-center">
                <Rocket className="mx-auto h-6 w-6 text-muted/40 mb-1" />
                <p className="text-xs text-muted">No progress yet</p>
                <p className="text-[10px] text-muted/60 mt-0.5">
                  Start building circuits to track your achievements
                </p>
              </div>
            )}
        </div>
      )}

      {/* ═══ Global Empty State ═══════════════════════════════════ */}
      {!runtime?.circuitWizardSynchronizer && !runtime?.autoWiringSynchronizer && (
        <div className="py-2 text-center">
          <Wand2 className="mx-auto h-6 w-6 text-muted/40 mb-1" />
          <p className="text-xs text-muted">Wizard not available</p>
          <p className="text-[10px] text-muted/60 mt-0.5">
            Circuit wizard synchronizers are not initialized
          </p>
        </div>
      )}
    </div>
  );
}
