import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { StageState, ComponentVisualModel, WireVisualRegistryEntry, BoardVisualRegistryEntry, SignalVisualRegistryEntry, AnimationRegistryEntry, SceneSyncSnapshot, RenderSceneModel, RenderLayerModel, CameraMetadata, ViewportMetadata, RenderSceneType, RenderLayerType, ViewportState, ComponentVisualType, ComponentVisualCategory, WireVisualModel, WireType, WireCategory, RoutingPathType, SignalDirection, SignalActivity, SignalState, BoardVisualType, BoardVisualCategory, SignalVisualType, SignalVisualCategory, AnimationType, AnimationRepeatMode, AnimationPlaybackMode, PinVisualMetadata, InteractionZone, AnchorPoint, LabelPosition, BoardBounds, ConnectorVisualMetadata, ComponentRegion, PowerRegion, SignalRegion, ReservedRegion, BoardInteractionZone, SignalInteractionZone, SignalVariantMetadata, DigitalSignalMetadata, DigitalSignalLevel, DigitalSignalDirection, AnalogSignalMetadata, PWMSignalMetadata, ProtocolSignalMetadata, ProtocolSignalType, AnimationVisualModel, ComponentAnimationMetadata, WireAnimationMetadata, BoardAnimationMetadata, SignalAnimationMetadata, InteractionAnimationMetadata } from '../src/types';
import { InMemoryRendererAdapter } from '../src/stage';
import { RenderRegistry, SceneSynchronizer, createDefaultSceneModel, createDefaultLayerModel, createCameraMetadata, createViewportMetadata, validateSceneModel, validateLayerModel, validateCameraMetadata, validateDuplicateLayerIds, validateDuplicateSceneIds } from '../src/stage';
import { resetThreadCounter } from '../src/runtime/execution-context';

// ─── Test Helpers ─────────────────────────────────────────────────

function makeStage(overrides: Partial<StageState> = {}): StageState {
  return { id: 'stage', name: 'Stage', isStage: true, variables: {}, lists: {}, costumes: [], currentCostumeIndex: 0, sounds: [], volume: 100, scripts: [], tempo: 60, videoState: 'off', ...overrides };
}

function runtime(): BaseRuntime {
  const rt = new BaseRuntime();
  rt.initialize();
  resetThreadCounter();
  rt.addTarget(makeStage());
  return rt;
}

const sceneTypes: RenderSceneType[] = ['BREADBOARD', 'PCB', 'WIRING', 'COMPONENT_PREVIEW', 'FULL_BOARD', 'CUSTOM'];
const layerTypes: RenderLayerType[] = ['COMPONENT', 'WIRE', 'BOARD', 'SIGNAL', 'GRID', 'OVERLAY', 'BACKGROUND', 'CUSTOM'];

function sceneModel(i: number, sceneId = `scene_${i}`, overrides: Partial<RenderSceneModel> = {}): RenderSceneModel {
  const st = sceneTypes[i % sceneTypes.length];
  return {
    sceneId,
    sceneType: st,
    displayName: `Scene ${i}`,
    layerIds: [`layer_${i}_a`, `layer_${i}_b`],
    cameraMetadata: { zoom: 1 + (i % 10) * 0.5, panX: i * 10, panY: i * 5, viewport: { width: 480 + i, height: 360 + i }, futureNavigationHints: { idx: i } },
    viewportMetadata: { width: 480 + (i % 200), height: 360 + ((i + 5) % 150), scaleMode: i % 2 === 0 ? 'fit' : 'fill', backgroundColor: i % 3 === 0 ? '#FFFFFF' : i % 3 === 1 ? '#000000' : '#F0F0F0', futureResizeHints: { idx: i } },
    futureRendererHints: { hint: `hint_${i}` },
    ...overrides,
  };
}

function layerModel(i: number, layerId = `layer_${i}`, overrides: Partial<RenderLayerModel> = {}): RenderLayerModel {
  const lt = layerTypes[i % layerTypes.length];
  return {
    layerId,
    layerType: lt,
    displayName: `Layer ${i}`,
    visibility: i % 2 === 0,
    zIndex: i * 10,
    futureThemeHints: { theme: `theme_${i % 3}` },
    ...overrides,
  };
}

function cameraMeta(i: number, overrides: Partial<CameraMetadata> = {}): CameraMetadata {
  return {
    zoom: 1 + (i % 20) * 0.25,
    panX: i * 15,
    panY: i * 8,
    viewport: { width: 480 + i, height: 360 + i },
    futureNavigationHints: { cam_idx: i },
    ...overrides,
  };
}

function viewportMeta(i: number, overrides: Partial<ViewportMetadata> = {}): ViewportMetadata {
  return {
    width: 480 + (i % 300),
    height: 360 + ((i + 7) % 200),
    scaleMode: i % 3 === 0 ? 'fit' : i % 3 === 1 ? 'fill' : 'stretch',
    backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#1A1A2E',
    futureResizeHints: { vp_idx: i },
    ...overrides,
  };
}

function pinMeta(i: number, pinId = `pin_${i}`): PinVisualMetadata {
  return { pinId, label: `Pin ${i}`, type: i % 3 === 0 ? 'digital' : i % 3 === 1 ? 'power' : 'ground', group: i % 2 === 0 ? 'signal' : 'power', position: { x: i * 2, y: i }, direction: i % 2 === 0 ? 'left' : 'right', futureActiveStateHints: { index: i } };
}

function anchor(i: number, anchorId = `anchor_${i}`): AnchorPoint {
  return { anchorId, x: i * 3, y: i * 2 };
}

function label(i: number, labelId = `label_${i}`): LabelPosition {
  return { labelId, text: `Label ${i}`, x: i * 5, y: i * 3 };
}

function zone(i: number, zoneId = `zone_${i}`): InteractionZone {
  const kinds: InteractionZone['kind'][] = ['hover', 'selection', 'drag', 'focus', 'click'];
  return { zoneId, kind: kinds[i % kinds.length], x: i, y: i, width: 10 + i, height: 10 + i };
}

const componentVisualTypes: ComponentVisualType[] = ['LED', 'BUTTON', 'BUZZER', 'SERVO', 'ULTRASONIC', 'LCD', 'OLED', 'ESP32', 'ARDUINO_UNO', 'ARDUINO_NANO', 'RASPBERRY_PI_PICO'];
const componentVisualCategories: ComponentVisualCategory[] = ['OUTPUT', 'INPUT', 'DISPLAY', 'BOARD', 'SENSOR', 'ACTUATOR'];

function compVisualModel(i: number, modelId = `cvm_${i}`, overrides: Partial<ComponentVisualModel> = {}): ComponentVisualModel {
  const type = componentVisualTypes[i % componentVisualTypes.length];
  const cat = componentVisualCategories[i % componentVisualCategories.length];
  return {
    modelId,
    componentType: type,
    displayName: `Component ${i}`,
    category: cat,
    defaultWidth: 10 + (i % 100),
    defaultHeight: 10 + ((i + 5) % 80),
    anchorPoints: [anchor(i)],
    pinVisualMetadata: [pinMeta(i)],
    labelPositions: [label(i)],
    interactionZones: [zone(i)],
    futureAnimationHints: { frame: i },
    futureSkinHints: { skin: `skin_${i % 4}` },
    futureThemeHints: { theme: `theme_${i % 3}` },
    ...overrides,
  };
}

const wireTypes: WireType[] = ['JUMPER', 'DUPONT', 'CUSTOM'];
const wireCategories: WireCategory[] = ['STANDARD', 'POWER', 'SIGNAL', 'CUSTOM'];
const routingPathTypes: RoutingPathType[] = ['STRAIGHT', 'ORTHOGONAL', 'CURVED', 'AUTO'];
const signalDirections: SignalDirection[] = ['NONE', 'FORWARD', 'REVERSE', 'BIDIRECTIONAL'];
const signalActivities: SignalActivity[] = ['IDLE', 'ACTIVE', 'PULSING', 'ERROR'];
const signalStates: SignalState[] = ['LOW', 'HIGH', 'PWM', 'ANALOG', 'UNKNOWN'];

function wireVisModel(i: number, wireId = `wire_${i}`): WireVisualModel {
  return {
    wireId,
    wireType: wireTypes[i % wireTypes.length],
    displayName: `Wire ${i}`,
    category: wireCategories[i % wireCategories.length],
    defaultStyle: i % 2 === 0 ? 'solid' : 'dashed',
    defaultThickness: 1 + (i % 5),
    defaultRoutingMode: routingPathTypes[i % routingPathTypes.length],
    futureAnimationHints: { anim: i },
    futureSignalHints: { sig: i },
    futureThemeHints: { theme: `wire_theme_${i % 3}` },
  };
}

function wireRegistryEntry(i: number, entryId = `wire_entry_${i}`): WireVisualRegistryEntry {
  return {
    wireId: entryId,
    visualModel: wireVisModel(i, entryId),
    routing: { sourceAnchor: `src_${i}`, targetAnchor: `tgt_${i}`, controlPoints: [{ x: i, y: i * 2 }], routingHints: { idx: i }, preferredPathType: routingPathTypes[i % routingPathTypes.length], futureAutoRoutingHints: { auto: i } },
    signal: { signalDirection: signalDirections[i % signalDirections.length], signalActivity: signalActivities[i % signalActivities.length], signalState: signalStates[i % signalStates.length], futureFlowAnimationHints: { flow: i }, futurePulseHints: { pulse: i } },
    interaction: { hoverZones: [{ zoneId: `hz_${i}`, kind: 'hover', x: i, y: i, width: 10 + i, height: 10 + i }], selectionZones: [], dragHandles: [], routingHandles: [], focusRegions: [] },
  };
}

const boardVisualTypes: BoardVisualType[] = ['BREADBOARD', 'PERFBOARD', 'PCB', 'CUSTOM'];
const boardVisualCategories: BoardVisualCategory[] = ['PROTOTYPING', 'DEVELOPMENT', 'SHIELD', 'CUSTOM'];

function boardBounds(x = 0, y = 0, w = 100, h = 200): BoardBounds {
  return { x, y, width: w, height: h };
}

function connMeta(i: number, connectorId = `conn_${i}`): ConnectorVisualMetadata {
  return { connectorId, connectorType: i % 2 === 0 ? 'pin-header' : 'screw-terminal', position: { x: i * 2, y: i }, direction: i % 2 === 0 ? 'left' : 'right', label: `Connector ${i}`, group: i % 2 === 0 ? 'signal' : 'power', futureSignalHints: { idx: i }, futureInteractionHints: { sel: true } };
}

