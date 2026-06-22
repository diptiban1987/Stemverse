// web serial and web bluetooth connection modal for hardware boards
import { refreshIcons } from './icons';

let connectOverlay = null;
let connectBtn = null;
let currentTab = 'serial';

let connectionState = 'disconnected';

let activeSerialPort = null;

let activeBtDevice = null;

let authorizedPorts = [];

let discoveredBtDevices = [];

export function initConnectButton() {
  // Find the button already created by ModeSwitcher
  connectBtn = document.getElementById('connectBtn');
  if (!connectBtn) return;

  connectBtn.addEventListener('click', () => openConnectModal());
  _updateConnectBtnUI();

  _createConnectModal();

  _refreshSerialPorts();
}

export function getConnectionState() {
  return connectionState;
}

export function getActivePort() {
  return activeSerialPort;
}

export function openConnectModal() {
  if (!connectOverlay) return;
  currentTab = 'serial';
  connectOverlay.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
  connectOverlay.querySelector('[data-tab="serial"]')?.classList.add('active');
  _renderBody();
  connectOverlay.offsetHeight; 
  connectOverlay.classList.add('open');
}

export function closeConnectModal() {
  if (connectOverlay) connectOverlay.classList.remove('open');
}

export async function disconnectSerialPort() {
  await _disconnectSerial();
}

export async function suspendSerialPort() {
  if (activeSerialPort) {
    try {
      await activeSerialPort.close();
    } catch (e) {}
  }
  _setState('disconnected');
}

export async function resumeSerialPort() {
  if (activeSerialPort) {
    _setState('connecting');
    try {
      if (!activeSerialPort.readable) {
        await activeSerialPort.open({ baudRate: 115200 });
      }
      _setState('connected');
      return true;
    } catch (err) {
      console.error('[Serial] Resume failed:', err);
      activeSerialPort = null;
      _setState('disconnected');
    }
  }
  return false;
}

function _updateConnectBtnUI() {
  if (!connectBtn) return;

  const label = document.getElementById('connectBtnLabel');
  connectBtn.classList.remove('is-connected', 'is-connecting');

  if (connectionState === 'connected') {
    connectBtn.classList.add('is-connected');
    if (label) {
      label.textContent = activeSerialPort
        ? 'Connected'
        : activeBtDevice
          ? `BT: ${activeBtDevice.name || 'Device'}`
          : 'Connected';
    }
  } else if (connectionState === 'connecting') {
    connectBtn.classList.add('is-connecting');
    if (label) label.textContent = 'Connecting…';
  } else {
    if (label) label.textContent = 'Connect';
  }
}

function _createConnectModal() {
  connectOverlay = document.createElement('div');
  connectOverlay.className = 'modal-overlay';
  connectOverlay.id = 'connectModalOverlay';

  connectOverlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Connect to Port</h3>
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="connection-status status--disconnected" id="connStatusBadge">
            <span class="status-dot"></span>
            <span id="connStatusText">Disconnected</span>
          </div>
          <button class="modal-close" id="connectModalClose">
            <i data-lucide="x" style="width: 16px; height: 16px;"></i>
          </button>
        </div>
      </div>
      <div class="modal-tabs">
        <button class="modal-tab active" data-tab="serial">Serial Ports (USB)</button>
        <button class="modal-tab" data-tab="bluetooth">Bluetooth Ports</button>
      </div>
      <div class="modal-body" id="connectModalBody"></div>
      <div class="modal-footer">
        <span class="modal-footer-text">Select your device in the list above</span>
        <div class="pagination-dots">
          <div class="pagination-dot active"></div>
          <div class="pagination-dot"></div>
          <div class="pagination-dot"></div>
        </div>
        <button class="refresh-btn" id="connectScanBtn">
          <i data-lucide="refresh-cw" style="width: 16px; height: 16px;"></i>
          Scan / Refresh
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(connectOverlay);

  connectOverlay.querySelector('#connectModalClose').addEventListener('click', closeConnectModal);
  connectOverlay.addEventListener('click', e => {
    if (e.target === connectOverlay) closeConnectModal();
  });

  connectOverlay.querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentTab = tab.dataset.tab;
      connectOverlay.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      _renderBody();
    });
  });

  connectOverlay.querySelector('#connectScanBtn').addEventListener('click', async () => {
    if (currentTab === 'serial') {
      await _requestNewSerialPort();
    } else {
      await _scanBluetooth();
    }
  });

  _updateStatusBadge();
}

