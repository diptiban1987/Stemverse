/**
 * compile-server.js — Standalone Arduino compile + upload server
 *
 * Uses the local arduino-cli at C:\arduino-cli and ESP-IDF at C:\Espressif.
 * Runs on port 3001 with CORS enabled for the STEMVerse web app.
 *
 * Usage:  node apps/web/compile-server.js
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');

/* ── Configuration ──────────────────────────────────────────────────── */

const PORT = 3001;
const FQBN = process.env.ARDUINO_FQBN || 'esp32:esp32:esp32';
const DATA_DIR = process.env.ARDUINO_DATA_DIR || 'C:\\arduino-cli\\arduino-data';

/* ── Find arduino-cli ───────────────────────────────────────────────── */

function findCli() {
  const candidates = [
    'C:\\arduino-cli\\arduino-cli.exe',
    'C:\\arduino-cli\\arduino-cli',
    path.join(os.homedir(), '.local', 'bin', 'arduino-cli.exe'),
    path.join(os.homedir(), '.local', 'bin', 'arduino-cli'),
    path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Arduino CLI', 'arduino-cli.exe'),
    'C:\\Program Files\\Arduino CLI\\arduino-cli.exe',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      console.log(`[compile-server] Found arduino-cli: ${c}`);
      return c;
    }
  }
  console.error('[compile-server] WARNING: arduino-cli not found in known locations');
  return null;
}

function arduinoEnv() {
  const env = { ...process.env, ARDUINO_DATA_DIR: DATA_DIR };
  // Add ESP-IDF paths if available
  if (fs.existsSync('C:\\Espressif')) {
    env.IDF_PATH = env.IDF_PATH || 'C:\\Espressif\\frameworks\\esp-idf-v5.1.2';
  }
  return env;
}

/* ── Board VID → name mapping ───────────────────────────────────────── */

const KNOWN_VIDS = {
  '0x1A86': 'ESP32 (CH340)',
  '0x10C4': 'ESP32 (CP210x)',
  '0x0403': 'ESP32 (FTDI)',
  '0x2341': 'Arduino',
  '0x1A86|0x7523': 'ESP32 (CH340)',
};

function guessBoardName(p) {
  const mfg = `${p.mfg || ''} ${p.boardName || ''}`.trim();
  if (mfg) return mfg;
  const vid = p.port?.properties?.vid || '';
  const pid = p.port?.properties?.pid || '';
  const key = `${vid}|${pid}`;
  return KNOWN_VIDS[key] || KNOWN_VIDS[vid] || 'Serial port';
}

/* ── Helpers ────────────────────────────────────────────────────────── */

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

function findFiles(dir, ext) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(ext)) results.push(full);
    }
  }
  walk(dir);
  return results;
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

/* ── CLI reference ──────────────────────────────────────────────────── */

const CLI = findCli();

/* ── API Routes ─────────────────────────────────────────────────────── */

// GET /api/ports
async function handleListPorts(_req, res) {
  try {
    if (!CLI) throw new Error('arduino-cli not found');
    const out = execFileSync(CLI, ['board', 'list', '--format', 'json'], {
      encoding: 'utf8', env: arduinoEnv(), stdio: 'pipe', timeout: 10000,
    });
    const parsed = JSON.parse(out);
    const detectedPorts = parsed.detected_ports || [];
    const ports = detectedPorts.map((p) => ({
      port: p.port?.address || p.port?.label || 'unknown',
      board: guessBoardName(p),
      fqbn: p.matchingFqbn || '',
      vid: p.port?.properties?.vid || '',
      pid: p.port?.properties?.pid || '',
    }));
    sendJson(res, 200, { success: true, ports });
  } catch (err) {
    console.error('[ports]', err.message);
    sendJson(res, 200, { success: true, ports: [] });
  }
}

