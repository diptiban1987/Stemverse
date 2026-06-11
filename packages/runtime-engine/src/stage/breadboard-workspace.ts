import {
  BreadboardModel,
  BreadboardType,
  BreadboardPositionModel,
  ComponentPlacementModel,
  BreadboardConnectionMetadata,
  BreadboardConnectionType,
  PowerRailMetadata,
  SignalRailMetadata,
  BreadboardSlotPosition,
  PowerRailPosition,
  SignalRailPosition,
  PinOccupancy,
  SlotOccupancy,
  BoardOccupancy,
  PowerRailConnection,
  SignalRailConnection,
} from '../types';

function safeDeepCopy<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

const VALID_BREADBOARD_TYPES: BreadboardType[] = ['STANDARD', 'HALF', 'MINI', 'CUSTOM'];
const VALID_CONNECTION_TYPES: BreadboardConnectionType[] = ['JUMPER', 'WIRE', 'CUSTOM'];

export class BreadboardWorkspace {
  private readonly modelRegistry = new Map<string, BreadboardModel>();
  private readonly modelOrder: string[] = [];

  private readonly positionRegistry = new Map<string, BreadboardPositionModel>();
  private readonly positionOrder: string[] = [];

  private readonly placementRegistry = new Map<string, ComponentPlacementModel>();
  private readonly placementOrder: string[] = [];

  private readonly connectionRegistry = new Map<string, BreadboardConnectionMetadata>();
  private readonly connectionOrder: string[] = [];

  private readonly warnPrefix = '[BreadboardWorkspace]';

  // ─── Breadboard Model Registry ──────────────────────────────

  public get modelCount(): number {
    return this.modelRegistry.size;
  }

  public get positionCount(): number {
    return this.positionRegistry.size;
  }

  public get placementCount(): number {
    return this.placementRegistry.size;
  }

  public get connectionCount(): number {
    return this.connectionRegistry.size;
  }

  private validateBreadboardModel(model: BreadboardModel): boolean {
    if (!model || typeof model !== 'object') {
      console.warn(`${this.warnPrefix} Breadboard model is not a valid object.`);
      return false;
    }
    if (!model.breadboardId || typeof model.breadboardId !== 'string') {
      console.warn(`${this.warnPrefix} Breadboard model missing or invalid breadboardId.`);
      return false;
    }
    if (!VALID_BREADBOARD_TYPES.includes(model.breadboardType)) {
      console.warn(`${this.warnPrefix} Breadboard model "${model.breadboardId}" has invalid breadboardType "${model.breadboardType}".`);
      return false;
    }
    if (!model.displayName || typeof model.displayName !== 'string') {
      console.warn(`${this.warnPrefix} Breadboard model "${model.breadboardId}" missing or invalid displayName.`);
      return false;
    }
    if (typeof model.rowCount !== 'number' || model.rowCount < 1 || !Number.isInteger(model.rowCount)) {
      console.warn(`${this.warnPrefix} Breadboard model "${model.breadboardId}" has invalid rowCount.`);
      return false;
    }
    if (typeof model.columnCount !== 'number' || model.columnCount < 1 || !Number.isInteger(model.columnCount)) {
      console.warn(`${this.warnPrefix} Breadboard model "${model.breadboardId}" has invalid columnCount.`);
      return false;
    }
    if (!Array.isArray(model.powerRailMetadata)) {
      console.warn(`${this.warnPrefix} Breadboard model "${model.breadboardId}" powerRailMetadata is not an array.`);
      return false;
    }
    if (!Array.isArray(model.signalRailMetadata)) {
      console.warn(`${this.warnPrefix} Breadboard model "${model.breadboardId}" signalRailMetadata is not an array.`);
      return false;
    }
    return true;
  }

  public registerBreadboardModel(model: BreadboardModel): void {
    if (!this.validateBreadboardModel(model)) return;
    if (this.modelRegistry.has(model.breadboardId)) {
      console.warn(`${this.warnPrefix} Duplicate breadboard ID "${model.breadboardId}" replaced.`);
    }
    this.modelRegistry.set(model.breadboardId, safeDeepCopy(model));
    if (!this.modelOrder.includes(model.breadboardId)) {
      this.modelOrder.push(model.breadboardId);
    }
  }

  public getBreadboardModel(id: string): BreadboardModel | undefined {
    if (!id) {
      console.warn(`${this.warnPrefix} getBreadboardModel called with empty id.`);
      return undefined;
    }
    const entry = this.modelRegistry.get(id);
    return entry ? safeDeepCopy(entry) : undefined;
  }

