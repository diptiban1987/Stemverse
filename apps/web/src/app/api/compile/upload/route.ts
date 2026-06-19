/**
 * POST /api/compile/upload — compile + auto-detect board + upload
 *
 * Body: { code: string, boardId?: string, port?: string, fqbn?: string }
 *   - boardId maps to the correct FQBN automatically (e.g. 'esp32' → 'esp32:esp32:esp32')
 *   - If port is omitted, the first detected port is used (auto-detect)
 *   - If fqbn is omitted, uses boardId mapping or defaults to esp32:esp32:esp32
 */
import { NextResponse } from 'next/server';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { findCli, listPorts, arduinoEnv, DEFAULT_FQBN } from '../helpers';

/* ── Board ID → arduino-cli FQBN mapping ── */
const BOARD_FQBN_MAP: Record<string, string> = {
  esp32:        'esp32:esp32:esp32',
  esp32_s3:     'esp32:esp32:esp32s3',
  esp8266:      'esp8266:esp8266:nodemcuv2',
  arduino_uno:  'arduino:avr:uno',
  arduino_nano: 'arduino:avr:nano',
  arduino_mega: 'arduino:avr:mega',
  rpi_pico:     'arduino:mbed_rp2040:pico',
  stm32:        'stm32:stm32:GenF4',
};

export async function POST(request: Request) {
  const cli = findCli();
  if (!cli) {
    return NextResponse.json(
      { success: false, output: 'arduino-cli not found. Install it at C:\\arduino-cli' },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();
    const { code, boardId, fqbn } = body;
    let { port } = body;

    if (!code?.trim()) {
      return NextResponse.json(
        { success: false, output: 'No code provided.' },
        { status: 400 },
      );
    }

    const board = fqbn || (boardId && BOARD_FQBN_MAP[boardId]) || DEFAULT_FQBN;

    // ── Auto-detect port if not specified ──
    if (!port) {
      const ports = listPorts(cli);
      // Filter out COM1 (usually not a dev board)
      const devPorts = ports.filter((p) => p.port !== 'COM1');
      if (devPorts.length === 0) {
        return NextResponse.json({
          success: false,
          output: 'No board detected. Plug your board into a USB port and try again.',
          ports: ports,
        }, { status: 422 });
      }
      port = devPorts[0].port;
    }

    // ── Write temp sketch ──
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arduino-upload-'));
    const sketchDir = path.join(tmpDir, 'sketch');
    fs.mkdirSync(sketchDir, { recursive: true });
    fs.writeFileSync(path.join(sketchDir, 'sketch.ino'), code, 'utf8');

    try {
      console.log(`[compile/upload] Compiling + uploading to ${port} (${board})...`);
      const out = execFileSync(cli,
        ['compile', '--upload', '--port', port, '--fqbn', board, sketchDir],
        { encoding: 'utf8', env: arduinoEnv(), stdio: 'pipe', timeout: 180000 },
      );
      console.log(`[compile/upload] Success!`);
      return NextResponse.json({ success: true, output: out, port, board });
    } catch (err) {
      const error = err as { stderr?: string; stdout?: string; message: string };
      const errorOutput = error.stderr || error.stdout || error.message;
      console.error(`[compile/upload] Failed:`, errorOutput?.slice(0, 500));
      console.error(`[compile/upload] Code length: ${code?.length}, Board: ${board}, Port: ${port}`);
      return NextResponse.json(
        { success: false, output: errorOutput?.slice(0, 2000) || 'Unknown compilation error', port, board },
        { status: 422 },
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  } catch (err) {
    return NextResponse.json(
      { success: false, output: (err as Error).message },
      { status: 500 },
    );
  }
}
