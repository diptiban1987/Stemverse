'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  FolderOpen,
  LayoutTemplate,
  Clock,
  FolderTree,
  ArrowDownToLine,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Star,
  Pin,
  Trash2,
  Copy,
  Archive,
  ArchiveRestore,
  Edit3,
  Grid3x3,
  List,
  SortAsc,
  Tag,
  Filter,
  FolderPlus,
  Download,
  Upload,
  FileJson,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Rocket,
  Cpu,
  Zap,
  Heart,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// Phase 30A: Project Library Panel
// Provides project management, template launching, recent projects,
// folder organization, and import/export functionality.
// Follows the same component structure as CircuitWizardPanel.
// ═══════════════════════════════════════════════════════════════

export interface ProjectLibraryPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runtime: any;
}

// ─── Tab & Filter Types ─────────────────────────────────────────

type LibraryTabId = 'projects' | 'templates' | 'recent' | 'folders' | 'import-export';

type ViewMode = 'GRID' | 'LIST';
type SortField = 'NAME' | 'CREATED' | 'MODIFIED' | 'HEALTH_SCORE' | 'COMPLEXITY';
type StatusFilter = 'ALL' | 'ACTIVE' | 'ARCHIVED' | 'TEMPLATE';
type TemplateCategory = 'ALL' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EDUCATION';
type ExportFormat = 'STEMVERSE' | 'JSON';

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

interface FolderInfo {
  folderId: string;
  name: string;
  parentFolderId: string;
  projectIds: string[];
  color: string;
}

interface TagInfo {
  tagId: string;
  name: string;
  color: string;
  projectIds: string[];
}


interface TemplateInfo {
  templateId: string;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  componentCount: number;
  wireCount: number;
  estimatedTimeMinutes: number;
}

interface ImportResult {
  success: boolean;
  projectId: string;
  validationErrors: string[];
  warnings: string[];
}

// ─── Tab / Filter Definitions ───────────────────────────────────

const LIBRARY_TABS: { id: LibraryTabId; label: string; icon: typeof FolderOpen }[] = [
  { id: 'projects', label: 'Projects', icon: FolderOpen },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
  { id: 'recent', label: 'Recent', icon: Clock },
  { id: 'folders', label: 'Folders', icon: FolderTree },
  { id: 'import-export', label: 'Import/Export', icon: ArrowDownToLine },
];

const SORT_FIELDS: { id: SortField; label: string }[] = [
  { id: 'MODIFIED', label: 'Last Modified' },
  { id: 'CREATED', label: 'Date Created' },
  { id: 'NAME', label: 'Name' },
  { id: 'HEALTH_SCORE', label: 'Health Score' },
  { id: 'COMPLEXITY', label: 'Complexity' },
];

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'ARCHIVED', label: 'Archived' },
  { id: 'TEMPLATE', label: 'Templates' },
];

const TEMPLATE_CATEGORIES: { id: TemplateCategory; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'BEGINNER', label: 'Beginner' },
  { id: 'INTERMEDIATE', label: 'Intermediate' },
  { id: 'ADVANCED', label: 'Advanced' },
  { id: 'EDUCATION', label: 'Education' },
];

// ─── Built-in Template Library ──────────────────────────────────