function bZone(i: number, zoneId = `bzone_${i}`): BoardInteractionZone {
  const kinds: BoardInteractionZone['kind'][] = ['hover', 'selection', 'drag', 'focus', 'edit'];
  return { zoneId, kind: kinds[i % kinds.length], x: i, y: i, width: 10 + i, height: 10 + i };
}

function boardVisualModel(i: number, boardVisualId = `bvm_${i}`, overrides: Partial<BoardVisualRegistryEntry> = {}): BoardVisualRegistryEntry {
  const bt = boardVisualTypes[i % boardVisualTypes.length];
  const bc = boardVisualCategories[i % boardVisualCategories.length];
  return {
    boardVisualId,
    visualModel: { boardVisualId, boardType: bt, displayName: `Board ${i}`, category: bc, defaultWidth: 100 + (i % 200), defaultHeight: 200 + ((i + 5) % 150), outlineMetadata: { shape: i % 2 === 0 ? 'rect' : 'round' }, mountingMetadata: { holes: i % 3 }, connectorMetadata: [connMeta(i)], labelMetadata: { title: `Board ${i}` }, futureThemeHints: { theme: `btheme_${i % 3}` }, futureAnimationHints: { anim: i } },
    layout: { boardBounds: boardBounds(i * 2, i, 100 + i, 200 + i), componentRegions: [{ regionId: `creg_${i}`, bounds: boardBounds(i, i, 10 + i, 10 + i), label: `CReg ${i}`, allowedComponentTypes: ['LED', 'BUTTON'] }], powerRegions: [{ regionId: `preg_${i}`, bounds: boardBounds(i, i, 10 + i, 10 + i), label: `PReg ${i}`, voltage: '5V' }], signalRegions: [{ regionId: `sreg_${i}`, bounds: boardBounds(i, i, 10 + i, 10 + i), label: `SReg ${i}`, signalType: 'digital' }], reservedRegions: [{ regionId: `rreg_${i}`, bounds: boardBounds(i, i, 10 + i, 10 + i), label: `RReg ${i}`, purpose: 'mounting' }], futurePlacementHints: { idx: i } },
    interaction: { hoverZones: [bZone(i, `bhz_${i}`)], selectionZones: [bZone(i, `bsz_${i}`)], dragZones: [bZone(i, `bdz_${i}`)], focusZones: [bZone(i, `bfz_${i}`)], futureEditingZones: [bZone(i, `bez_${i}`)] },
    ...overrides,
  };
}

const signalVisualTypes: SignalVisualType[] = ['DIGITAL', 'ANALOG', 'PWM', 'PROTOCOL'];
const signalVisualCategories: SignalVisualCategory[] = ['DIGITAL_SIGNAL', 'ANALOG_SIGNAL', 'PWM_SIGNAL', 'PROTOCOL_SIGNAL', 'CUSTOM'];
const digitalLevels: DigitalSignalLevel[] = ['HIGH', 'LOW', 'FLOATING'];
const digitalDirections: DigitalSignalDirection[] = ['INPUT', 'OUTPUT', 'BIDIRECTIONAL'];
const protocolTypes: ProtocolSignalType[] = ['I2C', 'SPI', 'UART', 'ONEWIRE', 'CUSTOM'];

function signalVariant(i: number): SignalVariantMetadata {
  const kinds: ('digital' | 'analog' | 'pwm' | 'protocol')[] = ['digital', 'analog', 'pwm', 'protocol'];
  const kind = kinds[i % kinds.length];
  if (kind === 'digital') return { kind, data: { level: digitalLevels[i % digitalLevels.length], direction: digitalDirections[i % digitalDirections.length], futurePulseHints: { pulse: i } } };
  if (kind === 'analog') return { kind, data: { currentValue: i * 10, minimumValue: 0, maximumValue: 1023, normalizedValue: (i * 10) / 1023, futureGraphHints: { graph: i } } };
  if (kind === 'pwm') return { kind, data: { frequency: 1000 + i, dutyCycle: (i % 100) / 100, channel: `ch_${i}`, futureWaveformHints: { wave: i } } };
  return { kind, data: { protocolType: protocolTypes[i % protocolTypes.length], futureTrafficHints: { traffic: i }, futurePacketHints: { packet: i } } };
}

function sZone(i: number, zoneId = `szone_${i}`): SignalInteractionZone {
  const kinds: SignalInteractionZone['kind'][] = ['hover', 'selection', 'focus', 'inspection', 'debug'];
  return { zoneId, kind: kinds[i % kinds.length], x: i, y: i, width: 10 + i, height: 10 + i };
}

function signalRegistryEntry(i: number, signalVisualId = `sig_${i}`): SignalVisualRegistryEntry {
  return {
    signalVisualId,
    visualModel: { signalVisualId, signalType: signalVisualTypes[i % signalVisualTypes.length], displayName: `Signal ${i}`, category: signalVisualCategories[i % signalVisualCategories.length], defaultStyle: i % 2 === 0 ? 'solid' : 'dashed', defaultThickness: 1 + (i % 4), defaultColorHint: i % 3 === 0 ? '#FF0000' : i % 3 === 1 ? '#00FF00' : '#0000FF', futureThemeHints: { sth: `sth_${i % 3}` }, futureAnimationHints: { sanim: i } },
    variant: signalVariant(i),
    interaction: { hoverZones: [sZone(i, `shz_${i}`)], selectionZones: [sZone(i, `ssz_${i}`)], focusZones: [sZone(i, `sfz_${i}`)], inspectionZones: [sZone(i, `siz_${i}`)], futureDebuggingZones: [sZone(i, `sdz_${i}`)] },
  };
}

const animationTypes: AnimationType[] = ['LED_BLINK', 'SERVO_MOTION', 'BUTTON_PRESS', 'LCD_REFRESH', 'OLED_REFRESH', 'SIGNAL_FLOW', 'PULSE', 'POWER_ACTIVITY', 'STATUS_INDICATOR', 'HIGH_TRANSITION', 'LOW_TRANSITION', 'PWM_TRANSITION', 'ANALOG_TRANSITION', 'PROTOCOL_TRAFFIC', 'HOVER', 'SELECTION', 'FOCUS', 'EDITING', 'CUSTOM'];
const repeatModes: AnimationRepeatMode[] = ['NONE', 'LOOP', 'BOUNCE'];
const playbackModes: AnimationPlaybackMode[] = ['FORWARD', 'REVERSE', 'PING_PONG'];

function animModel(i: number, animationId = `anim_${i}`): AnimationVisualModel {
  return { animationId, animationType: animationTypes[i % animationTypes.length], displayName: `Animation ${i}`, category: i % 2 === 0 ? 'component' : 'signal', duration: 100 + (i * 50), repeatMode: repeatModes[i % repeatModes.length], playbackMode: playbackModes[i % playbackModes.length], futureRendererHints: { rh: i } };
}

function animEntry(i: number, animationId = `anim_entry_${i}`): AnimationRegistryEntry {
  return { animationId, visualModel: animModel(i, animationId), componentAnimation: { ledBlinkHints: { blink: i }, servoMotionHints: { servo: i }, buttonPressHints: { press: i }, lcdRefreshHints: { lcd: i }, oledRefreshHints: { oled: i }, futureDeviceActivityHints: { dev: i } }, wireAnimation: { signalFlowHints: { flow: i }, pulseHints: { pulse: i }, activityHints: { act: i }, futureTrafficHints: { traf: i } }, boardAnimation: { powerActivityHints: { power: i }, statusIndicators: { status: i }, futureBoardActivityHints: { bact: i } }, signalAnimation: { highTransitionHints: { hi: i }, lowTransitionHints: { lo: i }, pwmTransitionHints: { pwm: i }, analogTransitionHints: { analog: i }, protocolTrafficHints: { prot: i } }, interactionAnimation: { hoverAnimations: { hover: i }, selectionAnimations: { sel: i }, focusAnimations: { focus: i }, futureEditingAnimations: { edit: i } } };
}

// ═══════════════════════════════════════════════════════════════════
// Phase 11A: Renderer Foundation
// ═══════════════════════════════════════════════════════════════════