  public getBreadboardModels(): BreadboardModel[] {
    return this.modelOrder
      .map(id => this.modelRegistry.get(id))
      .filter((e): e is BreadboardModel => !!e)
      .map(e => safeDeepCopy(e));
  }

  public updateBreadboardModel(id: string, updates: Partial<BreadboardModel>): void {
    const existing = this.modelRegistry.get(id);
    if (!existing) {
      console.warn(`${this.warnPrefix} updateBreadboardModel: Model "${id}" not found.`);
      return;
    }
    const merged: BreadboardModel = {
      ...existing,
      ...updates,
      breadboardId: existing.breadboardId,
      powerRailMetadata: updates.powerRailMetadata
        ? updates.powerRailMetadata.map(r => ({ ...r }))
        : existing.powerRailMetadata.map(r => ({ ...r })),
      signalRailMetadata: updates.signalRailMetadata
        ? updates.signalRailMetadata.map(r => ({ ...r }))
        : existing.signalRailMetadata.map(r => ({ ...r })),
    };
    this.registerBreadboardModel(merged);
  }

  public removeBreadboardModel(id: string): void {
    if (!id) {
      console.warn(`${this.warnPrefix} removeBreadboardModel called with empty id.`);
      return;
    }
    if (!this.modelRegistry.has(id)) {
      console.warn(`${this.warnPrefix} removeBreadboardModel: Model "${id}" not found.`);
      return;
    }
    this.modelRegistry.delete(id);
    this.modelOrder.splice(this.modelOrder.indexOf(id), 1);
  }

  public clearBreadboardModels(): void {
    this.modelRegistry.clear();
    this.modelOrder.length = 0;
  }

  public hasBreadboardModel(id: string): boolean {
    return this.modelRegistry.has(id);
  }

  public getBreadboardModelKeys(): string[] {
    return [...this.modelOrder];
  }

  // ─── Breadboard Position Registry ──────────────────────────

  private validateBreadboardPosition(position: BreadboardPositionModel): boolean {
    if (!position || typeof position !== 'object') {
      console.warn(`${this.warnPrefix} Breadboard position is not a valid object.`);
      return false;
    }
    if (!position.positionId || typeof position.positionId !== 'string') {
      console.warn(`${this.warnPrefix} Breadboard position missing or invalid positionId.`);
      return false;
    }
    if (!position.breadboardId || typeof position.breadboardId !== 'string') {
      console.warn(`${this.warnPrefix} Breadboard position "${position.positionId}" missing or invalid breadboardId.`);
      return false;
    }
    if (!Array.isArray(position.slotPositions)) {
      console.warn(`${this.warnPrefix} Breadboard position "${position.positionId}" slotPositions is not an array.`);
      return false;
    }
    if (!Array.isArray(position.rowPositions)) {
      console.warn(`${this.warnPrefix} Breadboard position "${position.positionId}" rowPositions is not an array.`);
      return false;
    }
    if (!Array.isArray(position.columnPositions)) {
      console.warn(`${this.warnPrefix} Breadboard position "${position.positionId}" columnPositions is not an array.`);
      return false;
    }
    if (!Array.isArray(position.powerRailPositions)) {
      console.warn(`${this.warnPrefix} Breadboard position "${position.positionId}" powerRailPositions is not an array.`);
      return false;
    }
    if (!Array.isArray(position.signalRailPositions)) {
      console.warn(`${this.warnPrefix} Breadboard position "${position.positionId}" signalRailPositions is not an array.`);
      return false;
    }
    return true;
  }

  public registerBreadboardPosition(position: BreadboardPositionModel): void {
    if (!this.validateBreadboardPosition(position)) return;
    if (this.positionRegistry.has(position.positionId)) {
      console.warn(`${this.warnPrefix} Duplicate position ID "${position.positionId}" replaced.`);
    }
    this.positionRegistry.set(position.positionId, safeDeepCopy(position));
    if (!this.positionOrder.includes(position.positionId)) {
      this.positionOrder.push(position.positionId);
    }
  }

  public getBreadboardPosition(id: string): BreadboardPositionModel | undefined {
    if (!id) {
      console.warn(`${this.warnPrefix} getBreadboardPosition called with empty id.`);
      return undefined;
    }
    const entry = this.positionRegistry.get(id);
    return entry ? safeDeepCopy(entry) : undefined;
  }

