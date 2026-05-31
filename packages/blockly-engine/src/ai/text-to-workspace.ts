import type { WorkspaceBuildSpec } from './workspace-builder';

export type ParsedPrompt = WorkspaceBuildSpec & {
  summary: string;
  matchedPattern: string;
};

export function parseNaturalLanguageToWorkspace(
  prompt: string,
  boardHint?: string,
): ParsedPrompt {
  const text = prompt.toLowerCase().trim();

  if (/blink.*led|led.*blink|flash.*led/.test(text)) {
    const ms = extractDelayMs(text) ?? 1000;
    return {
      name: 'LED Blink',
      board: boardHint ?? 'arduino_uno',
      matchedPattern: 'led_blink',
      summary: `Blinks an LED on pin 13 every ${ms} ms.`,
      setup: [
        { type: 'stemverse_configure_pin', fields: { PIN: 13, MODE: 'OUTPUT' } },
        { type: 'stemverse_serial_begin', fields: { BAUD: 9600 } },
      ],
      loop: [
        { type: 'stemverse_digital_write', fields: { PIN: 13, VALUE: 'HIGH' } },
        { type: 'stemverse_delay', fields: { MS: ms } },
        { type: 'stemverse_digital_write', fields: { PIN: 13, VALUE: 'LOW' } },
        { type: 'stemverse_delay', fields: { MS: ms } },
      ],
    };
  }

  if (/dht\s*22|dht22/.test(text) && /oled|display|screen/.test(text)) {
    return {
      name: 'DHT22 on OLED',
      board: boardHint ?? 'esp32',
      language: 'arduino_cpp',
      matchedPattern: 'dht22_oled',
      summary: 'Reads DHT22 temperature/humidity and shows values on an I2C OLED display.',
      setup: [
        { type: 'stemverse_configure_pin', fields: { PIN: 4, MODE: 'INPUT' } },
        { type: 'stemverse_oled_init', fields: { SDA: 21, SCL: 22, ADDR: 0x3c } },
        { type: 'stemverse_serial_begin', fields: { BAUD: 115200 } },
      ],
      loop: [
        {
          type: 'stemverse_oled_text',
          fields: { X: 0, Y: 0, TEXT: 'Temp C' },
        },
        { type: 'stemverse_delay', fields: { MS: 2000 } },
      ],
    };
  }

  if (/dht\s*11|dht11|temperature|humidity/.test(text)) {
    const sensor = /dht\s*22|dht22/.test(text) ? 'dht22' : 'dht11';
    return {
      name: 'Temperature Monitor',
      board: boardHint ?? 'esp32',
      matchedPattern: 'dht_sensor',
      summary: `Reads ${sensor.toUpperCase()} and logs temperature over serial.`,
      setup: [
        { type: 'stemverse_configure_pin', fields: { PIN: 4, MODE: 'INPUT' } },
        { type: 'stemverse_serial_begin', fields: { BAUD: 115200 } },
      ],
      loop: [
        {
          type: 'stemverse_sensor_read',
          fields: { SENSOR: sensor, PROPERTY: 'temperature', PIN: 4 },
        },
        { type: 'stemverse_delay', fields: { MS: 2000 } },
      ],
    };
  }

  if (/line\s*follow|linefollow/.test(text)) {
    return {
      name: 'Line Follower',
      board: boardHint ?? 'arduino_uno',
      matchedPattern: 'line_follower',
      summary: 'Reads left/right line sensors and drives differential motors.',
      setup: [
        { type: 'stemverse_configure_pin', fields: { PIN: 5, MODE: 'OUTPUT' } },
        { type: 'stemverse_configure_pin', fields: { PIN: 6, MODE: 'OUTPUT' } },
      ],
      loop: [
        { type: 'stemverse_line_read_left', fields: { PIN: 34 } },
        { type: 'stemverse_line_read_right', fields: { PIN: 35 } },
        { type: 'stemverse_diff_forward', fields: { LEFT: 5, RIGHT: 6, SPEED: 180 } },
        { type: 'stemverse_delay', fields: { MS: 50 } },
      ],
    };
  }

  if (/servo|robot\s*arm/.test(text)) {
    return {
      name: 'Servo Sweep',
      board: boardHint ?? 'arduino_uno',
      matchedPattern: 'servo',
      summary: 'Sweeps a servo motor between 0° and 180°.',
      setup: [{ type: 'stemverse_servo_write', fields: { PIN: 9, ANGLE: 0 } }],
      loop: [
        { type: 'stemverse_servo_write', fields: { PIN: 9, ANGLE: 180 } },
        { type: 'stemverse_delay', fields: { MS: 1000 } },
        { type: 'stemverse_servo_write', fields: { PIN: 9, ANGLE: 0 } },
        { type: 'stemverse_delay', fields: { MS: 1000 } },
      ],
    };
  }

  if (/ultrasonic|hc-?sr04|distance|obstacle/.test(text)) {
    return {
      name: 'Distance Monitor',
      board: boardHint ?? 'arduino_uno',
      matchedPattern: 'distance',
      summary: 'Measures distance with HC-SR04 and reacts to obstacles.',
      setup: [
        { type: 'stemverse_configure_pin', fields: { PIN: 8, MODE: 'OUTPUT' } },
      ],
      loop: [
        {
          type: 'stemverse_obstacle_distance',
          fields: { TRIG: 5, ECHO: 18 },
        },
        { type: 'stemverse_obstacle_decide', fields: { THRESHOLD: 20 } },
        { type: 'stemverse_delay', fields: { MS: 100 } },
      ],
    };
  }

  if (/wifi|mqtt|iot/.test(text)) {
    return {
      name: 'IoT Starter',
      board: boardHint ?? 'esp32',
      language: 'arduino_cpp',
      matchedPattern: 'iot',
      summary: 'Connects WiFi and publishes MQTT messages (configure SSID in blocks).',
      setup: [
        {
          type: 'stemverse_wifi_begin',
          fields: { SSID: 'YourNetwork', PASSWORD: 'password' },
        },
        {
          type: 'stemverse_mqtt_connect',
          fields: { BROKER: 'broker.hivemq.com', PORT: 1883, CLIENT: 'stemverse' },
        },
      ],
      loop: [
        {
          type: 'stemverse_mqtt_publish',
          fields: { TOPIC: 'stemverse/status', MESSAGE: 'online' },
        },
        { type: 'stemverse_delay', fields: { MS: 5000 } },
      ],
    };
  }

  return {
    name: 'Custom Project',
    board: boardHint ?? 'arduino_uno',
    matchedPattern: 'default',
    summary: 'Basic digital output pattern — refine blocks in the workspace.',
    setup: [
      { type: 'stemverse_configure_pin', fields: { PIN: 13, MODE: 'OUTPUT' } },
    ],
    loop: [
      { type: 'stemverse_digital_write', fields: { PIN: 13, VALUE: 'HIGH' } },
      { type: 'stemverse_delay', fields: { MS: 500 } },
      { type: 'stemverse_digital_write', fields: { PIN: 13, VALUE: 'LOW' } },
      { type: 'stemverse_delay', fields: { MS: 500 } },
    ],
  };
}

function extractDelayMs(text: string): number | undefined {
  const sec = text.match(/every\s+(\d+)\s*second/);
  if (sec) return Number(sec[1]) * 1000;
  const ms = text.match(/(\d+)\s*ms/);
  if (ms) return Number(ms[1]);
  return undefined;
}
