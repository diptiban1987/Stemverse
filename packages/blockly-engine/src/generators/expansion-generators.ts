import type { Block } from 'blockly/core';
import type { CodeGenerator } from 'blockly/core';

const ATOMIC = 0;

export type ExpansionGeneratorTarget = 'arduino' | 'espidf' | 'micropython' | 'circuitpython';

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function fsApi(fs: string, target: ExpansionGeneratorTarget): string {
  if (target === 'micropython' || target === 'circuitpython') {
    if (fs === 'SD') return 'sd';
    if (fs === 'LittleFS') return 'littlefs';
    return 'spiffs';
  }
  if (fs === 'SD') return 'SD';
  if (fs === 'LittleFS') return 'LittleFS';
  return 'SPIFFS';
}

export function registerExpansionBlockGenerators(
  generator: CodeGenerator,
  target: ExpansionGeneratorTarget,
): void {
  if (target === 'arduino') {
    registerArduinoExpansion(generator);
  } else if (target === 'espidf') {
    registerEspIdfExpansion(generator);
  } else if (target === 'micropython') {
    registerMicroPythonExpansion(generator);
  } else {
    registerCircuitPythonExpansion(generator);
  }
}

function registerArduinoExpansion(generator: CodeGenerator): void {
  generator.forBlock['stemverse_lcd_init'] = (b: Block) => {
    const rs = b.getFieldValue('RS');
    const e = b.getFieldValue('E');
    const cols = b.getFieldValue('COLS');
    const rows = b.getFieldValue('ROWS');
    return `lcd.begin(${cols}, ${rows});\n`;
  };

  generator.forBlock['stemverse_lcd_print'] = (b: Block) =>
    `lcd.print("${esc(b.getFieldValue('TEXT'))}");\n`;
  generator.forBlock['stemverse_lcd_clear'] = () => 'lcd.clear();\n';
  generator.forBlock['stemverse_lcd_set_cursor'] = (b: Block) =>
    `lcd.setCursor(${b.getFieldValue('COL')}, ${b.getFieldValue('ROW')});\n`;

  generator.forBlock['stemverse_oled_init'] = (b: Block) =>
    `display.begin(SSD1306_SWITCHCAPVCC, ${b.getFieldValue('ADDR')});\n`;
  generator.forBlock['stemverse_oled_text'] = (b: Block) =>
    `display.setCursor(${b.getFieldValue('X')}, ${b.getFieldValue('Y')});\ndisplay.print("${esc(b.getFieldValue('TEXT'))}");\ndisplay.display();\n`;
  generator.forBlock['stemverse_oled_line'] = (b: Block) =>
    `display.drawLine(${b.getFieldValue('X0')}, ${b.getFieldValue('Y0')}, ${b.getFieldValue('X1')}, ${b.getFieldValue('Y1')}, SSD1306_WHITE);\ndisplay.display();\n`;
  generator.forBlock['stemverse_oled_circle'] = (b: Block) =>
    `display.drawCircle(${b.getFieldValue('X')}, ${b.getFieldValue('Y')}, ${b.getFieldValue('R')}, SSD1306_WHITE);\ndisplay.display();\n`;
  generator.forBlock['stemverse_oled_rect'] = (b: Block) =>
    `display.drawRect(${b.getFieldValue('X')}, ${b.getFieldValue('Y')}, ${b.getFieldValue('W')}, ${b.getFieldValue('H')}, SSD1306_WHITE);\ndisplay.display();\n`;
  generator.forBlock['stemverse_oled_clear'] = () => 'display.clearDisplay(); display.display();\n';

  generator.forBlock['stemverse_tft_pixel'] = (b: Block) =>
    `tft.drawPixel(${b.getFieldValue('X')}, ${b.getFieldValue('Y')}, ${b.getFieldValue('COLOR')});\n`;
  generator.forBlock['stemverse_tft_text'] = (b: Block) =>
    `tft.setCursor(${b.getFieldValue('X')}, ${b.getFieldValue('Y')});\ntft.print("${esc(b.getFieldValue('TEXT'))}");\n`;
  generator.forBlock['stemverse_tft_image'] = (b: Block) =>
    `/* TFT image: ${esc(b.getFieldValue('PATH'))} */\n`;
  generator.forBlock['stemverse_tft_shape'] = (b: Block) =>
    `/* TFT shape ${b.getFieldValue('SHAPE')} */\n`;

  registerRoboticsArduino(generator);
  registerFsArduino(generator);
  registerRtosArduino(generator);
}

