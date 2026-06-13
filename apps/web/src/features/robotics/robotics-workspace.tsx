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
import { ComponentPalette } from '@/features/simulator/component-palette';
import { PinAssignmentPanel } from '@/features/simulator/pin-assignment-panel';
import { usePinAssignmentStore, BOARD_ASSET_IDS, COMPONENT_PIN_CATALOG } from '@/features/simulator/pin-assignment-store';
import { generateWireForAssignment, removeWire } from '@/features/simulator/auto-wire-generator';
import { SmartPlacementEngine, ROBOTICS_BREADBOARD_LAYOUT, COMPONENT_DIMENSIONS } from '@/features/simulator/smart-placement';
import type { PinAssignment } from '@/features/simulator/pin-assignment-store';

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
  const [activeTab, setActiveTab] = useState<'blocks' | 'code' | 'serial' | 'simulator'>('blocks');
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

  const pixiContainerRef = useRef<HTMLDivElement>(null);
  const simRuntimeRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const simObjectCounterRef = useRef(0);
  const placementEngineRef = useRef<SmartPlacementEngine | null>(null);
  const componentAssetsRef = useRef<Array<{
    assetId: string;
    imageWidth?: number;
    imageHeight?: number;
    pinCoordinates?: Array<{ name: string; pixelX: number; pixelY: number }>;
  }>>([]);

  useEffect(() => {
    const container = pixiContainerRef.current;
    if (activeTab !== 'simulator' || !container) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let runtime: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let adapter: any = null;
    let animationFrameId: number | null = null;
    let destroyed = false;

    const setupPixi = async () => {
      try {
        const { Application } = await import('pixi.js');
        const {
          BaseRuntime,
          PixiRendererAdapter,
          ESP32_DEVKIT_V1_ASSET,
          ARDUINO_UNO_R3_ASSET,
          ARDUINO_NANO_ASSET,
          BREADBOARD_830_ASSET,
          BREADBOARD_400_ASSET,
          BREADBOARD_MINI_ASSET,
          LED_ASSET,
          HC_SR04_ASSET,
          RESISTOR_ASSET,
          SG90_SERVO_ASSET,
          OLED_SSD1306_ASSET,
          LCD1602_ASSET,
          RELAY_MODULE_ASSET,
          IR_SENSOR_ASSET,
          MQ2_SENSOR_ASSET,
          DHT11_SENSOR_ASSET,
          BUZZER_ASSET,
          POTENTIOMETER_ASSET,
          PUSH_BUTTON_ASSET,
        } = await import('@stemverse/runtime-engine');

        if (destroyed) return;

        runtime = new BaseRuntime();
        await runtime.initialize();

        if (destroyed) {
          runtime.destroy();
          runtime = null;
          return;
        }

        // Register ALL component assets for drag-and-drop
        runtime.registerComponentAsset(ESP32_DEVKIT_V1_ASSET);
        runtime.registerComponentAsset(ARDUINO_UNO_R3_ASSET);
        runtime.registerComponentAsset(ARDUINO_NANO_ASSET);
        runtime.registerComponentAsset(BREADBOARD_830_ASSET);
        runtime.registerComponentAsset(BREADBOARD_400_ASSET);
        runtime.registerComponentAsset(BREADBOARD_MINI_ASSET);
        runtime.registerComponentAsset(LED_ASSET);
        runtime.registerComponentAsset(HC_SR04_ASSET);
        runtime.registerComponentAsset(RESISTOR_ASSET);
        runtime.registerComponentAsset(SG90_SERVO_ASSET);
        runtime.registerComponentAsset(OLED_SSD1306_ASSET);
        runtime.registerComponentAsset(LCD1602_ASSET);
        runtime.registerComponentAsset(RELAY_MODULE_ASSET);
        runtime.registerComponentAsset(IR_SENSOR_ASSET);
        runtime.registerComponentAsset(MQ2_SENSOR_ASSET);
        runtime.registerComponentAsset(DHT11_SENSOR_ASSET);
        runtime.registerComponentAsset(BUZZER_ASSET);
        runtime.registerComponentAsset(POTENTIOMETER_ASSET);
        runtime.registerComponentAsset(PUSH_BUTTON_ASSET);

        // Add Stage target to runtime
        const stage = {
          id: 'stage',
          name: 'Stage',
          isStage: true,
          variables: {},
          lists: {},
          costumes: [],
          currentCostumeIndex: 0,
          sounds: [],
          volume: 100,
          scripts: [],
          x: 0,
          y: 0,
          direction: 90,
          visible: true,
          size: 100,
          draggable: false,
          rotationStyle: 'all around',
          layerOrder: 0,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        runtime.addTarget(stage as any);

        // Register workspace objects (Breadboard, ESP32, LED, Resistor)
        runtime.registerWorkspaceObjectModel({
          objectId: 'breadboard_1',
          objectType: 'breadboard_830',
          positionX: 50,
          positionY: 200,
          rotation: 0,
          scale: 0.6,
          selected: false,
          locked: false,
          metadata: {},
        });

        const activeBoardAssetId = boardId.startsWith('esp32')
          ? 'esp32_devkit_v1'
          : boardId === 'arduino_uno'
          ? 'arduino_uno_r3'
          : 'arduino_nano';

        runtime.registerWorkspaceObjectModel({
          objectId: 'board_1',
          objectType: activeBoardAssetId,
          positionX: 100,
          positionY: 80,
          rotation: 0,
          scale: 0.6,
          selected: false,
          locked: false,
          metadata: {},
        });

        // Users will drag components from the palette — no hardcoded components

        const app = new Application();
        await app.init({
          width: 800,
          height: 600,
          backgroundColor: 0x0f172a,
        });

        if (destroyed) {
          app.destroy();
          runtime.destroy();
          runtime = null;
          return;
        }

        adapter = new PixiRendererAdapter({ app, runtime });
        adapter.initialize();

        if (destroyed) {
          adapter.destroy();
          adapter = null;
          runtime.destroy();
          runtime = null;
          return;
        }

        if (adapter.app?.canvas && container) {
          container.appendChild(adapter.app.canvas);
        } else if (adapter.app?.view && container) {
          container.appendChild(adapter.app.view);
        }

        let vizClockTick = 0;
        const syncLoop = () => {
          if (destroyed) return;
          // Phase 20C: update live electrical visualization state each frame
          try { runtime.updateElectricalVisualizationState(vizClockTick++); } catch {}
          adapter.syncStage(runtime.getStageSnapshot());
          animationFrameId = requestAnimationFrame(syncLoop);
        };
        syncLoop();

        // Store runtime ref for drag-and-drop
        simRuntimeRef.current = runtime;

        // Build lightweight asset lookup for auto-wire generator
        const allAssets = [
          ESP32_DEVKIT_V1_ASSET, ARDUINO_UNO_R3_ASSET, ARDUINO_NANO_ASSET,
          BREADBOARD_830_ASSET, BREADBOARD_400_ASSET, BREADBOARD_MINI_ASSET,
          LED_ASSET, HC_SR04_ASSET, RESISTOR_ASSET, SG90_SERVO_ASSET,
          OLED_SSD1306_ASSET, LCD1602_ASSET, RELAY_MODULE_ASSET,
          IR_SENSOR_ASSET, MQ2_SENSOR_ASSET, DHT11_SENSOR_ASSET,
          BUZZER_ASSET, POTENTIOMETER_ASSET, PUSH_BUTTON_ASSET,
        ];
        componentAssetsRef.current = allAssets.map((a: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
          assetId: a.assetId,
          imageWidth: a.imageWidth,
          imageHeight: a.imageHeight,
          pinCoordinates: a.pinCoordinates,
        }));

        // Create smart placement engine
        placementEngineRef.current = new SmartPlacementEngine(ROBOTICS_BREADBOARD_LAYOUT);

        // Auto-register the board in pin assignment store
        usePinAssignmentStore.getState().setBoard('board_1', activeBoardAssetId);

      } catch (err) {
        console.error('Failed to load Pixi workspace:', err);
      }
    };

    void setupPixi();

    return () => {
      destroyed = true;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      if (adapter) {
        if (adapter.app?.canvas && container) {
          try {
            container.removeChild(adapter.app.canvas);
          } catch {}
        } else if (adapter.app?.view && container) {
          try {
            container.removeChild(adapter.app.view);
          } catch {}
        }
        adapter.destroy();
      }
      if (runtime) {
        runtime.destroy();
      }
      simRuntimeRef.current = null;
    };
  }, [activeTab, boardId]);

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

  const refreshCodeRef = useRef(refreshCode);
  refreshCodeRef.current = refreshCode;

  useEffect(() => {
    refreshCodeRef.current();
  }, [boardId, boardSettings]);

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
      refreshCodeRef.current();
      setStatus(projectId ? `Project ${projectId.slice(0, 8)}…` : 'New project');
    };

    void loadInitial();

    const wsListener = () => {
      refreshCodeRef.current();
    };
    ws.addChangeListener(wsListener);

    const onSelect = () => {
      const selected = Blockly.getSelected();
      if (!selected || !('type' in selected)) {
        setSelectedBlock(null);
        return;
      }
      const block = selected as unknown as import('blockly/core').Block;
      if (!block.inputList) {
        setSelectedBlock(null);
        return;
      }
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
      ws.removeChangeListener(wsListener);
      ws.removeChangeListener(onSelect);
      ws.dispose();
      workspaceRef.current = null;
    };
  }, [initialDocument, projectId, accessToken]);

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

  /* ── Simulator tab: Drag-and-drop handlers ─────────────────────── */
  const pinSetBoard = usePinAssignmentStore((s) => s.setBoard);
  const pinAddComponent = usePinAssignmentStore((s) => s.addComponent);
  const pinRemoveComponent = usePinAssignmentStore((s) => s.removeComponent);
  const pinAutoAssignPower = usePinAssignmentStore((s) => s.autoAssignPowerPins);

  const handleSimDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleSimDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const assetId = e.dataTransfer.getData('application/x-stemverse-asset');
      if (!assetId || !simRuntimeRef.current) return;

      const objectId = `${assetId}_${++simObjectCounterRef.current}`;

      // ── Smart placement: auto-position below breadboard ────────
      const dims = COMPONENT_DIMENSIONS[assetId];
      const imgW = dims?.w ?? 100;
      const imgH = dims?.h ?? 100;
      const compScale = dims?.defaultScale ?? 1.0;

      let posX: number;
      let posY: number;
      const engine = placementEngineRef.current;
      if (engine && !BOARD_ASSET_IDS.has(assetId)) {
        const pos = engine.place(objectId, imgW, imgH, compScale);
        posX = pos.x;
        posY = pos.y;
      } else {
        // Boards use drop position
        const container = pixiContainerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        posX = e.clientX - rect.left;
        posY = e.clientY - rect.top;
      }

      try {
        simRuntimeRef.current.registerWorkspaceObjectModel({
          objectId,
          objectType: assetId,
          positionX: Math.round(posX),
          positionY: Math.round(posY),
          rotation: 0,
          scale: compScale,
          selected: false,
          locked: false,
          metadata: {},
        });

        // Pin assignment integration
        if (BOARD_ASSET_IDS.has(assetId)) {
          pinSetBoard(objectId, assetId);
          setStatus(`Board ${assetId} placed`);
        } else if (COMPONENT_PIN_CATALOG[assetId]) {
          const catalog = COMPONENT_PIN_CATALOG[assetId];
          pinAddComponent({
            objectId,
            objectType: assetId,
            displayName: catalog.displayName,
            pins: catalog.pins,
          });
          pinAutoAssignPower(objectId);

          // ── Auto-wire VCC/GND after placement ───────────────────
          // Small delay to ensure the runtime has the object registered
          setTimeout(() => {
            const rt = simRuntimeRef.current;
            if (!rt) return;
            const store = usePinAssignmentStore.getState();
            const autoAssignments = store.assignments.filter(
              (a) => a.componentObjectId === objectId && a.isAutoAssigned,
            );
            for (const assignment of autoAssignments) {
              const wireId = generateWireForAssignment(
                assignment,
                rt,
                componentAssetsRef.current,
              );
              if (wireId) {
                usePinAssignmentStore.getState().setWireId(
                  assignment.componentObjectId,
                  assignment.componentPinName,
                  wireId,
                );
              }
            }
            if (autoAssignments.length > 0) {
              setStatus(`${catalog.displayName} placed — VCC/GND auto-wired. Assign GPIO pins →`);
            }
          }, 150);

          setStatus(`${catalog.displayName} auto-placed — wiring power pins…`);
        }
      } catch (err) {
        setStatus(err instanceof Error ? err.message : 'Failed to add component');
      }
    },
    [pinSetBoard, pinAddComponent, pinAutoAssignPower],
  );

  const handleSimDeleteComponent = useCallback(
    (id: string) => {
      const runtime = simRuntimeRef.current;
      if (!runtime) return;

      // Remove all wires for this component
      const store = usePinAssignmentStore.getState();
      const compAssignments = store.assignments.filter((a) => a.componentObjectId === id);
      for (const a of compAssignments) {
        if (a.wireId) {
          removeWire(a.wireId, runtime);
        }
      }

      try {
        runtime.removeWorkspaceObject?.(id);
      } catch { /* noop */ }

      // Remove from placement engine
      placementEngineRef.current?.remove(id);

      pinRemoveComponent(id);
      setStatus(`Deleted ${id}`);
    },
    [pinRemoveComponent],
  );

  /** Generate a wire when a GPIO pin is assigned in the Pin Assignment Panel */
  const handleWireGenerated = useCallback(
    (assignment: PinAssignment, _prevWireId: string) => {
      const runtime = simRuntimeRef.current;
      if (!runtime) return;

      // Remove old wire if it exists
      if (assignment.wireId) {
        removeWire(assignment.wireId, runtime);
      }

      const wireId = generateWireForAssignment(
        assignment,
        runtime,
        componentAssetsRef.current,
      );
      if (wireId) {
        usePinAssignmentStore.getState().setWireId(
          assignment.componentObjectId,
          assignment.componentPinName,
          wireId,
        );
        setStatus(`Wire: ${assignment.componentPinName} → ${assignment.boardPinName}`);
      } else {
        setStatus(`Could not route wire for ${assignment.componentPinName}`);
      }
    },
    [],
  );

  const handleComponentDrag = useCallback((_assetId: string) => { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Visual feedback placeholder
  }, []);

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
          {(['blocks', 'code', 'serial', 'simulator'] as const).map((tab) => (
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
          {activeTab === 'simulator' && (
            <div className="absolute inset-0 flex flex-col">
              <div className="border-b border-[#334155] bg-[#1E293B] px-4 py-1 text-xs text-[#94A3B8] flex items-center justify-between">
                <span>Simulator — Drag components from the palette onto the canvas</span>
                <span className="text-[#64748B]">Drop → Auto-wire VCC/GND → Assign GPIO pins</span>
              </div>
              <div className="flex flex-1 min-h-0">
                {/* Left: Component Palette */}
                <ComponentPalette onComponentDrag={handleComponentDrag} />

                {/* Center: Pixi Canvas */}
                <div
                  className="flex-1 bg-[#0F172A] relative overflow-hidden"
                  ref={pixiContainerRef}
                  onDragOver={handleSimDragOver}
                  onDrop={handleSimDrop}
                />

                {/* Right: Pin Assignment Panel */}
                <PinAssignmentPanel
                  runtime={simRuntimeRef.current}
                  onDeleteComponent={handleSimDeleteComponent}
                  onWireGenerated={handleWireGenerated}
                />
              </div>
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
