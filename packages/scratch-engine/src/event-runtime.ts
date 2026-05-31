export type ScratchEventType = 'greenFlag' | 'broadcast' | 'message';

export type ScratchEvent = {
  type: ScratchEventType;
  name?: string;
  payload?: unknown;
};

type EventHandler = (event: ScratchEvent) => void;

/** Lightweight event bus for stage/sprite coordination (no VM rewrite). */
export class ScratchEventRuntime {
  private handlers = new Map<string, Set<EventHandler>>();

  emit(event: ScratchEvent): void {
    const key = this.eventKey(event);
    this.handlers.get(key)?.forEach((h) => h(event));
    this.handlers.get('*')?.forEach((h) => h(event));
  }

  on(type: ScratchEventType, name: string | undefined, handler: EventHandler): () => void {
    const key = this.eventKey({ type, name });
    if (!this.handlers.has(key)) this.handlers.set(key, new Set());
    this.handlers.get(key)!.add(handler);
    return () => this.handlers.get(key)?.delete(handler);
  }

  onAny(handler: EventHandler): () => void {
    if (!this.handlers.has('*')) this.handlers.set('*', new Set());
    this.handlers.get('*')!.add(handler);
    return () => this.handlers.get('*')?.delete(handler);
  }

  private eventKey(event: ScratchEvent): string {
    return `${event.type}:${event.name ?? ''}`;
  }
}