function registerRoboticsArduino(generator: CodeGenerator): void {
  const drive = (leftFwd: boolean, rightFwd: boolean) => (b: Block) => {
    const l = b.getFieldValue('LEFT');
    const r = b.getFieldValue('RIGHT');
    const spd = b.getFieldValue('SPEED');
    const lVal = leftFwd ? spd : 0;
    const rVal = rightFwd ? spd : 0;
    return `analogWrite(${l}, ${lVal});\nanalogWrite(${r}, ${rVal});\n`;
  };

  generator.forBlock['stemverse_diff_forward'] = drive(true, true);
  generator.forBlock['stemverse_diff_backward'] = (b: Block) => {
    const l = b.getFieldValue('LEFT');
    const r = b.getFieldValue('RIGHT');
    const spd = b.getFieldValue('SPEED');
    return `analogWrite(${l}, 0);\nanalogWrite(${r}, ${spd});\n`;
  };
  generator.forBlock['stemverse_diff_turn_left'] = drive(false, true);
  generator.forBlock['stemverse_diff_turn_right'] = drive(true, false);
  generator.forBlock['stemverse_diff_stop'] = (b: Block) =>
    `analogWrite(${b.getFieldValue('LEFT')}, 0);\nanalogWrite(${b.getFieldValue('RIGHT')}, 0);\n`;

  generator.forBlock['stemverse_line_read_left'] = (b: Block) =>
    [`digitalRead(${b.getFieldValue('PIN')})`, ATOMIC];
  generator.forBlock['stemverse_line_read_right'] = (b: Block) =>
    [`digitalRead(${b.getFieldValue('PIN')})`, ATOMIC];

  generator.forBlock['stemverse_obstacle_distance'] = (b: Block) => {
    const trig = b.getFieldValue('TRIG');
    const echo = b.getFieldValue('ECHO');
    return [`([](){ pinMode(${trig}, OUTPUT); pinMode(${echo}, INPUT); digitalWrite(${trig}, LOW); delayMicroseconds(2); digitalWrite(${trig}, HIGH); delayMicroseconds(10); digitalWrite(${trig}, LOW); long d = pulseIn(${echo}, HIGH, 30000); return d * 0.034 / 2; })()`, ATOMIC];
  };

  generator.forBlock['stemverse_obstacle_decide'] = (b: Block) => {
    const th = b.getFieldValue('THRESHOLD');
    return `if (stemverse_obstacle_cm < ${th}) { /* turn */ } else { /* forward */ }\n`;
  };

  generator.forBlock['stemverse_arm_move_joint'] = (b: Block) =>
    `stemverse_arm_set_joint(${b.getFieldValue('JOINT')}, ${b.getFieldValue('ANGLE')});\n`;
  generator.forBlock['stemverse_arm_set_angle'] = (b: Block) =>
    `stemverse_arm_set_joint(${b.getFieldValue('JOINT')}, ${b.getFieldValue('ANGLE')});\n`;
  generator.forBlock['stemverse_arm_pick'] = () => 'stemverse_arm_gripper(true);\n';
  generator.forBlock['stemverse_arm_place'] = () => 'stemverse_arm_gripper(false);\n';
}

