import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'] });
  const swaggerConfig = new DocumentBuilder()
    .setTitle('STEMVerse LMS')
    .setVersion('5.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));
  const port = process.env.LMS_PORT ?? 4003;
  await app.listen(port);
  console.log(`STEMVerse LMS listening on http://localhost:${port}/api/docs`);
}

bootstrap();
