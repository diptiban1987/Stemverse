import { describe, expect, it } from 'vitest';
import { AssetPurpose } from '@stemverse/database';
import { validateAssetUpload } from '../src/storage/asset-validation';
import { purposeToBucket, BUCKET_NAMES } from '../src/storage/storage.constants';
import { AssetBucket } from '@stemverse/database';

describe('asset validation', () => {
  it('routes scratch costume to scratch bucket', () => {
    const bucket = validateAssetUpload({
      purpose: AssetPurpose.SCRATCH_COSTUME,
      mimeType: 'image/svg+xml',
      sizeBytes: 1024,
      filename: 'cat.svg',
    });
    expect(bucket).toBe(AssetBucket.SCRATCH_ASSETS);
    expect(BUCKET_NAMES[bucket]).toBe('scratch-assets');
  });

  it('rejects invalid mime for scratch sound', () => {
    expect(() =>
      validateAssetUpload({
        purpose: AssetPurpose.SCRATCH_SOUND,
        mimeType: 'image/png',
        sizeBytes: 1024,
      }),
    ).toThrow();
  });

  it('rejects oversized files', () => {
    expect(() =>
      validateAssetUpload({
        purpose: AssetPurpose.SCRATCH_COSTUME,
        mimeType: 'image/png',
        sizeBytes: 20 * 1024 * 1024,
      }),
    ).toThrow();
  });

  it('rejects dangerous extensions', () => {
    expect(() =>
      validateAssetUpload({
        purpose: AssetPurpose.GENERAL,
        mimeType: 'application/octet-stream',
        sizeBytes: 100,
        filename: 'malware.exe',
      }),
    ).toThrow();
  });
});

describe('bucket routing', () => {
  it('maps AI wiring to ai-assets', () => {
    expect(purposeToBucket(AssetPurpose.AI_WIRING)).toBe(AssetBucket.AI_ASSETS);
  });

  it('maps marketplace icon correctly', () => {
    expect(purposeToBucket(AssetPurpose.MARKETPLACE_ICON)).toBe(
      AssetBucket.MARKETPLACE_ASSETS,
    );
  });
});
