import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AssetBucket, AssetPurpose, Prisma } from '@stemverse/database';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { BUCKET_NAMES, purposeToBucket } from './storage.constants';
import { validateAssetUpload } from './asset-validation';

export type PresignUploadInput = {
  userId: string;
  purpose: AssetPurpose;
  mimeType: string;
  sizeBytes: number;
  filename?: string;
  projectId?: string;
  listingId?: string;
  aiSessionId?: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class StorageService {
  private readonly client: S3Client | null;
  private readonly enabled: boolean;

  constructor(
    @Optional() private readonly config: ConfigService | undefined,
    private readonly prisma: PrismaService,
  ) {
    const endpoint = this.env('S3_ENDPOINT');
    const accessKey = this.env('S3_ACCESS_KEY');
    const secretKey = this.env('S3_SECRET_KEY');
    this.enabled = Boolean(endpoint && accessKey && secretKey);

    if (this.enabled) {
      this.client = new S3Client({
        endpoint,
        region: this.env('S3_REGION') ?? 'us-east-1',
        credentials: { accessKeyId: accessKey!, secretAccessKey: secretKey! },
        forcePathStyle: true,
      });
    } else {
      this.client = null;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private env(key: string): string | undefined {
    return this.config?.get<string>(key) ?? process.env[key];
  }

  async checkStorageHealth(): Promise<{ status: 'ok' | 'unconfigured' | 'error'; buckets?: string[] }> {
    if (!this.client) return { status: 'unconfigured' };
    try {
      await Promise.all(
        Object.values(BUCKET_NAMES).map((name) =>
          this.client!.send(new HeadBucketCommand({ Bucket: name })),
        ),
      );
      return { status: 'ok', buckets: Object.values(BUCKET_NAMES) };
    } catch {
      return { status: 'error' };
    }
  }

  private ensureClient(): S3Client {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Object storage is not configured. Set S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY.',
      );
    }
    return this.client;
  }

  buildObjectKey(
    userId: string,
    bucket: AssetBucket,
    filename?: string,
    projectId?: string,
  ): string {
    const safeName = filename?.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) ?? 'asset';
    const prefix = projectId ? `${userId}/${projectId}` : userId;
    return `${prefix}/${randomUUID()}-${safeName}`;
  }

  async createPresignedUpload(input: PresignUploadInput) {
    const bucket = validateAssetUpload(input);
    const bucketName = BUCKET_NAMES[bucket];
    const objectKey = this.buildObjectKey(
      input.userId,
      bucket,
      input.filename,
      input.projectId,
    );

    const client = this.ensureClient();
    const expiresIn = Number(this.env('S3_PRESIGN_UPLOAD_EXPIRES') ?? 900);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      ContentType: input.mimeType,
      ContentLength: input.sizeBytes,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn });

    const asset = await this.prisma.asset.create({
      data: {
        userId: input.userId,
        projectId: input.projectId,
        listingId: input.listingId,
        aiSessionId: input.aiSessionId,
        bucket,
        objectKey,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        purpose: input.purpose,
        originalFilename: input.filename,
        metadata: {
          ...(input.metadata ?? {}),
          uploadStatus: 'pending',
        } as Prisma.InputJsonValue,
      },
    });

    return {
      assetId: asset.id,
      bucket: bucketName,
      objectKey,
      uploadUrl,
      expiresIn,
      method: 'PUT' as const,
      headers: { 'Content-Type': input.mimeType },
    };
  }

  async confirmUpload(userId: string, assetId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, userId },
    });
    if (!asset) throw new NotFoundException('Asset not found');

    const meta = (asset.metadata as Record<string, unknown>) ?? {};
    return this.prisma.asset.update({
      where: { id: assetId },
      data: {
        metadata: { ...meta, uploadStatus: 'confirmed', confirmedAt: new Date().toISOString() },
      },
    });
  }

  async createPresignedDownload(userId: string, assetId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, userId },
    });
    if (!asset) throw new NotFoundException('Asset not found');

    const client = this.ensureClient();
    const bucketName = BUCKET_NAMES[asset.bucket];
    const expiresIn = Number(this.env('S3_PRESIGN_DOWNLOAD_EXPIRES') ?? 3600);

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: asset.objectKey,
    });
    const downloadUrl = await getSignedUrl(client, command, { expiresIn });

    return { assetId, downloadUrl, expiresIn, mimeType: asset.mimeType };
  }

  async deleteAsset(userId: string, assetId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, userId },
    });
    if (!asset) throw new NotFoundException('Asset not found');

    if (this.client) {
      const bucketName = BUCKET_NAMES[asset.bucket];
      await this.client.send(
        new DeleteObjectCommand({ Bucket: bucketName, Key: asset.objectKey }),
      );
    }

    await this.prisma.asset.delete({ where: { id: assetId } });
    return { deleted: true, assetId };
  }

  async listProjectAssets(userId: string, projectId: string, purpose?: AssetPurpose) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, ownerId: userId },
    });
    if (!project) throw new NotFoundException('Project not found');

    const rows = await this.prisma.asset.findMany({
      where: {
        projectId,
        ...(purpose ? { purpose } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.filter((r) => {
      const status = (r.metadata as Record<string, unknown>)?.uploadStatus;
      return status === 'confirmed' || status === undefined;
    });
  }

  /** Scratch costume/sound manifest for runtime resolution. */
  async getScratchAssetManifest(projectId: string, userId: string) {
    const assets = await this.listScratchAssets(userId, projectId);
    const costumes: Array<{ assetId: string; name: string; mimeType: string }> = [];
    const sounds: Array<{ assetId: string; name: string; mimeType: string }> = [];

    for (const a of assets) {
      const entry = {
        assetId: a.id,
        name: a.originalFilename ?? a.objectKey.split('/').pop() ?? a.id,
        mimeType: a.mimeType,
      };
      if (a.purpose === AssetPurpose.SCRATCH_COSTUME) costumes.push(entry);
      if (a.purpose === AssetPurpose.SCRATCH_SOUND) sounds.push(entry);
    }

    return { projectId, costumes, sounds, assetCount: assets.length };
  }

  async listScratchAssets(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, ownerId: userId },
    });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.asset.findMany({
      where: {
        projectId,
        purpose: { in: [AssetPurpose.SCRATCH_COSTUME, AssetPurpose.SCRATCH_SOUND] },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async resolveAssetDownloadUrls(
    userId: string,
    assetIds: string[],
  ): Promise<Record<string, string>> {
    const urls: Record<string, string> = {};
    for (const id of assetIds) {
      try {
        const { downloadUrl } = await this.createPresignedDownload(userId, id);
        urls[id] = downloadUrl;
      } catch {
        /* skip missing */
      }
    }
    return urls;
  }

  routeBucketForPurpose(purpose: AssetPurpose): AssetBucket {
    return purposeToBucket(purpose);
  }
}
