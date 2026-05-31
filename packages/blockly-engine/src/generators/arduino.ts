import * as Blockly from 'blockly/core';
import { CodeGenerator, type Block } from 'blockly/core';
import { collectWorkspaceLibraries, formatIncludeStatements, workspaceUsesIoT } from '../libraries/dependencies';
import { getRegistrySensor } from '../registry/component-registry';
import { registerIotBlockGenerators, ARDUINO_IOT_GLOBALS } from './iot-generators';
import { registerCoreBlockGenerators } from './core-generators';
import {
  registerExpansionBlockGenerators,
  EXPANSION_ARDUINO_GLOBALS,
  EXPANSION_ARDUINO_HELPERS,
} from './expansion-generators';
import { HARDWARE_EXPANSION_BLOCK_TYPES } from '../blocks/hardware';

const ATOMIC = 0;

export const arduinoGenerator = new CodeGenerator('Arduino');

registerIotBlockGenerators(arduinoGenerator, 'arduino');
registerExpansionBlockGenerators(arduinoGenerator, 'arduino');
registerCoreBlockGenerators(arduinoGenerator, 'arduino');

arduinoGenerator.addReservedWords(
  'setup,loop,if,else,for,switch,case,break,continue,return,void,boolean,byte,int,long,float,double,char,string,array,true,false,HIGH,LOW,INPUT,OUTPUT,DHT,DHT11,DHT22,Servo,Stepper',
);

const globals = new Set<string>();
const helpers = new Set<string>();
const constants = new Map<string, number>();
const variables = new Set<string>();
const functions = new Map<string, string>();
const setupExtras = new Set<string>();

function resetGeneratorState() {
  globals.clear();
  helpers.clear();
  constants.clear();
  variables.clear();
  functions.clear();
  setupExtras.clear();
}

function statementToCode(block: Block | null): string {
  if (!block) return '';
  return arduinoGenerator.blockToCode(block) as string;
}

function indent(code: string, spaces = 2): string {
  return code
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => `${' '.repeat(spaces)}${line}`)
    .join('\n');
}

function ensureDhtGlobal(pin: number, sensor: string) {
  const type = sensor === 'dht11' ? 'DHT11' : 'DHT22';
  globals.add(`DHT dht_${pin}(${pin}, ${type});`);
  setupExtras.add(`dht_${pin}.begin();`);
}

function ensureServoGlobal(pin: number) {
  globals.add(`Servo servo_${pin};`);
  setupExtras.add(`servo_${pin}.attach(${pin});`);
}

function sensorReadExpression(block: Block): string {
  const sensor = block.getFieldValue('SENSOR');
  const property = block.getFieldValue('PROPERTY');
  const pin = block.getFieldValue('PIN');
  const def = getRegistrySensor(sensor);

  switch (def?.generatorKey ?? sensor) {
    case 'dht':
      ensureDhtGlobal(Number(pin), sensor);
      if (property === 'humidity') return `dht_${pin}.readHumidity()`;
      return `dht_${pin}.readTemperature()`;
    case 'hcsr04': {
      const echo = block.getField('ECHO') ? block.getFieldValue('ECHO') : Number(pin) + 1;
      helpers.add(`float stemverse_distance_cm_${pin}(int trig, int echo) {
  digitalWrite(trig, LOW);
  delayMicroseconds(2);
  digitalWrite(trig, HIGH);
  delayMicroseconds(10);
  digitalWrite(trig, LOW);
  long duration = pulseIn(echo, HIGH, 30000);
  return duration * 0.034 / 2;
}`);
      setupExtras.add(`pinMode(${pin}, OUTPUT);`);
      setupExtras.add(`pinMode(${echo}, INPUT);`);
      return `stemverse_distance_cm_${pin}(${pin}, ${echo})`;
    }
    case 'digital':
      setupExtras.add(`pinMode(${pin}, INPUT);`);
      return `digitalRead(${pin})`;
    case 'analog':
      return `analogRead(${pin})`;
    case 'ds18b20':
      globals.add(`OneWire oneWire_${pin}(${pin});`);
      globals.add(`DallasTemperature sensors_${pin}(&oneWire_${pin});`);
      setupExtras.add(`sensors_${pin}.begin();`);
      helpers.add(`float stemverse_ds18b20_${pin}() {
  sensors_${pin}.requestTemperatures();
  return sensors_${pin}.getTempCByIndex(0);
}`);
      return `stemverse_ds18b20_${pin}()`;
    case 'bmp280':
    case 'bme280':
      globals.add(`// ${def?.name ?? sensor} on I2C — init in setup`);
      setupExtras.add(`Wire.begin();`);
      if (property === 'humidity') return `/* bme280 humidity */ 50.0`;
      if (property === 'pressure') return `/* ${sensor} pressure hPa */ 1013.25`;
      return `/* ${sensor} temperature C */ 25.0`;
    case 'mpu6050':
      if (property.startsWith('accel')) return `/* MPU6050 ${property} */ 0.0`;
      return `/* MPU6050 ${property} */ 0.0`;
    default:
      return `0 /* unknown sensor ${sensor} */`;
  }
}

