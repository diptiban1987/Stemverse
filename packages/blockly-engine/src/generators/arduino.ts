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
import { registerVoiceBlockGenerators } from './voice-generators';

const ATOMIC = 0;

export const arduinoGenerator = new CodeGenerator('Arduino');

registerIotBlockGenerators(arduinoGenerator, 'arduino');
registerExpansionBlockGenerators(arduinoGenerator, 'arduino');
registerCoreBlockGenerators(arduinoGenerator, 'arduino');
registerVoiceBlockGenerators(arduinoGenerator, 'arduino');

arduinoGenerator.addReservedWords(
  'setup,loop,if,else,for,switch,case,break,continue,return,void,boolean,byte,int,long,float,double,char,string,array,true,false,HIGH,LOW,INPUT,OUTPUT,DHT,DHT11,DHT22,Servo,Stepper',
);

/**
 * scrub_ is called by blockToCode() after generating code for a block.
 * It chains the current block's code with the next block in the stack.
 * Without this override, the default CodeGenerator.scrub_() does NOT
 * follow next-block connections, so only the first block generates code.
 */
arduinoGenerator.scrub_ = function (block: Block, code: string, opt_thisOnly?: boolean): string {
  const nextBlock = block.nextConnection && block.nextConnection.targetBlock();
  if (nextBlock && !opt_thisOnly) {
    return code + arduinoGenerator.blockToCode(nextBlock);
  }
  return code;
};

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
      globals.add(`// ${def?.name ?? sensor} on I2C - init in setup`);
      setupExtras.add(`Wire.begin();`);
      if (property === 'humidity') return `/* bme280 humidity */ 50.0`;
      if (property === 'pressure') return `/* ${sensor} pressure hPa */ 1013.25`;
      return `/* ${sensor} temperature C */ 25.0`;
    case 'mpu6050':
      if (property.startsWith('accel')) return `/* MPU6050 ${property} */ 0.0`;
      return `/* MPU6050 ${property} */ 0.0`;

    // --- SHT3x (SHT30/31/35) I2C temperature + humidity ---
    case 'sht3x':
      globals.add('Adafruit_SHT31 sht31;');
      setupExtras.add('Wire.begin();');
      setupExtras.add('sht31.begin(0x44);');
      if (property === 'humidity') return 'sht31.readHumidity()';
      return 'sht31.readTemperature()';

    // --- AHT20 / AHT21 I2C temperature + humidity ---
    case 'aht20':
      globals.add('Adafruit_AHTX0 aht;');
      setupExtras.add('Wire.begin();');
      setupExtras.add('aht.begin();');
      helpers.add(`float stemverse_aht20_read(const char* prop) {
  sensors_event_t h, t;
  aht.getEvent(&h, &t);
  if (strcmp(prop, "humidity") == 0) return h.relative_humidity;
  return t.temperature;
}`);
      return `stemverse_aht20_read("${property}")`;

    // --- BME680 I2C temp + humidity + pressure + gas ---
    case 'bme680':
      globals.add('Adafruit_BME680 bme680;');
      setupExtras.add('Wire.begin();');
      setupExtras.add('bme680.begin();');
      if (property === 'humidity') return 'bme680.readHumidity()';
      if (property === 'pressure') return '(bme680.readPressure() / 100.0)';
      if (property === 'gas_resistance') return 'bme680.readGas()';
      return 'bme680.readTemperature()';

    // --- MAX30102 pulse oximeter ---
    case 'max30102':
      globals.add('// MAX30102 - requires complex ISR; using stub');
      setupExtras.add('Wire.begin();');
      helpers.add(`float stemverse_max30102_read(const char* prop) {
  // TODO: integrate SparkFun/Maxim MAX30102 library with IR sampling
  return 0.0;
}`);
      return `stemverse_max30102_read("${property}")`;

    // --- MAX6675 thermocouple ---
    case 'max6675': {
      const cs = block.getField('PIN_CS') ? block.getFieldValue('PIN_CS') : pin;
      const sck = block.getField('PIN_SCK') ? block.getFieldValue('PIN_SCK') : Number(pin) + 1;
      const so = block.getField('PIN_SO') ? block.getFieldValue('PIN_SO') : Number(pin) + 2;
      globals.add(`MAX6675 thermocouple(${sck}, ${cs}, ${so});`);
      return 'thermocouple.readCelsius()';
    }

    // --- INA219 I2C current / voltage / power ---
    case 'ina219':
      globals.add('Adafruit_INA219 ina219;');
      setupExtras.add('Wire.begin();');
      setupExtras.add('ina219.begin();');
      if (property === 'current') return 'ina219.getCurrent_mA()';
      if (property === 'power') return 'ina219.getPower_mW()';
      return 'ina219.getBusVoltage_V()';

    // --- HX711 load cell amplifier ---
    case 'hx711': {
      const dout = block.getField('PIN_DOUT') ? block.getFieldValue('PIN_DOUT') : pin;
      const clk = block.getField('PIN_CLK') ? block.getFieldValue('PIN_CLK') : Number(pin) + 1;
      globals.add('HX711 scale;');
      setupExtras.add(`scale.begin(${dout}, ${clk});`);
      return 'scale.get_units(10)';
    }

    // --- MLX90614 IR temperature ---
    case 'mlx90614':
      globals.add('Adafruit_MLX90614 mlx;');
      setupExtras.add('Wire.begin();');
      setupExtras.add('mlx.begin();');
      if (property === 'object_temp') return 'mlx.readObjectTempC()';
      return 'mlx.readAmbientTempC()';

    // --- TCS34725 color sensor ---
    case 'tcs34725':
      globals.add('Adafruit_TCS34725 tcs = Adafruit_TCS34725(TCS34725_INTEGRATIONTIME_50MS, TCS34725_GAIN_4X);');
      setupExtras.add('Wire.begin();');
      setupExtras.add('tcs.begin();');
      helpers.add(`float stemverse_tcs34725_read(const char* prop) {
  uint16_t r, g, b, c;
  tcs.getRawData(&r, &g, &b, &c);
  if (strcmp(prop, "red") == 0) return (float)r;
  if (strcmp(prop, "green") == 0) return (float)g;
  if (strcmp(prop, "blue") == 0) return (float)b;
  return (float)c;
}`);
      return `stemverse_tcs34725_read("${property}")`;

    // --- VEML6070 UV sensor ---
    case 'veml6070':
      globals.add('Adafruit_VEML6070 uv;');
      setupExtras.add('Wire.begin();');
      setupExtras.add('uv.begin(VEML6070_1_T);');
      return 'uv.readUV()';

    // --- VL53L0X laser distance ---
    case 'vl53l0x':
      globals.add('Adafruit_VL53L0X lox;');
      setupExtras.add('Wire.begin();');
      setupExtras.add('lox.begin();');
      helpers.add(`float stemverse_vl53l0x_read() {
  VL53L0X_RangingMeasurementData_t measure;
  lox.rangingTest(&measure, false);
  if (measure.RangeStatus != 4) return (float)measure.RangeMilliMeter;
  return -1.0;
}`);
      return 'stemverse_vl53l0x_read()';

    // --- ADXL345 accelerometer ---
    case 'adxl345':
      globals.add('Adafruit_ADXL345_Unified adxl = Adafruit_ADXL345_Unified();');
      setupExtras.add('Wire.begin();');
      setupExtras.add('adxl.begin();');
      helpers.add(`float stemverse_adxl345_read(const char* prop) {
  sensors_event_t event;
  adxl.getEvent(&event);
  if (strcmp(prop, "accel_x") == 0) return event.acceleration.x;
  if (strcmp(prop, "accel_y") == 0) return event.acceleration.y;
  return event.acceleration.z;
}`);
      return `stemverse_adxl345_read("${property}")`;

    // --- HMC5883L magnetometer / compass ---
    case 'hmc5883l':
      globals.add('Adafruit_HMC5883_Unified mag = Adafruit_HMC5883_Unified(12345);');
      setupExtras.add('Wire.begin();');
      setupExtras.add('mag.begin();');
      helpers.add(`float stemverse_hmc5883l_read(const char* prop) {
  sensors_event_t event;
  mag.getEvent(&event);
  if (strcmp(prop, "mag_x") == 0) return event.magnetic.x;
  if (strcmp(prop, "mag_y") == 0) return event.magnetic.y;
  if (strcmp(prop, "mag_z") == 0) return event.magnetic.z;
  float heading = atan2(event.magnetic.y, event.magnetic.x) * 180.0 / M_PI;
  if (heading < 0) heading += 360.0;
  return heading;
}`);
      return `stemverse_hmc5883l_read("${property}")`;

    // --- BH1750 light sensor ---
    case 'bh1750':
      globals.add('BH1750 lightMeter;');
      setupExtras.add('Wire.begin();');
      setupExtras.add('lightMeter.begin();');
      return 'lightMeter.readLightLevel()';

    // --- Analog pass-through sensors ---
    case 'soil_moisture':
    case 'rain_sensor':
    case 'sound':
    case 'flex':
    case 'fsr':
    case 'voltage_divider':
      return `analogRead(${pin})`;

    // --- Current sensor (ACS712) — analog with scaling ---
    case 'current_sensor':
      helpers.add(`float stemverse_acs712_current(int pin) {
  int raw = analogRead(pin);
  float voltage = (raw / 1023.0) * 5.0;
  return (voltage - 2.5) / 0.185;
}`);
      return `stemverse_acs712_current(${pin})`;

    // --- Digital pass-through sensors ---
    case 'hall':
    case 'tilt':
    case 'touch':
    case 'flame':
      setupExtras.add(`pinMode(${pin}, INPUT);`);
      return `digitalRead(${pin})`;

    // --- IR receiver ---
    case 'ir_receiver':
      globals.add('// IR Receiver - using IRremote library');
      setupExtras.add(`IrReceiver.begin(${pin}, ENABLE_LED_FEEDBACK);`);
      helpers.add(`unsigned long stemverse_ir_read() {
  if (IrReceiver.decode()) {
    unsigned long code = IrReceiver.decodedIRData.decodedRawData;
    IrReceiver.resume();
    return code;
  }
  return 0;
}`);
      return 'stemverse_ir_read()';

    // --- GPS NEO-6M ---
    case 'gps_neo6m': {
      const rxPin = block.getField('PIN_RX') ? block.getFieldValue('PIN_RX') : pin;
      const txPin = block.getField('PIN_TX') ? block.getFieldValue('PIN_TX') : Number(pin) + 1;
      globals.add(`TinyGPSPlus gps;`);
      globals.add(`SoftwareSerial gpsSerial(${rxPin}, ${txPin});`);
      setupExtras.add('gpsSerial.begin(9600);');
      helpers.add(`float stemverse_gps_read(const char* prop) {
  while (gpsSerial.available() > 0) gps.encode(gpsSerial.read());
  if (strcmp(prop, "latitude") == 0) return gps.location.lat();
  if (strcmp(prop, "longitude") == 0) return gps.location.lng();
  if (strcmp(prop, "altitude") == 0) return gps.altitude.meters();
  if (strcmp(prop, "speed") == 0) return gps.speed.kmph();
  return 0.0;
}`);
      return `stemverse_gps_read("${property}")`;
    }

    // --- Rotary encoder ---
    case 'encoder': {
      const pinA = block.getField('PIN_A') ? block.getFieldValue('PIN_A') : pin;
      const pinB = block.getField('PIN_B') ? block.getFieldValue('PIN_B') : Number(pin) + 1;
      globals.add(`volatile long stemverse_encoder_pos = 0;`);
      globals.add(`int stemverse_encoder_pinA = ${pinA};`);
      globals.add(`int stemverse_encoder_pinB = ${pinB};`);
      helpers.add(`void stemverse_encoder_isr() {
  if (digitalRead(stemverse_encoder_pinB) == HIGH) stemverse_encoder_pos++;
  else stemverse_encoder_pos--;
}`);
      setupExtras.add(`pinMode(${pinA}, INPUT_PULLUP);`);
      setupExtras.add(`pinMode(${pinB}, INPUT_PULLUP);`);
      setupExtras.add(`attachInterrupt(digitalPinToInterrupt(${pinA}), stemverse_encoder_isr, RISING);`);
      if (property === 'direction')
        return `(digitalRead(${pinB}) == HIGH ? 1 : -1)`;
      return 'stemverse_encoder_pos';
    }

    // --- Analog joystick ---
    case 'joystick': {
      const pinX = block.getField('PIN_X') ? block.getFieldValue('PIN_X') : pin;
      const pinY = block.getField('PIN_Y') ? block.getFieldValue('PIN_Y') : Number(pin) + 1;
      const pinBtn = block.getField('PIN_BTN') ? block.getFieldValue('PIN_BTN') : Number(pin) + 2;
      if (property === 'y_axis') return `analogRead(${pinY})`;
      if (property === 'button') {
        setupExtras.add(`pinMode(${pinBtn}, INPUT_PULLUP);`);
        return `digitalRead(${pinBtn})`;
      }
      return `analogRead(${pinX})`;
    }

    // --- Water flow sensor (interrupt-based) ---
    case 'water_flow':
      globals.add('volatile unsigned long stemverse_flow_pulses = 0;');
      helpers.add(`void stemverse_flow_isr() {
  stemverse_flow_pulses++;
}
float stemverse_flow_rate() {
  float rate = stemverse_flow_pulses / 7.5;
  stemverse_flow_pulses = 0;
  return rate;
}`);
      setupExtras.add(`pinMode(${pin}, INPUT_PULLUP);`);
      setupExtras.add(`attachInterrupt(digitalPinToInterrupt(${pin}), stemverse_flow_isr, RISING);`);
      return 'stemverse_flow_rate()';

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
      arduinoGenerator.blockToCode(block, true); // thisOnly — just trigger side-effects (globals, helpers)
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
    `// STEMVerse Robotics - ${boardName}`,
    '// Production-ready Arduino C++ - auto-generated',
    `// Blocks: ${allBlocks.length} | Libraries: ${libraries.length}`,
  ].join('\n');

  const sections: string[] = [header, ''];

  if (includeBlock) sections.push(includeBlock, '');
  if (constantLines) sections.push(constantLines);
  if (globalLines) sections.push(globalLines);
  if (variableLines) sections.push(variableLines);
  if (helperLines) sections.push('', helperLines);
  if (functionLines) sections.push('', functionLines);

  sections.push('');
  sections.push('void setup() {');
  if (setupInit) sections.push(setupInit);
  sections.push(indent(setupCode || '// no setup blocks'));
  sections.push('}');
  sections.push('');
  sections.push('void loop() {');
  sections.push(indent(loopCode || '// no loop blocks'));
  sections.push('}');

  const code = sections.join('\n');

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
