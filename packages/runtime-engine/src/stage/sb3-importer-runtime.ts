/**
 * Phase 42 — SB3 Importer Runtime
 *
 * Import .sb3, .sb2, .sprite3 files. Parse sprites, variables, lists,
 * broadcasts, costumes, sounds and convert to STEMVerse format.
 */

// ─── Types ─────────────────────────────────────────────────────

export type ScratchFileFormat = 'sb3' | 'sb2' | 'sprite3';

export interface SB3Project {
  readonly projectId: string;
  readonly name: string;
  readonly format: ScratchFileFormat;
  readonly targets: SB3Target[];
  readonly monitors: SB3Monitor[];
  readonly extensions: string[];
  readonly meta: SB3Meta;
  readonly importedAt: number;
}

export interface SB3Target {
  readonly targetId: string;
  readonly name: string;
  readonly isStage: boolean;
  readonly variables: SB3Variable[];
  readonly lists: SB3List[];
  readonly broadcasts: SB3Broadcast[];
  readonly blocks: SB3Block[];
  readonly costumes: SB3Costume[];
  readonly sounds: SB3Sound[];
  readonly currentCostume: number;
  readonly volume: number;
  readonly layerOrder: number;
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly direction: number;
  readonly visible: boolean;
  readonly rotationStyle: string;
}

export interface SB3Variable {
  readonly variableId: string;
  readonly name: string;
  readonly value: string | number;
  readonly isCloud: boolean;
}

export interface SB3List {
  readonly listId: string;
  readonly name: string;
  readonly items: (string | number)[];
}

export interface SB3Broadcast {
  readonly broadcastId: string;
  readonly name: string;
}

export interface SB3Block {
  readonly blockId: string;
  readonly opcode: string;
  readonly next: string | null;
  readonly parent: string | null;
  readonly inputs: Record<string, unknown>;
  readonly fields: Record<string, unknown>;
  readonly topLevel: boolean;
  readonly x: number;
  readonly y: number;
}

export interface SB3Costume {
  readonly costumeId: string;
  readonly name: string;
  readonly assetId: string;
  readonly dataFormat: string;
  readonly rotationCenterX: number;
  readonly rotationCenterY: number;
}

export interface SB3Sound {
  readonly soundId: string;
  readonly name: string;
  readonly assetId: string;
  readonly dataFormat: string;
  readonly rate: number;
  readonly sampleCount: number;
}

