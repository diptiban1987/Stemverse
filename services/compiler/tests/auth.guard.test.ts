import { INestApplication } from '@nestjs/common';
import { AUTH_TEST_JWT_SECRET, createNestAuthTestApp } from '@stemverse/auth/testing';
import { sign } from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

describe('Compiler service JWT protection', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createNestAuthTestApp({ appModule: AppModule });
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows public health check', async () => {
    await request(app.getHttpServer()).get('/api/health').expect(200);
  });

  it('rejects unauthenticated compile job', async () => {
    await request(app.getHttpServer())
      .post('/api/compile')
      .send({ board: 'esp32', sourceCode: 'void setup() {}' })
      .expect(401);
  });

  it('accepts authenticated compile job', async () => {
    const token = sign(
      { sub: 'user-1', email: 'a@test.com', role: 'STUDENT' },
      AUTH_TEST_JWT_SECRET,
      { expiresIn: '15m' },
    );

    const res = await request(app.getHttpServer())
      .post('/api/compile')
      .set('Authorization', `Bearer ${token}`)
      .send({ board: 'esp32', sourceCode: 'void setup() {}' });

    expect([200, 201]).toContain(res.status);
    expect(res.body.jobId).toBeTruthy();
  });
});
