'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@stemverse/ui';
import {
  aiApi,
  aiStudioApi,
  type AiSession,
  type AiUserSettings,
  type WorkspaceDocument,
} from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { streamUnifiedAi, type UnifiedStreamEvent } from '@/lib/ai-stream';
import { StreamMarkdown } from '@/components/ai/stream-markdown';
import { Bug, Sparkles, Wrench, Zap, Cable, Box, Loader2 } from 'lucide-react';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  usage?: { model?: string; tokens?: number };
};

function StreamingText({ text, markdown }: { text: string; markdown?: boolean }) {
  if (markdown) return <StreamMarkdown text={text} />;
  return <span className="whitespace-pre-wrap">{text}</span>;
}

export function AiStudioWorkspace() {
  const [settings, setSettings] = useState<AiUserSettings | null>(null);
  const [sessions, setSessions] = useState<AiSession[]>([]);
  const [activeSession, setActiveSession] = useState<AiSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewWorkspace, setPreviewWorkspace] = useState<WorkspaceDocument | null>(null);
  const [previewCode, setPreviewCode] = useState('');
  const [wiringPreview, setWiringPreview] = useState<string[]>([]);
  const [simulatorNotes, setSimulatorNotes] = useState<string[]>([]);
  const [models, setModels] = useState<Array<{ id: string; label: string; tier?: string }>>([]);
  const [mode, setMode] = useState<'chat' | 'optimize' | 'debug'>('chat');
  const [streamBuffer, setStreamBuffer] = useState('');
  const [streamMarkdown, setStreamMarkdown] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const getValidAccessToken = useAuthStore((s) => s.getValidAccessToken);

  const load = useCallback(async () => {
    const token = await getValidAccessToken();
    if (!token) return;
    const [s, list, m] = await Promise.all([
      aiStudioApi.getSettings(token),
      aiStudioApi.listSessions(token),
      aiApi.listModels(token),
    ]);
    setSettings(s);
    setSessions(list);
    setModels(m.models);
  }, [getValidAccessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAssistant = async (userText: string, assistantMode: 'chat' | 'optimize' | 'debug'): Promise<string> => {
    const token = await getValidAccessToken();
    if (!token) return 'Sign in required to use AI Studio.';

    if (assistantMode === 'chat') {
      const blocksRes = await aiApi.textToBlocks(token, {
        prompt: userText,
        boardSlug: 'arduino_uno',
      });
      setPreviewWorkspace(blocksRes.workspace);
      setPreviewCode(JSON.stringify(blocksRes.workspace, null, 2).slice(0, 2000));

      const wiring = await aiApi.wiring(token, { workspace: blocksRes.workspace });
      setWiringPreview(wiring.connections.slice(0, 8));

      const sim = await aiApi.simulatorAssist(token, {
        workspace: blocksRes.workspace,
        boardSlug: blocksRes.workspace.board,
      });
      setSimulatorNotes(sim.explanations);

      return `${blocksRes.summary}\n\nPattern: ${blocksRes.matchedPattern} (${blocksRes.provider})`;
    }

    if (assistantMode === 'optimize' && previewWorkspace) {
      const res = await aiApi.copilot(token, {
        workspace: previewWorkspace,
        generatedCode: previewCode,
        boardSlug: previewWorkspace.board,
      });
      return `Optimization suggestions:\n${res.suggestions.filter((s) => s.category === 'optimization' || s.priority === 'high').map((s) => `• ${s.title}: ${s.description}`).join('\n') || res.summary}`;
    }

    if (assistantMode === 'debug' && previewWorkspace) {
      const fix = await aiApi.autoFix(token, { workspace: previewWorkspace });
      return `Debug scan: ${fix.issueCount} issues, ${fix.fixableCount} auto-fixable.\n${fix.suggestions.map((s) => `• ${s.title}`).join('\n')}`;
    }

    return 'Load or generate a workspace first for optimize/debug modes.';
  };

  const cancelGeneration = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setStreamBuffer('');
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setStreamBuffer('');
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    const next = [...messages, userMsg];
    const placeholder: ChatMessage = {
      role: 'assistant',
      content: '',
      streaming: settings?.streamingEnabled ?? true,
      usage: { model: settings?.preferredModel ?? 'rule-based', tokens: settings?.maxTokens },
    };
    setMessages([...next, placeholder]);
    setInput('');
    try {
      const token = await getValidAccessToken();
      const streamMode =
        mode === 'chat' ? 'chat' : mode === 'optimize' ? 'optimize' : 'debug';
      const useStream = Boolean(settings?.streamingEnabled) && Boolean(token);

      let content = '';
      if (useStream && token) {
        let accumulated = '';
        const handleEvent = (event: UnifiedStreamEvent) => {
          if (event.type === 'artifact' && event.artifact === 'workspace') {
            const data = event.data as { workspace?: WorkspaceDocument; summary?: string };
            if (data.workspace) {
              setPreviewWorkspace(data.workspace);
              setPreviewCode(JSON.stringify(data.workspace, null, 2).slice(0, 2000));
            }
          }
          if (event.type === 'artifact' && event.artifact === 'wiring') {
            const data = event.data as { connections?: string[] };
            if (data.connections) setWiringPreview(data.connections.slice(0, 8));
          }
          if (event.type === 'delta') {
            accumulated += event.content;
            setStreamMarkdown(Boolean(event.markdown));
            setStreamBuffer(accumulated);
            setMessages((prev) => {
              const copy = [...prev];
              copy[copy.length - 1] = { ...placeholder, content: accumulated, streaming: true };
              return copy;
            });
          }
          if (event.type === 'done') {
            accumulated = event.summary || accumulated;
          }
        };

        await streamUnifiedAi({
          token,
          signal: abortRef.current.signal,
          retryOnFailure: true,
          body: {
            mode: streamMode,
            prompt: userMsg.content,
            message: userMsg.content,
            workspace: previewWorkspace ?? undefined,
            generatedCode: previewCode,
            boardSlug: previewWorkspace?.board ?? 'arduino_uno',
            model: settings?.preferredModel ?? undefined,
            fallbackModel: settings?.fallbackModel ?? undefined,
          },
          onEvent: handleEvent,
        });
        content = accumulated || 'Done.';
      } else {
        content = await runAssistant(userMsg.content, mode);
      }

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content,
        streaming: false,
        usage: { model: settings?.preferredModel ?? 'rule-based', tokens: settings?.maxTokens },
      };
      setMessages([...next, assistantMsg]);
      setStreamBuffer('');

      const saveToken = await getValidAccessToken();
      if (!saveToken) return;
      if (activeSession) {
        await aiStudioApi.updateSession(saveToken, activeSession.id, {
          messages: [...next, assistantMsg],
        });
      } else {
        const session = await aiStudioApi.createSession(saveToken, {
          title: userMsg.content.slice(0, 60),
          model: settings?.preferredModel ?? undefined,
          messages: [...next, assistantMsg],
        });
        setActiveSession(session);
        setSessions((prev) => [session, ...prev]);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setMessages([
        ...next,
        { role: 'assistant', content: err instanceof Error ? err.message : 'Request failed' },
      ]);
    } finally {
      abortRef.current = null;
      setLoading(false);
      setStreamBuffer('');
    }
  };

  const selectSession = (session: AiSession) => {
    setActiveSession(session);
    setMessages((session.messages as ChatMessage[]) ?? []);
  };

  const modelStatus = models.find((m) => m.id === settings?.preferredModel);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row">
      <aside className="w-full shrink-0 border-b border-border bg-card p-4 lg:w-64 lg:border-b-0 lg:border-r">
        <h2 className="text-sm font-semibold">Sessions</h2>
        <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-xs lg:max-h-[40vh]">
          {sessions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => selectSession(s)}
                className={`w-full rounded px-2 py-1 text-left hover:bg-background ${
                  activeSession?.id === s.id ? 'bg-primary/10 text-primary' : ''
                }`}
              >
                {s.title}
              </button>
            </li>
          ))}
        </ul>
        {settings && (
          <div className="mt-6 space-y-2 text-xs">
            <p className="flex items-center gap-1 font-medium">
              <span
                className={`h-2 w-2 rounded-full ${modelStatus ? 'bg-emerald-500' : 'bg-amber-500'}`}
              />
              Model: {modelStatus?.label ?? 'Default (offline)'}
            </p>
            <label className="block font-medium">Preferred model</label>
            <select
              className="w-full rounded border border-border bg-background px-2 py-1"
              value={settings.preferredModel ?? ''}
              onChange={async (e) => {
                const token = await getValidAccessToken();
                if (!token) return;
                const updated = await aiStudioApi.updateSettings(token, {
                  preferredModel: e.target.value || null,
                });
                setSettings(updated);
              }}
            >
              <option value="">Default</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} {m.tier === 'free' ? '(free)' : ''}
                </option>
              ))}
            </select>
            <p className="text-muted">Max tokens: {settings.maxTokens}</p>
          </div>
        )}
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex gap-1 border-b border-border bg-background p-2">
          {(
            [
              ['chat', Sparkles, 'Chat'],
              ['optimize', Zap, 'Optimize'],
              ['debug', Bug, 'Debug'],
            ] as const
          ).map(([m, Icon, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs ${
                mode === m ? 'bg-primary text-white' : 'text-muted hover:bg-card'
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-center text-sm text-muted">Ask STEMVerse AI to build or improve a robotics project</p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-2xl rounded-lg px-3 py-2 text-sm ${
                m.role === 'user' ? 'ml-auto bg-primary text-white' : 'bg-card border border-border'
              }`}
            >
              {m.role === 'assistant' && m.streaming ? (
                <StreamingText text={m.content || streamBuffer} markdown={streamMarkdown} />
              ) : m.role === 'assistant' ? (
                <StreamMarkdown text={m.content} />
              ) : (
                m.content
              )}
              {m.usage && m.role === 'assistant' && (
                <p className="mt-2 text-[10px] opacity-70">
                  {m.usage.model} · up to {m.usage.tokens} tokens
                </p>
              )}
            </div>
          ))}
        </div>
        <div className="border-t border-border p-4">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                mode === 'optimize'
                  ? 'Ask how to optimize the current workspace…'
                  : mode === 'debug'
                    ? 'Describe the bug or error…'
                    : 'Describe a robotics project…'
              }
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && !loading && void sendMessage()}
            />
            {loading && (
              <Button type="button" onClick={cancelGeneration}>
                Stop
              </Button>
            )}
            <Button type="button" disabled={loading} onClick={sendMessage}>
              {loading ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="h-4 w-4 animate-spin" /> Thinking
                </span>
              ) : (
                'Send'
              )}
            </Button>
          </div>
        </div>
      </section>

      <aside className="w-full shrink-0 border-t border-border bg-background p-4 text-xs lg:w-80 lg:border-t-0 lg:border-l">
        <h3 className="flex items-center gap-1 font-semibold">
          <Wrench className="h-3.5 w-3.5" /> Workspace
        </h3>
        <pre className="mt-2 max-h-24 overflow-auto rounded bg-card p-2">
          {previewWorkspace ? previewWorkspace.name : '—'}
        </pre>

        <h3 className="mt-4 font-semibold">Code</h3>
        <pre className="mt-2 max-h-32 overflow-auto rounded bg-[#0F172A] p-2 font-mono text-[10px] text-[#E2E8F0]">
          {previewCode || '// Generated code preview'}
        </pre>

        <h3 className="mt-4 flex items-center gap-1 font-semibold">
          <Cable className="h-3.5 w-3.5" /> Wiring
        </h3>
        <ul className="mt-2 max-h-24 space-y-1 overflow-auto text-muted">
          {wiringPreview.length ? wiringPreview.map((c) => <li key={c}>• {c}</li>) : <li>No wiring yet</li>}
        </ul>

        <h3 className="mt-4 flex items-center gap-1 font-semibold">
          <Box className="h-3.5 w-3.5" /> Simulator notes
        </h3>
        <ul className="mt-2 max-h-24 space-y-1 overflow-auto text-muted">
          {simulatorNotes.length ? simulatorNotes.map((n, i) => <li key={i}>• {n}</li>) : <li>Run a prompt to get simulator guidance</li>}
        </ul>
      </aside>
    </div>
  );
}
