'use client';

/**
 * Phase 36A — Organization Dashboard Panel
 *
 * Slide-out panel displaying an organization's details, analytics
 * grid, contact information, and management action buttons.
 */

import React from 'react';
import {
  X,
  Building,
  Users,
  BookOpen,
  Trophy,
  Cpu,
  HardDrive,
  Mail,
  Settings,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface OrganizationInfo {
  name: string;
  orgType: string;
  memberCount: number;
  classroomCount: number;
  address: string;
  contactEmail: string;
}

export interface OrganizationAnalytics {
  activeStudents: number;
  activeTeachers: number;
  totalAssignments: number;
  totalCompetitions: number;
  deviceUploads: number;
  storageUsedMB: number;
}

export interface OrganizationDashboardPanelProps {
  isOpen: boolean;
  onClose: () => void;
  organization?: OrganizationInfo;
  analytics?: OrganizationAnalytics;
  onManageUsers?: () => void;
  onManageClassrooms?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Map org types to badge colours */
function orgTypeBadge(orgType: string): { bg: string; text: string } {
  const t = orgType.toLowerCase();
  if (t.includes('school'))
    return { bg: 'bg-emerald-500/15', text: 'text-emerald-400' };
  if (t.includes('university') || t.includes('college'))
    return { bg: 'bg-purple-500/15', text: 'text-purple-400' };
  if (t.includes('lab') || t.includes('research'))
    return { bg: 'bg-sky-500/15', text: 'text-sky-400' };
  if (t.includes('company') || t.includes('enterprise'))
    return { bg: 'bg-amber-500/15', text: 'text-amber-400' };
  return { bg: 'bg-white/5', text: 'text-gray-400' };
}

/** Format a large number with commas */
function formatCount(n: number): string {
  return n.toLocaleString();
}

/** Format storage in MB to a human-readable string */
function formatStorage(mb: number): string {
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

/* ------------------------------------------------------------------ */
/*  Analytics card sub-component                                       */
/* ------------------------------------------------------------------ */

function AnalyticsCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-white/[0.03] border border-[#334155]/20 px-3 py-3">
      <div className={`mb-1 ${accent}`}>{icon}</div>
      <span className="text-sm font-semibold text-white">{value}</span>
      <span className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">
        {label}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function OrganizationDashboardPanel({
  isOpen,
  onClose,
  organization,
  analytics,
  onManageUsers,
  onManageClassrooms,
}: OrganizationDashboardPanelProps) {
  /* ---- render ---- */
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative ml-auto flex h-full w-full max-w-md flex-col bg-[#0F172A]/95 backdrop-blur-xl border-l border-[#334155]/30 shadow-2xl">
        {/* ── Header ────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#334155]/30">
          <div className="flex items-center gap-2 text-white">
            <Building className="h-5 w-5 text-cyan-400" />
            <h2 className="text-sm font-semibold tracking-wide">
              Organization Dashboard
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Organization info ──────────────── */}
        {organization ? (
          <div className="px-4 py-3 border-b border-[#334155]/20">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white truncate">
                {organization.name}
              </h3>
              {(() => {
                const badge = orgTypeBadge(organization.orgType);
                return (
                  <span
                    className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${badge.bg} ${badge.text}`}
                  >
                    {organization.orgType}
                  </span>
                );
              })()}
            </div>

            {/* Quick counts */}
            <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
              <span className="flex items-center gap-1">
                <Users className="h-2.5 w-2.5" />
                {formatCount(organization.memberCount)} members
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="h-2.5 w-2.5" />
                {organization.classroomCount} classroom
                {organization.classroomCount !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Contact info */}
            <div className="mt-2 space-y-1">
              <p className="text-[10px] text-gray-500 truncate">
                {organization.address}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <Mail className="h-2.5 w-2.5 text-cyan-400" />
                <span className="truncate">{organization.contactEmail}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Building className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-xs">No organization selected</p>
            <p className="text-[10px] mt-1 text-gray-600">
              Select an organization to view its dashboard
            </p>
          </div>
        )}

        {/* ── Scrollable content ─────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 scrollbar-thin">
          {/* ── Analytics grid ────────────────── */}
          {analytics && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-2">
                Analytics
              </p>
              <div className="grid grid-cols-3 gap-2">
                <AnalyticsCard
                  icon={<Users className="h-4 w-4" />}
                  label="Students"
                  value={formatCount(analytics.activeStudents)}
                  accent="text-emerald-400"
                />
                <AnalyticsCard
                  icon={<Users className="h-4 w-4" />}
                  label="Teachers"
                  value={formatCount(analytics.activeTeachers)}
                  accent="text-amber-400"
                />
                <AnalyticsCard
                  icon={<BookOpen className="h-4 w-4" />}
                  label="Assignments"
                  value={formatCount(analytics.totalAssignments)}
                  accent="text-sky-400"
                />
                <AnalyticsCard
                  icon={<Trophy className="h-4 w-4" />}
                  label="Competitions"
                  value={formatCount(analytics.totalCompetitions)}
                  accent="text-purple-400"
                />
                <AnalyticsCard
                  icon={<Cpu className="h-4 w-4" />}
                  label="Uploads"
                  value={formatCount(analytics.deviceUploads)}
                  accent="text-cyan-400"
                />
                <AnalyticsCard
                  icon={<HardDrive className="h-4 w-4" />}
                  label="Storage"
                  value={formatStorage(analytics.storageUsedMB)}
                  accent="text-rose-400"
                />
              </div>
            </div>
          )}

          {/* ── No analytics placeholder ─────── */}
          {organization && !analytics && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Settings className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-xs">Analytics not available</p>
              <p className="text-[10px] mt-1 text-gray-600">
                Data will appear once activity is recorded
              </p>
            </div>
          )}

          {/* ── Action buttons ───────────────── */}
          {organization && (onManageUsers || onManageClassrooms) && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-2">
                Management
              </p>
              <div className="space-y-1.5">
                {onManageUsers && (
                  <button
                    onClick={onManageUsers}
                    className="flex w-full items-center gap-2 rounded-lg bg-white/[0.03] border border-[#334155]/20 hover:border-cyan-500/20 hover:bg-white/[0.06] transition-all px-3 py-2.5"
                  >
                    <Users className="h-4 w-4 text-cyan-400" />
                    <div className="flex-1 text-left">
                      <p className="text-xs font-medium text-white">
                        Manage Users
                      </p>
                      <p className="text-[10px] text-gray-500">
                        Add, remove, or update member roles
                      </p>
                    </div>
                    <Settings className="h-3.5 w-3.5 text-gray-500" />
                  </button>
                )}

                {onManageClassrooms && (
                  <button
                    onClick={onManageClassrooms}
                    className="flex w-full items-center gap-2 rounded-lg bg-white/[0.03] border border-[#334155]/20 hover:border-cyan-500/20 hover:bg-white/[0.06] transition-all px-3 py-2.5"
                  >
                    <BookOpen className="h-4 w-4 text-emerald-400" />
                    <div className="flex-1 text-left">
                      <p className="text-xs font-medium text-white">
                        Manage Classrooms
                      </p>
                      <p className="text-[10px] text-gray-500">
                        Create, archive, or configure classrooms
                      </p>
                    </div>
                    <Settings className="h-3.5 w-3.5 text-gray-500" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────── */}
        <div className="border-t border-[#334155]/20 px-4 py-2 text-[10px] text-gray-600">
          {organization
            ? `${formatCount(organization.memberCount)} member${organization.memberCount !== 1 ? 's' : ''} · ${organization.classroomCount} classroom${organization.classroomCount !== 1 ? 's' : ''}`
            : 'No organization loaded'}
        </div>
      </div>
    </div>
  );
}
