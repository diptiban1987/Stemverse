// main entry — registers blocks, injects workspace, wires engine and ui
import * as Blockly from "blockly";

import { blocks as printblock } from "./blocks/print";
import { blocks1 as textBlocks } from "./blocks/text";
import { blocks2 as waitBlocks } from "./blocks/wait";
import { blocks3 as pinBlocks } from "./blocks/digital_pin";
import { forBlock as printGen } from "./generators/print";
import { forBlock as addTextGen } from "./generators/addText";
import { forBlock as waitGen } from "./generators/wait";
import { forBlock as pinGen } from "./generators/digital_pin";
import { forBlock as controlGen } from "./generators/controlGen";

import { actuatorBlocks } from "./blocks/esp32/actuatorBlocks";
import { sensorBlocks } from "./blocks/esp32/sensorBlocks";
import { communicationBlocks } from "./blocks/esp32/communicationBlocks";
import { inputBlocks } from "./blocks/esp32/inputBlocks";
import { terminalBlocks } from "./blocks/esp32/terminalBlocks";
import { notificationBlocks } from "./blocks/esp32/notificationBlocks";
import { cameraBlocks } from "./blocks/esp32/cameraBlocks";
import { iotBlocks } from "./blocks/esp32/iotBlocks";
import { wifiBlocks } from "./blocks/esp32/wifiBlocks";
import { httpBlocks } from "./blocks/esp32/httpBlocks";
import { mqttBlocks } from "./blocks/esp32/mqttBlocks";
import { dabbleBlocks } from "./blocks/esp32/dabbleBlocks";
import { esp32CoreBlocks } from "./blocks/esp32/esp32CoreBlocks";
import { mpuBlocks } from "./blocks/esp32/mpuBlocks";
import { heartBlocks } from "./blocks/esp32/heartBlocks";
import { lcdBlocks } from "./blocks/esp32/lcdBlocks";
import { l298nBlocks } from "./blocks/esp32/l298nBlocks";
import { fireBlocks } from "./blocks/esp32/fireBlocks";
import { blynkBlocks } from "./blocks/esp32/blynkBlocks";


// MicroPython generators (existing)
import { forBlock as actuatorGen } from "./generators/esp32/actuatorGen";
import { forBlock as sensorGen } from "./generators/esp32/sensorGen";
import { forBlock as communicationGen } from "./generators/esp32/communicationGen";
import { forBlock as inputGen } from "./generators/esp32/inputGen";
import { forBlock as terminalGen } from "./generators/esp32/terminalGen";
import { forBlock as notificationGen } from "./generators/esp32/notificationGen";
import { forBlock as cameraGen } from "./generators/esp32/cameraGen";
import { forBlock as iotGen } from "./generators/esp32/iotGen";
import { forBlock as wifiGen } from "./generators/esp32/wifiGen";
import { forBlock as httpGen } from "./generators/esp32/httpGen";
import { forBlock as mqttGen } from "./generators/esp32/mqttGen";
import { forBlock as dabbleGen } from "./generators/esp32/dabbleGen";
import { forBlock as esp32CoreGen } from "./generators/esp32/esp32CoreGen";
import { forBlock as mpuGen } from "./generators/esp32/mpuGen";
import { forBlock as heartGen } from "./generators/esp32/heartGen";
import { forBlock as lcdGen } from "./generators/esp32/lcdGen";
import { forBlock as l298nGen } from "./generators/esp32/l298nGen";
import { forBlock as fireGen } from "./generators/esp32/fireGen";
import { forBlock as blynkGen } from "./generators/esp32/blynkGen";
import { pythonGenerator } from "blockly/python";


// Fallback generators + validation (crash-proof system)
import { forBlock as fallbackGen, arduinoForBlock as arduinoFallbackGen } from "./generators/fallbackGen";
import { fullValidation, installSafetyNet, reportGeneratorCoverage } from "./generators/validateWorkspace";

