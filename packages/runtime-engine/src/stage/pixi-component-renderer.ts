import { Container, Graphics, Text, Sprite, Texture } from 'pixi.js';
import { ComponentAssetDefinition, ActivityVisualizationModel, LogicStateVisualizationModel } from '../types';

/**
 * Phase 27A: Shared SVG texture cache.
 * SVG data URIs are decoded asynchronously via Image.onload → Canvas → Texture.
 * This cache stores fully-loaded textures keyed by SVG data URI.
 * In Node/test environments (no Image API), the cache stays empty and we fall back to Graphics.
 */
const svgTextureCache = new Map<string, Texture>();

/** Phase 27A: Track SVG data URIs that are currently being loaded to avoid duplicate loads. */
const pendingLoads = new Set<string>();

/**
 * Phase 27A: Asynchronously load an SVG data URI into a Pixi Texture.
 * Uses Image.onload → Canvas → Texture.from(canvas) to guarantee the image is
 * fully decoded before texture creation — fixing the black rectangle bug.
 * Returns a Promise that resolves to the Texture or null on failure.
 */
export function loadSvgTexture(svgDataUri: string, targetWidth?: number, targetHeight?: number): Promise<Texture | null> {
  if (!svgDataUri || svgDataUri.length === 0) return Promise.resolve(null);
  if (svgTextureCache.has(svgDataUri)) return Promise.resolve(svgTextureCache.get(svgDataUri)!);
  if (typeof document === 'undefined' || typeof Image === 'undefined') return Promise.resolve(null);
  if (pendingLoads.has(svgDataUri)) {
    // Already loading — poll cache until ready (max 5s)
    return new Promise((resolve) => {
      let attempts = 0;
      const interval = setInterval(() => {
        if (svgTextureCache.has(svgDataUri)) { clearInterval(interval); resolve(svgTextureCache.get(svgDataUri)!); }
        else if (++attempts > 100) { clearInterval(interval); resolve(null); }
      }, 50);
    });
  }
  pendingLoads.add(svgDataUri);
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const w = targetWidth || img.naturalWidth || img.width || 200;
          const h = targetHeight || img.naturalHeight || img.height || 200;
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const texture = Texture.from(canvas);
            svgTextureCache.set(svgDataUri, texture);
            pendingLoads.delete(svgDataUri);
            resolve(texture);
          } else {
            pendingLoads.delete(svgDataUri);
            resolve(null);
          }
        } catch {
          pendingLoads.delete(svgDataUri);
          resolve(null);
        }
      };
      img.onerror = () => { pendingLoads.delete(svgDataUri); resolve(null); };
      img.src = svgDataUri;
    } catch {
      pendingLoads.delete(svgDataUri);
      resolve(null);
    }
  });
}

/**
 * Phase 27A: Synchronous cache lookup — returns the texture only if already loaded.
 * Used during the render() hot path to avoid async work per frame.
 */
function resolveComponentTexture(svgDataUri: string): Texture | null {
  if (!svgDataUri || svgDataUri.length === 0) return null;
  return svgTextureCache.get(svgDataUri) || null;
}

/**
 * Phase 27A: Preload all component SVG textures upfront.
 * Call this once during PixiSceneRenderer.initialize() to ensure textures are
 * ready before the first render frame — eliminating flash of Graphics fallback.
 */
export async function preloadComponentTextures(assets: ComponentAssetDefinition[]): Promise<void> {
  if (typeof document === 'undefined') return;
  const promises: Promise<Texture | null>[] = [];
  for (const asset of assets) {
    if (asset.textureSvgData && asset.textureSvgData.length > 0) {
      promises.push(loadSvgTexture(asset.textureSvgData, asset.imageWidth, asset.imageHeight));
    }
  }
  await Promise.all(promises);
}

export class PixiComponentRenderer {
  public container = new Container();
  private graphics = new Graphics();
  private textureSprite: Sprite | null = null;
  private selectionGraphics = new Graphics();
  private labelText: Text | null = null;
  /** Cached pin label Text objects to avoid recreation every frame */
  private pinLabelContainer: Container | null = null;
  private pinLabelsCreated = false;
  /** Phase 19D: Track the current SVG data URI to avoid redundant texture swaps */
  private currentTextureSvgData: string | null = null;
  /** Phase 19D: Whether this renderer is using texture mode (true) or Graphics fallback (false) */
  public isUsingTexture = false;

  constructor() {
    this.container.addChild(this.graphics);
    this.container.addChild(this.selectionGraphics);
  }

