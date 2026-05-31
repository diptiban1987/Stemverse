import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import * as Blockly from 'blockly/core';
import {
  initBlocklyEngine,
  registerRoboticsBlocks,
  generateArduinoFromWorkspace,
  getBoard,
  listBoards,
  isValidDigitalPin,
  ROBOTICS_BLOCK_TYPES,
  serializeWorkspace,
  loadWorkspaceDocument,
  createEmptyWorkspace,
  parseWorkspaceDocument,
  workspaceDocumentToJson,
  validateWorkspace,
  collectWorkspaceLibraries,
  hydrateComponentRegistry,
  listRegistrySensors,
  STATIC_SENSORS,
  applyProjectTemplate,
  listProjectTemplates,
  generateEspIdfFromWorkspace,
  generateMicroPythonFromWorkspace,
  generateCircuitPythonFromWorkspace,
  generatePlatformioIni,
  generateSdkconfigDefaults,
  resolveCodegenTarget,
  IOT_BLOCK_TYPES,
  HARDWARE_EXPANSION_BLOCK_TYPES,
  DISPLAY_BLOCK_TYPES,
  registerIoTBlocks,
  registerHardwareExpansionBlocks,
  listRegistryDisplays,
  STATIC_DISPLAYS,
  createMockSerial,
  resetComponentRegistry,
} from '../src';

describe('board registry', () => {
  it('lists 10 supported boards', () => {
    expect(listBoards()).toHaveLength(10);
  });

  it('returns arduino_uno by default for unknown ids', () => {
    expect(getBoard('unknown').id).toBe('arduino_uno');
  });

  it('validates digital pins per board', () => {
    expect(isValidDigitalPin('arduino_uno', 13)).toBe(true);
    expect(isValidDigitalPin('arduino_uno', 99)).toBe(false);
  });
});

describe('component registry', () => {
  it('lists 11 sensors statically', () => {
    expect(STATIC_SENSORS).toHaveLength(11);
    expect(listRegistrySensors()).toHaveLength(11);
  });

  it('hydrates from database payload', () => {
    const snapshot = hydrateComponentRegistry({
      sensors: [{ ...STATIC_SENSORS[0], name: 'Custom DHT11' }],
    });
    expect(snapshot.source).toBe('database');
    expect(snapshot.sensors[0].name).toBe('Custom DHT11');
  });
});

describe('robotics blocks', () => {
  it('registers core MVP block types', () => {
    expect(ROBOTICS_BLOCK_TYPES).toHaveLength(25);
  });

  it('registers sensor and actuator blocks', () => {
    registerRoboticsBlocks();
    expect(Blockly.Blocks['stemverse_sensor_read']).toBeDefined();
    expect(Blockly.Blocks['stemverse_servo_write']).toBeDefined();
  });
});

describe('library dependencies', () => {
  beforeEach(() => resetComponentRegistry());

  it('collects DHT library for sensor blocks', () => {
    const block = {
      type: 'stemverse_sensor_read',
      getFieldValue: (name: string) => (name === 'SENSOR' ? 'dht22' : ''),
    };
    const libs = collectWorkspaceLibraries([block]);
    expect(libs).toContain('DHT.h');
    expect(libs).toContain('Arduino.h');
  });
});

describe('validation engine', () => {
  let workspace: Blockly.Workspace;

  beforeEach(() => {
    initBlocklyEngine();
    workspace = new Blockly.Workspace();
  });

  afterEach(() => {
    workspace.dispose();
  });

  it('flags invalid digital pin', () => {
    const block = workspace.newBlock('stemverse_digital_write');
    block.setFieldValue(99, 'PIN');
    block.setFieldValue('HIGH', 'VALUE');
    const result = validateWorkspace([block], 'arduino_uno');
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_DIGITAL_PIN')).toBe(true);
  });

  it('warns on duplicate output pins', () => {
    const a = workspace.newBlock('stemverse_digital_write');
    a.setFieldValue(13, 'PIN');
    a.setFieldValue('HIGH', 'VALUE');
    const b = workspace.newBlock('stemverse_digital_write');
    b.setFieldValue(13, 'PIN');
    b.setFieldValue('LOW', 'VALUE');
    const result = validateWorkspace([a, b], 'arduino_uno');
    expect(result.issues.some((i) => i.code === 'DUPLICATE_PIN')).toBe(true);
  });
});

