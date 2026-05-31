'use client';

import { useCallback, useRef, useState } from 'react';
import { Button } from '@stemverse/ui';
import { assetsApi, type AssetPurpose, type PresignUploadResponse } from '@/lib/assets-api';

type AssetUploaderProps = {
  token: string;
  purpose: AssetPurpose;
  projectId?: string;
  listingId?: string;
  aiSessionId?: string;
  accept?: string;
  label?: string;
  onComplete?: (assetId: string) => void;
  presignFn?: (
    token: string,
    file: File,
  ) => Promise<PresignUploadResponse>;
};

export function AssetUploader({
  token,
  purpose,
  projectId,
  listingId,
  aiSessionId,
  accept,
  label = 'Upload file',
  onComplete,
  presignFn,
}: AssetUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      setError(null);
      setProgress(0);
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      if (file.type.startsWith('image/')) {
        setPreview(URL.createObjectURL(file));
      }

      try {
        const presign =
          presignFn ??
          ((t, f) =>
            assetsApi.presignUpload(t, {
              purpose,
              mimeType: f.type,
              sizeBytes: f.size,
              filename: f.name,
              projectId,
              listingId,
              aiSessionId,
            }));

        const { uploadUrl, assetId, headers } = await presign(token, file);

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', uploadUrl);
          xhr.setRequestHeader('Content-Type', headers['Content-Type']);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setProgress(Math.round((e.loaded / e.total) * 100));
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`Upload failed (${xhr.status})`));
          };
          xhr.onerror = () => reject(new Error('Upload network error'));
          abortRef.current?.signal.addEventListener('abort', () => {
            xhr.abort();
            reject(new DOMException('Aborted', 'AbortError'));
          });
          xhr.send(file);
        });

        await assetsApi.confirmUpload(token, assetId);
        setProgress(100);
        onComplete?.(assetId);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setError('Upload cancelled');
        } else {
          setError(err instanceof Error ? err.message : 'Upload failed');
        }
        setProgress(null);
      }
    },
    [token, purpose, projectId, listingId, aiSessionId, onComplete, presignFn],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void uploadFile(file);
  };

  return (
    <div
      className="rounded-lg border border-dashed border-border bg-card p-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <p className="text-sm font-medium">{label}</p>
      <input
        ref={inputRef}
        type="file"
        className="mt-2 w-full text-xs"
        accept={accept}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void uploadFile(file);
        }}
      />
      {preview && (
        <img src={preview} alt="" className="mt-2 max-h-24 rounded object-contain" />
      )}
      {progress !== null && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-background">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        {progress !== null && progress < 100 && (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              abortRef.current?.abort();
              setProgress(null);
            }}
          >
            Cancel
          </Button>
        )}
        {error && (
          <Button type="button" size="sm" onClick={() => inputRef.current?.click()}>
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