function registerFsArduino(generator: CodeGenerator): void {
  generator.forBlock['stemverse_fs_create'] = (b: Block) => {
    const api = fsApi(b.getFieldValue('FS'), 'arduino');
    const path = esc(b.getFieldValue('PATH'));
    return `File f = ${api}.open("/${path}", FILE_WRITE);\nif (f) f.close();\n`;
  };
  generator.forBlock['stemverse_fs_write'] = (b: Block) => {
    const api = fsApi(b.getFieldValue('FS'), 'arduino');
    const path = esc(b.getFieldValue('PATH'));
    const data = esc(b.getFieldValue('DATA'));
    return `File f = ${api}.open("/${path}", FILE_WRITE);\nif (f) { f.print("${data}"); f.close(); }\n`;
  };
  generator.forBlock['stemverse_fs_read'] = (b: Block) => {
    const api = fsApi(b.getFieldValue('FS'), 'arduino');
    const path = esc(b.getFieldValue('PATH'));
    return [`([](){ File f = ${api}.open("/${path}"); String s = f ? f.readString() : ""; if (f) f.close(); return s; })()`, ATOMIC];
  };
  generator.forBlock['stemverse_fs_delete'] = (b: Block) => {
    const api = fsApi(b.getFieldValue('FS'), 'arduino');
    return `${api}.remove("/${esc(b.getFieldValue('PATH'))}");\n`;
  };
  generator.forBlock['stemverse_fs_list'] = (b: Block) => {
    const api = fsApi(b.getFieldValue('FS'), 'arduino');
    return [`stemverse_${api.toLowerCase()}_list_files()`, ATOMIC];
  };
}

function registerRtosArduino(generator: CodeGenerator): void {
  generator.forBlock['stemverse_rtos_create_task'] = (b: Block) =>
    `xTaskCreate(stemverse_task_${b.getFieldValue('NAME')}, "${esc(b.getFieldValue('NAME'))}", ${b.getFieldValue('STACK')}, NULL, ${b.getFieldValue('PRIORITY')}, NULL);\n`;
  generator.forBlock['stemverse_rtos_delete_task'] = (b: Block) =>
    `vTaskDelete(stemverse_handle_${b.getFieldValue('NAME')});\n`;
  generator.forBlock['stemverse_rtos_suspend_task'] = (b: Block) =>
    `vTaskSuspend(stemverse_handle_${b.getFieldValue('NAME')});\n`;
  generator.forBlock['stemverse_rtos_resume_task'] = (b: Block) =>
    `vTaskResume(stemverse_handle_${b.getFieldValue('NAME')});\n`;
  generator.forBlock['stemverse_rtos_queue_send'] = (b: Block) =>
    `xQueueSend(stemverse_queue_${b.getFieldValue('QUEUE')}, "${esc(b.getFieldValue('DATA'))}", portMAX_DELAY);\n`;
  generator.forBlock['stemverse_rtos_queue_receive'] = (b: Block) =>
    [`stemverse_queue_recv_${b.getFieldValue('QUEUE')}()`, ATOMIC];
  generator.forBlock['stemverse_rtos_semaphore'] = (b: Block) => {
    const action = b.getFieldValue('ACTION');
    const name = b.getFieldValue('NAME');
    return action === 'TAKE'
      ? `xSemaphoreTake(stemverse_sem_${name}, portMAX_DELAY);\n`
      : `xSemaphoreGive(stemverse_sem_${name});\n`;
  };
}

function registerEspIdfExpansion(generator: CodeGenerator): void {
  generator.forBlock['stemverse_lcd_print'] = (b: Block) =>
    `ESP_LOGI(TAG, "LCD: %s", "${esc(b.getFieldValue('TEXT'))}");\n`;
  generator.forBlock['stemverse_oled_text'] = (b: Block) =>
    `ESP_LOGI(TAG, "OLED: %s", "${esc(b.getFieldValue('TEXT'))}");\n`;
  registerRoboticsEspIdf(generator);
  registerRtosEspIdf(generator);
}

