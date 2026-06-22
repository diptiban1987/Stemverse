/**
 * Phase 42 — SB3 Exporter Runtime
 *
 * Export projects to SB3 format, ZIP packaging, STEMVerse package.
 */

export type ExportFormat = 'sb3' | 'zip' | 'stemverse';
export type ExportStatus = 'pending' | 'building' | 'complete' | 'error';

export interface ExportManifest {
  readonly manifestId: string;
  readonly projectId: string;
  readonly format: ExportFormat;
  readonly fileName: string;
  readonly targets: ExportTarget[];
  readonly metadata: ExportMetadata;
  readonly status: ExportStatus;
  readonly sizeBytes: number;
  readonly createdAt: number;
}

export interface ExportTarget {
  readonly name: string;
  readonly isStage: boolean;
  readonly blockCount: number;
  readonly costumeCount: number;
  readonly soundCount: number;
  readonly variableCount: number;
}

export interface ExportMetadata {
  readonly semver: string;
  readonly vm: string;
  readonly agent: string;
  readonly platform: string;
  readonly exportedAt: number;
}

export interface PackageBundle {
  readonly bundleId: string;
  readonly projectId: string;
  readonly format: ExportFormat;
  readonly files: PackageFile[];
  readonly totalSize: number;
  readonly createdAt: number;
}

export interface PackageFile {
  readonly path: string;
  readonly type: 'json' | 'svg' | 'png' | 'wav' | 'mp3';
  readonly sizeBytes: number;
}

let _seq = 0;
function uid(): string { return `exp_${Date.now()}_${++_seq}`; }
const now = () => Date.now();

export function createExportManifest(projectId: string, format: ExportFormat, targets: ExportTarget[]): ExportManifest {
  const ext = format === 'sb3' ? '.sb3' : format === 'zip' ? '.zip' : '.stemverse';
  return {
    manifestId: uid(), projectId, format,
    fileName: `project_${projectId}${ext}`, targets,
    metadata: { semver: '3.0.0', vm: '1.0.0', agent: 'STEMVerse/1.0', platform: 'stemverse', exportedAt: now() },
    status: 'pending', sizeBytes: 0, createdAt: now(),
  };
}

export function buildExport(manifest: ExportManifest): ExportManifest {
  return { ...manifest, status: 'building' };
}

export function completeExport(manifest: ExportManifest, sizeBytes: number): ExportManifest {
  return { ...manifest, status: 'complete', sizeBytes };
}

export function failExport(manifest: ExportManifest): ExportManifest {
  return { ...manifest, status: 'error' };
}

export function createSB3Json(targets: ExportTarget[]): Record<string, unknown> {
  return {
    targets: targets.map((t, i) => ({
      isStage: t.isStage, name: t.name, variables: {}, lists: {}, broadcasts: {},
      blocks: {}, comments: {}, currentCostume: 0, costumes: [], sounds: [],
      volume: 100, layerOrder: i, visible: true, x: 0, y: 0, size: 100, direction: 90,
      draggable: false, rotationStyle: 'all around',
    })),
    monitors: [], extensions: [],
    meta: { semver: '3.0.0', vm: '1.0.0-stemverse', agent: 'STEMVerse Exporter' },
  };
}

export function createPackageBundle(projectId: string, format: ExportFormat, files: PackageFile[]): PackageBundle {
  return { bundleId: uid(), projectId, format, files, totalSize: files.reduce((s, f) => s + f.sizeBytes, 0), createdAt: now() };
}

export function addFileToBundle(bundle: PackageBundle, path: string, type: PackageFile['type'], sizeBytes: number): PackageBundle {
  const file: PackageFile = { path, type, sizeBytes };
  return { ...bundle, files: [...bundle.files, file], totalSize: bundle.totalSize + sizeBytes };
}

export function getExportFormats(): ExportFormat[] { return ['sb3', 'zip', 'stemverse']; }
