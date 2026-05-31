import type { VirtualBoardId, PinStateMap, SimComponentPlacement } from '../types';
import { getVirtualBoard } from '../boards/virtual-boards';

/**
 * Hardware layer — virtual MCU, GPIO registers, and component placements.
 */
export class HardwareLayer {
  private boardId: VirtualBoardId;
  private pinStates: PinStateMap = {};
  private components: SimComponentPlacement[] = [];

  constructor(boardId: VirtualBoardId) {
    this.boardId = boardId;
    this.resetPins();
  }

  setBoard(boardId: VirtualBoardId): void {
    this.boardId = boardId;
    this.components = [];
    this.resetPins();
  }

  getBoardId(): VirtualBoardId {
    return this.boardId;
  }

  getPinStates(): PinStateMap {
    return { ...this.pinStates };
  }

  getComponents(): SimComponentPlacement[] {
    return [...this.components];
  }

  resetPins(): void {
    const board = getVirtualBoard(this.boardId);
    this.pinStates = {};
    for (let i = 0; i <= board.pinCount; i++) {
      this.pinStates[i] = 'LOW';
    }
  }

  writePin(pin: number, level: 'HIGH' | 'LOW'): void {
    this.pinStates[pin] = level;
  }

  readPin(pin: number): 'HIGH' | 'LOW' {
    return this.pinStates[pin] ?? 'LOW';
  }

  addComponent(placement: SimComponentPlacement): void {
    this.components.push(placement);
  }

  removeComponent(id: string): void {
    this.components = this.components.filter((c) => c.id !== id);
  }

  updateComponent(placement: SimComponentPlacement): void {
    this.components = this.components.map((c) =>
      c.id === placement.id ? placement : c,
    );
  }

  clearComponents(): void {
    this.components = [];
  }
}
