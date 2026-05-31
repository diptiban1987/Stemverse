'use client';

import { useState } from 'react';
import { Button } from '@stemverse/ui';
import { aiApi, type ExplainLevel, type TextToProjectResult } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { WorkspaceDocument } from '@stemverse/blockly-engine';

type AiTab = 'explain' | 'generate' | 'wiring';

export interface AiAssistantPanelProps {
  boardId: string;
  generatedCode: string;
  workspaceDocument: WorkspaceDocument | null;
  selectedBlock?: { type: string; fields: Record<string, string | number> } | null;
  onApplyWorkspace: (doc: WorkspaceDocument) => void;
}

export function AiAssistantPanel({
  boardId,
  generatedCode,
  workspaceDocument,
  selectedBlock,
  onApplyWorkspace,
}: AiAssistantPanelProps) {
  const [tab, setTab] = useState<AiTab>('explain');
  const [level, setLevel] = useState<ExplainLevel>('beginner');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [projectResult, setProjectResult] = useState<TextToProjectResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const getValidAccessToken = useAuthStore((s) => s.getValidAccessToken);

  const run = async (fn: (token: string) => Promise<void>) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getValidAccessToken();
      if (!token) {
        setError('Sign in to use the AI assistant');
        return;
      }
      await fn(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExplainBlock = () =>
    run(async (token) => {
      if (!selectedBlock) {
        setError('Select a block in the workspace first');
        return;
      }
      const res = await aiApi.explainBlock(token, {
        blockType: selectedBlock.type,
        fields: selectedBlock.fields,
        level,
        boardSlug: boardId,
      });
      setOutput(res.explanation);
    });

  const handleExplainCode = () =>
    run(async (token) => {
      const res = await aiApi.explainCode(token, {
        code: generatedCode,
        level,
        boardSlug: boardId,
      });
      setOutput(res.explanation);
    });

  const handleTextToBlocks = () =>
    run(async (token) => {
      const res = await aiApi.textToBlocks(token, { prompt, boardSlug: boardId });
      setOutput(`${res.summary}\n\nPattern: ${res.matchedPattern} (via ${res.provider})`);
      onApplyWorkspace(res.workspace);
    });

  const handleTextToProject = () =>
    run(async (token) => {
      const res = await aiApi.textToProject(token, { description: prompt, boardSlug: boardId });
      setProjectResult(res);
      setOutput(res.summary);
      onApplyWorkspace(res.workspace);
    });

  const handleWiring = () =>
    run(async (token) => {
      if (!workspaceDocument) {
        setError('No workspace loaded');
        return;
      }
      const res = await aiApi.wiring(token, { workspace: workspaceDocument });
      const lines = [
        'Components:',
        ...res.components.map((c) => `• ${c.name} (${c.role})`),
        '',
        'Pin mapping:',
        ...res.pinMappings.map(
          (p) => `• ${p.component}: pin ${p.pin} — ${p.function}${p.notes ? ` (${p.notes})` : ''}`,
        ),
        '',
        'Connections:',
        ...res.connections.map((c) => `• ${c}`),
        ...(res.warnings.length ? ['', 'Warnings:', ...res.warnings.map((w) => `⚠ ${w}`)] : []),
      ];
      setOutput(lines.join('\n'));
    });

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      <div className="border-b border-border p-3">
        <h3 className="text-sm font-semibold">AI Assistant</h3>
        <div className="mt-2 flex gap-1 rounded-lg bg-background p-1">
          {(['explain', 'generate', 'wiring'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-md px-2 py-1 text-xs capitalize ${
                tab === t ? 'bg-primary text-white' : 'text-muted'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {tab === 'explain' && (
          <>
            <label className="block text-xs font-medium text-muted">Explanation level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as ExplainLevel)}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={loading || !selectedBlock}
                onClick={handleExplainBlock}
              >
                Explain selected block
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={loading || !generatedCode}
                onClick={handleExplainCode}
              >
                Explain generated code
              </Button>
            </div>
            {selectedBlock && (
              <p className="text-xs text-muted">
                Selected: {selectedBlock.type.replace('stemverse_', '')}
              </p>
            )}
          </>
        )}

        {tab === 'generate' && (
          <>
            <label className="block text-xs font-medium text-muted">Describe your project</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='e.g. "Blink LED every second" or "Read DHT22 and show temperature on OLED"'
              rows={4}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            />
            <Button type="button" disabled={loading || !prompt.trim()} onClick={handleTextToBlocks}>
              Generate blocks
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={loading || !prompt.trim()}
              onClick={handleTextToProject}
            >
              Generate full project
            </Button>
            {projectResult && (
              <div className="rounded-md bg-background p-2 text-xs">
                <p className="font-medium">{projectResult.name}</p>
                <p className="text-muted">Libraries: {projectResult.libraries.join(', ') || 'none'}</p>
              </div>
            )}
          </>
        )}

        {tab === 'wiring' && (
          <>
            <p className="text-xs text-muted">
              Uses the component registry and current workspace to suggest connections and pin mapping.
            </p>
            <Button type="button" disabled={loading || !workspaceDocument} onClick={handleWiring}>
              Generate wiring suggestions
            </Button>
          </>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}

        {output && (
          <pre className="whitespace-pre-wrap rounded-md bg-background p-2 text-xs text-foreground">
            {output}
          </pre>
        )}
      </div>
    </div>
  );
}
