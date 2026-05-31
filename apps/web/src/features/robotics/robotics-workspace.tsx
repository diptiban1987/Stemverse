'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@stemverse/ui';
import {
  createRoboticsWorkspace,
  generateCodeFromWorkspace,
  isEsp32Board,
  generateEsp32ProjectExport,
  exportEsp32ProjectAsJson,
  serializeWorkspace,
  loadWorkspaceDocument,
  getBoard,
  DEFAULT_BOARD_SETTINGS,
  validateWorkspace,
  hydrateComponentRegistry,
  applyProjectTemplate,
  listProjectTemplates,
  updateToolboxSearch,
  type BoardSettings,
  type WorkspaceDocument,
  type ProjectTemplateId,
  type ValidationIssue,
  type ComponentRegistrySnapshot,
  type Esp32BoardSlug,
} from '@stemverse/blockly-engine';
import * as Blockly from 'blockly/core';
import type { WorkspaceSvg } from 'blockly/core';
import { BoardManager } from './board-manager';
import { SerialMonitor } from './serial-monitor';
import { AiAssistantPanel } from './ai-assistant-panel';
import { AiCopilotPanel } from './ai-copilot-panel';
import { AutoFixPanel } from './auto-fix-panel';
import { VersionHistoryPanel } from './version-history-panel';
import { useAuthStore } from '@/lib/auth-store';
import { compilerApi, componentsApi, projectApi } from '@/lib/api';
import { useCollaboration } from '@/lib/collaboration/use-collaboration';
import {
  ActivityFeedPanel,
  CollaborationBar,
  CursorOverlay,
  LiveSaveBanner,
} from '@/features/collaboration/collaboration-ui';
import { toast } from '@/components/ui/toast';

export interface RoboticsWorkspaceProps {
  projectId?: string;
  initialDocument?: WorkspaceDocument;
}