function registerRoboticsEspIdf(generator: CodeGenerator): void {
  generator.forBlock['stemverse_diff_forward'] = (b: Block) =>
    `gpio_set_level((gpio_num_t)${b.getFieldValue('LEFT')}, 1);\n`;
  generator.forBlock['stemverse_diff_stop'] = (b: Block) =>
    `gpio_set_level((gpio_num_t)${b.getFieldValue('LEFT')}, 0);\ngpio_set_level((gpio_num_t)${b.getFieldValue('RIGHT')}, 0);\n`;
  generator.forBlock['stemverse_line_read_left'] = (b: Block) =>
    [`gpio_get_level((gpio_num_t)${b.getFieldValue('PIN')})`, ATOMIC];
}

function registerRtosEspIdf(generator: CodeGenerator): void {
  generator.forBlock['stemverse_rtos_create_task'] = (b: Block) =>
    `xTaskCreate(NULL, "${esc(b.getFieldValue('NAME'))}", ${b.getFieldValue('STACK')}, NULL, ${b.getFieldValue('PRIORITY')}, NULL);\n`;
  generator.forBlock['stemverse_rtos_queue_send'] = (b: Block) =>
    `/* queue send ${esc(b.getFieldValue('QUEUE'))} */\n`;
}

function registerMicroPythonExpansion(generator: CodeGenerator): void {
  generator.forBlock['stemverse_configure_pin'] = (b: Block) => {
    const pin = b.getFieldValue('PIN');
    const mode = b.getFieldValue('MODE');
    const pyMode = mode === 'OUTPUT' ? 'Pin.OUT' : 'Pin.IN';
    return `pin_${pin} = Pin(${pin}, ${pyMode})\n`;
  };
  generator.forBlock['stemverse_digital_write'] = (b: Block) =>
    `pin_${b.getFieldValue('PIN')}.value(${b.getFieldValue('VALUE') === 'HIGH' ? 1 : 0})\n`;
  generator.forBlock['stemverse_digital_read'] = (b: Block) =>
    [`pin_${b.getFieldValue('PIN')}.value()`, ATOMIC];
  generator.forBlock['stemverse_delay'] = (b: Block) =>
    `time.sleep_ms(${b.getFieldValue('MS')})\n`;

  generator.forBlock['stemverse_lcd_init'] = () => 'lcd = LCD1602()\n';
  generator.forBlock['stemverse_lcd_print'] = (b: Block) =>
    `lcd.print("${esc(b.getFieldValue('TEXT'))}")\n`;
  generator.forBlock['stemverse_lcd_clear'] = () => 'lcd.clear()\n';
  generator.forBlock['stemverse_lcd_set_cursor'] = (b: Block) =>
    `lcd.move_to(${b.getFieldValue('COL')}, ${b.getFieldValue('ROW')})\n`;

  generator.forBlock['stemverse_oled_init'] = (b: Block) =>
    `oled = ssd1306.SSD1306_I2C(128, 64, I2C(scl=Pin(${b.getFieldValue('SCL')}), sda=Pin(${b.getFieldValue('SDA')})))\n`;
  generator.forBlock['stemverse_oled_text'] = (b: Block) =>
    `oled.text("${esc(b.getFieldValue('TEXT'))}", ${b.getFieldValue('X')}, ${b.getFieldValue('Y')})\noled.show()\n`;
  generator.forBlock['stemverse_oled_clear'] = () => 'oled.fill(0)\noled.show()\n';

  generator.forBlock['stemverse_diff_forward'] = (b: Block) =>
    `motor_drive(${b.getFieldValue('LEFT')}, ${b.getFieldValue('RIGHT')}, ${b.getFieldValue('SPEED')})\n`;
  generator.forBlock['stemverse_diff_stop'] = (b: Block) =>
    `motor_stop(${b.getFieldValue('LEFT')}, ${b.getFieldValue('RIGHT')})\n`;
  generator.forBlock['stemverse_line_read_left'] = (b: Block) =>
    [`Pin(${b.getFieldValue('PIN')}, Pin.IN).value()`, ATOMIC];

  registerFsPython(generator, 'micropython');
  registerRtosPython(generator);
}

