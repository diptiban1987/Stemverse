import { AssetBucket, AssetPurpose } from '@stemverse/database';

/** MinIO bucket names (private — access via signed URLs only). */
export const BUCKET_NAMES: Record<AssetBucket, string> = {
  [AssetBucket.SCRATCH_ASSETS]: 'scratch-assets',
  [AssetBucket.PROJECT_ASSETS]: 'project-assets',
  [AssetBucket.MARKETPLACE_ASSETS]: 'marketplace-assets',
  [AssetBucket.AI_ASSETS]: 'ai-assets',
};

export const MIME_BY_PURPOSE: Partial<Record<AssetPurpose, string[]>> = {
  [AssetPurpose.SCRATCH_COSTUME]: ['image/svg+xml', 'image/png'],
  [AssetPurpose.SCRATCH_SOUND]: ['audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp3'],
  [AssetPurpose.PROJECT_THUMBNAIL]: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
  [AssetPurpose.PROJECT_ATTACHMENT]: ['image/png', 'image/jpeg', 'image/webp', 'application/json'],
  [AssetPurpose.MARKETPLACE_ICON]: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
  [AssetPurpose.MARKETPLACE_PREVIEW]: ['image/png', 'image/jpeg', 'image/webp'],
  [AssetPurpose.MARKETPLACE_DOWNLOAD]: [
    'application/zip',
    'application/json',
    'image/png',
    'image/jpeg',
    'application/octet-stream',
  ],
  [AssetPurpose.AI_DIAGRAM]: ['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp'],
  [AssetPurpose.AI_WIRING]: ['image/png', 'image/svg+xml', 'image/jpeg'],
  [AssetPurpose.AI_IMAGE]: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
  [AssetPurpose.AI_PROJECT_ASSET]: ['image/png', 'image/jpeg', 'application/json'],
};

export const MAX_BYTES_BY_BUCKET: Record<AssetBucket, number> = {
  [AssetBucket.SCRATCH_ASSETS]: 5 * 1024 * 1024,
  [AssetBucket.PROJECT_ASSETS]: 10 * 1024 * 1024,
  [AssetBucket.MARKETPLACE_ASSETS]: 25 * 1024 * 1024,
  [AssetBucket.AI_ASSETS]: 15 * 1024 * 1024,
};

export function purposeToBucket(purpose: AssetPurpose): AssetBucket {
  if (
    purpose === AssetPurpose.SCRATCH_COSTUME ||
    purpose === AssetPurpose.SCRATCH_SOUND
  ) {
    return AssetBucket.SCRATCH_ASSETS;
  }
  if (
    purpose === AssetPurpose.MARKETPLACE_ICON ||
    purpose === AssetPurpose.MARKETPLACE_PREVIEW ||
    purpose === AssetPurpose.MARKETPLACE_DOWNLOAD
  ) {
    return AssetBucket.MARKETPLACE_ASSETS;
  }
  if (
    purpose === AssetPurpose.AI_DIAGRAM ||
    purpose === AssetPurpose.AI_WIRING ||
    purpose === AssetPurpose.AI_IMAGE ||
    purpose === AssetPurpose.AI_PROJECT_ASSET
  ) {
    return AssetBucket.AI_ASSETS;
  }
  return AssetBucket.PROJECT_ASSETS;
}
