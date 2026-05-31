import { PrismaClient } from '@prisma/client';
import { STATIC_ACTUATORS, STATIC_BOARDS, STATIC_SENSORS } from '@stemverse/blockly-engine';
import { seedLms } from './seed-lms';
import { seedMarketplace } from './seed-marketplace';

const prisma = new PrismaClient();

async function main() {
  const lms = await seedLms(prisma);
  console.log('Seeded LMS:', lms);

  const marketplace = await seedMarketplace(prisma);
  console.log('Seeded Marketplace:', marketplace);

  for (const board of STATIC_BOARDS) {
    await prisma.board.upsert({
      where: { slug: board.slug },
      update: {
        name: board.name,
        architecture: board.architecture,
        capabilities: board.capabilities,
        digitalPins: board.digitalPins,
        analogPins: board.analogPins,
        pwmPins: board.pwmPins,
        defaultConfig: board.defaultConfig ?? {},
        metadata: board.metadata ?? {},
      },
      create: {
        slug: board.slug,
        name: board.name,
        architecture: board.architecture,
        capabilities: board.capabilities,
        digitalPins: board.digitalPins,
        analogPins: board.analogPins,
        pwmPins: board.pwmPins,
        defaultConfig: board.defaultConfig ?? {},
        metadata: board.metadata ?? {},
      },
    });
  }

  for (const sensor of STATIC_SENSORS) {
    await prisma.sensor.upsert({
      where: { slug: sensor.slug },
      update: {
        name: sensor.name,
        category: sensor.category,
        properties: sensor.properties,
        defaultPin: sensor.defaultPin,
        libraries: sensor.libraries,
        blockType: sensor.blockType,
        generatorKey: sensor.generatorKey,
        boardSupport: sensor.boardSupport,
        metadata: sensor.metadata ?? {},
      },
      create: {
        slug: sensor.slug,
        name: sensor.name,
        category: sensor.category,
        properties: sensor.properties,
        defaultPin: sensor.defaultPin,
        libraries: sensor.libraries,
        blockType: sensor.blockType,
        generatorKey: sensor.generatorKey,
        boardSupport: sensor.boardSupport,
        metadata: sensor.metadata ?? {},
      },
    });
  }

  for (const actuator of STATIC_ACTUATORS) {
    await prisma.actuator.upsert({
      where: { slug: actuator.slug },
      update: {
        name: actuator.name,
        category: actuator.category,
        fields: actuator.fields,
        libraries: actuator.libraries,
        blockType: actuator.blockType,
        generatorKey: actuator.generatorKey,
        boardSupport: actuator.boardSupport,
        metadata: actuator.metadata ?? {},
      },
      create: {
        slug: actuator.slug,
        name: actuator.name,
        category: actuator.category,
        fields: actuator.fields,
        libraries: actuator.libraries,
        blockType: actuator.blockType,
        generatorKey: actuator.generatorKey,
        boardSupport: actuator.boardSupport,
        metadata: actuator.metadata ?? {},
      },
    });
  }

  console.log('Seeded hardware components:', {
    boards: STATIC_BOARDS.length,
    sensors: STATIC_SENSORS.length,
    actuators: STATIC_ACTUATORS.length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
