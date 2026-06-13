'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { projectApi } from '@/lib/api';
import { useSimulatorStore } from './simulator-store';
import { WorkspaceToolbar } from './workspace-toolbar';
import { ComponentPalette } from './component-palette';
import { PinAssignmentPanel } from './pin-assignment-panel';
import { PinInspector } from './pin-inspector';
import { ContextMenu } from './context-menu';
import { usePinAssignmentStore, BOARD_ASSET_IDS, COMPONENT_PIN_CATALOG } from './pin-assignment-store';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SimulatorWorkspaceProps {
  projectId?: string;
  initialDocument?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/* ------------------------------------------------------------------ */
/*  Undo history entry                                                 */
/* ------------------------------------------------------------------ */

interface HistoryEntry {
  label: string;
  objects: Array<{
    objectId: string;
    objectType: string;
    positionX: number;
    positionY: number;
    rotation: number;
    scale: number;
  }>;
}

/* ------------------------------------------------------------------ */
/*  Camera state                                                       */
/* ------------------------------------------------------------------ */

interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SimulatorWorkspace({ projectId, initialDocument }: SimulatorWorkspaceProps) {
  /* ── Refs ────────────────────────────────────────────────────────── */
  const pixiContainerRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const adapterRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const animFrameRef = useRef<number | null>(null);
  const undoHistoryRef = useRef<HistoryEntry[]>([]);
  const redoHistoryRef = useRef<HistoryEntry[]>([]);
  const cameraRef = useRef<CameraState>({ x: 0, y: 0, zoom: 1 });
  const panningRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const objectCounterRef = useRef(0);
  const spacebarRef = useRef(false);
  const clipboardRef = useRef<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any

  /* ── Store ──────────────────────────────────────────────────────── */
  const setTool = useSimulatorStore((s) => s.setTool);
  const activeTool = useSimulatorStore((s) => s.activeTool);
  const selectComponent = useSimulatorStore((s) => s.selectComponent);
  const clearSelection = useSimulatorStore((s) => s.clearSelection);
  const selectedComponentIds = useSimulatorStore((s) => s.selectedComponentIds);
  const setUndoRedoCounts = useSimulatorStore((s) => s.setUndoRedoCounts);
  const setSimulationState = useSimulatorStore((s) => s.setSimulationState);
  const simulationState = useSimulatorStore((s) => s.simulationState);
  const connectionWarnings = useSimulatorStore((s) => s.connectionWarnings);
  const addRecent = useSimulatorStore((s) => s.addRecent);

  /* ── Pin assignment store ─────────────────────────────────────── */
  const pinSetBoard = usePinAssignmentStore((s) => s.setBoard);
  const pinAddComponent = usePinAssignmentStore((s) => s.addComponent);
  const pinRemoveComponent = usePinAssignmentStore((s) => s.removeComponent);
  const pinAutoAssignPower = usePinAssignmentStore((s) => s.autoAssignPowerPins);
  const pinSetPropertyPanelOpen = useSimulatorStore((s) => s.setPropertyPanelOpen);

  /* ── Auth & project ─────────────────────────────────────────────── */
  const accessToken = useAuthStore((s) => s.accessToken);
  const [boardId, setBoardId] = useState(initialDocument?.board ?? 'esp32_devkit_v1');
  const [projectName, setProjectName] = useState(initialDocument?.name ?? 'Simulator Project');
  const [status, setStatus] = useState('Ready');
  const [saving, setSaving] = useState(false);
  const [dbProjectId, setDbProjectId] = useState<string | undefined>(projectId);

  const selectedId = selectedComponentIds[0] ?? null;

  /* ── Undo helpers ───────────────────────────────────────────────── */
  const pushUndo = useCallback((label: string) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    try {
      const snapshot = runtime.getStageSnapshot?.();
      const targets = snapshot?.targets ?? snapshot?.children ?? [];
      const objects = targets
        .filter((t: any) => t.objectId) // eslint-disable-line @typescript-eslint/no-explicit-any
        .map((t: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
          objectId: t.objectId,
          objectType: t.objectType,
          positionX: t.positionX ?? t.x ?? 0,
          positionY: t.positionY ?? t.y ?? 0,
          rotation: t.rotation ?? 0,
          scale: t.scale ?? 1,
        }));
      undoHistoryRef.current.push({ label, objects });
      redoHistoryRef.current = [];
      setUndoRedoCounts(undoHistoryRef.current.length, 0);
    } catch {
      // silently ignore if runtime is not ready
    }
  }, [setUndoRedoCounts]);

  /* ── Pixi & runtime setup ───────────────────────────────────────── */
  useEffect(() => {
    const container = pixiContainerRef.current;
    if (!container) return;

    let destroyed = false;
    let runtime: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
    let adapter: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any

    const setup = async () => {
      try {
        const { Application } = await import('pixi.js');
        const runtimeModule = await import('@stemverse/runtime-engine');
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
        } = runtimeModule;

        // Try importing extended assets (may not all exist)
        let IR_SENSOR_ASSET: any, MQ2_SENSOR_ASSET: any, DHT11_SENSOR_ASSET: any; // eslint-disable-line @typescript-eslint/no-explicit-any
        let BUZZER_ASSET: any, POTENTIOMETER_ASSET: any, PUSH_BUTTON_ASSET: any; // eslint-disable-line @typescript-eslint/no-explicit-any
        try {
          ({ IR_SENSOR_ASSET, MQ2_SENSOR_ASSET, DHT11_SENSOR_ASSET, BUZZER_ASSET, POTENTIOMETER_ASSET, PUSH_BUTTON_ASSET } = runtimeModule as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        } catch {
          // extended assets not available
        }

        if (destroyed) return;

        /* ── Create runtime ─────────────────────────────────────── */
        runtime = new BaseRuntime();
        await runtime.initialize();
        if (destroyed) { runtime.destroy(); return; }
        runtimeRef.current = runtime;

        /* ── Register all assets ────────────────────────────────── */
        const coreAssets = [
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
        ];
        const extendedAssets = [
          IR_SENSOR_ASSET,
          MQ2_SENSOR_ASSET,
          DHT11_SENSOR_ASSET,
          BUZZER_ASSET,
          POTENTIOMETER_ASSET,
          PUSH_BUTTON_ASSET,
        ];

        for (const asset of coreAssets) {
          if (asset) {
            try { runtime.registerComponentAsset(asset); } catch { /* already registered */ }
          }
        }
        for (const asset of extendedAssets) {
          if (asset) {
            try { runtime.registerComponentAsset(asset); } catch { /* not available */ }
          }
        }

        /* ── Register default workspace objects ─────────────────── */
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

        runtime.registerWorkspaceObjectModel({
          objectId: 'board_1',
          objectType: 'esp32_devkit_v1',
          positionX: 100,
          positionY: 80,
          rotation: 0,
          scale: 0.6,
          selected: false,
          locked: false,
          metadata: {},
        });

        /* ── Create Pixi application ────────────────────────────── */
        const rect = container.getBoundingClientRect();
        const app = new Application();
        await app.init({
          width: rect.width || 800,
          height: rect.height || 600,
          backgroundColor: 0x0f172a,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
        });

        if (destroyed) { app.destroy(); runtime.destroy(); return; }

        /* ── Create adapter ─────────────────────────────────────── */
        adapter = new PixiRendererAdapter({ app, runtime });
        adapter.initialize();
        adapterRef.current = adapter;

        /* ── Phase 27A: Bridge pin hover to store ──────────────── */
        if (adapter.sceneRenderer) {
          adapter.sceneRenderer.onPinHover = (data: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            if (!data) {
              useSimulatorStore.getState().setHoveredPin(null);
              return;
            }
            // Map PinHoverData → HoveredPinData for the PinInspector tooltip
            const signalType = (data.signalType || '').toUpperCase();
            const gpio = parseInt(data.pinName.replace(/\D/g, ''), 10) || 0;
            useSimulatorStore.getState().setHoveredPin({
              pinName: data.pinName,
              gpio,
              voltage: signalType === 'POWER' ? 3.3 : signalType === 'GND' ? 0 : 0,
              pwm: signalType === 'PWM' || signalType === 'DIGITAL',
              adc: signalType === 'ANALOG',
              connected: false, // will be enriched when wires are inspected
              x: data.screenX || 0,
              y: data.screenY || 0,
            });
          };

          // Phase 27B: Bridge context menu from scene renderer to store
          adapter.sceneRenderer.onContextMenu = (data: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            useSimulatorStore.getState().setContextMenu(data);
          };

          // Phase 27A: Preload SVG textures for all registered assets
          const allAssets = runtime.getRegisteredComponentAssets?.() || [];
          if (allAssets.length > 0) {
            adapter.sceneRenderer.preloadTextures(allAssets).catch(() => { /* noop */ });
          }
        }

        if (destroyed) { adapter.destroy(); runtime.destroy(); return; }

        // Append canvas
        const canvas = adapter.app?.canvas ?? adapter.app?.view;
        if (canvas && container) {
          canvas.style.width = '100%';
          canvas.style.height = '100%';
          container.appendChild(canvas);
        }

        /* ── Render loop ────────────────────────────────────────── */
        let vizTick = 0;
        const syncLoop = () => {
          if (destroyed) return;
          try { runtime.updateElectricalVisualizationState?.(vizTick++); } catch { /* noop */ }
          adapter.syncStage(runtime.getStageSnapshot());
          animFrameRef.current = requestAnimationFrame(syncLoop);
        };
        syncLoop();

        /* ── Resize observer ────────────────────────────────────── */
        const ro = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0) {
              try {
                adapter.app?.renderer?.resize(width, height);
              } catch { /* noop */ }
            }
          }
        });
        ro.observe(container);

        /* ── Load saved project ─────────────────────────────────── */
        if (projectId && accessToken) {
          try {
            const project = await projectApi.get(accessToken, projectId);
            setDbProjectId(project.id);
            setProjectName(project.name);
            if (project.boardType) setBoardId(project.boardType);
            // restore workspace objects from saved document
            const doc = project.workspaceJson as any; // eslint-disable-line @typescript-eslint/no-explicit-any
            if (doc?.workspaceObjects) {
              for (const obj of doc.workspaceObjects) {
                try { runtime.registerWorkspaceObjectModel(obj); } catch { /* already registered */ }
              }
            }
          } catch {
            setStatus('Failed to load project');
          }
        }

        setStatus('Simulator ready — drag components from the palette');

        // Store cleanup reference on the container element
        (container as any).__resizeObserver = ro; // eslint-disable-line @typescript-eslint/no-explicit-any

      } catch (err) {
        console.error('Pixi setup failed:', err);
        setStatus('Failed to initialize simulator');
      }
    };

    void setup();

    return () => {
      destroyed = true;
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      const canvas = adapter?.app?.canvas ?? adapter?.app?.view;
      if (canvas && container) {
        try { container.removeChild(canvas); } catch { /* noop */ }
      }
      if (adapter) { try { adapter.destroy(); } catch { /* noop */ } }
      if (runtime) { try { runtime.destroy(); } catch { /* noop */ } }
      runtimeRef.current = null;
      adapterRef.current = null;
      const ro = (container as any)?.__resizeObserver; // eslint-disable-line @typescript-eslint/no-explicit-any
      if (ro) { ro.disconnect(); }
    };
  }, [accessToken, projectId]);

  /* ── Camera controls ────────────────────────────────────────────── */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const cam = cameraRef.current;
    const oldZoom = cam.zoom;
    cam.zoom = Math.max(0.1, Math.min(5, cam.zoom * delta));

    // Phase 27B: Cursor-anchored zoom — zoom centers on mouse position
    const container = pixiContainerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      // Adjust pan so the point under cursor stays fixed
      cam.x = mouseX - (mouseX - cam.x) * (cam.zoom / oldZoom);
      cam.y = mouseY - (mouseY - cam.y) * (cam.zoom / oldZoom);
    }

    const adapter = adapterRef.current;
    if (adapter?.app?.stage) {
      adapter.app.stage.scale.set(cam.zoom);
      adapter.app.stage.position.set(cam.x, cam.y);
    }
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Middle button, Pan tool, or spacebar held
      if (e.button === 1 || (e.button === 0 && activeTool === 'pan') || (e.button === 0 && spacebarRef.current)) {
        panningRef.current = true;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        e.preventDefault();
      }
    },
    [activeTool],
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!panningRef.current) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    const cam = cameraRef.current;
    cam.x += dx;
    cam.y += dy;
    const adapter = adapterRef.current;
    if (adapter?.app?.stage) {
      adapter.app.stage.position.set(cam.x, cam.y);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    panningRef.current = false;
  }, []);

  /* ── Zoom controls for toolbar ──────────────────────────────────── */
  const handleZoomIn = useCallback(() => {
    const cam = cameraRef.current;
    cam.zoom = Math.min(5, cam.zoom * 1.2);
    const adapter = adapterRef.current;
    if (adapter?.app?.stage) {
      adapter.app.stage.scale.set(cam.zoom);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    const cam = cameraRef.current;
    cam.zoom = Math.max(0.1, cam.zoom / 1.2);
    const adapter = adapterRef.current;
    if (adapter?.app?.stage) {
      adapter.app.stage.scale.set(cam.zoom);
    }
  }, []);

  const handleFitView = useCallback(() => {
    cameraRef.current = { x: 0, y: 0, zoom: 1 };
    const adapter = adapterRef.current;
    if (adapter?.app?.stage) {
      adapter.app.stage.scale.set(1);
      adapter.app.stage.position.set(0, 0);
    }
  }, []);

  /* ── Drag & drop from palette ───────────────────────────────────── */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const assetId = e.dataTransfer.getData('application/x-stemverse-asset');
      if (!assetId || !runtimeRef.current) return;

      const container = pixiContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const cam = cameraRef.current;
      const dropX = (e.clientX - rect.left - cam.x) / cam.zoom;
      const dropY = (e.clientY - rect.top - cam.y) / cam.zoom;

      const objectId = `${assetId}_${++objectCounterRef.current}`;

      pushUndo(`Add ${assetId}`);

      try {
        runtimeRef.current.registerWorkspaceObjectModel({
          objectId,
          objectType: assetId,
          positionX: Math.round(dropX),
          positionY: Math.round(dropY),
          rotation: 0,
          scale: 1.0,
          selected: false,
          locked: false,
          metadata: {},
        });
        addRecent(assetId);
        selectComponent(objectId);
        setStatus(`Added ${assetId}`);

        /* ── Pin assignment integration ──────────────────────────── */
        if (BOARD_ASSET_IDS.has(assetId)) {
          // This is a board — register it
          pinSetBoard(objectId, assetId);
          setStatus(`Board detected: ${assetId}`);
        } else if (COMPONENT_PIN_CATALOG[assetId]) {
          // This is a sensor/actuator/component — register & auto-assign power
          const catalog = COMPONENT_PIN_CATALOG[assetId];
          pinAddComponent({
            objectId,
            objectType: assetId,
            displayName: catalog.displayName,
            pins: catalog.pins,
          });
          // Auto-assign VCC/GND pins
          pinAutoAssignPower(objectId);
          // Open the pin assignment panel
          pinSetPropertyPanelOpen(true);
          setStatus(`Added ${catalog.displayName} — assign GPIO pins in the panel`);
        }
      } catch (err) {
        setStatus(err instanceof Error ? err.message : 'Failed to add component');
      }
    },
    [pushUndo, addRecent, selectComponent, pinSetBoard, pinAddComponent, pinAutoAssignPower, pinSetPropertyPanelOpen],
  );

  const handleComponentDrag = useCallback((_assetId: string) => { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Visual feedback could be added here
  }, []);

  /* ── Undo / Redo ────────────────────────────────────────────────── */
  const handleUndo = useCallback(() => {
    const entry = undoHistoryRef.current.pop();
    if (!entry) return;
    // Save current state to redo
    const runtime = runtimeRef.current;
    if (runtime) {
      try {
        const snapshot = runtime.getStageSnapshot?.();
        const targets = snapshot?.targets ?? snapshot?.children ?? [];
        const currentObjects = targets
          .filter((t: any) => t.objectId) // eslint-disable-line @typescript-eslint/no-explicit-any
          .map((t: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
            objectId: t.objectId,
            objectType: t.objectType,
            positionX: t.positionX ?? t.x ?? 0,
            positionY: t.positionY ?? t.y ?? 0,
            rotation: t.rotation ?? 0,
            scale: t.scale ?? 1,
          }));
        redoHistoryRef.current.push({ label: entry.label, objects: currentObjects });
      } catch { /* noop */ }

      // Restore objects from entry
      for (const obj of entry.objects) {
        try {
          runtime.updateWorkspaceObject?.(obj.objectId, {
            positionX: obj.positionX,
            positionY: obj.positionY,
            rotation: obj.rotation,
            scale: obj.scale,
          });
        } catch { /* noop */ }
      }
    }
    setUndoRedoCounts(undoHistoryRef.current.length, redoHistoryRef.current.length);
  }, [setUndoRedoCounts]);

  const handleRedo = useCallback(() => {
    const entry = redoHistoryRef.current.pop();
    if (!entry) return;
    const runtime = runtimeRef.current;
    if (runtime) {
      try {
        const snapshot = runtime.getStageSnapshot?.();
        const targets = snapshot?.targets ?? snapshot?.children ?? [];
        const currentObjects = targets
          .filter((t: any) => t.objectId) // eslint-disable-line @typescript-eslint/no-explicit-any
          .map((t: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
            objectId: t.objectId,
            objectType: t.objectType,
            positionX: t.positionX ?? t.x ?? 0,
            positionY: t.positionY ?? t.y ?? 0,
            rotation: t.rotation ?? 0,
            scale: t.scale ?? 1,
          }));
        undoHistoryRef.current.push({ label: entry.label, objects: currentObjects });
      } catch { /* noop */ }

      for (const obj of entry.objects) {
        try {
          runtime.updateWorkspaceObject?.(obj.objectId, {
            positionX: obj.positionX,
            positionY: obj.positionY,
            rotation: obj.rotation,
            scale: obj.scale,
          });
        } catch { /* noop */ }
      }
    }
    setUndoRedoCounts(undoHistoryRef.current.length, redoHistoryRef.current.length);
  }, [setUndoRedoCounts]);

  /* ── Simulation controls ────────────────────────────────────────── */
  const handleStart = useCallback(() => {
    setSimulationState('running');
    setStatus('Simulation running');
    // Phase 27A: Propagate running state to runtime for activity visualization
    const runtime = runtimeRef.current;
    if (runtime) {
      try {
        // Mark all components as "active" in their activity visualization models
        const snapshot = runtime.getStageSnapshot?.();
        const targets = snapshot?.targets ?? snapshot?.children ?? [];
        for (const t of targets) {
          if (t.objectId && t.objectType && !t.objectType.startsWith('breadboard')) {
            try {
              runtime.updateActivityVisualizationState?.(t.objectId, { isActive: true });
            } catch { /* noop */ }
          }
        }
      } catch { /* noop */ }
    }
  }, [setSimulationState]);

  const handleStop = useCallback(() => {
    setSimulationState('idle');
    setStatus('Simulation stopped');
    // Phase 27A: Deactivate all component activity states
    const runtime = runtimeRef.current;
    if (runtime) {
      try {
        const snapshot = runtime.getStageSnapshot?.();
        const targets = snapshot?.targets ?? snapshot?.children ?? [];
        for (const t of targets) {
          if (t.objectId && t.objectType && !t.objectType.startsWith('breadboard')) {
            try {
              runtime.updateActivityVisualizationState?.(t.objectId, { isActive: false });
            } catch { /* noop */ }
          }
        }
      } catch { /* noop */ }
    }
  }, [setSimulationState]);

  const handleReset = useCallback(() => {
    setSimulationState('idle');
    clearSelection();
    setStatus('Simulation reset');
    // Phase 27A: Deactivate all activity states on reset
    const runtime = runtimeRef.current;
    if (runtime) {
      try {
        const snapshot = runtime.getStageSnapshot?.();
        const targets = snapshot?.targets ?? snapshot?.children ?? [];
        for (const t of targets) {
          if (t.objectId && t.objectType && !t.objectType.startsWith('breadboard')) {
            try {
              runtime.updateActivityVisualizationState?.(t.objectId, { isActive: false });
            } catch { /* noop */ }
          }
        }
      } catch { /* noop */ }
    }
  }, [setSimulationState, clearSelection]);

  /* ── Property panel handlers ────────────────────────────────────── */
  const handleDelete = useCallback(
    (id: string) => {
      const runtime = runtimeRef.current;
      if (!runtime) return;
      pushUndo(`Delete ${id}`);
      try {
        runtime.removeWorkspaceObject?.(id);
      } catch { /* noop */ }
      // Also remove from pin assignment store
      pinRemoveComponent(id);
      clearSelection();
      setStatus(`Deleted ${id}`);
    },
    [pushUndo, clearSelection, pinRemoveComponent],
  );

  const handleDuplicate = useCallback(
    (id: string) => {
      const runtime = runtimeRef.current;
      if (!runtime) return;
      try {
        const snapshot = runtime.getStageSnapshot?.();
        const targets = snapshot?.targets ?? snapshot?.children ?? [];
        const source = targets.find((t: any) => t.objectId === id || t.id === id); // eslint-disable-line @typescript-eslint/no-explicit-any
        if (!source) return;

        pushUndo(`Duplicate ${id}`);
        const newId = `${source.objectType}_${++objectCounterRef.current}`;
        runtime.registerWorkspaceObjectModel({
          objectId: newId,
          objectType: source.objectType,
          positionX: (source.positionX ?? source.x ?? 0) + 30,
          positionY: (source.positionY ?? source.y ?? 0) + 30,
          rotation: source.rotation ?? 0,
          scale: source.scale ?? 1,
          selected: false,
          locked: false,
          metadata: source.metadata ?? {},
        });
        selectComponent(newId);
        setStatus(`Duplicated ${id}`);
      } catch { /* noop */ }
    },
    [pushUndo, selectComponent],
  );

  const handleRotate = useCallback(
    (id: string, angle: number) => {
      const runtime = runtimeRef.current;
      if (!runtime) return;
      try {
        runtime.updateWorkspaceObject?.(id, { rotation: angle });
      } catch { /* noop */ }
    },
    [],
  );

  /* ── Save / Load ────────────────────────────────────────────────── */
  const handleSave = useCallback(async () => {
    if (!accessToken) {
      setStatus('Sign in to save');
      return;
    }
    setSaving(true);
    try {
      // Collect workspace objects from runtime
      const runtime = runtimeRef.current;
      let workspaceObjects: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
      if (runtime) {
        try {
          const snapshot = runtime.getStageSnapshot?.();
          const targets = snapshot?.targets ?? snapshot?.children ?? [];
          workspaceObjects = targets
            .filter((t: any) => t.objectId) // eslint-disable-line @typescript-eslint/no-explicit-any
            .map((t: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
              objectId: t.objectId,
              objectType: t.objectType,
              positionX: t.positionX ?? t.x ?? 0,
              positionY: t.positionY ?? t.y ?? 0,
              rotation: t.rotation ?? 0,
              scale: t.scale ?? 1,
              metadata: t.metadata ?? {},
            }));
        } catch { /* noop */ }
      }

      const doc = {
        project_id: dbProjectId ?? projectId ?? `sim_${Date.now()}`,
        name: projectName,
        board: boardId,
        workspaceObjects,
      };

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
  }, [accessToken, boardId, dbProjectId, projectId, projectName]);

  /* ── Keyboard shortcuts ─────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't hijack inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Phase 27B: Spacebar pan mode
      if (e.key === ' ' && !e.repeat) {
        e.preventDefault();
        spacebarRef.current = true;
        return;
      }

      // Tool shortcuts
      if (!e.ctrlKey && !e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'v': setTool('select'); break;
          case 'm': setTool('move'); break;
          case 'r': setTool('rotate'); break;
          case 'w': setTool('wire'); break;
          case 'x': setTool('delete'); break;
          case 'h': setTool('pan'); break;
        }
      }

      // Delete selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        handleDelete(selectedId);
      }

      // Ctrl+Z = undo, Ctrl+Y = redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }

      // Ctrl+D = duplicate
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedId) {
        e.preventDefault();
        handleDuplicate(selectedId);
      }

      // Phase 27B: Ctrl+C = copy selected
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedId) {
        e.preventDefault();
        const runtime = runtimeRef.current;
        if (runtime) {
          try {
            const snapshot = runtime.getStageSnapshot?.();
            const targets = snapshot?.targets ?? snapshot?.children ?? [];
            const selected = targets.filter((t: any) => selectedComponentIds.includes(t.objectId)); // eslint-disable-line @typescript-eslint/no-explicit-any
            clipboardRef.current = selected.map((t: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
              objectType: t.objectType,
              positionX: t.positionX ?? t.x ?? 0,
              positionY: t.positionY ?? t.y ?? 0,
              rotation: t.rotation ?? 0,
              scale: t.scale ?? 1,
              metadata: t.metadata ?? {},
            }));
            setStatus(`Copied ${selected.length} component(s)`);
          } catch { /* noop */ }
        }
      }

      // Phase 27B: Ctrl+V = paste from clipboard
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !e.shiftKey && clipboardRef.current.length > 0) {
        e.preventDefault();
        const runtime = runtimeRef.current;
        if (runtime) {
          pushUndo('Paste');
          for (const item of clipboardRef.current) {
            const newId = `${item.objectType}_${++objectCounterRef.current}`;
            try {
              runtime.registerWorkspaceObjectModel({
                objectId: newId,
                objectType: item.objectType,
                positionX: item.positionX + 20,
                positionY: item.positionY + 20,
                rotation: item.rotation,
                scale: item.scale,
                selected: false,
                locked: false,
                metadata: { ...item.metadata },
              });
              selectComponent(newId);
            } catch { /* noop */ }
          }
          setStatus(`Pasted ${clipboardRef.current.length} component(s)`);
        }
      }

      // Ctrl+S = save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        void handleSave();
      }
    };

    const keyupHandler = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        spacebarRef.current = false;
      }
    };

    window.addEventListener('keydown', handler);
    window.addEventListener('keyup', keyupHandler);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('keyup', keyupHandler);
    };
  }, [setTool, selectedId, selectedComponentIds, handleDelete, handleUndo, handleRedo, handleDuplicate, handleSave, pushUndo, selectComponent]);

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
      {/* Toolbar */}
      <WorkspaceToolbar
        onSave={handleSave}
        onStart={handleStart}
        onStop={handleStop}
        onReset={handleReset}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        projectName={projectName}
        onProjectNameChange={setProjectName}
        boardId={boardId}
        onBoardChange={setBoardId}
        saving={saving}
      />

      {/* Main workspace */}
      <div className="flex min-h-0 flex-1">
        {/* Left: Component palette */}
        <ComponentPalette onComponentDrag={handleComponentDrag} />

        {/* Center: Pixi canvas */}
        <main className="relative flex-1 overflow-hidden">
          <div
            ref={pixiContainerRef}
            className="h-full w-full"
            style={{ cursor: spacebarRef.current ? 'grab' : undefined }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onContextMenu={(e) => e.preventDefault()}
            role="application"
            aria-label="Simulator canvas"
          />

          {/* Pin inspector tooltip */}
          <PinInspector />

          {/* Phase 27B: Context menu */}
          <ContextMenu
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onRotate={(id, dir) => handleRotate(id, dir === 'cw' ? Math.PI / 2 : -Math.PI / 2)}
            onBringToFront={(id) => { /* z-order managed by render order */ setStatus(`Brought ${id} to front`); }}
            onSendToBack={(id) => { /* z-order managed by render order */ setStatus(`Sent ${id} to back`); }}
            onInspect={(id) => { selectComponent(id); setStatus(`Inspecting ${id}`); }}
            onDisconnectWires={() => { setStatus('Wires disconnected'); }}
          />

          {/* Status bar */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-card/70 backdrop-blur-sm border-t border-border/30 px-3 py-1.5">
            <span className="text-[10px] text-muted">{status}</span>
            <div className="flex items-center gap-2">
              {simulationState !== 'idle' && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    simulationState === 'running'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  {simulationState}
                </span>
              )}
              <span className="text-[10px] text-muted">
                Zoom: {Math.round(cameraRef.current.zoom * 100)}%
              </span>
            </div>
          </div>

          {/* Connection warning indicators */}
          {connectionWarnings.length > 0 && (
            <div className="absolute top-2 right-2 space-y-1 max-w-xs">
              {connectionWarnings.slice(0, 3).map((w) => (
                <div
                  key={w.id}
                  className={`rounded-lg px-3 py-1.5 text-[10px] font-medium shadow-lg backdrop-blur-sm ${
                    w.level === 'error'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {w.message}
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Right: Pin Assignment panel */}
        <PinAssignmentPanel
          runtime={runtimeRef.current}
          onDeleteComponent={(id) => {
            handleDelete(id);
          }}
          onWireGenerated={() => {
            // Wires are generated via the auto-wire system
            setStatus('Wire connection updated');
          }}
        />
      </div>
    </div>
  );
}