  public render(
    def: ComponentAssetDefinition,
    x: number,
    y: number,
    rotation: number,
    scale: number,
    isSelected: boolean,
    isHovered: boolean,
    isEnergized?: boolean,
    activityViz?: ActivityVisualizationModel | null,
    logicViz?: LogicStateVisualizationModel | null,
  ): void {
    this.graphics.clear();
    this.selectionGraphics.clear();

    const w = def.imageWidth || 100;
    const h = def.imageHeight || 100;

    // ═══════════════════════════════════════════════════════════════
    // Phase 19D: Texture-First Rendering Path
    // When textureSvgData is available, use a high-fidelity Sprite
    // instead of procedural Graphics calls for dramatically better visuals.
    // ═══════════════════════════════════════════════════════════════
    const svgData = def.textureSvgData;
    let useTexture = false;

    if (svgData && svgData.length > 0) {
      const texture = resolveComponentTexture(svgData);
      if (texture) {
        useTexture = true;
        this.isUsingTexture = true;

        // Create sprite on first use or if texture source changed
        if (!this.textureSprite || this.currentTextureSvgData !== svgData) {
          if (this.textureSprite) {
            this.container.removeChild(this.textureSprite);
            this.textureSprite.destroy();
          }
          this.textureSprite = new Sprite(texture);
          this.textureSprite.width = w;
          this.textureSprite.height = h;
          // Insert sprite below selection graphics but above any base
          this.container.addChildAt(this.textureSprite, 0);
          this.currentTextureSvgData = svgData;
        }

        // Ensure sprite is visible and sized correctly
        this.textureSprite.visible = true;
        this.textureSprite.width = w;
        this.textureSprite.height = h;

        // Hide the procedural graphics layer when using texture
        this.graphics.visible = false;
      }
    }

    if (!useTexture) {
      // No texture available — use procedural Graphics fallback
      this.isUsingTexture = false;
      this.graphics.visible = true;
      if (this.textureSprite) {
        this.textureSprite.visible = false;
      }
    const type = def.componentType;
    if (type === 'ESP32') {
      // Draw ESP32 DevKit V1 PCB
      // Dark gradient surface
      this.graphics.roundRect(0, 0, w, h, 12);
      this.graphics.fill(0x111827);
      this.graphics.stroke({ width: 2.5, color: 0x1f2937 });

      // Silkscreen border lines
      this.graphics.roundRect(10, 10, w - 20, h - 20, 8);
      this.graphics.stroke({ width: 1, color: 0x4b5563, alpha: 0.5 });

      // Draw metallic shield module (ESP-WROOM-32)
      this.graphics.roundRect(40, 60, 240, 180, 8);
      this.graphics.fill(0xe5e7eb); // Silver/Grey metal
      this.graphics.stroke({ width: 2, color: 0x9ca3af });

      // Antenna pattern at the top edge of ESP32 module
      this.graphics.rect(50, 45, 220, 15);
      this.graphics.fill(0x111827); // PCB color under antenna
      this.graphics.moveTo(50, 52);
      this.graphics.lineTo(60, 48);
      this.graphics.lineTo(70, 52);
      this.graphics.lineTo(80, 48);
      this.graphics.lineTo(90, 52);
      this.graphics.lineTo(100, 48);
      this.graphics.lineTo(110, 52);
      this.graphics.lineTo(120, 48);
      this.graphics.lineTo(130, 52);
      this.graphics.lineTo(140, 48);
      this.graphics.lineTo(150, 52);
      this.graphics.lineTo(160, 48);
      this.graphics.lineTo(170, 52);
      this.graphics.lineTo(180, 48);
      this.graphics.lineTo(190, 52);
      this.graphics.lineTo(200, 48);
      this.graphics.lineTo(210, 52);
      this.graphics.lineTo(220, 48);
      this.graphics.lineTo(230, 52);
      this.graphics.lineTo(240, 48);
      this.graphics.lineTo(250, 52);
      this.graphics.lineTo(260, 48);
      this.graphics.lineTo(270, 52);
      this.graphics.stroke({ width: 2.5, color: 0xf59e0b }); // Golden copper antenna trace

      // Shield module markings/chip detail
      this.graphics.rect(80, 90, 160, 120);
      this.graphics.fill(0xd1d5db);
      this.graphics.stroke({ width: 1, color: 0x9ca3af });

      // Draw Main MCU Chip CP2102 details
      this.graphics.rect(130, 320, 60, 60);
      this.graphics.fill(0x1f2937); // CP2102 IC
      this.graphics.stroke({ width: 1, color: 0x4b5563 });

      // Pins extending from CP2102
      for (let i = 0; i < 4; i++) {
        this.graphics.rect(122, 325 + i * 12, 8, 4);
        this.graphics.fill(0xd1d5db); // left pins
        this.graphics.rect(190, 325 + i * 12, 8, 4);
        this.graphics.fill(0xd1d5db); // right pins
      }

      // Draw USB Port
      this.graphics.rect(125, 0, 70, 40);
      this.graphics.fill(0x9ca3af); // USB metal
      this.graphics.stroke({ width: 2, color: 0x4b5563 });
      this.graphics.rect(135, 10, 50, 20);
      this.graphics.fill(0x1f2937); // USB black insert

      // Draw Boot & EN Buttons
      // EN Button
      this.graphics.roundRect(40, 560, 35, 35, 4);
      this.graphics.fill(0x374151);
      this.graphics.stroke({ width: 1.5, color: 0x9ca3af });
      this.graphics.circle(57, 577, 10);
      this.graphics.fill(0x111827);
      // Boot Button
      this.graphics.roundRect(245, 560, 35, 35, 4);
      this.graphics.fill(0x374151);
      this.graphics.stroke({ width: 1.5, color: 0x9ca3af });
      this.graphics.circle(262, 577, 10);
      this.graphics.fill(0x111827);

      // Draw header pin rails with gold pins
      this.graphics.rect(20, 100, 30, 450);
      this.graphics.fill(0x1f2937); // Left header rail
      this.graphics.rect(270, 100, 30, 450);
      this.graphics.fill(0x1f2937); // Right header rail
      for (let i = 0; i < 15; i++) {
        this.graphics.circle(35, 120 + i * 30, 6);
        this.graphics.fill(0xf59e0b); // Gold pin center (Left)
        this.graphics.stroke({ width: 1, color: 0x78350f });
        this.graphics.circle(285, 120 + i * 30, 6);
        this.graphics.fill(0xf59e0b); // Gold pin center (Right)
        this.graphics.stroke({ width: 1, color: 0x78350f });
      }

    } else if (type === 'ARDUINO_UNO') {
      // Draw Arduino Uno R3 PCB
      // Rich dark-teal/green PCB body
      this.graphics.roundRect(0, 0, w, h, 16);
      this.graphics.fill(0x064e3b);
      this.graphics.stroke({ width: 3, color: 0x047857 });

      // Silver mounting holes with copper rings
      const holes = [{ x: 30, y: 30 }, { x: 340, y: 30 }, { x: 80, y: 320 }, { x: 420, y: 250 }];
      for (const hole of holes) {
        this.graphics.circle(hole.x, hole.y, 16);
        this.graphics.fill(0xf59e0b); // Copper ring
        this.graphics.stroke({ width: 1, color: 0xd97706 });
        this.graphics.circle(hole.x, hole.y, 8);
        this.graphics.fill(0x111827); // Inner hole
      }

      // Draw USB Port (realistic USB-B metal jack)
      this.graphics.rect(10, 40, 95, 75);
      this.graphics.fill(0xe5e7eb); // USB metal
      this.graphics.stroke({ width: 3, color: 0x9ca3af });
      this.graphics.rect(30, 55, 55, 45);
      this.graphics.fill(0xd1d5db);
      this.graphics.rect(40, 65, 35, 25);
      this.graphics.fill(0x1f2937); // USB center

      // Draw DC Jack (black cylinder barrel)
      this.graphics.rect(10, 230, 110, 85);
      this.graphics.fill(0x1f2937); // DC jack body
      this.graphics.stroke({ width: 2, color: 0x374151 });
      this.graphics.rect(35, 245, 85, 55);
      this.graphics.fill(0x111827); // Depth inner barrel
      this.graphics.circle(75, 272, 8);
      this.graphics.fill(0xd1d5db); // Center metal pin

      // Draw Atmega328P DIP chip
      this.graphics.rect(200, 180, 200, 48);
      this.graphics.fill(0x1f2937); // Chip socket
      this.graphics.rect(205, 184, 190, 40);
      this.graphics.fill(0x111827); // Chip body
      this.graphics.stroke({ width: 1.5, color: 0x374151 });
      
      // Draw ATmega328P silver legs
      for (let i = 0; i < 14; i++) {
        this.graphics.rect(212 + i * 13, 177, 5, 7);
        this.graphics.fill(0xe5e7eb); // Top legs
        this.graphics.rect(212 + i * 13, 224, 5, 7);
        this.graphics.fill(0xe5e7eb); // Bottom legs
      }
      // Chip notch
      this.graphics.circle(205, 204, 8);
      this.graphics.fill(0x1f2937);

      // Draw Voltage Regulator (TO-220 tab)
      this.graphics.rect(45, 140, 45, 45);
      this.graphics.fill(0x1f2937);
      this.graphics.rect(50, 130, 35, 10);
      this.graphics.fill(0x9ca3af); // Silver heatsink tab

      // Draw Reset Button
      this.graphics.roundRect(400, 50, 35, 35, 4);
      this.graphics.fill(0xd1d5db); // Button base
      this.graphics.stroke({ width: 1.5, color: 0x9ca3af });
      this.graphics.circle(417, 67, 10);
      this.graphics.fill(0xef4444); // Red button cap

      // Draw Header Rails with pin-labels
      this.graphics.rect(170, 20, 280, 25); // Top digital headers
      this.graphics.fill(0x1f2937);
      this.graphics.rect(190, 315, 230, 25); // Bottom power headers
      this.graphics.fill(0x1f2937);

      // Draw gold connector pin contacts
      for (let i = 0; i < 18; i++) {
        this.graphics.circle(180 + i * 15, 32, 4);
        this.graphics.fill(0xf59e0b); // Gold contacts (Top)
      }
      for (let i = 0; i < 15; i++) {
        this.graphics.circle(200 + i * 15, 327, 4);
        this.graphics.fill(0xf59e0b); // Gold contacts (Bottom)
      }

    } else if (type === 'ARDUINO_NANO') {
      // Draw Arduino Nano PCB
      // Blue gradient body
      this.graphics.roundRect(0, 0, w, h, 10);
      this.graphics.fill(0x1e3a8a);
      this.graphics.stroke({ width: 2, color: 0x1d4ed8 });

      // Mini-USB Port
      this.graphics.rect(55, 0, 70, 40);
      this.graphics.fill(0xd1d5db); // USB metal casing
      this.graphics.stroke({ width: 2, color: 0x9ca3af });

      // Main ATmega328P QFP chip
      this.graphics.rect(65, 170, 50, 50);
      this.graphics.fill(0x1f2937); // Black square chip
      this.graphics.stroke({ width: 1.5, color: 0x4b5563 });

      // Tiny pins around the square MCU chip
      for (let i = 0; i < 5; i++) {
        this.graphics.rect(60, 175 + i * 8, 5, 2);
        this.graphics.fill(0xe5e7eb);
        this.graphics.rect(115, 175 + i * 8, 5, 2);
        this.graphics.fill(0xe5e7eb);
        this.graphics.rect(75 + i * 8, 165, 2, 5);
        this.graphics.fill(0xe5e7eb);
        this.graphics.rect(75 + i * 8, 220, 2, 5);
        this.graphics.fill(0xe5e7eb);
      }

      // Draw Reset Button
      this.graphics.roundRect(75, 320, 30, 30, 4);
      this.graphics.fill(0xd1d5db);
      this.graphics.circle(90, 335, 8);
      this.graphics.fill(0xe5e7eb);

      // Left & Right pin headers
      this.graphics.rect(10, 80, 20, 330);
      this.graphics.fill(0x111827);
      this.graphics.rect(150, 80, 20, 330);
      this.graphics.fill(0x111827);
      for (let i = 0; i < 15; i++) {
        this.graphics.circle(20, 95 + i * 22, 4);
        this.graphics.fill(0xf59e0b);
        this.graphics.circle(160, 95 + i * 22, 4);
        this.graphics.fill(0xf59e0b);
      }

    } else if (type === 'ULTRASONIC') {
      // HC-SR04
      this.graphics.roundRect(0, 0, w, h, 10);
      this.graphics.fill(0x1d4ed8); // Blue PCB
      this.graphics.stroke({ width: 2, color: 0x1e40af });

      // Draw Transducer T
      this.graphics.circle(65, 80, 38);
      this.graphics.fill(0xd1d5db); // Silver casing
      this.graphics.stroke({ width: 2, color: 0x6b7280 });
      this.graphics.circle(65, 80, 30);
      this.graphics.fill(0x374151); // Black mesh center

      // Draw Transducer R
      this.graphics.circle(195, 80, 38);
      this.graphics.fill(0xd1d5db);
      this.graphics.stroke({ width: 2, color: 0x6b7280 });
      this.graphics.circle(195, 80, 30);
      this.graphics.fill(0x374151);

    } else if (type === 'LED') {
      // Derive live brightness from activity visualization model (Phase 20C)
      const liveBrightness = activityViz?.brightness ?? (isEnergized ? 1.0 : 0);
      const isLit = liveBrightness > 0.01 || isEnergized;

      // Draw LED Anode/Cathode legs extending down
      this.graphics.moveTo(34, 70);
      this.graphics.lineTo(34, 130);
      this.graphics.stroke({ width: 2.5, color: 0x9ca3af }); // Anode leg

      this.graphics.moveTo(46, 70);
      this.graphics.lineTo(46, 130);
      this.graphics.stroke({ width: 2.5, color: 0x9ca3af }); // Cathode leg

      // LED plastic body — alpha reflects live brightness
      const bodyAlpha = 0.4 + liveBrightness * 0.6;
      this.graphics.circle(40, 50, 25);
      this.graphics.fill({ color: 0xef4444, alpha: bodyAlpha });
      this.graphics.stroke({ width: 1.5, color: 0xfca5a5 });

      // Cathode flat edge
      this.graphics.moveTo(58, 65);
      this.graphics.lineTo(58, 45);
      this.graphics.stroke({ width: 2, color: 0xef4444 });

      // Energized glow — scales with live brightness
      if (isLit) {
        const glowAlpha = Math.max(0.15, Math.min(0.85, liveBrightness * 0.7));
        const glowRadius = 35 + liveBrightness * 20;
        this.graphics.circle(40, 50, glowRadius);
        this.graphics.fill({ color: 0xfca5a5, alpha: glowAlpha }); // Red glow halo

        // Outer diffuse ring for PWM/high brightness
        if (liveBrightness > 0.5) {
          this.graphics.circle(40, 50, glowRadius + 15);
          this.graphics.fill({ color: 0xfee2e2, alpha: glowAlpha * 0.3 });
        }
      }

    } else if (type === 'RESISTOR') {
      // Draw metal leads
      this.graphics.moveTo(0, 20);
      this.graphics.lineTo(220, 20);
      this.graphics.stroke({ width: 2, color: 0xd1d5db });

      // Ceramic body
      this.graphics.roundRect(40, 8, 140, 24, 6);
      this.graphics.fill(0xfef3c7); // Tan body
      this.graphics.stroke({ width: 1.5, color: 0xd97706 });

      // Color bands (220 Ohm: Red, Red, Brown, Gold)
      this.graphics.rect(65, 8, 8, 24);
      this.graphics.fill(0xef4444); // Red
      
      this.graphics.rect(85, 8, 8, 24);
      this.graphics.fill(0xef4444); // Red
      
      this.graphics.rect(105, 8, 8, 24);
      this.graphics.fill(0x78350f); // Brown
      
      this.graphics.rect(145, 8, 8, 24);
      this.graphics.fill(0xf59e0b); // Gold

    } else if (type === 'SERVO') {
      // Draw SG90 body
      this.graphics.roundRect(0, 0, w, h, 10);
      this.graphics.fill(0x3b82f6); // Blue housing
      this.graphics.stroke({ width: 2, color: 0x1d4ed8 });

      // Mounting tabs
      this.graphics.roundRect(-15, 60, 30, 15, 3);
      this.graphics.fill(0x3b82f6);
      this.graphics.roundRect(w - 15, 60, 30, 15, 3);
      this.graphics.fill(0x3b82f6);

      // Servo shaft circle
      this.graphics.circle(100, 70, 25);
      this.graphics.fill(0xffffff);
      this.graphics.stroke({ width: 1.5, color: 0x9ca3af });

      // Phase 27A: Rotatable horn (arm) based on live servo angle
      const servoAngle = activityViz?.servoAngleDegrees ?? 90;
      const hornRad = (servoAngle - 90) * Math.PI / 180;
      const hornLen = 45;
      const hornEndX = 100 + Math.cos(hornRad) * hornLen;
      const hornEndY = 70 + Math.sin(hornRad) * hornLen;
      this.graphics.moveTo(100, 70);
      this.graphics.lineTo(hornEndX, hornEndY);
      this.graphics.stroke({ width: 6, color: 0xf3f4f6 });
      // Horn tip circle
      this.graphics.circle(hornEndX, hornEndY, 5);
      this.graphics.fill(0xf3f4f6);
      // Center pivot
      this.graphics.circle(100, 70, 6);
      this.graphics.fill(0x9ca3af);

      // Wire cable
      this.graphics.moveTo(80, h);
      this.graphics.lineTo(80, h + 20);
      this.graphics.stroke({ width: 3, color: 0xf97316 }); // Orange/signal
      this.graphics.moveTo(100, h);
      this.graphics.lineTo(100, h + 20);
      this.graphics.stroke({ width: 3, color: 0xef4444 }); // Red/VCC
      this.graphics.moveTo(120, h);
      this.graphics.lineTo(120, h + 20);
      this.graphics.stroke({ width: 3, color: 0x78350f }); // Brown/GND

    } else if (type === 'OLED') {
      // Draw OLED module PCB
      this.graphics.roundRect(0, 0, w, h, 8);
      this.graphics.fill(0x111827); // Black board
      this.graphics.stroke({ width: 2, color: 0x1e3a8a }); // Blue board border

      // FPC ribbon connector
      this.graphics.rect(20, 30, 120, 8);
      this.graphics.fill(0x374151);

      // OLED glass panel
      this.graphics.roundRect(10, 40, 140, 110, 4);
      this.graphics.fill(0x030712); // Deep black screen
      this.graphics.stroke({ width: 1.5, color: 0x4b5563 });

      // Phase 27A: Render display text if active
      const oledActive = activityViz?.isActive;
      if (oledActive && typeof document !== 'undefined') {
        const displayText = activityViz?.displayText ?? 'SSD1306';
        const lines = displayText.split('\n').slice(0, 4);
        for (let i = 0; i < lines.length; i++) {
          if (!this.labelText || i > 0) {
            // Draw text pixels as small rectangles simulating OLED chars
            const textY = 50 + i * 22;
            for (let c = 0; c < Math.min(lines[i].length, 16); c++) {
              // Simple pixel-font simulation: small filled rects for each char
              this.graphics.rect(18 + c * 8, textY, 6, 12);
              this.graphics.fill({ color: 0x3b82f6, alpha: 0.9 }); // Blue OLED pixels
            }
          }
        }
      } else {
        // Static display preview text
        this.graphics.rect(18, 55, 50, 8);
        this.graphics.fill({ color: 0x3b82f6, alpha: 0.4 });
        this.graphics.rect(18, 70, 80, 8);
        this.graphics.fill({ color: 0x3b82f6, alpha: 0.3 });
        this.graphics.rect(18, 85, 40, 8);
        this.graphics.fill({ color: 0x3b82f6, alpha: 0.2 });
      }

      // Connection pins at bottom
      this.graphics.rect(30, h - 18, 100, 15);
      this.graphics.fill(0x1f2937);
      // 4 gold I2C pins
      for (let i = 0; i < 4; i++) {
        this.graphics.circle(50 + i * 20, h - 10, 4);
        this.graphics.fill(0xf59e0b);
        this.graphics.stroke({ width: 1, color: 0x78350f });
      }

    } else if (type === 'LCD') {
      // Draw LCD module
      this.graphics.roundRect(0, 0, w, h, 12);
      this.graphics.fill(0x065f46); // Green PCB
      this.graphics.stroke({ width: 3, color: 0x047857 });

      // Metal bezel frame
      this.graphics.roundRect(30, 40, 360, 120, 6);
      this.graphics.fill(0x1f2937); // Dark metal frame

      // Screen liquid crystal background
      this.graphics.rect(45, 55, 330, 90);
      this.graphics.fill(0x059669); // Green backlit screen

      // Phase 27A: Render LCD character grid
      const lcdActive = activityViz?.isActive;
      if (lcdActive) {
        const lcdText = activityViz?.displayText ?? 'Hello, World!';
        const lcdLines = lcdText.split('\n').slice(0, 2);
        // 16x2 character cells
        for (let row = 0; row < 2; row++) {
          const line = lcdLines[row] ?? '';
          for (let col = 0; col < 16; col++) {
            const charX = 52 + col * 20;
            const charY = 62 + row * 38;
            // Character cell background
            this.graphics.rect(charX, charY, 16, 28);
            this.graphics.fill({ color: 0x047857, alpha: 0.3 });
            // If char exists, draw a filled pixel block
            if (col < line.length) {
              this.graphics.rect(charX + 2, charY + 2, 12, 24);
              this.graphics.fill(0x111827); // Dark character pixels
            }
          }
        }
      } else {
        // Static character cell hints
        for (let row = 0; row < 2; row++) {
          for (let col = 0; col < 16; col++) {
            this.graphics.rect(52 + col * 20, 62 + row * 38, 16, 28);
            this.graphics.fill({ color: 0x047857, alpha: 0.15 });
          }
        }
      }

      // I2C adapter module on back
      this.graphics.roundRect(140, h - 25, 140, 22, 4);
      this.graphics.fill(0x111827);
      this.graphics.stroke({ width: 1, color: 0x374151 });

      // Display pins (16-pin header)
      this.graphics.rect(40, 10, 300, 12);
      this.graphics.fill(0xd1d5db);
      for (let i = 0; i < 16; i++) {
        this.graphics.circle(50 + i * 19, 16, 3);
        this.graphics.fill(0xf59e0b);
      }

    } else if (type === 'RELAY') {
      // Relay module
      this.graphics.roundRect(0, 0, w, h, 10);
      this.graphics.fill(0x111827);
      this.graphics.stroke({ width: 2, color: 0x374151 });

      // Blue relay block
      this.graphics.roundRect(30, 50, 120, 120, 6);
      this.graphics.fill(0x2563eb); // Blue block
      this.graphics.stroke({ width: 1.5, color: 0x1d4ed8 });

      // Terminal blocks
      this.graphics.rect(40, 10, 100, 30);
      this.graphics.fill(0x059669); // Green terminal

    } else if (type === 'IR_SENSOR') {
      // IR Obstacle Sensor Module
      this.graphics.roundRect(0, 0, w, h, 4);
      this.graphics.fill(0x1e3a8a); // Blue PCB
      this.graphics.stroke({ width: 1.5, color: 0x1d4ed8 });
      // IR LED (white/clear)
      this.graphics.circle(12, 10, 5);
      this.graphics.fill(0xfef3c7);
      this.graphics.stroke({ width: 1, color: 0xd97706 });
      // IR receiver (dark)
      this.graphics.circle(38, 10, 5);
      this.graphics.fill(0x1f2937);
      this.graphics.stroke({ width: 1, color: 0x374151 });
      // Potentiometer trim
      this.graphics.circle(25, 22, 4);
      this.graphics.fill(0x3b82f6);

    } else if (type === 'MQ2_SENSOR') {
      // MQ-2 Gas Sensor
      this.graphics.roundRect(0, 0, w, h, 6);
      this.graphics.fill(0x991b1b); // Red PCB
      this.graphics.stroke({ width: 1.5, color: 0xb91c1c });
      // Metal mesh sensor can
      this.graphics.circle(w / 2, w / 2 - 2, 14);
      this.graphics.fill(0xd1d5db);
      this.graphics.stroke({ width: 1.5, color: 0x9ca3af });
      // Mesh pattern
      this.graphics.circle(w / 2, w / 2 - 2, 10);
      this.graphics.fill(0x6b7280);

    } else if (type === 'DHT11') {
      // DHT11 Temp & Humidity
      this.graphics.roundRect(0, 0, w, h, 4);
      this.graphics.fill(0x2563eb); // Blue body
      this.graphics.stroke({ width: 1.5, color: 0x1d4ed8 });
      // Vent slots
      for (let i = 0; i < 4; i++) {
        this.graphics.rect(8, 8 + i * 6, 14, 2);
        this.graphics.fill(0x1e40af);
      }

    } else if (type === 'BUZZER') {
      // Passive Buzzer
      this.graphics.circle(w / 2, w / 2, w / 2);
      this.graphics.fill(0x111827); // Black body
      this.graphics.stroke({ width: 1.5, color: 0x374151 });
      // Top sound hole
      this.graphics.circle(w / 2, w / 2, 4);
      this.graphics.fill(0x374151);
      // + marking
      this.graphics.rect(w / 2 - 4, 3, 8, 2);
      this.graphics.fill(0xd1d5db);
      this.graphics.rect(w / 2 - 1, 0, 2, 8);
      this.graphics.fill(0xd1d5db);

    } else if (type === 'POTENTIOMETER') {
      // 10K Rotary Potentiometer
      this.graphics.roundRect(0, 0, w, h, 4);
      this.graphics.fill(0x1e3a8a); // Blue PCB
      this.graphics.stroke({ width: 1, color: 0x1d4ed8 });
      // Knob body
      this.graphics.circle(w / 2, h / 2 - 2, 10);
      this.graphics.fill(0x374151);
      this.graphics.stroke({ width: 1, color: 0x4b5563 });
      // Knob indicator
      this.graphics.moveTo(w / 2, h / 2 - 2);
      this.graphics.lineTo(w / 2, h / 2 - 11);
      this.graphics.stroke({ width: 2, color: 0xffffff });

    } else if (type === 'PUSH_BUTTON') {
      // Tactile Push Button
      this.graphics.rect(0, 0, w, h);
      this.graphics.fill(0x1f2937); // Dark body
      this.graphics.stroke({ width: 1, color: 0x374151 });
      // Button cap
      this.graphics.circle(w / 2, h / 2, 6);
      this.graphics.fill(0xe5e7eb);
      this.graphics.stroke({ width: 1, color: 0x9ca3af });
      // 4 corner pins
      this.graphics.circle(3, 3, 2);
      this.graphics.fill(0xd1d5db);
      this.graphics.circle(w - 3, 3, 2);
      this.graphics.fill(0xd1d5db);
      this.graphics.circle(3, h - 3, 2);
      this.graphics.fill(0xd1d5db);
      this.graphics.circle(w - 3, h - 3, 2);
      this.graphics.fill(0xd1d5db);

    } else {
      // Fallback — generic component body
      this.graphics.roundRect(0, 0, w, h, 6);
      this.graphics.fill(0x4b5563);
      this.graphics.stroke({ width: 1.5, color: 0x6b7280 });
    }

    // Phase 20C: Logic-state glow overlay (drawn before selection outline)
    if (logicViz && logicViz.glowAlpha > 0.05) {
      const glowA = Math.min(1, logicViz.glowAlpha);
      this.graphics.roundRect(-8, -8, w + 16, h + 16, 10);
      this.graphics.stroke({ width: 4, color: logicViz.glowColor, alpha: glowA });
    }

    // Render selection/hover outline (on graphics layer in fallback mode)
    if (isSelected) {
      this.graphics.rect(-4, -4, w + 8, h + 8);
      this.graphics.stroke({ width: 3, color: 0x3b82f6 }); // Highlight blue
    } else if (isHovered) {
      this.graphics.rect(-2, -2, w + 4, h + 4);
      this.graphics.stroke({ width: 2, color: 0x60a5fa }); // Hover blue
    }
    } // End of if (!useTexture) — Graphics fallback block

    // ═══════════════════════════════════════════════════════════════
    // Phase 19D: Selection/Hover/Glow Overlays (rendered on top in both modes)
    // When using texture mode, overlays must use selectionGraphics layer
    // since the main graphics layer is hidden.
    // ═══════════════════════════════════════════════════════════════
    if (useTexture) {
      // Phase 20C: Logic-state glow overlay for texture mode
      if (logicViz && logicViz.glowAlpha > 0.05) {
        const glowA = Math.min(1, logicViz.glowAlpha);
        this.selectionGraphics.roundRect(-8, -8, w + 16, h + 16, 10);
        this.selectionGraphics.stroke({ width: 4, color: logicViz.glowColor, alpha: glowA });
      }

      // Selection/hover outline for texture mode
      if (isSelected) {
        this.selectionGraphics.rect(-4, -4, w + 8, h + 8);
        this.selectionGraphics.stroke({ width: 3, color: 0x3b82f6 });
      } else if (isHovered) {
        this.selectionGraphics.rect(-2, -2, w + 4, h + 4);
        this.selectionGraphics.stroke({ width: 2, color: 0x60a5fa });
      }

      // LED glow overlay in texture mode (energized state)
      if (def.componentType === 'LED') {
        const liveBrightness = activityViz?.brightness ?? (isEnergized ? 1.0 : 0);
        const isLit = liveBrightness > 0.01 || isEnergized;
        if (isLit) {
          const glowAlpha = Math.max(0.15, Math.min(0.85, liveBrightness * 0.7));
          const glowRadius = 35 + liveBrightness * 20;
          this.selectionGraphics.circle(40, 50, glowRadius);
          this.selectionGraphics.fill({ color: 0xfca5a5, alpha: glowAlpha });
          if (liveBrightness > 0.5) {
            this.selectionGraphics.circle(40, 50, glowRadius + 15);
            this.selectionGraphics.fill({ color: 0xfee2e2, alpha: glowAlpha * 0.3 });
          }
        }
      }
    }

    // Draw display name text (if document environment exists, cached to avoid memory leaks)
    if (typeof document !== 'undefined' && def.displayName) {
      if (!this.labelText) {
        this.labelText = new Text({
          text: def.displayName,
          style: { fontFamily: 'sans-serif', fontSize: 10, fill: 0xffffff }
        });
        this.container.addChild(this.labelText);
      }
      this.labelText.x = 10;
      this.labelText.y = h - 20;
    }

    // Set position, rotation, scale
    this.container.x = x;
    this.container.y = y;
    this.container.rotation = rotation;
    this.container.scale.set(scale);
  }

