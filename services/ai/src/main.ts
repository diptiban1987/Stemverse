import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SanitizeMiddleware } from '@stemverse/auth';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.use(new SanitizeMiddleware().use.bind(new SanitizeMiddleware()));
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'] });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('STEMVerse AI Service')
    .setDescription('Explain, copilot, streaming, text-to-blocks')
    .setVersion('5.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  const port = process.env.AI_PORT ?? 4002;
  await app.listen(port);
  console.log(`STEMVerse AI service listening on http://localhost:${port}/api`);
  console.log(`OpenAPI: http://localhost:${port}/api/docs`);
}

bootstrap();
