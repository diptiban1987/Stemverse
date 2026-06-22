/**
 * Phase 41B — Certificate Delivery Runtime
 *
 * Multi-channel certificate delivery: Email, Google Drive, OneDrive, PDF export.
 */

// ─── Types ─────────────────────────────────────────────────────

export type DeliveryChannel = 'email' | 'google_drive' | 'onedrive' | 'pdf_export' | 'download';
export type DeliveryStatus = 'pending' | 'sending' | 'delivered' | 'failed';

export interface CertificateDelivery {
  readonly deliveryId: string;
  readonly certificateId: string;
  readonly studentId: string;
  readonly studentName: string;
  readonly studentEmail: string;
  readonly channel: DeliveryChannel;
  readonly status: DeliveryStatus;
  readonly fileUrl: string | null;
  readonly sentAt: number | null;
  readonly deliveredAt: number | null;
  readonly error: string | null;
  readonly createdAt: number;
}

export interface DeliveryConfig {
  readonly configId: string;
  readonly tenantId: string;
  readonly enabledChannels: DeliveryChannel[];
  readonly emailTemplate: string;
  readonly googleDriveFolder: string | null;
  readonly oneDriveFolder: string | null;
  readonly autoDeliver: boolean;
}

export interface DeliveryBatch {
  readonly batchId: string;
  readonly certificateIds: string[];
  readonly channel: DeliveryChannel;
  readonly totalCount: number;
  readonly deliveredCount: number;
  readonly failedCount: number;
  readonly startedAt: number;
  readonly completedAt: number | null;
  readonly status: 'running' | 'completed' | 'partial';
}

// ─── Helpers ──────────────────────────────────────────────────

let _seq = 0;
function uid(): string { return `del_${Date.now()}_${++_seq}`; }
const now = () => Date.now();

export const SUPPORTED_DELIVERY_CHANNELS: DeliveryChannel[] = ['email', 'google_drive', 'onedrive', 'pdf_export', 'download'];

// ─── Configuration ────────────────────────────────────────────

export function createDeliveryConfig(tenantId: string, channels: DeliveryChannel[]): DeliveryConfig {
  return {
    configId: uid(), tenantId, enabledChannels: channels,
    emailTemplate: 'Congratulations {{name}}! Your certificate is attached.',
    googleDriveFolder: null, oneDriveFolder: null, autoDeliver: true,
  };
}

export function updateDeliveryConfig(config: DeliveryConfig, updates: Partial<Pick<DeliveryConfig, 'enabledChannels' | 'emailTemplate' | 'googleDriveFolder' | 'oneDriveFolder' | 'autoDeliver'>>): DeliveryConfig {
  return { ...config, ...updates };
}

// ─── Single Delivery ──────────────────────────────────────────

export function deliverCertificate(certificateId: string, studentId: string, studentName: string, studentEmail: string, channel: DeliveryChannel): CertificateDelivery {
  return {
    deliveryId: uid(), certificateId, studentId, studentName, studentEmail, channel,
    status: 'pending', fileUrl: null, sentAt: null, deliveredAt: null, error: null, createdAt: now(),
  };
}

export function markDelivered(delivery: CertificateDelivery, fileUrl: string): CertificateDelivery {
  return { ...delivery, status: 'delivered', fileUrl, sentAt: now(), deliveredAt: now() };
}

export function markDeliveryFailed(delivery: CertificateDelivery, error: string): CertificateDelivery {
  return { ...delivery, status: 'failed', error };
}

// ─── Batch Delivery ────────────────────────────────────────────

export function createDeliveryBatch(certificateIds: string[], channel: DeliveryChannel): DeliveryBatch {
  return {
    batchId: uid(), certificateIds, channel,
    totalCount: certificateIds.length, deliveredCount: 0, failedCount: 0,
    startedAt: now(), completedAt: null, status: 'running',
  };
}

export function updateBatchProgress(batch: DeliveryBatch, delivered: number, failed: number): DeliveryBatch {
  const total = delivered + failed;
  const status = total >= batch.totalCount ? (failed > 0 ? 'partial' as const : 'completed' as const) : 'running' as const;
  return {
    ...batch, deliveredCount: delivered, failedCount: failed,
    status, completedAt: status !== 'running' ? now() : null,
  };
}

// ─── PDF Export ────────────────────────────────────────────────

export function generatePdfModel(certificateId: string, studentName: string, programTitle: string, score: number, issuedAt: number): { pdfId: string; content: string; fileName: string } {
  return {
    pdfId: uid(),
    content: `Certificate of ${programTitle}\nAwarded to: ${studentName}\nScore: ${score}%\nIssued: ${new Date(issuedAt).toISOString()}`,
    fileName: `certificate_${certificateId}.pdf`,
  };
}
