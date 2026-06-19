'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { projectApi } from '@/lib/api';
import { useSimulatorStore } from './simulator-store';
import { WorkspaceToolbar } from './workspace-toolbar';
import { ComponentCatalog } from './component-catalog';
import { PinAssignmentPanel } from './pin-assignment-panel';
import { PropertyPanel } from './property-panel';
import { PinInspector } from './pin-inspector';
import { ContextMenu } from './context-menu';
import { CanvasMagnifier } from './canvas-magnifier';
import { usePinAssignmentStore, BOARD_ASSET_IDS, COMPONENT_PIN_CATALOG } from './pin-assignment-store';
import { generateWireForAssignment, removeWire } from './auto-wire-generator';
import { SmartPlacementEngine, ROBOTICS_BREADBOARD_LAYOUT, COMPONENT_DIMENSIONS } from './smart-placement';
import { SimulatorCodeEditor, DEFAULT_ARDUINO_CODE } from './simulator-code-editor';
import type { PinAssignment } from './pin-assignment-store';

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
/*  Scene renderer scale ratios (mirrored from pixi-scene-renderer)    */
/* ------------------------------------------------------------------ */

const SCENE_SCALE_RATIOS: Record<string, number> = {
  arduino_uno_r3: 0.41, esp32_devkit_v1: 0.17, arduino_nano: 0.11,
  hc_sr04: 0.27, ir_sensor_module: 0.12, mq2_gas_sensor: 0.20, dht11_sensor: 0.10,
  led_5mm: 0.22, led_generic: 0.22, resistor: 0.18, resistor_generic: 0.18,
  push_button_tactile: 0.15, potentiometer_10k: 0.15, buzzer_passive: 0.15,
  sg90_servo: 0.14, relay_module: 0.17,
  oled_ssd1306: 0.17, lcd_1602: 0.48, raspberry_pi_pico: 0.13,
};

/**
 * Calculate optimal camera zoom & pan to fit all workspace objects in the canvas.
 * Uses the same COMPONENT_SCALE_RATIOS that the scene renderer applies.
 */
