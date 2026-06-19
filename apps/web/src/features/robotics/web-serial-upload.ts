// ============================================================================
// web-serial-upload.ts
//
// MicroPython Raw REPL upload via Web Serial API, and Arduino compile+upload
// via a local server API. Ported from serialUpload.js.
// ============================================================================

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

/** Status stages reported during an upload operation. */
export type UploadStatus =
  | 'idle'
  | 'waiting_port'
  | 'connecting'
  | 'interrupting'
  | 'entering_repl'
  | 'uploading'
  | 'reading_output'
  | 'success'
  | 'error';

/** Result returned by every upload function. */
export interface UploadResult {
  success: boolean;
  output: string;
}

/** Callback invoked whenever the upload status changes. */
export type StatusCallback = (status: UploadStatus) => void;

/** Shape of a port entry returned by the Arduino compile server. */
interface ServerPortInfo {
  port: string;
  board?: string;
  fqbn?: string;
  vid?: string;
  pid?: string;
}

/* -------------------------------------------------------------------------- */
/*                                 Constants                                  */
/* -------------------------------------------------------------------------- */

/** Default URL for the local Arduino compile & upload server. */
export const COMPILE_SERVER_URL = 'http://localhost:3001';

/** Size (in bytes) of each chunk sent during Raw REPL code transmission. */
const CHUNK_SIZE = 256;

/** Delay (ms) between successive code chunks to avoid overwhelming the board. */
const CHUNK_DELAY_MS = 20;

/** Maximum time (ms) to wait for data when reading the board's response. */
const READ_TIMEOUT_MS = 10_000;

/* -------------------------------------------------------------------------- */
/*                              Utility Helpers                               */
/* -------------------------------------------------------------------------- */

/**
 * Check whether the Web Serial API is available in the current environment.
 *
 * @returns `true` if `navigator.serial` exists, `false` otherwise.
 */
export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

/**
 * Encode a string into a `Uint8Array` using UTF-8.
 */
function encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/**
 * Sleep for `ms` milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Read from a `ReadableStreamDefaultReader<Uint8Array>` until `timeout` ms
 * elapse with no new data, then return everything collected so far as a string.
 */
async function readUntilTimeout(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  timeout: number = READ_TIMEOUT_MS,
): Promise<string> {
  const decoder = new TextDecoder();
  let result = '';

  const readChunk = async (): Promise<boolean> => {
    try {
      const { value, done } = await Promise.race([
        reader.read(),
        sleep(timeout).then(() => ({ value: undefined, done: true as const })),
      ]);
      if (done || value === undefined) return false;
      result += decoder.decode(value, { stream: true });
      return true;
    } catch {
      return false;
    }
  };

  // Keep reading until we hit the timeout or the stream ends.
  while (await readChunk()) {
    /* continue */
  }

  return result;
}

/**
 * Read from the serial reader until the `sentinel` string is found in the
 * accumulated response, or until `timeout` ms elapse.
 */
async function readUntilSentinel(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  sentinel: string,
  timeout: number = READ_TIMEOUT_MS,
): Promise<string> {
  const decoder = new TextDecoder();
  let result = '';
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    try {
      const remaining = deadline - Date.now();
      const { value, done } = await Promise.race([
        reader.read(),
        sleep(remaining).then(() => ({ value: undefined, done: true as const })),
      ]);
      if (done || value === undefined) break;
      result += decoder.decode(value, { stream: true });
      if (result.includes(sentinel)) break;
    } catch {
      break;
    }
  }

  return result;
}

/* -------------------------------------------------------------------------- */
/*                        MicroPython Raw REPL Upload                         */
/* -------------------------------------------------------------------------- */

/**
 * Upload MicroPython code to a board via the **Raw REPL** protocol over
 * Web Serial.
 *
 * ### Protocol overview
 * 1. Send **Ctrl+C** twice to interrupt any running program.
 * 2. Send **Ctrl+A** to enter Raw REPL mode.
 * 3. Transmit the code in 256-byte chunks with a 20 ms inter-chunk delay.
 * 4. Send **Ctrl+D** to compile & execute the code.
 * 5. Read the response framed as `OK<stdout>\x04<stderr>\x04`.
 * 6. On error, send **Ctrl+B** to exit Raw REPL.
 * 7. Release reader/writer locks.
 *
 * @param code     - The MicroPython source code to upload & execute.
 * @param port     - An already-opened `SerialPort` instance.
 * @param onStatus - Optional callback for progress updates.
 * @returns An `UploadResult` indicating success/failure and captured output.
 *
 * @example
 * ```ts
 * const port = await navigator.serial.requestPort();
 * await port.open({ baudRate: 115200 });
 * const result = await uploadMicroPython('print("hello")', port, console.log);
 * ```
 */
