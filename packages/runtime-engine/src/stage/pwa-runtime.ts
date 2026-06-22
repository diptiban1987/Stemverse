/**
 * Phase 37A — PWA Runtime
 *
 * Service worker management, offline caching, background sync,
 * install prompts, update notifications.
 */

import type {
  OfflineAssetModel, ServiceWorkerConfig, PwaInstallState,
  OfflineSyncEntry, CacheStrategy, SyncStatus, PwaSnapshot,
} from '../types';

// ─── Helpers ─────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => Date.now();

// ─── Constants ───────────────────────────────────────────────
const DEFAULT_CACHE_NAME = 'stemverse-cache-v1';
const DEFAULT_MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB
const DEFAULT_MAX_AGE = 7 * 24 * 60 * 60 * 1000;  // 7 days
const PRECACHE_URLS = [
  '/', '/simulator', '/projects', '/gallery', '/marketplace',
  '/classrooms', '/competitions', '/collaborate', '/devices',
  '/dashboard', '/auth/login', '/auth/signup',
  '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png',
];

// ─── Service Worker Config ───────────────────────────────────

export function createServiceWorkerConfig(version = '1.0.0', strategy: CacheStrategy = 'stale-while-revalidate'): ServiceWorkerConfig {
  return {
    version, cacheName: `${DEFAULT_CACHE_NAME}-${version}`,
    precacheUrls: [...PRECACHE_URLS],
    runtimeCachePatterns: ['/api/', '/assets/', '/_next/'],
    strategy, maxCacheSize: DEFAULT_MAX_CACHE_SIZE, maxAge: DEFAULT_MAX_AGE,
  };
}

export function registerServiceWorker(config: ServiceWorkerConfig): { registered: boolean; version: string } {
  return { registered: true, version: config.version };
}

export function unregisterServiceWorker(): boolean {
  return true;
}

export function updateServiceWorker(config: ServiceWorkerConfig, newVersion: string): ServiceWorkerConfig {
  return { ...config, version: newVersion, cacheName: `${DEFAULT_CACHE_NAME}-${newVersion}` };
}

// ─── Offline Asset Caching ───────────────────────────────────

export function cacheOfflineAsset(
  type: OfflineAssetModel['type'], name: string, data: string,
  sizeBytes: number, version = '1.0',
): OfflineAssetModel {
  return {
    assetId: uid(), type, name, sizeBytes, cachedAt: now(),
    expiresAt: now() + DEFAULT_MAX_AGE, syncStatus: 'synced',
    version, data,
  };
}

export function evictExpiredAssets(assets: OfflineAssetModel[]): OfflineAssetModel[] {
  return assets.filter(a => a.expiresAt > now());
}

export function getCacheSize(assets: OfflineAssetModel[]): number {
  return assets.reduce((sum, a) => sum + a.sizeBytes, 0);
}

export function evictToFitBudget(assets: OfflineAssetModel[], budgetBytes: number): OfflineAssetModel[] {
  const sorted = [...assets].sort((a, b) => a.cachedAt - b.cachedAt);
  let total = sorted.reduce((s, a) => s + a.sizeBytes, 0);
  while (total > budgetBytes && sorted.length > 0) {
    const evicted = sorted.shift()!;
    total -= evicted.sizeBytes;
  }
  return sorted;
}

export function refreshAsset(asset: OfflineAssetModel, newData: string, newSize: number): OfflineAssetModel {
  return { ...asset, data: newData, sizeBytes: newSize, cachedAt: now(), expiresAt: now() + DEFAULT_MAX_AGE, syncStatus: 'synced' };
}

// ─── Background Sync ─────────────────────────────────────────

export function addToSyncQueue(
  action: OfflineSyncEntry['action'], entityType: string,
  entityId: string, payload: string,
): OfflineSyncEntry {
  return { entryId: uid(), action, entityType, entityId, payload, createdAt: now(), retryCount: 0, status: 'pending' };
}

export function processSyncEntry(entry: OfflineSyncEntry, success: boolean): OfflineSyncEntry {
  if (success) return { ...entry, status: 'synced' };
  return { ...entry, retryCount: entry.retryCount + 1, status: entry.retryCount >= 3 ? 'failed' : 'pending' };
}

