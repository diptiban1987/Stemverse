import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from '@stemverse/auth';
import { CompileModule } from './compile/compile.module';
import { HealthController } from './health.controller';
import { CompilerAuthModule } from './auth/compiler-auth.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), CompilerAuthModule, CompileModule],
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
