export type ComponentBoardRecord = {
  id?: string;
  slug: string;
  name: string;
  architecture: string;
  capabilities: Record<string, boolean>;
  digitalPins: number[];
  analogPins: number[];
  pwmPins: number[];
  defaultConfig?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  active?: boolean;
};

export type ComponentSensorRecord = {
  id?: string;
  slug: string;
  name: string;
  category: string;
  properties: string[];
  defaultPin?: number;
  libraries: string[];
  blockType: string;
  generatorKey: string;
  boardSupport: string[];
  metadata?: Record<string, unknown>;
  active?: boolean;
};

export type ComponentActuatorRecord = {
  id?: string;
  slug: string;
  name: string;
  category: string;
  fields: string[];
  libraries: string[];
  blockType: string;
  generatorKey: string;
  boardSupport: string[];
  metadata?: Record<string, unknown>;
  active?: boolean;
};

export type ComponentDisplayRecord = {
  id?: string;
  slug: string;
  name: string;
  category: 'lcd' | 'oled' | 'tft';
  interface: 'parallel' | 'i2c' | 'spi';
  libraries: string[];
  blockTypes: string[];
  boardSupport: string[];
  metadata?: Record<string, unknown>;
  active?: boolean;
};

export type ComponentRegistrySnapshot = {
  boards: ComponentBoardRecord[];
  sensors: ComponentSensorRecord[];
  actuators: ComponentActuatorRecord[];
  displays?: ComponentDisplayRecord[];
  source: 'static' | 'database';
};
