import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MarketplaceModule } from './marketplace.module';
import { HealthController } from './health.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), MarketplaceModule],
  controllers: [HealthController],
})
export class AppModule {}
