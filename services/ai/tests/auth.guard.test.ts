import { INestApplication } from '@nestjs/common';
import { AUTH_TEST_JWT_SECRET, createNestAuthTestApp } from '@stemverse/auth/testing';
import { sign } from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

describe('AI service JWT protection', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createNestAuthTestApp({
      appModule: AppModule,
      env: { AI_DEFAULT_PROVIDER: 'rule-based' },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows public health check', async () => {
    await request(app.getHttpServer()).get('/api/health').expect(200);
  });

  it('rejects unauthenticated AI explain request', async () => {
    await request(app.getHttpServer())
      .post('/api/ai/explain/block')
      .send({
        blockType: 'stemverse_delay',
        level: 'beginner',
      })
      .expect(401);
  });

  it('accepts authenticated AI explain request', async () => {
    const token = sign(
      { sub: 'user-1', email: 'a@test.com', role: 'STUDENT' },
      AUTH_TEST_JWT_SECRET,
      { expiresIn: '15m' },
    );

    const res = await request(app.getHttpServer())
      .post('/api/ai/explain/block')
      .set('Authorization', `Bearer ${token}`)
      .send({
        blockType: 'stemverse_delay',
        fields: { MS: 1000 },
        level: 'beginner',
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body.explanation).toBeTruthy();
  });
});
