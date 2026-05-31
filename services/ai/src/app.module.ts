import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from '@stemverse/auth';
import { AssistantModule } from './assistant/assistant.module';
import { HealthController } from './health.controller';
import { AiAuthModule } from './auth/ai-auth.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AiAuthModule, AssistantModule],
  controllers: [HealthController],
  providers: [
    JwtAuthGuard,
    {
      provide: APP_GUARD,
      useExisting: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
