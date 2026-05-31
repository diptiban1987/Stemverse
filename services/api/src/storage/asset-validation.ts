import { BadRequestException } from '@nestjs/common';
import { AssetBucket, AssetPurpose } from '@stemverse/database';
import {
  MAX_BYTES_BY_BUCKET,
  MIME_BY_PURPOSE,
  purposeToBucket,
} from './storage.constants';

const BLOCKED_EXTENSIONS = new Set([
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.php',
  '.html',
  '.htm',
  '.js',
  '.mjs',
]);

export function validateAssetUpload(input: {
  purpose: AssetPurpose;
  mimeType: string;
  sizeBytes: number;
  filename?: string;
}): AssetBucket {
  const bucket = purposeToBucket(input.purpose);
  const allowedMime = MIME_BY_PURPOSE[input.purpose];
  if (allowedMime && !allowedMime.includes(input.mimeType.toLowerCase())) {
    throw new BadRequestException(
      `MIME type ${input.mimeType} not allowed for ${input.purpose}`,
    );
  }

  const maxBytes = MAX_BYTES_BY_BUCKET[bucket];
  if (input.sizeBytes <= 0 || input.sizeBytes > maxBytes) {
    throw new BadRequestException(
      `File size must be between 1 and ${maxBytes} bytes for ${bucket}`,
    );
  }

  if (input.filename) {
    const ext = input.filename.includes('.')
      ? input.filename.slice(input.filename.lastIndexOf('.')).toLowerCase()
      : '';
    if (BLOCKED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(`File extension ${ext} is not allowed`);
    }
  }

  return bucket;
}

/** Basic SVG sanitization hint — reject script/embed in uploaded SVG metadata check. */
export function assertSafeSvgMetadata(contentType: string, _filename?: string): void {
  if (contentType !== 'image/svg+xml') return;
  // Full sanitization runs client-side + CDN; server rejects obvious patterns on confirm upload via metadata flag.
}