export function getPendingSyncEntries(queue: OfflineSyncEntry[]): OfflineSyncEntry[] {
  return queue.filter(e => e.status === 'pending');
}

export function getSyncedEntries(queue: OfflineSyncEntry[]): OfflineSyncEntry[] {
  return queue.filter(e => e.status === 'synced');
}

export function getFailedEntries(queue: OfflineSyncEntry[]): OfflineSyncEntry[] {
  return queue.filter(e => e.status === 'failed');
}

export function clearSyncedEntries(queue: OfflineSyncEntry[]): OfflineSyncEntry[] {
  return queue.filter(e => e.status !== 'synced');
}

export function retrySyncEntry(entry: OfflineSyncEntry): OfflineSyncEntry {
  return { ...entry, status: 'pending', retryCount: 0 };
}

// ─── Install Prompt ──────────────────────────────────────────

export function createInstallState(version = '1.0.0'): PwaInstallState {
  return {
    isInstalled: false, isInstallable: true, isUpdateAvailable: false,
    currentVersion: version, latestVersion: version,
    installPromptDeferred: false, lastChecked: now(),
  };
}

export function markInstalled(state: PwaInstallState): PwaInstallState {
  return { ...state, isInstalled: true, isInstallable: false };
}

export function checkForUpdate(state: PwaInstallState, latestVersion: string): PwaInstallState {
  return {
    ...state, latestVersion, lastChecked: now(),
    isUpdateAvailable: latestVersion !== state.currentVersion,
  };
}

export function applyUpdate(state: PwaInstallState): PwaInstallState {
  return {
    ...state, currentVersion: state.latestVersion,
    isUpdateAvailable: false,
  };
}

export function deferInstallPrompt(state: PwaInstallState): PwaInstallState {
  return { ...state, installPromptDeferred: true };
}

// ─── PWA Snapshot ────────────────────────────────────────────

export function createDefaultPwaSnapshot(): PwaSnapshot {
  return {
    offlineAssets: [], syncQueue: [],
    installState: createInstallState(),
    cacheSize: 0, storageUsed: 0, storageQuota: 0,
    isOnline: true, lastSync: now(),
  };
}

// ─── Synchronizer ────────────────────────────────────────────

export class PwaSynchronizer {
  private assets = new Map<string, OfflineAssetModel>();
  private syncQueue: OfflineSyncEntry[] = [];
  private installState: PwaInstallState = createInstallState();
  private assetOrder: string[] = [];

  cacheAsset(a: OfflineAssetModel) { this.assets.set(a.assetId, { ...a }); if (!this.assetOrder.includes(a.assetId)) this.assetOrder.push(a.assetId); }
  getAsset(id: string) { const a = this.assets.get(id); return a ? { ...a } : undefined; }
  getAllAssets() { return this.assetOrder.map(id => ({ ...this.assets.get(id)! })); }
  hasAsset(id: string) { return this.assets.has(id); }
  removeAsset(id: string) { this.assets.delete(id); this.assetOrder = this.assetOrder.filter(i => i !== id); }

  addSync(e: OfflineSyncEntry) { this.syncQueue.push({ ...e }); }
  getSyncQueue() { return this.syncQueue.map(e => ({ ...e })); }
  clearSynced() { this.syncQueue = this.syncQueue.filter(e => e.status !== 'synced'); }

  setInstallState(s: PwaInstallState) { this.installState = { ...s }; }
  getInstallState() { return { ...this.installState }; }

  clear() { this.assets.clear(); this.syncQueue = []; this.assetOrder = []; this.installState = createInstallState(); }

  toJSON(): PwaSnapshot {
    return {
      offlineAssets: this.getAllAssets(),
      syncQueue: this.getSyncQueue(),
      installState: this.getInstallState(),
      cacheSize: this.getAllAssets().reduce((s, a) => s + a.sizeBytes, 0),
      storageUsed: 0, storageQuota: 0, isOnline: true, lastSync: Date.now(),
    };
  }

  fromJSON(snap: PwaSnapshot) {
    this.clear();
    snap.offlineAssets.forEach(a => this.cacheAsset(a));
    snap.syncQueue.forEach(e => this.addSync(e));
    this.setInstallState(snap.installState);
  }

  clone(): PwaSynchronizer {
    const c = new PwaSynchronizer();
    c.fromJSON(this.toJSON());
    return c;
  }
}
