import type { VirtualBoardDefinition, VirtualBoardId } from '../types';

export const VIRTUAL_BOARDS: Record<VirtualBoardId, VirtualBoardDefinition> = {
  esp32: {
    id: 'esp32',
    name: 'ESP32',
    pinCount: 30,
    width: 2.4,
    height: 1.0,
    color: '#1e3a5f',
  },
  esp32_s3: {
    id: 'esp32_s3',
    name: 'ESP32-S3',
    pinCount: 28,
    width: 2.4,
    height: 1.0,
    color: '#312e81',
  },
  arduino_uno: {
    id: 'arduino_uno',
    name: 'Arduino Uno',
    pinCount: 20,
    width: 2.6,
    height: 2.0,
    color: '#0f766e',
  },
};

export function getVirtualBoard(id: VirtualBoardId): VirtualBoardDefinition {
  return VIRTUAL_BOARDS[id];
}

export function listVirtualBoards(): VirtualBoardDefinition[] {
  return Object.values(VIRTUAL_BOARDS);
}