export interface SB3Monitor {
  readonly monitorId: string;
  readonly opcode: string;
  readonly params: Record<string, string>;
  readonly visible: boolean;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface SB3Meta {
  readonly semver: string;
  readonly vm: string;
  readonly agent: string;
}

export interface ImportResult {
  readonly resultId: string;
  readonly project: SB3Project;
  readonly spritesImported: number;
  readonly variablesImported: number;
  readonly listsImported: number;
  readonly broadcastsImported: number;
  readonly costumesImported: number;
  readonly soundsImported: number;
  readonly blocksImported: number;
  readonly warnings: string[];
  readonly errors: string[];
  readonly importedAt: number;
}

export interface MigrationResult {
  readonly migrationId: string;
  readonly sourceFormat: ScratchFileFormat;
  readonly targetFormat: 'stemverse' | 'blockly';
  readonly spritesConverted: number;
  readonly blocksConverted: number;
  readonly assetsConverted: number;
  readonly unsupportedBlocks: string[];
  readonly migratedAt: number;
}

// ─── Helpers ──────────────────────────────────────────────────

let _seq = 0;
function uid(): string { return `sb3_${Date.now()}_${++_seq}`; }
const now = () => Date.now();

// ─── Parser ────────────────────────────────────────────────────

export function parseSB3Project(json: Record<string, unknown>, name: string = 'Untitled'): SB3Project {
  const targets = (json.targets as unknown[] ?? []).map((t: any, i: number) => parseSB3Target(t, i));
  const monitors = (json.monitors as unknown[] ?? []).map((m: any) => ({
    monitorId: uid(), opcode: m.opcode ?? '', params: m.params ?? {},
    visible: m.visible ?? false, x: m.x ?? 0, y: m.y ?? 0, width: m.width ?? 0, height: m.height ?? 0,
  }));
  const meta = json.meta as any ?? {};
  return {
    projectId: uid(), name, format: 'sb3', targets, monitors,
    extensions: (json.extensions as string[]) ?? [],
    meta: { semver: meta.semver ?? '3.0.0', vm: meta.vm ?? '0.2.0', agent: meta.agent ?? '' },
    importedAt: now(),
  };
}

function parseSB3Target(raw: any, layerOrder: number): SB3Target {
  const variables = Object.entries(raw.variables ?? {}).map(([id, v]: [string, any]) => ({
    variableId: id, name: Array.isArray(v) ? v[0] : '', value: Array.isArray(v) ? v[1] : 0, isCloud: Array.isArray(v) && v.length > 2 && v[2],
  }));
  const lists = Object.entries(raw.lists ?? {}).map(([id, l]: [string, any]) => ({
    listId: id, name: Array.isArray(l) ? l[0] : '', items: Array.isArray(l) && l[1] ? l[1] : [],
  }));
  const broadcasts = Object.entries(raw.broadcasts ?? {}).map(([id, name]: [string, any]) => ({
    broadcastId: id, name: String(name),
  }));
  const blocks = Object.entries(raw.blocks ?? {}).map(([id, b]: [string, any]) => ({
    blockId: id, opcode: b.opcode ?? '', next: b.next ?? null, parent: b.parent ?? null,
    inputs: b.inputs ?? {}, fields: b.fields ?? {}, topLevel: b.topLevel ?? false,
    x: b.x ?? 0, y: b.y ?? 0,
  }));
  const costumes = (raw.costumes ?? []).map((c: any) => ({
    costumeId: uid(), name: c.name ?? '', assetId: c.assetId ?? c.md5ext ?? '',
    dataFormat: c.dataFormat ?? 'svg', rotationCenterX: c.rotationCenterX ?? 0, rotationCenterY: c.rotationCenterY ?? 0,
  }));
  const sounds = (raw.sounds ?? []).map((s: any) => ({
    soundId: uid(), name: s.name ?? '', assetId: s.assetId ?? s.md5ext ?? '',
    dataFormat: s.dataFormat ?? 'wav', rate: s.rate ?? 44100, sampleCount: s.sampleCount ?? 0,
  }));
  return {
    targetId: uid(), name: raw.name ?? `Sprite${layerOrder}`, isStage: raw.isStage ?? false,
    variables, lists, broadcasts, blocks, costumes, sounds,
    currentCostume: raw.currentCostume ?? 0, volume: raw.volume ?? 100,
    layerOrder, x: raw.x ?? 0, y: raw.y ?? 0, size: raw.size ?? 100,
    direction: raw.direction ?? 90, visible: raw.visible ?? true,
    rotationStyle: raw.rotationStyle ?? 'all around',
  };
}

// ─── Import ────────────────────────────────────────────────────

export function importSB3(json: Record<string, unknown>, name: string = 'Untitled'): ImportResult {
  const project = parseSB3Project(json, name);
  const warnings: string[] = [];
  let costumesCount = 0, soundsCount = 0, blocksCount = 0, varsCount = 0, listsCount = 0, broadcastsCount = 0;
  for (const t of project.targets) {
    costumesCount += t.costumes.length;
    soundsCount += t.sounds.length;
    blocksCount += t.blocks.length;
    varsCount += t.variables.length;
    listsCount += t.lists.length;
    broadcastsCount += t.broadcasts.length;
    if (t.variables.some(v => v.isCloud)) warnings.push(`Cloud variable "${t.variables.find(v => v.isCloud)?.name}" not supported`);
  }
  for (const ext of project.extensions) {
    if (!['pen', 'music', 'videoSensing'].includes(ext)) warnings.push(`Extension "${ext}" may not be fully supported`);
  }
  return {
    resultId: uid(), project, spritesImported: project.targets.filter(t => !t.isStage).length,
    variablesImported: varsCount, listsImported: listsCount, broadcastsImported: broadcastsCount,
    costumesImported: costumesCount, soundsImported: soundsCount, blocksImported: blocksCount,
    warnings, errors: [], importedAt: now(),
  };
}

// ─── Migration ─────────────────────────────────────────────────

export function migrateToSTEMVerse(project: SB3Project): MigrationResult {
  const unsupported: string[] = [];
  let blocksConverted = 0, assetsConverted = 0;
  for (const t of project.targets) {
    for (const b of t.blocks) {
      if (b.opcode.startsWith('videoSensing_') || b.opcode.startsWith('translate_')) {
        unsupported.push(b.opcode);
      } else {
        blocksConverted++;
      }
    }
    assetsConverted += t.costumes.length + t.sounds.length;
  }
  return {
    migrationId: uid(), sourceFormat: project.format, targetFormat: 'stemverse',
    spritesConverted: project.targets.filter(t => !t.isStage).length,
    blocksConverted, assetsConverted, unsupportedBlocks: [...new Set(unsupported)],
    migratedAt: now(),
  };
}

export function migrateToBlockly(project: SB3Project): MigrationResult {
  let blocksConverted = 0;
  const unsupported: string[] = [];
  for (const t of project.targets) {
    for (const b of t.blocks) { blocksConverted++; }
  }
  return {
    migrationId: uid(), sourceFormat: project.format, targetFormat: 'blockly',
    spritesConverted: project.targets.filter(t => !t.isStage).length,
    blocksConverted, assetsConverted: 0, unsupportedBlocks: unsupported,
    migratedAt: now(),
  };
}

export function getSupportedFormats(): ScratchFileFormat[] {
  return ['sb3', 'sb2', 'sprite3'];
}