  public getBreadboardPositions(): BreadboardPositionModel[] {
    return this.positionOrder
      .map(id => this.positionRegistry.get(id))
      .filter((e): e is BreadboardPositionModel => !!e)
      .map(e => safeDeepCopy(e));
  }

  public updateBreadboardPosition(id: string, updates: Partial<BreadboardPositionModel>): void {
    const existing = this.positionRegistry.get(id);
    if (!existing) {
      console.warn(`${this.warnPrefix} updateBreadboardPosition: Position "${id}" not found.`);
      return;
    }
    const merged: BreadboardPositionModel = {
      ...existing,
      ...updates,
      positionId: existing.positionId,
      breadboardId: existing.breadboardId,
      slotPositions: updates.slotPositions
        ? updates.slotPositions.map(s => ({ ...s }))
        : existing.slotPositions.map(s => ({ ...s })),
      rowPositions: updates.rowPositions ? [...updates.rowPositions] : [...existing.rowPositions],
      columnPositions: updates.columnPositions ? [...updates.columnPositions] : [...existing.columnPositions],
      powerRailPositions: updates.powerRailPositions
        ? updates.powerRailPositions.map(p => ({ ...p }))
        : existing.powerRailPositions.map(p => ({ ...p })),
      signalRailPositions: updates.signalRailPositions
        ? updates.signalRailPositions.map(s => ({ ...s }))
        : existing.signalRailPositions.map(s => ({ ...s })),
    };
    this.registerBreadboardPosition(merged);
  }

  public removeBreadboardPosition(id: string): void {
    if (!id) {
      console.warn(`${this.warnPrefix} removeBreadboardPosition called with empty id.`);
      return;
    }
    if (!this.positionRegistry.has(id)) {
      console.warn(`${this.warnPrefix} removeBreadboardPosition: Position "${id}" not found.`);
      return;
    }
    this.positionRegistry.delete(id);
    this.positionOrder.splice(this.positionOrder.indexOf(id), 1);
  }

  public clearBreadboardPositions(): void {
    this.positionRegistry.clear();
    this.positionOrder.length = 0;
  }

  public hasBreadboardPosition(id: string): boolean {
    return this.positionRegistry.has(id);
  }

  public getBreadboardPositionKeys(): string[] {
    return [...this.positionOrder];
  }

  // ─── Component Placement Registry ──────────────────────────

  private validateComponentPlacement(placement: ComponentPlacementModel): boolean {
    if (!placement || typeof placement !== 'object') {
      console.warn(`${this.warnPrefix} Component placement is not a valid object.`);
      return false;
    }
    if (!placement.placementId || typeof placement.placementId !== 'string') {
      console.warn(`${this.warnPrefix} Component placement missing or invalid placementId.`);
      return false;
    }
    if (!placement.componentId || typeof placement.componentId !== 'string') {
      console.warn(`${this.warnPrefix} Component placement "${placement.placementId}" missing or invalid componentId.`);
      return false;
    }
    if (!placement.breadboardId || typeof placement.breadboardId !== 'string') {
      console.warn(`${this.warnPrefix} Component placement "${placement.placementId}" missing or invalid breadboardId.`);
      return false;
    }
    if (!Array.isArray(placement.pinOccupancy)) {
      console.warn(`${this.warnPrefix} Component placement "${placement.placementId}" pinOccupancy is not an array.`);
      return false;
    }
    if (!Array.isArray(placement.slotOccupancy)) {
      console.warn(`${this.warnPrefix} Component placement "${placement.placementId}" slotOccupancy is not an array.`);
      return false;
    }
    if (!placement.boardOccupancy || typeof placement.boardOccupancy !== 'object') {
      console.warn(`${this.warnPrefix} Component placement "${placement.placementId}" boardOccupancy is invalid.`);
      return false;
    }
    return true;
  }

  public registerComponentPlacement(placement: ComponentPlacementModel): void {
    if (!this.validateComponentPlacement(placement)) return;
    if (this.placementRegistry.has(placement.placementId)) {
      console.warn(`${this.warnPrefix} Duplicate placement ID "${placement.placementId}" replaced.`);
    }
    this.placementRegistry.set(placement.placementId, safeDeepCopy(placement));
    if (!this.placementOrder.includes(placement.placementId)) {
      this.placementOrder.push(placement.placementId);
    }
  }

