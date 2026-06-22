'use client';

/**
 * Phase 34B — Certification Panel
 *
 * Slide-out panel for browsing earned certificates and program requirements.
 * Shows certificate cards with status badges, verification IDs,
 * certificate numbers, and available certification programs.
 */

import { X, Award, Shield, CheckCircle, AlertTriangle } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Status of a certificate */
export type CertificateStatus = 'earned' | 'pending' | 'expired' | 'revoked';

/** Type/category of a certificate */
export type CertificateType = 'completion' | 'excellence' | 'participation' | 'special';

export interface Certificate {
  id: string;
  name: string;
  number: string;
  status: CertificateStatus;
  type: CertificateType;
  score: number;
  issuedAt: string;
}

export interface CertificationProgram {
  id: string;
  title: string;
  type: CertificateType;
  requiredScore: number;
}

export interface CertificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  certificates?: Certificate[];
  programs?: CertificationProgram[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Map certificate status to badge styling */
function statusBadge(status: CertificateStatus): { bg: string; text: string; label: string } {
  switch (status) {
    case 'earned':
      return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Earned' };
    case 'pending':
      return { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Pending' };
    case 'expired':
      return { bg: 'bg-gray-500/15', text: 'text-gray-400', label: 'Expired' };
    case 'revoked':
      return { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Revoked' };
    default:
      return { bg: 'bg-white/5', text: 'text-gray-400', label: String(status) };
  }
}

/** Map certificate type to accent color */
function typeColor(type: CertificateType): string {
  switch (type) {
    case 'excellence':
      return 'text-amber-400';
    case 'completion':
      return 'text-cyan-400';
    case 'participation':
      return 'text-sky-400';
    case 'special':
      return 'text-purple-400';
    default:
      return 'text-gray-400';
  }
}

/** Format ISO date string for display */
function formatIssuedDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CertificationPanel({
  isOpen,
  onClose,
  certificates = [],
  programs = [],
}: CertificationPanelProps) {
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
            <Award className="h-5 w-5 text-cyan-400" />
            <h2 className="text-sm font-semibold tracking-wide">
              Certifications
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Certificate List ─────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 scrollbar-thin">
          {/* Empty state */}
          {certificates.length === 0 && programs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Shield className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-xs">No certificates yet</p>
              <p className="text-[10px] mt-1 text-gray-600">
                Complete programs to earn certificates
              </p>
            </div>
          )}

          {/* Certificates section */}
          {certificates.length > 0 && (
            <>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium pt-1">
                Certificates ({certificates.length})
              </p>

              {certificates.map((cert) => {
                const badge = statusBadge(cert.status);
                const color = typeColor(cert.type);
                return (
                  <div
                    key={cert.id}
                    className="rounded-lg bg-white/[0.03] border border-[#334155]/20 hover:border-cyan-500/20 hover:bg-white/[0.06] transition-all p-3"
                  >
                    {/* Title + status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Award className={`h-3.5 w-3.5 shrink-0 ${color}`} />
                          <span className="text-xs font-medium text-white truncate">
                            {cert.name}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${badge.bg} ${badge.text}`}
                      >
                        {cert.status === 'earned' ? (
                          <CheckCircle className="h-2.5 w-2.5" />
                        ) : cert.status === 'revoked' || cert.status === 'expired' ? (
                          <AlertTriangle className="h-2.5 w-2.5" />
                        ) : null}
                        {badge.label}
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
                      <span className="flex items-center gap-1 font-mono">
                        <Shield className="h-2.5 w-2.5" />
                        {cert.number}
                      </span>
                      <span>Score: {cert.score}</span>
                      <span>{formatIssuedDate(cert.issuedAt)}</span>
                    </div>

                    {/* Verification ID */}
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-600">
                      <span className="font-mono">ID: {cert.id}</span>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Programs section */}
          {programs.length > 0 && (
            <>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium pt-3">
                Available Programs ({programs.length})
              </p>

              {programs.map((prog) => {
                const color = typeColor(prog.type);
                return (
                  <div
                    key={prog.id}
                    className="rounded-lg bg-white/[0.03] border border-[#334155]/20 hover:border-cyan-500/20 hover:bg-white/[0.06] transition-all p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Award className={`h-3.5 w-3.5 shrink-0 ${color}`} />
                      <span className="text-xs font-medium text-white truncate">
                        {prog.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
                      <span
                        className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-white/5 ${color}`}
                      >
                        {prog.type}
                      </span>
                      <span>Required: {prog.requiredScore} pts</span>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* ── Footer ───────────────────────── */}
        <div className="border-t border-[#334155]/20 px-4 py-2 text-[10px] text-gray-600">
          {certificates.length} certificate{certificates.length !== 1 ? 's' : ''} · {programs.length} program{programs.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}
