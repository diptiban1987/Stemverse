'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  type CodegenTarget,
  parseWorkspaceDocument,
} from '@stemverse/blockly-engine';
import * as Blockly from 'blockly/core';
import type { WorkspaceSvg } from 'blockly/core';
import { BoardManager } from './board-manager';
import { SerialMonitor } from './serial-monitor';
import { AiAssistantPanel } from './ai-assistant-panel';
import { AiCopilotPanel } from './ai-copilot-panel';
import { AutoFixPanel } from './auto-fix-panel';
import { VersionHistoryPanel } from './version-history-panel';
import { CircuitValidationPanel } from './circuit-validation-panel';
import { uploadMicroPython, isWebSerialSupported } from './web-serial-upload';
import type { UploadStatus } from './web-serial-upload';
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
import { ComponentCatalog } from '@/features/simulator/component-catalog';
import { PinAssignmentPanel } from '@/features/simulator/pin-assignment-panel';
import { PropertyPanel } from '@/features/simulator/property-panel';
import { PinInspector } from '@/features/simulator/pin-inspector';
import { PinConnectionTable } from '@/features/simulator/pin-connection-table';
import { usePinAssignmentStore, BOARD_ASSET_IDS, COMPONENT_PIN_CATALOG } from '@/features/simulator/pin-assignment-store';
import { generateWireForAssignment, removeWire } from '@/features/simulator/auto-wire-generator';
import { SmartPlacementEngine, ROBOTICS_BREADBOARD_LAYOUT, COMPONENT_DIMENSIONS } from '@/features/simulator/smart-placement';
import type { PinAssignment } from '@/features/simulator/pin-assignment-store';
import { detectComponentsFromCode } from '@/features/simulator/block-to-simulator-sync';
import {
  ZoomIn, ZoomOut, Maximize2, Table2,
  Code2, Upload, Copy, Check, ChevronDown,
  Save, FolderOpen, FileDown, FileUp, ClipboardPaste, FileCode2,
  Usb, AlertTriangle,
  MousePointer2, Pen, Hand, Trash2, RotateCw,
  Play, Square,
} from 'lucide-react';

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
  const [codeTarget, setCodeTarget] = useState<CodegenTarget>('arduino_cpp');
  const [activeTab, setActiveTab] = useState<'blocks' | 'simulator'>('blocks');
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
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [codeCopied, setCodeCopied] = useState(false);
  const serialPortRef = useRef<SerialPort | null>(null);

  const pixiContainerRef = useRef<HTMLDivElement>(null);
  const simRuntimeRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const simAdapterRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const simObjectCounterRef = useRef(0);
  const placementEngineRef = useRef<SmartPlacementEngine | null>(null);
  const componentAssetsRef = useRef<Array<{
    assetId: string;
    imageWidth?: number;
    imageHeight?: number;
    pinCoordinates?: Array<{ name: string; pixelX: number; pixelY: number }>;
  }>>([]);

  /* ── Phase 28A: Circuit editor tool state ─────────────────────────── */
  type CircuitTool = 'select' | 'wire' | 'pan' | 'delete' | 'rotate';
  const [circuitTool, setCircuitTool] = useState<CircuitTool>('select');
  const [selectedSimComponentId, setSelectedSimComponentId] = useState<string | null>(null);
  const [showConnectionTable, setShowConnectionTable] = useState(false);
  const [simRunning, setSimRunning] = useState(false);
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Canvas zoom state ──────────────────────────────────────────── */
  const [canvasZoom, setCanvasZoom] = useState(1);
  const canvasZoomRef = useRef(1);
  const MIN_ZOOM = 0.3;
  const MAX_ZOOM = 3.0;
  const ZOOM_STEP = 0.1;

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
          positionX: 350,
          positionY: 150,
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
          positionY: 150,
          rotation: 0,
          scale: 0.55,
          selected: false,
          locked: false,
          metadata: {},
        });

        // Users will drag components from the palette — no hardcoded components

        const app = new Application();
        const containerRect = container.getBoundingClientRect();
        await app.init({
          width: containerRect.width || 800,
          height: containerRect.height || 600,
          backgroundColor: 0xD4D4D4,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
        });

        if (destroyed) {
          app.destroy();
          runtime.destroy();
          runtime = null;
          return;
        }

        adapter = new PixiRendererAdapter({ app, runtime });
        adapter.initialize();
        simAdapterRef.current = adapter;

        if (destroyed) {
          adapter.destroy();
          adapter = null;
          runtime.destroy();
          runtime = null;
          return;
        }

        if (adapter.app?.canvas && container) {
          container.appendChild(adapter.app.canvas);
          // Make canvas fill its container
          const c = adapter.app.canvas as HTMLCanvasElement;
          c.style.width = '100%';
          c.style.height = '100%';
          c.style.display = 'block';
        } else if (adapter.app?.view && container) {
          container.appendChild(adapter.app.view);
          const c = adapter.app.view as HTMLCanvasElement;
          c.style.width = '100%';
          c.style.height = '100%';
          c.style.display = 'block';
        }

        // ── ResizeObserver: keep renderer in sync with container size ──
        let resizeTimer: ReturnType<typeof setTimeout> | null = null;
        const ro = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0 && !destroyed) {
              try {
                adapter?.app?.renderer?.resize(width, height);
              } catch { /* noop */ }

              // Debounce camera re-fit after sidebar transition (300ms)
              if (resizeTimer) clearTimeout(resizeTimer);
              resizeTimer = setTimeout(() => {
                if (destroyed || !runtime) return;
                try {
                  const allObjs = runtime.getWorkspaceObjectModels?.() ?? [];
                  if (allObjs.length === 0) return;
                  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                  for (const obj of allObjs) {
                    const x = obj.positionX || 0;
                    const y = obj.positionY || 0;
                    const w = 200, h = 200;
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x + w);
                    maxY = Math.max(maxY, y + h);
                  }
                  const contentW = maxX - minX || 800;
                  const contentH = maxY - minY || 600;
                  const pad = 60;
                  const zoom = Math.min((width - pad) / contentW, (height - pad) / contentH, 1.5);
                  const cx = (width - contentW * zoom) / 2 - minX * zoom;
                  const cy = (height - contentH * zoom) / 2 - minY * zoom;
                  if (adapter?.app?.stage) {
                    adapter.app.stage.scale.set(zoom);
                    adapter.app.stage.position.set(cx, cy);
                  }
                  canvasZoomRef.current = zoom;
                  setCanvasZoom(zoom);
                } catch { /* noop */ }
              }, 350);
            }
          }
        });
        ro.observe(container);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (container as any).__resizeObserver = ro;

        // ── Canvas zoom via mouse wheel ──────────────────────────────
        const handleWheel = (e: WheelEvent) => {
          e.preventDefault();
          e.stopPropagation();
          const rt = simRuntimeRef.current;
          if (!rt) return;

          const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
          const oldZoom = canvasZoomRef.current;
          const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZoom + delta));
          if (newZoom === oldZoom) return;

          // Zoom toward mouse cursor position
          const rect = container.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          const cam = rt.getCameraState?.() || { x: 0, y: 0, zoom: 1 };
          const worldX = (mouseX - cam.x) / oldZoom;
          const worldY = (mouseY - cam.y) / oldZoom;
          const newCamX = mouseX - worldX * newZoom;
          const newCamY = mouseY - worldY * newZoom;

          rt.setCameraZoom?.(newZoom);
          rt.setCameraPosition?.(newCamX, newCamY);
          canvasZoomRef.current = newZoom;
          setCanvasZoom(newZoom);
        };

        container.addEventListener('wheel', handleWheel, { passive: false });

        // Store cleanup ref
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (container as any).__wheelCleanup = () => {
          container.removeEventListener('wheel', handleWheel);
        };

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
      // Clean up wheel listener
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (container && (container as any).__wheelCleanup) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (container as any).__wheelCleanup();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (container as any).__wheelCleanup;
      }
      // Clean up ResizeObserver
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (container && (container as any).__resizeObserver) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (container as any).__resizeObserver.disconnect();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (container as any).__resizeObserver;
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
      canvasZoomRef.current = 1;
      setCanvasZoom(1);
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
    // Use the user-selected code target (dropdown)
    const result = generateCodeFromWorkspace(ws, boardId, board.name, codeTarget);
    setGeneratedCode(result.code);
    setWorkspaceSnapshot(
      serializeWorkspace(ws, {
        project_id: dbProjectId ?? projectId ?? 'draft',
        name: projectName,
        board: boardId,
        board_settings: boardSettings,
      }),
    );
  }, [boardId, boardSettings, codeTarget, dbProjectId, projectId, projectName]);

  useEffect(() => {
    void componentsApi.getRegistry().then((registry) => {
      if (registry.boards.length > 0) {
        hydrateComponentRegistry(registry as unknown as ComponentRegistrySnapshot);
      }
    });
  }, []);

  /* Disable scrolling on the AppShell's <main> while the studio is mounted */
  useEffect(() => {
    const el = document.querySelector('.robotics-studio-root');
    const parent = el?.parentElement;
    if (!parent) return;
    const prev = parent.style.overflow;
    parent.style.overflow = 'hidden';
    return () => { parent.style.overflow = prev; };
  }, []);

  const refreshCodeRef = useRef(refreshCode);
  refreshCodeRef.current = refreshCode;

  useEffect(() => {
    refreshCodeRef.current();
  }, [boardId, boardSettings, codeTarget]);

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

    // ResizeObserver: call Blockly.svgResize when container changes size
    // (e.g., sidebar collapse/expand)
    const blocklyContainer = blocklyRef.current;
    let blocklyResizeTimer: ReturnType<typeof setTimeout> | null = null;
    const blocklyRo = new ResizeObserver(() => {
      // Debounce to avoid excessive recalcs during sidebar transition
      if (blocklyResizeTimer) clearTimeout(blocklyResizeTimer);
      blocklyResizeTimer = setTimeout(() => {
        if (workspaceRef.current) {
          Blockly.svgResize(workspaceRef.current);
        }
      }, 100);
    });
    if (blocklyContainer) {
      blocklyRo.observe(blocklyContainer);
    }

    return () => {
      ws.removeChangeListener(wsListener);
      ws.removeChangeListener(onSelect);
      blocklyRo.disconnect();
      if (blocklyResizeTimer) clearTimeout(blocklyResizeTimer);
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
    const ext = currentFormat.ext.replace('.', '');
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Import blocks (.workspace.json) from local file ────────── */
  const blocksFileRef = useRef<HTMLInputElement>(null);
  const handleImportBlocks = () => {
    blocksFileRef.current?.click();
  };
  const onBlocksFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = reader.result as string;
        const doc = parseWorkspaceDocument(json);
        const ws = workspaceRef.current;
        if (!ws) return;
        loadWorkspaceDocument(ws, doc);
        setBoardId(doc.board);
        setProjectName(doc.name);
        if (doc.board_settings) setBoardSettings(doc.board_settings as BoardSettings);
        refreshCode();
        setStatus(`Imported: ${doc.name}`);
        toast(`Imported: ${doc.name} (${doc.board})`);
      } catch (err) {
        setStatus(`Import failed: ${(err as Error).message}`);
        toast(`Import failed: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset so same file can be re-imported
  };

  /* ── Import code file (.ino, .py, .c, etc.) ────────────────── */
  const codeFileRef = useRef<HTMLInputElement>(null);
  const handleImportCode = () => {
    codeFileRef.current?.click();
  };
  const onCodeFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const code = reader.result as string;
      setGeneratedCode(code);
      // Auto-detect language from file extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'py') {
        setCodeTarget('micropython');
      } else if (ext === 'ino' || ext === 'cpp') {
        setCodeTarget('arduino_cpp');
      } else if (ext === 'c') {
        setCodeTarget('esp_idf');
      }
      setStatus(`Code imported: ${file.name}`);
      toast(`Code imported: ${file.name}`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  /* ── Paste code from clipboard ─────────────────────────────── */
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteCode, setPasteCode] = useState('');
  const [pasteLanguage, setPasteLanguage] = useState<CodegenTarget>('arduino_cpp');

  /* ── Connect board first modal ─────────────────────────────── */
  const [connectModalType, setConnectModalType] = useState<'none' | 'serial' | 'server'>('none');

  const handlePasteCodeApply = () => {
    if (!pasteCode.trim()) return;
    setGeneratedCode(pasteCode);
    setCodeTarget(pasteLanguage);
    setShowPasteModal(false);
    setPasteCode('');
    setStatus('Code pasted — blocks will sync on next workspace change');
    toast(`Code applied: ${pasteLanguage} code loaded into editor`);
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
        const pos = engine.placeByType(objectId, assetId, imgW, imgH, compScale);
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
                simAdapterRef.current?.sceneRenderer?.renderScaleMap,
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
    (assignment: PinAssignment) => {
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
        simAdapterRef.current?.sceneRenderer?.renderScaleMap,
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

  /* ── Phase 28A: Circuit editor keyboard shortcuts ───────────────── */
  useEffect(() => {
    if (activeTab !== 'simulator') return;

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Tool shortcuts (no modifier keys)
      if (!e.ctrlKey && !e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'v': setCircuitTool('select'); break;
          case 'w': setCircuitTool('wire'); break;
          case 'h': setCircuitTool('pan'); break;
          case 'r': setCircuitTool('rotate'); break;
          case 'x': setCircuitTool('delete'); break;
        }
      }

      // Delete selected component
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedSimComponentId) {
        handleSimDeleteComponent(selectedSimComponentId);
        setSelectedSimComponentId(null);
      }

      // Escape = back to select tool
      if (e.key === 'Escape') {
        setCircuitTool('select');
        setSelectedSimComponentId(null);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTab, selectedSimComponentId, handleSimDeleteComponent]);

  /* ── Phase 31A.1: Auto-place components from blocks when switching to simulator ── */
  useEffect(() => {
    if (activeTab !== 'simulator') return;
    if (!generatedCode.trim()) return;

    const runtime = simRuntimeRef.current;
    if (!runtime) return;

    // Detect which components are needed from the block code
    const detected = detectComponentsFromCode(generatedCode);
    if (detected.length === 0) return;

    // Check which components are already placed
    const existingObjects = runtime.getWorkspaceObjectModels?.() ?? [];
    const existingTypes = new Set(existingObjects.map((o: { objectType: string }) => o.objectType));

    let placedCount = 0;

    for (const comp of detected) {
      // Skip if this component type is already on the canvas
      if (existingTypes.has(comp.assetId)) continue;

      const objectId = `auto_${comp.assetId}_pin${comp.pinNumber}_${Date.now()}`;
      const dims = COMPONENT_DIMENSIONS[comp.assetId];
      const imgW = dims?.w ?? 80;
      const imgH = dims?.h ?? 80;
      const compScale = dims?.defaultScale ?? 1.0;

      // Use smart placement engine for positioning
      const engine = placementEngineRef.current;
      let posX = 350 + placedCount * 120;
      let posY = 400;
      if (engine) {
        const pos = engine.placeByType(objectId, comp.assetId, imgW, imgH, compScale);
        posX = pos.x;
        posY = pos.y;
      }

      try {
        // Register the component on the simulator canvas
        runtime.registerWorkspaceObjectModel({
          objectId,
          objectType: comp.assetId,
          positionX: Math.round(posX),
          positionY: Math.round(posY),
          rotation: 0,
          scale: compScale,
          selected: false,
          locked: false,
          metadata: {},
        });

        // Register in pin assignment store
        const catalog = COMPONENT_PIN_CATALOG[comp.assetId];
        if (catalog) {
          pinAddComponent({
            objectId,
            objectType: comp.assetId,
            displayName: catalog.displayName,
            pins: catalog.pins,
          });
          pinAutoAssignPower(objectId);

          // Auto-assign the signal pin to the detected GPIO
          const store = usePinAssignmentStore.getState();
          if (comp.componentPin && comp.pinName) {
            store.assignPin(objectId, comp.componentPin, comp.pinName);
          }

          // Auto-wire after a short delay to let the runtime register the object
          setTimeout(() => {
            const rt = simRuntimeRef.current;
            if (!rt) return;
            const currentStore = usePinAssignmentStore.getState();
            const compAssignments = currentStore.assignments.filter(
              (a) => a.componentObjectId === objectId,
            );
            for (const assignment of compAssignments) {
              const wireId = generateWireForAssignment(
                assignment,
                rt,
                componentAssetsRef.current,
                simAdapterRef.current?.sceneRenderer?.renderScaleMap,
              );
              if (wireId) {
                currentStore.setWireId(
                  assignment.componentObjectId,
                  assignment.componentPinName,
                  wireId,
                );
              }
            }
          }, 200);
        }

        // Also auto-place a resistor for LEDs
        if (comp.needsResistor && !existingTypes.has('resistor_generic')) {
          const resistorId = `auto_resistor_for_${comp.assetId}_${Date.now()}`;
          const rDims = COMPONENT_DIMENSIONS['resistor_generic'];
          const rScale = rDims?.defaultScale ?? 1.0;
          let rPosX = posX + 60;
          let rPosY = posY;
          if (engine) {
            const rPos = engine.placeByType(resistorId, 'resistor_generic', rDims?.w ?? 60, rDims?.h ?? 30, rScale);
            rPosX = rPos.x;
            rPosY = rPos.y;
          }
          runtime.registerWorkspaceObjectModel({
            objectId: resistorId,
            objectType: 'resistor_generic',
            positionX: Math.round(rPosX),
            positionY: Math.round(rPosY),
            rotation: 0,
            scale: rScale,
            selected: false,
            locked: false,
            metadata: {},
          });
          const rCatalog = COMPONENT_PIN_CATALOG['resistor_generic'];
          if (rCatalog) {
            pinAddComponent({
              objectId: resistorId,
              objectType: 'resistor_generic',
              displayName: rCatalog.displayName,
              pins: rCatalog.pins,
            });
          }
          existingTypes.add('resistor_generic');
        }

        existingTypes.add(comp.assetId);
        placedCount++;
      } catch (err) {
        console.warn('[BlockSync] Failed to auto-place component:', comp.assetId, err);
      }
    }

    if (placedCount > 0) {
      setStatus(`Auto-placed ${placedCount} component(s) from block code`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, generatedCode]);

  /* ── Canvas zoom helpers ──────────────────────────────────────────── */
  const applyZoom = useCallback((newZoom: number, centerOnCanvas = true) => {
    const rt = simRuntimeRef.current;
    if (!rt) return;
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
    if (centerOnCanvas) {
      // Keep the center of the canvas fixed when zooming via buttons
      const cam = rt.getCameraState?.() || { x: 0, y: 0, zoom: 1 };
      const container = pixiContainerRef.current;
      const cx = container ? container.clientWidth / 2 : 400;
      const cy = container ? container.clientHeight / 2 : 300;
      const oldZoom = canvasZoomRef.current;
      const worldX = (cx - cam.x) / oldZoom;
      const worldY = (cy - cam.y) / oldZoom;
      rt.setCameraPosition?.(cx - worldX * clamped, cy - worldY * clamped);
    }
    rt.setCameraZoom?.(clamped);
    canvasZoomRef.current = clamped;
    setCanvasZoom(clamped);
  }, []);

  const handleZoomIn = useCallback(() => applyZoom(canvasZoomRef.current + ZOOM_STEP), [applyZoom]);
  const handleZoomOut = useCallback(() => applyZoom(canvasZoomRef.current - ZOOM_STEP), [applyZoom]);
  const handleZoomReset = useCallback(() => {
    const rt = simRuntimeRef.current;
    if (rt) {
      rt.setCameraPosition?.(0, 0);
    }
    applyZoom(1, false);
  }, [applyZoom]);
  const handleZoomFit = useCallback(() => {
    const rt = simRuntimeRef.current;
    if (rt) {
      rt.setCameraPosition?.(0, 0);
    }
    applyZoom(0.8, false);
  }, [applyZoom]);

  /* ── Code format labels ────────────────────────────────────── */
  const CODE_FORMAT_OPTIONS: Array<{ value: CodegenTarget; label: string; ext: string }> = useMemo(() => [
    { value: 'arduino_cpp', label: 'Arduino C++', ext: '.ino' },
    { value: 'esp_idf', label: 'ESP-IDF C', ext: '.c' },
    { value: 'micropython', label: 'MicroPython', ext: '.py' },
    { value: 'circuitpython', label: 'CircuitPython', ext: '.py' },
  ], []);

  const currentFormat = CODE_FORMAT_OPTIONS.find((f) => f.value === codeTarget) ?? CODE_FORMAT_OPTIONS[0];

  /* ── Copy code to clipboard ────────────────────────────────── */
  const handleCopyCode = useCallback(() => {
    void navigator.clipboard.writeText(generatedCode).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  }, [generatedCode]);

  /* ── Upload code to board ──────────────────────────────────── */
  const handleUpload = useCallback(async () => {
    if (uploadStatus !== 'idle') return;
    if (!generatedCode.trim()) {
      setStatus('No code to upload. Add some blocks first.');
      return;
    }

    try {
      if (codeTarget === 'micropython' || codeTarget === 'circuitpython') {
        // MicroPython/CircuitPython: upload via Web Serial Raw REPL
        if (!isWebSerialSupported()) {
          setStatus('Web Serial not supported. Use Chrome or Edge.');
          return;
        }
        const port = serialPortRef.current;
        if (!port) {
          setConnectModalType('serial');
          return;
        }
        setUploadStatus('connecting');
        const result = await uploadMicroPython(generatedCode, port, setUploadStatus);
        setUploadStatus(result.success ? 'success' : 'error');
        setStatus(result.success ? 'Upload successful!' : `Upload error: ${result.output}`);
        setTimeout(() => setUploadStatus('idle'), 3000);
      } else {
        // Arduino/ESP-IDF: compile + upload via built-in API (auto-detects board)
        setUploadStatus('connecting');
        setStatus('Detecting board & compiling...');

        const resp = await fetch('/api/compile/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: generatedCode, boardId }),
        });

        const data: { success?: boolean; output?: string; port?: string; board?: string; error?: string } =
          await resp.json();

        if (data.success) {
          setUploadStatus('success');
          setStatus(`✅ Upload successful to ${data.port || 'auto-detected'} (${data.board || boardId})`);
        } else {
          setUploadStatus('error');
          // Log full error to console for debugging
          console.error('[Upload Error]', data.output || data.error);
          // Show truncated error in status bar
          const errMsg = (data.output || data.error || 'Unknown error').slice(0, 300);
          setStatus(`❌ Upload failed: ${errMsg}`);
        }
        setTimeout(() => setUploadStatus('idle'), 5000);
      }
    } catch (err) {
      setUploadStatus('error');
      setStatus(`Upload failed: ${(err as Error).message}`);
      setTimeout(() => setUploadStatus('idle'), 3000);
    }
  }, [uploadStatus, generatedCode, codeTarget, boardId]);

  /* ── Simulation Run / Stop toggle ─────────────────────────────── */
  const handleToggleSimulation = useCallback(() => {
    const runtime = simRuntimeRef.current;

    if (simRunning) {
      // ── STOP ──
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
      setSimRunning(false);
      setStatus('Simulation stopped');

      // Reset all LED visual states
      if (runtime) {
        const objects = runtime.getWorkspaceObjectModels?.() ?? [];
        for (const obj of objects) {
          if ((obj.objectType as string).includes('led')) {
            runtime.updateWorkspaceObjectModel?.(obj.objectId, {
              metadata: { ...obj.metadata, ledOn: false },
            });
          }
        }
      }
    } else {
      // ── START ──
      if (!generatedCode.trim()) {
        setStatus('No code to simulate. Add some blocks first.');
        return;
      }
      setSimRunning(true);
      setStatus('▶ Simulation running…');

      // Simulation tick: toggle LED states based on code patterns
      let tick = 0;
      const hasDelay = /delay|sleep|time\.sleep/i.test(generatedCode);
      const hasDigitalWrite = /digitalWrite|pin\.value|GPIO/i.test(generatedCode);
      const hasAnalogRead = /analogRead|ADC|adc\.read/i.test(generatedCode);

      simIntervalRef.current = setInterval(() => {
        tick++;
        if (!runtime) return;

        const objects = runtime.getWorkspaceObjectModels?.() ?? [];

        // Toggle LEDs on/off based on code patterns
        if (hasDigitalWrite) {
          for (const obj of objects) {
            if ((obj.objectType as string).includes('led')) {
              const blink = hasDelay ? tick % 2 === 0 : true;
              runtime.updateWorkspaceObjectModel?.(obj.objectId, {
                metadata: { ...obj.metadata, ledOn: blink },
              });
            }
          }
        }

        // Update sensor readings with simulated values
        if (hasAnalogRead) {
          for (const obj of objects) {
            const t = obj.objectType as string;
            if (t.includes('dht11') || t.includes('mq2') || t.includes('hc_sr04')) {
              runtime.updateWorkspaceObjectModel?.(obj.objectId, {
                metadata: {
                  ...obj.metadata,
                  sensorValue: Math.round(20 + Math.sin(tick * 0.3) * 10),
                },
              });
            }
          }
        }

        setStatus(`▶ Simulation running… tick ${tick}`);
      }, hasDelay ? 500 : 200);
    }
  }, [simRunning, generatedCode]);

  // Cleanup simulation interval on unmount
  useEffect(() => {
    return () => {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="robotics-studio-root flex flex-col overflow-hidden">
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
          {(['blocks', 'simulator'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-3 py-1 text-sm capitalize ${activeTab === tab ? 'bg-primary text-white' : 'text-muted'}`}
            >
              {tab}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted">{status}</span>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          {/* ── Undo / Redo ──────────────────────────── */}
          <Button type="button" variant="ghost" size="sm" onClick={handleUndo} title="Undo (Ctrl+Z)">
            ↶ Undo
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={handleRedo} title="Redo (Ctrl+Shift+Z)">
            ↷ Redo
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          {/* ── Blocks: Save / Import ────────────────── */}
          <div className="flex items-center gap-0.5 rounded-lg bg-background/60 border border-border/50 px-1 py-0.5">
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-background transition-colors"
              title="Save blocks as .workspace.json"
            >
              <Save className="h-3.5 w-3.5 text-blue-400" />
              Save Blocks
            </button>
            <button
              type="button"
              onClick={handleImportBlocks}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-background transition-colors"
              title="Import blocks from .workspace.json"
            >
              <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
              Import Blocks
            </button>
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          {/* ── Code: Import / Export / Paste ─────────── */}
          <div className="flex items-center gap-0.5 rounded-lg bg-background/60 border border-border/50 px-1 py-0.5">
            <button
              type="button"
              onClick={handleImportCode}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-background transition-colors"
              title="Import code file (.ino, .py, .c)"
            >
              <FileUp className="h-3.5 w-3.5 text-emerald-400" />
              Import Code
            </button>
            <button
              type="button"
              onClick={handleExportCode}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-background transition-colors"
              title={`Export code as ${currentFormat.ext}`}
            >
              <FileDown className="h-3.5 w-3.5 text-sky-400" />
              Export {currentFormat.ext}
            </button>
            <button
              type="button"
              onClick={() => setShowPasteModal(true)}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-background transition-colors"
              title="Paste your own code"
            >
              <ClipboardPaste className="h-3.5 w-3.5 text-violet-400" />
              Paste Code
            </button>
          </div>

          {isEsp32Board(boardId) && (
            <>
              <Button type="button" variant="ghost" size="sm" onClick={handleExportEsp32Project}>
                Export ESP32
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleCompile}>
                Compile
              </Button>
            </>
          )}

          <div className="w-px h-6 bg-border mx-1" />

          <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : '💾 Save'}
          </Button>
        </div>

        {/* Hidden file inputs for import dialogs */}
        <input
          ref={blocksFileRef}
          type="file"
          accept=".json,.workspace.json"
          onChange={onBlocksFileSelected}
          className="hidden"
          aria-label="Import workspace blocks file"
        />
        <input
          ref={codeFileRef}
          type="file"
          accept=".ino,.py,.c,.cpp,.h,.pde"
          onChange={onCodeFileSelected}
          className="hidden"
          aria-label="Import code file"
        />
      </header>

      {/* ── Paste Code Modal ─────────────────────────────────── */}
      {showPasteModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[600px] max-h-[80vh] rounded-xl border border-[#334155] bg-[#0F172A] shadow-2xl flex flex-col overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center gap-3 border-b border-[#334155] bg-[#1E293B] px-5 py-3">
              <ClipboardPaste className="h-5 w-5 text-violet-400" />
              <h3 className="text-sm font-bold text-white">Paste Your Code</h3>
              <div className="ml-auto flex items-center gap-2">
                <label className="text-[10px] text-[#94A3B8]">Language:</label>
                <select
                  value={pasteLanguage}
                  onChange={(e) => setPasteLanguage(e.target.value as CodegenTarget)}
                  className="rounded border border-[#334155] bg-[#0F172A] px-2 py-0.5 text-xs text-sky-300 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
                >
                  <option value="arduino_cpp">Arduino C++</option>
                  <option value="esp_idf">ESP-IDF C</option>
                  <option value="micropython">MicroPython</option>
                  <option value="circuitpython">CircuitPython</option>
                </select>
              </div>
            </div>

            {/* Code input area */}
            <textarea
              value={pasteCode}
              onChange={(e) => setPasteCode(e.target.value)}
              placeholder={`Paste your ${pasteLanguage === 'arduino_cpp' ? 'Arduino C++' : pasteLanguage === 'micropython' ? 'MicroPython' : pasteLanguage === 'circuitpython' ? 'CircuitPython' : 'ESP-IDF C'} code here…\n\nExample:\nvoid setup() {\n  pinMode(13, OUTPUT);\n}\nvoid loop() {\n  digitalWrite(13, HIGH);\n  delay(1000);\n  digitalWrite(13, LOW);\n  delay(1000);\n}`}
              className="flex-1 min-h-[250px] resize-none bg-[#0F172A] px-5 py-4 font-mono text-sm text-[#E2E8F0] placeholder:text-[#334155] focus:outline-none"
              autoFocus
            />

            {/* Modal footer */}
            <div className="flex items-center justify-between border-t border-[#334155] bg-[#1E293B] px-5 py-3">
              <p className="text-[10px] text-[#64748B]">
                Code will be loaded into the editor. You can test it with the simulator.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowPasteModal(false); setPasteCode(''); }}
                  className="rounded-lg px-4 py-1.5 text-xs font-medium text-[#94A3B8] hover:text-white hover:bg-[#334155] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePasteCodeApply}
                  disabled={!pasteCode.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-violet-500/20 hover:from-violet-400 hover:to-purple-500 disabled:opacity-40 transition-all"
                >
                  <FileCode2 className="h-3.5 w-3.5" />
                  Apply Code
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Connect Board / Server Modal ─────────────────────── */}
      {connectModalType !== 'none' && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[460px] rounded-xl border border-[#334155] bg-[#0F172A] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-[#334155] bg-[#1E293B] px-5 py-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${connectModalType === 'serial' ? 'bg-amber-500/20' : 'bg-red-500/20'}`}>
                {connectModalType === 'serial'
                  ? <Usb className="h-4 w-4 text-amber-400" />
                  : <AlertTriangle className="h-4 w-4 text-red-400" />
                }
              </div>
              <h3 className="text-sm font-bold text-white">
                {connectModalType === 'serial' ? 'Connect Your Board First' : 'Compile Server Not Running'}
              </h3>
            </div>

            {/* Body */}
            <div className="px-5 py-5 space-y-4">
              {connectModalType === 'serial' ? (
                <div className="flex items-start gap-3 rounded-lg bg-[#1E293B] border border-[#334155] p-4">
                  <Usb className="h-5 w-5 text-sky-400 mt-0.5 shrink-0" />
                  <div className="text-xs text-[#CBD5E1] leading-relaxed space-y-2">
                    <p className="font-semibold text-white">Connect via Serial Monitor:</p>
                    <ol className="list-decimal list-inside space-y-1.5 text-[#94A3B8]">
                      <li>Plug your board into a USB port</li>
                      <li>In the <span className="text-sky-300 font-medium">Serial Monitor</span> below, click <span className="text-emerald-400 font-medium">Connect</span></li>
                      <li>Select your board&apos;s COM port from the browser dialog</li>
                      <li>Once connected, click <span className="text-sky-300 font-medium">Upload to Board</span> again</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-3 rounded-lg bg-[#1E293B] border border-[#334155] p-4">
                    <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                    <div className="text-xs text-[#CBD5E1] leading-relaxed space-y-2">
                      <p className="font-semibold text-white">Compile server is not running</p>
                      <p className="text-[#94A3B8]">
                        Arduino C++ code must be compiled before uploading. Start the server by running:
                      </p>
                      <code className="block bg-[#0F172A] text-amber-300 px-3 py-2 rounded text-[10px] font-mono select-all">
                        node apps/web/compile-server.js
                      </code>
                      <p className="text-[#64748B] text-[10px]">
                        Or double-click <span className="text-sky-300">start-compile-server.bat</span> in the project root.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
                    <Upload className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                    <div className="text-xs text-[#CBD5E1] leading-relaxed space-y-1.5">
                      <p className="font-semibold text-emerald-300">💡 Tip: Use MicroPython for direct upload</p>
                      <p className="text-[#94A3B8]">
                        Switch to <span className="text-sky-300 font-medium">MicroPython</span> to upload directly via
                        Serial Monitor — no compile server needed!
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-[#334155] bg-[#1E293B] px-5 py-3">
              {connectModalType === 'server' && (
                <button
                  type="button"
                  onClick={() => {
                    setCodeTarget('micropython');
                    setConnectModalType('none');
                    refreshCode();
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                >
                  Switch to MicroPython
                </button>
              )}
              <button
                type="button"
                onClick={() => setConnectModalType('none')}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-sky-500/20 hover:from-sky-400 hover:to-blue-500 transition-all"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="w-64 shrink-0 overflow-y-auto border-r border-border bg-background p-3 space-y-3">
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

          <CircuitValidationPanel runtime={simRuntimeRef.current} />

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
          className="relative min-w-0 flex-1 overflow-hidden"
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            collab.sendCursor(e.clientX - rect.left, e.clientY - rect.top);
          }}
        >
          <CursorOverlay cursors={collab.cursors} currentUserId={user?.id} />

          {/* ── BLOCKS MODE: Split layout ─────────────────────── */}
          {/* Blockly div is ALWAYS mounted (Blockly needs persistent DOM) */}
          <div className={`absolute ${activeTab === 'blocks' ? 'top-0 left-0 bottom-0' : 'inset-0 invisible'}`}
            style={activeTab === 'blocks' ? { right: '380px' } : undefined}
          >
            {/* In blocks mode: left side fills from 0 to (width-380px) */}
            <div className="absolute inset-0 flex flex-col overflow-hidden">
              {/* Blockly workspace — fills all available space, pushes serial monitor below */}
              <div
                ref={blocklyRef}
                className={`robotics-blockly-wrap flex-1 min-h-0 overflow-hidden ${collab.isLockedByOther ? 'pointer-events-none opacity-60' : ''}`}
              />
              {/* Serial Monitor — compact fixed height, sits directly below blocks */}
              {activeTab === 'blocks' && (
                <div className="shrink-0 border-t border-[#334155]">
                  <SerialMonitor
                    compact
                    portRef={serialPortRef}
                    onConnectionChange={(_connected, port) => {
                      if (port) serialPortRef.current = port;
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Code Preview Panel (blocks mode only) ── */}
          {activeTab === 'blocks' && (
            <div className="robotics-code-panel w-[380px] border-l border-[#334155] bg-[#0F172A]">
              {/* Code panel header */}
              <div className="flex items-center gap-2 border-b border-[#334155] bg-[#1E293B] px-3 py-2">
                <Code2 className="h-4 w-4 text-sky-400" />
                <span className="text-[11px] font-semibold text-[#E2E8F0]">Generated Code</span>
                <div className="ml-auto flex items-center gap-1.5">
                  {/* Format dropdown */}
                  <div className="relative">
                    <select
                      value={codeTarget}
                      onChange={(e) => setCodeTarget(e.target.value as CodegenTarget)}
                      className="appearance-none rounded-md border border-[#334155] bg-[#0F172A] pl-2 pr-6 py-1 text-[10px] font-semibold text-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-500/40 cursor-pointer hover:border-sky-500/40 transition-colors"
                      title="Code format"
                    >
                      {CODE_FORMAT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[#64748B] pointer-events-none" />
                  </div>

                  {/* Copy button */}
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold text-[#94A3B8] hover:text-white hover:bg-[#334155] transition-colors border border-transparent hover:border-[#334155]"
                    title="Copy code to clipboard"
                  >
                    {codeCopied ? (
                      <><Check className="h-3 w-3 text-emerald-400" /> Copied</>
                    ) : (
                      <><Copy className="h-3 w-3" /> Copy</>
                    )}
                  </button>
                </div>
              </div>

              {/* Code content with line numbers */}
              <div className="flex-1 overflow-auto relative">
                <pre className="p-3 font-mono text-[11px] leading-relaxed text-[#E2E8F0] whitespace-pre-wrap">
                  {generatedCode ? (
                    generatedCode.split('\n').map((line, i) => (
                      <div key={i} className="flex hover:bg-[#1E293B]/50">
                        <span className="inline-block w-8 shrink-0 text-right pr-3 text-[#475569] select-none text-[10px]">{i + 1}</span>
                        <span className="flex-1">{line || ' '}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-[#475569] italic">{/* Add blocks to generate code */}</span>
                  )}
                </pre>
              </div>

              {/* Upload button footer */}
              <div className="border-t border-[#334155] bg-[#1E293B] px-3 py-2">
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploadStatus !== 'idle' || !generatedCode.trim()}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 disabled:opacity-40 ${
                    uploadStatus === 'success'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : uploadStatus === 'error'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : uploadStatus !== 'idle'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                          : 'bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:from-sky-400 hover:to-blue-500 shadow-lg shadow-sky-500/20'
                  }`}
                >
                  {uploadStatus === 'idle' && <><Upload className="h-3.5 w-3.5" /> Upload to Board</>}
                  {uploadStatus === 'connecting' && '⏳ Connecting…'}
                  {uploadStatus === 'interrupting' && '⏳ Interrupting…'}
                  {uploadStatus === 'entering_repl' && '⏳ Entering REPL…'}
                  {uploadStatus === 'uploading' && '📤 Uploading…'}
                  {uploadStatus === 'reading_output' && '📥 Reading output…'}
                  {uploadStatus === 'success' && <><Check className="h-3.5 w-3.5" /> Upload Successful!</>}
                  {uploadStatus === 'error' && '❌ Upload Failed'}
                  {uploadStatus === 'waiting_port' && '🔌 Waiting for port…'}
                </button>
                <p className="text-[9px] text-[#475569] text-center mt-1.5">
                  {codeTarget === 'micropython' || codeTarget === 'circuitpython'
                    ? 'Upload via Web Serial (Chrome/Edge)'
                    : 'Compile & upload via server'}
                </p>
              </div>
            </div>
          )}
          {activeTab === 'simulator' && (
            <div className="absolute inset-0 flex flex-col">
              {/* ── Phase 28A: Circuit editor toolbar ──────────────────────── */}
              <div className="border-b border-[#334155] bg-[#1E293B] px-3 py-1.5 text-xs text-[#94A3B8] flex items-center gap-2">
                {/* Tool buttons */}
                <div className="flex items-center gap-0.5 bg-[#0F172A]/60 rounded-lg px-1 py-0.5 border border-[#334155]/50">
                  {([
                    { tool: 'select' as CircuitTool, icon: MousePointer2, label: 'Select (V)', key: 'V' },
                    { tool: 'wire' as CircuitTool, icon: Pen, label: 'Wire (W)', key: 'W' },
                    { tool: 'pan' as CircuitTool, icon: Hand, label: 'Pan (H)', key: 'H' },
                    { tool: 'rotate' as CircuitTool, icon: RotateCw, label: 'Rotate (R)', key: 'R' },
                    { tool: 'delete' as CircuitTool, icon: Trash2, label: 'Delete (X)', key: 'X' },
                  ] as const).map(({ tool, icon: Icon, label }) => (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => setCircuitTool(tool)}
                      className={`p-1.5 rounded transition-all ${
                        circuitTool === tool
                          ? 'bg-sky-500/25 text-sky-300 shadow-[0_0_6px_rgba(56,189,248,0.2)]'
                          : 'text-[#94A3B8] hover:bg-[#334155] hover:text-white'
                      }`}
                      aria-label={label}
                      title={label}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>

                <div className="w-px h-4 bg-[#334155]" />

                {/* Zoom controls */}
                <div className="flex items-center gap-0.5 bg-[#0F172A]/60 rounded-lg px-1 py-0.5 border border-[#334155]/50">
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    disabled={canvasZoom <= MIN_ZOOM}
                    className="p-1 rounded hover:bg-[#334155] disabled:opacity-30 transition-colors text-[#94A3B8] hover:text-white"
                    aria-label="Zoom out"
                    title="Zoom out"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleZoomReset}
                    className="px-2 py-0.5 rounded hover:bg-[#334155] transition-colors text-[#E2E8F0] font-mono text-[10px] font-semibold min-w-[48px] text-center"
                    aria-label="Reset zoom"
                    title="Reset zoom to 100%"
                  >
                    {Math.round(canvasZoom * 100)}%
                  </button>

                  <button
                    type="button"
                    onClick={handleZoomIn}
                    disabled={canvasZoom >= MAX_ZOOM}
                    className="p-1 rounded hover:bg-[#334155] disabled:opacity-30 transition-colors text-[#94A3B8] hover:text-white"
                    aria-label="Zoom in"
                    title="Zoom in"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>

                  <div className="w-px h-4 bg-[#334155] mx-0.5" />

                  <button
                    type="button"
                    onClick={handleZoomFit}
                    className="p-1 rounded hover:bg-[#334155] transition-colors text-[#94A3B8] hover:text-white"
                    aria-label="Fit to view"
                    title="Fit to view"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="w-px h-4 bg-[#334155]" />

                {/* Connection table toggle */}
                <button
                  type="button"
                  onClick={() => setShowConnectionTable((v) => !v)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all duration-200 border ${
                    showConnectionTable
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-[0_0_8px_rgba(56,189,248,0.15)]'
                      : 'bg-[#0F172A]/60 text-[#94A3B8] border-[#334155]/50 hover:bg-[#334155] hover:text-white'
                  }`}
                  aria-label="Toggle pin connection table"
                  title="Show/Hide pin connection table"
                >
                  <Table2 className="h-3.5 w-3.5" />
                  Connections
                </button>

                <div className="w-px h-4 bg-[#334155]" />

                {/* ── Run / Stop Simulation ──────────────────── */}
                <button
                  type="button"
                  id="sim-run-stop-btn"
                  onClick={handleToggleSimulation}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border shadow-lg ${
                    simRunning
                      ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white border-red-400/40 shadow-red-500/25 hover:from-red-400 hover:to-rose-500'
                      : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white border-emerald-400/40 shadow-emerald-500/25 hover:from-emerald-400 hover:to-green-500'
                  } ${simRunning ? 'animate-pulse' : ''}`}
                  aria-label={simRunning ? 'Stop Simulation' : 'Run Simulation'}
                  title={simRunning ? 'Stop Simulation' : 'Run Simulation (simulates block code on canvas)'}
                >
                  {simRunning ? (
                    <>
                      <Square className="h-3.5 w-3.5 fill-current" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current" />
                      Run
                    </>
                  )}
                </button>

                <div className="flex-1" />

                {/* Tool indicator */}
                <span className="text-[10px] text-[#64748B]">
                  Tool: <span className="text-sky-400 font-semibold capitalize">{circuitTool}</span>
                  {' • '}Scroll to zoom • Drag to move
                </span>
              </div>

              {/* ── Main 3-column layout ──────────────────────────────────── */}
              <div className="flex flex-1 min-h-0">
                {/* Left: Component Catalog */}
                <ComponentCatalog />

                {/* Center: Pixi Canvas with overlays */}
                <div className="flex-1 flex flex-col min-w-0 relative">
                  <div
                    className="flex-1 bg-[#0F172A] relative overflow-hidden"
                    ref={pixiContainerRef}
                    onDragOver={handleSimDragOver}
                    onDrop={handleSimDrop}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    {/* Floating zoom indicator */}
                    {canvasZoom !== 1 && (
                      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-lg px-2.5 py-1 border border-white/10 pointer-events-none">
                        <ZoomIn className="h-3 w-3 text-sky-400" />
                        <span className="text-[10px] font-mono font-bold text-sky-300">{Math.round(canvasZoom * 100)}%</span>
                      </div>
                    )}

                    {/* Pin inspector tooltip */}
                    <PinInspector />
                  </div>

                  {/* Status bar */}
                  <div className="flex items-center justify-between bg-[#1E293B]/80 backdrop-blur-sm border-t border-[#334155]/30 px-3 py-1">
                    <span className="text-[10px] text-[#64748B]">{status}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#64748B]">
                        Zoom: {Math.round(canvasZoom * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Pin Connection Table — slides up from bottom */}
                  {showConnectionTable && (
                    <div className="border-t border-[#334155]">
                      <PinConnectionTable
                        collapsed={false}
                        onToggle={() => setShowConnectionTable(false)}
                      />
                    </div>
                  )}
                </div>

                {/* Right: Property Panel + Pin Assignment Panel */}
                <div className="flex flex-col w-80 border-l border-[#334155] overflow-hidden bg-[#0F172A]">
                  {/* Property panel — shows when a component is selected */}
                  <PropertyPanel
                    runtime={simRuntimeRef.current}
                    selectedObjectId={selectedSimComponentId}
                    onDelete={(id) => handleSimDeleteComponent(id)}
                    onDuplicate={(id) => {
                      // Duplicate: re-drop the same asset type
                      const rt = simRuntimeRef.current;
                      if (!rt) return;
                      try {
                        const obj = rt.getWorkspaceObject?.(id);
                        if (obj) {
                          const newId = `${obj.objectType}_${++simObjectCounterRef.current}`;
                          rt.registerWorkspaceObjectModel({
                            objectId: newId,
                            objectType: obj.objectType,
                            positionX: obj.positionX + 30,
                            positionY: obj.positionY + 30,
                            rotation: obj.rotation,
                            scale: obj.scale,
                            selected: false,
                            locked: false,
                            metadata: {},
                          });
                          setStatus(`Duplicated ${id} → ${newId}`);
                        }
                      } catch { /* noop */ }
                    }}
                    onRotate={(id, angle) => {
                      const rt = simRuntimeRef.current;
                      if (!rt) return;
                      try {
                        const obj = rt.getWorkspaceObject?.(id);
                        if (obj) {
                          rt.updateWorkspaceObjectModel?.(id, {
                            rotation: (obj.rotation || 0) + angle,
                          });
                          setStatus(`Rotated ${id}`);
                        }
                      } catch { /* noop */ }
                    }}
                  />

                  {/* Pin Assignment Panel */}
                  <PinAssignmentPanel
                    runtime={simRuntimeRef.current}
                    onDeleteComponent={handleSimDeleteComponent}
                    onWireGenerated={handleWireGenerated}
                  />
                </div>
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