const BUILTIN_TEMPLATES: TemplateInfo[] = [
  {
    templateId: 'tpl_blink',
    name: 'LED Blinker',
    description: 'Classic blinking LED circuit — the "Hello World" of electronics.',
    category: 'BEGINNER',
    difficulty: 'BEGINNER',
    componentCount: 3,
    wireCount: 4,
    estimatedTimeMinutes: 5,
  },
  {
    templateId: 'tpl_traffic_light',
    name: 'Traffic Light Controller',
    description: 'Three-color traffic light with timed sequencing using Blockly.',
    category: 'BEGINNER',
    difficulty: 'BEGINNER',
    componentCount: 5,
    wireCount: 8,
    estimatedTimeMinutes: 10,
  },
  {
    templateId: 'tpl_ultrasonic_ranger',
    name: 'Ultrasonic Distance Sensor',
    description: 'Measure distances with HC-SR04 ultrasonic sensor and display readings.',
    category: 'INTERMEDIATE',
    difficulty: 'INTERMEDIATE',
    componentCount: 4,
    wireCount: 6,
    estimatedTimeMinutes: 15,
  },
  {
    templateId: 'tpl_servo_sweep',
    name: 'Servo Motor Sweep',
    description: 'Sweep a servo motor from 0° to 180° and back continuously.',
    category: 'INTERMEDIATE',
    difficulty: 'INTERMEDIATE',
    componentCount: 3,
    wireCount: 5,
    estimatedTimeMinutes: 10,
  },
  {
    templateId: 'tpl_line_follower',
    name: 'Line Following Robot',
    description: 'Autonomous robot that follows a black line using IR sensors.',
    category: 'ADVANCED',
    difficulty: 'ADVANCED',
    componentCount: 8,
    wireCount: 14,
    estimatedTimeMinutes: 30,
  },
  {
    templateId: 'tpl_obstacle_avoider',
    name: 'Obstacle Avoidance Robot',
    description: 'Robot that detects and avoids obstacles using ultrasonic sensors.',
    category: 'ADVANCED',
    difficulty: 'ADVANCED',
    componentCount: 7,
    wireCount: 12,
    estimatedTimeMinutes: 25,
  },
  {
    templateId: 'tpl_temp_monitor',
    name: 'Temperature Monitor',
    description: 'Read temperature from a sensor and display on LCD screen.',
    category: 'EDUCATION',
    difficulty: 'INTERMEDIATE',
    componentCount: 5,
    wireCount: 10,
    estimatedTimeMinutes: 20,
  },
  {
    templateId: 'tpl_motor_driver',
    name: 'DC Motor Speed Control',
    description: 'Control DC motor speed with PWM using an L298N motor driver.',
    category: 'EDUCATION',
    difficulty: 'ADVANCED',
    componentCount: 4,
    wireCount: 8,
    estimatedTimeMinutes: 15,
  },
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

function healthColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-red-400';
}



function complexityLabel(score: number): string {
  if (score >= 80) return 'Complex';
  if (score >= 50) return 'Moderate';
  if (score >= 20) return 'Simple';
  return 'Trivial';
}

function difficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'BEGINNER':
      return 'text-emerald-400 bg-emerald-500/20';
    case 'INTERMEDIATE':
      return 'text-amber-400 bg-amber-500/20';
    case 'ADVANCED':
      return 'text-red-400 bg-red-500/20';
    case 'EDUCATION':
      return 'text-blue-400 bg-blue-500/20';
    default:
      return 'text-slate-400 bg-slate-500/20';
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

function sortProjects(projects: ProjectInfo[], field: SortField): ProjectInfo[] {
  const sorted = [...projects];
  switch (field) {
    case 'NAME':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'CREATED':
      sorted.sort((a, b) => b.createdAt - a.createdAt);
      break;
    case 'MODIFIED':
      sorted.sort((a, b) => b.modifiedAt - a.modifiedAt);
      break;
    case 'HEALTH_SCORE':
      sorted.sort((a, b) => b.healthScore - a.healthScore);
      break;
    case 'COMPLEXITY':
      sorted.sort((a, b) => b.complexity - a.complexity);
      break;
  }
  return sorted;
}

// ─── Component ──────────────────────────────────────────────────

