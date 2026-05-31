'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@stemverse/ui';
import {
  createRoboticsWorkspace,
  generateCodeFromWorkspace,
  serializeWorkspace,
  loadWorkspaceDocument,
  getBoard,
  validateWorkspace,
  hydrateComponentRegistry,
  getBlockSimulationMetadata,
  resolveSimulationComponentType,
  type WorkspaceDocument,
  type ValidationIssue,
  type ComponentRegistrySnapshot,
} from '@stemverse/blockly-engine';
import {
  SimulatorEngine,
  listVirtualBoards,
  paletteComponentLabel,
  type SimComponentType,
  type SimulatorState,
  type VirtualBoardId,
} from '@stemverse/simulator-engine';
import type { WorkspaceSvg } from 'blockly/core';
import { useAuthStore } from '@/lib/auth-store';
import { componentsApi, projectApi } from '@/lib/api';

const PALETTE_COMPONENTS: SimComponentType[] = ['led', 'buzzer', 'servo', 'dht22', 'hc_sr04'];

const VIRTUAL_BOARD_IDS = new Set<VirtualBoardId>(['esp32', 'esp32_s3', 'arduino_uno']);

function toVirtualBoardId(boardId: string): VirtualBoardId {
  if (VIRTUAL_BOARD_IDS.has(boardId as VirtualBoardId)) {
    return boardId as VirtualBoardId;
  }
  return 'arduino_uno';
}

export interface SimulatorWorkspaceProps {
  projectId?: string;
  initialDocument?: WorkspaceDocument;
}

