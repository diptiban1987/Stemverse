/**
 * Generic deterministic render registry with O(1) lookup, deep-copy safety,
 * serialization support, and warning-only validation.
 */

function safeDeepCopy<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

export class RenderRegistry<T extends Record<string, unknown>> {
  private readonly entries = new Map<string, T>();
  private readonly order: string[] = [];

  public get size(): number {
    return this.entries.size;
  }

  /**
   * Registers an entry. Warns on duplicate key and replaces the value
   * while preserving insertion order.
   */
  public register(key: string, value: T, warnPrefix = '[RenderRegistry]'): void {
    if (!key) {
      console.warn(`${warnPrefix} register called with empty key.`);
      return;
    }
    const copy = safeDeepCopy(value);
    if (this.entries.has(key)) {
      console.warn(`${warnPrefix} duplicate key "${key}" replaced.`);
      this.entries.set(key, copy);
      return;
    }
    this.entries.set(key, copy);
    this.order.push(key);
  }

  /**
   * Looks up an entry by key. Returns undefined for missing keys.
   * Always returns a deep copy to prevent mutation leakage.
   */
  public lookup(key: string): T | undefined {
    if (!key) return undefined;
    const val = this.entries.get(key);
    if (!val) return undefined;
    return safeDeepCopy(val) as T;
  }

  /**
   * Returns the internal reference for direct read-only access.
   * Use carefully — mutations affect the registry.
   */
  public lookupRaw(key: string): T | undefined {
    if (!key) return undefined;
    return this.entries.get(key);
  }

  /**
   * Updates fields on an existing entry. Warns if the key is missing.
   * Applies partial merge and stores a deep copy.
   */
  public update(key: string, partial: Partial<T>, warnPrefix = '[RenderRegistry]'): void {
    if (!key) {
      console.warn(`${warnPrefix} update called with empty key.`);
      return;
    }
    const existing = this.entries.get(key);
    if (!existing) {
      console.warn(`${warnPrefix} update called for missing key "${key}".`);
      return;
    }
    const merged = { ...existing, ...partial };
    this.entries.set(key, safeDeepCopy(merged));
  }

  /**
   * Removes an entry by key. Warns on missing key.
   */
  public remove(key: string, warnPrefix = '[RenderRegistry]'): void {
    if (!key) {
      console.warn(`${warnPrefix} remove called with empty key.`);
      return;
    }
    if (!this.entries.has(key)) {
      console.warn(`${warnPrefix} remove called for missing key "${key}".`);
      return;
    }
    this.entries.delete(key);
    const idx = this.order.indexOf(key);
    if (idx !== -1) {
      this.order.splice(idx, 1);
    }
  }

  /**
   * Removes all entries.
   */
  public clear(): void {
    this.entries.clear();
    this.order.length = 0;
  }

  /**
   * Returns all entries in insertion order as a new array of deep copies.
   */
  public getAll(): T[] {
    return this.order.map(k => {
      const val = this.entries.get(k)!;
      return safeDeepCopy(val) as T;
    });
  }

  /**
   * Returns all entries in insertion order as an array of key-value pairs (deep copies).
   */
  public getEntries(): Array<{ key: string; value: T }> {
    return this.order.map(k => {
      const val = this.entries.get(k)!;
      return { key: k, value: safeDeepCopy(val) as T };
    });
  }

  /**
   * Checks if a key exists.
   */
  public has(key: string): boolean {
    return this.entries.has(key);
  }

  /**
   * Returns all keys in insertion order.
   */
  public keys(): string[] {
    return [...this.order];
  }

  /**
   * Serializes the entire registry to a JSON-safe array.
   */
  public toJSON(): T[] {
    return this.getAll();
  }

  /**
   * Restores registry state from a JSON-safe array.
   * Clears existing entries first.
   */
  public fromJSON(items: T[], keyFn: (item: T) => string, warnPrefix = '[RenderRegistry]'): void {
    this.clear();
    for (const item of items) {
      const k = keyFn(item);
      if (!k) {
        console.warn(`${warnPrefix} fromJSON: item missing key, skipping.`);
        continue;
      }
      this.entries.set(k, safeDeepCopy(item));
      this.order.push(k);
    }
  }

  /**
   * Creates an independent deep clone of this registry.
   */
  public clone(): RenderRegistry<T> {
    const cloned = new RenderRegistry<T>();
    for (const k of this.order) {
      const val = this.entries.get(k)!;
      cloned.entries.set(k, safeDeepCopy(val));
      cloned.order.push(k);
    }
    return cloned;
  }

  /**
   * Applies a snapshot sync: replaces all entries with the provided items.
   * Returns orphaned keys that were removed.
   */
  public sync(items: T[], keyFn: (item: T) => string, warnPrefix = '[RenderRegistry]'): string[] {
    const incomingKeys = new Set<string>();
    for (const item of items) {
      const k = keyFn(item);
      if (!k) continue;
      incomingKeys.add(k);
      if (this.entries.has(k)) {
        this.entries.set(k, safeDeepCopy(item));
      } else {
        this.entries.set(k, safeDeepCopy(item));
        this.order.push(k);
      }
    }
    const orphaned: string[] = [];
    for (let i = this.order.length - 1; i >= 0; i--) {
      const k = this.order[i];
      if (!incomingKeys.has(k)) {
        orphaned.push(k);
        this.entries.delete(k);
        this.order.splice(i, 1);
      }
    }
    return orphaned;
  }
}