  /**
   * Render pin name labels next to each pin on the component.
   * Labels are cached after first creation to avoid per-frame Text allocation.
   */
  public renderPinLabels(pins: Array<{ name: string; pixelX: number; pixelY: number; signalType?: string }>, componentWidth: number): void {
    if (typeof document === 'undefined' || !pins || pins.length === 0) return;

    if (!this.pinLabelContainer) {
      this.pinLabelContainer = new Container();
      this.container.addChild(this.pinLabelContainer);
    }

    if (this.pinLabelsCreated) return; // Already created, no need to rebuild

    // Clear any existing labels
    for (let i = this.pinLabelContainer.children.length - 1; i >= 0; i--) {
      const child = this.pinLabelContainer.children[i];
      this.pinLabelContainer.removeChildAt(i);
      child.destroy();
    }

    const centerX = componentWidth / 2;

    for (const pin of pins) {
      // Color-code by signal type
      let color = 0xd1d5db; // Default grey
      const st = (pin.signalType || '').toUpperCase();
      if (st === 'POWER') color = 0xef4444;
      else if (st === 'GND') color = 0x60a5fa;
      else if (st === 'DIGITAL') color = 0x34d399;
      else if (st === 'ANALOG') color = 0xfbbf24;
      else if (st === 'RESET') color = 0xc084fc;

      const isLeftPin = pin.pixelX < centerX;

      const txt = new Text({
        text: pin.name,
        style: {
          fontFamily: 'monospace',
          fontSize: 8,
          fill: color,
          fontWeight: 'bold',
        },
      });

      if (isLeftPin) {
        // Left-side pin: label to the left of the pin
        txt.anchor = { x: 1, y: 0.5 };
        txt.x = pin.pixelX - 10;
      } else {
        // Right-side pin: label to the right of the pin
        txt.anchor = { x: 0, y: 0.5 };
        txt.x = pin.pixelX + 10;
      }
      txt.y = pin.pixelY;

      this.pinLabelContainer.addChild(txt);
    }

    this.pinLabelsCreated = true;
  }

