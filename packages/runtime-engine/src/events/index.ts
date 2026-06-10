/**
 * Defines standard runtime events representing user interaction,
 * project lifecycle shifts, and inter-thread messaging.
 */

export enum RuntimeEventType {
  PROJECT_START = 'project_start',
  PROJECT_STOP = 'project_stop',
  GREEN_FLAG = 'green_flag',
  BROADCAST = 'broadcast',
  TARGET_ADDED = 'target_added',
  TARGET_REMOVED = 'target_removed',
  VARIABLE_CHANGED = 'variable_changed',
  THREAD_COMPLETED = 'thread_completed'
}

/**
 * Standard data payload passed alongside runtime events.
 */
export interface RuntimeEventPayload {
  type: RuntimeEventType;
  timestamp: number;
  data?: Record<string, any>;
}

export type RuntimeEventListener = (payload: RuntimeEventPayload) => void;

/**
 * Minimal dispatcher interface for subscribing to and broadcasting runtime events.
 */
export interface IRuntimeEventEmitter {
  /**
   * Subscribes to an event type.
   */
  on(event: RuntimeEventType, listener: RuntimeEventListener): void;

  /**
   * Unsubscribes from an event type.
   */
  off(event: RuntimeEventType, listener: RuntimeEventListener): void;

  /**
   * Emits an event payload to all active listeners.
   */
  emit(event: RuntimeEventType, payload: Omit<RuntimeEventPayload, 'type' | 'timestamp'>): void;
}
