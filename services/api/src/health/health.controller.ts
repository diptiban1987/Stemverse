import { Controller, Get } from '@nestjs/common';
import { HealthAggregationService } from './health-aggregation.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthAggregationService) {}

  @Get()
  check() {
    return { status: 'ok', service: 'stemverse-api', phase: '5.1' };
  }

  @Get('full')
  full() {
    return this.health.fullHealth();
  }
}
