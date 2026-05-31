import { Controller, Get } from '@nestjs/common';

@Controller('integrations')
export class IntegrationsController {
  @Get()
  catalog() {
    return {
      auth: { type: 'jwt', header: 'Authorization: Bearer <token>' },
      lms: { baseUrl: process.env.LMS_URL ?? 'http://localhost:4003/api' },
      components: { baseUrl: process.env.WEB_URL ?? 'http://localhost:3000/api/components' },
      ai: { baseUrl: process.env.AI_URL ?? 'http://localhost:4002/api' },
      docs: { pluginSdk: '/docs/marketplace-plugin-sdk.md' },
    };
  }
}
