import { apiFetch } from './api';

export type AssetPurpose =
  | 'SCRATCH_COSTUME'
  | 'SCRATCH_SOUND'
  | 'PROJECT_THUMBNAIL'
  | 'PROJECT_ATTACHMENT'
  | 'MARKETPLACE_ICON'
  | 'MARKETPLACE_PREVIEW'
  | 'MARKETPLACE_DOWNLOAD'
  | 'AI_DIAGRAM'
  | 'AI_WIRING'
  | 'AI_IMAGE'
  | 'AI_PROJECT_ASSET'
  | 'GENERAL';

export type PresignUploadResponse = {
  assetId: string;
  bucket: string;
  objectKey: string;
  uploadUrl: string;
  expiresIn: number;
  method: 'PUT';
  headers: { 'Content-Type': string };
};

export type AssetRecord = {
  id: string;
  mimeType: string;
  purpose: AssetPurpose;
  sizeBytes: number;
  originalFilename: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export const assetsApi = {
  presignUpload: (
    token: string,
    body: {
      purpose: AssetPurpose;
      mimeType: string;
      sizeBytes: number;
      filename?: string;
      projectId?: string;
      listingId?: string;
      aiSessionId?: string;
    },
  ) =>
    apiFetch<PresignUploadResponse>('/storage/presign/upload', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),

  confirmUpload: (token: string, assetId: string) =>
    apiFetch<AssetRecord>(`/storage/assets/${assetId}/confirm`, {
      method: 'POST',
      token,
    }),

  getDownloadUrl: (token: string, assetId: string) =>
    apiFetch<{ downloadUrl: string; expiresIn: number }>(
      `/storage/assets/${assetId}/download-url`,
      { token },
    ),

  deleteAsset: (token: string, assetId: string) =>
    apiFetch<{ deleted: boolean }>(`/storage/assets/${assetId}`, {
      method: 'DELETE',
      token,
    }),

  scratchManifest: (token: string, projectId: string) =>
    apiFetch<{
      projectId: string;
      costumes: Array<{ assetId: string; name: string; mimeType: string }>;
      sounds: Array<{ assetId: string; name: string; mimeType: string }>;
      assetCount: number;
    }>(`/scratch/projects/${projectId}/assets/manifest`, { token }),

  scratchPresign: (
    token: string,
    projectId: string,
    body: { mimeType: string; sizeBytes: number; filename?: string; purpose?: AssetPurpose },
  ) =>
    apiFetch<PresignUploadResponse>(`/scratch/projects/${projectId}/assets/presign`, {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),

  scratchResolveUrls: (token: string, projectId: string, assetIds: string[]) =>
    apiFetch<Record<string, string>>(`/scratch/projects/${projectId}/assets/resolve-urls`, {
      method: 'POST',
      token,
      body: JSON.stringify({ assetIds }),
    }),

  aiPresign: (
    token: string,
    sessionId: string,
    body: {
      purpose: AssetPurpose;
      mimeType: string;
      sizeBytes: number;
      filename?: string;
      projectId?: string;
    },
  ) =>
    apiFetch<PresignUploadResponse>(`/ai/sessions/${sessionId}/assets/presign`, {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),

  marketplacePresign: (
    token: string,
    listingId: string,
    body: {
      purpose: AssetPurpose;
      mimeType: string;
      sizeBytes: number;
      filename?: string;
    },
  ) =>
    apiFetch<PresignUploadResponse>(`/marketplace/listings/${listingId}/assets/presign`, {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),
};