export function SimulatorWorkspace({ projectId, initialDocument }: SimulatorWorkspaceProps) {
  const blocklyRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<WorkspaceSvg | null>(null);
  const engineRef = useRef<SimulatorEngine | null>(null);

  const accessToken = useAuthStore((s) => s.accessToken);
  const [boardId, setBoardId] = useState(initialDocument?.board ?? 'arduino_uno');
  const [projectName, setProjectName] = useState(initialDocument?.name ?? 'Simulator Project');
  const [simState, setSimState] = useState<SimulatorState | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState('');
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [status, setStatus] = useState('Ready');
  const [saving, setSaving] = useState(false);
  const [dbProjectId, setDbProjectId] = useState<string | undefined>(projectId);

  const refreshCode = useCallback(() => {
    const ws = workspaceRef.current;
    const engine = engineRef.current;
    if (!ws) return;

    const board = getBoard(boardId);
    const blocks = ws.getAllBlocks(false);
    const validation = validateWorkspace(blocks, boardId);
    setValidationIssues(validation.issues);

    const language = boardId.startsWith('esp32') ? 'esp_idf' : 'arduino_cpp';
    const result = generateCodeFromWorkspace(ws, boardId, board.name, language);
    setGeneratedCode(result.code);

    const doc = serializeWorkspace(ws, {
      project_id: dbProjectId ?? projectId ?? 'sim-draft',
      name: projectName,
      board: boardId,
    });

    if (engine) {
      engine.setBoard(toVirtualBoardId(boardId));
      if (doc.blocks) {
        engine.loadWorkspaceJson(doc.blocks as Record<string, unknown>);
      }
    }
  }, [boardId, dbProjectId, projectId, projectName]);

  const syncComponentsFromBlocks = useCallback(() => {
    const ws = workspaceRef.current;
    const engine = engineRef.current;
    if (!ws || !engine) return;

    const existingPins = new Set(engine.getState().components.map((c) => c.boardPin));
    for (const block of ws.getAllBlocks(false)) {
      const meta = getBlockSimulationMetadata(block.type);
      if (!meta) continue;

      const fields: Record<string, string | number> = {};
      for (const input of block.inputList) {
        for (const field of input.fieldRow) {
          if ('name' in field && field.name) {
            fields[field.name] = block.getFieldValue(field.name);
          }
        }
      }

      const componentType = resolveSimulationComponentType(block.type, fields);
      const pin = Number(fields.PIN ?? 13);

      if (componentType === 'led' && !existingPins.has(pin)) {
        try {
          engine.addComponent('led', { boardPin: pin });
          existingPins.add(pin);
        } catch {
          /* pin in use */
        }
      }
      if (componentType === 'servo' && !existingPins.has(pin)) {
        try {
          engine.addComponent('servo', { boardPin: pin });
          existingPins.add(pin);
        } catch {
          /* pin in use */
        }
      }
      if (componentType === 'buzzer' && !existingPins.has(pin)) {
        try {
          engine.addComponent('buzzer', { boardPin: pin });
          existingPins.add(pin);
        } catch {
          /* pin in use */
        }
      }
      if (componentType === 'dht22') {
        const p = Number(fields.PIN ?? 4);
        if (!existingPins.has(p)) {
          try {
            engine.addComponent('dht22', { boardPin: p });
            existingPins.add(p);
          } catch {
            /* pin in use */
          }
        }
      }
      if (componentType === 'hc_sr04') {
        const p = Number(fields.PIN ?? 5);
        if (!existingPins.has(p)) {
          try {
            engine.addComponent('hc_sr04', {
              boardPin: p,
              echoPin: block.getField('ECHO') ? Number(block.getFieldValue('ECHO')) : p + 1,
            });
            existingPins.add(p);
          } catch {
            /* pin in use */
          }
        }
      }
    }
  }, []);

  useEffect(() => {
    void componentsApi.getRegistry().then((registry) => {
      if (registry.boards.length > 0) {
        hydrateComponentRegistry(registry as unknown as ComponentRegistrySnapshot);
      }
    });
  }, []);

  useEffect(() => {
    if (!blocklyRef.current || !sceneRef.current || workspaceRef.current) return;

    const engine = new SimulatorEngine({
      boardId: toVirtualBoardId(boardId),
      onStateChange: setSimState,
    });
    engine.mountVisualization(sceneRef.current);
    engineRef.current = engine;

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
          setStatus('Failed to load project');
        }
      }
      if (doc?.blocks) {
        loadWorkspaceDocument(ws, doc);
        setBoardId(doc.board);
        setProjectName(doc.name);
      }
      engine.setBoard(toVirtualBoardId(doc?.board ?? boardId));
      refreshCode();
      syncComponentsFromBlocks();
      setStatus('Simulator ready — add components or run blocks');
    };

    void loadInitial();
    ws.addChangeListener(() => {
      refreshCode();
    });

    const onResize = () => engine.resizeVisualization();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      ws.dispose();
      workspaceRef.current = null;
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once; board changes handled below
  }, [accessToken, initialDocument, projectId]);

  useEffect(() => {
    engineRef.current?.setBoard(toVirtualBoardId(boardId));
    refreshCode();
  }, [boardId, refreshCode]);

  const handleAddComponent = (type: SimComponentType) => {
    const engine = engineRef.current;
    if (!engine) return;
    try {
      const id = engine.addComponent(type);
      setSelectedComponentId(id);
      setStatus(`Added ${paletteComponentLabel(type)}`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not add component');
    }
  };

  const handleStart = () => {
    syncComponentsFromBlocks();
    refreshCode();
    engineRef.current?.start();
    setStatus('Simulation running');
  };

  const handleStop = () => {
    engineRef.current?.stop();
    setStatus('Simulation stopped');
  };

  const handleReset = () => {
    engineRef.current?.reset();
    setSelectedComponentId(null);
    setStatus('Simulation reset');
  };

  const handleSave = async () => {
    const ws = workspaceRef.current;
    if (!ws || !accessToken) {
      setStatus('Sign in to save');
      return;
    }
    setSaving(true);
    try {
      const doc = serializeWorkspace(ws, {
        project_id: dbProjectId ?? projectId ?? `sim_${Date.now()}`,
        name: projectName,
        board: boardId,
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
        window.history.replaceState(null, '', `/simulator/${created.id}`);
      }
      setStatus(`Saved ${new Date().toLocaleTimeString()}`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const selectedPlacement = simState?.components.find((c) => c.id === selectedComponentId);
  const selectedRuntime = selectedComponentId
    ? simState?.componentStates[selectedComponentId]
    : undefined;

  const updateManual = (patch: Parameters<SimulatorEngine['setComponentManualState']>[1]) => {
    if (!selectedComponentId || !engineRef.current) return;
    engineRef.current.setComponentManualState(selectedComponentId, patch);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-3">
        <input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium"
          aria-label="Project name"
        />
        <select
          value={boardId}
          onChange={(e) => setBoardId(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          aria-label="Virtual board"
        >
          {listVirtualBoards().map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted">{status}</span>
        {simState && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              simState.runState === 'running'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                : simState.runState === 'stopped'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-600'
            }`}
          >
            {simState.runState}
          </span>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={() => engineRef.current?.zoomIn()}>
            Zoom +
          </Button>
          <Button type="button" variant="ghost" onClick={() => engineRef.current?.zoomOut()}>
            Zoom −
          </Button>
          <Button type="button" variant="ghost" onClick={() => engineRef.current?.resetView()}>
            Reset view
          </Button>
          <Button type="button" variant="ghost" onClick={syncComponentsFromBlocks}>
            Sync Components
          </Button>
          <Button type="button" onClick={handleStart}>
            Start
          </Button>
          <Button type="button" variant="ghost" onClick={handleStop}>
            Stop
          </Button>
          <Button type="button" variant="ghost" onClick={handleReset}>
            Reset
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <section className="flex min-w-0 flex-1 flex-col border-r border-border">
          <div className="border-b border-border bg-background px-3 py-1 text-xs font-medium text-muted">
            Blockly Program
          </div>
          <div ref={blocklyRef} className="relative min-h-0 flex-1" />
        </section>

        <section className="flex w-[42%] min-w-[320px] flex-col border-r border-border">
          <div className="border-b border-border bg-background px-3 py-1 text-xs font-medium text-muted">
            Virtual Board · scroll zoom · Shift+drag pan · wire connections shown
          </div>
          <div ref={sceneRef} className="min-h-0 flex-1 bg-slate-100 dark:bg-slate-900 transition-colors" />
          {simState && (
            <div className="max-h-24 overflow-auto border-t border-border bg-card p-2 font-mono text-[10px] text-muted">
              {simState.serialLog.slice(-4).map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          )}
        </section>

        <aside className="flex w-72 shrink-0 flex-col overflow-hidden border-border bg-background">
          <div className="border-b border-border p-3">
            <h3 className="text-sm font-semibold">Component Palette</h3>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {PALETTE_COMPONENTS.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleAddComponent(type)}
                  className="rounded-lg border border-border bg-card px-2 py-2 text-xs font-medium hover:border-primary"
                >
                  {paletteComponentLabel(type)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto border-t border-border p-3">
            <h3 className="text-sm font-semibold">Placed Components</h3>
            <ul className="mt-2 space-y-1">
              {simState?.components.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedComponentId(c.id)}
                    className={`w-full rounded px-2 py-1 text-left text-xs ${
                      selectedComponentId === c.id ? 'bg-primary/10 text-primary' : 'hover:bg-card'
                    }`}
                  >
                    {c.label} — pin {c.boardPin}
                  </button>
                </li>
              ))}
              {!simState?.components.length && (
                <li className="text-xs text-muted">No components yet</li>
              )}
            </ul>

            {validationIssues.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold">Validation</h3>
                <ul className="mt-1 max-h-24 space-y-0.5 overflow-y-auto text-[10px]">
                  {validationIssues.slice(0, 6).map((issue, i) => (
                    <li key={`${issue.code}-${i}`} className="text-amber-600">
                      {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="border-t border-border p-3">
            <h3 className="text-sm font-semibold">Property Inspector</h3>
            {!selectedPlacement && (
              <p className="mt-2 text-xs text-muted">Select a component to edit properties</p>
            )}
            {selectedPlacement?.type === 'led' && (
              <label className="mt-2 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={selectedRuntime?.led?.on ?? false}
                  onChange={(e) => updateManual({ ledOn: e.target.checked })}
                />
                LED ON
              </label>
            )}
            {selectedPlacement?.type === 'servo' && (
              <label className="mt-2 block text-xs">
                Angle (0–180°)
                <input
                  type="range"
                  min={0}
                  max={180}
                  value={selectedRuntime?.servo?.angle ?? 90}
                  onChange={(e) => updateManual({ servoAngle: Number(e.target.value) })}
                  className="w-full"
                />
              </label>
            )}
            {selectedPlacement?.type === 'buzzer' && (
              <label className="mt-2 block text-xs">
                Tone (Hz)
                <input
                  type="range"
                  min={0}
                  max={5000}
                  step={50}
                  value={selectedRuntime?.buzzer?.frequency ?? 0}
                  onChange={(e) => updateManual({ buzzerFrequency: Number(e.target.value) })}
                  className="w-full"
                />
              </label>
            )}
            {selectedPlacement?.type === 'dht22' && (
              <div className="mt-2 space-y-2 text-xs">
                <label className="block">
                  Temperature (°C)
                  <input
                    type="range"
                    min={-10}
                    max={50}
                    value={selectedRuntime?.dht22?.temperatureC ?? 24}
                    onChange={(e) =>
                      updateManual({
                        temperatureC: Number(e.target.value),
                        humidityPercent: selectedRuntime?.dht22?.humidityPercent,
                      })
                    }
                    className="w-full"
                  />
                </label>
                <label className="block">
                  Humidity (%)
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={selectedRuntime?.dht22?.humidityPercent ?? 55}
                    onChange={(e) =>
                      updateManual({
                        humidityPercent: Number(e.target.value),
                        temperatureC: selectedRuntime?.dht22?.temperatureC,
                      })
                    }
                    className="w-full"
                  />
                </label>
              </div>
            )}
            {selectedPlacement?.type === 'hc_sr04' && (
              <label className="mt-2 block text-xs">
                Distance (cm)
                <input
                  type="range"
                  min={2}
                  max={400}
                  value={selectedRuntime?.hcSr04?.distanceCm ?? 30}
                  onChange={(e) => updateManual({ distanceCm: Number(e.target.value) })}
                  className="w-full"
                />
              </label>
            )}
          </div>

          <div className="border-t border-border p-3">
            <h3 className="text-xs font-semibold text-muted">Generated code preview</h3>
            <pre className="mt-1 max-h-28 overflow-auto rounded bg-[#0F172A] p-2 font-mono text-[10px] text-slate-200">
              {generatedCode.slice(0, 400) || '// Add blocks to generate code'}
              {generatedCode.length > 400 ? '…' : ''}
            </pre>
          </div>
        </aside>
      </div>
    </div>
  );
}