function fitCameraToContent(
  runtime: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  componentAssets: Array<{ assetId: string; imageWidth?: number; imageHeight?: number }>,
  canvasWidth: number,
  canvasHeight: number,
  padding = 60,
): CameraState {
  const objects = runtime?.getWorkspaceObjectModels?.() ?? [];
  if (objects.length === 0) return { x: 0, y: 0, zoom: 1 };

  // Step 1: Determine the reference breadboard width (same logic as scene renderer)
  let refBBWidth = 500;
  for (const obj of objects) {
    if ((obj.objectType as string).startsWith('breadboard')) {
      // Breadboard visuals use width from BreadboardVisualModel (typically 940 for 830-point)
      const bbDims: Record<string, number> = { breadboard_830: 940, breadboard_400: 500, breadboard_mini: 320 };
      refBBWidth = (bbDims[obj.objectType] || 940) * (obj.scale || 1);
      break;
    }
  }

  // Step 2: Calculate bounds for each object
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const obj of objects) {
    const asset = componentAssets.find(a => a.assetId === obj.objectType);
    let renderW: number, renderH: number;
    const rot = obj.rotation || 0;

    if ((obj.objectType as string).startsWith('breadboard')) {
      // Breadboard sizes (local, before rotation)
      const bbDims: Record<string, { w: number; h: number }> = {
        breadboard_830: { w: 940, h: 340 },
        breadboard_400: { w: 500, h: 340 },
        breadboard_mini: { w: 320, h: 170 },
      };
      const dims = bbDims[obj.objectType] || { w: 940, h: 340 };
      const localW = dims.w * (obj.scale || 1);
      const localH = dims.h * (obj.scale || 1);
      // When rotated 90°, width and height swap
      const isRotated = Math.abs(Math.sin(rot)) > 0.5;
      renderW = isRotated ? localH : localW;
      renderH = isRotated ? localW : localH;
    } else {
      // Use COMPONENT_SCALE_RATIOS to match what the scene renderer renders
      const ratio = SCENE_SCALE_RATIOS[obj.objectType];
      const assetW = asset?.imageWidth || 100;
      const assetH = asset?.imageHeight || 100;
      if (ratio && refBBWidth > 0) {
        const renderScale = (refBBWidth * ratio) / assetW;
        renderW = assetW * renderScale;
        renderH = assetH * renderScale;
      } else {
        renderW = assetW * (obj.scale || 1);
        renderH = assetH * (obj.scale || 1);
      }
    }

    const x = obj.positionX || 0;
    const y = obj.positionY || 0;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + renderW);
    maxY = Math.max(maxY, y + renderH);
  }

  // Step 3: Calculate optimal zoom to fit all content
  const contentW = maxX - minX;
  const contentH = maxY - minY;
  if (contentW <= 0 || contentH <= 0) return { x: 0, y: 0, zoom: 1 };

  const availW = canvasWidth - padding * 2;
  const availH = canvasHeight - padding * 2;
  const zoom = Math.min(availW / contentW, availH / contentH, 1.5); // Cap at 1.5x

  // Step 4: Center the content
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const camX = canvasWidth / 2 - centerX * zoom;
  const camY = canvasHeight / 2 - centerY * zoom;

  return { x: camX, y: camY, zoom: Math.max(0.15, zoom) };
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
  const placementEngineRef = useRef<SmartPlacementEngine | null>(null);
  const componentAssetsRef = useRef<Array<{
    assetId: string;
    imageWidth?: number;
    imageHeight?: number;
    pinCoordinates?: Array<{ name: string; pixelX: number; pixelY: number }>;
  }>>([]);
  const [magnifierEnabled, setMagnifierEnabled] = useState(false);

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

  /* ── Code editor state ─────────────────────────────────────────── */
  const [userCode, setUserCode] = useState(DEFAULT_ARDUINO_CODE);
  const [serialOutput, setSerialOutput] = useState<string[]>([]);
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

        /* ── Add Stage target (required for getStageSnapshot) ── */
        const stage = {
          id: 'stage',
          name: 'Stage',
          isStage: true,
          variables: {},
          lists: {},
          costumes: [],
          sounds: [],
          currentCostumeIndex: 0,
          currentBackdropIndex: 0,
          backdrops: [],
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

        /* ── Register default workspace objects ─────────────────── */
        // Breadboard placed vertically (column-wise, rotated 90°)
        // so components have a wider area to the right.
        // breadboard_830 local: 900w × 350h → at scale 0.55, rotated 90°:
        //   rendered width ≈ 350×0.55 = 192px, rendered height ≈ 900×0.55 = 495px
        runtime.registerWorkspaceObjectModel({
          objectId: 'breadboard_1',
          objectType: 'breadboard_830',
          positionX: 60,
          positionY: 30,
          rotation: Math.PI / 2,  // 90° rotation → vertical
          scale: 0.55,
          selected: false,
          locked: false,
          metadata: {},
        });

        // Board (ESP32) placed to the right of the vertical breadboard
        // breadboard right edge ≈ 60 + 192 = 252, add gap → 280
        runtime.registerWorkspaceObjectModel({
          objectId: 'board_1',
          objectType: 'esp32_devkit_v1',
          positionX: 280,
          positionY: 50,
          rotation: 0,
          scale: 0.45,
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
          backgroundColor: 0xE8E8E8,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          // Top-level option in Pixi.js v8 — required for canvas magnifier
          preserveDrawingBuffer: true,
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

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
          const allAssets = runtime.getComponentAssets?.() || [];
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

        /* ── Build component assets lookup for auto-wire generator ── */
        const allRegistered = runtime.getComponentAssets?.() || [];
        componentAssetsRef.current = allRegistered.map((a: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
          assetId: a.assetId,
          imageWidth: a.imageWidth,
          imageHeight: a.imageHeight,
          pinCoordinates: a.pinCoordinates,
        }));

        /* ── Create smart placement engine ──────────────────────── */
        placementEngineRef.current = new SmartPlacementEngine(ROBOTICS_BREADBOARD_LAYOUT);

        /* ── Auto-register default board type in pin assignment store ── */
        // Don't register a fake objectId — the real objectId is set when the board drops.
        // But pre-set the board type so the pin panel shows the default board info.
        // The actual boardObjectId gets set in handleDrop when a board is dropped.

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

        /* ── Auto-fit camera to show all components ────────────── */
        setTimeout(() => {
          if (destroyed) return;
          const fitRect = container.getBoundingClientRect();
          const cam = fitCameraToContent(
            runtime,
            componentAssetsRef.current,
            fitRect.width || 800,
            fitRect.height || 600,
            50,
          );
          cameraRef.current = cam;
          if (adapter?.app?.stage) {
            adapter.app.stage.scale.set(cam.zoom);
            adapter.app.stage.position.set(cam.x, cam.y);
          }
        }, 300);

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
    cam.zoom = Math.max(0.3, Math.min(2.5, cam.zoom * delta));

    // Cursor-anchored zoom — zoom centers on mouse position
    const container = pixiContainerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
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
      // Middle button, Pan tool, spacebar held, or left-click on canvas background
      if (
        e.button === 1 ||
        (e.button === 0 && activeTool === 'pan') ||
        (e.button === 0 && spacebarRef.current) ||
        (e.button === 0 && activeTool === 'select')
      ) {
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
    const adapter = adapterRef.current;
    const viewport = adapter?.app?.stage?.children?.[0];
    if (viewport) {
      const newZoom = Math.min(2.5, (viewport.scale?.x || 1) * 1.2);
      viewport.scale.set(newZoom);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    const adapter = adapterRef.current;
    const viewport = adapter?.app?.stage?.children?.[0];
    if (viewport) {
      const newZoom = Math.max(0.3, (viewport.scale?.x || 1) / 1.2);
      viewport.scale.set(newZoom);
    }
  }, []);

  const handleFitView = useCallback(() => {
    const runtime = runtimeRef.current;
    const adapter = adapterRef.current;
    const container = pixiContainerRef.current;
    if (!adapter?.app?.stage || !container) {
      cameraRef.current = { x: 0, y: 0, zoom: 1 };
      if (adapter?.app?.stage) {
        adapter.app.stage.scale.set(1);
        adapter.app.stage.position.set(0, 0);
      }
      return;
    }

    const rect = container.getBoundingClientRect();
    const cam = fitCameraToContent(
      runtime,
      componentAssetsRef.current,
      rect.width || 800,
      rect.height || 600,
      50,
    );
    cameraRef.current = cam;
    adapter.app.stage.scale.set(cam.zoom);
    adapter.app.stage.position.set(cam.x, cam.y);
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

      const objectId = `${assetId}_${++objectCounterRef.current}`;

      pushUndo(`Add ${assetId}`);

      // ── Smart placement: auto-position below breadboard ──────────
      const dims = COMPONENT_DIMENSIONS[assetId];
      const imgW = dims?.w ?? 100;
      const imgH = dims?.h ?? 100;
      const compScale = dims?.defaultScale ?? 1.0;

      let posX: number;
      let posY: number;
      const engine = placementEngineRef.current;
      const isBreadboardDrop = assetId === 'breadboard_830' || assetId === 'breadboard_400' || assetId === 'breadboard_mini';
      if (engine && !isBreadboardDrop) {
        // Both boards (ESP32/Arduino) and components use smart placement
        const pos = engine.placeByType(objectId, assetId, imgW, imgH, compScale);
        posX = pos.x;
        posY = pos.y;
      } else {
        // Only breadboards use raw drop coordinates
        const rect = container.getBoundingClientRect();
        const cam = cameraRef.current;
        posX = (e.clientX - rect.left - cam.x) / cam.zoom;
        posY = (e.clientY - rect.top - cam.y) / cam.zoom;
      }

      try {
        // Breadboards should be rotated 90° to match the vertical column layout
        const isBreadboard = assetId === 'breadboard_830' || assetId === 'breadboard_400' || assetId === 'breadboard_mini';
        const dropRotation = isBreadboard ? Math.PI / 2 : 0;

        // For breadboards, use a smarter scale and position alongside the main breadboard
        let dropScale = compScale;
        if (isBreadboard) {
          dropScale = assetId === 'breadboard_830' ? 0.55 : assetId === 'breadboard_400' ? 0.5 : 0.45;
          // Position the new breadboard to the right of the main breadboard area
          // (after the first column of components)
          const objects = runtimeRef.current.getWorkspaceObjectModels?.() ?? [];
          const existingBBs = objects.filter((o: any) => (o.objectType as string).startsWith('breadboard'));  // eslint-disable-line @typescript-eslint/no-explicit-any
          if (existingBBs.length > 0) {
            // Place below the last breadboard (in vertical layout, "below" means further right)
            const lastBB = existingBBs[existingBBs.length - 1];
            // Breadboard_830 local width is 900, after 90° rotation rendered height ≈ 900*scale
            const bbDims: Record<string, { w: number; h: number }> = {
              breadboard_830: { w: 900, h: 350 },
              breadboard_400: { w: 475, h: 350 },
              breadboard_mini: { w: 300, h: 250 },
            };
            const lastDims = bbDims[lastBB.objectType] || { w: 900, h: 350 };
            // When rotated 90°, rendered width = localHeight * scale
            const lastRenderedWidth = lastDims.h * (lastBB.scale || 0.55);
            posX = lastBB.positionX + lastRenderedWidth + 40;
            posY = lastBB.positionY;
          }
        }

        runtimeRef.current.registerWorkspaceObjectModel({
          objectId,
          objectType: assetId,
          positionX: Math.round(posX),
          positionY: Math.round(posY),
          rotation: dropRotation,
          scale: dropScale,
          selected: false,
          locked: false,
          metadata: {},
        });

        // If this is a breadboard, also register its breadboard visual
        // (the scene renderer needs a BreadboardVisualModel to render the holes)
        if (assetId === 'breadboard_830' || assetId === 'breadboard_400' || assetId === 'breadboard_mini') {
          void import('@stemverse/runtime-engine').then((runtimeModule) => {
            const { generateBreadboardVisual } = runtimeModule;
            if (generateBreadboardVisual && runtimeRef.current) {
              const visual = generateBreadboardVisual(objectId, assetId);
              runtimeRef.current.registerBreadboardVisual?.(visual);
            }
          }).catch(() => { /* noop */ });
        }

        addRecent(assetId);
        selectComponent(objectId);
        setStatus(`Added ${assetId}`);

        /* ── Pin assignment integration ──────────────────────────── */
        if (BOARD_ASSET_IDS.has(assetId)) {
          // This is a board — register it with the real objectId
          pinSetBoard(objectId, assetId);
          setStatus(`Board detected: ${assetId}`);

          // Auto-wire all existing components that don't have wires yet
          setTimeout(() => {
            const rt = runtimeRef.current;
            if (!rt) return;
            const store = usePinAssignmentStore.getState();
            // Auto-assign power pins for all existing components
            for (const comp of store.droppedComponents) {
              store.autoAssignPowerPins(comp.objectId);
            }
            // Generate wires for all assignments
            const allAssignments = usePinAssignmentStore.getState().assignments;
            for (const assignment of allAssignments) {
              if (!assignment.wireId) {
                const wireId = generateWireForAssignment(
                  assignment,
                  rt,
                  componentAssetsRef.current,
                  adapterRef.current?.sceneRenderer?.renderScaleMap,
                );
                if (wireId) {
                  usePinAssignmentStore.getState().setWireId(
                    assignment.componentObjectId,
                    assignment.componentPinName,
                    wireId,
                  );
                }
              }
            }
            setStatus(`Board registered — auto-wiring all components`);
          }, 200);
        } else if (COMPONENT_PIN_CATALOG[assetId]) {
          // This is a sensor/actuator/component — register & auto-assign power
          const catalog = COMPONENT_PIN_CATALOG[assetId];
          pinAddComponent({
            objectId,
            objectType: assetId,
            displayName: catalog.displayName,
            pins: catalog.pins,
          });

          // Check if a board is registered — only auto-wire if board exists
          const storeState = usePinAssignmentStore.getState();
          if (storeState.boardObjectId) {
            // Auto-assign VCC/GND pins
            pinAutoAssignPower(objectId);
            // Open the pin assignment panel
            pinSetPropertyPanelOpen(true);

            // ── Auto-wire VCC/GND after placement ───────────────────
            // Small delay to ensure the runtime has the object registered
            setTimeout(() => {
              const rt = runtimeRef.current;
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
                  adapterRef.current?.sceneRenderer?.renderScaleMap,
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
            }, 200);

            setStatus(`${catalog.displayName} auto-placed — wiring power pins…`);
          } else {
            // No board registered yet — just add the component, wires will be created when board drops
            pinSetPropertyPanelOpen(true);
            setStatus(`${catalog.displayName} added — drop a board to auto-wire`);
          }
        }

        // Auto-fit camera after each drop so everything is clearly visible
        setTimeout(() => {
          const fitContainer = pixiContainerRef.current;
          const fitAdapter = adapterRef.current;
          const fitRuntime = runtimeRef.current;
          if (fitContainer && fitAdapter?.app?.stage && fitRuntime) {
            const fitRect = fitContainer.getBoundingClientRect();
            const cam = fitCameraToContent(
              fitRuntime,
              componentAssetsRef.current,
              fitRect.width || 800,
              fitRect.height || 600,
              60,
            );
            cameraRef.current = cam;
            fitAdapter.app.stage.scale.set(cam.zoom);
            fitAdapter.app.stage.position.set(cam.x, cam.y);
          }
        }, 300);

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
    const runtime = runtimeRef.current;
    if (!userCode.trim()) {
      setStatus('No code to simulate. Write some code first.');
      return;
    }

    setSimulationState('running');
    setStatus('▶ Simulation running…');
    setSerialOutput([]);

    // Parse code patterns
    const hasDigitalWrite = /digitalWrite/i.test(userCode);
    const hasDelay = /delay\s*\(/i.test(userCode);
    const hasAnalogRead = /analogRead/i.test(userCode);
    const hasAnalogWrite = /analogWrite/i.test(userCode);
    const hasServoWrite = /Servo.*write|servo.*write/i.test(userCode);

    // Extract Serial.println messages
    const serialMatches = [...userCode.matchAll(/Serial\.println\s*\(\s*["']([^"']*)["']\s*\)/g)];
    const serialMessages = serialMatches.map(m => m[1]);

    // Extract delay value
    const delayMatch = userCode.match(/delay\s*\(\s*(\d+)\s*\)/);
    const delayMs = delayMatch ? Math.max(200, Math.min(3000, parseInt(delayMatch[1], 10))) : 500;

    // Clean up any existing interval
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
    }

    // Mark all components as active
    if (runtime) {
      try {
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

    // Simulation tick
    let tick = 0;
    const tickInterval = hasDelay ? Math.min(delayMs, 1000) : 300;

    simIntervalRef.current = setInterval(() => {
      tick++;
      if (!runtime) return;

      const objects = runtime.getWorkspaceObjectModels?.() ?? [];

      // Toggle LEDs based on digitalWrite pattern
      if (hasDigitalWrite) {
        for (const obj of objects) {
          const t = obj.objectType as string;
          if (t.includes('led')) {
            const blink = hasDelay ? tick % 2 === 0 : true;
            runtime.updateWorkspaceObjectModel?.(obj.objectId, {
              metadata: { ...obj.metadata, ledOn: blink },
            });
          }
        }
      }

      // Simulate analog writes (PWM fade effect)
      if (hasAnalogWrite) {
        for (const obj of objects) {
          const t = obj.objectType as string;
          if (t.includes('led')) {
            const brightness = Math.round((Math.sin(tick * 0.2) + 1) * 127.5);
            runtime.updateWorkspaceObjectModel?.(obj.objectId, {
              metadata: { ...obj.metadata, ledOn: true, brightness },
            });
          }
        }
      }

      // Simulate servo sweep
      if (hasServoWrite) {
        for (const obj of objects) {
          const t = obj.objectType as string;
          if (t.includes('servo')) {
            const angle = Math.round(90 + Math.sin(tick * 0.15) * 90);
            runtime.updateWorkspaceObjectModel?.(obj.objectId, {
              metadata: { ...obj.metadata, servoAngle: angle },
            });
          }
        }
      }

      // Simulate sensor readings
      if (hasAnalogRead) {
        for (const obj of objects) {
          const t = obj.objectType as string;
          if (t.includes('dht') || t.includes('mq') || t.includes('hc_sr') || t.includes('potentiometer')) {
            runtime.updateWorkspaceObjectModel?.(obj.objectId, {
              metadata: {
                ...obj.metadata,
                sensorValue: Math.round(20 + Math.sin(tick * 0.3) * 15),
              },
            });
          }
        }
      }

      // Emit serial messages in round-robin
      if (serialMessages.length > 0) {
        const msgIndex = (tick - 1) % serialMessages.length;
        setSerialOutput(prev => [...prev.slice(-200), serialMessages[msgIndex]]);
      }

      setStatus(`▶ Simulation running… tick ${tick}`);
    }, tickInterval);
  }, [userCode, setSimulationState]);

  const handleStop = useCallback(() => {
    // Clean up interval
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }

    setSimulationState('idle');
    setStatus('Simulation stopped');

    // Reset all LED and component states
    const runtime = runtimeRef.current;
    if (runtime) {
      try {
        const objects = runtime.getWorkspaceObjectModels?.() ?? [];
        for (const obj of objects) {
          const t = obj.objectType as string;
          if (t.includes('led')) {
            runtime.updateWorkspaceObjectModel?.(obj.objectId, {
              metadata: { ...obj.metadata, ledOn: false },
            });
          }
        }

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
    handleStop();
    setSerialOutput([]);
    clearSelection();
    setStatus('Simulation reset');
  }, [handleStop, clearSelection]);

  // Cleanup simulation interval on unmount
  useEffect(() => {
    return () => {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
      }
    };
  }, []);

  /* ── Property panel handlers ────────────────────────────────────── */
  const handleDelete = useCallback(
    (id: string) => {
      const runtime = runtimeRef.current;
      if (!runtime) return;
      pushUndo(`Delete ${id}`);

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

      // Alt key activates the magnifier lens
      if (e.key === 'Alt') {
        e.preventDefault();
        setMagnifierEnabled(true);
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
      if (e.key === 'Alt') {
        setMagnifierEnabled(false);
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
        {/* Left: Component catalog */}
        <ComponentCatalog />

        {/* Center: Canvas + Code editor */}
        <div className="flex flex-1 flex-col min-w-0">
        <main className="relative flex-1 overflow-hidden">
          <div
            ref={pixiContainerRef}
            className="h-full w-full"
            style={{ cursor: panningRef.current ? 'grabbing' : (spacebarRef.current || activeTool === 'pan') ? 'grab' : 'default' }}
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

          {/* Amazon-style magnifier lens — hold Alt to activate */}
          <CanvasMagnifier containerRef={pixiContainerRef} enabled={magnifierEnabled} />

          {/* Pin inspector tooltip */}
          <PinInspector />

          {/* Phase 27B: Context menu */}
          <ContextMenu
            onDuplicate={handleDuplicate}
            onDelete={(id) => {
              const runtime = runtimeRef.current;
              if (!runtime) { handleDelete(id); return; }

              // Check if this ID is a wire (in the wire geometry registry)
              const isWire = id.startsWith('auto_wire_') ||
                runtime.getWireGeometries?.()?.some?.((g: any) => g.wireId === id); // eslint-disable-line @typescript-eslint/no-explicit-any
              if (isWire) {
                // Remove wire geometry and route from runtime
                try { runtime.removeWireGeometry?.(id); } catch { /* noop */ }
                try { runtime.removeWireRoute?.(id); } catch { /* noop */ }

                // Also directly remove the wire renderer from the scene for instant visual feedback
                const sceneRenderer = adapterRef.current?.sceneRenderer;
                if (sceneRenderer?.wireMap) {
                  const wr = sceneRenderer.wireMap.get(id);
                  if (wr) {
                    try {
                      sceneRenderer.wireRenderer?.container?.removeChild(wr.container);
                      wr.container.destroy({ children: true });
                    } catch { /* noop */ }
                    sceneRenderer.wireMap.delete(id);
                  }
                }

                // Clear selection so the deleted wire isn't still "selected"
                try {
                  runtime.registerWorkspaceSelectionModel?.({
                    selectionId: 'primary',
                    selectedObjectIds: [],
                  });
                } catch { /* noop */ }

                // Clean up pin assignment store
                const store = usePinAssignmentStore.getState();
                const assignment = store.assignments.find((a: any) => a.wireId === id); // eslint-disable-line @typescript-eslint/no-explicit-any
                if (assignment) {
                  store.setWireId(assignment.componentObjectId, assignment.componentPinName, null as any); // eslint-disable-line @typescript-eslint/no-explicit-any
                }
                setStatus(`Deleted wire ${id}`);
              } else {
                handleDelete(id);
              }
            }}
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
              {magnifierEnabled && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-primary/20 text-primary animate-pulse">
                  🔍 Magnifier ON
                </span>
              )}
              <span className="text-[10px] text-muted">
                Zoom: {Math.round(cameraRef.current.zoom * 100)}%
              </span>
              <span className="text-[9px] text-muted/50 hidden sm:inline">
                Hold Alt to magnify
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

          {/* Code editor panel */}
          <SimulatorCodeEditor
            code={userCode}
            onCodeChange={setUserCode}
            serialOutput={serialOutput}
            onClearSerial={() => setSerialOutput([])}
            isSimulating={simulationState === 'running'}
          />
        </div>{/* end center column */}

        {/* Right: Property Panel + Pin Assignment panel */}
        <div className="flex flex-col w-80 border-l border-border/30 overflow-hidden">
          {/* Property panel — shows when a component is selected */}
          <PropertyPanel
            runtime={runtimeRef.current}
            selectedObjectId={selectedId}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onRotate={(id, angle) => handleRotate(id, angle)}
          />
        <PinAssignmentPanel
          runtime={runtimeRef.current}
          onDeleteComponent={(id) => {
            handleDelete(id);
          }}
          onWireGenerated={(assignment: PinAssignment, _wireId: string) => { // eslint-disable-line @typescript-eslint/no-unused-vars
            const runtime = runtimeRef.current;
            if (!runtime) return;

            // Remove old wire if it exists
            if (assignment.wireId) {
              removeWire(assignment.wireId, runtime);
            }

            const wireId = generateWireForAssignment(
              assignment,
              runtime,
              componentAssetsRef.current,
              adapterRef.current?.sceneRenderer?.renderScaleMap,
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
          }}
          onZoomToComponent={(objectId) => {
            const runtime = runtimeRef.current;
            const adapter = adapterRef.current;
            const container = pixiContainerRef.current;
            if (!runtime || !adapter?.app?.stage || !container) return;

            const obj = runtime.getWorkspaceObjectModel?.(objectId);
            if (!obj) return;

            // Calculate rendered size of the component (matching scene renderer logic)
            const asset = componentAssetsRef.current.find((a: any) => a.assetId === obj.objectType); // eslint-disable-line @typescript-eslint/no-explicit-any
            let renderW: number, renderH: number;
            // Reference breadboard width
            let refBBWidth = 500;
            const allObjs = runtime.getWorkspaceObjectModels?.() ?? [];
            for (const o of allObjs) {
              if ((o.objectType as string).startsWith('breadboard')) {
                const bbW: Record<string, number> = { breadboard_830: 940, breadboard_400: 500, breadboard_mini: 320 };
                refBBWidth = (bbW[o.objectType] || 940) * (o.scale || 1);
                break;
              }
            }
            if ((obj.objectType as string).startsWith('breadboard')) {
              const bbD: Record<string, { w: number; h: number }> = { breadboard_830: { w: 940, h: 340 }, breadboard_400: { w: 500, h: 340 }, breadboard_mini: { w: 320, h: 170 } };
              const d = bbD[obj.objectType] || { w: 940, h: 340 };
              const localW = d.w * (obj.scale || 1);
              const localH = d.h * (obj.scale || 1);
              const isRotated = Math.abs(Math.sin(obj.rotation || 0)) > 0.5;
              renderW = isRotated ? localH : localW;
              renderH = isRotated ? localW : localH;
            } else {
              const ratio = SCENE_SCALE_RATIOS[obj.objectType];
              const assetW = asset?.imageWidth || 100;
              const assetH = asset?.imageHeight || 100;
              if (ratio && refBBWidth > 0) {
                const rs = (refBBWidth * ratio) / assetW;
                renderW = assetW * rs;
                renderH = assetH * rs;
              } else {
                renderW = assetW * (obj.scale || 1);
                renderH = assetH * (obj.scale || 1);
              }
            }

            // Center and zoom to show the component at ~2x for pin detail
            const rect = container.getBoundingClientRect();
            const canvasW = rect.width || 800;
            const canvasH = rect.height || 600;
            const padded = 80;
            const zoom = Math.min((canvasW - padded) / renderW, (canvasH - padded) / renderH, 2.5);
            const centerX = (obj.positionX || 0) + renderW / 2;
            const centerY = (obj.positionY || 0) + renderH / 2;
            const cam = { x: canvasW / 2 - centerX * zoom, y: canvasH / 2 - centerY * zoom, zoom: Math.max(0.5, zoom) };

            cameraRef.current = cam;
            adapter.app.stage.scale.set(cam.zoom);
            adapter.app.stage.position.set(cam.x, cam.y);
            setStatus(`Focused on ${obj.objectType}`);
          }}
        />
        </div>{/* end right panel */}
      </div>
    </div>
  );
}
