// ModeSwitcher — builds the modern navbar and handles mode/view toggling
import { refreshIcons } from './icons';
import { isFeatureEnabled, getPlan } from '../services/featureFlags';
import { showSubscriptionModal, updatePlanBadge } from './SubscriptionModal';

let currentMode = 'scratch'; // 'scratch' | 'board'
let currentBoardView = 'stage'; // 'stage' | 'code'
let selectedBoard = null; // 'i-bot' | 't-bot'
let onModeChangeCallback = null;
let onViewChangeCallback = null;

// ── Toast notification ──────────────────────────────
export function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast-notification';

  toast.style.cssText = `
    position: fixed; top: 24px; left: 50%;
    transform: translateX(-50%) translateY(-20px);
    background: #fff; color: #1a1a1a;
    border-left: 4px solid var(--accent);
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    padding: 12px 24px; border-radius: 10px;
    display: flex; align-items: center; gap: 10px;
    font-family: var(--font-ui); font-size: 14px; font-weight: 600;
    z-index: 9999; opacity: 0;
    transition: all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  `;

  toast.innerHTML = `
    <i data-lucide="info" style="width:18px;height:18px;color:var(--accent);flex-shrink:0;"></i>
    <span>${message}</span>
  `;

  document.body.appendChild(toast);
  refreshIcons();

  void toast.offsetWidth;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── Board options ───────────────────────────────────
const BOARDS = [
  {
    id: 'i-bot',
    name: 'i-bot',
    desc: '',
    img: '/board/i-bot.png',
  },
  {
    id: 't-bot',
    name: 't-bot',
    desc: '',
    img: '/board/t-bot.png',
  },
];

// ── Init ────────────────────────────────────────────
export function initModeSwitcher(onModeChange, onViewChange) {
  onModeChangeCallback = onModeChange;
  onViewChangeCallback = onViewChange;

  const header = document.getElementById('appHeader');
  if (!header) return;

  // ══════════════════════════════════════════════════
  //  LEFT SECTION — Logo
  // ══════════════════════════════════════════════════
  const leftSection = document.createElement('div');
  leftSection.className = 'flex items-center shrink-0 bg-white h-full pl-5 pr-8 shadow-[4px_0_12px_rgba(0,0,0,0.06)] relative z-10 border-r border-black/5';

  const logo = document.createElement('div');
  logo.className = 'flex items-center cursor-pointer shrink-0 hover:opacity-90 transition-opacity';
  logo.innerHTML = `
    <img src="/logo/logo-ByQhDDdF.webp" alt="TechyGuide" class="h-14 object-contain">
  `;
  leftSection.appendChild(logo);

  // ══════════════════════════════════════════════════
  //  CENTER SECTION — Board Dropdown + Connect
  // ══════════════════════════════════════════════════
  const centerSection = document.createElement('div');
  centerSection.className = 'flex items-center justify-center gap-3 flex-1';

  // ── Board Dropdown ──
  const boardWrap = document.createElement('div');
  boardWrap.className = 'relative';

  const boardBtn = document.createElement('button');
  boardBtn.className = 'nav-btn nav-btn--board';
  boardBtn.id = 'boardToggleBtn';
  boardBtn.innerHTML = `
    <span id="boardBtnLabel">Board</span>
  `;

  // ── Board Selection Modal (compact popup) ──
  const boardPanel = document.createElement('div');
  boardPanel.className = 'board-modal-overlay';
  boardPanel.id = 'boardDropdownPanel';

  const modalBox = document.createElement('div');
  modalBox.className = 'board-modal-box';

  // Header with title + close
  const modalHeader = document.createElement('div');
  modalHeader.className = 'board-modal-header';
  modalHeader.innerHTML = `
    <span class="board-modal-title">Select Board</span>
    <button class="board-modal-close" id="closeBoardModalBtn">
      <i data-lucide="x" style="width:18px;height:18px;"></i>
    </button>
  `;
  modalBox.appendChild(modalHeader);

  // Cards row
  const cardsContainer = document.createElement('div');
  cardsContainer.className = 'board-modal-cards';

  BOARDS.forEach((board) => {
    const card = document.createElement('div');
    card.className = 'board-modal-card';
    card.dataset.boardId = board.id;
    card.innerHTML = `
      <div class="board-modal-card-img">
        <img src="${board.img}" alt="${board.name}">
      </div>
      <span class="board-modal-card-name">${board.name}</span>
    `;

    card.addEventListener('click', () => {
      if (!isFeatureEnabled('boardMode')) {
        boardPanel.classList.remove('open');
        showSubscriptionModal();
        return;
      }

      selectedBoard = board.id;

      cardsContainer.querySelectorAll('.board-modal-card').forEach(c => {
        c.classList.remove('is-selected');
      });
      card.classList.add('is-selected');

      // Close modal then switch mode
      boardPanel.classList.remove('open');
      _switchMode('board');
    });

    cardsContainer.appendChild(card);
  });

  modalBox.appendChild(cardsContainer);
  boardPanel.appendChild(modalBox);

  // Close on backdrop click
  boardPanel.addEventListener('click', (e) => {
    if (e.target === boardPanel) boardPanel.classList.remove('open');
  });

  // Close button
  modalBox.querySelector('#closeBoardModalBtn').addEventListener('click', () => {
    boardPanel.classList.remove('open');
  });

  // ESC key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && boardPanel.classList.contains('open')) {
      boardPanel.classList.remove('open');
    }
  });

  // Open modal
  boardBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    boardPanel.classList.add('open');
    refreshIcons();
  });

  boardWrap.appendChild(boardBtn);
  document.body.appendChild(boardPanel);

  // ── Connect Button ──
  const connectBtn = document.createElement('button');
  connectBtn.className = 'nav-btn nav-btn--connect';
  connectBtn.id = 'connectBtn';
  connectBtn.innerHTML = `
    <span id="connectBtnLabel">Connect</span>
  `;

  centerSection.appendChild(boardWrap);
  centerSection.appendChild(connectBtn);

  // ══════════════════════════════════════════════════
  //  RIGHT SECTION — View Toggle + Upload
  // ══════════════════════════════════════════════════
  const rightSection = document.createElement('div');
  rightSection.className = 'flex items-center gap-3 shrink-0';

  // ── View Toggle (Professional Pill Tabs) ──
  const tabGroup = document.createElement('div');
  tabGroup.className = 'flex items-center bg-black/15 rounded-lg p-[3px] shrink-0 h-9 border border-black/10 shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)]';
  tabGroup.id = 'headerViewGroup';
  tabGroup.innerHTML = `
    <button class="header-tab active flex items-center justify-center gap-1.5 px-4 h-full rounded-md border-none bg-transparent text-gray-800 text-[13px] font-semibold cursor-pointer transition-all whitespace-nowrap" id="headerStageBtn" data-view="stage">
      <i data-lucide="monitor" class="size-3.5"></i>
      Stage
    </button>
    <button class="header-tab flex items-center justify-center gap-1.5 px-4 h-full rounded-md border-none bg-transparent text-gray-800 text-[13px] font-semibold cursor-pointer transition-all whitespace-nowrap" id="headerCodeBtn" data-view="code">
      <i data-lucide="upload" class="size-3.5"></i>
      Upload
    </button>
  `;

  rightSection.appendChild(tabGroup);

  // ── Plan Badge ──
  const planBadge = document.createElement('span');
  planBadge.className = 'plan-badge';
  planBadge.id = 'planBadge';
  planBadge.addEventListener('click', showSubscriptionModal);
  rightSection.appendChild(planBadge);

  // ══════════════════════════════════════════════════
  //  ASSEMBLE
  // ══════════════════════════════════════════════════
  header.appendChild(leftSection);
  header.appendChild(centerSection);
  header.appendChild(rightSection);

  // Wire view toggle
  document.getElementById('headerStageBtn')?.addEventListener('click', () => _setView('stage'));
  document.getElementById('headerCodeBtn')?.addEventListener('click', () => _setView('code'));

  // Render Lucide icons
  updatePlanBadge();
  refreshIcons();
}

