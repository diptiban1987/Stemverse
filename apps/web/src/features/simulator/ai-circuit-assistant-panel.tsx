'use client';

/**
 * Phase 31C — AI Circuit Generation Assistant Panel
 *
 * Slide-out panel for generating circuits via AI prompts.
 * Supports prompt input, template browsing, quick suggestions,
 * category filtering, and generation history review.
 */

import { useState, useMemo } from 'react';
import {
  Sparkles,
  X,
  Send,
  History,
  Cpu,
  Wifi,
  Zap,
  Bot,
  ChevronRight,
  Loader2,
  Star,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate?: (prompt: string) => void;
  templates?: Array<{
    templateId: string;
    name: string;
    description: string;
    category: string;
    difficulty: string;
  }>;
  suggestions?: Array<{
    prompt: string;
    category: string;
  }>;
  generationHistory?: Array<{
    generationId: string;
    prompt: string;
    healthScore: number;
    generatedAt: number;
    status: string;
  }>;
  isGenerating?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** Category filter tabs. */
const CATEGORIES = ['All', 'Robotics', 'IoT', 'Electronics', 'Automation'] as const;

type Category = (typeof CATEGORIES)[number];

/** Map categories to their icon component. */
const CATEGORY_ICONS: Record<Category, React.ComponentType<{ className?: string }>> = {
  All: Star,
  Robotics: Bot,
  IoT: Wifi,
  Electronics: Cpu,
  Automation: Zap,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Format a timestamp as a short relative string. */
function formatRelative(ts: number): string {
  const now = Date.now();
  const diffMs = now - ts;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Map difficulty to badge colors. */
function difficultyColor(difficulty: string): { bg: string; text: string } {
  const d = difficulty.toLowerCase();
  if (d === 'easy' || d === 'beginner')
    return { bg: 'bg-emerald-500/15', text: 'text-emerald-400' };
  if (d === 'medium' || d === 'intermediate')
    return { bg: 'bg-amber-500/15', text: 'text-amber-400' };
  if (d === 'hard' || d === 'advanced')
    return { bg: 'bg-red-500/15', text: 'text-red-400' };
  return { bg: 'bg-white/5', text: 'text-gray-400' };
}

/** Map health score to badge colors. */
function healthScoreColor(score: number): { bg: string; text: string } {
  if (score >= 80) return { bg: 'bg-emerald-500/15', text: 'text-emerald-400' };
  if (score >= 50) return { bg: 'bg-amber-500/15', text: 'text-amber-400' };
  return { bg: 'bg-red-500/15', text: 'text-red-400' };
}

/** Map generation status to badge colors. */
function statusColor(status: string): { bg: string; text: string } {
  const s = status.toLowerCase();
  if (s === 'completed' || s === 'success')
    return { bg: 'bg-emerald-500/15', text: 'text-emerald-400' };
  if (s === 'failed' || s === 'error')
    return { bg: 'bg-red-500/15', text: 'text-red-400' };
  if (s === 'pending' || s === 'generating')
    return { bg: 'bg-sky-500/15', text: 'text-sky-400' };
  return { bg: 'bg-white/5', text: 'text-gray-400' };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AIAssistantPanel({
  isOpen,
  onClose,
  onGenerate,
  templates = [],
  suggestions = [],
  generationHistory = [],
  isGenerating = false,
}: AIAssistantPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [activeSection, setActiveSection] = useState<'templates' | 'history'>('templates');

  /* ---- filter templates by category ---- */
  const filteredTemplates = useMemo(() => {
    if (activeCategory === 'All') return templates;
    return templates.filter(
      (t) => t.category.toLowerCase() === activeCategory.toLowerCase(),
    );
  }, [templates, activeCategory]);

  /* ---- filter suggestions by category ---- */
  const filteredSuggestions = useMemo(() => {
    if (activeCategory === 'All') return suggestions;
    return suggestions.filter(
      (s) => s.category.toLowerCase() === activeCategory.toLowerCase(),
    );
  }, [suggestions, activeCategory]);

  /* ---- sorted history (most recent first) ---- */
  const sortedHistory = useMemo(
    () => [...generationHistory].sort((a, b) => b.generatedAt - a.generatedAt),
    [generationHistory],
  );

  /* ---- handlers ---- */
  const handleGenerate = () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    onGenerate?.(trimmed);
  };

  const handleTemplateClick = (templateName: string, templateDesc: string) => {
    setPrompt(`${templateName}: ${templateDesc}`);
  };

  const handleSuggestionClick = (suggestionPrompt: string) => {
    setPrompt(suggestionPrompt);
  };

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
            <Bot className="h-5 w-5 text-cyan-400" />
            <h2 className="text-sm font-semibold tracking-wide">
              AI Circuit Assistant
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Prompt Input ──────────────────── */}
        <div className="px-4 py-3 border-b border-[#334155]/20">
          <label className="block text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-1.5">
            Describe your circuit
          </label>
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. LED blink circuit with Arduino Uno and 220Ω resistor…"
              rows={3}
              disabled={isGenerating}
              className="w-full resize-none rounded-md bg-white/5 py-2 px-3 text-xs text-gray-200 placeholder:text-gray-500 border border-[#334155]/30 focus:border-cyan-500/50 focus:outline-none transition-colors disabled:opacity-50"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                Generate Circuit
              </>
            )}
          </button>
        </div>

        {/* ── Category Filter Tabs ──────────── */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-[#334155]/20 overflow-x-auto scrollbar-thin">
          {CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat];
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors border whitespace-nowrap ${
                  isActive
                    ? 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10'
                    : 'border-[#334155]/30 text-gray-500 bg-white/5 hover:text-gray-300'
                }`}
              >
                <Icon className="h-3 w-3" />
                {cat}
              </button>
            );
          })}
        </div>

        {/* ── Section Toggle ────────────────── */}
        <div className="flex items-center px-4 py-1.5 border-b border-[#334155]/20">
          <button
            onClick={() => setActiveSection('templates')}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors ${
              activeSection === 'templates'
                ? 'text-cyan-400 bg-cyan-500/10'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Sparkles className="h-3 w-3" />
            Templates
          </button>
          <button
            onClick={() => setActiveSection('history')}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors ${
              activeSection === 'history'
                ? 'text-cyan-400 bg-cyan-500/10'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <History className="h-3 w-3" />
            History
          </button>
          <span className="ml-auto text-[10px] text-gray-600">
            {activeSection === 'templates'
              ? `${filteredTemplates.length} template${filteredTemplates.length !== 1 ? 's' : ''}`
              : `${sortedHistory.length} entr${sortedHistory.length !== 1 ? 'ies' : 'y'}`}
          </span>
        </div>

        {/* ── Scrollable Content ────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 scrollbar-thin">

          {/* ── Templates Section ──────────── */}
          {activeSection === 'templates' && (
            <>
              {/* Quick Suggestions */}
              {filteredSuggestions.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-1.5">
                    Quick Suggestions
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {filteredSuggestions.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionClick(s.prompt)}
                        className="rounded-full bg-white/5 border border-[#334155]/30 px-2.5 py-1 text-[10px] text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-colors"
                      >
                        {s.prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Template Cards Grid */}
              {filteredTemplates.length > 0 ? (
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-1.5">
                    Templates
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {filteredTemplates.map((t) => {
                      const colors = difficultyColor(t.difficulty);
                      return (
                        <button
                          key={t.templateId}
                          onClick={() => handleTemplateClick(t.name, t.description)}
                          className="group/card flex items-start gap-3 rounded-lg bg-white/[0.03] border border-[#334155]/20 hover:border-cyan-500/20 hover:bg-white/[0.06] transition-all px-3 py-2.5 text-left"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-medium text-gray-200 truncate">
                                {t.name}
                              </p>
                              <span
                                className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${colors.bg} ${colors.text}`}
                              >
                                {t.difficulty}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">
                              {t.description}
                            </p>
                            <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-gray-600">
                              {t.category}
                            </span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-600 group-hover/card:text-cyan-400 transition-colors shrink-0 mt-0.5" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Sparkles className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-xs">No templates found</p>
                  <p className="text-[10px] mt-1 text-gray-600">
                    Try selecting a different category
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── History Section ─────────────── */}
          {activeSection === 'history' && (
            <>
              {sortedHistory.length > 0 ? (
                <div className="space-y-1">
                  {sortedHistory.map((entry) => {
                    const scoreColors = healthScoreColor(entry.healthScore);
                    const sColors = statusColor(entry.status);
                    return (
                      <div
                        key={entry.generationId}
                        className="group relative flex items-start gap-3 py-2"
                      >
                        {/* Timeline dot */}
                        <div className="flex flex-col items-center pt-1">
                          <div className="h-2.5 w-2.5 rounded-full border-2 border-[#334155] bg-[#0F172A]" />
                        </div>

                        {/* Entry card */}
                        <div className="flex-1 min-w-0 rounded-lg bg-white/[0.03] border border-[#334155]/20 hover:border-cyan-500/20 hover:bg-white/[0.06] transition-all px-3 py-2">
                          {/* Status + time row */}
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${sColors.bg} ${sColors.text}`}
                            >
                              {entry.status}
                            </span>
                            <span className="text-[10px] text-gray-500 whitespace-nowrap flex items-center gap-1 pt-0.5">
                              <History className="h-2.5 w-2.5" />
                              {formatRelative(entry.generatedAt)}
                            </span>
                          </div>

                          {/* Prompt */}
                          <p className="text-xs text-gray-300 mt-1 truncate">
                            {entry.prompt}
                          </p>

                          {/* Health score badge */}
                          <div className="flex items-center gap-2 mt-1.5">
                            <span
                              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${scoreColors.bg} ${scoreColors.text}`}
                            >
                              <Star className="h-2.5 w-2.5" />
                              {entry.healthScore}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Sparkles className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-xs">No generation history</p>
                  <p className="text-[10px] mt-1 text-gray-600">
                    Generated circuits will appear here
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ────────────────────────── */}
        <div className="border-t border-[#334155]/20 px-4 py-2 text-[10px] text-gray-600">
          {generationHistory.length} generation{generationHistory.length !== 1 ? 's' : ''} total
        </div>
      </div>
    </div>
  );
}
