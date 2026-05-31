import { describe, expect, it } from 'vitest';
import {
  generatePlatformioIni,
  generateSdkconfigDefaults,
  generateEsp32ProjectExport,
  isEsp32Board,
  resolveCodegenTarget,
  IOT_BLOCK_TYPES,
} from '@stemverse/blockly-engine';

describe('ESP32 export', () => {
  it('generates platformio.ini for esp32 and esp32_s3', () => {
    expect(generatePlatformioIni('esp32')).toContain('esp32dev');
    expect(generatePlatformioIni('esp32_s3')).toContain('esp32-s3-devkitc-1');
    expect(generatePlatformioIni('esp32')).toContain('framework = espidf');
  });

  it('generates sdkconfig.defaults with correct target', () => {
    expect(generateSdkconfigDefaults('esp32')).toContain('CONFIG_IDF_TARGET="esp32"');
    expect(generateSdkconfigDefaults('esp32_s3')).toContain('CONFIG_IDF_TARGET="esp32s3"');
  });

  it('exports full project file map', () => {
    const exp = generateEsp32ProjectExport('esp32', 'void app_main(){}', 'Test');
    expect(exp.files['main/main.c']).toContain('app_main');
    expect(exp.files['platformio.ini']).toBeDefined();
    expect(exp.files['sdkconfig.defaults']).toBeDefined();
  });
});

describe('codegen target', () => {
  it('resolves esp_idf for esp32 boards', () => {
    expect(isEsp32Board('esp32')).toBe(true);
    expect(resolveCodegenTarget('esp32')).toBe('esp_idf');
    expect(resolveCodegenTarget('arduino_uno')).toBe('arduino_cpp');
  });
});

describe('IoT blocks', () => {
  it('registers 21 IoT block types', () => {
    expect(IOT_BLOCK_TYPES).toHaveLength(21);
  });
});