// --- Core blocks ---
arduinoGenerator.forBlock['stemverse_program'] = () => '';
arduinoGenerator.forBlock['stemverse_setup'] = () => '';
arduinoGenerator.forBlock['stemverse_loop'] = () => '';

arduinoGenerator.forBlock['stemverse_function_def'] = function (block: Block) {
  const name = block.getFieldValue('NAME');
  functions.set(name, statementToCode(block.getInputTargetBlock('BODY')));
  return '';
};

arduinoGenerator.forBlock['stemverse_call_function'] = function (block: Block) {
  return `${block.getFieldValue('NAME')}();\n`;
};

arduinoGenerator.forBlock['stemverse_set_variable'] = function (block: Block) {
  const varName = block.getFieldValue('VAR');
  variables.add(`int ${varName}`);
  const value = arduinoGenerator.valueToCode(block, 'VALUE', ATOMIC) || '0';
  return `${varName} = ${value};\n`;
};

arduinoGenerator.forBlock['stemverse_constant'] = function (block: Block) {
  constants.set(block.getFieldValue('NAME'), Number(block.getFieldValue('VALUE')));
  return '';
};

arduinoGenerator.forBlock['stemverse_comment'] = function (block: Block) {
  return `// ${block.getFieldValue('TEXT')}\n`;
};

arduinoGenerator.forBlock['stemverse_include_library'] = () => '';

arduinoGenerator.forBlock['stemverse_configure_pin'] = function (block: Block) {
  return `pinMode(${block.getFieldValue('PIN')}, ${block.getFieldValue('MODE')});\n`;
};

arduinoGenerator.forBlock['stemverse_digital_write'] = function (block: Block) {
  return `digitalWrite(${block.getFieldValue('PIN')}, ${block.getFieldValue('VALUE')});\n`;
};

arduinoGenerator.forBlock['stemverse_digital_read'] = function (block: Block) {
  return [`digitalRead(${block.getFieldValue('PIN')})`, ATOMIC];
};

arduinoGenerator.forBlock['stemverse_toggle_pin'] = function (block: Block) {
  const pin = block.getFieldValue('PIN');
  return `digitalWrite(${pin}, !digitalRead(${pin}));\n`;
};

arduinoGenerator.forBlock['stemverse_analog_read'] = function (block: Block) {
  return [`analogRead(${block.getFieldValue('PIN')})`, ATOMIC];
};

arduinoGenerator.forBlock['stemverse_analog_write'] = function (block: Block) {
  return `analogWrite(${block.getFieldValue('PIN')}, ${block.getFieldValue('VALUE')});\n`;
};

arduinoGenerator.forBlock['stemverse_dac_output'] = function (block: Block) {
  return `dacWrite(${block.getFieldValue('PIN')}, ${block.getFieldValue('VALUE')});\n`;
};

