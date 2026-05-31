import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { HealthAggregationService } from './health-aggregation.service';
import { HealthController } from './health.controller';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [HealthController],
  providers: [HealthAggregationService],
})
export class HealthModule {}
