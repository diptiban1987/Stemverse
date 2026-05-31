import { execFile } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { Injectable } from '@nestjs/common';

const execFileAsync = promisify(execFile);

export type ArduinoCompileStatus = 'queued' | 'compiling' | 'completed' | 'failed';

export type ArduinoCompileError = {
  line?: number;
  column?: number;
  message: string;
  severity: 'error' | 'warning';
};

export type ArduinoBinaryMetadata = {
  path: string;
  sizeBytes: number;
  boardFqbn: string;
  sketchName: string;
  compiledAt: string;
};

export type ArduinoCompileResult = {
  status: ArduinoCompileStatus;
  success: boolean;
  logs: string[];
  errors: ArduinoCompileError[];
  binary?: ArduinoBinaryMetadata;
  simulated: boolean;
};

const BOARD_FQBN: Record<string, string> = {
  arduino_uno: 'arduino:avr:uno',
  arduino_nano: 'arduino:avr:nano',
  esp32: 'espressif:esp32:esp32',
  esp8266: 'esp8266:esp8266:nodemcuv2',
};

@Injectable()
export class ArduinoCliService {
  private readonly cliPath = process.env.ARDUINO_CLI_PATH ?? 'arduino-cli';

  async compileSketch(options: {
    sourceCode: string;
    board: string;
    projectName?: string;
  }): Promise<ArduinoCompileResult> {
    const fqbn = BOARD_FQBN[options.board] ?? BOARD_FQBN.arduino_uno;
    const sketchName = (options.projectName ?? 'stemverse_sketch').replace(/[^a-zA-Z0-9_]/g, '_');
    const logs: string[] = [];
    const errors: ArduinoCompileError[] = [];

    const cliAvailable = await this.isCliAvailable();
    if (!cliAvailable) {
      return this.simulateCompile(options.sourceCode, fqbn, sketchName, logs);
    }

    const workDir = await mkdtemp(join(tmpdir(), 'stemverse-compile-'));
    const sketchDir = join(workDir, sketchName);
    const sketchFile = join(sketchDir, `${sketchName}.ino`);

    try {
      const { mkdir } = await import('node:fs/promises');
      await mkdir(sketchDir, { recursive: true });
      await writeFile(sketchFile, options.sourceCode, 'utf8');

      logs.push(`[compile] FQBN: ${fqbn}`);
      logs.push(`[compile] Sketch: ${sketchFile}`);

      const { stdout, stderr } = await execFileAsync(
        this.cliPath,
        ['compile', '--fqbn', fqbn, '--output-dir', workDir, sketchDir],
        { timeout: 120_000, maxBuffer: 4 * 1024 * 1024 },
      );

      if (stdout) logs.push(stdout);
      if (stderr) logs.push(stderr);

      const parsed = this.parseCompilerOutput(`${stdout}\n${stderr}`);
      errors.push(...parsed);

      const binPath = join(workDir, `${sketchName}.ino.bin`);
      let binary: ArduinoBinaryMetadata | undefined;
      try {
        const bin = await readFile(binPath);
        binary = {
          path: binPath,
          sizeBytes: bin.length,
          boardFqbn: fqbn,
          sketchName,
          compiledAt: new Date().toISOString(),
        };
      } catch {
        logs.push('[compile] Binary artifact not found — compile may have warnings only');
      }

      const success = !errors.some((e) => e.severity === 'error');
      return {
        status: success ? 'completed' : 'failed',
        success,
        logs,
        errors,
        binary,
        simulated: false,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logs.push(message);
      errors.push({ message, severity: 'error' });
      const parsed = this.parseCompilerOutput(message);
      errors.push(...parsed);
      return {
        status: 'failed',
        success: false,
        logs,
        errors,
        simulated: false,
      };
    } finally {
      await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private async isCliAvailable(): Promise<boolean> {
    if (process.env.STEMVERSE_COMPILER_SIMULATE === '1') return false;
    try {
      await execFileAsync(this.cliPath, ['version'], { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  private simulateCompile(
    sourceCode: string,
    fqbn: string,
    sketchName: string,
    logs: string[],
  ): ArduinoCompileResult {
    logs.push('[simulate] arduino-cli not found — using build simulation');
    logs.push(`[simulate] FQBN: ${fqbn}`);

    const errors: ArduinoCompileError[] = [];
    if (!sourceCode.includes('void setup')) {
      errors.push({
        severity: 'error',
        message: 'Missing void setup() — Arduino sketch requires setup/loop',
        line: 1,
      });
    }
    if (sourceCode.includes('undefined_symbol_stemverse')) {
      errors.push({
        severity: 'error',
        message: 'undefined reference to stemverse',
      });
    }

    const success = !errors.some((e) => e.severity === 'error');
    logs.push(success ? '[simulate] Build succeeded' : '[simulate] Build failed');

    return {
      status: success ? 'completed' : 'failed',
      success,
      logs,
      errors,
      binary: success
        ? {
            path: `${sketchName}.ino.bin`,
            sizeBytes: Math.max(1024, sourceCode.length * 4),
            boardFqbn: fqbn,
            sketchName,
            compiledAt: new Date().toISOString(),
          }
        : undefined,
      simulated: true,
    };
  }

  private parseCompilerOutput(output: string): ArduinoCompileError[] {
    const errors: ArduinoCompileError[] = [];
    const lineRe = /:(\d+):(\d+):\s*(error|warning):\s*(.+)/gi;
    let match: RegExpExecArray | null;
    while ((match = lineRe.exec(output)) !== null) {
      errors.push({
        line: Number(match[1]),
        column: Number(match[2]),
        severity: match[3] as 'error' | 'warning',
        message: match[4].trim(),
      });
    }
    return errors;
  }
}
