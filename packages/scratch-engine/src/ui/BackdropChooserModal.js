// modal for selecting or uploading backdrops from the built-in library
import { BACKDROP_LIBRARY } from './backdropLibrary.js';
import spriteStore from '../engine/SpriteStore.js';

let modalEl = null;

export function openBackdropChooser() {
  if (modalEl) return;

  modalEl = document.createElement('div');
  modalEl.className = 'chooser-overlay';
  modalEl.innerHTML = `
    <div class="chooser-modal">
      <div class="chooser-header">
        <h3>Choose a Backdrop</h3>
        <button class="chooser-close" id="closeBackdropChooser"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
      </div>

      <div class="chooser-tabs">
        <button class="chooser-tab active" data-tab="library">Library</button>
        <button class="chooser-tab" data-tab="upload">Upload</button>
      </div>

      <div class="chooser-body" id="backdropChooserBody">
        <!-- populated dynamically -->
      </div>
    </div>
  `;

  document.body.appendChild(modalEl);

  renderLibraryGrid();

  modalEl.querySelector('#closeBackdropChooser').addEventListener('click', close);
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
  const body = modalEl.querySelector('#backdropChooserBody');
  const currentBackdrop = spriteStore.getCurrentBackdrop();

  let html = '<div class="chooser-grid backdrop-grid">';
  BACKDROP_LIBRARY.forEach(bd => {
    const isActive = currentBackdrop && currentBackdrop.name === bd.name;
    const previewStyle = getPreviewStyle(bd);
    html += `
      <div class="chooser-item backdrop-item ${isActive ? 'active' : ''}" data-backdrop-name="${bd.name}">
        <div class="backdrop-preview-thumb" style="${previewStyle}"></div>
        <span>${bd.name}</span>
      </div>
    `;
  });
  html += '</div>';

  body.innerHTML = html;

  body.querySelectorAll('.backdrop-item').forEach(item => {
    item.addEventListener('click', () => {
      const name = item.dataset.backdropName;
      const bd = BACKDROP_LIBRARY.find(b => b.name === name);
      if (bd) {
        spriteStore.setBackdrop(bd);
      }
      close();
    });
  });
}

function renderUploadPane() {
  const body = modalEl.querySelector('#backdropChooserBody');
  body.innerHTML = `
    <div class="chooser-upload-area">
      <div class="upload-dropzone" id="backdropDropZone">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        <p>Drag & drop a backdrop image</p>
        <p class="upload-hint">or</p>
        <label class="upload-browse-btn">
          Browse Files
          <input type="file" accept="image/*" id="backdropFileInput" hidden />
        </label>
      </div>
    </div>
  `;

  const fileInput = body.querySelector('#backdropFileInput');
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleCustomUpload(file);
  });

  const dropZone = body.querySelector('#backdropDropZone');
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
    const bd = { name, type: 'image', value: dataUrl };
    spriteStore.addBackdropToLibrary(bd);
    spriteStore.setBackdrop(bd);
    close();
  };
  reader.readAsDataURL(file);
}

function getPreviewStyle(bd) {
  if (bd.type === 'color') return `background: ${bd.value};`;
  if (bd.type === 'gradient') return `background: ${bd.value};`;
  if (bd.type === 'svg' || bd.type === 'image') return `background: url("${bd.value}") center/cover no-repeat;`;
  return `background: #fff;`;
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