// Arduino C++ generators (new)
import { arduinoGenerator } from "./generators/arduinoGenerator";
import { forBlock as arduinoControlGen } from "./generators/arduinoControlGen";
import { forBlock as arduinoCoreGen } from "./generators/esp32/arduino/coreGen";
import { forBlock as arduinoActuatorGen } from "./generators/esp32/arduino/actuatorGen";
import { forBlock as arduinoSensorGen } from "./generators/esp32/arduino/sensorGen";
import { forBlock as arduinoCommunicationGen } from "./generators/esp32/arduino/communicationGen";
import { forBlock as arduinoInputGen } from "./generators/esp32/arduino/inputGen";
import { forBlock as arduinoTerminalGen } from "./generators/esp32/arduino/terminalGen";
import { forBlock as arduinoNotificationGen } from "./generators/esp32/arduino/notificationGen";
import { forBlock as arduinoCameraGen } from "./generators/esp32/arduino/cameraGen";
import { forBlock as arduinoIotGen } from "./generators/esp32/arduino/iotGen";
import { forBlock as arduinoWifiGen } from "./generators/esp32/arduino/wifiGen";
import { forBlock as arduinoHttpGen } from "./generators/esp32/arduino/httpGen";
import { forBlock as arduinoMqttGen } from "./generators/esp32/arduino/mqttGen";
import { forBlock as arduinoDabbleGen } from "./generators/esp32/arduino/dabbleGen";
import { forBlock as arduinoMpuGen } from "./generators/esp32/arduino/mpuGen";
import { forBlock as arduinoHeartGen } from "./generators/esp32/arduino/heartGen";
import { forBlock as arduinoLcdGen } from "./generators/esp32/arduino/lcdGen";
import { forBlock as arduinoL298nGen } from "./generators/esp32/arduino/l298nGen";
import { forBlock as arduinoFireGen } from "./generators/esp32/arduino/fireGen";
import { forBlock as arduinoBlynkGen } from "./generators/esp32/arduino/blynkGen";


import { motionBlocks } from "./blocks/motionBlocks";
import { looksBlocks } from "./blocks/looksBlocks";
import { eventBlocks } from "./blocks/eventBlocks";
import { controlBlocks } from "./blocks/controlBlocks";
import { sensingBlocks } from "./blocks/sensingBlocks";
import { soundBlocks } from "./blocks/soundBlocks";
import { scratchToolbox } from "./scratchToolbox";
import { BlockInterpreter } from "./engine/BlockInterpreter";
import { StageRenderer } from "./engine/StageRenderer";
import spriteStore from "./engine/SpriteStore";

import { toolbox as espToolbox } from "./toolbox";
import { addCustomToolbar } from "./ui/customToolbar";
import { initBlockSearch, refreshBlockSearch } from "./ui/blockSearch";

import { initUploadPanel, updateUploadButtonForLanguage } from "./upload/uploadPanel";
import { buildESP32Code } from "./upload/codeBuilder";
import { buildArduinoSketch, emptyArduinoSketch } from "./upload/arduinoCodeBuilder";
import { initModeSwitcher, getCurrentMode, showToast } from "./ui/ModeSwitcher";
import { initSpritePanel } from "./ui/SpritePanel";
import { initConnectButton } from "./ui/ConnectModal";
import { initSerialMonitor } from "./ui/SerialMonitor";
import { refreshIcons } from "./ui/icons";
import { isFeatureEnabled } from "./services/featureFlags";
import { showSubscriptionModal } from "./ui/SubscriptionModal";
import "./index.css";
import "./output.css";

// ── Blockly Theme Definitions ────────────────────────
const BLOCKLY_THEMES = {
  light: Blockly.Theme.defineTheme('techyguide-light', {
    base: Blockly.Themes.Classic,
    componentStyles: {
      workspaceBackgroundColour: '#FFFFFF',
      toolboxBackgroundColour: '#F9FAFB',
      flyoutBackgroundColour: '#F9FAFB',
      scrollbarColour: '#C0C0C0',
    },
  }),
  dark: Blockly.Theme.defineTheme('techyguide-dark', {
    base: Blockly.Themes.Classic,
    componentStyles: {
      workspaceBackgroundColour: '#1E293B',
      toolboxBackgroundColour: '#0F172A',
      flyoutBackgroundColour: '#0F172A',
      scrollbarColour: '#475569',
    },
  }),
};

