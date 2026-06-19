'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Link2,
  Shield,
  Eye,
  GitBranch,
  Globe,
  Share2,
  ChevronDown,
  ChevronRight,
  Search,
  RefreshCw,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  Trash2,
  Star,
  Tag,
  Users,
  Layers,
  Zap,
  LockKeyhole,
  BookOpen,
  Timer,
  Activity,
  Download,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// Phase 30B: Project Sharing Panel
// Sharing control panel with link generation, permissions,
// visibility, forks, and template publishing. Follows the
// project-library-panel component pattern.
// ═══════════════════════════════════════════════════════════════

export interface ProjectSharingPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runtime: any;
}

// ─── Tab & Filter Types ─────────────────────────────────────────

type SharingTabId = 'share-link' | 'permissions' | 'visibility' | 'forks' | 'publishing';

type LinkFilter = 'ALL' | 'ACTIVE' | 'EXPIRED' | 'EXHAUSTED';
type PermissionRoleFilter = 'ALL' | 'OWNER' | 'TEACHER' | 'ASSISTANT' | 'STUDENT' | 'VIEWER';
type PublishStatusFilter = 'ALL' | 'DRAFT' | 'PUBLISHED' | 'FEATURED' | 'UNPUBLISHED';

// ─── Internal Interfaces ────────────────────────────────────────

interface ShareInfo {
  shareId: string;
  projectId: string;
  visibility: string;
  accessLevel: string;
  sharedAt: number;
  linkCount: number;
  permissionCount: number;
  allowForking: boolean;
  allowComments: boolean;
  ownerId: string;
}

interface LinkInfo {
  linkId: string;
  shareId: string;
  token: string;
  createdAt: number;
  expiresAt: number;
  useCount: number;
  maxUses: number;
  isActive: boolean;
  createdBy: string;
}

interface PermissionInfo {
  permissionId: string;
  shareId: string;
  userId: string;
  role: string;
  grantedAt: number;
  grantedBy: string;
}

interface ForkInfo {
  forkId: string;
  sourceProjectId: string;
  forkedProjectId: string;
  forkedBy: string;
  forkedAt: number;
  forkType: string;
}

interface PublishInfo {
  publishId: string;
  templateId: string;
  projectId: string;
  publishedBy: string;
  publishStatus: string;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  cloneCount: number;
  rating: number;
  publishedAt: number;
  featuredAt: number;
}

// ─── Tab Definitions ────────────────────────────────────────────

const SHARING_TABS: { id: SharingTabId; label: string; icon: typeof Share2 }[] = [
  { id: 'share-link', label: 'Share Link', icon: Link2 },
  { id: 'permissions', label: 'Permissions', icon: Shield },
  { id: 'visibility', label: 'Visibility', icon: Eye },
  { id: 'forks', label: 'Forks', icon: GitBranch },
  { id: 'publishing', label: 'Publishing', icon: Globe },
];

const LINK_FILTERS: { id: LinkFilter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'EXPIRED', label: 'Expired' },
  { id: 'EXHAUSTED', label: 'Exhausted' },
];

const PERMISSION_ROLE_FILTERS: { id: PermissionRoleFilter; label: string }[] = [
  { id: 'ALL', label: 'All Roles' },
  { id: 'OWNER', label: 'Owner' },
  { id: 'TEACHER', label: 'Teacher' },
  { id: 'STUDENT', label: 'Student' },
  { id: 'VIEWER', label: 'Viewer' },
];

const PUBLISH_STATUS_FILTERS: { id: PublishStatusFilter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'DRAFT', label: 'Draft' },
  { id: 'PUBLISHED', label: 'Published' },
  { id: 'FEATURED', label: 'Featured' },
  { id: 'UNPUBLISHED', label: 'Unpublished' },
];