export function RoboticsWorkspace({
  projectId,
  initialDocument,
}: RoboticsWorkspaceProps) {
  const blocklyRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<WorkspaceSvg | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const [boardId, setBoardId] = useState(initialDocument?.board ?? 'arduino_uno');
  const [boardSettings, setBoardSettings] = useState<BoardSettings>(
    initialDocument?.board_settings ?? DEFAULT_BOARD_SETTINGS,
  );
  const [projectName, setProjectName] = useState(
    initialDocument?.name ?? 'Untitled Robotics Project',
  );
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeTarget, setCodeTarget] = useState<'arduino_cpp' | 'esp_idf'>('arduino_cpp');
  const [activeTab, setActiveTab] = useState<'blocks' | 'code' | 'serial'>('blocks');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [searchQuery, setSearchQuery] = useState('');
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [dbProjectId, setDbProjectId] = useState<string | undefined>(projectId);
  const [selectedBlock, setSelectedBlock] = useState<{
    type: string;
    fields: Record<string, string | number>;
  } | null>(null);
  const [workspaceSnapshot, setWorkspaceSnapshot] = useState<WorkspaceDocument | null>(null);

  const collab = useCollaboration({
    projectId: dbProjectId,
    userId: user?.id,
    displayName: user?.displayName ?? user?.email ?? undefined,
    enabled: Boolean(dbProjectId && user?.id),
  });

  const refreshCode = useCallback(() => {
    const ws = workspaceRef.current;
    if (!ws) return;
    const board = getBoard(boardId);
    const blocks = ws.getAllBlocks(false);
    const validation = validateWorkspace(blocks, boardId);
    setValidationIssues(validation.issues);
    const language = isEsp32Board(boardId) ? 'esp_idf' : 'arduino_cpp';
    setCodeTarget(language);
    const result = generateCodeFromWorkspace(ws, boardId, board.name, language);
    setGeneratedCode(result.code);
    setWorkspaceSnapshot(
      serializeWorkspace(ws, {
        project_id: dbProjectId ?? projectId ?? 'draft',
        name: projectName,
        board: boardId,
        board_settings: boardSettings,
      }),
    );
  }, [boardId, boardSettings, dbProjectId, projectId, projectName]);

  useEffect(() => {
    void componentsApi.getRegistry().then((registry) => {
      if (registry.boards.length > 0) {
        hydrateComponentRegistry(registry as unknown as ComponentRegistrySnapshot);
      }
    });
  }, []);

  useEffect(() => {
    if (!blocklyRef.current || workspaceRef.current) return;

    const ws = createRoboticsWorkspace(blocklyRef.current, {
      move: { scrollbars: true, drag: true, wheel: true },
    });
    workspaceRef.current = ws;

    const loadInitial = async () => {
      let doc = initialDocument;

      if (projectId && accessToken) {
        try {
          const project = await projectApi.get(accessToken, projectId);
          setDbProjectId(project.id);
          setProjectName(project.name);
          if (project.boardType) setBoardId(project.boardType);
          doc = project.workspaceJson as WorkspaceDocument;
        } catch {
          setStatus('Failed to load project from server');
        }
      }

      if (doc?.blocks) {
        loadWorkspaceDocument(ws, doc);
        setBoardId(doc.board);
        setProjectName(doc.name);
        if (doc.board_settings) setBoardSettings(doc.board_settings);
      }
      refreshCode();
      setStatus(projectId ? `Project ${projectId.slice(0, 8)}…` : 'New project');
    };

    void loadInitial();
    ws.addChangeListener(refreshCode);

    const onSelect = () => {
      const selected = Blockly.getSelected();
      if (!selected || !('type' in selected)) {
        setSelectedBlock(null);
        return;
      }
      const block = selected as unknown as import('blockly/core').Block;
      const fields: Record<string, string | number> = {};
      for (const input of block.inputList) {
        for (const field of input.fieldRow) {
          if ('name' in field && field.name && block.getField(field.name)) {
            fields[field.name] = block.getFieldValue(field.name);
          }
        }
      }
      setSelectedBlock({ type: block.type, fields });
    };

    ws.addChangeListener(onSelect);

    return () => {
      ws.removeChangeListener(refreshCode);
      ws.removeChangeListener(onSelect);
      ws.dispose();
      workspaceRef.current = null;
    };
  }, [initialDocument, projectId, accessToken, refreshCode]);

  useEffect(() => {
    const ws = workspaceRef.current;
    if (!ws) return;
    updateToolboxSearch(ws, searchQuery);
  }, [searchQuery]);

  const handleSave = async () => {
    const ws = workspaceRef.current;
    if (!ws || !accessToken) {
      setStatus('Sign in to save projects');
      return;
    }
    setSaving(true);
    try {
      const doc = serializeWorkspace(ws, {
        project_id: dbProjectId ?? projectId ?? docId(),
        name: projectName,
        board: boardId,
        board_settings: boardSettings,
      });

      if (dbProjectId) {
        await projectApi.update(accessToken, dbProjectId, {
          name: projectName,
          workspaceJson: doc,
          boardType: boardId,
        });
      } else {
        const created = await projectApi.create(accessToken, {
          name: projectName,
          type: 'ROBOTICS',
          workspaceJson: doc,
          boardType: boardId,
        });
        setDbProjectId(created.id);
        window.history.replaceState(null, '', `/robotics/${created.id}`);
      }
      setStatus(`Saved ${new Date().toLocaleTimeString()}`);
      collab.notifySave();
      toast('Project saved', { variant: 'success' });
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleUndo = () => {
    workspaceRef.current?.undo(false);
  };

  const handleRedo = () => {
    workspaceRef.current?.undo(true);
  };

  const handleTemplate = (templateId: ProjectTemplateId) => {
    const ws = workspaceRef.current;
    if (!ws) return;
    const meta = applyProjectTemplate(ws, templateId);
    setProjectName(meta.name);
    setBoardId(meta.board);
    refreshCode();
  };

  const handleExport = () => {
    const ws = workspaceRef.current;
    if (!ws) return;
    const doc = serializeWorkspace(ws, {
      project_id: dbProjectId ?? docId(),
      name: projectName,
      board: boardId,
      board_settings: boardSettings,
    });
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}.workspace.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCode = () => {
    const ext = codeTarget === 'esp_idf' ? 'c' : 'ino';
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportEsp32Project = () => {
    if (!isEsp32Board(boardId)) {
      setStatus('ESP32 export requires ESP32 or ESP32-S3 board');
      return;
    }
    const exp = generateEsp32ProjectExport(
      boardId as Esp32BoardSlug,
      generatedCode,
      projectName,
      boardSettings.uploadSpeed,
    );
    const blob = new Blob([exportEsp32ProjectAsJson(exp)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}-esp32-project.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApplyAiWorkspace = (doc: WorkspaceDocument) => {
    const ws = workspaceRef.current;
    if (!ws) return;
    loadWorkspaceDocument(ws, doc);
    setBoardId(doc.board);
    setProjectName(doc.name);
    if (doc.board_settings) setBoardSettings(doc.board_settings as BoardSettings);
    refreshCode();
    setStatus('AI workspace applied');
  };

  const getValidAccessToken = useAuthStore((s) => s.getValidAccessToken);

  const handleCompile = async () => {
    if (!isEsp32Board(boardId)) {
      setStatus('Cloud compile supports ESP32 boards in this phase');
      return;
    }
    try {
      const token = await getValidAccessToken();
      if (!token) {
        setStatus('Sign in to run cloud compile');
        return;
      }
      const res = await compilerApi.createJob(token, {
        board: boardId as 'esp32' | 'esp32_s3',
        sourceCode: generatedCode,
        projectName,
        projectId: dbProjectId,
      });
      setStatus(`Compile queued: ${res.jobId.slice(0, 8)}…`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Compile request failed');
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {dbProjectId && user && (
        <div className="border-b border-border bg-background px-4 py-2">
          <CollaborationBar
            connected={collab.connected}
            presence={collab.presence}
            lock={collab.lock}
            currentUserId={user.id}
            onAcquireLock={collab.acquireLock}
            onReleaseLock={collab.releaseLock}
            hasLock={collab.hasLock}
            isLockedByOther={collab.isLockedByOther}
          />
          <LiveSaveBanner lastSave={collab.lastSave} currentUserId={user.id} />
        </div>
      )}
      <header className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-3">
        <input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium"
          aria-label="Project name"
        />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search blocks…"
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          aria-label="Search blocks"
        />
        <div className="flex gap-1 rounded-lg bg-background p-1">
          {(['blocks', 'code', 'serial'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-3 py-1 text-sm capitalize ${activeTab === tab ? 'bg-primary text-white' : 'text-muted'}`}
            >
              {tab === 'serial' ? 'Serial' : tab}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted">{status}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={handleUndo} title="Undo (Ctrl+Z)">
            Undo
          </Button>
          <Button type="button" variant="ghost" onClick={handleRedo} title="Redo (Ctrl+Shift+Z)">
            Redo
          </Button>
          <Button type="button" variant="ghost" onClick={handleExportCode}>
            Export {codeTarget === 'esp_idf' ? '.c' : '.ino'}
          </Button>
          {isEsp32Board(boardId) && (
            <>
              <Button type="button" variant="ghost" onClick={handleExportEsp32Project}>
                Export ESP32 Project
              </Button>
              <Button type="button" variant="ghost" onClick={handleCompile}>
                Queue Compile
              </Button>
            </>
          )}
          <Button type="button" variant="ghost" onClick={handleExport}>
            Export JSON
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-96 shrink-0 overflow-y-auto border-r border-border bg-background p-4 space-y-4">
          <BoardManager
            boardId={boardId}
            settings={boardSettings}
            onBoardChange={setBoardId}
            onSettingsChange={setBoardSettings}
          />

          <div className="rounded-lg border border-border bg-card p-3">
            <h3 className="text-sm font-semibold">Templates</h3>
            <ul className="mt-2 space-y-1">
              {listProjectTemplates().map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => handleTemplate(t.id)}
                    className="w-full rounded px-2 py-1 text-left text-xs hover:bg-background"
                  >
                    <span className="font-medium">{t.name}</span>
                    <span className="block text-muted">{t.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {validationIssues.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-3">
              <h3 className="text-sm font-semibold">Validation</h3>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs">
                {validationIssues.map((issue, i) => (
                  <li
                    key={`${issue.code}-${i}`}
                    className={issue.severity === 'error' ? 'text-red-600' : 'text-amber-600'}
                  >
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <AutoFixPanel
            boardId={boardId}
            workspaceDocument={workspaceSnapshot}
            workspaceRef={workspaceRef}
            onFixed={refreshCode}
          />

          <AiCopilotPanel
            boardId={boardId}
            generatedCode={generatedCode}
            workspaceDocument={workspaceSnapshot}
            validationIssues={validationIssues}
          />

          <VersionHistoryPanel
            projectId={dbProjectId}
            workspaceJson={workspaceSnapshot}
            generatedCode={generatedCode}
            onRestore={(json) => {
              const ws = workspaceRef.current;
              if (!ws) return;
              loadWorkspaceDocument(ws, json as WorkspaceDocument);
              refreshCode();
              setStatus('Version restored');
            }}
          />

          {dbProjectId && <ActivityFeedPanel activity={collab.activity} />}

          <div className="min-h-[320px]">
            <AiAssistantPanel
              boardId={boardId}
              generatedCode={generatedCode}
              workspaceDocument={workspaceSnapshot}
              selectedBlock={selectedBlock}
              onApplyWorkspace={handleApplyAiWorkspace}
            />
          </div>
        </aside>

        <main
          className="relative min-w-0 flex-1"
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            collab.sendCursor(e.clientX - rect.left, e.clientY - rect.top);
          }}
        >
          <CursorOverlay cursors={collab.cursors} currentUserId={user?.id} />
          <div
            ref={blocklyRef}
            className={`absolute inset-0 ${activeTab === 'blocks' ? 'visible' : 'invisible'} ${collab.isLockedByOther ? 'pointer-events-none opacity-60' : ''}`}
          />
          {activeTab === 'code' && (
            <div className="absolute inset-0 flex flex-col">
              <div className="border-b border-[#334155] bg-[#1E293B] px-4 py-1 text-xs text-[#94A3B8]">
                Target: {codeTarget === 'esp_idf' ? 'ESP-IDF (ESP32)' : 'Arduino C++'}
              </div>
              <pre className="flex-1 overflow-auto bg-[#0F172A] p-4 font-mono text-sm text-[#E2E8F0]">
                {generatedCode || '// Add blocks to generate code'}
              </pre>
            </div>
          )}
          {activeTab === 'serial' && (
            <div className="absolute inset-0">
              <SerialMonitor />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function docId() {
  return `proj_${Date.now()}`;
}