function applyBlocklyTheme(theme) {
  const next = theme === 'dark' ? BLOCKLY_THEMES.dark : BLOCKLY_THEMES.light;
  ws.setTheme(next);
}

// ── Register Block Definitions ──────────────────────
Blockly.common.defineBlocks(printblock);
Blockly.common.defineBlocks(textBlocks);
Blockly.common.defineBlocks(waitBlocks);
Blockly.common.defineBlocks(pinBlocks);

Blockly.common.defineBlocks(actuatorBlocks);
Blockly.common.defineBlocks(sensorBlocks);
Blockly.common.defineBlocks(communicationBlocks);
Blockly.common.defineBlocks(inputBlocks);
Blockly.common.defineBlocks(terminalBlocks);
Blockly.common.defineBlocks(notificationBlocks);
Blockly.common.defineBlocks(cameraBlocks);
Blockly.common.defineBlocks(iotBlocks);
Blockly.common.defineBlocks(wifiBlocks);
Blockly.common.defineBlocks(httpBlocks);
Blockly.common.defineBlocks(mqttBlocks);
Blockly.common.defineBlocks(dabbleBlocks);
Blockly.common.defineBlocks(esp32CoreBlocks);
Blockly.common.defineBlocks(mpuBlocks);
Blockly.common.defineBlocks(heartBlocks);
Blockly.common.defineBlocks(lcdBlocks);
Blockly.common.defineBlocks(l298nBlocks);
Blockly.common.defineBlocks(fireBlocks);
Blockly.common.defineBlocks(blynkBlocks);


// MicroPython generator registrations
Object.assign(pythonGenerator.forBlock, printGen);
Object.assign(pythonGenerator.forBlock, addTextGen);
Object.assign(pythonGenerator.forBlock, waitGen);
Object.assign(pythonGenerator.forBlock, pinGen);
Object.assign(pythonGenerator.forBlock, controlGen);

Object.assign(pythonGenerator.forBlock, actuatorGen);
Object.assign(pythonGenerator.forBlock, sensorGen);
Object.assign(pythonGenerator.forBlock, communicationGen);
Object.assign(pythonGenerator.forBlock, inputGen);
Object.assign(pythonGenerator.forBlock, terminalGen);
Object.assign(pythonGenerator.forBlock, notificationGen);
Object.assign(pythonGenerator.forBlock, cameraGen);
Object.assign(pythonGenerator.forBlock, iotGen);
Object.assign(pythonGenerator.forBlock, wifiGen);
Object.assign(pythonGenerator.forBlock, httpGen);
Object.assign(pythonGenerator.forBlock, mqttGen);
Object.assign(pythonGenerator.forBlock, dabbleGen);
Object.assign(pythonGenerator.forBlock, esp32CoreGen);
Object.assign(pythonGenerator.forBlock, mpuGen);
Object.assign(pythonGenerator.forBlock, heartGen);
Object.assign(pythonGenerator.forBlock, lcdGen);
Object.assign(pythonGenerator.forBlock, l298nGen);
Object.assign(pythonGenerator.forBlock, fireGen);
Object.assign(pythonGenerator.forBlock, blynkGen);


