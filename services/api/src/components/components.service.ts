import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ComponentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRegistry() {
    const [boards, sensors, actuators] = await Promise.all([
      this.prisma.board.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
      this.prisma.sensor.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
      this.prisma.actuator.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    ]);

    return {
      boards: boards.map((b) => ({
        id: b.id,
        slug: b.slug,
        name: b.name,
        architecture: b.architecture,
        capabilities: b.capabilities,
        digitalPins: b.digitalPins,
        analogPins: b.analogPins,
        pwmPins: b.pwmPins,
        defaultConfig: b.defaultConfig,
        metadata: b.metadata,
        active: b.active,
      })),
      sensors: sensors.map((s) => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        category: s.category,
        properties: s.properties,
        defaultPin: s.defaultPin,
        libraries: s.libraries,
        blockType: s.blockType,
        generatorKey: s.generatorKey,
        boardSupport: s.boardSupport,
        metadata: s.metadata,
        active: s.active,
      })),
      actuators: actuators.map((a) => ({
        id: a.id,
        slug: a.slug,
        name: a.name,
        category: a.category,
        fields: a.fields,
        libraries: a.libraries,
        blockType: a.blockType,
        generatorKey: a.generatorKey,
        boardSupport: a.boardSupport,
        metadata: a.metadata,
        active: a.active,
      })),
      source: boards.length > 0 ? 'database' : 'empty',
    };
  }
}