function registerCircuitPythonExpansion(generator: CodeGenerator): void {
  registerMicroPythonExpansion(generator);
  generator.forBlock['stemverse_oled_init'] = (b: Block) =>
    `display = SSD1306_I2C(128, 64, board.SCL, board.SDA, addr=${b.getFieldValue('ADDR')})\n`;
  generator.forBlock['stemverse_fs_create'] = (b: Block) => {
    const path = esc(b.getFieldValue('PATH'));
    return `with open("/${path}", "w") as f:\n    pass\n`;
  };
}

function registerFsPython(generator: CodeGenerator, target: ExpansionGeneratorTarget): void {
  generator.forBlock['stemverse_fs_create'] = (b: Block) => {
    const api = fsApi(b.getFieldValue('FS'), target);
    const path = esc(b.getFieldValue('PATH'));
    return `open("/${api}/${path}", "w").close()\n`;
  };
  generator.forBlock['stemverse_fs_write'] = (b: Block) => {
    const api = fsApi(b.getFieldValue('FS'), target);
    const path = esc(b.getFieldValue('PATH'));
    const data = esc(b.getFieldValue('DATA'));
    return `with open("/${api}/${path}", "w") as f:\n    f.write("${data}")\n`;
  };
  generator.forBlock['stemverse_fs_read'] = (b: Block) => {
    const api = fsApi(b.getFieldValue('FS'), target);
    const path = esc(b.getFieldValue('PATH'));
    return [`open("/${api}/${path}").read()`, ATOMIC];
  };
  generator.forBlock['stemverse_fs_delete'] = (b: Block) => {
    const api = fsApi(b.getFieldValue('FS'), target);
    return `os.remove("/${api}/${esc(b.getFieldValue('PATH'))}")\n`;
  };
  generator.forBlock['stemverse_fs_list'] = (b: Block) => {
    const api = fsApi(b.getFieldValue('FS'), target);
    return [`os.listdir("/${api}")`, ATOMIC];
  };
}

function registerRtosPython(generator: CodeGenerator): void {
  generator.forBlock['stemverse_rtos_create_task'] = (b: Block) =>
    `_thread.start_new_thread(stemverse_${b.getFieldValue('NAME')}, ())\n`;
  generator.forBlock['stemverse_rtos_queue_send'] = (b: Block) =>
    `stemverse_queues["${esc(b.getFieldValue('QUEUE'))}"].put("${esc(b.getFieldValue('DATA'))}")\n`;
  generator.forBlock['stemverse_rtos_queue_receive'] = (b: Block) =>
    [`stemverse_queues["${esc(b.getFieldValue('QUEUE'))}"].get()`, ATOMIC];
  generator.forBlock['stemverse_rtos_semaphore'] = (b: Block) => {
    const action = b.getFieldValue('ACTION');
    const name = b.getFieldValue('NAME');
    return action === 'TAKE'
      ? `stemverse_sems["${esc(name)}"].acquire()\n`
      : `stemverse_sems["${esc(name)}"].release()\n`;
  };
}

export const EXPANSION_ARDUINO_GLOBALS = [
  'LiquidCrystal lcd(12, 11, 5, 4, 3, 2);',
  'Adafruit_SSD1306 display(128, 64, &Wire, -1);',
  'Adafruit_ILI9341 tft = Adafruit_ILI9341(10, 9, 8);',
  'QueueHandle_t stemverse_queue_queue1;',
  'SemaphoreHandle_t stemverse_sem_sem1;',
];

export const EXPANSION_ARDUINO_HELPERS = `void stemverse_arm_set_joint(int joint, int angle) { (void)joint; (void)angle; }
void stemverse_arm_gripper(bool close) { (void)close; }
String stemverse_spiffs_list_files() { return ""; }
String stemverse_littlefs_list_files() { return ""; }
String stemverse_sd_list_files() { return ""; }`;

export const EXPANSION_MICROPYTHON_IMPORTS = [
  'from machine import Pin',
  'import time',
  'import _thread',
  'import os',
];

export const EXPANSION_CIRCUITPYTHON_IMPORTS = [
  'import board',
  'import busio',
  'import digitalio',
  'import os',
];