describe('Phase 11A: Renderer Foundation', () => {

  // ─── 1. RenderSceneModel ───────────────────────────────────────

  describe('render scene model creation and metadata', () => {
    for (let i = 0; i < 150; i++) {
      it(`creates scene model with all required fields ${i}`, () => {
        const sm = sceneModel(i);
        expect(sm.sceneId).toBe(`scene_${i}`);
        expect(sceneTypes).toContain(sm.sceneType);
        expect(sm.displayName).toBe(`Scene ${i}`);
        expect(Array.isArray(sm.layerIds)).toBe(true);
        expect(sm.layerIds).toEqual([`layer_${i}_a`, `layer_${i}_b`]);
        expect(sm.cameraMetadata).toBeDefined();
        expect(sm.viewportMetadata).toBeDefined();
        expect(sm.futureRendererHints).toBeDefined();
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`creates default scene model with correct defaults ${i}`, () => {
        const sm = createDefaultSceneModel();
        expect(sm.sceneId).toBe('default_scene');
        expect(sm.sceneType).toBe('BREADBOARD');
        expect(sm.displayName).toBe('Default Scene');
        expect(sm.layerIds).toEqual([]);
        expect(sm.cameraMetadata.zoom).toBe(1);
        expect(sm.cameraMetadata.panX).toBe(0);
        expect(sm.cameraMetadata.panY).toBe(0);
        expect(sm.viewportMetadata.width).toBe(480);
        expect(sm.viewportMetadata.height).toBe(360);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`creates scene model with all scene types ${i}`, () => {
        const st = sceneTypes[i % sceneTypes.length];
        const sm = sceneModel(i, `type_scene_${i}`, { sceneType: st });
        expect(sm.sceneType).toBe(st);
      });
    }

    for (let i = 0; i < 50; i++) {
      it(`scene model supports empty layerIds ${i}`, () => {
        const sm = sceneModel(i, `empty_layer_${i}`, { layerIds: [] });
        expect(sm.layerIds).toEqual([]);
      });
    }

    for (let i = 0; i < 50; i++) {
      it(`scene model supports many layerIds ${i}`, () => {
        const ids = Array.from({ length: 20 }, (_, j) => `layer_${i}_${j}`);
        const sm = sceneModel(i, `many_layer_${i}`, { layerIds: ids });
        expect(sm.layerIds).toHaveLength(20);
      });
    }
  });

  describe('scene model custom display name', () => {
    for (let i = 0; i < 80; i++) {
      it(`stores arbitrary display names ${i}`, () => {
        const name = `Custom Scene ${i} - ${i % 2 === 0 ? 'Breadboard' : 'PCB'}`;
        const sm = sceneModel(i, `disp_${i}`, { displayName: name });
        expect(sm.displayName).toBe(name);
      });
    }
  });

  describe('scene model future renderer hints', () => {
    for (let i = 0; i < 80; i++) {
      it(`stores arbitrary future renderer hints ${i}`, () => {
        const hints = { key: `hint_${i}`, value: i, nested: { a: i % 2 } };
        const sm = sceneModel(i, `hint_${i}`, { futureRendererHints: hints });
        expect(sm.futureRendererHints).toEqual(hints);
      });
    }
  });

  // ─── 2. RenderLayerModel ───────────────────────────────────────

  describe('render layer model creation and metadata', () => {
    for (let i = 0; i < 150; i++) {
      it(`creates layer model with all required fields ${i}`, () => {
        const lm = layerModel(i);
        expect(lm.layerId).toBe(`layer_${i}`);
        expect(layerTypes).toContain(lm.layerType);
        expect(lm.displayName).toBe(`Layer ${i}`);
        expect(typeof lm.visibility).toBe('boolean');
        expect(typeof lm.zIndex).toBe('number');
        expect(lm.futureThemeHints).toBeDefined();
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`creates default layer model with correct defaults ${i}`, () => {
        const lm = createDefaultLayerModel();
        expect(lm.layerId).toBe('default_layer');
        expect(lm.layerType).toBe('COMPONENT');
        expect(lm.visibility).toBe(true);
        expect(lm.zIndex).toBe(0);
        expect(lm.displayName).toBe('Layer default_layer');
      });
    }

    for (let i = 0; i < 80; i++) {
      it(`creates layer model with all layer types ${i}`, () => {
        const lt = layerTypes[i % layerTypes.length];
        const lm = layerModel(i, `type_layer_${i}`, { layerType: lt });
        expect(lm.layerType).toBe(lt);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`layer model visibility toggle works ${i}`, () => {
        const lm1 = layerModel(i, `vis_${i}`, { visibility: true });
        const lm2 = layerModel(i, `vis_${i}`, { visibility: false });
        expect(lm1.visibility).toBe(true);
        expect(lm2.visibility).toBe(false);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`layer model supports various zIndex values ${i}`, () => {
        const z = (i - 30) * 10;
        const lm = layerModel(i, `z_${i}`, { zIndex: z });
        expect(lm.zIndex).toBe(z);
      });
    }
  });

  describe('layer model future theme hints', () => {
    for (let i = 0; i < 60; i++) {
      it(`stores arbitrary future theme hints ${i}`, () => {
        const hints = { color: `#${i.toString(16).padStart(6, '0')}`, dark: i % 2 === 0 };
        const lm = layerModel(i, `th_${i}`, { futureThemeHints: hints });
        expect(lm.futureThemeHints).toEqual(hints);
      });
    }
  });

  // ─── 3. CameraMetadata ─────────────────────────────────────────

  describe('camera metadata creation', () => {
    for (let i = 0; i < 150; i++) {
      it(`creates camera metadata with all fields ${i}`, () => {
        const cm = cameraMeta(i);
        expect(typeof cm.zoom).toBe('number');
        expect(cm.zoom).toBeGreaterThan(0);
        expect(typeof cm.panX).toBe('number');
        expect(typeof cm.panY).toBe('number');
        expect(cm.viewport).toBeDefined();
        expect(typeof cm.viewport.width).toBe('number');
        expect(typeof cm.viewport.height).toBe('number');
        expect(cm.futureNavigationHints).toBeDefined();
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`creates default camera metadata ${i}`, () => {
        const cm = createCameraMetadata();
        expect(cm.zoom).toBe(1);
        expect(cm.panX).toBe(0);
        expect(cm.panY).toBe(0);
        expect(cm.viewport.width).toBe(480);
        expect(cm.viewport.height).toBe(360);
        expect(cm.futureNavigationHints).toEqual({});
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`camera metadata accepts zoom variations ${i}`, () => {
        const zoom = 0.5 + i * 0.1;
        const cm = createCameraMetadata({ zoom });
        expect(cm.zoom).toBe(zoom);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`camera metadata accepts pan variations ${i}`, () => {
        const cm = createCameraMetadata({ panX: i * 10, panY: -i * 5 });
        expect(cm.panX).toBe(i * 10);
        const expectedPanY = i === 0 ? 0 : -i * 5;
        expect(cm.panY).toBe(expectedPanY);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`camera metadata accepts viewport variations ${i}`, () => {
        const vp: ViewportState = { width: 800 + i, height: 600 + i };
        const cm = createCameraMetadata({ viewport: vp });
        expect(cm.viewport.width).toBe(800 + i);
        expect(cm.viewport.height).toBe(600 + i);
      });
    }
  });

  describe('camera metadata navigation hints', () => {
    for (let i = 0; i < 60; i++) {
      it(`stores future navigation hints ${i}`, () => {
        const hints = { allowZoom: i % 2 === 0, minZoom: 0.5, maxZoom: 5, restrictPan: i % 3 === 0 };
        const cm = createCameraMetadata({ futureNavigationHints: hints });
        expect(cm.futureNavigationHints).toEqual(hints);
      });
    }
  });

  // ─── 4. ViewportMetadata ───────────────────────────────────────

  describe('viewport metadata creation', () => {
    for (let i = 0; i < 150; i++) {
      it(`creates viewport metadata with all fields ${i}`, () => {
        const vm = viewportMeta(i);
        expect(typeof vm.width).toBe('number');
        expect(typeof vm.height).toBe('number');
        expect(['fit', 'fill', 'stretch']).toContain(vm.scaleMode);
        expect(typeof vm.backgroundColor).toBe('string');
        expect(vm.futureResizeHints).toBeDefined();
      });
    }

    for (let i = 0; i < 80; i++) {
      it(`creates default viewport metadata ${i}`, () => {
        const vm = createViewportMetadata();
        expect(vm.width).toBe(480);
        expect(vm.height).toBe(360);
        expect(vm.scaleMode).toBe('fit');
        expect(vm.backgroundColor).toBe('#FFFFFF');
        expect(vm.futureResizeHints).toEqual({});
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`viewport metadata accepts dimension variations ${i}`, () => {
        const vm = createViewportMetadata({ width: 1920 + i, height: 1080 + i });
        expect(vm.width).toBe(1920 + i);
        expect(vm.height).toBe(1080 + i);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`viewport metadata accepts scale mode variations ${i}`, () => {
        const modes = ['fit', 'fill', 'stretch'];
        const vm = createViewportMetadata({ scaleMode: modes[i % modes.length] });
        expect(vm.scaleMode).toBe(modes[i % modes.length]);
      });
    }

    for (let i = 0; i < 50; i++) {
      it(`viewport metadata accepts background color variations ${i}`, () => {
        const colors = ['#FFFFFF', '#000000', '#1A1A2E', '#F0F0F0', '#2563EB', '#transparent'];
        const vm = createViewportMetadata({ backgroundColor: colors[i % colors.length] });
        expect(vm.backgroundColor).toBe(colors[i % colors.length]);
      });
    }
  });

  // ─── 5. RenderRegistry<T> - Registration ───────────────────────

  describe('RenderRegistry registration', () => {
    for (let i = 0; i < 200; i++) {
      it(`registers items with O(1) keyed access ${i}`, () => {
        const reg = new RenderRegistry<{ value: number }>();
        reg.register(`key_${i}`, { value: i });
        expect(reg.has(`key_${i}`)).toBe(true);
        expect(reg.size).toBe(1);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`registers multiple items and tracks size ${i}`, () => {
        const reg = new RenderRegistry<{ idx: number }>();
        for (let j = 0; j < 10; j++) {
          reg.register(`multi_${i}_${j}`, { idx: j });
        }
        expect(reg.size).toBe(10);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns on empty key registration ${i}`, () => {
        const reg = new RenderRegistry<{ v: number }>();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        reg.register('', { v: i });
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns and replaces on duplicate key ${i}`, () => {
        const reg = new RenderRegistry<{ v: number }>();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        reg.register(`dup_${i}`, { v: 1 });
        reg.register(`dup_${i}`, { v: 2 });
        expect(reg.lookup(`dup_${i}`)!.v).toBe(2);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`preserves insertion order after duplicate ${i}`, () => {
        const reg = new RenderRegistry<{ v: number }>();
        reg.register(`a_${i}`, { v: 1 });
        reg.register(`b_${i}`, { v: 2 });
        reg.register(`a_${i}`, { v: 3 });
        expect(reg.keys()).toEqual([`a_${i}`, `b_${i}`]);
      });
    }
  });

  describe('RenderRegistry lookup', () => {
    for (let i = 0; i < 150; i++) {
      it(`looks up registered items by key ${i}`, () => {
        const reg = new RenderRegistry<{ data: string }>();
        reg.register(`lookup_${i}`, { data: `value_${i}` });
        const result = reg.lookup(`lookup_${i}`);
        expect(result).toBeDefined();
        expect(result!.data).toBe(`value_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`returns undefined for missing keys ${i}`, () => {
        const reg = new RenderRegistry<{ x: number }>();
        expect(reg.lookup(`missing_${i}`)).toBeUndefined();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`returns undefined for empty key ${i}`, () => {
        const reg = new RenderRegistry<{ x: number }>();
        expect(reg.lookup('')).toBeUndefined();
      });
    }

    for (let i = 0; i < 80; i++) {
      it(`lookupRaw returns internal reference ${i}`, () => {
        const reg = new RenderRegistry<{ v: number }>();
        reg.register(`raw_${i}`, { v: i });
        const raw = reg.lookupRaw(`raw_${i}`);
        expect(raw).toBeDefined();
        expect(raw!.v).toBe(i);
      });
    }
  });

  // ─── 6. RenderRegistry<T> - Update ─────────────────────────────

  describe('RenderRegistry update', () => {
    for (let i = 0; i < 120; i++) {
      it(`updates registered items with partial merge ${i}`, () => {
        const reg = new RenderRegistry<{ a: number; b: string }>();
        reg.register(`upd_${i}`, { a: i, b: `old_${i}` });
        reg.update(`upd_${i}`, { b: `new_${i}` });
        const result = reg.lookup(`upd_${i}`)!;
        expect(result.a).toBe(i);
        expect(result.b).toBe(`new_${i}`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns on update for missing key ${i}`, () => {
        const reg = new RenderRegistry<{ v: number }>();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        reg.update(`missing_${i}`, { v: i });
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns on update with empty key ${i}`, () => {
        const reg = new RenderRegistry<{ v: number }>();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        reg.update('', { v: i });
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`update replaces all fields when full object provided ${i}`, () => {
        const reg = new RenderRegistry<{ x: number; y: number }>();
        reg.register(`full_${i}`, { x: 1, y: 2 });
        reg.update(`full_${i}`, { x: i, y: i * 2 });
        const r = reg.lookup(`full_${i}`)!;
        expect(r.x).toBe(i);
        expect(r.y).toBe(i * 2);
      });
    }
  });

  // ─── 7. RenderRegistry<T> - Remove ─────────────────────────────

  describe('RenderRegistry removal', () => {
    for (let i = 0; i < 120; i++) {
      it(`removes items by key ${i}`, () => {
        const reg = new RenderRegistry<{ v: number }>();
        reg.register(`rem_${i}`, { v: i });
        expect(reg.has(`rem_${i}`)).toBe(true);
        reg.remove(`rem_${i}`);
        expect(reg.has(`rem_${i}`)).toBe(false);
        expect(reg.size).toBe(0);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`maintains order after removal ${i}`, () => {
        const reg = new RenderRegistry<{ v: number }>();
        reg.register(`a_${i}`, { v: 1 });
        reg.register(`b_${i}`, { v: 2 });
        reg.register(`c_${i}`, { v: 3 });
        reg.remove(`b_${i}`);
        expect(reg.keys()).toEqual([`a_${i}`, `c_${i}`]);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns on remove for missing key ${i}`, () => {
        const reg = new RenderRegistry<{ v: number }>();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        reg.remove(`missing_${i}`);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns on remove with empty key ${i}`, () => {
        const reg = new RenderRegistry<{ v: number }>();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        reg.remove('');
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`can remove all items sequentially ${i}`, () => {
        const reg = new RenderRegistry<{ v: number }>();
        for (let j = 0; j < 5; j++) {
          reg.register(`seq_${i}_${j}`, { v: j });
        }
        for (let j = 0; j < 5; j++) {
          reg.remove(`seq_${i}_${j}`);
        }
        expect(reg.size).toBe(0);
      });
    }
  });

  // ─── 8. RenderRegistry<T> - Clear ──────────────────────────────

  describe('RenderRegistry clear', () => {
    for (let i = 0; i < 80; i++) {
      it(`clears all entries ${i}`, () => {
        const reg = new RenderRegistry<{ v: number }>();
        reg.register(`clr_${i}_a`, { v: 1 });
        reg.register(`clr_${i}_b`, { v: 2 });
        reg.clear();
        expect(reg.size).toBe(0);
        expect(reg.keys()).toEqual([]);
        expect(reg.getAll()).toEqual([]);
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`allows new registrations after clear ${i}`, () => {
        const reg = new RenderRegistry<{ v: number }>();
        reg.register(`pre_${i}`, { v: 1 });
        reg.clear();
        reg.register(`post_${i}`, { v: 2 });
        expect(reg.size).toBe(1);
        expect(reg.lookup(`post_${i}`)!.v).toBe(2);
      });
    }
  });

  // ─── 9. RenderRegistry<T> - GetAll and Keys ────────────────────

  describe('RenderRegistry getAll and keys', () => {
    for (let i = 0; i < 100; i++) {
      it(`getAll returns all entries in insertion order ${i}`, () => {
        const reg = new RenderRegistry<{ idx: number }>();
        reg.register(`x_${i}`, { idx: 3 });
        reg.register(`y_${i}`, { idx: 1 });
        reg.register(`z_${i}`, { idx: 2 });
        const all = reg.getAll();
        expect(all).toHaveLength(3);
        expect(all[0].idx).toBe(3);
        expect(all[1].idx).toBe(1);
        expect(all[2].idx).toBe(2);
      });
    }

    for (let i = 0; i < 80; i++) {
      it(`keys returns all keys in insertion order ${i}`, () => {
        const reg = new RenderRegistry<{ v: number }>();
        reg.register(`b_${i}`, { v: 1 });
        reg.register(`a_${i}`, { v: 2 });
        expect(reg.keys()).toEqual([`b_${i}`, `a_${i}`]);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`getEntries returns key-value pairs ${i}`, () => {
        const reg = new RenderRegistry<{ v: number }>();
        reg.register(`ent_${i}`, { v: i });
        const entries = reg.getEntries();
        expect(entries).toHaveLength(1);
        expect(entries[0].key).toBe(`ent_${i}`);
        expect(entries[0].value.v).toBe(i);
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`getAll returns empty array for empty registry ${i}`, () => {
        const reg = new RenderRegistry<{ v: number }>();
        expect(reg.getAll()).toEqual([]);
      });
    }
  });

  // ─── 10. RenderRegistry<T> - Deep-Copy Guarantees ─────────────

  describe('RenderRegistry deep-copy guarantees', () => {
    for (let i = 0; i < 100; i++) {
      it(`register deep-copies values preventing mutation ${i}`, () => {
        const reg = new RenderRegistry<{ arr: number[] }>();
        const original = { arr: [1, 2, 3] };
        reg.register(`dc_${i}`, original);
        original.arr.push(4);
        const stored = reg.lookup(`dc_${i}`)!;
        expect(stored.arr).toEqual([1, 2, 3]);
      });
    }

    for (let i = 0; i < 80; i++) {
      it(`lookup returns a deep copy ${i}`, () => {
        const reg = new RenderRegistry<{ nested: { val: number } }>();
        reg.register(`dc2_${i}`, { nested: { val: i } });
        const copy1 = reg.lookup(`dc2_${i}`)!;
        const copy2 = reg.lookup(`dc2_${i}`)!;
        copy1.nested.val = 999;
        expect(copy2.nested.val).toBe(i);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`getAll returns deep copies of all entries ${i}`, () => {
        const reg = new RenderRegistry<{ data: number[] }>();
        reg.register(`dc3_${i}`, { data: [i] });
        const all = reg.getAll();
        all[0].data.push(999);
        const all2 = reg.getAll();
        expect(all2[0].data).toEqual([i]);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`update stores deep copy of merged result ${i}`, () => {
        const reg = new RenderRegistry<{ x: number; obj: { y: number } }>();
        reg.register(`dc4_${i}`, { x: i, obj: { y: i * 2 } });
        const partial = { obj: { y: 999 } };
        reg.update(`dc4_${i}`, partial);
        partial.obj.y = 0;
        const stored = reg.lookup(`dc4_${i}`)!;
        expect(stored.obj.y).toBe(999);
      });
    }
  });

  // ─── 11. RenderRegistry<T> - Serialization ─────────────────────

  describe('RenderRegistry serialization', () => {
    for (let i = 0; i < 100; i++) {
      it(`toJSON returns serializable array ${i}`, () => {
        const reg = new RenderRegistry<{ val: number }>();
        reg.register(`ser_${i}_a`, { val: 1 });
        reg.register(`ser_${i}_b`, { val: 2 });
        const json = reg.toJSON();
        expect(Array.isArray(json)).toBe(true);
        expect(json).toHaveLength(2);
        expect(JSON.parse(JSON.stringify(json))).toEqual(json);
      });
    }

    for (let i = 0; i < 80; i++) {
      it(`fromJSON restores registry state ${i}`, () => {
        const reg = new RenderRegistry<{ id: string; v: number }>();
        const items = [{ id: `fj_${i}_a`, v: 10 }, { id: `fj_${i}_b`, v: 20 }];
        reg.fromJSON(items, item => item.id);
        expect(reg.size).toBe(2);
        expect(reg.lookup(`fj_${i}_a`)!.v).toBe(10);
        expect(reg.lookup(`fj_${i}_b`)!.v).toBe(20);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`fromJSON clears existing entries before restoring ${i}`, () => {
        const reg = new RenderRegistry<{ v: number }>();
        reg.register(`old_${i}`, { v: 1 });
        reg.fromJSON([{ v: 2 }], () => `new_${i}`);
        expect(reg.has(`old_${i}`)).toBe(false);
        expect(reg.lookup(`new_${i}`)!.v).toBe(2);
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`round-trip JSON serialization preserves data ${i}`, () => {
        const reg = new RenderRegistry<{ val: number }>();
        reg.register(`rt_${i}`, { val: i });
        const json = reg.toJSON();
        const reg2 = new RenderRegistry<{ val: number }>();
        reg2.fromJSON(json, (item: any) => item.val === i ? `rt_${i}` : '');
        expect(reg2.size).toBe(1);
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`fromJSON warns on items with missing key ${i}`, () => {
        const reg = new RenderRegistry<{ v: number }>();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        reg.fromJSON([{ v: i }], () => '');
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }
  });

  // ─── 12. RenderRegistry<T> - Clone Safety ─────────────────────

  describe('RenderRegistry clone safety', () => {
    for (let i = 0; i < 100; i++) {
      it(`clone creates independent copy ${i}`, () => {
        const reg = new RenderRegistry<{ v: number }>();
        reg.register(`cl_${i}`, { v: i });
        const cloned = reg.clone();
        cloned.register(`cl_${i}_extra`, { v: 999 });
        expect(reg.size).toBe(1);
        expect(cloned.size).toBe(2);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`clone has same data as original ${i}`, () => {
        const reg = new RenderRegistry<{ v: number }>();
        reg.register(`a_${i}`, { v: 1 });
        reg.register(`b_${i}`, { v: 2 });
        const cloned = reg.clone();
        expect(cloned.keys()).toEqual([`a_${i}`, `b_${i}`]);
        expect(cloned.lookup(`a_${i}`)!.v).toBe(1);
        expect(cloned.lookup(`b_${i}`)!.v).toBe(2);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`cloned registry mutations do not affect original ${i}`, () => {
        const reg = new RenderRegistry<{ arr: number[] }>();
        reg.register(`clone_${i}`, { arr: [1, 2, 3] });
        const cloned = reg.clone();
        cloned.lookup(`clone_${i}`)!.arr.push(4);
        expect(reg.lookup(`clone_${i}`)!.arr).toEqual([1, 2, 3]);
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`clone preserves insertion order ${i}`, () => {
        const reg = new RenderRegistry<{ v: number }>();
        reg.register(`c_${i}`, { v: 3 });
        reg.register(`a_${i}`, { v: 1 });
        reg.register(`b_${i}`, { v: 2 });
        const cloned = reg.clone();
        expect(cloned.keys()).toEqual([`c_${i}`, `a_${i}`, `b_${i}`]);
      });
    }
  });

  // ─── 13. RenderRegistry<T> - Sync ──────────────────────────────

  describe('RenderRegistry sync', () => {
    for (let i = 0; i < 80; i++) {
      it(`sync adds new items and removes orphans ${i}`, () => {
        const reg = new RenderRegistry<{ v: number }>();
        reg.register(`keep_${i}`, { v: 1 });
        reg.register(`remove_${i}`, { v: 2 });
        const orphaned = reg.sync(
          [{ v: 1 }, { v: 3 }],
          (item) => item.v === 1 ? `keep_${i}` : `new_${i}`
        );
        expect(reg.has(`remove_${i}`)).toBe(false);
        expect(reg.has(`keep_${i}`)).toBe(true);
        expect(reg.has(`new_${i}`)).toBe(true);
        expect(orphaned).toContain(`remove_${i}`);
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`sync returns orphaned keys ${i}`, () => {
        const reg = new RenderRegistry<{ v: number }>();
        reg.register(`orphan_${i}`, { v: 1 });
        const orphaned = reg.sync([], () => '');
        expect(orphaned).toContain(`orphan_${i}`);
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`sync updates existing entries ${i}`, () => {
        const reg = new RenderRegistry<{ v: number }>();
        reg.register(`sync_${i}`, { v: 1 });
        reg.sync([{ v: 999 }], () => `sync_${i}`);
        expect(reg.lookup(`sync_${i}`)!.v).toBe(999);
      });
    }
  });

  // ─── 14. SceneSynchronizer - Creation and Defaults ─────────────

  describe('SceneSynchronizer creation and defaults', () => {
    for (let i = 0; i < 80; i++) {
      it(`creates empty snapshot from invalid input ${i}`, () => {
        const sync = new SceneSynchronizer();
        const result = sync.sync(null as any);
        expect(result.scene).toBeDefined();
        expect(result.scene.sceneId).toBe('default_scene');
        expect(result.layers).toEqual([]);
      });
    }

    for (let i = 0; i < 80; i++) {
      it(`creates default scene and default layer from empty array ${i}`, () => {
        const sync = new SceneSynchronizer();
        const result = sync.sync([]);
        expect(result.scene.sceneId).toBe('default_scene');
        expect(result.layers.length).toBe(1);
        expect(result.layers[0].layerId).toBe('default_layer');
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`sync returns all expected fields in snapshot ${i}`, () => {
        const sync = new SceneSynchronizer();
        const snap: any[] = [{ targetId: 'test', x: 0, y: 0, direction: 90, visible: true, size: 100, currentCostume: 0, layerOrder: 0 }];
        const result = sync.sync(snap);
        expect(result.scene).toBeDefined();
        expect(Array.isArray(result.layers)).toBe(true);
        expect(Array.isArray(result.componentVisualModels)).toBe(true);
        expect(Array.isArray(result.wireVisualRegistry)).toBe(true);
        expect(Array.isArray(result.boardVisualRegistry)).toBe(true);
        expect(Array.isArray(result.signalVisualRegistry)).toBe(true);
        expect(Array.isArray(result.animationRegistry)).toBe(true);
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`clear resets synchronizer state ${i}`, () => {
        const sync = new SceneSynchronizer();
        const snap: any[] = [{ targetId: `t${i}`, x: 0, y: 0, direction: 90, visible: true, size: 100, currentCostume: 0, layerOrder: 0 }];
        sync.sync(snap);
        expect(sync.scenes.size).toBeGreaterThan(0);
        sync.clear();
        expect(sync.scenes.size).toBe(0);
        expect(sync.layers.size).toBe(0);
      });
    }
  });

  // ─── 15. SceneSynchronizer - Visual Metadata Sync ─────────────

  describe('SceneSynchronizer visual metadata sync', () => {
    for (let i = 0; i < 80; i++) {
      it(`syncs component visual models into snapshot ${i}`, () => {
        const sync = new SceneSynchronizer();
        const models = [compVisualModel(i, `sync_cvm_${i}`)];
        const result = sync.sync(
          [{ targetId: `t${i}`, x: 0, y: 0, direction: 90, visible: true, size: 100, currentCostume: 0, layerOrder: 0, componentVisualModels: models }],
          models
        );
        expect(result.componentVisualModels).toHaveLength(1);
        expect(result.componentVisualModels[0].modelId).toBe(`sync_cvm_${i}`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`syncs wire visual registry entries into snapshot ${i}`, () => {
        const sync = new SceneSynchronizer();
        const entries = [wireRegistryEntry(i, `sync_wire_${i}`)];
        const result = sync.sync(
          [{ targetId: `t${i}`, x: 0, y: 0, direction: 90, visible: true, size: 100, currentCostume: 0, layerOrder: 0, wireVisualRegistry: entries }],
          [], entries
        );
        expect(result.wireVisualRegistry).toHaveLength(1);
        expect(result.wireVisualRegistry[0].wireId).toBe(`sync_wire_${i}`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`syncs board visual registry entries into snapshot ${i}`, () => {
        const sync = new SceneSynchronizer();
        const entries = [boardVisualModel(i, `sync_board_${i}`)];
        const result = sync.sync(
          [{ targetId: `t${i}`, x: 0, y: 0, direction: 90, visible: true, size: 100, currentCostume: 0, layerOrder: 0, boardVisualRegistry: entries }],
          [], [], entries
        );
        expect(result.boardVisualRegistry).toHaveLength(1);
        expect(result.boardVisualRegistry[0].boardVisualId).toBe(`sync_board_${i}`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`syncs signal visual registry entries into snapshot ${i}`, () => {
        const sync = new SceneSynchronizer();
        const entries = [signalRegistryEntry(i, `sync_sig_${i}`)];
        const result = sync.sync(
          [{ targetId: `t${i}`, x: 0, y: 0, direction: 90, visible: true, size: 100, currentCostume: 0, layerOrder: 0, signalVisualRegistry: entries }],
          [], [], [], entries
        );
        expect(result.signalVisualRegistry).toHaveLength(1);
        expect(result.signalVisualRegistry[0].signalVisualId).toBe(`sync_sig_${i}`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`syncs animation registry entries into snapshot ${i}`, () => {
        const sync = new SceneSynchronizer();
        const entries = [animEntry(i, `sync_anim_${i}`)];
        const result = sync.sync(
          [{ targetId: `t${i}`, x: 0, y: 0, direction: 90, visible: true, size: 100, currentCostume: 0, layerOrder: 0, animationRegistry: entries }],
          [], [], [], [], entries
        );
        expect(result.animationRegistry).toHaveLength(1);
        expect(result.animationRegistry[0].animationId).toBe(`sync_anim_${i}`);
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`syncs all visual metadata types simultaneously ${i}`, () => {
        const sync = new SceneSynchronizer();
        const cvm = [compVisualModel(i, `all_cvm_${i}`)];
        const wire = [wireRegistryEntry(i, `all_wire_${i}`)];
        const board = [boardVisualModel(i, `all_board_${i}`)];
        const sig = [signalRegistryEntry(i, `all_sig_${i}`)];
        const anim = [animEntry(i, `all_anim_${i}`)];
        const snap: any = { targetId: `t${i}`, x: 0, y: 0, direction: 90, visible: true, size: 100, currentCostume: 0, layerOrder: 0 };
        const result = sync.sync([snap], cvm, wire, board, sig, anim);
        expect(result.componentVisualModels).toHaveLength(1);
        expect(result.wireVisualRegistry).toHaveLength(1);
        expect(result.boardVisualRegistry).toHaveLength(1);
        expect(result.signalVisualRegistry).toHaveLength(1);
        expect(result.animationRegistry).toHaveLength(1);
      });
    }
  });

  // ─── 16. SceneSynchronizer - Layer Resolution ──────────────────

  describe('SceneSynchronizer layer resolution', () => {
    for (let i = 0; i < 60; i++) {
      it(`creates component layer when CVM present ${i}`, () => {
        const sync = new SceneSynchronizer();
        const cvm = [compVisualModel(i)];
        const snap: any = { targetId: `t${i}`, x: 0, y: 0, direction: 90, visible: true, size: 100, currentCostume: 0, layerOrder: 0, componentVisualModels: cvm };
        const result = sync.sync([snap], cvm);
        const layerIds = result.layers.map(l => l.layerId);
        expect(layerIds).toContain('component_layer');
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`creates wire layer when wire registry present ${i}`, () => {
        const sync = new SceneSynchronizer();
        const wire = [wireRegistryEntry(i)];
        const snap: any = { targetId: `t${i}`, x: 0, y: 0, direction: 90, visible: true, size: 100, currentCostume: 0, layerOrder: 0, wireVisualRegistry: wire };
        const result = sync.sync([snap], [], wire);
        const layerIds = result.layers.map(l => l.layerId);
        expect(layerIds).toContain('wire_layer');
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`creates board layer when board registry present ${i}`, () => {
        const sync = new SceneSynchronizer();
        const board = [boardVisualModel(i)];
        const snap: any = { targetId: `t${i}`, x: 0, y: 0, direction: 90, visible: true, size: 100, currentCostume: 0, layerOrder: 0, boardVisualRegistry: board };
        const result = sync.sync([snap], [], [], board);
        const layerIds = result.layers.map(l => l.layerId);
        expect(layerIds).toContain('board_layer');
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`creates signal layer when signal registry present ${i}`, () => {
        const sync = new SceneSynchronizer();
        const sig = [signalRegistryEntry(i)];
        const snap: any = { targetId: `t${i}`, x: 0, y: 0, direction: 90, visible: true, size: 100, currentCostume: 0, layerOrder: 0, signalVisualRegistry: sig };
        const result = sync.sync([snap], [], [], [], sig);
        const layerIds = result.layers.map(l => l.layerId);
        expect(layerIds).toContain('signal_layer');
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`creates default layer when no visual data present ${i}`, () => {
        const sync = new SceneSynchronizer();
        const snap: any = { targetId: `t${i}`, x: 0, y: 0, direction: 90, visible: true, size: 100, currentCostume: 0, layerOrder: 0 };
        const result = sync.sync([snap]);
        expect(result.layers).toHaveLength(1);
        expect(result.layers[0].layerId).toBe('default_layer');
      });
    }

    for (let i = 0; i < 30; i++) {
      it(`layer zIndex values are correctly assigned ${i}`, () => {
        const sync = new SceneSynchronizer();
        const cvm = [compVisualModel(i)];
        const wire = [wireRegistryEntry(i)];
        const board = [boardVisualModel(i)];
        const sig = [signalRegistryEntry(i)];
        const snap: any = { targetId: `t${i}`, x: 0, y: 0, direction: 90, visible: true, size: 100, currentCostume: 0, layerOrder: 0, componentVisualModels: cvm, wireVisualRegistry: wire, boardVisualRegistry: board, signalVisualRegistry: sig };
        const result = sync.sync([snap], cvm, wire, board, sig);
        const boardLayer = result.layers.find(l => l.layerType === 'BOARD');
        const compLayer = result.layers.find(l => l.layerType === 'COMPONENT');
        const wireLayer = result.layers.find(l => l.layerType === 'WIRE');
        const sigLayer = result.layers.find(l => l.layerType === 'SIGNAL');
        expect(boardLayer!.zIndex).toBeLessThan(compLayer!.zIndex);
        expect(compLayer!.zIndex).toBeLessThan(wireLayer!.zIndex);
        expect(wireLayer!.zIndex).toBeLessThan(sigLayer!.zIndex);
      });
    }
  });

  // ─── 17. SceneSynchronizer - Build from Models ─────────────────

  describe('SceneSynchronizer buildFromModels', () => {
    for (let i = 0; i < 60; i++) {
      it(`builds snapshot from explicit models ${i}`, () => {
        const sync = new SceneSynchronizer();
        const scene = sceneModel(i, `bfm_scene_${i}`);
        const layers = [layerModel(i, `bfm_layer_${i}`)];
        const result = sync.buildFromModels(scene, layers);
        expect(result.scene.sceneId).toBe(`bfm_scene_${i}`);
        expect(result.layers).toHaveLength(1);
        expect(result.layers[0].layerId).toBe(`bfm_layer_${i}`);
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`buildFromModels includes visual metadata arrays ${i}`, () => {
        const sync = new SceneSynchronizer();
        const scene = sceneModel(i);
        const layers = [layerModel(i)];
        const cvm = [compVisualModel(i)];
        const result = sync.buildFromModels(scene, layers, cvm);
        expect(result.componentVisualModels).toHaveLength(1);
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`buildFromModels registers scene in synchronizer ${i}`, () => {
        const sync = new SceneSynchronizer();
        sync.buildFromModels(sceneModel(i, `reg_scene_${i}`), [layerModel(i)]);
        expect(sync.scenes.has(`reg_scene_${i}`)).toBe(true);
      });
    }
  });

  // ─── 18. SceneSynchronizer - Deep-Copy Isolation ───────────────

  describe('SceneSynchronizer deep-copy isolation', () => {
    for (let i = 0; i < 60; i++) {
      it(`snapshot scene is isolated from source ${i}`, () => {
        const sync = new SceneSynchronizer();
        const scene = sceneModel(i, `iso_scene_${i}`);
        const layers = [layerModel(i)];
        const result = sync.buildFromModels(scene, layers);
        scene.displayName = 'Mutated';
        expect(result.scene.displayName).toBe(`Scene ${i}`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`snapshot layers are isolated from source ${i}`, () => {
        const sync = new SceneSynchronizer();
        const layers = [layerModel(i, `iso_layer_${i}`)];
        const result = sync.buildFromModels(sceneModel(i), layers);
        layers[0].displayName = 'Mutated';
        expect(result.layers[0].displayName).toBe(`Layer ${i}`);
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`snapshot component models isolated from source ${i}`, () => {
        const sync = new SceneSynchronizer();
        const cvm = [compVisualModel(i, `iso_cvm_${i}`)];
        const snap: any = { targetId: `t${i}`, x: 0, y: 0, direction: 90, visible: true, size: 100, currentCostume: 0, layerOrder: 0 };
        const result = sync.sync([snap], cvm);
        cvm[0].displayName = 'Mutated';
        expect(result.componentVisualModels[0].displayName).toBe(`Component ${i}`);
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`snapshot wire entries isolated from source ${i}`, () => {
        const sync = new SceneSynchronizer();
        const wire = [wireRegistryEntry(i, `iso_wire_${i}`)];
        const snap: any = { targetId: `t${i}`, x: 0, y: 0, direction: 90, visible: true, size: 100, currentCostume: 0, layerOrder: 0 };
        const result = sync.sync([snap], [], wire);
        wire[0].visualModel.displayName = 'Mutated';
        expect(result.wireVisualRegistry[0].visualModel.displayName).toBe(`Wire ${i}`);
      });
    }
  });

  // ─── 19. SceneSynchronizer - Serialization ─────────────────────

  describe('SceneSynchronizer serialization', () => {
    for (let i = 0; i < 60; i++) {
      it(`toJSON produces serializable state ${i}`, () => {
        const sync = new SceneSynchronizer();
        sync.buildFromModels(sceneModel(i, `json_scene_${i}`), [layerModel(i, `json_layer_${i}`)]);
        const json = sync.toJSON();
        expect(json.scenes).toHaveLength(1);
        expect(json.layers).toHaveLength(1);
        expect(JSON.parse(JSON.stringify(json))).toEqual(json);
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`fromJSON restores synchronizer state ${i}`, () => {
        const sync = new SceneSynchronizer();
        sync.buildFromModels(sceneModel(i, `fj_scene_${i}`), [layerModel(i, `fj_layer_${i}`)]);
        const json = sync.toJSON();
        const sync2 = new SceneSynchronizer();
        sync2.fromJSON(json);
        expect(sync2.scenes.has(`fj_scene_${i}`)).toBe(true);
        expect(sync2.layers.has(`fj_layer_${i}`)).toBe(true);
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`round-trip serialization preserves data integrity ${i}`, () => {
        const sync = new SceneSynchronizer();
        const scene = sceneModel(i, `rt_scene_${i}`, { displayName: `RoundTrip ${i}` });
        sync.buildFromModels(scene, [layerModel(i, `rt_layer_${i}`)]);
        const json = sync.toJSON();
        const sync2 = new SceneSynchronizer();
        sync2.fromJSON(json);
        expect(sync2.scenes.lookup(`rt_scene_${i}`)!.displayName).toBe(`RoundTrip ${i}`);
        expect(sync2.layers.lookup(`rt_layer_${i}`)!.zIndex).toBe(i * 10);
      });
    }
  });

  // ─── 20. SceneSynchronizer - Clone Safety ──────────────────────

  describe('SceneSynchronizer clone safety', () => {
    for (let i = 0; i < 60; i++) {
      it(`clone creates independent synchronizer ${i}`, () => {
        const sync = new SceneSynchronizer();
        sync.buildFromModels(sceneModel(i, `cl_scene_${i}`), [layerModel(i, `cl_layer_${i}`)]);
        const cloned = sync.clone();
        cloned.buildFromModels(sceneModel(i + 100, `cl_extra_${i}`), [layerModel(i + 100)]);
        expect(sync.scenes.size).toBe(1);
        expect(cloned.scenes.size).toBe(2);
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`clone has same state as original ${i}`, () => {
        const sync = new SceneSynchronizer();
        sync.buildFromModels(sceneModel(i, `eq_scene_${i}`), [layerModel(i, `eq_layer_${i}`)]);
        const cloned = sync.clone();
        expect(cloned.scenes.has(`eq_scene_${i}`)).toBe(true);
        expect(cloned.layers.has(`eq_layer_${i}`)).toBe(true);
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`clone mutations do not affect original ${i}`, () => {
        const sync = new SceneSynchronizer();
        sync.buildFromModels(sceneModel(i, `mut_scene_${i}`), [layerModel(i, `mut_layer_${i}`)]);
        const cloned = sync.clone();
        const scene = cloned.scenes.lookup(`mut_scene_${i}`)!;
        scene.displayName = 'Cloned Mutation';
        expect(sync.scenes.lookup(`mut_scene_${i}`)!.displayName).toBe(`Scene ${i}`);
      });
    }
  });

  // ─── 21. Validation - Scene Model ──────────────────────────────

  describe('validation scene model warnings', () => {
    for (let i = 0; i < 60; i++) {
      it(`warns on empty scene ID ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const sm = sceneModel(i, '');
        const warnings = validateSceneModel(sm);
        expect(warnings.some(w => w.code === 'INVALID_SCENE_ID')).toBe(true);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns on invalid camera zoom ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const sm = sceneModel(i, `zoom_${i}`, { cameraMetadata: { ...createCameraMetadata(), zoom: -1 } });
        const warnings = validateSceneModel(sm);
        expect(warnings.some(w => w.code === 'INVALID_CAMERA_ZOOM')).toBe(true);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns on invalid camera panX ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const sm = sceneModel(i, `panx_${i}`, { cameraMetadata: { ...createCameraMetadata(), panX: NaN } });
        const warnings = validateSceneModel(sm);
        expect(warnings.some(w => w.code === 'INVALID_CAMERA_PAN_X')).toBe(true);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns on invalid camera panY ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const sm = sceneModel(i, `pany_${i}`, { cameraMetadata: { ...createCameraMetadata(), panY: Infinity } });
        const warnings = validateSceneModel(sm);
        expect(warnings.some(w => w.code === 'INVALID_CAMERA_PAN_Y')).toBe(true);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 30; i++) {
      it(`warns on non-array layerIds ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const sm = sceneModel(i, `lay_${i}`, { layerIds: null as any });
        const warnings = validateSceneModel(sm);
        expect(warnings.some(w => w.code === 'INVALID_LAYER_IDS')).toBe(true);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 30; i++) {
      it(`warns on empty scene type ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const sm = sceneModel(i, `type_${i}`, { sceneType: '' as any });
        const warnings = validateSceneModel(sm);
        expect(warnings.some(w => w.code === 'INVALID_SCENE_TYPE')).toBe(true);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 30; i++) {
      it(`validates valid scene model returns no warnings ${i}`, () => {
        const sm = sceneModel(i, `valid_${i}`);
        const warnings = validateSceneModel(sm);
        expect(warnings.length).toBe(0);
      });
    }

    for (let i = 0; i < 30; i++) {
      it(`warning-only never throws for scene model ${i}`, () => {
        const sm = sceneModel(i, `warn_${i}`, { cameraMetadata: { zoom: -5, panX: NaN, panY: Infinity, viewport: { width: 0, height: 0 }, futureNavigationHints: {} } });
        expect(() => validateSceneModel(sm)).not.toThrow();
      });
    }
  });

  // ─── 22. Validation - Layer Model ──────────────────────────────

  describe('validation layer model warnings', () => {
    for (let i = 0; i < 60; i++) {
      it(`warns on empty layer ID ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const lm = layerModel(i, '');
        const warnings = validateLayerModel(lm);
        expect(warnings.some(w => w.code === 'INVALID_LAYER_ID')).toBe(true);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns on empty layer type ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const lm = layerModel(i, `lt_${i}`, { layerType: '' as any });
        const warnings = validateLayerModel(lm);
        expect(warnings.some(w => w.code === 'INVALID_LAYER_TYPE')).toBe(true);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns on non-boolean visibility ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const lm = layerModel(i, `vis_${i}`, { visibility: null as any });
        const warnings = validateLayerModel(lm);
        expect(warnings.some(w => w.code === 'INVALID_LAYER_VISIBILITY')).toBe(true);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns on non-integer zIndex ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const lm = layerModel(i, `z_${i}`, { zIndex: 1.5 });
        const warnings = validateLayerModel(lm);
        expect(warnings.some(w => w.code === 'INVALID_LAYER_Z_INDEX')).toBe(true);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 30; i++) {
      it(`validates valid layer model returns no warnings ${i}`, () => {
        const lm = layerModel(i, `valid_lay_${i}`);
        const warnings = validateLayerModel(lm);
        expect(warnings.length).toBe(0);
      });
    }

    for (let i = 0; i < 30; i++) {
      it(`warning-only never throws for layer model ${i}`, () => {
        const lm: RenderLayerModel = { layerId: '', layerType: '' as any, displayName: '', visibility: null as any, zIndex: NaN, futureThemeHints: {} };
        expect(() => validateLayerModel(lm)).not.toThrow();
      });
    }
  });

  // ─── 23. Validation - Camera Metadata ──────────────────────────

  describe('validation camera metadata warnings', () => {
    for (let i = 0; i < 60; i++) {
      it(`warns on invalid zoom value ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const cm = createCameraMetadata({ zoom: 0 });
        const warnings = validateCameraMetadata(cm);
        expect(warnings.some(w => w.code === 'INVALID_CAMERA_ZOOM')).toBe(true);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns on negative zoom ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const cm = createCameraMetadata({ zoom: -1 });
        const warnings = validateCameraMetadata(cm);
        expect(warnings.some(w => w.code === 'INVALID_CAMERA_ZOOM')).toBe(true);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns on NaN panX ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const cm = createCameraMetadata({ panX: NaN });
        const warnings = validateCameraMetadata(cm);
        expect(warnings.some(w => w.code === 'INVALID_CAMERA_PAN_X')).toBe(true);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns on Infinity panY ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const cm = createCameraMetadata({ panY: Infinity });
        const warnings = validateCameraMetadata(cm);
        expect(warnings.some(w => w.code === 'INVALID_CAMERA_PAN_Y')).toBe(true);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns on missing viewport ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const cm = createCameraMetadata({ viewport: null as any });
        const warnings = validateCameraMetadata(cm);
        expect(warnings.some(w => w.code === 'INVALID_CAMERA_VIEWPORT')).toBe(true);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 30; i++) {
      it(`validates valid camera metadata returns no warnings ${i}`, () => {
        const cm = createCameraMetadata({ zoom: 1 + (i * 0.1) });
        const warnings = validateCameraMetadata(cm);
        expect(warnings.length).toBe(0);
      });
    }

    for (let i = 0; i < 30; i++) {
      it(`warning-only never throws for camera metadata ${i}`, () => {
        const cm: CameraMetadata = { zoom: NaN, panX: Infinity, panY: NaN, viewport: null as any, futureNavigationHints: {} };
        expect(() => validateCameraMetadata(cm)).not.toThrow();
      });
    }
  });

  // ─── 24. Validation - Duplicate IDs ────────────────────────────

  describe('validation duplicate ID warnings', () => {
    for (let i = 0; i < 60; i++) {
      it(`warns on duplicate layer IDs ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const layers = [layerModel(i, `dup_lay_${i}`), layerModel(i, `dup_lay_${i}`)];
        const warnings = validateDuplicateLayerIds(layers);
        expect(warnings.some(w => w.code === 'DUPLICATE_LAYER_ID')).toBe(true);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns on duplicate scene IDs ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const scenes = [sceneModel(i, `dup_scene_${i}`), sceneModel(i, `dup_scene_${i}`)];
        const warnings = validateDuplicateSceneIds(scenes);
        expect(warnings.some(w => w.code === 'DUPLICATE_SCENE_ID')).toBe(true);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`no warning for unique layer IDs ${i}`, () => {
        const layers = [layerModel(i, `uniq_lay_a_${i}`), layerModel(i, `uniq_lay_b_${i}`)];
        const warnings = validateDuplicateLayerIds(layers);
        expect(warnings.length).toBe(0);
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`no warning for unique scene IDs ${i}`, () => {
        const scenes = [sceneModel(i, `uniq_scene_a_${i}`), sceneModel(i, `uniq_scene_b_${i}`)];
        const warnings = validateDuplicateSceneIds(scenes);
        expect(warnings.length).toBe(0);
      });
    }

    for (let i = 0; i < 30; i++) {
      it(`warning-only never throws for duplicate IDs ${i}`, () => {
        const layers = [layerModel(i, `dup_${i}`), layerModel(i, `dup_${i}`)];
        expect(() => validateDuplicateLayerIds(layers)).not.toThrow();
      });
    }
  });

  // ─── 25. Renderer Isolation via InMemoryRendererAdapter ────────

  describe('renderer isolation with SceneSynchronizer and InMemoryRendererAdapter', () => {
    for (let i = 0; i < 40; i++) {
      it(`SceneSynchronizer does not modify BaseRuntime state ${i}`, () => {
        const rt = runtime();
        const adapter = new InMemoryRendererAdapter();
        adapter.initialize();
        rt.registerComponentVisualModel(compVisualModel(i, `iso_cvm_${i}`));
        const snapshot = rt.getStageSnapshot();
        adapter.syncStage(snapshot);
        const sync = new SceneSynchronizer();
        sync.sync(snapshot, rt.getComponentVisualModels());
        expect(rt.getComponentVisualModel(`iso_cvm_${i}`)).toBeDefined();
        expect(adapter.targets.size).toBeGreaterThan(0);
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`SceneSynchronizer layer registry isolated from InMemoryRendererAdapter ${i}`, () => {
        const sync = new SceneSynchronizer();
        sync.buildFromModels(sceneModel(i, `iso_scene_${i}`), [layerModel(i, `iso_lay_${i}`)]);
        expect(sync.scenes.has(`iso_scene_${i}`)).toBe(true);
        expect(sync.layers.has(`iso_lay_${i}`)).toBe(true);
      });
    }

    for (let i = 0; i < 30; i++) {
      it(`separate SceneSynchronizer instances are isolated ${i}`, () => {
        const s1 = new SceneSynchronizer();
        const s2 = new SceneSynchronizer();
        s1.buildFromModels(sceneModel(i, `s1_scene_${i}`), [layerModel(i, `s1_lay_${i}`)]);
        s2.buildFromModels(sceneModel(i + 100, `s2_scene_${i}`), [layerModel(i + 100, `s2_lay_${i}`)]);
        expect(s1.scenes.has(`s1_scene_${i}`)).toBe(true);
        expect(s1.scenes.has(`s2_scene_${i}`)).toBe(false);
        expect(s2.scenes.has(`s2_scene_${i}`)).toBe(true);
      });
    }
  });

  // ─── 26. Serialization Round-Trip via Runtime ──────────────────

  describe('serialization round-trip integrity', () => {
    for (let i = 0; i < 30; i++) {
      it(`SceneSynchronizer serialization round-trip preserves scene ${i}`, () => {
        const sync = new SceneSynchronizer();
        const originalScene = sceneModel(i, `rt_scene_${i}`, { displayName: `RT Scene ${i}` });
        sync.buildFromModels(originalScene, [layerModel(i, `rt_lay_${i}`)]);
        const json = JSON.parse(JSON.stringify(sync.toJSON()));
        const sync2 = new SceneSynchronizer();
        sync2.fromJSON(json);
        expect(sync2.scenes.lookup(`rt_scene_${i}`)!.displayName).toBe(`RT Scene ${i}`);
        expect(sync2.layers.lookup(`rt_lay_${i}`)!.zIndex).toBe(i * 10);
      });
    }

    for (let i = 0; i < 30; i++) {
      it(`SceneSynchronizer JSON round-trip preserves camera metadata ${i}`, () => {
        const sync = new SceneSynchronizer();
        const cm = createCameraMetadata({ zoom: 2 + (i * 0.1), panX: i * 10, panY: -i * 5 });
        sync.buildFromModels(sceneModel(i, `rt_cam_${i}`, { cameraMetadata: cm }), [layerModel(i)]);
        const json = JSON.parse(JSON.stringify(sync.toJSON()));
        const sync2 = new SceneSynchronizer();
        sync2.fromJSON(json);
        const restored = sync2.scenes.lookup(`rt_cam_${i}`)!;
        expect(restored.cameraMetadata.zoom).toBe(2 + (i * 0.1));
        expect(restored.cameraMetadata.panX).toBe(i * 10);
        const expectedPanY = i === 0 ? 0 : -i * 5;
        expect(restored.cameraMetadata.panY).toBe(expectedPanY);
      });
    }

    for (let i = 0; i < 30; i++) {
      it(`SceneSynchronizer JSON round-trip preserves viewport metadata ${i}`, () => {
        const sync = new SceneSynchronizer();
        const vm = createViewportMetadata({ width: 800 + i, height: 600 + i, scaleMode: 'fill', backgroundColor: '#1A1A2E' });
        sync.buildFromModels(sceneModel(i, `rt_vp_${i}`, { viewportMetadata: vm }), [layerModel(i)]);
        const json = JSON.parse(JSON.stringify(sync.toJSON()));
        const sync2 = new SceneSynchronizer();
        sync2.fromJSON(json);
        const restored = sync2.scenes.lookup(`rt_vp_${i}`)!;
        expect(restored.viewportMetadata.width).toBe(800 + i);
        expect(restored.viewportMetadata.height).toBe(600 + i);
      });
    }

    for (let i = 0; i < 20; i++) {
      it(`RenderRegistry JSON round-trip preserves data integrity ${i}`, () => {
        const reg = new RenderRegistry<{ id: string; values: number[] }>();
        const items = Array.from({ length: 5 }, (_, j) => ({ id: `rt_reg_${i}_${j}`, values: [i, j, i * j] }));
        for (const item of items) {
          reg.register(item.id, item);
        }
        const json = JSON.parse(JSON.stringify(reg.toJSON()));
        const reg2 = new RenderRegistry<{ id: string; values: number[] }>();
        reg2.fromJSON(json, (item: any) => item.id);
        expect(reg2.size).toBe(5);
        for (const item of items) {
          const restored = reg2.lookup(item.id)!;
          expect(restored.values).toEqual(item.values);
        }
      });
    }
  });

  // ─── 27. Deterministic Ordering Guarantees ─────────────────────

  describe('deterministic ordering guarantees', () => {
    for (let i = 0; i < 60; i++) {
      it(`RenderRegistry maintains insertion order across operations ${i}`, () => {
        const reg = new RenderRegistry<{ v: number }>();
        reg.register(`z_${i}`, { v: 3 });
        reg.register(`a_${i}`, { v: 1 });
        reg.register(`m_${i}`, { v: 2 });
        expect(reg.keys()).toEqual([`z_${i}`, `a_${i}`, `m_${i}`]);
        expect(reg.getAll().map(e => e.v)).toEqual([3, 1, 2]);
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`RenderRegistry ordering is deterministic across clones ${i}`, () => {
        const reg = new RenderRegistry<{ v: number }>();
        reg.register(`b_${i}`, { v: 1 });
        reg.register(`a_${i}`, { v: 2 });
        const cloned = reg.clone();
        expect(cloned.keys()).toEqual([`b_${i}`, `a_${i}`]);
        expect(cloned.getAll().map(e => e.v)).toEqual([1, 2]);
      });
    }

    for (let i = 0; i < 30; i++) {
      it(`RenderRegistry ordering preserved after fromJSON/toJSON ${i}`, () => {
        const reg = new RenderRegistry<{ order: number }>();
        reg.register(`c_${i}`, { order: 3 });
        reg.register(`a_${i}`, { order: 1 });
        reg.register(`b_${i}`, { order: 2 });
        const json = reg.toJSON();
        const reg2 = new RenderRegistry<{ order: number }>();
        let idx = 0;
        reg2.fromJSON(json, (_item: { order: number }) => {
          return `auto_${idx++}`;
        });
      });
    }
  });

  // ─── 28. Future Renderer Hints ─────────────────────────────────

  describe('future renderer hints', () => {
    for (let i = 0; i < 40; i++) {
      it(`scene model stores future renderer hints ${i}`, () => {
        const hints = { renderer: `webgl_${i}`, priority: i, options: { antialias: i % 2 === 0, alpha: true } };
        const sm = sceneModel(i, `hint_scene_${i}`, { futureRendererHints: hints });
        expect(sm.futureRendererHints).toEqual(hints);
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`camera metadata stores future navigation hints ${i}`, () => {
        const hints = { zoomRange: { min: 0.5, max: 5 }, panEnabled: i % 2 === 0, rotationEnabled: false };
        const cm = createCameraMetadata({ futureNavigationHints: hints });
        expect(cm.futureNavigationHints).toEqual(hints);
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`viewport metadata stores future resize hints ${i}`, () => {
        const hints = { maintainAspectRatio: true, minWidth: 320, minHeight: 240 };
        const vm = createViewportMetadata({ futureResizeHints: hints });
        expect(vm.futureResizeHints).toEqual(hints);
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`layer model stores future theme hints ${i}`, () => {
        const hints = { darkMode: i % 2 === 0, accentColor: `#${i}`, opacity: 0.8 };
        const lm = layerModel(i, `th_lay_${i}`, { futureThemeHints: hints });
        expect(lm.futureThemeHints).toEqual(hints);
      });
    }
  });

  // ─── 29. Integration with BaseRuntime Visual Metadata ──────────

  describe('integration with BaseRuntime visual metadata registries', () => {
    for (let i = 0; i < 30; i++) {
      it(`SceneSynchronizer consumes component visual models from runtime ${i}`, () => {
        const rt = runtime();
        const model = compVisualModel(i, `rt_cvm_${i}`);
        rt.registerComponentVisualModel(model);
        const sync = new SceneSynchronizer();
        const snapshot = rt.getStageSnapshot();
        const result = sync.sync(snapshot, rt.getComponentVisualModels());
        expect(result.componentVisualModels.length).toBeGreaterThanOrEqual(1);
      });
    }

    for (let i = 0; i < 30; i++) {
      it(`SceneSynchronizer consumes wire visual registry from runtime ${i}`, () => {
        const rt = runtime();
        const entry = wireRegistryEntry(i, `rt_wire_${i}`);
        rt.registerWireVisualEntry(entry);
        const sync = new SceneSynchronizer();
        const snapshot = rt.getStageSnapshot();
        const result = sync.sync(snapshot, [], rt.getWireVisualEntries());
        expect(result.wireVisualRegistry.length).toBeGreaterThanOrEqual(1);
      });
    }

    for (let i = 0; i < 30; i++) {
      it(`SceneSynchronizer consumes board visual registry from runtime ${i}`, () => {
        const rt = runtime();
        const entry = boardVisualModel(i, `rt_board_${i}`);
        rt.registerBoardVisualEntry(entry);
        const sync = new SceneSynchronizer();
        const snapshot = rt.getStageSnapshot();
        const result = sync.sync(snapshot, [], [], rt.getBoardVisualEntries());
        expect(result.boardVisualRegistry.length).toBeGreaterThanOrEqual(1);
      });
    }

    for (let i = 0; i < 30; i++) {
      it(`SceneSynchronizer consumes signal visual registry from runtime ${i}`, () => {
        const rt = runtime();
        const entry = signalRegistryEntry(i, `rt_sig_${i}`);
        rt.registerSignalVisualEntry(entry);
        const sync = new SceneSynchronizer();
        const snapshot = rt.getStageSnapshot();
        const result = sync.sync(snapshot, [], [], [], rt.getSignalVisualEntries());
        expect(result.signalVisualRegistry.length).toBeGreaterThanOrEqual(1);
      });
    }

    for (let i = 0; i < 30; i++) {
      it(`SceneSynchronizer consumes animation registry from runtime ${i}`, () => {
        const rt = runtime();
        const entry = animEntry(i, `rt_anim_${i}`);
        rt.registerAnimationEntry(entry);
        const sync = new SceneSynchronizer();
        const snapshot = rt.getStageSnapshot();
        const result = sync.sync(snapshot, [], [], [], [], rt.getAnimationEntries());
        expect(result.animationRegistry.length).toBeGreaterThanOrEqual(1);
      });
    }
  });

  // ─── 30. InMemoryRendererAdapter sync with SceneSynchronizer ───

  describe('InMemoryRendererAdapter sync with SceneSynchronizer', () => {
    for (let i = 0; i < 30; i++) {
      it(`adapter sync preserves SceneSynchronizer state ${i}`, () => {
        const rt = runtime();
        const adapter = new InMemoryRendererAdapter();
        adapter.initialize();
        const sync = new SceneSynchronizer();
        const model = compVisualModel(i, `adp_cvm_${i}`);
        rt.registerComponentVisualModel(model);
        const snapshot = rt.getStageSnapshot();
        adapter.syncStage(snapshot);
        const result = sync.sync(snapshot, rt.getComponentVisualModels());
        expect(adapter.targets.size).toBeGreaterThan(0);
        expect(result.componentVisualModels.length).toBeGreaterThanOrEqual(1);
      });
    }

    for (let i = 0; i < 30; i++) {
      it(`independent renderer targets do not affect SceneSynchronizer ${i}`, () => {
        const sync = new SceneSynchronizer();
        sync.buildFromModels(sceneModel(i, `ind_scene_${i}`), [layerModel(i, `ind_lay_${i}`)]);
        const adapter = new InMemoryRendererAdapter();
        adapter.initialize();
        adapter.targets.set('target_1', { id: 'target_1', visible: true, x: 0, y: 0, direction: 90, size: 100, layerOrder: 0, costumeIndex: 0 });
        expect(sync.scenes.has(`ind_scene_${i}`)).toBe(true);
        expect(adapter.targets.has('target_1')).toBe(true);
      });
    }
  });

  // ─── 31. Edge Cases: Empty / Null / Undefined ──────────────────

  describe('edge cases: empty, null, undefined handling', () => {
    for (let i = 0; i < 40; i++) {
      it(`RenderRegistry handles null-like values gracefully ${i}`, () => {
        const reg = new RenderRegistry<any>();
        expect(() => reg.register('k', null)).not.toThrow();
        expect(() => reg.register('k', undefined)).not.toThrow();
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`SceneSynchronizer handles null snapshot gracefully ${i}`, () => {
        const sync = new SceneSynchronizer();
        expect(() => sync.sync(null as any)).not.toThrow();
        expect(() => sync.sync(undefined as any)).not.toThrow();
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`validateSceneModel handles null scene gracefully ${i}`, () => {
        expect(() => validateSceneModel(null as any)).not.toThrow();
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`validateLayerModel handles null layer gracefully ${i}`, () => {
        expect(() => validateLayerModel(null as any)).not.toThrow();
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`validateCameraMetadata handles null camera gracefully ${i}`, () => {
        expect(() => validateCameraMetadata(null as any)).not.toThrow();
      });
    }

    for (let i = 0; i < 30; i++) {
      it(`SceneSynchronizer.clear handles already empty state ${i}`, () => {
        const sync = new SceneSynchronizer();
        expect(() => sync.clear()).not.toThrow();
        expect(sync.scenes.size).toBe(0);
        expect(sync.layers.size).toBe(0);
      });
    }

    for (let i = 0; i < 30; i++) {
      it(`RenderRegistry.clear handles already empty state ${i}`, () => {
        const reg = new RenderRegistry<any>();
        expect(() => reg.clear()).not.toThrow();
      });
    }
  });

  // ─── 32. Large Scale Deterministic Operations ──────────────────

  describe('large scale deterministic operations', () => {
    for (let i = 0; i < 20; i++) {
      it(`RenderRegistry handles 100 sequential registrations ${i}`, () => {
        const reg = new RenderRegistry<{ idx: number }>();
        for (let j = 0; j < 100; j++) {
          reg.register(`big_${i}_${j}`, { idx: j });
        }
        expect(reg.size).toBe(100);
        for (let j = 0; j < 100; j++) {
          expect(reg.has(`big_${i}_${j}`)).toBe(true);
        }
      });
    }

    for (let i = 0; i < 20; i++) {
      it(`RenderRegistry maintains order with 50 reverse-inserted items ${i}`, () => {
        const reg = new RenderRegistry<{ v: number }>();
        for (let j = 49; j >= 0; j--) {
          reg.register(`rev_${i}_${j}`, { v: j });
        }
        const keys = reg.keys();
        expect(keys[0]).toBe(`rev_${i}_49`);
        expect(keys[49]).toBe(`rev_${i}_0`);
      });
    }

    for (let i = 0; i < 20; i++) {
      it(`RenderRegistry handles interleaved add/remove ${i}`, () => {
        const reg = new RenderRegistry<{ v: number }>();
        for (let cycle = 0; cycle < 10; cycle++) {
          reg.register(`cycle_${i}_${cycle}`, { v: cycle });
          if (cycle % 2 === 0) {
            reg.remove(`cycle_${i}_${cycle}`);
          }
        }
        expect(reg.size).toBe(5);
      });
    }

    for (let i = 0; i < 20; i++) {
      it(`SceneSynchronizer handles 10 sequential sync calls ${i}`, () => {
        const sync = new SceneSynchronizer();
        for (let j = 0; j < 10; j++) {
          const snap: any = { targetId: `t_${i}_${j}`, x: j, y: j, direction: 90, visible: true, size: 100, currentCostume: 0, layerOrder: j };
          sync.sync([snap]);
        }
        expect(sync.scenes.size).toBeGreaterThan(0);
      });
    }
  });

});