export function ProjectLibraryPanel({ runtime }: ProjectLibraryPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<LibraryTabId>('projects');
  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  const [sortField, setSortField] = useState<SortField>('MODIFIED');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [templateCategory, setTemplateCategory] = useState<TemplateCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderForm, setShowNewFolderForm] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('STEMVERSE');
  const [importData, setImportData] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [expandedFolderId, setExpandedFolderId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // ─── Compute data from runtime ────────────────────────────────

  const projects = useMemo(() => {
    const defaultProjects: ProjectInfo[] = [];
    if (!runtime?.projectLibrarySynchronizer) return defaultProjects;

    try {
      const allProjects = runtime.projectLibrarySynchronizer.getAllProjects?.() || [];
      const mapped: ProjectInfo[] = allProjects.map((p: ProjectInfo) => ({
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
      }));

      // Apply filters
      let filtered = mapped;

      if (statusFilter !== 'ALL') {
        filtered = filtered.filter((p) => p.status === statusFilter);
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.tags.some((t) => t.toLowerCase().includes(q)),
        );
      }

      return sortProjects(filtered, sortField);
    } catch {
      return defaultProjects;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, statusFilter, searchQuery, sortField, refreshKey]);

  const folders = useMemo(() => {
    const defaultFolders: FolderInfo[] = [];
    if (!runtime?.projectLibrarySynchronizer) return defaultFolders;

    try {
      const allFolders = runtime.projectLibrarySynchronizer.getAllFolders?.() || [];
      return allFolders.map((f: FolderInfo) => ({
        folderId: f.folderId || '',
        name: f.name || 'Untitled Folder',
        parentFolderId: f.parentFolderId || '',
        projectIds: f.projectIds || [],
        color: f.color || '#6b7280',
      }));
    } catch {
      return defaultFolders;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, refreshKey]);

  const tags = useMemo(() => {
    const defaultTags: TagInfo[] = [];
    if (!runtime?.projectLibrarySynchronizer) return defaultTags;

    try {
      const allTags = runtime.projectLibrarySynchronizer.getAllTags?.() || [];
      return allTags.map((t: TagInfo) => ({
        tagId: t.tagId || '',
        name: t.name || '',
        color: t.color || '#6b7280',
        projectIds: t.projectIds || [],
      }));
    } catch {
      return defaultTags;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, refreshKey]);

  const recentProjects = useMemo(() => {
    if (!runtime?.projectLibrarySynchronizer) return [];
    try {
      const recent = runtime.projectLibrarySynchronizer.getRecentProjects?.(10) || [];
      return recent.map((p: ProjectInfo) => ({
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
      }));
    } catch {
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, refreshKey]);

  const pinnedProjects = useMemo(() => {
    if (!runtime?.projectLibrarySynchronizer) return [];
    try {
      const pinned = runtime.projectLibrarySynchronizer.getPinnedProjects?.() || [];
      return pinned.map((p: ProjectInfo) => ({
        projectId: p.projectId || '',
        name: p.name || 'Untitled',
        description: p.description || '',
        status: p.status || 'ACTIVE',
        folderId: p.folderId || '',
        tags: p.tags || [],
        createdAt: p.createdAt ?? 0,
        modifiedAt: p.modifiedAt ?? 0,
        isFavorite: p.isFavorite ?? false,
        isPinned: p.isPinned ?? true,
        complexity: p.complexity ?? 0,
        healthScore: p.healthScore ?? 0,
      }));
    } catch {
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, refreshKey]);

  const templates = useMemo(() => {
    // Combine built-in templates with any runtime-defined ones
    let allTemplates = [...BUILTIN_TEMPLATES];
    if (runtime?.projectLibrarySynchronizer) {
      try {
        const runtimeTemplates = runtime.projectLibrarySynchronizer.getAllProjects?.() || [];
        const templateProjects = runtimeTemplates
          .filter((p: ProjectInfo) => p.status === 'TEMPLATE')
          .map((p: ProjectInfo) => ({
            templateId: p.projectId,
            name: p.name,
            description: p.description,
            category: 'EDUCATION',
            difficulty: p.complexity > 60 ? 'ADVANCED' : p.complexity > 30 ? 'INTERMEDIATE' : 'BEGINNER',
            componentCount: 0,
            wireCount: 0,
            estimatedTimeMinutes: 15,
          }));
        allTemplates = [...allTemplates, ...templateProjects];
      } catch {
        /* use built-in only */
      }
    }

    if (templateCategory !== 'ALL') {
      allTemplates = allTemplates.filter((t) => t.category === templateCategory || t.difficulty === templateCategory);
    }

    return allTemplates;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, templateCategory, refreshKey]);

  // ─── Action Handlers ──────────────────────────────────────────

  const handleCreateProject = useCallback(() => {
    if (!runtime?.projectLibrarySynchronizer || !newProjectName.trim()) return;
    setIsLoading(true);
    try {
      runtime.projectLibrarySynchronizer.createProject?.(newProjectName.trim());
      showToast(`Project "${newProjectName.trim()}" created`);
      setNewProjectName('');
      setShowNewProjectForm(false);
    } catch {
      showToast('Failed to create project');
    } finally {
      setIsLoading(false);
      refresh();
    }
  }, [runtime, newProjectName, showToast, refresh]);

  const handleRenameProject = useCallback(
    (projectId: string) => {
      if (!runtime?.projectLibrarySynchronizer || !editName.trim()) return;
      try {
        runtime.projectLibrarySynchronizer.renameProject?.(projectId, editName.trim());
        showToast('Project renamed');
        setEditingProjectId(null);
        setEditName('');
      } catch {
        showToast('Failed to rename project');
      }
      refresh();
    },
    [runtime, editName, showToast, refresh],
  );

  const handleDeleteProject = useCallback(
    (projectId: string) => {
      if (!runtime?.projectLibrarySynchronizer) return;
      try {
        runtime.projectLibrarySynchronizer.deleteProject?.(projectId);
        showToast('Project deleted');
      } catch {
        showToast('Failed to delete project');
      }
      refresh();
    },
    [runtime, showToast, refresh],
  );

  const handleDuplicateProject = useCallback(
    (projectId: string) => {
      if (!runtime?.projectLibrarySynchronizer) return;
      setIsLoading(true);
      try {
        runtime.projectLibrarySynchronizer.duplicateProject?.(projectId);
        showToast('Project duplicated');
      } catch {
        showToast('Failed to duplicate project');
      } finally {
        setIsLoading(false);
        refresh();
      }
    },
    [runtime, showToast, refresh],
  );

  const handleArchiveProject = useCallback(
    (projectId: string) => {
      if (!runtime?.projectLibrarySynchronizer) return;
      try {
        runtime.projectLibrarySynchronizer.archiveProject?.(projectId);
        showToast('Project archived');
      } catch {
        showToast('Failed to archive project');
      }
      refresh();
    },
    [runtime, showToast, refresh],
  );

  const handleUnarchiveProject = useCallback(
    (projectId: string) => {
      if (!runtime?.projectLibrarySynchronizer) return;
      try {
        runtime.projectLibrarySynchronizer.unarchiveProject?.(projectId);
        showToast('Project unarchived');
      } catch {
        showToast('Failed to unarchive project');
      }
      refresh();
    },
    [runtime, showToast, refresh],
  );

  const handleToggleFavorite = useCallback(
    (projectId: string, isFavorite: boolean) => {
      if (!runtime?.projectLibrarySynchronizer) return;
      try {
        if (isFavorite) {
          runtime.projectLibrarySynchronizer.unfavoriteProject?.(projectId);
        } else {
          runtime.projectLibrarySynchronizer.favoriteProject?.(projectId);
        }
        showToast(isFavorite ? 'Removed from favorites' : 'Added to favorites');
      } catch {
        showToast('Failed to toggle favorite');
      }
      refresh();
    },
    [runtime, showToast, refresh],
  );

  const handleTogglePin = useCallback(
    (projectId: string, isPinned: boolean) => {
      if (!runtime?.projectLibrarySynchronizer) return;
      try {
        if (isPinned) {
          runtime.projectLibrarySynchronizer.unpinProject?.(projectId);
        } else {
          runtime.projectLibrarySynchronizer.pinProject?.(projectId);
        }
        showToast(isPinned ? 'Unpinned' : 'Pinned');
      } catch {
        showToast('Failed to toggle pin');
      }
      refresh();
    },
    [runtime, showToast, refresh],
  );

  const handleCreateFolder = useCallback(() => {
    if (!runtime?.projectLibrarySynchronizer || !newFolderName.trim()) return;
    try {
      runtime.projectLibrarySynchronizer.createFolder?.(newFolderName.trim());
      showToast(`Folder "${newFolderName.trim()}" created`);
      setNewFolderName('');
      setShowNewFolderForm(false);
    } catch {
      showToast('Failed to create folder');
    }
    refresh();
  }, [runtime, newFolderName, showToast, refresh]);

  const handleDeleteFolder = useCallback(
    (folderId: string) => {
      if (!runtime?.projectLibrarySynchronizer) return;
      try {
        runtime.projectLibrarySynchronizer.deleteFolder?.(folderId);
        showToast('Folder deleted');
      } catch {
        showToast('Failed to delete folder');
      }
      refresh();
    },
    [runtime, showToast, refresh],
  );

  const handleLaunchTemplate = useCallback(
    (templateId: string) => {
      if (!runtime?.projectLibrarySynchronizer) return;
      setIsLoading(true);
      try {
        // Create a new project from the template
        const tpl = BUILTIN_TEMPLATES.find((t) => t.templateId === templateId);
        const name = tpl ? `${tpl.name} — Copy` : 'New Project from Template';
        runtime.projectLibrarySynchronizer.createProject?.(name, tpl?.description || '');
        showToast(`Project "${name}" created from template`);
      } catch {
        showToast('Failed to launch template');
      } finally {
        setIsLoading(false);
        refresh();
      }
    },
    [runtime, showToast, refresh],
  );

  const handleExport = useCallback(
    (projectId: string) => {
      if (!runtime?.projectThumbnailSynchronizer) return;
      setIsLoading(true);
      try {
        const snapshot = runtime.projectVersionSynchronizer?.getLatestVersion?.(projectId);
        const serialized = snapshot?.snapshot || '{}';
        const exp = runtime.projectThumbnailSynchronizer.exportProject?.(projectId, exportFormat, serialized);
        if (exp?.serializedData) {
          // Trigger browser download
          const blob = new Blob([exp.serializedData], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `project_${projectId}.${exportFormat === 'STEMVERSE' ? 'stemverse' : 'json'}`;
          a.click();
          URL.revokeObjectURL(url);
          showToast('Project exported');
        }
      } catch {
        showToast('Failed to export project');
      } finally {
        setIsLoading(false);
        refresh();
      }
    },
    [runtime, exportFormat, showToast, refresh],
  );

  const handleImport = useCallback(() => {
    if (!runtime?.projectThumbnailSynchronizer || !importData.trim()) return;
    setIsLoading(true);
    try {
      const result = runtime.projectThumbnailSynchronizer.importProject?.(importData, exportFormat);
      if (result) {
        setImportResult({
          success: result.success ?? false,
          projectId: result.projectId || '',
          validationErrors: result.validationErrors || [],
          warnings: result.warnings || [],
        });
        if (result.success) {
          showToast('Project imported successfully');
          setImportData('');
        } else {
          showToast('Import completed with issues');
        }
      }
    } catch {
      showToast('Failed to import project');
    } finally {
      setIsLoading(false);
      refresh();
    }
  }, [runtime, importData, exportFormat, showToast, refresh]);

  // ─── Render: Project Card ─────────────────────────────────────

  const renderProjectCard = useCallback(
    (p: ProjectInfo, showActions = true) => (
      <div
        key={p.projectId}
        className={`rounded-lg border border-slate-700/50 bg-slate-800/50 p-3 transition-all hover:border-blue-500/30 ${
          viewMode === 'GRID' ? '' : 'flex items-center gap-3'
        }`}
      >
        <div className={viewMode === 'GRID' ? '' : 'min-w-0 flex-1'}>
          {/* Name + Status */}
          <div className="flex items-center gap-2">
            {editingProjectId === p.projectId ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRenameProject(p.projectId)}
                  className="rounded border border-slate-600 bg-slate-900 px-2 py-0.5 text-xs text-white"
                  autoFocus
                />
                <button
                  onClick={() => handleRenameProject(p.projectId)}
                  className="rounded p-0.5 text-emerald-400 hover:bg-emerald-500/20"
                >
                  <CheckCircle2 size={14} />
                </button>
                <button
                  onClick={() => setEditingProjectId(null)}
                  className="rounded p-0.5 text-red-400 hover:bg-red-500/20"
                >
                  <XCircle size={14} />
                </button>
              </div>
            ) : (
              <span className="truncate text-sm font-medium text-white">{p.name}</span>
            )}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${statusColor(p.status)}`}>
              {p.status}
            </span>
            {p.isFavorite && <Star size={12} className="fill-amber-400 text-amber-400" />}
            {p.isPinned && <Pin size={12} className="text-blue-400" />}
          </div>

          {/* Description */}
          {p.description && (
            <p className="mt-1 truncate text-xs text-slate-400">{p.description}</p>
          )}

          {/* Metadata */}
          <div className="mt-1.5 flex items-center gap-3 text-[10px] text-slate-500">
            <span>Modified {formatTimestamp(p.modifiedAt)}</span>
            {p.healthScore > 0 && (
              <span className={healthColor(p.healthScore)}>
                Health: {p.healthScore}%
              </span>
            )}
            {p.complexity > 0 && <span>{complexityLabel(p.complexity)}</span>}
          </div>

          {/* Tags */}
          {p.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {p.tags.map((tag, i) => (
                <span
                  key={i}
                  className="rounded-full bg-slate-700/50 px-1.5 py-0.5 text-[10px] text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className={`flex items-center gap-1 ${viewMode === 'GRID' ? 'mt-2' : ''}`}>
            <button
              onClick={() => handleToggleFavorite(p.projectId, p.isFavorite)}
              className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-amber-400"
              title={p.isFavorite ? 'Remove favorite' : 'Add favorite'}
            >
              <Heart size={13} className={p.isFavorite ? 'fill-amber-400 text-amber-400' : ''} />
            </button>
            <button
              onClick={() => handleTogglePin(p.projectId, p.isPinned)}
              className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-blue-400"
              title={p.isPinned ? 'Unpin' : 'Pin'}
            >
              <Pin size={13} className={p.isPinned ? 'text-blue-400' : ''} />
            </button>
            <button
              onClick={() => {
                setEditingProjectId(p.projectId);
                setEditName(p.name);
              }}
              className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
              title="Rename"
            >
              <Edit3 size={13} />
            </button>
            <button
              onClick={() => handleDuplicateProject(p.projectId)}
              className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-blue-400"
              title="Duplicate"
            >
              <Copy size={13} />
            </button>
            {p.status === 'ARCHIVED' ? (
              <button
                onClick={() => handleUnarchiveProject(p.projectId)}
                className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-emerald-400"
                title="Unarchive"
              >
                <ArchiveRestore size={13} />
              </button>
            ) : (
              <button
                onClick={() => handleArchiveProject(p.projectId)}
                className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-amber-400"
                title="Archive"
              >
                <Archive size={13} />
              </button>
            )}
            <button
              onClick={() => handleExport(p.projectId)}
              className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-purple-400"
              title="Export"
            >
              <Download size={13} />
            </button>
            <button
              onClick={() => handleDeleteProject(p.projectId)}
              className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-red-400"
              title="Delete"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
    ),
    [
      viewMode,
      editingProjectId,
      editName,
      handleRenameProject,
      handleToggleFavorite,
      handleTogglePin,
      handleDuplicateProject,
      handleArchiveProject,
      handleUnarchiveProject,
      handleExport,
      handleDeleteProject,
    ],
  );

  // ─── Render: Tab Content ──────────────────────────────────────

  const renderProjectsTab = () => (
    <div className="space-y-3">
      {/* Search + Controls */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search projects…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-900 py-1 pl-7 pr-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <button
          onClick={() => setViewMode(viewMode === 'GRID' ? 'LIST' : 'GRID')}
          className="rounded p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white"
          title={viewMode === 'GRID' ? 'List view' : 'Grid view'}
        >
          {viewMode === 'GRID' ? <List size={14} /> : <Grid3x3 size={14} />}
        </button>
        <button
          onClick={() => setShowNewProjectForm(!showNewProjectForm)}
          className="flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-500"
        >
          <Plus size={12} /> New
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Filter size={11} className="text-slate-500" />
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`rounded-full px-2 py-0.5 text-[10px] transition-colors ${
                statusFilter === f.id
                  ? 'bg-blue-600/30 text-blue-400'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <SortAsc size={11} className="text-slate-500" />
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-300"
          >
            {SORT_FIELDS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* New Project Form */}
      {showNewProjectForm && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-slate-800/80 p-2">
          <input
            type="text"
            placeholder="Project name…"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
            className="flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            autoFocus
          />
          <button
            onClick={handleCreateProject}
            disabled={isLoading || !newProjectName.trim()}
            className="rounded bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            Create
          </button>
          <button
            onClick={() => setShowNewProjectForm(false)}
            className="rounded p-1 text-slate-400 hover:text-white"
          >
            <XCircle size={14} />
          </button>
        </div>
      )}

      {/* Project List/Grid */}
      <div
        className={
          viewMode === 'GRID'
            ? 'grid grid-cols-2 gap-2'
            : 'max-h-[400px] space-y-1.5 overflow-y-auto'
        }
      >
        {projects.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-700 py-8 text-center text-xs text-slate-500">
            <FolderOpen size={24} className="mx-auto mb-2 text-slate-600" />
            No projects found
          </div>
        )}
        {projects.map((p) => renderProjectCard(p))}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-[10px] text-slate-500">
        <span>{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
        <span>
          {projects.filter((p) => p.isFavorite).length} favorites ·{' '}
          {projects.filter((p) => p.isPinned).length} pinned
        </span>
      </div>
    </div>
  );

  const renderTemplatesTab = () => (
    <div className="space-y-3">
      {/* Category Filters */}
      <div className="flex flex-wrap items-center gap-1">
        {TEMPLATE_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setTemplateCategory(c.id)}
            className={`rounded-full px-2.5 py-0.5 text-[10px] transition-colors ${
              templateCategory === c.id
                ? 'bg-purple-600/30 text-purple-400'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Template Cards */}
      <div className="max-h-[420px] space-y-2 overflow-y-auto">
        {templates.map((tpl) => (
          <div
            key={tpl.templateId}
            className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-3 transition-all hover:border-purple-500/30"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{tpl.name}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${difficultyColor(
                      tpl.difficulty,
                    )}`}
                  >
                    {tpl.difficulty}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">{tpl.description}</p>
                <div className="mt-1.5 flex items-center gap-3 text-[10px] text-slate-500">
                  <span className="flex items-center gap-0.5">
                    <Cpu size={10} /> {tpl.componentCount} components
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Zap size={10} /> {tpl.wireCount} wires
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Clock size={10} /> ~{tpl.estimatedTimeMinutes}min
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleLaunchTemplate(tpl.templateId)}
                disabled={isLoading}
                className="flex items-center gap-1 rounded bg-purple-600 px-2.5 py-1 text-xs text-white transition-colors hover:bg-purple-500 disabled:opacity-50"
              >
                <Rocket size={12} /> Launch
              </button>
            </div>
          </div>
        ))}
        {templates.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-700 py-8 text-center text-xs text-slate-500">
            <LayoutTemplate size={24} className="mx-auto mb-2 text-slate-600" />
            No templates match the filter
          </div>
        )}
      </div>

      <div className="text-[10px] text-slate-500">
        {templates.length} template{templates.length !== 1 ? 's' : ''} available
      </div>
    </div>
  );

  const renderRecentTab = () => (
    <div className="space-y-3">
      {/* Pinned Section */}
      {pinnedProjects.length > 0 && (
        <div>
          <h4 className="mb-1.5 flex items-center gap-1 text-xs font-medium text-blue-400">
            <Pin size={12} /> Pinned Projects
          </h4>
          <div className="space-y-1.5">
            {pinnedProjects.map((p: ProjectInfo) => renderProjectCard(p, false))}
          </div>
        </div>
      )}

      {/* Recent Section */}
      <div>
        <h4 className="mb-1.5 flex items-center gap-1 text-xs font-medium text-slate-300">
          <Clock size={12} /> Recently Modified
        </h4>
        <div className="max-h-[350px] space-y-1.5 overflow-y-auto">
          {recentProjects.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-700 py-6 text-center text-xs text-slate-500">
              <Clock size={24} className="mx-auto mb-2 text-slate-600" />
              No recent projects
            </div>
          )}
          {recentProjects.map((p: ProjectInfo) => renderProjectCard(p))}
        </div>
      </div>
    </div>
  );

  const renderFoldersTab = () => (
    <div className="space-y-3">
      {/* New Folder */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowNewFolderForm(!showNewFolderForm)}
          className="flex items-center gap-1 rounded bg-slate-700 px-2 py-1 text-xs text-white hover:bg-slate-600"
        >
          <FolderPlus size={12} /> New Folder
        </button>
      </div>

      {showNewFolderForm && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-slate-800/80 p-2">
          <input
            type="text"
            placeholder="Folder name…"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            className="flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            autoFocus
          />
          <button
            onClick={handleCreateFolder}
            disabled={!newFolderName.trim()}
            className="rounded bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            Create
          </button>
          <button
            onClick={() => setShowNewFolderForm(false)}
            className="rounded p-1 text-slate-400 hover:text-white"
          >
            <XCircle size={14} />
          </button>
        </div>
      )}

      {/* Folder Tree */}
      <div className="max-h-[400px] space-y-1 overflow-y-auto">
        {folders.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-700 py-8 text-center text-xs text-slate-500">
            <FolderTree size={24} className="mx-auto mb-2 text-slate-600" />
            No folders created yet
          </div>
        )}
        {folders.map((folder: FolderInfo) => (
          <div key={folder.folderId} className="rounded-lg border border-slate-700/50 bg-slate-800/50">
            <button
              onClick={() =>
                setExpandedFolderId(expandedFolderId === folder.folderId ? null : folder.folderId)
              }
              className="flex w-full items-center gap-2 rounded-t-lg p-2 text-left hover:bg-slate-700/30"
            >
              {expandedFolderId === folder.folderId ? (
                <ChevronDown size={12} className="text-slate-400" />
              ) : (
                <ChevronRight size={12} className="text-slate-400" />
              )}
              <FolderOpen size={14} style={{ color: folder.color }} />
              <span className="flex-1 text-xs font-medium text-white">{folder.name}</span>
              <span className="text-[10px] text-slate-500">
                {folder.projectIds.length} project{folder.projectIds.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteFolder(folder.folderId);
                }}
                className="rounded p-0.5 text-slate-500 hover:text-red-400"
              >
                <Trash2 size={11} />
              </button>
            </button>
            {expandedFolderId === folder.folderId && (
              <div className="border-t border-slate-700/50 p-2">
                {folder.projectIds.length === 0 ? (
                  <p className="py-2 text-center text-[10px] text-slate-500">Empty folder</p>
                ) : (
                  <div className="space-y-1">
                    {folder.projectIds.map((pid: string) => {
                      const p = projects.find((proj) => proj.projectId === pid);
                      if (!p) return null;
                      return renderProjectCard(p, false);
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tags Section */}
      {tags.length > 0 && (
        <div>
          <h4 className="mb-1.5 flex items-center gap-1 text-xs font-medium text-slate-300">
            <Tag size={12} /> Tags
          </h4>
          <div className="flex flex-wrap gap-1">
            {tags.map((tag: TagInfo) => (
              <span
                key={tag.tagId}
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
              >
                {tag.name} ({tag.projectIds.length})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderImportExportTab = () => (
    <div className="space-y-4">
      {/* Export Section */}
      <div>
        <h4 className="mb-2 flex items-center gap-1 text-xs font-medium text-slate-300">
          <Download size={12} /> Export Project
        </h4>
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-3">
          <div className="mb-2 flex items-center gap-2">
            <label className="text-[10px] text-slate-400">Format:</label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs text-slate-300"
            >
              <option value="STEMVERSE">STEMVerse (.stemverse)</option>
              <option value="JSON">JSON (.json)</option>
            </select>
          </div>
          <p className="text-[10px] text-slate-500">
            Use the export button on any project card to download it.
          </p>
        </div>
      </div>

      {/* Import Section */}
      <div>
        <h4 className="mb-2 flex items-center gap-1 text-xs font-medium text-slate-300">
          <Upload size={12} /> Import Project
        </h4>
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-3 space-y-2">
          <textarea
            placeholder="Paste project data here (JSON or STEMVerse format)…"
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            rows={4}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleImport}
              disabled={isLoading || !importData.trim()}
              className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-500 disabled:opacity-50"
            >
              <Upload size={12} /> {isLoading ? 'Importing…' : 'Import'}
            </button>
            <label className="flex cursor-pointer items-center gap-1 rounded bg-slate-700 px-3 py-1 text-xs text-white hover:bg-slate-600">
              <FileJson size={12} /> Load File
              <input
                type="file"
                accept=".json,.stemverse"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      setImportData(reader.result as string);
                    };
                    reader.readAsText(file);
                  }
                }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Import Result */}
      {importResult && (
        <div
          className={`rounded-lg border p-3 ${
            importResult.success
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : 'border-red-500/30 bg-red-500/10'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs">
            {importResult.success ? (
              <CheckCircle2 size={14} className="text-emerald-400" />
            ) : (
              <XCircle size={14} className="text-red-400" />
            )}
            <span className={importResult.success ? 'text-emerald-400' : 'text-red-400'}>
              {importResult.success ? 'Import successful' : 'Import failed'}
            </span>
          </div>
          {importResult.validationErrors.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {importResult.validationErrors.map((err, i) => (
                <p key={i} className="text-[10px] text-red-300">
                  • {err}
                </p>
              ))}
            </div>
          )}
          {importResult.warnings.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {importResult.warnings.map((w, i) => (
                <p key={i} className="flex items-center gap-1 text-[10px] text-amber-300">
                  <AlertTriangle size={10} /> {w}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

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
        <FolderOpen size={16} className="text-blue-400" />
        <span className="flex-1 text-sm font-semibold text-white">Project Library</span>
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
            {LIBRARY_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600/30 text-blue-400'
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
          {activeTab === 'projects' && renderProjectsTab()}
          {activeTab === 'templates' && renderTemplatesTab()}
          {activeTab === 'recent' && renderRecentTab()}
          {activeTab === 'folders' && renderFoldersTab()}
          {activeTab === 'import-export' && renderImportExportTab()}
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-slate-800 px-4 py-2 text-xs text-white shadow-lg border border-slate-600">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
