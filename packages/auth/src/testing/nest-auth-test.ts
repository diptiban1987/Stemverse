import { INestApplication, Type, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

export const AUTH_TEST_JWT_SECRET = 'test-jwt-access-secret-phase-1-7';

export type NestAuthTestAppOptions = {
  appModule: Type<unknown>;
  env?: Record<string, string>;
  globalPrefix?: string;
};

/** Nest testing module for services using APP_GUARD + JwtAuthGuard (useFactory in AppModule). */
export async function createNestAuthTestModule(
  options: NestAuthTestAppOptions,
): Promise<TestingModule> {
  process.env.JWT_ACCESS_SECRET = options.env?.JWT_ACCESS_SECRET ?? AUTH_TEST_JWT_SECRET;
  for (const [key, value] of Object.entries(options.env ?? {})) {
    if (key !== 'JWT_ACCESS_SECRET') process.env[key] = value;
  }

  return Test.createTestingModule({
    imports: [ConfigModule.forRoot({ isGlobal: true }), options.appModule],
  }).compile();
}

export async function createNestAuthTestApp(
  options: NestAuthTestAppOptions,
): Promise<INestApplication> {
  const moduleRef = await createNestAuthTestModule(options);
  const app = moduleRef.createNestApplication();
  const prefix = options.globalPrefix ?? 'api';
  app.setGlobalPrefix(prefix);
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.init();
  return app;
}
