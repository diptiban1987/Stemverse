import type { BoardDefinition } from '../types/board';

export const BOARDS: BoardDefinition[] = [
  {
    id: 'esp32',
    name: 'ESP32',
    architecture: 'xtensa',
    digitalPins: [0, 1, 2, 3, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33],
    analogPins: [32, 33, 34, 35, 36, 39],
    pwmPins: [2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33],
    defaultFrequency: 240,
    flashSize: '4MB',
    psram: true,
    uploadSpeed: 921600,
    capabilities: { wifi: true, bluetooth: true, adc: true, dac: true, pwm: true, touch: true, sd: true },
  },
  {
    id: 'esp32_s3',
    name: 'ESP32-S3',
    architecture: 'xtensa',
    digitalPins: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 21],
    analogPins: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    pwmPins: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 21],
    defaultFrequency: 240,
    flashSize: '8MB',
    psram: true,
    uploadSpeed: 921600,
    capabilities: { wifi: true, bluetooth: true, adc: true, dac: false, pwm: true, touch: true, sd: true },
  },
  {
    id: 'esp8266',
    name: 'ESP8266',
    architecture: 'xtensa',
    digitalPins: [0, 1, 2, 3, 4, 5, 12, 13, 14, 15, 16],
    analogPins: [17],
    pwmPins: [0, 1, 2, 3, 4, 5, 12, 13, 14, 15, 16],
    defaultFrequency: 80,
    flashSize: '4MB',
    psram: false,
    uploadSpeed: 115200,
    capabilities: { wifi: true, bluetooth: false, adc: true, dac: false, pwm: true, touch: false },
  },
  {
    id: 'arduino_uno',
    name: 'Arduino Uno',
    architecture: 'avr',
    digitalPins: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    analogPins: [0, 1, 2, 3, 4, 5],
    pwmPins: [3, 5, 6, 9, 10, 11],
    defaultFrequency: 16,
    flashSize: '32KB',
    psram: false,
    uploadSpeed: 115200,
    capabilities: { wifi: false, bluetooth: false, adc: true, dac: false, pwm: true, touch: false },
  },
  {
    id: 'arduino_nano',
    name: 'Arduino Nano',
    architecture: 'avr',
    digitalPins: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    analogPins: [0, 1, 2, 3, 4, 5],
    pwmPins: [3, 5, 6, 9, 10, 11],
    defaultFrequency: 16,
    flashSize: '32KB',
    psram: false,
    uploadSpeed: 115200,
    capabilities: { wifi: false, bluetooth: false, adc: true, dac: false, pwm: true, touch: false },
  },
  {
    id: 'arduino_mega',
    name: 'Arduino Mega',
    architecture: 'avr',
    digitalPins: Array.from({ length: 54 }, (_, i) => i),
    analogPins: Array.from({ length: 16 }, (_, i) => i),
    pwmPins: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    defaultFrequency: 16,
    flashSize: '256KB',
    psram: false,
    uploadSpeed: 115200,
    capabilities: { wifi: false, bluetooth: false, adc: true, dac: false, pwm: true, touch: false },
  },
  {
    id: 'stm32',
    name: 'STM32',
    architecture: 'arm',
    digitalPins: Array.from({ length: 32 }, (_, i) => i),
    analogPins: Array.from({ length: 8 }, (_, i) => i),
    pwmPins: [3, 5, 6, 9, 10, 11],
    defaultFrequency: 72,
    flashSize: '512KB',
    psram: false,
    uploadSpeed: 115200,
    capabilities: { wifi: false, bluetooth: false, adc: true, dac: true, pwm: true, touch: false },
  },
  {
    id: 'rpi_pico',
    name: 'Raspberry Pi Pico',
    architecture: 'arm',
    digitalPins: Array.from({ length: 26 }, (_, i) => i),
    analogPins: [26, 27, 28],
    pwmPins: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28],
    defaultFrequency: 125,
    flashSize: '2MB',
    psram: false,
    uploadSpeed: 115200,
    capabilities: { wifi: false, bluetooth: false, adc: true, dac: false, pwm: true, touch: false },
  },
  {
    id: 'rp2040',
    name: 'RP2040',
    architecture: 'arm',
    digitalPins: Array.from({ length: 26 }, (_, i) => i),
    analogPins: [26, 27, 28],
    pwmPins: Array.from({ length: 29 }, (_, i) => i),
    defaultFrequency: 125,
    flashSize: '2MB',
    psram: false,
    uploadSpeed: 115200,
    capabilities: { wifi: false, bluetooth: false, adc: true, dac: false, pwm: true, touch: false },
  },
  {
    id: 'custom',
    name: 'Custom Board',
    architecture: 'custom',
    digitalPins: Array.from({ length: 40 }, (_, i) => i),
    analogPins: Array.from({ length: 8 }, (_, i) => i),
    pwmPins: Array.from({ length: 20 }, (_, i) => i),
    defaultFrequency: 80,
    flashSize: '4MB',
    psram: false,
    uploadSpeed: 115200,
    capabilities: { wifi: false, bluetooth: false, adc: true, dac: false, pwm: true, touch: false },
  },
];

export function getBoard(boardId: string): BoardDefinition {
  return BOARDS.find((b) => b.id === boardId) ?? BOARDS.find((b) => b.id === 'arduino_uno')!;
}

export function listBoards(): BoardDefinition[] {
  return [...BOARDS];
}

export function isValidDigitalPin(boardId: string, pin: number): boolean {
  const board = getBoard(boardId);
  return board.digitalPins.includes(pin);
}

export function isValidAnalogPin(boardId: string, pin: number): boolean {
  const board = getBoard(boardId);
  return board.analogPins.includes(pin);
}
