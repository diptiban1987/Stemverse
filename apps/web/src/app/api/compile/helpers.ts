/**
 * Shared helpers for the Arduino compile API routes.
 * Uses local arduino-cli at C:\arduino-cli and ESP-IDF at C:\Espressif.
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/* ── Config ──────────────────────────────────────────────────── */

const DATA_DIR = process.env.ARDUINO_DATA_DIR || 'C:\\arduino-cli\\arduino-data';
const DEFAULT_FQBN = process.env.ARDUINO_FQBN || 'esp32:esp32:esp32';

/* ── Find arduino-cli ────────────────────────────────────────── */

let _cachedCli: string | null | undefined;

export function findCli(): string | null {
  if (_cachedCli !== undefined) return _cachedCli;

  const candidates = [
    'C:\\arduino-cli\\arduino-cli.exe',
    'C:\\arduino-cli\\arduino-cli',
    path.join(os.homedir(), '.local', 'bin', 'arduino-cli.exe'),
    path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Arduino CLI', 'arduino-cli.exe'),
    'C:\\Program Files\\Arduino CLI\\arduino-cli.exe',
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      _cachedCli = c;
      return c;
    }
  }

  _cachedCli = null;
  return null;
}

/* ── Environment for arduino-cli ─────────────────────────────── */

export function arduinoEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, ARDUINO_DATA_DIR: DATA_DIR };
  if (fs.existsSync('C:\\Espressif')) {
    if (!env.IDF_PATH) {
      env.IDF_PATH = 'C:\\Espressif\\frameworks\\esp-idf-v5.1.2';
    }
  }
  return env;
}

/* ── Board name guesser ──────────────────────────────────────── */

const KNOWN_VIDS: Record<string, string> = {
  '0x1A86': 'ESP32 (CH340)',
  '0x10C4': 'ESP32 (CP210x)',
  '0x0403': 'ESP32 (FTDI)',
  '0x2341': 'Arduino',
};

interface DetectedPort {
  port: { address?: string; label?: string; properties?: { vid?: string; pid?: string } };
  mfg?: string;
  boardName?: string;
  matchingFqbn?: string;
}

export function guessBoardName(p: DetectedPort): string {
  const mfg = `${p.mfg || ''} ${p.boardName || ''}`.trim();
  if (mfg) return mfg;
  const vid = p.port?.properties?.vid || '';
  return KNOWN_VIDS[vid] || 'Serial port';
}

/* ── List serial ports ───────────────────────────────────────── */

export interface PortInfo {
  port: string;
  board: string;
  fqbn: string;
  vid: string;
  pid: string;
}

export function listPorts(cli: string): PortInfo[] {
  const out = execFileSync(cli, ['board', 'list', '--format', 'json'], {
    encoding: 'utf8',
    env: arduinoEnv(),
    stdio: 'pipe',
    timeout: 10000,
  });
  const parsed = JSON.parse(out);
  const detectedPorts: DetectedPort[] = parsed.detected_ports || [];
  return detectedPorts.map((p) => ({
    port: p.port?.address || p.port?.label || 'unknown',
    board: guessBoardName(p),
    fqbn: p.matchingFqbn || '',
    vid: p.port?.properties?.vid || '',
    pid: p.port?.properties?.pid || '',
  }));
}

/* ── Find files by extension ─────────────────────────────────── */

export function findFiles(dir: string, ext: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  function walk(d: string) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(ext)) results.push(full);
    }
  }
  walk(dir);
  return results;
}

/* ── Re-exports ──────────────────────────────────────────────── */

export { DEFAULT_FQBN };