arduinoGenerator.forBlock['stemverse_pwm_setup'] = function (block: Block) {
  const pin = block.getFieldValue('PIN');
  const freq = block.getFieldValue('FREQ');
  return `#if defined(ESP32)\nledcSetup(${pin}, ${freq}, 8);\nledcAttachPin(${pin});\n#else\npinMode(${pin}, OUTPUT);\n#endif\n`;
};

arduinoGenerator.forBlock['stemverse_pwm_write'] = function (block: Block) {
  const pin = block.getFieldValue('PIN');
  const duty = block.getFieldValue('DUTY');
  return `#if defined(ESP32)\nledcWrite(${pin}, ${duty});\n#else\nanalogWrite(${pin}, ${duty});\n#endif\n`;
};

arduinoGenerator.forBlock['stemverse_attach_interrupt'] = function (block: Block) {
  const pin = block.getFieldValue('PIN');
  return `attachInterrupt(digitalPinToInterrupt(${pin}), ISR_${pin}, ${block.getFieldValue('MODE')});\n`;
};

arduinoGenerator.forBlock['stemverse_detach_interrupt'] = function (block: Block) {
  return `detachInterrupt(digitalPinToInterrupt(${block.getFieldValue('PIN')}));\n`;
};

arduinoGenerator.forBlock['stemverse_delay'] = function (block: Block) {
  return `delay(${block.getFieldValue('MS')});\n`;
};

arduinoGenerator.forBlock['stemverse_delay_micros'] = function (block: Block) {
  return `delayMicroseconds(${block.getFieldValue('US')});\n`;
};

arduinoGenerator.forBlock['stemverse_millis'] = () => ['millis()', ATOMIC];
arduinoGenerator.forBlock['stemverse_micros'] = () => ['micros()', ATOMIC];

arduinoGenerator.forBlock['stemverse_serial_begin'] = function (block: Block) {
  return `Serial.begin(${block.getFieldValue('BAUD')});\n`;
};

// --- Sensor blocks ---
arduinoGenerator.forBlock['stemverse_sensor_read'] = function (block: Block) {
  return [sensorReadExpression(block), ATOMIC];
};

// --- Actuator blocks ---
arduinoGenerator.forBlock['stemverse_servo_write'] = function (block: Block) {
  const pin = Number(block.getFieldValue('PIN'));
  ensureServoGlobal(pin);
  return `servo_${pin}.write(${block.getFieldValue('ANGLE')});\n`;
};

arduinoGenerator.forBlock['stemverse_relay_write'] = function (block: Block) {
  return `digitalWrite(${block.getFieldValue('PIN')}, ${block.getFieldValue('STATE')});\n`;
};

arduinoGenerator.forBlock['stemverse_buzzer_play'] = function (block: Block) {
  const pin = block.getFieldValue('PIN');
  const freq = block.getFieldValue('FREQ');
  const dur = block.getFieldValue('DURATION');
  return `tone(${pin}, ${freq}, ${dur});\n`;
};

arduinoGenerator.forBlock['stemverse_rgb_led'] = function (block: Block) {
  const r = block.getFieldValue('PIN_R');
  const g = block.getFieldValue('PIN_G');
  const b = block.getFieldValue('PIN_B');
  return `analogWrite(${r}, ${block.getFieldValue('R')});\nanalogWrite(${g}, ${block.getFieldValue('G_VAL')});\nanalogWrite(${b}, ${block.getFieldValue('B_VAL')});\n`;
};

arduinoGenerator.forBlock['stemverse_stepper_move'] = function (block: Block) {
  const p1 = block.getFieldValue('PIN1');
  globals.add(`Stepper stepper_motor(2048, ${p1}, ${block.getFieldValue('PIN2')}, ${block.getFieldValue('PIN3')}, ${block.getFieldValue('PIN4')});`);
  setupExtras.add(`stepper_motor.setSpeed(10);`);
  return `stepper_motor.step(${block.getFieldValue('STEPS')});\n`;
};