  public getComponentPlacement(id: string): ComponentPlacementModel | undefined {
    if (!id) {
      console.warn(`${this.warnPrefix} getComponentPlacement called with empty id.`);
      return undefined;
    }
    const entry = this.placementRegistry.get(id);
    return entry ? safeDeepCopy(entry) : undefined;
  }

  public getComponentPlacements(): ComponentPlacementModel[] {
    return this.placementOrder
      .map(id => this.placementRegistry.get(id))
      .filter((e): e is ComponentPlacementModel => !!e)
      .map(e => safeDeepCopy(e));
  }

  public updateComponentPlacement(id: string, updates: Partial<ComponentPlacementModel>): void {
    const existing = this.placementRegistry.get(id);
    if (!existing) {
      console.warn(`${this.warnPrefix} updateComponentPlacement: Placement "${id}" not found.`);
      return;
    }
    const merged: ComponentPlacementModel = {
      ...existing,
      ...updates,
      placementId: existing.placementId,
      componentId: existing.componentId,
      breadboardId: existing.breadboardId,
      slotId: updates.slotId ?? existing.slotId,
      pinOccupancy: updates.pinOccupancy
        ? updates.pinOccupancy.map(p => ({ ...p }))
        : existing.pinOccupancy.map(p => ({ ...p })),
      slotOccupancy: updates.slotOccupancy
        ? updates.slotOccupancy.map(s => ({ ...s }))
        : existing.slotOccupancy.map(s => ({ ...s })),
      boardOccupancy: updates.boardOccupancy
        ? { ...existing.boardOccupancy, ...updates.boardOccupancy }
        : { ...existing.boardOccupancy },
    };
    this.registerComponentPlacement(merged);
  }

  public removeComponentPlacement(id: string): void {
    if (!id) {
      console.warn(`${this.warnPrefix} removeComponentPlacement called with empty id.`);
      return;
    }
    if (!this.placementRegistry.has(id)) {
      console.warn(`${this.warnPrefix} removeComponentPlacement: Placement "${id}" not found.`);
      return;
    }
    this.placementRegistry.delete(id);
    this.placementOrder.splice(this.placementOrder.indexOf(id), 1);
  }

  public clearComponentPlacements(): void {
    this.placementRegistry.clear();
    this.placementOrder.length = 0;
  }

  public hasComponentPlacement(id: string): boolean {
    return this.placementRegistry.has(id);
  }

  public getComponentPlacementKeys(): string[] {
    return [...this.placementOrder];
  }

  // ─── Connection Metadata Registry ──────────────────────────

  private validateConnectionMetadata(connection: BreadboardConnectionMetadata): boolean {
    if (!connection || typeof connection !== 'object') {
      console.warn(`${this.warnPrefix} Connection metadata is not a valid object.`);
      return false;
    }
    if (!connection.connectionId || typeof connection.connectionId !== 'string') {
      console.warn(`${this.warnPrefix} Connection metadata missing or invalid connectionId.`);
      return false;
    }
    if (!connection.breadboardId || typeof connection.breadboardId !== 'string') {
      console.warn(`${this.warnPrefix} Connection "${connection.connectionId}" missing or invalid breadboardId.`);
      return false;
    }
    if (!VALID_CONNECTION_TYPES.includes(connection.connectionType)) {
      console.warn(`${this.warnPrefix} Connection "${connection.connectionId}" has invalid connectionType "${connection.connectionType}".`);
      return false;
    }
    if (!Array.isArray(connection.powerRailConnections)) {
      console.warn(`${this.warnPrefix} Connection "${connection.connectionId}" powerRailConnections is not an array.`);
      return false;
    }
    if (!Array.isArray(connection.signalRailConnections)) {
      console.warn(`${this.warnPrefix} Connection "${connection.connectionId}" signalRailConnections is not an array.`);
      return false;
    }
    return true;
  }

  public registerConnectionMetadata(connection: BreadboardConnectionMetadata): void {
    if (!this.validateConnectionMetadata(connection)) return;
    if (this.connectionRegistry.has(connection.connectionId)) {
      console.warn(`${this.warnPrefix} Duplicate connection ID "${connection.connectionId}" replaced.`);
    }
    this.connectionRegistry.set(connection.connectionId, safeDeepCopy(connection));
    if (!this.connectionOrder.includes(connection.connectionId)) {
      this.connectionOrder.push(connection.connectionId);
    }
  }