describe('arduino generator', () => {
  let workspace: Blockly.Workspace;

  beforeEach(() => {
    initBlocklyEngine();
    workspace = new Blockly.Workspace();
  });

  afterEach(() => {
    workspace.dispose();
  });

  it('generates setup and loop from program block', () => {
    const program = workspace.newBlock('stemverse_program');
    const setupInner = workspace.newBlock('stemverse_configure_pin');
    setupInner.setFieldValue(13, 'PIN');
    setupInner.setFieldValue('OUTPUT', 'MODE');
    const loopInner = workspace.newBlock('stemverse_digital_write');
    loopInner.setFieldValue(13, 'PIN');
    loopInner.setFieldValue('HIGH', 'VALUE');

    program.getInput('SETUP')!.connection!.connect(setupInner.previousConnection!);
    program.getInput('LOOP')!.connection!.connect(loopInner.previousConnection!);

    const result = generateArduinoFromWorkspace(workspace, 'Arduino Uno');
    expect(result.code).toContain('pinMode(13, OUTPUT);');
    expect(result.code).toContain('digitalWrite(13, HIGH);');
    expect(result.code).toContain('void setup()');
    expect(result.code).toContain('#include <Arduino.h>');
  });

  it('generates servo globals and includes', () => {
    const servo = workspace.newBlock('stemverse_servo_write');
    servo.setFieldValue(9, 'PIN');
    servo.setFieldValue(90, 'ANGLE');
    const result = generateArduinoFromWorkspace(workspace, 'Arduino Uno');
    expect(result.code).toContain('Servo servo_9');
    expect(result.includes).toContain('Servo.h');
  });
});

describe('project templates', () => {
  let workspace: Blockly.Workspace;

  beforeEach(() => {
    initBlocklyEngine();
    workspace = new Blockly.Workspace();
  });

  afterEach(() => {
    workspace.dispose();
  });

  it('provides 6 starter templates', () => {
    expect(listProjectTemplates()).toHaveLength(6);
  });

  it('applies LED blink template', () => {
    const meta = applyProjectTemplate(workspace, 'led_blink');
    expect(meta.name).toBe('LED Blink');
    expect(workspace.getAllBlocks(false).length).toBeGreaterThan(3);
  });
});

describe('Phase 3 — ESP-IDF & IoT', () => {
  it('registers 21 IoT block types', () => {
    registerIoTBlocks();
    expect(IOT_BLOCK_TYPES).toHaveLength(21);
    expect(Blockly.Blocks['stemverse_wifi_begin']).toBeDefined();
    expect(Blockly.Blocks['stemverse_mqtt_connect']).toBeDefined();
  });

  it('generates ESP-IDF code for esp32 board', () => {
    initBlocklyEngine();
    const ws = new Blockly.Workspace();
    const wifi = ws.newBlock('stemverse_wifi_begin');
    wifi.setFieldValue('TestNet', 'SSID');
    wifi.setFieldValue('pass', 'PASSWORD');
    const result = generateEspIdfFromWorkspace(ws, 'esp32', 'ESP32');
    expect(result.code).toContain('app_main');
    expect(result.code).toContain('stemverse_wifi_connect');
    expect(result.includes.some((i) => i.includes('esp_wifi'))).toBe(true);
    ws.dispose();
  });

  it('exports platformio.ini and sdkconfig for esp32_s3', () => {
    expect(generatePlatformioIni('esp32_s3')).toContain('esp32-s3');
    expect(generateSdkconfigDefaults('esp32_s3')).toContain('esp32s3');
  });

  it('mock serial connects and logs', () => {
    const serial = createMockSerial();
    const logs: string[] = [];
    serial.onLog((e) => logs.push(e.text));
    serial.connect(115200);
    serial.write('AT');
    expect(serial.isConnected()).toBe(true);
    expect(logs.some((l) => l.includes('Connected'))).toBe(true);
    serial.disconnect();
  });

  it('collects WiFi and MQTT libraries for Arduino ESP32', () => {
    resetComponentRegistry();
    const blocks = [
      { type: 'stemverse_mqtt_connect', getFieldValue: () => '' },
      { type: 'stemverse_wifi_begin', getFieldValue: () => '' },
    ];
    const libs = collectWorkspaceLibraries(blocks);
    expect(libs).toContain('WiFi.h');
    expect(libs).toContain('PubSubClient.h');
  });
});