  /**
   * Phase 19D: Destroy this renderer and clean up resources.
   * Removes texture sprites and releases references.
   */
  public destroy(): void {
    if (this.textureSprite) {
      this.container.removeChild(this.textureSprite);
      this.textureSprite.destroy();
      this.textureSprite = null;
    }
    if (this.labelText) {
      this.container.removeChild(this.labelText);
      this.labelText.destroy();
      this.labelText = null;
    }
    if (this.pinLabelContainer) {
      this.pinLabelContainer.destroy({ children: true });
      this.pinLabelContainer = null;
      this.pinLabelsCreated = false;
    }
    this.graphics.destroy();
    this.selectionGraphics.destroy();
    this.container.destroy();
    this.currentTextureSvgData = null;
  }

  /**
   * Phase 19D: Get whether this renderer is currently using texture-based rendering.
   */
  public getTextureMode(): boolean {
    return this.isUsingTexture;
  }
}

/**
 * Phase 19D: Clear the global SVG texture cache.
 * Call this when the application is shutting down or when textures need to be refreshed.
 */
export function clearSvgTextureCache(): void {
  svgTextureCache.clear();
}

/**
 * Phase 19D: Get the current size of the SVG texture cache.
 */
export function getSvgTextureCacheSize(): number {
  return svgTextureCache.size;
}
