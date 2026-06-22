// Stage Renderer
import { Application, Sprite as PixiSprite, Graphics, Text, TextStyle, Container, Texture, Assets } from 'pixi.js';
import spriteStore from './SpriteStore.js';

export class StageRenderer {
  constructor(containerEl) {
    this.containerEl = containerEl;
    this.width = 480;
    this.height = 360;
    this.sprites = [];
    this.backdrop = '#ffffff';

    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;

    this._onSpriteClick = null;
    this._onStageClick = null;

    this.app = null;
    this._pixiSprites = new Map();       
    this._penContainer = null;           
    this._spriteContainer = null;        
    this._bubbleContainer = null;        
    this._bubbleObjects = new Map();     
    this._penGraphics = null;
    this._costumeCanvasCache = new Map();
  }

  async init() {
    this.app = new Application();
    await this.app.init({
      width: this.width,
      height: this.height,
      background: this.backdrop,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    this.containerEl.appendChild(this.app.canvas);
    this.app.canvas.style.width = '100%';
    this.app.canvas.style.height = '100%';

    this._bgSprite = new PixiSprite();
    this._bgSprite.width = this.width;
    this._bgSprite.height = this.height;
    this._bgSprite.zIndex = -1;
    this.app.stage.addChild(this._bgSprite);

    this._penContainer = new Container();
    this._spriteContainer = new Container();
    this._bubbleContainer = new Container();
    this.app.stage.addChild(this._penContainer);
    this.app.stage.addChild(this._spriteContainer);
    this.app.stage.addChild(this._bubbleContainer);

    this._penGraphics = new Graphics();
    this._penContainer.addChild(this._penGraphics);

    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;

    this.app.stage.on('pointermove', (e) => {
      const pos = e.global;
      this.mouseX = Math.round(pos.x - 240);
      this.mouseY = Math.round(180 - pos.y);
    });

    this.app.stage.on('pointerdown', () => { this.mouseDown = true; });
    this.app.stage.on('pointerup', () => { this.mouseDown = false; });

    this.app.stage.on('pointerdown', (e) => {
      if (e.target === this.app.stage && this._onStageClick) {
        this._onStageClick();
      }
    });

    spriteStore.on((event, data) => {
      if (event === 'backdrop') this._applyBackdrop(data);
    });

    this.app.ticker.add(() => this._syncFrame());
  }

  _applyBackdrop(bd) {
    if (!bd) return;

    if (bd.type === 'color') {
      this.app.renderer.background.color = bd.value;
      this._bgSprite.visible = false;
    } else if (bd.type === 'gradient') {
      this._bgSprite.visible = true;
      const canvas = document.createElement('canvas');
      canvas.width = this.width;
      canvas.height = this.height;
      const ctx = canvas.getContext('2d');

      // Parse gradient string: e.g. "linear-gradient(180deg, #87CEEB 0%, #E0F7FA 100%)"
      const grad = ctx.createLinearGradient(0, 0, 0, this.height);
      const stopsStr = bd.value.replace(/linear-gradient\s*\(\s*180deg\s*,\s*/i, '').replace(/\s*\)$/, '');
      const stops = stopsStr.split(/,\s*/);
      for (const stop of stops) {
        const parts = stop.trim().split(/\s+/);
        if (parts.length >= 2) {
          const color = parts[0];
          const offset = parseFloat(parts[1]) / 100;
          if (!isNaN(offset)) {
            grad.addColorStop(offset, color);
          }
        }
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.width, this.height);

      const tex = Texture.from(canvas);
      this._bgSprite.texture = tex;
      this._bgSprite.width = this.width;
      this._bgSprite.height = this.height;
    } else if (bd.type === 'svg' || bd.type === 'image') {
      this._bgSprite.visible = true;
      const img = new Image();
      img.onload = () => {
        if (this._bgSprite.texture) {
          this._bgSprite.texture.destroy(true);
        }
        const tex = Texture.from(img);
        this._bgSprite.texture = tex;
        this._bgSprite.width = this.width;
        this._bgSprite.height = this.height;
      };
      img.onerror = (err) => {
        console.error('[StageRenderer] Failed to load backdrop image:', bd.value, err);
      };
      img.src = bd.value;
    }
  }

  setSprites(sprites) {
    this.sprites = sprites;
  }

  start() {
    
  }

  stop() {
    if (this.app) this.app.ticker.stop();
  }

  _syncFrame() {
    this._syncPenTrails();
    this._syncSpriteDisplayObjects();
    this._syncBubbles();
  }

  _syncPenTrails() {
    const g = this._penGraphics;
    g.clear();

    for (const sprite of this.sprites) {
      for (const trail of sprite.penTrails) {
        const p1 = this._toPixi(trail.x1, trail.y1);
        const p2 = this._toPixi(trail.x2, trail.y2);
        g.moveTo(p1.x, p1.y);
        g.lineTo(p2.x, p2.y);
        g.stroke({ width: trail.size, color: trail.color });
      }
    }
  }

  _syncSpriteDisplayObjects() {
    const activeIds = new Set();

    for (let i = 0; i < this.sprites.length; i++) {
      const sprite = this.sprites[i];
      activeIds.add(sprite.id);

      let pixiSprite = this._pixiSprites.get(sprite.id);

      if (!pixiSprite) {
        
        pixiSprite = new PixiSprite();
        pixiSprite.anchor.set(0.5);
        pixiSprite.eventMode = 'static';
        pixiSprite.cursor = 'pointer';
        pixiSprite._spriteRef = sprite;
        pixiSprite._dragging = false;

        pixiSprite.on('pointerdown', (e) => {
          e.stopPropagation();
          pixiSprite._dragging = true;
          pixiSprite._dragOffset = {
            x: e.global.x - pixiSprite.x,
            y: e.global.y - pixiSprite.y,
          };
          pixiSprite.alpha = 0.85;
          if (this._onSpriteClick) this._onSpriteClick(sprite);
        });

        pixiSprite.on('globalpointermove', (e) => {
          if (!pixiSprite._dragging) return;
          const newX = e.global.x - pixiSprite._dragOffset.x;
          const newY = e.global.y - pixiSprite._dragOffset.y;
          pixiSprite.x = newX;
          pixiSprite.y = newY;
          
          sprite.x = Math.round(newX - 240);
          sprite.y = Math.round(180 - newY);
          
          spriteStore._emit('update', sprite);
        });

        const endDrag = () => {
          if (!pixiSprite._dragging) return;
          pixiSprite._dragging = false;
          pixiSprite.alpha = sprite.opacity;
          
          spriteStore._emit('update', sprite);
        };
        pixiSprite.on('pointerup', endDrag);
        pixiSprite.on('pointerupoutside', endDrag);

        this._spriteContainer.addChild(pixiSprite);
        this._pixiSprites.set(sprite.id, pixiSprite);
      }

      const costumeImg = sprite.getCostumeImage();
      const costume = sprite.getCurrentCostume();
      const cacheKey = `${sprite.id}_${costume?.name || 'default'}`;
      if (costumeImg && costumeImg.complete && costumeImg.naturalWidth > 0) {
        let tex = this._costumeCanvasCache.get(cacheKey);
        if (!tex) {
          const canvas = document.createElement('canvas');
          canvas.width = costumeImg.naturalWidth;
          canvas.height = costumeImg.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(costumeImg, 0, 0);
          tex = Texture.from(canvas);
          this._costumeCanvasCache.set(cacheKey, tex);
        }
        if (pixiSprite.texture !== tex) {
          pixiSprite.texture = tex;
        }
      }

      if (!pixiSprite._dragging) {
        const pos = this._toPixi(sprite.x, sprite.y);
        pixiSprite.x = pos.x;
        pixiSprite.y = pos.y;
      }

      const scale = sprite.size / 100;
      if (sprite.rotationStyle === 'don\'t rotate') {
        pixiSprite.rotation = 0;
        pixiSprite.scale.set(scale);
      } else if (sprite.rotationStyle === 'left-right') {
        pixiSprite.rotation = 0;
        const facingRight = sprite.direction > 0 && sprite.direction < 180;
        pixiSprite.scale.set(facingRight ? scale : -scale, scale);
      } else {
        pixiSprite.rotation = ((sprite.direction - 90) * Math.PI) / 180;
        pixiSprite.scale.set(scale);
      }

      pixiSprite.visible = sprite.visible && (sprite.id === spriteStore.selectedSpriteId);
      pixiSprite.alpha = sprite.opacity;

      pixiSprite.zIndex = i;
    }

    for (const [id, pixiSprite] of this._pixiSprites) {
      if (!activeIds.has(id)) {
        this._spriteContainer.removeChild(pixiSprite);
        pixiSprite.destroy();
        this._pixiSprites.delete(id);
        for (const key of this._costumeCanvasCache.keys()) {
          if (key.startsWith(`${id}_`)) {
            this._costumeCanvasCache.delete(key);
          }
        }
      }
    }

    this._spriteContainer.sortChildren();
  }

  _syncBubbles() {
    const activeIds = new Set();

    for (const sprite of this.sprites) {
      if (!sprite.visible || !sprite.sayBubble) {
        
        if (this._bubbleObjects.has(sprite.id)) {
          this._removeBubble(sprite.id);
        }
        continue;
      }

      if (sprite.sayBubble.expiresAt && Date.now() > sprite.sayBubble.expiresAt) {
        sprite.clearBubble();
        this._removeBubble(sprite.id);
        continue;
      }

      activeIds.add(sprite.id);
      const bubble = sprite.sayBubble;
      const pos = this._toPixi(sprite.x, sprite.y);

      let obj = this._bubbleObjects.get(sprite.id);

      if (!obj || obj._lastText !== bubble.text || obj._lastType !== bubble.type) {
        
        this._removeBubble(sprite.id);

        const style = new TextStyle({
          fontFamily: 'Inter, sans-serif',
          fontSize: 12,
          fill: '#333333',
        });
        const textObj = new Text({ text: bubble.text, style });
        const padding = 10;
        const bubbleW = textObj.width + padding * 2;
        const bubbleH = 28;

        const bg = new Graphics();
        bg.roundRect(0, 0, bubbleW, bubbleH, 8);
        bg.fill('#ffffff');
        bg.stroke({ width: 1.5, color: '#c4c4c4' });

        const tail = new Graphics();
        if (bubble.type === 'think') {
          tail.circle(8, bubbleH + 6, 4);
          tail.fill('#ffffff');
          tail.stroke({ width: 1.5, color: '#c4c4c4' });
          tail.circle(3, bubbleH + 14, 2.5);
          tail.fill('#ffffff');
          tail.stroke({ width: 1.5, color: '#c4c4c4' });
        } else {
          tail.moveTo(8, bubbleH);
          tail.lineTo(4, bubbleH + 10);
          tail.lineTo(18, bubbleH);
          tail.closePath();
          tail.fill('#ffffff');
          tail.stroke({ width: 1.5, color: '#c4c4c4' });
        }

        textObj.x = padding;
        textObj.y = (bubbleH - textObj.height) / 2;

        const container = new Container();
        container.addChild(bg, tail, textObj);

        this._bubbleContainer.addChild(container);
        obj = { container, _lastText: bubble.text, _lastType: bubble.type };
        this._bubbleObjects.set(sprite.id, obj);
      }

      obj.container.x = pos.x + 20;
      obj.container.y = pos.y - 50;
    }

    for (const [id] of this._bubbleObjects) {
      if (!this.sprites.find(s => s.id === id)) {
        this._removeBubble(id);
      }
    }
  }

  _removeBubble(spriteId) {
    const obj = this._bubbleObjects.get(spriteId);
    if (obj) {
      this._bubbleContainer.removeChild(obj.container);
      obj.container.destroy({ children: true });
      this._bubbleObjects.delete(spriteId);
    }
  }

  _toPixi(sx, sy) {
    return {
      x: 240 + sx,
      y: 180 - sy,
    };
  }

  _fromPixi(px, py) {
    return {
      x: px - 240,
      y: 180 - py,
    };
  }

  onSpriteClick(callback) {
    this._onSpriteClick = callback;
  }

  onStageClick(callback) {
    this._onStageClick = callback;
  }

  setThemeBackground(isDark) {
    const color = isDark ? '#1E293B' : '#FFFFFF';
    this.backdrop = color;
    if (this.app && this.app.renderer) {
      // Only apply theme background if no custom backdrop is currently active
      if (!this._bgSprite || !this._bgSprite.visible) {
        this.app.renderer.background.color = color;
      }
    }
  }

  getApp() {
    return this.app;
  }
}