// Arduino C++ generator registrations
Object.assign(arduinoGenerator.forBlock, arduinoControlGen);
Object.assign(arduinoGenerator.forBlock, arduinoCoreGen);
Object.assign(arduinoGenerator.forBlock, arduinoActuatorGen);
Object.assign(arduinoGenerator.forBlock, arduinoSensorGen);
Object.assign(arduinoGenerator.forBlock, arduinoCommunicationGen);
Object.assign(arduinoGenerator.forBlock, arduinoInputGen);
Object.assign(arduinoGenerator.forBlock, arduinoTerminalGen);
Object.assign(arduinoGenerator.forBlock, arduinoNotificationGen);
Object.assign(arduinoGenerator.forBlock, arduinoCameraGen);
Object.assign(arduinoGenerator.forBlock, arduinoIotGen);
Object.assign(arduinoGenerator.forBlock, arduinoWifiGen);
Object.assign(arduinoGenerator.forBlock, arduinoHttpGen);
Object.assign(arduinoGenerator.forBlock, arduinoMqttGen);
Object.assign(arduinoGenerator.forBlock, arduinoDabbleGen);
Object.assign(arduinoGenerator.forBlock, arduinoMpuGen);
Object.assign(arduinoGenerator.forBlock, arduinoHeartGen);
Object.assign(arduinoGenerator.forBlock, arduinoLcdGen);
Object.assign(arduinoGenerator.forBlock, arduinoL298nGen);
Object.assign(arduinoGenerator.forBlock, arduinoFireGen);
Object.assign(arduinoGenerator.forBlock, arduinoBlynkGen);


// Arduino generators for General blocks (shared between Scratch and ESP32 toolboxes)
arduinoGenerator.forBlock['print_block'] = function (block, generator) {
  const text = generator.valueToCode(block, 'TEXT', 99) || '""';
  return `Serial.println(${text});\n`;
};
arduinoGenerator.forBlock['add_text'] = function (block, generator) {
  const text = generator.valueToCode(block, 'TEXT', 99) || '""';
  return `Serial.print(${text});\n`;
};
arduinoGenerator.forBlock['wait_block'] = function (block) {
  const time = block.getFieldValue('TIME') || '1';
  return `delay((long)(${time} * 1000));\n`;
};
arduinoGenerator.forBlock['digital_write'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  const state = block.getFieldValue('STATE') === '1' ? 'HIGH' : 'LOW';
  generator.definitions_[`pinMode_${pin}`] = `pinMode(${pin}, OUTPUT);`;
  return `digitalWrite(${pin}, ${state});\n`;
};

// ── Fallback generators (Scratch-only blocks → safe no-ops) ──
// Registered CONDITIONALLY: never overwrites a real generator
for (const [type, fn] of Object.entries(fallbackGen)) {
  if (!pythonGenerator.forBlock[type]) {
    pythonGenerator.forBlock[type] = fn;
  }
}
for (const [type, fn] of Object.entries(arduinoFallbackGen)) {
  if (!arduinoGenerator.forBlock[type]) {
    arduinoGenerator.forBlock[type] = fn;
  }
}

// ── Safety nets: prevent crashes from ANY future unmapped block ──
installSafetyNet(pythonGenerator, "Python");
installSafetyNet(arduinoGenerator, "Arduino");

// Expose diagnostic to browser console: reportGeneratorCoverage(pythonGenerator)
window._reportPyCoverage = () => reportGeneratorCoverage(pythonGenerator);
window._reportArdCoverage = () => reportGeneratorCoverage(arduinoGenerator);

Blockly.common.defineBlocks(motionBlocks);
Blockly.common.defineBlocks(looksBlocks);
Blockly.common.defineBlocks(soundBlocks);
Blockly.common.defineBlocks(eventBlocks);
Blockly.common.defineBlocks(controlBlocks);
Blockly.common.defineBlocks(sensingBlocks);

// ── Inject Blockly Workspace ────────────────────────
const blocklyDiv = document.getElementById("blocklyDiv");

const ws = Blockly.inject(blocklyDiv, { 
  toolbox: scratchToolbox
});

addCustomToolbar();
initBlockSearch(ws, scratchToolbox);

// ── Robust workspace resize handling ─────────────────
// 1) Recalculate workspace whenever the container size changes
const ro = new ResizeObserver(() => { try { Blockly.svgResize(ws); } catch (e) {} });
ro.observe(blocklyDiv);

