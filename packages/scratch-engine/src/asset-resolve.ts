/**
 * Resolves Scratch asset manifest entries to download URLs (via API presign batch).
 * Runtime loads costumes/sounds using URLs returned from POST .../assets/resolve-urls.
 */

export type ScratchAssetManifestEntry = {
  assetId: string;
  name: string;
  mimeType: string;
};

export type ScratchAssetManifest = {
  projectId: string;
  costumes: ScratchAssetManifestEntry[];
  sounds: ScratchAssetManifestEntry[];
  assetCount: number;
};

export function buildScratchAssetIdList(manifest: ScratchAssetManifest): string[] {
  return [...manifest.costumes, ...manifest.sounds].map((a) => a.assetId);
}
