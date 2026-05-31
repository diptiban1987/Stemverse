import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

type ServiceProbe = {
  name: string;
  url: string;
};

@Injectable()
export class HealthAggregationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async checkDatabase(): Promise<{ status: 'ok' | 'error'; latencyMs?: number; error?: string }> {
    const started = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', latencyMs: Date.now() - started };
    } catch (err) {
      return {
        status: 'error',
        error: err instanceof Error ? err.message : 'db_unreachable',
      };
    }
  }

  async probeService(
    probe: ServiceProbe,
  ): Promise<{ status: 'ok' | 'error' | 'skipped'; latencyMs?: number; body?: unknown }> {
    const started = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5_000);
      const res = await fetch(`${probe.url}/api/health`, { signal: controller.signal });
      clearTimeout(timer);
      const body = await res.json().catch(() => ({}));
      return {
        status: res.ok ? 'ok' : 'error',
        latencyMs: Date.now() - started,
        body,
      };
    } catch {
      return { status: 'error', latencyMs: Date.now() - started };
    }
  }

  async fullHealth(): Promise<Record<string, unknown>> {
    const probes: ServiceProbe[] = [
      { name: 'ai', url: process.env.AI_SERVICE_URL ?? 'http://127.0.0.1:4002' },
      { name: 'compiler', url: process.env.COMPILER_SERVICE_URL ?? 'http://127.0.0.1:4001' },
      { name: 'lms', url: process.env.LMS_SERVICE_URL ?? 'http://127.0.0.1:4003' },
      {
        name: 'marketplace',
        url: process.env.MARKETPLACE_SERVICE_URL ?? 'http://127.0.0.1:4004',
      },
    ];

    const [database, ...services] = await Promise.all([
      this.checkDatabase(),
      ...probes.map(async (p) => ({ name: p.name, ...(await this.probeService(p)) })),
    ]);

    let aiProviders: unknown = null;
    try {
      const aiUrl = process.env.AI_SERVICE_URL ?? 'http://127.0.0.1:4002';
      const res = await fetch(`${aiUrl}/api/ai/providers/health`);
      if (res.ok) aiProviders = await res.json();
    } catch {
      aiProviders = { status: 'unreachable' };
    }

    const allOk =
      database.status === 'ok' && services.every((s) => s.status === 'ok' || s.status === 'skipped');

    const objectStorage = await this.storage.checkStorageHealth();

    return {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database,
      services: Object.fromEntries(services.map((s) => [s.name, s])),
      aiProviders,
      objectStorage,
    };
  }
}