// 2) Also listen to window resize (fallback + robustness)
window.addEventListener('resize', () => { try { Blockly.svgResize(ws); } catch (e) {} });

// 3) Force one initial resize after the browser has finished layout
requestAnimationFrame(() => { requestAnimationFrame(() => { try { Blockly.svgResize(ws); } catch (e) {} }); });

// ── Pane Toggle logic ───────────────────────────────
const togglePaneBtn = document.getElementById("togglePaneBtn");
if (togglePaneBtn) {
  togglePaneBtn.addEventListener("click", () => {
    togglePaneBtn.classList.toggle("is-collapsed");
    
    const scratchPane = document.getElementById("scratchPane");
    const boardPane = document.getElementById("boardPane");
    
    if (scratchPane) scratchPane.classList.toggle("is-hidden");
    if (boardPane) boardPane.classList.toggle("is-hidden");

    // Trigger Blockly resize smoothly alongside the CSS transition
    let start = performance.now();
    requestAnimationFrame(function animate(time) {
      Blockly.svgResize(ws);
      if (time - start < 350) requestAnimationFrame(animate);
    });
  });
}


// ── Stage Renderer + Interpreter ────────────────────
const stageContainer = document.getElementById("stageCanvas");
const renderer = new StageRenderer(stageContainer);
const interpreter = new BlockInterpreter(spriteStore, ws);
interpreter.setRenderer(renderer);

(async () => {
  await renderer.init();

  spriteStore.on((event) => {
    renderer.setSprites(spriteStore.getAllSprites());
  });
  renderer.setSprites(spriteStore.getAllSprites());

  spriteStore.on((event, sprite) => {
    if (event === "select" && sprite) {
      ws.clear();
      if (sprite.workspaceState) {
          Blockly.serialization.workspaces.load(sprite.workspaceState, ws);
      }
    }
  });

  ws.addChangeListener((e) => {
      if (e.isUiEvent || ws.isDragging()) return;
      
      if (getCurrentMode() === "scratch") {
          const selectedId = spriteStore.selectedSpriteId;
          if (selectedId) {
              const state = Blockly.serialization.workspaces.save(ws);
              spriteStore.saveWorkspaceState(selectedId, state);
          }
      }
  });

  document.getElementById("greenFlagBtn")?.addEventListener("click", () => {
      spriteStore.resetAll();
      interpreter.startAll();
  });

  document.getElementById("stopBtn")?.addEventListener("click", () => {
      interpreter.stopAll();
  });

  initSpritePanel();
})();

// ── Mode Switcher ───────────────────────────────────
initModeSwitcher(
  // onModeChange callback
  (newMode) => {
    console.log("Mode switched to:", newMode);

    if (newMode === "scratch") {
      ws.updateToolbox(scratchToolbox);
      addCustomToolbar();
      refreshBlockSearch(scratchToolbox);

      ws.clear();
      const activeSprite = spriteStore.getSelectedSprite();
      if (activeSprite && activeSprite.workspaceState) {
          Blockly.serialization.workspaces.load(activeSprite.workspaceState, ws);
      }
    } else {
      ws.updateToolbox(espToolbox);
      addCustomToolbar();
      refreshBlockSearch(espToolbox);

      ws.clear(); 

      // Auto-update the code panel once on entering board mode
      setTimeout(() => {
        regenerateCode();
        const toolbox = ws.getToolbox();
        if (toolbox) {
          const items = toolbox.getToolboxItems();
          const espItem = items.find(i => i.getName && i.getName() === 'ESP32 Core');
          if (espItem) {
            toolbox.setSelectedItem(espItem);
          }
        }
      }, 100);
    }
  },
  // onViewChange callback (Stage / Code toggle from header pills)
  (view) => {
    console.log("View switched to:", view);
    setBoardView(view);
  }
);

initConnectButton();

// ══════════════════════════════════════════════════════
//  CODE EDITOR — Dual Language System
// ══════════════════════════════════════════════════════

