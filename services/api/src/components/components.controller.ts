import { Controller, Get } from '@nestjs/common';
import { ComponentsService } from './components.service';

@Controller('components')
export class ComponentsController {
  constructor(private readonly components: ComponentsService) {}

  @Get()
  getRegistry() {
    return this.components.getRegistry();
  }
}