describe('Phase 3.5 — Hardware & Runtime Expansion', () => {
  it('registers 39 hardware expansion blocks', () => {
    registerHardwareExpansionBlocks();
    expect(HARDWARE_EXPANSION_BLOCK_TYPES).toHaveLength(39);
    expect(DISPLAY_BLOCK_TYPES).toHaveLength(14);
  });

  it('lists 3 display components in registry', () => {
    expect(STATIC_DISPLAYS).toHaveLength(3);
    expect(listRegistryDisplays()).toHaveLength(3);
  });

  it('generates MicroPython from differential drive block', () => {
    initBlocklyEngine();
    const ws = new Blockly.Workspace();
    const drive = ws.newBlock('stemverse_diff_forward');
    drive.setFieldValue(5, 'LEFT');
    drive.setFieldValue(6, 'RIGHT');
    drive.setFieldValue(200, 'SPEED');
    const result = generateMicroPythonFromWorkspace(ws, 'ESP32');
    expect(result.code).toContain('motor_drive');
    expect(result.code).toContain('def setup():');
    ws.dispose();
  });

  it('generates CircuitPython with display init', () => {
    initBlocklyEngine();
    const ws = new Blockly.Workspace();
    const oled = ws.newBlock('stemverse_oled_init');
    oled.setFieldValue(21, 'SDA');
    oled.setFieldValue(22, 'SCL');
    oled.setFieldValue(0x3c, 'ADDR');
    const result = generateCircuitPythonFromWorkspace(ws, 'ESP32-S3');
    expect(result.code).toContain('SSD1306_I2C');
    ws.dispose();
  });

  it('generates Arduino code for LCD and filesystem blocks', () => {
    initBlocklyEngine();
    const ws = new Blockly.Workspace();
    const lcd = ws.newBlock('stemverse_lcd_print');
    lcd.setFieldValue('Hello', 'TEXT');
    const fs = ws.newBlock('stemverse_fs_write');
    fs.setFieldValue('SPIFFS', 'FS');
    fs.setFieldValue('log.txt', 'PATH');
    fs.setFieldValue('ok', 'DATA');
    const result = generateArduinoFromWorkspace(ws, 'Arduino Uno');
    expect(result.code).toContain('lcd.print');
    expect(result.code).toContain('SPIFFS.open');
    ws.dispose();
  });

  it('resolves micropython and circuitpython codegen targets', () => {
    expect(resolveCodegenTarget('esp32', 'micropython')).toBe('micropython');
    expect(resolveCodegenTarget('arduino_uno', 'circuitpython')).toBe('circuitpython');
  });
});

describe('workspace persistence', () => {
  let workspace: Blockly.Workspace;

  beforeEach(() => {
    registerRoboticsBlocks();
    workspace = new Blockly.Workspace();
  });

  afterEach(() => {
    workspace.dispose();
  });

  it('round-trips workspace document', () => {
    const block = workspace.newBlock('stemverse_digital_write');
    block.setFieldValue(7, 'PIN');
    block.setFieldValue('LOW', 'VALUE');

    const doc = serializeWorkspace(workspace, {
      project_id: 'test-1',
      name: 'Blink',
      board: 'arduino_uno',
    });

    const ws2 = new Blockly.Workspace();
    loadWorkspaceDocument(ws2, doc);
    expect(ws2.getAllBlocks(false).some((b) => b.type === 'stemverse_digital_write')).toBe(true);
    ws2.dispose();
  });

  it('creates and parses empty workspace document', () => {
    const doc = createEmptyWorkspace({ name: 'New' });
    const parsed = parseWorkspaceDocument(workspaceDocumentToJson(doc));
    expect(parsed.name).toBe('New');
  });
});