let currentCodeLang = 'arduino'; // 'arduino' | 'micropython'

const codeTextarea = document.getElementById("codeContent");
const codeGutter = document.getElementById("codeGutter");
const codeLineCount = document.getElementById("codeLineCount");
const codeFileNameEl = document.getElementById("codeFileName");
const downloadBtnLabel = document.getElementById("downloadBtnLabel");

// Provide the code from textarea to the upload panel
initUploadPanel(
  () => codeTextarea?.value || '',
  () => currentCodeLang
);

// ── Stage / Code View Toggle (driven by header pills) ──
const boardStageView = document.getElementById("boardStageView");
const boardCodeView = document.getElementById("boardCodeView");
const boardStageSlot = document.getElementById("boardStageSlot");
const scratchStageContainer = document.getElementById("stageContainer");

function setBoardView(view) {
  const scratchPane = document.getElementById("scratchPane");
  const boardPane = document.getElementById("boardPane");
  const scratchControls = document.getElementById('scratchControls');

  if (view === 'stage') {
    if (scratchPane) scratchPane.style.display = 'flex';
    if (boardPane) boardPane.style.display = 'none';
    if (scratchControls) scratchControls.style.display = 'flex';
  } else {
    if (scratchPane) scratchPane.style.display = 'none';
    if (boardPane) boardPane.style.display = 'flex';
    if (scratchControls) scratchControls.style.display = 'none';
    
    if (boardCodeView) boardCodeView.style.display = 'flex';
    if (boardStageView) boardStageView.style.display = 'none';
    
    regenerateCode();
  }
}

// ── Arduino / MicroPython Language Toggle ───────────
const envDropdown = document.getElementById("envDropdown");

function setCodeLanguage(lang) {
  if (!isFeatureEnabled('micropythonGen') && lang === 'micropython') {
    showSubscriptionModal();
    if (envDropdown) envDropdown.value = currentCodeLang;
    return;
  }
  if (!isFeatureEnabled('arduinoGen') && lang === 'arduino') {
    showSubscriptionModal();
    if (envDropdown) envDropdown.value = currentCodeLang;
    return;
  }

  currentCodeLang = lang;

  if (envDropdown && envDropdown.value !== lang) {
    envDropdown.value = lang;
  }

  if (lang === 'arduino') {
    if (codeFileNameEl) codeFileNameEl.textContent = 'sketch.ino';
    if (downloadBtnLabel) downloadBtnLabel.textContent = 'Download .ino';
  } else {
    if (codeFileNameEl) codeFileNameEl.textContent = 'main.py';
    if (downloadBtnLabel) downloadBtnLabel.textContent = 'Download .py';
  }
  updateUploadButtonForLanguage(lang);
  regenerateCode();
}

envDropdown?.addEventListener('change', (e) => setCodeLanguage(e.target.value));

// ── Code Generation ─────────────────────────────────

function generateCurrentCode() {
  // Pre-flight validation: pin conflicts, orphans, coverage (never blocks execution)
  const gen = currentCodeLang === 'arduino' ? arduinoGenerator : pythonGenerator;
  const report = fullValidation(ws, gen);
  if (report.errors.length) {
    console.error('[codegen] Errors:', report.errors);
  }
  if (report.warnings.length) {
    console.warn('[codegen] Warnings:', report.warnings);
  }

  if (currentCodeLang === 'arduino') {
    return buildArduinoSketch(ws);
  } else {
    const raw = pythonGenerator.workspaceToCode(ws);
    return buildESP32Code(raw);
  }
}

function updateGutter(code) {
  const lines = (code || '').split('\n');

  if (codeGutter) {
    codeGutter.innerHTML = lines.map((_, i) => `<div>${i + 1}</div>`).join('');
  }

  if (codeLineCount) {
    codeLineCount.textContent = `${lines.length} line${lines.length !== 1 ? 's' : ''}`;
  }
}