export async function uploadMicroPython(
  code: string,
  port: SerialPort,
  onStatus?: StatusCallback,
): Promise<UploadResult> {
  const status = (s: UploadStatus) => onStatus?.(s);

  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;

  try {
    // ---- Acquire reader & writer ------------------------------------
    status('connecting');

    if (!port.readable || !port.writable) {
      throw new Error(
        'Serial port is not open. Ensure port.open() was called before uploading.',
      );
    }

    reader = port.readable.getReader();
    writer = port.writable.getWriter();

    // After the guard above, reader and writer are guaranteed non-null.
    // Use local constants to satisfy TypeScript's narrowing.
    const r = reader;
    const w = writer;

    // ---- Step 1: Interrupt any running program ----------------------
    status('interrupting');
    await w.write(encode('\r\x03\x03')); // Ctrl+C twice
    await sleep(100);

    // Drain any pending data from the interrupt response.
    await readUntilTimeout(r, 500);

    // ---- Step 2: Enter Raw REPL (Ctrl+A) ----------------------------
    status('entering_repl');
    await w.write(encode('\r\x01')); // Ctrl+A
    await sleep(100);

    // Wait for the Raw REPL prompt indicator.
    const rawPrompt = await readUntilSentinel(r, 'raw REPL; CTRL-B to exit', 3_000);
    if (!rawPrompt.includes('raw REPL')) {
      throw new Error(
        'Failed to enter Raw REPL mode. Device did not respond with expected prompt.',
      );
    }

    // ---- Step 3: Send code in chunks --------------------------------
    status('uploading');
    const codeBytes = encode(code);

    for (let offset = 0; offset < codeBytes.length; offset += CHUNK_SIZE) {
      const chunk = codeBytes.slice(offset, offset + CHUNK_SIZE);
      await w.write(chunk);
      await sleep(CHUNK_DELAY_MS);
    }

    // ---- Step 4: Execute (Ctrl+D) -----------------------------------
    await w.write(encode('\x04')); // Ctrl+D

    // ---- Step 5: Read response --------------------------------------
    status('reading_output');

    // The Raw REPL response is framed as:  OK<stdout>\x04<stderr>\x04
    const response = await readUntilSentinel(r, '\x04\x04', READ_TIMEOUT_MS);

    // Parse the framed response.
    let stdout = '';
    let stderr = '';

    const okIndex = response.indexOf('OK');
    if (okIndex !== -1) {
      const afterOk = response.substring(okIndex + 2);
      const parts = afterOk.split('\x04');
      stdout = parts[0] ?? '';
      stderr = parts[1] ?? '';
    } else {
      // Couldn't find standard framing — treat everything as output.
      stdout = response;
    }

    // Trim control characters from output.
    stdout = stdout.trim();
    stderr = stderr.trim();

    if (stderr.length > 0) {
      // An error occurred during execution — exit Raw REPL.
      status('error');
      await w.write(encode('\x02')); // Ctrl+B — exit Raw REPL
      return { success: false, output: stderr };
    }

    status('success');
    return { success: true, output: stdout };
  } catch (err: unknown) {
    status('error');
    const message =
      err instanceof Error ? err.message : 'Unknown error during MicroPython upload';
    return { success: false, output: message };
  } finally {
    // ---- Step 7: Release locks --------------------------------------
    try {
      reader?.releaseLock();
    } catch {
      /* reader already released */
    }
    try {
      writer?.releaseLock();
    } catch {
      /* writer already released */
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                       Arduino Upload via Server API                        */
/* -------------------------------------------------------------------------- */

/**
 * Upload Arduino (C/C++) code by sending it to a local compile server which
 * handles compilation and flashing.
 *
 * ### Flow
 * 1. `GET /api/ports` — discover available serial ports on the server host.
 * 2. Pick the first port (or the only one available).
 * 3. `POST /api/upload` with `{ code, port }` — compile & flash.
 *
 * @param code      - The Arduino source code to compile and upload.
 * @param serverUrl - Base URL of the compile server (default: `COMPILE_SERVER_URL`).
 * @param onStatus  - Optional callback for progress updates.
 * @returns An `UploadResult` indicating success/failure and server output.
 *
 * @example
 * ```ts
 * const result = await uploadArduinoViaServer(
 *   'void setup(){} void loop(){}',
 *   'http://localhost:3001',
 * );
 * ```
 */
export async function uploadArduinoViaServer(
  code: string,
  serverUrl: string = COMPILE_SERVER_URL,
  onStatus?: StatusCallback,
): Promise<UploadResult> {
  const status = (s: UploadStatus) => onStatus?.(s);

  try {
    // ---- Step 1: Discover available ports ----------------------------
    status('waiting_port');

    const portsResponse = await fetch(`${serverUrl}/api/ports`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!portsResponse.ok) {
      throw new Error(
        `Failed to fetch ports from server (HTTP ${portsResponse.status}): ${await portsResponse.text()}`,
      );
    }

    const portsData: { ports: ServerPortInfo[] } = await portsResponse.json();
    const ports = portsData.ports;

    if (!ports || ports.length === 0) {
      throw new Error(
        'No serial ports found on the server. Ensure an Arduino board is connected.',
      );
    }

    // ---- Step 2: Select a port --------------------------------------
    // For now we pick the first available port. A future enhancement could
    // prompt the user if multiple ports are available.
    const selectedPort = ports[0]!.port;

    // ---- Step 3: Compile & upload -----------------------------------
    status('connecting');
    status('uploading');

    const uploadResponse = await fetch(`${serverUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, port: selectedPort }),
    });

    const uploadData: { success?: boolean; output?: string; error?: string } =
      await uploadResponse.json();

    if (!uploadResponse.ok || uploadData.success === false) {
      status('error');
      return {
        success: false,
        output: uploadData.error ?? uploadData.output ?? 'Upload failed with no details.',
      };
    }

    status('success');
    return {
      success: true,
      output: uploadData.output ?? 'Upload completed successfully.',
    };
  } catch (err: unknown) {
    status('error');
    const message =
      err instanceof Error ? err.message : 'Unknown error during Arduino server upload';
    return { success: false, output: message };
  }
}