function _updateStatusBadge() {
  const badge = document.getElementById('connStatusBadge');
  const text = document.getElementById('connStatusText');
  if (!badge || !text) return;

  badge.classList.remove('status--disconnected', 'status--connecting', 'status--connected');

  if (connectionState === 'connected') {
    badge.classList.add('status--connected');
    text.textContent = 'Connected';
  } else if (connectionState === 'connecting') {
    badge.classList.add('status--connecting');
    text.textContent = 'Connecting…';
  } else {
    badge.classList.add('status--disconnected');
    text.textContent = 'Disconnected';
  }
}

function _setState(newState) {
  connectionState = newState;
  _updateConnectBtnUI();
  _updateStatusBadge();
}

function _renderBody() {
  const body = document.getElementById('connectModalBody');
  if (!body) return;

  if (currentTab === 'serial') {
    _renderSerialPorts(body);
  } else {
    _renderBluetoothDevices(body);
  }
}

async function _refreshSerialPorts() {
  if (!('serial' in navigator)) return;
  try {
    authorizedPorts = await navigator.serial.getPorts();
  } catch (err) {
    console.warn('[Serial] getPorts error:', err);
    authorizedPorts = [];
  }
}

async function _requestNewSerialPort() {
  if (!('serial' in navigator)) {
    alert('Web Serial API is not supported in this browser. Use Chrome or Edge.');
    return;
  }

  try {
    const port = await navigator.serial.requestPort();
    
    if (!authorizedPorts.includes(port)) {
      authorizedPorts.push(port);
    }
    _renderBody();
  } catch (err) {
    
    if (err.name !== 'NotFoundError') {
      console.warn('[Serial] requestPort error:', err);
    }
  }
}

async function _connectSerialPort(port) {
  if (connectionState === 'connected' && activeSerialPort === port) return;

  await _disconnectSerial();

  _setState('connecting');
  _renderBody();

  try {
    // If the port is already open (readable stream exists), skip re-opening
    if (!port.readable) {
      try {
        await port.open({ baudRate: 115200 });
      } catch (firstErr) {
        // Port may still be releasing — wait and retry once
        console.warn('[Serial] First open attempt failed, retrying...', firstErr.message);
        await new Promise(r => setTimeout(r, 500));
        await port.open({ baudRate: 115200 });
      }
    }

    activeSerialPort = port;
    _setState('connected');

    port.addEventListener('disconnect', () => {
      activeSerialPort = null;
      _setState('disconnected');
      _refreshSerialPorts().then(() => _renderBody());
    }, { once: true });

  } catch (err) {
    console.error('[Serial] Connection failed:', err);
    activeSerialPort = null;
    _setState('disconnected');
    alert(`Connection failed: ${err.message}\n\nTroubleshooting:\n• Close Arduino IDE or any other serial monitor\n• Unplug and replug the USB cable\n• Press the EN/Reset button on the ESP32`);
  }

  _renderBody();
}

async function _disconnectSerial() {
  if (activeSerialPort) {
    try {
      // Just close the port — this automatically cancels any active readers/writers.
      // Do NOT call getReader()/getWriter() here; another module (SerialMonitor)
      // may already hold the lock and we'd get a "stream locked" error.
      await activeSerialPort.close();
    } catch (e) { /* port may already be closed */ }
    activeSerialPort = null;
  }
  _setState('disconnected');
}

function _getPortLabel(port) {
  const info = port.getInfo();
  if (info.usbVendorId) {
    return `USB Device (VID: 0x${info.usbVendorId.toString(16).toUpperCase()}, PID: 0x${info.usbProductId.toString(16).toUpperCase()})`;
  }
  return 'Serial Port';
}

