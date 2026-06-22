// modal for selecting or uploading sprites from the built-in library
import { SPRITE_LIBRARY } from './spriteLibrary.js';
import spriteStore from '../engine/SpriteStore.js';

let modalEl = null;

export function openSpriteChooser() {
  if (modalEl) return; 

  modalEl = document.createElement('div');
  modalEl.className = 'chooser-overlay';
  modalEl.innerHTML = `
    <div class="chooser-modal">
      <div class="chooser-header">
        <h3>Choose a Sprite</h3>
        <button class="chooser-close" id="closeSpriteChooser"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
      </div>

      <div class="chooser-tabs">
        <button class="chooser-tab active" data-tab="library">Library</button>
        <button class="chooser-tab" data-tab="upload">Upload</button>
      </div>

      <div class="chooser-body" id="spriteChooserBody">
        <!-- Library grid populated dynamically -->
      </div>
    </div>
  `;

  document.body.appendChild(modalEl);

  renderLibraryGrid();

  modalEl.querySelector('#closeSpriteChooser').addEventListener('click', close);
  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) close();
  });

  document.addEventListener('keydown', onEsc);

  modalEl.querySelectorAll('.chooser-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      modalEl.querySelectorAll('.chooser-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if (tab.dataset.tab === 'library') {
        renderLibraryGrid();
      } else {
        renderUploadPane();
      }
    });
  });

  requestAnimationFrame(() => modalEl.classList.add('open'));
}

function renderLibraryGrid() {
  const body = modalEl.querySelector('#spriteChooserBody');

  const categories = {};
  SPRITE_LIBRARY.forEach(s => {
    const cat = s.category || 'Other';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(s);
  });

  let html = '';
  for (const [cat, sprites] of Object.entries(categories)) {
    html += `<div class="chooser-category"><span>${cat}</span></div>`;
    html += '<div class="chooser-grid">';
    sprites.forEach((sprite, idx) => {
      html += `
        <div class="chooser-item" data-sprite-name="${sprite.name}">
          <img src="${sprite.svg}" alt="${sprite.name}" />
          <span>${sprite.name}</span>
        </div>
      `;
    });
    html += '</div>';
  }

  body.innerHTML = html;

  body.querySelectorAll('.chooser-item').forEach(item => {
    item.addEventListener('click', () => {
      const name = item.dataset.spriteName;
      const spriteDef = SPRITE_LIBRARY.find(s => s.name === name);
      if (spriteDef) {
        const i = spriteStore.getAllSprites().length + 1;
        const displayName = `${spriteDef.name}${i > 1 ? i : ''}`;
        spriteStore.addSprite(displayName, { costumeSrc: spriteDef.svg });
      }
      close();
    });
  });
}

function renderUploadPane() {
  const body = modalEl.querySelector('#spriteChooserBody');
  body.innerHTML = `
    <div class="chooser-upload-area">
      <div class="upload-dropzone" id="spriteDropZone">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <p>Drag & drop an image here</p>
        <p class="upload-hint">or</p>
        <label class="upload-browse-btn">
          Browse Files
          <input type="file" accept="image/*" id="spriteFileInput" hidden />
        </label>
      </div>
    </div>
  `;

  const fileInput = body.querySelector('#spriteFileInput');
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleCustomUpload(file);
  });

  const dropZone = body.querySelector('#spriteDropZone');
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleCustomUpload(file);
  });
}

function handleCustomUpload(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    const name = file.name.replace(/\.[^.]+$/, '') || 'Custom';
    spriteStore.addSprite(name, { costumeSrc: dataUrl });
    close();
  };
  reader.readAsDataURL(file);
}

function onEsc(e) {
  if (e.key === 'Escape') close();
}

function close() {
  if (!modalEl) return;
  modalEl.classList.remove('open');
  document.removeEventListener('keydown', onEsc);
  
  setTimeout(() => {
    if (modalEl && modalEl.parentNode) {
      modalEl.parentNode.removeChild(modalEl);
    }
    modalEl = null;
  }, 200);
}