function updateCodeEditor(code) {
  if (codeTextarea) {
    codeTextarea.value = code || '';
  }
  updateGutter(code);
}

function regenerateCode() {
  if (getCurrentMode() === "scratch") return;
  const code = generateCurrentCode();
  updateCodeEditor(code);
}

// Sync gutter when user manually edits the textarea
codeTextarea?.addEventListener('input', () => {
  updateGutter(codeTextarea.value);
});

// Sync gutter scrolling with textarea scrolling
codeTextarea?.addEventListener('scroll', () => {
  if (codeGutter) {
    codeGutter.scrollTop = codeTextarea.scrollTop;
  }
});

// Handle Tab key inside textarea for indentation
codeTextarea?.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = codeTextarea.selectionStart;
    const end = codeTextarea.selectionEnd;
    codeTextarea.value = codeTextarea.value.substring(0, start) + '  ' + codeTextarea.value.substring(end);
    codeTextarea.selectionStart = codeTextarea.selectionEnd = start + 2;
    updateGutter(codeTextarea.value);
  }
});

// ── Workspace Change → Regenerate Code ──────────────
ws.addChangeListener((e) => {
  if (e.isUiEvent || e.type === Blockly.Events.FINISHED_LOADING || ws.isDragging()) return;
  regenerateCode();
});

// ── Download Button ─────────────────────────────────
const downloadCodeBtn = document.getElementById("downloadCodeBtn");
if (downloadCodeBtn) {
  downloadCodeBtn.addEventListener("click", () => {
    if (!isFeatureEnabled('exportCode')) {
      showSubscriptionModal();
      return;
    }
    const code = codeTextarea?.value || generateCurrentCode();
    const ext = currentCodeLang === 'arduino' ? 'ino' : 'py';
    const filename = currentCodeLang === 'arduino' ? 'sketch.ino' : 'main.py';
    const blob = new Blob([code], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  });
}

// ── Project Save / Load ─────────────────────────────
import { saveProject, loadProject } from './project';

function initProjectButtons() {
  const header = document.getElementById('appHeader');
  if (!header) return;

  const rightSection = header.querySelector('.flex.items-center.gap-3.shrink-0');
  if (!rightSection) return;

  const saveBtn = document.createElement('button');
  saveBtn.className = 'nav-btn nav-btn--save';
  saveBtn.title = 'Save project';
  saveBtn.innerHTML = `<i data-lucide="save" style="width:16px;height:16px;"></i>`;
  saveBtn.addEventListener('click', () => saveProject(ws));

  const loadBtn = document.createElement('button');
  loadBtn.className = 'nav-btn nav-btn--load';
  loadBtn.title = 'Load project';
  loadBtn.innerHTML = `<i data-lucide="folder-open" style="width:16px;height:16px;"></i>`;
  loadBtn.addEventListener('click', () => loadProject(ws));

  // ── Theme Toggle ──
  const themeToggle = document.createElement('button');
  themeToggle.className = 'nav-btn theme-toggle';
  themeToggle.title = 'Toggle theme';
  themeToggle.innerHTML = `<i data-lucide="moon" style="width:16px;height:16px;"></i>`;
  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('techyguide-theme', next);
    applyBlocklyTheme(next);
    renderer.setThemeBackground(next === 'dark');
    refreshIcons();
  });

  rightSection.insertBefore(themeToggle, rightSection.firstChild);
  rightSection.insertBefore(loadBtn, rightSection.firstChild);
  rightSection.insertBefore(saveBtn, rightSection.firstChild);
  refreshIcons();
}

initProjectButtons();

// Restore saved theme on load
const savedTheme = localStorage.getItem('techyguide-theme');
if (savedTheme) {
  document.documentElement.setAttribute('data-theme', savedTheme);
  applyBlocklyTheme(savedTheme);
  renderer.setThemeBackground(savedTheme === 'dark');
}

// Initial icon render
refreshIcons();

// Initialize serial monitor
initSerialMonitor();
refreshIcons();