function _renderSerialPorts(body) {
  if (!('serial' in navigator)) {
    body.innerHTML = `
      <div class="port-empty-state">
        <div style="text-align:center">
          <div style="font-size:24px;margin-bottom:8px;"></div>
          <div>Web Serial API is not supported in this browser.</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Use Google Chrome or Microsoft Edge.</div>
        </div>
      </div>
    `;
    return;
  }

  if (authorizedPorts.length === 0) {
    body.innerHTML = `
      <div class="port-empty-state">
        <div style="text-align:center">
          <div style="font-size:24px;margin-bottom:8px;"></div>
          <div>No authorized serial ports.</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Click <strong>Scan / Refresh</strong> to select a USB device.</div>
        </div>
      </div>
    `;
    return;
  }

  body.innerHTML = `
    <div class="port-list">
      ${authorizedPorts.map((port, i) => {
        const isActive = activeSerialPort === port && connectionState === 'connected';
        const isConnecting = activeSerialPort === port && connectionState === 'connecting';
        const label = _getPortLabel(port);
        const btnClass = isActive ? 'port-connect-btn port-connect-btn--disconnect' : 'port-connect-btn';
        const btnText = isActive ? 'Disconnect' : isConnecting ? 'Connecting…' : 'Connect';
        const action = isActive ? 'disconnect-serial' : 'connect-serial';

        return `
          <div class="port-item" data-port-index="${i}">
            <span>${label}</span>
            <button class="${btnClass}" data-action="${action}" data-port-idx="${i}">
              ${btnText}
            </button>
          </div>
        `;
      }).join('')}
    </div>
  `;

  body.querySelectorAll('[data-action="connect-serial"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.portIdx);
      const port = authorizedPorts[idx];
      if (port) await _connectSerialPort(port);
    });
  });

  body.querySelectorAll('[data-action="disconnect-serial"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await _disconnectSerial();
      _renderBody();
    });
  });
}

async function _scanBluetooth() {
  if (!('bluetooth' in navigator)) {
    alert('Web Bluetooth API is not supported in this browser. Use Chrome on macOS/Android/ChromeOS.');
    return;
  }

  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['battery_service'],
    });

    if (!discoveredBtDevices.find(d => d.id === device.id)) {
      discoveredBtDevices.push(device);
    }

    _renderBody();
  } catch (err) {
    if (err.name !== 'NotFoundError') {
      console.warn('[Bluetooth] requestDevice error:', err);
    }
  }
}

async function _connectBtDevice(device) {
  if (connectionState === 'connected' && activeBtDevice === device) return;

  await _disconnectBt();

  _setState('connecting');
  _renderBody();

  try {
    const server = await device.gatt.connect();
    activeBtDevice = device;
    _setState('connected');

    device.addEventListener('gattserverdisconnected', () => {
      activeBtDevice = null;
      _setState('disconnected');
      _renderBody();
    }, { once: true });

    console.log('[Bluetooth] Connected to GATT server:', server);
  } catch (err) {
    console.error('[Bluetooth] Connection failed:', err);
    activeBtDevice = null;
    _setState('disconnected');
    alert(`Bluetooth connection failed: ${err.message}`);
  }

  _renderBody();
}

async function _disconnectBt() {
  if (activeBtDevice && activeBtDevice.gatt.connected) {
    try {
      activeBtDevice.gatt.disconnect();
    } catch (e) {  }
  }
  activeBtDevice = null;
  _setState('disconnected');
}

function _renderBluetoothDevices(body) {
  if (!('bluetooth' in navigator)) {
    body.innerHTML = `
      <div class="port-empty-state">
        <div style="text-align:center">
          <div style="font-size:24px;margin-bottom:8px;"></div>
          <div>Web Bluetooth API is not supported.</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Use Chrome on macOS, Android, or ChromeOS.</div>
        </div>
      </div>
    `;
    return;
  }

  if (discoveredBtDevices.length === 0) {
    body.innerHTML = `
      <div class="port-empty-state">
        <div style="text-align:center">
          <div style="font-size:24px;margin-bottom:8px;"></div>
          <div>No Bluetooth 4.0 devices found</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Click <strong>Scan / Refresh</strong> to discover nearby devices.</div>
        </div>
      </div>
    `;
    return;
  }

  body.innerHTML = `
    <div class="port-list">
      ${discoveredBtDevices.map((device, i) => {
        const isActive = activeBtDevice === device && connectionState === 'connected';
        const isConnecting = activeBtDevice === device && connectionState === 'connecting';
        const name = device.name || `Device (${device.id.slice(0, 8)}…)`;
        const btnClass = isActive ? 'port-connect-btn port-connect-btn--disconnect' : 'port-connect-btn';
        const btnText = isActive ? 'Disconnect' : isConnecting ? 'Connecting…' : 'Connect';
        const action = isActive ? 'disconnect-bt' : 'connect-bt';

        return `
          <div class="port-item" data-bt-index="${i}">
            <span>${name}</span>
            <button class="${btnClass}" data-action="${action}" data-bt-idx="${i}">
              ${btnText}
            </button>
          </div>
        `;
      }).join('')}
    </div>
  `;

  body.querySelectorAll('[data-action="connect-bt"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.btIdx);
      const device = discoveredBtDevices[idx];
      if (device) await _connectBtDevice(device);
    });
  });

  body.querySelectorAll('[data-action="disconnect-bt"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await _disconnectBt();
      _renderBody();
    });
  });
}
