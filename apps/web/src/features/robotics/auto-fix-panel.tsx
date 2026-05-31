'use client';

import { useState } from 'react';
import { Button } from '@stemverse/ui';
import { aiApi, type AutoFixResponse, type AutoFixSuggestion } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { applyFixSuggestion, type WorkspaceDocument } from '@stemverse/blockly-engine';
import type { WorkspaceSvg } from 'blockly/core';

export interface AutoFixPanelProps {
  boardId: string;
  workspaceDocument: WorkspaceDocument | null;
  workspaceRef: React.RefObject<WorkspaceSvg | null>;
  onFixed: () => void;
}

export function AutoFixPanel({
  boardId,
  workspaceDocument,
  workspaceRef,
  onFixed,
}: AutoFixPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AutoFixResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const getValidAccessToken = useAuthStore((s) => s.getValidAccessToken);

  const analyze = async () => {
    if (!workspaceDocument) {
      setError('No workspace loaded');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await getValidAccessToken();
      if (!token) {
        setError('Sign in to use Auto Fix');
        return;
      }
      const res = await aiApi.autoFix(token, { workspace: workspaceDocument, boardSlug: boardId });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto fix failed');
    } finally {
      setLoading(false);
    }
  };

  const applyFix = (suggestion: AutoFixSuggestion) => {
    const ws = workspaceRef.current;
    if (!ws || !suggestion.autoApplicable) return;
    const ok = applyFixSuggestion(ws, {
      id: suggestion.id,
      issueCode: suggestion.issueCode,
      title: suggestion.title,
      description: suggestion.description,
      action: suggestion.action as 'assign_pin' | 'remove_block',
      blockId: suggestion.blockId,
      autoApplicable: suggestion.autoApplicable,
      payload: suggestion.action === 'assign_pin' ? { field: 'PIN', pin: 13 } : undefined,
    });
    if (ok) onFixed();
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Auto Fix</h3>
        <Button type="button" size="sm" variant="secondary" disabled={loading} onClick={analyze}>
          {loading ? 'Scanning…' : 'Scan'}
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {result && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted">
            {result.issueCount} issues · {result.fixableCount} auto-fixable
          </p>
          <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
            {result.suggestions.map((s) => (
              <li key={s.id} className="flex items-start justify-between gap-2 rounded bg-background p-2">
                <div>
                  <span className="font-medium">{s.title}</span>
                  <p className="text-muted">{s.description}</p>
                </div>
                {s.autoApplicable && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => applyFix(s)}>
                    Fix
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