const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC', label: 'Public', desc: 'Anyone can view this project', icon: Globe, color: 'text-emerald-400' },
  { value: 'PRIVATE', label: 'Private', desc: 'Only you and permitted users', icon: Lock, color: 'text-amber-400' },
  { value: 'CLASSROOM_ONLY', label: 'Classroom Only', desc: 'Only classroom members', icon: BookOpen, color: 'text-indigo-400' },
];

const ACCESS_LEVEL_OPTIONS = [
  { value: 'READ_ONLY', label: 'Read Only', desc: 'Can view but not edit', icon: Eye },
  { value: 'EDITABLE', label: 'Editable', desc: 'Can view and edit', icon: Layers },
  { value: 'TEMPLATE_SHARE', label: 'Template', desc: 'Can clone as template', icon: Copy },
];



// ─── Utility Functions ──────────────────────────────────────────

function formatTimestamp(ts: number): string {
  if (!ts) return '—';
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return 'Just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  if (diff < 604800_000) return `${Math.floor(diff / 86400_000)}d ago`;
  return new Date(ts).toLocaleDateString();
}

function formatExpiry(ts: number): { text: string; isExpired: boolean; isSoon: boolean } {
  if (!ts) return { text: 'No expiry', isExpired: false, isSoon: false };
  const now = Date.now();
  const diff = ts - now;
  if (diff < 0) return { text: 'Expired', isExpired: true, isSoon: false };
  if (diff < 3600_000) return { text: `${Math.floor(diff / 60_000)}m left`, isExpired: false, isSoon: true };
  if (diff < 86400_000) return { text: `${Math.floor(diff / 3600_000)}h left`, isExpired: false, isSoon: true };
  return { text: `${Math.floor(diff / 86400_000)}d left`, isExpired: false, isSoon: false };
}

function linkStatusBadge(link: LinkInfo): { text: string; color: string } {
  if (!link.isActive) return { text: 'Deactivated', color: 'text-red-400 bg-red-500/20' };
  const expiry = formatExpiry(link.expiresAt);
  if (expiry.isExpired) return { text: 'Expired', color: 'text-red-400 bg-red-500/20' };
  if (link.useCount >= link.maxUses) return { text: 'Exhausted', color: 'text-amber-400 bg-amber-500/20' };
  if (expiry.isSoon) return { text: 'Expiring', color: 'text-amber-400 bg-amber-500/20' };
  return { text: 'Active', color: 'text-emerald-400 bg-emerald-500/20' };
}

function publishStatusColor(status: string): string {
  switch (status) {
    case 'DRAFT':
      return 'text-slate-400 bg-slate-500/20';
    case 'PUBLISHED':
      return 'text-emerald-400 bg-emerald-500/20';
    case 'FEATURED':
      return 'text-amber-400 bg-amber-500/20';
    case 'UNPUBLISHED':
      return 'text-red-400 bg-red-500/20';
    default:
      return 'text-slate-400 bg-slate-500/20';
  }
}

function difficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'BEGINNER':
      return 'text-emerald-400';
    case 'INTERMEDIATE':
      return 'text-cyan-400';
    case 'ADVANCED':
      return 'text-amber-400';
    case 'EXPERT':
      return 'text-red-400';
    default:
      return 'text-slate-400';
  }
}

function roleColor(role: string): string {
  switch (role) {
    case 'OWNER':
      return 'text-amber-400 bg-amber-500/20';
    case 'TEACHER':
      return 'text-indigo-400 bg-indigo-500/20';
    case 'ASSISTANT':
      return 'text-violet-400 bg-violet-500/20';
    case 'STUDENT':
      return 'text-emerald-400 bg-emerald-500/20';
    case 'VIEWER':
      return 'text-slate-400 bg-slate-500/20';
    default:
      return 'text-slate-400 bg-slate-500/20';
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - half);
}

// ─── Component ──────────────────────────────────────────────────

