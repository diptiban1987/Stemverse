import { describe, expect, it } from 'vitest';
import { ArduinoCliService } from '../src/compile/arduino-cli.service';

describe('Arduino CLI integration', () => {
  const service = new ArduinoCliService();

  it('simulates compile when CLI unavailable', async () => {
    process.env.STEMVERSE_COMPILER_SIMULATE = '1';
    const result = await service.compileSketch({
      sourceCode: 'void setup() {}\nvoid loop() {}',
      board: 'arduino_uno',
      projectName: 'blink',
    });
    expect(result.simulated).toBe(true);
    expect(result.success).toBe(true);
    expect(result.binary?.sizeBytes).toBeGreaterThan(0);
    expect(result.status).toBe('completed');
    delete process.env.STEMVERSE_COMPILER_SIMULATE;
  });

  it('reports errors for invalid sketch in simulation', async () => {
    process.env.STEMVERSE_COMPILER_SIMULATE = '1';
    const result = await service.compileSketch({
      sourceCode: 'int main() { return 0; }',
      board: 'arduino_uno',
    });
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.severity === 'error')).toBe(true);
    delete process.env.STEMVERSE_COMPILER_SIMULATE;
  });

  it('includes binary metadata fields', async () => {
    process.env.STEMVERSE_COMPILER_SIMULATE = '1';
    const result = await service.compileSketch({
      sourceCode: 'void setup() {}\nvoid loop() {}',
      board: 'arduino_uno',
      projectName: 'test_sketch',
    });
    expect(result.binary?.boardFqbn).toContain('uno');
    expect(result.binary?.sketchName).toBe('test_sketch');
    expect(result.binary?.compiledAt).toBeDefined();
    delete process.env.STEMVERSE_COMPILER_SIMULATE;
  });
});
