export type BoardCapability = {
  wifi: boolean;
  bluetooth: boolean;
  adc: boolean;
  dac: boolean;
  pwm: boolean;
  touch: boolean;
  sd?: boolean;
};

export type BoardDefinition = {
  id: string;
  name: string;
  architecture: string;
  digitalPins: number[];
  analogPins: number[];
  pwmPins: number[];
  defaultFrequency: number;
  flashSize: string;
  psram: boolean;
  uploadSpeed: number;
  capabilities: BoardCapability;
};

export type BoardSettings = {
  cpuFrequency: number;
  flashSize: string;
  psram: boolean;
  uploadSpeed: number;
};

export const DEFAULT_BOARD_SETTINGS: BoardSettings = {
  cpuFrequency: 80,
  flashSize: '4MB',
  psram: false,
  uploadSpeed: 115200,
};