  public getConnectionMetadata(id: string): BreadboardConnectionMetadata | undefined {
    if (!id) {
      console.warn(`${this.warnPrefix} getConnectionMetadata called with empty id.`);
      return undefined;
    }
    const entry = this.connectionRegistry.get(id);
    return entry ? safeDeepCopy(entry) : undefined;
  }

  public getConnectionMetadataList(): BreadboardConnectionMetadata[] {
    return this.connectionOrder
      .map(id => this.connectionRegistry.get(id))
      .filter((e): e is BreadboardConnectionMetadata => !!e)
      .map(e => safeDeepCopy(e));
  }

  public updateConnectionMetadata(id: string, updates: Partial<BreadboardConnectionMetadata>): void {
    const existing = this.connectionRegistry.get(id);
    if (!existing) {
      console.warn(`${this.warnPrefix} updateConnectionMetadata: Connection "${id}" not found.`);
      return;
    }
    const merged: BreadboardConnectionMetadata = {
      ...existing,
      ...updates,
      connectionId: existing.connectionId,
      breadboardId: existing.breadboardId,
      powerRailConnections: updates.powerRailConnections
        ? updates.powerRailConnections.map(p => ({ ...p }))
        : existing.powerRailConnections.map(p => ({ ...p })),
      signalRailConnections: updates.signalRailConnections
        ? updates.signalRailConnections.map(s => ({ ...s }))
        : existing.signalRailConnections.map(s => ({ ...s })),
    };
    this.registerConnectionMetadata(merged);
  }

  public removeConnectionMetadata(id: string): void {
    if (!id) {
      console.warn(`${this.warnPrefix} removeConnectionMetadata called with empty id.`);
      return;
    }
    if (!this.connectionRegistry.has(id)) {
      console.warn(`${this.warnPrefix} removeConnectionMetadata: Connection "${id}" not found.`);
      return;
    }
    this.connectionRegistry.delete(id);
    this.connectionOrder.splice(this.connectionOrder.indexOf(id), 1);
  }

  public clearConnectionMetadata(): void {
    this.connectionRegistry.clear();
    this.connectionOrder.length = 0;
  }

  public hasConnectionMetadata(id: string): boolean {
    return this.connectionRegistry.has(id);
  }

  public getConnectionMetadataKeys(): string[] {
    return [...this.connectionOrder];
  }

  // ─── Bulk Operations ───────────────────────────────────────

  public clear(): void {
    this.clearBreadboardModels();
    this.clearBreadboardPositions();
    this.clearComponentPlacements();
    this.clearConnectionMetadata();
  }

  public toJSON(): {
    breadboardModels: BreadboardModel[];
    breadboardPositions: BreadboardPositionModel[];
    componentPlacements: ComponentPlacementModel[];
    connectionMetadata: BreadboardConnectionMetadata[];
  } {
    return {
      breadboardModels: this.getBreadboardModels(),
      breadboardPositions: this.getBreadboardPositions(),
      componentPlacements: this.getComponentPlacements(),
      connectionMetadata: this.getConnectionMetadataList(),
    };
  }

  public fromJSON(data: {
    breadboardModels?: BreadboardModel[];
    breadboardPositions?: BreadboardPositionModel[];
    componentPlacements?: ComponentPlacementModel[];
    connectionMetadata?: BreadboardConnectionMetadata[];
  }): void {
    this.clear();
    if (Array.isArray(data.breadboardModels)) {
      for (const model of data.breadboardModels) {
        this.registerBreadboardModel(model);
      }
    }
    if (Array.isArray(data.breadboardPositions)) {
      for (const pos of data.breadboardPositions) {
        this.registerBreadboardPosition(pos);
      }
    }
    if (Array.isArray(data.componentPlacements)) {
      for (const placement of data.componentPlacements) {
        this.registerComponentPlacement(placement);
      }
    }
    if (Array.isArray(data.connectionMetadata)) {
      for (const conn of data.connectionMetadata) {
        this.registerConnectionMetadata(conn);
      }
    }
  }

  public clone(): BreadboardWorkspace {
    const cloned = new BreadboardWorkspace();
    cloned.fromJSON(this.toJSON());
    return cloned;
  }

  public sync(data: {
    breadboardModels?: BreadboardModel[];
    breadboardPositions?: BreadboardPositionModel[];
    componentPlacements?: ComponentPlacementModel[];
    connectionMetadata?: BreadboardConnectionMetadata[];
  }): void {
    this.fromJSON(data);
  }
}
