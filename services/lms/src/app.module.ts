import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LmsModule } from './lms.module';
import { HealthController } from './health.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), LmsModule],
  controllers: [HealthController],
})
export class AppModule {}
