'use client';

import { useState } from 'react';
import { Button } from '@stemverse/ui';
import { aiApi, type CopilotResponse } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { WorkspaceDocument } from '@stemverse/blockly-engine';

export interface AiCopilotPanelProps {
  boardId: string;
  generatedCode: string;
  workspaceDocument: WorkspaceDocument | null;
  validationIssues: Array<{ code: string; message: string; severity: string }>;
}

export function AiCopilotPanel({
  boardId,
  generatedCode,
  workspaceDocument,
  validationIssues,
}: AiCopilotPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CopilotResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const getValidAccessToken = useAuthStore((s) => s.getValidAccessToken);

  const runCopilot = async () => {
    if (!workspaceDocument) {
      setError('No workspace loaded');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await getValidAccessToken();
      if (!token) {
        setError('Sign in to use AI Copilot');
        return;
      }
      const res = await aiApi.copilot(token, {
        workspace: workspaceDocument,
        generatedCode,
        validationIssues,
        boardSlug: boardId,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Copilot request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">AI Copilot</h3>
        <Button type="button" size="sm" disabled={loading || !workspaceDocument} onClick={runCopilot}>
          {loading ? 'Analyzing…' : 'Analyze'}
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {result && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted">{result.summary}</p>
          <ul className="max-h-48 space-y-2 overflow-y-auto text-xs">
            {result.suggestions.map((s, i) => (
              <li
                key={`${s.category}-${i}`}
                className={`rounded-md bg-background p-2 ${
                  s.priority === 'high' ? 'border-l-2 border-red-500' : ''
                }`}
              >
                <span className="font-medium capitalize">{s.title}</span>
                <p className="text-muted">{s.description}</p>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-muted">via {result.provider}</p>
        </div>
      )}
    </div>
  );
}