arduinoGenerator.forBlock['stemverse_dc_motor'] = function (block: Block) {
  const pinA = block.getFieldValue('PIN_A');
  const pinB = block.getFieldValue('PIN_B');
  const speed = block.getFieldValue('SPEED');
  const dir = block.getFieldValue('DIRECTION');
  if (dir === 'FORWARD') {
    return `analogWrite(${pinA}, ${speed});\nanalogWrite(${pinB}, 0);\n`;
  }
  return `analogWrite(${pinA}, 0);\nanalogWrite(${pinB}, ${speed});\n`;
};

export type GeneratedArduinoCode = {
  code: string;
  includes: string[];
  globals: string[];
  helpers: string[];
  constants: Record<string, number>;
  variables: string[];
  functions: Record<string, string>;
  validationWarnings: string[];
};

export function generateArduinoFromWorkspace(
  workspace: Blockly.Workspace,
  boardName: string,
): GeneratedArduinoCode {
  resetGeneratorState();

  const allBlocks = workspace.getAllBlocks(false);
  const topBlocks = workspace.getTopBlocks(true);
  const programBlock = topBlocks.find((b) => b.type === 'stemverse_program');

  let setupCode = '';
  let loopCode = '';

  if (programBlock) {
    setupCode = statementToCode(programBlock.getInputTargetBlock('SETUP'));
    loopCode = statementToCode(programBlock.getInputTargetBlock('LOOP'));
  } else {
    for (const block of topBlocks) {
      if (block.type === 'stemverse_function_def') continue;
      loopCode += arduinoGenerator.blockToCode(block);
    }
  }

  for (const block of allBlocks) {
    if (['stemverse_constant', 'stemverse_function_def', 'stemverse_sensor_read'].includes(block.type)) {
      arduinoGenerator.blockToCode(block);
    }
  }

  const libraries = collectWorkspaceLibraries(allBlocks);
  if (workspaceUsesIoT(allBlocks)) {
    for (const g of ARDUINO_IOT_GLOBALS) globals.add(g);
  }
  if (allBlocks.some((b) => (HARDWARE_EXPANSION_BLOCK_TYPES as readonly string[]).includes(b.type))) {
    for (const g of EXPANSION_ARDUINO_GLOBALS) globals.add(g);
    helpers.add(EXPANSION_ARDUINO_HELPERS);
  }
  const includeBlock = formatIncludeStatements(libraries);

  const constantLines = [...constants.entries()]
    .map(([name, value]) => `const int ${name} = ${value};`)
    .join('\n');
  const globalLines = [...globals].join('\n');
  const variableLines = [...variables].join('\n');
  const helperLines = [...helpers].join('\n\n');
  const functionLines = [...functions.entries()]
    .map(([name, body]) => `void ${name}() {\n${indent(body)}\n}`)
    .join('\n\n');
  const setupInit = [...setupExtras].map((l) => indent(l)).join('\n');

  const header = [
    `// STEMVerse Robotics — ${boardName}`,
    '// Production-ready Arduino C++ — auto-generated',
    `// Blocks: ${allBlocks.length} | Libraries: ${libraries.length}`,
  ].join('\n');

  const code = [
    header,
    '',
    includeBlock,
    '',
    constantLines,
    globalLines,
    variableLines,
    helperLines,
    functionLines,
    'void setup() {',
    setupInit,
    indent(setupCode || '// no setup blocks'),
    '}',
    '',
    'void loop() {',
    indent(loopCode || '// no loop blocks'),
    '}',
  ]
    .filter((section) => section !== '')
    .join('\n');

  return {
    code,
    includes: libraries,
    globals: [...globals],
    helpers: [...helpers],
    constants: Object.fromEntries(constants),
    variables: [...variables],
    functions: Object.fromEntries(functions),
    validationWarnings: [],
  };
}