// ── Mode switching ──────────────────────────────────
export function setMode(newMode) {
  _switchMode(newMode);
}

function _switchMode(newMode) {
  if (newMode === currentMode) return;
  currentMode = newMode;

  const body = document.body;
  const scratchPane = document.getElementById('scratchPane');
  const boardPane = document.getElementById('boardPane');
  const scratchControls = document.getElementById('scratchControls');
  const boardBtnLabel = document.getElementById('boardBtnLabel');

  if (newMode === 'scratch') {
    body.classList.remove('mode-board');
    body.classList.add('mode-scratch');
    if (scratchPane) scratchPane.style.display = 'flex';
    if (boardPane) boardPane.style.display = 'none';
    if (scratchControls) scratchControls.style.display = 'flex';
    if (boardBtnLabel) boardBtnLabel.textContent = 'Board';

    _setView('stage');
  } else {
    body.classList.remove('mode-scratch');
    body.classList.add('mode-board');
    if (scratchPane) scratchPane.style.display = 'none';
    if (boardPane) boardPane.style.display = 'flex';
    if (scratchControls) scratchControls.style.display = 'none';
    if (boardBtnLabel) boardBtnLabel.textContent = 'Board';

    _setView('code');
  }

  if (onModeChangeCallback) {
    onModeChangeCallback(newMode);
  }
}

// ── View switching ──────────────────────────────────
function _setView(view) {
  if (view === currentBoardView) return;

  // Guard: switching to Upload requires a board to be selected
  if (view === 'code' && !selectedBoard) {
    showToast('Please select a board first.');
    return;
  }

  currentBoardView = view;

  const stageBtn = document.getElementById('headerStageBtn');
  const codeBtn = document.getElementById('headerCodeBtn');

  if (view === 'stage') {
    stageBtn?.classList.add('active');
    codeBtn?.classList.remove('active');
  } else {
    codeBtn?.classList.add('active');
    stageBtn?.classList.remove('active');
  }

  if (onViewChangeCallback) onViewChangeCallback(view);
}

// ── Public getters ──────────────────────────────────
export function getCurrentMode() {
  return currentMode === 'scratch' ? 'scratch' : currentMode;
}

export function getCurrentBoardView() {
  return currentBoardView;
}
