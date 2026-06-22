/**
 * Phase 42 — Scratch Asset Runtime
 *
 * Costume, Sound, and Backdrop management: upload, rename, delete,
 * duplicate, layers, trimming, preview.
 */

// ─── Types ─────────────────────────────────────────────────────

export type AssetType = 'costume' | 'sound' | 'backdrop';
export type CostumeFormat = 'svg' | 'png' | 'jpg' | 'gif';
export type SoundFormat = 'wav' | 'mp3' | 'ogg';

export interface Costume {
  readonly costumeId: string;
  readonly name: string;
  readonly format: CostumeFormat;
  readonly dataUri: string;
  readonly width: number;
  readonly height: number;
  readonly rotationCenterX: number;
  readonly rotationCenterY: number;
  readonly layerOrder: number;
  readonly sizeBytes: number;
  readonly createdAt: number;
}

export interface Sound {
  readonly soundId: string;
  readonly name: string;
  readonly format: SoundFormat;
  readonly dataUri: string;
  readonly durationSeconds: number;
  readonly sampleRate: number;
  readonly sizeBytes: number;
  readonly trimStart: number;
  readonly trimEnd: number;
  readonly volume: number;
  readonly createdAt: number;
}

export interface Backdrop {
  readonly backdropId: string;
  readonly name: string;
  readonly format: CostumeFormat;
  readonly dataUri: string;
  readonly width: number;
  readonly height: number;
  readonly sizeBytes: number;
  readonly createdAt: number;
}

export interface AssetLibrary {
  readonly libraryId: string;
  readonly spriteId: string;
  readonly costumes: Costume[];
  readonly sounds: Sound[];
  readonly currentCostumeIndex: number;
  readonly currentVolume: number;
}

export interface StageAssets {
  readonly stageId: string;
  readonly backdrops: Backdrop[];
  readonly currentBackdropIndex: number;
  readonly sounds: Sound[];
}

// ─── Helpers ──────────────────────────────────────────────────

let _seq = 0;
function uid(): string { return `asset_${Date.now()}_${++_seq}`; }
const now = () => Date.now();

// ─── Costume Management ───────────────────────────────────────

export function createCostume(name: string, format: CostumeFormat, dataUri: string, width: number, height: number): Costume {
  return {
    costumeId: uid(), name, format, dataUri, width, height,
    rotationCenterX: Math.floor(width / 2), rotationCenterY: Math.floor(height / 2),
    layerOrder: 0, sizeBytes: dataUri.length, createdAt: now(),
  };
}

export function renameCostume(costume: Costume, name: string): Costume {
  return { ...costume, name };
}

export function duplicateCostume(costume: Costume): Costume {
  return { ...costume, costumeId: uid(), name: `${costume.name} copy`, createdAt: now() };
}

export function setCostumeRotationCenter(costume: Costume, x: number, y: number): Costume {
  return { ...costume, rotationCenterX: x, rotationCenterY: y };
}

export function setCostumeLayer(costume: Costume, layer: number): Costume {
  return { ...costume, layerOrder: layer };
}

// ─── Sound Management ─────────────────────────────────────────

export function createSound(name: string, format: SoundFormat, dataUri: string, durationSeconds: number, sampleRate: number = 44100): Sound {
  return {
    soundId: uid(), name, format, dataUri, durationSeconds, sampleRate,
    sizeBytes: dataUri.length, trimStart: 0, trimEnd: durationSeconds,
    volume: 100, createdAt: now(),
  };
}

export function renameSound(sound: Sound, name: string): Sound {
  return { ...sound, name };
}

export function duplicateSound(sound: Sound): Sound {
  return { ...sound, soundId: uid(), name: `${sound.name} copy`, createdAt: now() };
}

export function trimSound(sound: Sound, start: number, end: number): Sound {
  return { ...sound, trimStart: Math.max(0, start), trimEnd: Math.min(sound.durationSeconds, end) };
}

export function setSoundVolume(sound: Sound, volume: number): Sound {
  return { ...sound, volume: Math.max(0, Math.min(100, volume)) };
}

export function getSoundTrimmedDuration(sound: Sound): number {
  return Math.max(0, sound.trimEnd - sound.trimStart);
}

// ─── Backdrop Management ──────────────────────────────────────

export function createBackdrop(name: string, format: CostumeFormat, dataUri: string, width: number = 480, height: number = 360): Backdrop {
  return { backdropId: uid(), name, format, dataUri, width, height, sizeBytes: dataUri.length, createdAt: now() };
}

export function renameBackdrop(backdrop: Backdrop, name: string): Backdrop {
  return { ...backdrop, name };
}

export function duplicateBackdrop(backdrop: Backdrop): Backdrop {
  return { ...backdrop, backdropId: uid(), name: `${backdrop.name} copy`, createdAt: now() };
}

// ─── Asset Library ────────────────────────────────────────────

export function createAssetLibrary(spriteId: string): AssetLibrary {
  return { libraryId: uid(), spriteId, costumes: [], sounds: [], currentCostumeIndex: 0, currentVolume: 100 };
}

export function addCostumeToLibrary(library: AssetLibrary, costume: Costume): AssetLibrary {
  return { ...library, costumes: [...library.costumes, { ...costume, layerOrder: library.costumes.length }] };
}

export function removeCostumeFromLibrary(library: AssetLibrary, costumeId: string): AssetLibrary {
  const costumes = library.costumes.filter(c => c.costumeId !== costumeId);
  const currentIndex = Math.min(library.currentCostumeIndex, Math.max(0, costumes.length - 1));
  return { ...library, costumes, currentCostumeIndex: currentIndex };
}

export function setCostumeIndex(library: AssetLibrary, index: number): AssetLibrary {
  return { ...library, currentCostumeIndex: Math.max(0, Math.min(library.costumes.length - 1, index)) };
}

export function nextCostume(library: AssetLibrary): AssetLibrary {
  const next = (library.currentCostumeIndex + 1) % Math.max(1, library.costumes.length);
  return { ...library, currentCostumeIndex: next };
}

export function addSoundToLibrary(library: AssetLibrary, sound: Sound): AssetLibrary {
  return { ...library, sounds: [...library.sounds, sound] };
}

export function removeSoundFromLibrary(library: AssetLibrary, soundId: string): AssetLibrary {
  return { ...library, sounds: library.sounds.filter(s => s.soundId !== soundId) };
}

// ─── Stage Assets ──────────────────────────────────────────────

export function createStageAssets(): StageAssets {
  return { stageId: uid(), backdrops: [], currentBackdropIndex: 0, sounds: [] };
}

export function addBackdropToStage(stage: StageAssets, backdrop: Backdrop): StageAssets {
  return { ...stage, backdrops: [...stage.backdrops, backdrop] };
}

export function removeBackdropFromStage(stage: StageAssets, backdropId: string): StageAssets {
  const backdrops = stage.backdrops.filter(b => b.backdropId !== backdropId);
  return { ...stage, backdrops, currentBackdropIndex: Math.min(stage.currentBackdropIndex, Math.max(0, backdrops.length - 1)) };
}

export function switchBackdrop(stage: StageAssets, index: number): StageAssets {
  return { ...stage, currentBackdropIndex: Math.max(0, Math.min(stage.backdrops.length - 1, index)) };
}

export function nextBackdrop(stage: StageAssets): StageAssets {
  const next = (stage.currentBackdropIndex + 1) % Math.max(1, stage.backdrops.length);
  return { ...stage, currentBackdropIndex: next };
}

export function getCurrentBackdrop(stage: StageAssets): Backdrop | null {
  return stage.backdrops[stage.currentBackdropIndex] ?? null;
}
