// sprite properties bar, sprite list, and backdrop list ui
import spriteStore from '../engine/SpriteStore';
import { openSpriteChooser } from './SpriteChooserModal';
import { openBackdropChooser } from './BackdropChooserModal';

export function initSpritePanel() {
  const container = document.getElementById('spritePanelContainer');
  if (!container) return;

  container.innerHTML = `
    <!-- Top info bar (Sprite properties) -->
    <div class="sprite-info-bar">
      <!-- Row 1: Name, X, Y -->
      <div class="info-row">
        <label class="info-group sprite-name-group">
          <span>Sprite</span>
          <input type="text" id="propName" autocomplete="off" />
        </label>
        
        <div class="info-group xy-group">
          <label>
            <span>X</span>
            <input type="number" id="propX" />
          </label>
          <label>
            <span>Y</span>
            <input type="number" id="propY" />
          </label>
        </div>
      </div>

      <!-- Row 2: Show/Hide, Size, Direction -->
      <div class="info-row align-center">
        <div class="info-group show-group">
          <span>Show</span>
          <div class="toggle-btns">
            <button id="propShow" class="icon-btn" title="Show">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
            <button id="propHide" class="icon-btn" title="Hide">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"></path></svg>
            </button>
          </div>
        </div>

        <label class="info-group size-group">
          <span>Size</span>
          <input type="number" id="propSize" min="1" max="1000" />
        </label>

        <label class="info-group direction-group">
          <span>Direction</span>
          <input type="number" id="propDir" />
        </label>
      </div>
    </div>

    <!-- Main lists area (Sprites vs Stage) -->
    <div class="media-lists-area">
      <div class="sprite-list-section">
        <div id="spriteList" class="media-list"></div>
        <button class="fab-btn add-sprite-fab" id="addSpriteBtn" title="Choose a Sprite">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v8M8 12h8"></path></svg>
        </button>
      </div>

      <div class="stage-list-section">
        <div class="stage-header">
          <span>Stage</span>
          <br>
          <small>Backdrops</small>
        </div>
        <div class="backdrop-thumb selected" id="backdropPreview">
          <div class="backdrop-preview" id="backdropPreviewInner"></div>
        </div>
        <button class="fab-btn add-backdrop-fab" id="addBackdropBtn" title="Choose a Backdrop">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
        </button>
      </div>
    </div>
  `;

  bindEvents();
  renderPanel();

  spriteStore.on((event) => {
    renderPanel();
    if (event === 'backdrop') {
      updateBackdropPreview();
    }
  });
}

function bindEvents() {
  const propName = document.getElementById('propName');
  const propX = document.getElementById('propX');
  const propY = document.getElementById('propY');
  const propSize = document.getElementById('propSize');
  const propDir = document.getElementById('propDir');
  const propShow = document.getElementById('propShow');
  const propHide = document.getElementById('propHide');
  const addSpriteBtn = document.getElementById('addSpriteBtn');
  const addBackdropBtn = document.getElementById('addBackdropBtn');

  const updateProp = (fn) => {
    const s = spriteStore.getSelectedSprite();
    if (s) {
      fn(s);
      spriteStore._emit('update', s); 
    }
  };

  propName.addEventListener('change', (e) => updateProp(s => s.name = e.target.value));
  propX.addEventListener('change', (e) => updateProp(s => s.setX(Number(e.target.value))));
  propY.addEventListener('change', (e) => updateProp(s => s.setY(Number(e.target.value))));
  propSize.addEventListener('change', (e) => updateProp(s => s.setSize(Number(e.target.value))));
  propDir.addEventListener('change', (e) => updateProp(s => s.direction = Number(e.target.value)));

  propShow.addEventListener('click', () => updateProp(s => s.visible = true));
  propHide.addEventListener('click', () => updateProp(s => s.visible = false));

  addSpriteBtn.addEventListener('click', () => {
    openSpriteChooser();
  });

  addBackdropBtn.addEventListener('click', () => {
    openBackdropChooser();
  });
}

function updateBackdropPreview() {
  const preview = document.getElementById('backdropPreviewInner');
  if (!preview) return;
  const bd = spriteStore.getCurrentBackdrop();
  if (!bd) {
    preview.style.background = '#fff';
    return;
  }
  if (bd.type === 'color') {
    preview.style.background = bd.value;
  } else if (bd.type === 'gradient') {
    preview.style.background = bd.value;
  } else if (bd.type === 'svg' || bd.type === 'image') {
    preview.style.background = `url("${bd.value}") center/cover no-repeat`;
  }
}

function renderPanel() {
  const s = spriteStore.getSelectedSprite();
  if (s) {
    document.getElementById('propName').value = s.name;
    document.getElementById('propX').value = Math.round(s.x);
    document.getElementById('propY').value = Math.round(s.y);
    document.getElementById('propSize').value = Math.round(s.size);
    document.getElementById('propDir').value = Math.round(s.direction);
    
    document.getElementById('propShow').classList.toggle('active', s.visible);
    document.getElementById('propHide').classList.toggle('active', !s.visible);
  } else {
    ['propName','propX','propY','propSize','propDir'].forEach(id => {
      document.getElementById(id).value = '';
    });
  }

  const list = document.getElementById('spriteList');
  if (!list) return;
  list.innerHTML = '';
  
  const sprites = spriteStore.getAllSprites();

  sprites.forEach(sprite => {
    const thumb = document.createElement('div');
    thumb.className = `sprite-thumb ${sprite.id === s?.id ? 'selected' : ''}`;

    const delBtn = sprites.length > 1 ? `<div class="delete-btn" data-id="${sprite.id}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></div>` : '';

    const img = sprite.getCostumeImage();
    if (img && img.src) {
      thumb.innerHTML = `
        <img src="${img.src}" alt="${sprite.name}">
        <div class="sprite-thumb-info">
            <span class="sprite-thumb-name">${sprite.name}</span>
        </div>
        ${delBtn}
      `;
    } else {
      thumb.innerHTML = `
        <div style="font-size: 24px; line-height: 1; flex: 1; display:flex; align-items:center;"></div>
        <div class="sprite-thumb-info">
            <span class="sprite-thumb-name">${sprite.name}</span>
        </div>
        ${delBtn}
      `;
    }

    thumb.addEventListener('click', (e) => {
      const delTarget = e.target.closest('.delete-btn');
      if (delTarget) {
          e.stopPropagation();
          spriteStore.removeSprite(sprite.id);
          return;
      }
      spriteStore.selectSprite(sprite.id);
    });

    list.appendChild(thumb);
  });

  updateBackdropPreview();
}
