// LibraryManager.js — Detects missing Arduino libraries before compile & shows install UI
import { refreshIcons } from './icons';
import { writeBuildLog } from './SerialMonitor';

// All libraries used by this project with their associated sensor/feature label
const LIBRARY_REGISTRY = [
  {
    include: 'DHT.h',
    libraryName: 'DHT sensor library',
    label: 'DHT11 / DHT22 Temperature & Humidity Sensor',
    category: 'Temperature & Humidity',
    icon: '🌡️'
  },
  {
    include: 'OneWire.h',
    libraryName: 'OneWire',
    label: 'DS18B20 Temperature Sensor (OneWire bus)',
    category: 'Temperature',
    icon: '🌡️'
  },
  {
    include: 'DallasTemperature.h',
    libraryName: 'DallasTemperature',
    label: 'DS18B20 Dallas Temperature Library',
    category: 'Temperature',
    icon: '🌡️'
  },
  {
    include: 'Adafruit_BMP280.h',
    libraryName: 'Adafruit BMP280 Library',
    label: 'BMP280 Barometer / Pressure Sensor',
    category: 'Environmental',
    icon: '🌦️'
  },
  {
    include: 'Adafruit_MPU6050.h',
    libraryName: 'Adafruit MPU6050',
    label: 'MPU6050 Gyroscope & Accelerometer',
    category: 'Motion',
    icon: '📐'
  },
  {
    include: 'Adafruit_Sensor.h',
    libraryName: 'Adafruit Unified Sensor',
    label: 'Adafruit Unified Sensor Driver (dependency)',
    category: 'Core',
    icon: '📦'
  },
  {
    include: 'MFRC522.h',
    libraryName: 'MFRC522',
    label: 'MFRC522 RFID Reader',
    category: 'RFID & NFC',
    icon: '📡'
  },
  {
    include: 'IRremote.hpp',
    libraryName: 'IRremote',
    label: 'IR Remote Receiver / Transmitter',
    category: 'Communication',
    icon: '📺'
  },
  {
    include: 'LiquidCrystal_I2C.h',
    libraryName: 'LiquidCrystal_I2C',
    label: 'I2C LCD Display (16x2 / 20x4)',
    category: 'Displays',
    icon: '🖥️'
  },
  {
    include: 'Adafruit_SSD1306.h',
    libraryName: 'Adafruit SSD1306',
    label: 'OLED Display (SSD1306 128x64)',
    category: 'Displays',
    icon: '🖥️'
  },
  {
    include: 'ESP32Servo.h',
    libraryName: 'ESP32Servo',
    label: 'ESP32 Servo Motor Control',
    category: 'Actuators',
    icon: '⚙️'
  },
  {
    include: 'ArduinoJson.h',
    libraryName: 'ArduinoJson',
    label: 'ArduinoJson (HTTP / MQTT data parsing)',
    category: 'Data',
    icon: '📋'
  },
  {
    include: 'BlynkSimpleEsp32.h',
    libraryName: 'Blynk',
    label: 'Blynk IoT Platform (ESP32)',
    category: 'IoT Platforms',
    icon: '📱'
  },
  {
    include: 'ThingSpeak.h',
    libraryName: 'ThingSpeak',
    label: 'ThingSpeak IoT Analytics Platform',
    category: 'IoT Platforms',
    icon: '📊'
  },
];


let _overlay = null;
let _installedLibs = null;
let _onContinue = null;

/**
 * Fetch currently installed libraries from the backend.
 */
async function fetchInstalledLibs() {
  try {
    const res = await fetch('/api/libs');
    const data = await res.json();
    return data.libs || [];
  } catch (e) {
    console.warn('[LibraryManager] Could not fetch installed libs:', e.message);
    return [];
  }
}

/**
 * Parse generated code and return any missing library entries.
 * Uses case-insensitive substring matching to handle version numbers in names.
 */
function findMissingLibraries(code, installedLibs) {
  // Normalize installed names: lowercase, strip version numbers at end
  const normalizedInstalled = installedLibs.map(l =>
    l.toLowerCase().replace(/\s+\d+\.\d+[\d.]*$/, '').trim()
  );

  const missing = [];
  for (const entry of LIBRARY_REGISTRY) {
    if (code.includes(`#include <${entry.include}>`)) {
      const entryLower = entry.libraryName.toLowerCase();
      // Check if any installed library name contains or is contained by this entry
      const isInstalled = normalizedInstalled.some(name =>
        name.includes(entryLower) || entryLower.includes(name)
      );
      if (!isInstalled) {
        missing.push(entry);
      }
    }
  }
  return missing;
}

/**
 * Show the Library Manager modal.
 * Returns a promise that resolves true if user proceeds, false if cancelled.
 */
export async function checkAndInstallLibraries(code) {
  let installedLibs = [];
  try {
    installedLibs = await fetchInstalledLibs();
  } catch (e) {
    // If we can't check libs (API not ready), don't block — just proceed
    console.warn('[LibraryManager] Skipping lib check (API unavailable):', e.message);
    return true;
  }

  const missing = findMissingLibraries(code, installedLibs);
  if (missing.length === 0) return true; // All good — proceed

  return new Promise((resolve) => {
    _onContinue = resolve;
    _showModal(missing);
  });
}

