import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication, serviceName: string, docsPath: string): void {
  const config = new DocumentBuilder()
    .setTitle(`STEMVerse ${serviceName}`)
    .setDescription(`${serviceName} REST API`)
    .setVersion('5.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(docsPath, app, document);
}
