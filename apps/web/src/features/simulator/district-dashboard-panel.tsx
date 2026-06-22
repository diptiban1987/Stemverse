'use client';

/**
 * Phase 36A — District Dashboard Panel
 *
 * Slide-out panel displaying a district overview with aggregate
 * statistics, school cards, and a performance summary section.
 */

import React from 'react';
import {
  X,
  Building2,
  GraduationCap,
  Users,
  BookOpen,
  MapPin,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DistrictInfo {
  name: string;
  region: string;
  schoolCount: number;
  totalStudents: number;
  totalTeachers: number;
}

export interface SchoolSummary {
  name: string;
  orgType: string;
  memberCount: number;
  classroomCount: number;
}

export interface DistrictDashboardPanelProps {
  isOpen: boolean;
  onClose: () => void;
  district?: DistrictInfo;
  schools?: SchoolSummary[];
  onViewSchool?: (schoolName: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Map org types to badge colours */
function orgTypeBadge(orgType: string): { bg: string; text: string } {
  const t = orgType.toLowerCase();
  if (t.includes('primary') || t.includes('elementary'))
    return { bg: 'bg-emerald-500/15', text: 'text-emerald-400' };
  if (t.includes('middle') || t.includes('junior'))
    return { bg: 'bg-amber-500/15', text: 'text-amber-400' };
  if (t.includes('high') || t.includes('secondary'))
    return { bg: 'bg-sky-500/15', text: 'text-sky-400' };
  if (t.includes('university') || t.includes('college'))
    return { bg: 'bg-purple-500/15', text: 'text-purple-400' };
  return { bg: 'bg-white/5', text: 'text-gray-400' };
}

/** Format a large number with commas */
function formatCount(n: number): string {
  return n.toLocaleString();
}

/* ------------------------------------------------------------------ */
/*  Stat card sub-component                                            */
/* ------------------------------------------------------------------ */

function StatCard({
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

export function DistrictDashboardPanel({
  isOpen,
  onClose,
  district,
  schools = [],
  onViewSchool,
}: DistrictDashboardPanelProps) {
  /* ---- render ---- */
  if (!isOpen) return null;

  const studentTeacherRatio =
    district && district.totalTeachers > 0
      ? (district.totalStudents / district.totalTeachers).toFixed(1)
      : '—';

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
            <Building2 className="h-5 w-5 text-cyan-400" />
            <h2 className="text-sm font-semibold tracking-wide">
              District Dashboard
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── District info ──────────────────── */}
        {district ? (
          <div className="px-4 py-3 border-b border-[#334155]/20">
            <h3 className="text-base font-semibold text-white truncate">
              {district.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
              <MapPin className="h-3 w-3 text-cyan-400" />
              <span>{district.region}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Building2 className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-xs">No district selected</p>
            <p className="text-[10px] mt-1 text-gray-600">
              Select a district to view its dashboard
            </p>
          </div>
        )}

        {/* ── Stats overview ─────────────────── */}
        {district && (
          <div className="px-4 py-3 border-b border-[#334155]/20">
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-2">
              Overview
            </p>
            <div className="grid grid-cols-3 gap-2">
              <StatCard
                icon={<Building2 className="h-4 w-4" />}
                label="Schools"
                value={formatCount(district.schoolCount)}
                accent="text-cyan-400"
              />
              <StatCard
                icon={<GraduationCap className="h-4 w-4" />}
                label="Students"
                value={formatCount(district.totalStudents)}
                accent="text-emerald-400"
              />
              <StatCard
                icon={<Users className="h-4 w-4" />}
                label="Teachers"
                value={formatCount(district.totalTeachers)}
                accent="text-amber-400"
              />
            </div>
          </div>
        )}

        {/* ── Performance overview ────────────── */}
        {district && (
          <div className="px-4 py-3 border-b border-[#334155]/20">
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-2">
              Performance
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg bg-white/[0.03] border border-[#334155]/20 px-3 py-2">
                <span className="text-xs text-gray-400">
                  Student : Teacher Ratio
                </span>
                <span className="text-xs font-semibold text-white">
                  {studentTeacherRatio} : 1
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white/[0.03] border border-[#334155]/20 px-3 py-2">
                <span className="text-xs text-gray-400">
                  Avg Students / School
                </span>
                <span className="text-xs font-semibold text-white">
                  {district.schoolCount > 0
                    ? Math.round(
                        district.totalStudents / district.schoolCount,
                      ).toLocaleString()
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── School list ────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 scrollbar-thin">
          {district && schools.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Building2 className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-xs">No schools found</p>
            </div>
          )}

          {schools.map((school) => {
            const badge = orgTypeBadge(school.orgType);
            return (
              <div
                key={school.name}
                className="group rounded-lg bg-white/[0.03] border border-[#334155]/20 hover:border-cyan-500/20 hover:bg-white/[0.06] transition-all px-3 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-white truncate">
                      {school.name}
                    </p>
                    <span
                      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium mt-1 ${badge.bg} ${badge.text}`}
                    >
                      {school.orgType}
                    </span>
                  </div>
                  {onViewSchool && (
                    <button
                      onClick={() => onViewSchool(school.name)}
                      className="rounded px-2 py-1 text-[10px] font-medium text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      View
                    </button>
                  )}
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users className="h-2.5 w-2.5" />
                    {formatCount(school.memberCount)} members
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-2.5 w-2.5" />
                    {school.classroomCount} classroom
                    {school.classroomCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer ────────────────────────── */}
        <div className="border-t border-[#334155]/20 px-4 py-2 text-[10px] text-gray-600">
          {schools.length} school{schools.length !== 1 ? 's' : ''} in district
        </div>
      </div>
    </div>
  );
}