export function ProjectSharingPanel({ runtime }: ProjectSharingPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<SharingTabId>('share-link');
  const [searchQuery, setSearchQuery] = useState('');
  const [linkFilter, setLinkFilter] = useState<LinkFilter>('ALL');
  const [permissionRoleFilter, setPermissionRoleFilter] = useState<PermissionRoleFilter>('ALL');
  const [publishStatusFilter, setPublishStatusFilter] = useState<PublishStatusFilter>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // ─── Compute data from runtime ────────────────────────────────

  const shares = useMemo(() => {
    const defaultList: ShareInfo[] = [];
    if (!runtime?.projectSharingSynchronizer) return defaultList;
    try {
      const allShares = runtime.projectSharingSynchronizer.getAllShares?.() || [];
      const allLinks = runtime.projectSharingSynchronizer.getAllLinks?.() || [];
      const allPerms = runtime.projectSharingSynchronizer.getAllPermissions?.() || [];

      return allShares.map((s: ShareInfo) => ({
        shareId: s.shareId || '',
        projectId: s.projectId || '',
        visibility: s.visibility || 'PRIVATE',
        accessLevel: s.accessLevel || 'READ_ONLY',
        sharedAt: s.sharedAt ?? 0,
        linkCount: allLinks.filter((l: { shareId: string }) => l.shareId === s.shareId).length,
        permissionCount: allPerms.filter((p: { shareId: string }) => p.shareId === s.shareId).length,
        allowForking: s.allowForking ?? false,
        allowComments: s.allowComments ?? true,
        ownerId: s.ownerId || '',
      }));
    } catch {
      return defaultList;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, refreshKey]);

  const activeShare = useMemo(() => shares[0] || null, [shares]);

  const links = useMemo(() => {
    const defaultList: LinkInfo[] = [];
    if (!runtime?.projectSharingSynchronizer) return defaultList;
    try {
      const allLinks = runtime.projectSharingSynchronizer.getAllLinks?.() || [];
      let mapped: LinkInfo[] = allLinks.map((l: LinkInfo) => ({
        linkId: l.linkId || '',
        shareId: l.shareId || '',
        token: l.token || '',
        createdAt: l.createdAt ?? 0,
        expiresAt: l.expiresAt ?? 0,
        useCount: l.useCount ?? 0,
        maxUses: l.maxUses ?? 100,
        isActive: l.isActive ?? true,
        createdBy: l.createdBy || '',
      }));

      if (activeShare) {
        mapped = mapped.filter((l: LinkInfo) => l.shareId === activeShare.shareId);
      }

      if (linkFilter === 'ACTIVE') {
        mapped = mapped.filter((l: LinkInfo) => {
          const status = linkStatusBadge(l);
          return status.text === 'Active';
        });
      } else if (linkFilter === 'EXPIRED') {
        mapped = mapped.filter((l: LinkInfo) => {
          const status = linkStatusBadge(l);
          return status.text === 'Expired' || status.text === 'Deactivated';
        });
      } else if (linkFilter === 'EXHAUSTED') {
        mapped = mapped.filter((l: LinkInfo) => l.useCount >= l.maxUses);
      }

      mapped.sort((a: LinkInfo, b: LinkInfo) => b.createdAt - a.createdAt);
      return mapped;
    } catch {
      return defaultList;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, refreshKey, activeShare, linkFilter]);

  const permissions = useMemo(() => {
    const defaultList: PermissionInfo[] = [];
    if (!runtime?.projectSharingSynchronizer) return defaultList;
    try {
      const allPerms = runtime.projectSharingSynchronizer.getAllPermissions?.() || [];
      let mapped: PermissionInfo[] = allPerms.map((p: PermissionInfo) => ({
        permissionId: p.permissionId || '',
        shareId: p.shareId || '',
        userId: p.userId || '',
        role: p.role || 'VIEWER',
        grantedAt: p.grantedAt ?? 0,
        grantedBy: p.grantedBy || '',
      }));

      if (activeShare) {
        mapped = mapped.filter((p: PermissionInfo) => p.shareId === activeShare.shareId);
      }

      if (permissionRoleFilter !== 'ALL') {
        mapped = mapped.filter((p: PermissionInfo) => p.role === permissionRoleFilter);
      }

      if (searchQuery && activeTab === 'permissions') {
        const q = searchQuery.toLowerCase();
        mapped = mapped.filter((p: PermissionInfo) => p.userId.toLowerCase().includes(q));
      }

      return mapped;
    } catch {
      return defaultList;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, refreshKey, activeShare, permissionRoleFilter, searchQuery, activeTab]);

  const forks = useMemo(() => {
    const defaultList: ForkInfo[] = [];
    if (!runtime?.collaborationSynchronizer) return defaultList;
    try {
      const allForks = runtime.collaborationSynchronizer.getAllForks?.() || [];
      const mapped: ForkInfo[] = allForks.map((f: ForkInfo) => ({
        forkId: f.forkId || '',
        sourceProjectId: f.sourceProjectId || '',
        forkedProjectId: f.forkedProjectId || '',
        forkedBy: f.forkedBy || '',
        forkedAt: f.forkedAt ?? 0,
        forkType: f.forkType || 'PROJECT',
      }));

      return mapped.sort((a: ForkInfo, b: ForkInfo) => b.forkedAt - a.forkedAt);
    } catch {
      return defaultList;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, refreshKey]);

  const publishedTemplates = useMemo(() => {
    const defaultList: PublishInfo[] = [];
    if (!runtime?.collaborationSynchronizer) return defaultList;
    try {
      const all = runtime.collaborationSynchronizer.getAllPublishedTemplates?.() || [];
      let mapped: PublishInfo[] = all.map((t: PublishInfo) => ({
        publishId: t.publishId || '',
        templateId: t.templateId || '',
        projectId: t.projectId || '',
        publishedBy: t.publishedBy || '',
        publishStatus: t.publishStatus || 'DRAFT',
        title: t.title || 'Untitled',
        description: t.description || '',
        difficulty: t.difficulty || 'BEGINNER',
        category: t.category || '',
        cloneCount: t.cloneCount ?? 0,
        rating: t.rating ?? 0,
        publishedAt: t.publishedAt ?? 0,
        featuredAt: t.featuredAt ?? 0,
      }));

      if (publishStatusFilter !== 'ALL') {
        mapped = mapped.filter((t: PublishInfo) => t.publishStatus === publishStatusFilter);
      }

      return mapped.sort((a: PublishInfo, b: PublishInfo) => b.publishedAt - a.publishedAt);
    } catch {
      return defaultList;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, refreshKey, publishStatusFilter]);

  // ─── Actions ──────────────────────────────────────────────────

  const handleCopyToken = useCallback(
    (token: string) => {
      try {
        const shareUrl = `stemverse://share/${token}`;
        navigator.clipboard.writeText(shareUrl);
        setCopiedToken(token);
        showToast('Share link copied!');
        setTimeout(() => setCopiedToken(null), 2000);
      } catch {
        showToast('Failed to copy');
      }
    },
    [showToast]
  );

  const handleDeactivateLink = useCallback(
    (linkId: string) => {
      if (!runtime?.projectSharingSynchronizer) return;
      try {
        runtime.projectSharingSynchronizer.deactivateShareLink?.(linkId);
        showToast('Link deactivated');
        refresh();
      } catch {
        showToast('Failed to deactivate');
      }
    },
    [runtime, showToast, refresh]
  );

  const handleRevokePermission = useCallback(
    (permissionId: string) => {
      if (!runtime?.projectSharingSynchronizer) return;
      try {
        runtime.projectSharingSynchronizer.revokePermission?.(permissionId);
        showToast('Permission revoked');
        refresh();
      } catch {
        showToast('Failed to revoke');
      }
    },
    [runtime, showToast, refresh]
  );

  // ─── Tab Renderers ────────────────────────────────────────────

  const renderShareLinkTab = () => {
    const activeLinks = links.filter((l: LinkInfo) => {
      const status = linkStatusBadge(l);
      return status.text === 'Active';
    });

    return (
      <div className="space-y-3">
        {/* Stats */}
        <div className="flex gap-2">
          <div className="flex-1 bg-slate-800/60 rounded-md px-3 py-2 flex items-center gap-2">
            <Link2 className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs text-slate-400">Total Links</span>
            <span className="text-xs font-bold text-slate-200 ml-auto">{links.length}</span>
          </div>
          <div className="flex-1 bg-slate-800/60 rounded-md px-3 py-2 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-slate-400">Active</span>
            <span className="text-xs font-bold text-emerald-400 ml-auto">{activeLinks.length}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 flex-wrap">
          {LINK_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setLinkFilter(f.id)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                linkFilter === f.id
                  ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Link list */}
        <div className="space-y-1.5">
          {links.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              <Link2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No share links created yet
            </div>
          ) : (
            links.map((l: LinkInfo) => {
              const status = linkStatusBadge(l);
              const expiry = formatExpiry(l.expiresAt);
              const isCopied = copiedToken === l.token;

              return (
                <div
                  key={l.linkId}
                  className="px-3 py-2.5 bg-slate-800/40 rounded-md hover:bg-slate-800/70 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Link2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                    <span className="text-xs font-mono text-slate-300 flex-1 truncate">
                      stemverse://share/{l.token.slice(0, 8)}...
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${status.color}`}>
                      {status.text}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 mb-1.5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimestamp(l.createdAt)}
                    </span>
                    <span className={`flex items-center gap-1 ${expiry.isExpired ? 'text-red-400' : expiry.isSoon ? 'text-amber-400' : ''}`}>
                      <Timer className="w-3 h-3" />
                      {expiry.text}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {l.useCount}/{l.maxUses} uses
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleCopyToken(l.token)}
                      className={`flex-1 px-2 py-1 rounded text-[10px] font-medium transition-colors flex items-center justify-center gap-1 ${
                        isCopied
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                          : 'bg-purple-500/10 text-purple-300 border border-purple-500/30 hover:bg-purple-500/20'
                      }`}
                    >
                      <Copy className="w-3 h-3" />
                      {isCopied ? 'Copied!' : 'Copy Link'}
                    </button>
                    {l.isActive && (
                      <button
                        onClick={() => handleDeactivateLink(l.linkId)}
                        className="px-2 py-1 rounded text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors"
                      >
                        <XCircle className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {/* Usage bar */}
                  <div className="mt-1.5 w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        l.useCount >= l.maxUses ? 'bg-red-500' : l.useCount > l.maxUses * 0.8 ? 'bg-amber-500' : 'bg-purple-500'
                      }`}
                      style={{ width: `${Math.min((l.useCount / l.maxUses) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderPermissionsTab = () => {
    return (
      <div className="space-y-3">
        {/* Stats */}
        <div className="flex gap-2">
          <div className="flex-1 bg-slate-800/60 rounded-md px-3 py-2 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs text-slate-400">Permissions</span>
            <span className="text-xs font-bold text-slate-200 ml-auto">{permissions.length}</span>
          </div>
        </div>

        {/* Filter + Search */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search users..."
              value={activeTab === 'permissions' ? searchQuery : ''}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>
          <select
            value={permissionRoleFilter}
            onChange={(e) => setPermissionRoleFilter(e.target.value as PermissionRoleFilter)}
            className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
          >
            {PERMISSION_ROLE_FILTERS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Permission list */}
        <div className="space-y-1">
          {permissions.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No permissions granted
            </div>
          ) : (
            permissions.map((p: PermissionInfo) => (
              <div
                key={p.permissionId}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800/40 rounded-md hover:bg-slate-800/70 transition-colors group"
              >
                <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center">
                  <Shield className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-200 truncate">{p.userId}</div>
                  <div className="text-[10px] text-slate-500">
                    Granted by {p.grantedBy} · {formatTimestamp(p.grantedAt)}
                  </div>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${roleColor(p.role)}`}>
                  {p.role}
                </span>
                <button
                  onClick={() => handleRevokePermission(p.permissionId)}
                  className="hidden group-hover:block p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-red-400 transition-colors"
                  title="Revoke permission"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderVisibilityTab = () => {
    return (
      <div className="space-y-3">
        {/* Current visibility */}
        <div className="bg-slate-800/60 rounded-lg p-3">
          <div className="text-xs font-medium text-slate-300 mb-3 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-purple-400" />
            Project Visibility
          </div>
          <div className="space-y-1.5">
            {VISIBILITY_OPTIONS.map((opt) => {
              const isSelected = activeShare?.visibility === opt.value;
              const OptIcon = opt.icon;
              return (
                <div
                  key={opt.value}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-purple-500/10 border border-purple-500/30'
                      : 'bg-slate-800/30 border border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <OptIcon className={`w-4 h-4 ${isSelected ? opt.color : 'text-slate-500'}`} />
                  <div className="flex-1">
                    <div className={`text-xs font-medium ${isSelected ? 'text-slate-200' : 'text-slate-400'}`}>
                      {opt.label}
                    </div>
                    <div className="text-[10px] text-slate-500">{opt.desc}</div>
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Access level */}
        <div className="bg-slate-800/60 rounded-lg p-3">
          <div className="text-xs font-medium text-slate-300 mb-3 flex items-center gap-1.5">
            <LockKeyhole className="w-3.5 h-3.5 text-fuchsia-400" />
            Default Access Level
          </div>
          <div className="space-y-1.5">
            {ACCESS_LEVEL_OPTIONS.map((opt) => {
              const isSelected = activeShare?.accessLevel === opt.value;
              const OptIcon = opt.icon;
              return (
                <div
                  key={opt.value}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-fuchsia-500/10 border border-fuchsia-500/30'
                      : 'bg-slate-800/30 border border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <OptIcon className={`w-4 h-4 ${isSelected ? 'text-fuchsia-400' : 'text-slate-500'}`} />
                  <div className="flex-1">
                    <div className={`text-xs font-medium ${isSelected ? 'text-slate-200' : 'text-slate-400'}`}>
                      {opt.label}
                    </div>
                    <div className="text-[10px] text-slate-500">{opt.desc}</div>
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-fuchsia-400" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Toggles */}
        <div className="bg-slate-800/60 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs text-slate-300">Allow Forking</span>
            </div>
            <div className={`w-8 h-4 rounded-full flex items-center px-0.5 cursor-pointer transition-colors ${
              activeShare?.allowForking ? 'bg-emerald-500' : 'bg-slate-600'
            }`}>
              <div className={`w-3 h-3 rounded-full bg-white transition-transform ${
                activeShare?.allowForking ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </div>
          </div>
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs text-slate-300">Allow Comments</span>
            </div>
            <div className={`w-8 h-4 rounded-full flex items-center px-0.5 cursor-pointer transition-colors ${
              activeShare?.allowComments ? 'bg-emerald-500' : 'bg-slate-600'
            }`}>
              <div className={`w-3 h-3 rounded-full bg-white transition-transform ${
                activeShare?.allowComments ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderForksTab = () => {
    return (
      <div className="space-y-3">
        {/* Stats */}
        <div className="flex gap-2">
          <div className="flex-1 bg-slate-800/60 rounded-md px-3 py-2 flex items-center gap-2">
            <GitBranch className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs text-slate-400">Total Forks</span>
            <span className="text-xs font-bold text-slate-200 ml-auto">{forks.length}</span>
          </div>
          <div className="flex-1 bg-slate-800/60 rounded-md px-3 py-2 flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs text-slate-400">Types</span>
            <span className="text-xs font-bold text-slate-200 ml-auto">
              {new Set(forks.map((f: ForkInfo) => f.forkType)).size}
            </span>
          </div>
        </div>

        {/* Fork list */}
        <div className="space-y-1.5">
          {forks.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No forks yet
            </div>
          ) : (
            forks.map((f: ForkInfo) => (
              <div
                key={f.forkId}
                className="px-3 py-2.5 bg-slate-800/40 rounded-md hover:bg-slate-800/70 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <GitBranch className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs font-medium text-slate-200 truncate flex-1">
                    {f.sourceProjectId.slice(0, 8)} → {f.forkedProjectId.slice(0, 8)}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-400 font-medium">
                    {f.forkType}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {f.forkedBy || 'Unknown'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(f.forkedAt)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderPublishingTab = () => {
    return (
      <div className="space-y-3">
        {/* Stats */}
        <div className="flex gap-2">
          <div className="flex-1 bg-slate-800/60 rounded-md px-3 py-2 flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs text-slate-400">Published</span>
            <span className="text-xs font-bold text-slate-200 ml-auto">
              {publishedTemplates.filter((t: PublishInfo) => t.publishStatus === 'PUBLISHED' || t.publishStatus === 'FEATURED').length}
            </span>
          </div>
          <div className="flex-1 bg-slate-800/60 rounded-md px-3 py-2 flex items-center gap-2">
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-slate-400">Featured</span>
            <span className="text-xs font-bold text-amber-400 ml-auto">
              {publishedTemplates.filter((t: PublishInfo) => t.publishStatus === 'FEATURED').length}
            </span>
          </div>
          <div className="flex-1 bg-slate-800/60 rounded-md px-3 py-2 flex items-center gap-2">
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-slate-400">Clones</span>
            <span className="text-xs font-bold text-slate-200 ml-auto">
              {publishedTemplates.reduce((sum: number, t: PublishInfo) => sum + t.cloneCount, 0)}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 flex-wrap">
          {PUBLISH_STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setPublishStatusFilter(f.id)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                publishStatusFilter === f.id
                  ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Template list */}
        <div className="space-y-1.5">
          {publishedTemplates.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              <Globe className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No published templates
            </div>
          ) : (
            publishedTemplates.map((t: PublishInfo) => (
              <div
                key={t.publishId}
                className="px-3 py-2.5 bg-slate-800/40 rounded-md hover:bg-slate-800/70 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-slate-200 flex-1 truncate">{t.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${publishStatusColor(t.publishStatus)}`}>
                    {t.publishStatus}
                  </span>
                </div>
                {t.description && (
                  <p className="text-[10px] text-slate-500 mb-1.5 line-clamp-1">{t.description}</p>
                )}
                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                  <span className={`flex items-center gap-1 ${difficultyColor(t.difficulty)}`}>
                    <Zap className="w-3 h-3" />
                    {t.difficulty}
                  </span>
                  {t.category && (
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {t.category}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    {t.cloneCount} clones
                  </span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <Star className="w-3 h-3" />
                    {t.rating.toFixed(1)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // ─── Main Render ──────────────────────────────────────────────

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'share-link':
        return renderShareLinkTab();
      case 'permissions':
        return renderPermissionsTab();
      case 'visibility':
        return renderVisibilityTab();
      case 'forks':
        return renderForksTab();
      case 'publishing':
        return renderPublishingTab();
      default:
        return null;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-800/80 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        )}
        <Share2 className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-medium text-slate-200 flex-1 text-left">Project Sharing</span>
        {shares.length > 0 && (
          <span className="text-[10px] text-slate-500">
            {shares.length} share{shares.length !== 1 ? 's' : ''}
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            refresh();
          }}
          className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </button>

      {expanded && (
        <div className="p-3 space-y-3">
          {/* Tab bar */}
          <div className="flex gap-0.5 bg-slate-800/30 rounded-md p-0.5">
            {SHARING_TABS.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearchQuery('');
                  }}
                  className={`flex-1 flex items-center justify-center gap-1 px-1 py-1.5 rounded text-[10px] font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <TabIcon className="w-3 h-3" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active tab content */}
          {renderActiveTab()}
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-xl text-xs font-medium animate-fade-in">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