function _showModal(missingLibs) {
  if (!_overlay) _createOverlay();

  const body = document.getElementById('libMgrBody');
  if (!body) return;

  body.innerHTML = missingLibs.map((lib, i) => `
    <div class="lib-item" id="lib-item-${i}">
      <div class="lib-icon">${lib.icon}</div>
      <div class="lib-info">
        <div class="lib-name">${lib.libraryName}</div>
        <div class="lib-label">${lib.label}</div>
        <div class="lib-category">${lib.category}</div>
      </div>
      <div class="lib-status" id="lib-status-${i}">
        <span class="lib-badge lib-badge-missing">❌ Missing</span>
      </div>
      <button class="lib-install-btn" id="lib-install-${i}" data-lib="${lib.libraryName}" data-idx="${i}">
        Install
      </button>
    </div>
  `).join('');

  // Add log area
  body.innerHTML += `
    <div class="lib-log-area" id="libLogArea" style="display:none;">
      <div class="lib-log-title">📦 Installation Log</div>
      <pre class="lib-log-output" id="libLogOutput"></pre>
    </div>
    <div class="lib-actions">
      <button class="lib-install-all-btn" id="libInstallAllBtn">
        ⬇️ Install All Missing (${missingLibs.length})
      </button>
      <button class="lib-continue-btn" id="libContinueBtn">
        ✅ Continue Compile
      </button>
      <button class="lib-cancel-btn" id="libCancelBtn">
        Cancel
      </button>
    </div>
  `;

  refreshIcons();

  // Wire up install buttons
  missingLibs.forEach((lib, i) => {
    document.getElementById(`lib-install-${i}`)?.addEventListener('click', () => {
      _installLib(lib.libraryName, i, missingLibs);
    });
  });

  document.getElementById('libInstallAllBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('libInstallAllBtn');
    if (btn) btn.disabled = true;
    for (let i = 0; i < missingLibs.length; i++) {
      await _installLib(missingLibs[i].libraryName, i, missingLibs);
    }
  });

  document.getElementById('libContinueBtn')?.addEventListener('click', () => {
    _closeModal();
    _onContinue?.(true);
  });

  document.getElementById('libCancelBtn')?.addEventListener('click', () => {
    _closeModal();
    _onContinue?.(false);
  });

  _overlay.classList.add('open');
}

let _installInProgress = new Set();
let _installedCount = 0;
let _totalToInstall = 0;

async function _installLib(libraryName, idx, allLibs) {
  if (_installInProgress.has(libraryName)) return;
  _installInProgress.add(libraryName);
  _totalToInstall = allLibs.length;

  const statusEl = document.getElementById(`lib-status-${idx}`);
  const installBtn = document.getElementById(`lib-install-${idx}`);
  const logArea = document.getElementById('libLogArea');
  const logOutput = document.getElementById('libLogOutput');

  if (statusEl) statusEl.innerHTML = '<span class="lib-badge lib-badge-installing">⏳ Installing...</span>';
  if (installBtn) installBtn.disabled = true;
  if (logArea) logArea.style.display = 'block';

  _appendLog(`\n📦 Installing ${libraryName}...\n`, logOutput);

  try {
    const res = await fetch('/api/install-lib', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ library: libraryName }),
    });
    const data = await res.json();

    if (data.success) {
      if (statusEl) statusEl.innerHTML = '<span class="lib-badge lib-badge-installed">✅ Installed</span>';
      _appendLog(`✅ ${libraryName} installed successfully!\n`, logOutput);
      writeBuildLog(`[Library] ${libraryName} installed.\n`, 'build');
      _installedCount++;
    } else {
      if (statusEl) statusEl.innerHTML = '<span class="lib-badge lib-badge-error">❌ Failed</span>';
      if (installBtn) installBtn.disabled = false;
      _appendLog(`❌ Failed: ${data.output}\n`, logOutput);
    }
  } catch (err) {
    if (statusEl) statusEl.innerHTML = '<span class="lib-badge lib-badge-error">❌ Error</span>';
    if (installBtn) installBtn.disabled = false;
    _appendLog(`❌ Error: ${err.message}\n`, logOutput);
  }

  _installInProgress.delete(libraryName);
}

function _appendLog(text, el) {
  if (!el) return;
  el.textContent += text;
  el.scrollTop = el.scrollHeight;
}

function _createOverlay() {
  _overlay = document.createElement('div');
  _overlay.className = 'modal-overlay lib-mgr-overlay';
  _overlay.id = 'libMgrOverlay';
  _overlay.innerHTML = `
    <div class="lib-mgr-modal">
      <div class="lib-mgr-header">
        <div class="lib-mgr-title">
          <span class="lib-mgr-icon">📚</span>
          <div>
            <div class="lib-mgr-title-text">Missing Libraries Detected</div>
            <div class="lib-mgr-subtitle">The following libraries are required for your blocks but not installed.</div>
          </div>
        </div>
        <button class="modal-close" id="libMgrClose">
          <i data-lucide="x" style="width:16px;height:16px;"></i>
        </button>
      </div>
      <div class="lib-mgr-body" id="libMgrBody"></div>
    </div>
  `;
  document.body.appendChild(_overlay);
  document.getElementById('libMgrClose')?.addEventListener('click', () => {
    _closeModal();
    _onContinue?.(false);
  });
  _overlay.addEventListener('click', (e) => {
    if (e.target === _overlay) {
      _closeModal();
      _onContinue?.(false);
    }
  });
}

function _closeModal() {
  if (_overlay) _overlay.classList.remove('open');
  _installInProgress.clear();
  _installedCount = 0;
}