// POST /api/compile
async function handleCompile(req, res) {
  if (!CLI) return sendJson(res, 500, { success: false, output: 'arduino-cli not found' });

  try {
    const { code, fqbn } = await readBody(req);
    if (!code?.trim()) return sendJson(res, 400, { success: false, output: 'No code provided' });

    const board = fqbn || FQBN;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arduino-sketch-'));
    const sketchDir = path.join(tmpDir, 'sketch');
    const buildDir = path.join(tmpDir, 'build');
    fs.mkdirSync(sketchDir, { recursive: true });
    fs.mkdirSync(buildDir, { recursive: true });
    fs.writeFileSync(path.join(sketchDir, 'sketch.ino'), code, 'utf8');

    console.log(`[compile] Compiling for ${board}...`);
    try {
      const out = execFileSync(CLI,
        ['compile', '--fqbn', board, '--output-dir', buildDir, sketchDir],
        { encoding: 'utf8', env: arduinoEnv(), stdio: 'pipe', timeout: 120000 }
      );

      const bins = findFiles(buildDir, '.bin');
      const mergedBin = bins.find((f) => f.includes('merged'));
      const appBin = bins.find((f) => f.includes('sketch.ino') || f.includes('.ino'));
      const binPath = mergedBin || appBin;

      if (binPath && fs.existsSync(binPath)) {
        const binData = fs.readFileSync(binPath);
        sendJson(res, 200, {
          success: true, output: out,
          binary: binData.toString('base64'), binarySize: binData.length,
        });
      } else {
        sendJson(res, 200, { success: true, output: out + '\n(No .bin found)', binary: null });
      }
    } catch (err) {
      sendJson(res, 422, { success: false, output: err.stderr || err.message });
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  } catch (err) {
    sendJson(res, 500, { success: false, output: err.message });
  }
}

// POST /api/upload
async function handleUpload(req, res) {
  if (!CLI) return sendJson(res, 500, { success: false, output: 'arduino-cli not found' });

  try {
    const { code, port, fqbn } = await readBody(req);
    if (!code?.trim()) return sendJson(res, 400, { success: false, output: 'No code provided' });
    if (!port) return sendJson(res, 400, { success: false, output: 'No port specified' });

    const board = fqbn || FQBN;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arduino-upload-'));
    const sketchDir = path.join(tmpDir, 'sketch');
    fs.mkdirSync(sketchDir, { recursive: true });
    fs.writeFileSync(path.join(sketchDir, 'sketch.ino'), code, 'utf8');

    console.log(`[upload] Compiling + uploading to ${port} (${board})...`);
    try {
      const out = execFileSync(CLI,
        ['compile', '--upload', '--port', port, '--fqbn', board, sketchDir],
        { encoding: 'utf8', env: arduinoEnv(), stdio: 'pipe', timeout: 180000 }
      );
      console.log(`[upload] Success!`);
      sendJson(res, 200, { success: true, output: out });
    } catch (err) {
      console.error(`[upload] Failed:`, err.stderr?.slice(0, 200));
      sendJson(res, 422, { success: false, output: err.stderr || err.message });
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  } catch (err) {
    sendJson(res, 500, { success: false, output: err.message });
  }
}

/* ── HTTP Server ────────────────────────────────────────────────────── */

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  const url = req.url?.split('?')[0];
  try {
    if (req.method === 'GET'  && url === '/api/ports')   return await handleListPorts(req, res);
    if (req.method === 'POST' && url === '/api/compile') return await handleCompile(req, res);
    if (req.method === 'POST' && url === '/api/upload')  return await handleUpload(req, res);
    // Health check
    if (req.method === 'GET' && url === '/') {
      return sendJson(res, 200, { status: 'ok', cli: CLI ? 'found' : 'missing' });
    }
    sendJson(res, 404, { success: false, output: 'Not found' });
  } catch (err) {
    sendJson(res, 500, { success: false, output: err.message });
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║        STEMVerse Compile Server — Ready!                ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  URL:          http://localhost:${PORT}                    ║`);
  console.log(`║  arduino-cli:  ${CLI ? '✅ Found' : '❌ Not found'}                              ║`);
  console.log(`║  ESP-IDF:      ${fs.existsSync('C:\\Espressif') ? '✅ Found' : '❌ Not found'}                              ║`);
  console.log(`║  Data dir:     ${DATA_DIR.slice(0, 38).padEnd(38)}  ║`);
  console.log(`║  Board FQBN:   ${FQBN.padEnd(38)}  ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  API Endpoints:                                        ║');
  console.log('║    GET  /api/ports   — list serial ports                ║');
  console.log('║    POST /api/compile — compile sketch                   ║');
  console.log('║    POST /api/upload  — compile + upload to board        ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
});
