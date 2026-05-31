import { Controller, Get } from '@nestjs/common';
import { Public } from '@stemverse/auth';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() {
    return { status: 'ok', service: 'compiler' };
  }
}
