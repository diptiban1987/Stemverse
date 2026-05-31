import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { sign } from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module';
import { setupGatewayProxy } from '../src/gateway/setup-gateway-proxy';
import { PrismaService } from '../src/prisma/prisma.service';

const JWT_SECRET = 'test-jwt-access-secret-phase-1-7';

function bearerToken() {
  return sign(
    {
      sub: 'user-test-1',
      email: 'student@stemverse.test',
      role: 'STUDENT',
    },
    JWT_SECRET,
    { expiresIn: '15m' },
  );
}

describe('API gateway & security (Phase 1.7)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = JWT_SECRET;
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        AppModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({
        user: {
          findUnique: vi.fn().mockImplementation(({ where }: { where: { id?: string; email?: string } }) => {
            if (where.id === 'user-test-1') {
              return {
                id: 'user-test-1',
                email: 'student@stemverse.test',
                role: 'STUDENT',
                displayName: 'Student',
                organizationId: null,
              };
            }
            return null;
          }),
          create: vi.fn().mockImplementation((args: { data: { email: string } }) => ({
            id: 'new-user',
            email: args.data.email,
            role: 'STUDENT',
            displayName: 'User',
            passwordHash: 'hash',
          })),
          findFirst: vi.fn(),
        },
        refreshToken: {
          create: vi.fn(),
          findFirst: vi.fn(),
          update: vi.fn(),
          updateMany: vi.fn(),
        },
        project: { findMany: vi.fn().mockResolvedValue([]) },
        $connect: vi.fn(),
        $disconnect: vi.fn(),
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    setupGatewayProxy(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('rejects unauthenticated project list', async () => {
    await request(app.getHttpServer()).get('/api/projects').expect(401);
  });

  it('accepts authenticated project requests (not 401)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/projects')
      .set('Authorization', `Bearer ${bearerToken()}`);
    expect(res.status).not.toBe(401);
  });

  it('exposes health endpoint without auth', async () => {
    await request(app.getHttpServer()).get('/api/health').expect(200);
  });

  it('registers gateway proxy mounts without throwing', () => {
    expect(app.getHttpServer()).toBeDefined();
  });
});
