import {
  MarketplaceItemType,
  MarketplaceListingStatus,
  PrismaClient,
  UserRole,
} from '@prisma/client';

const SAMPLE_PLUGIN = {
  name: 'STEMVerse IoT Essentials',
  slug: 'stemverse-iot-essentials',
  version: '1.0.0',
  author: 'STEMVerse',
  description: 'WiFi, MQTT, and sensor blocks for ESP32 projects.',
  category: 'iot',
  blocks: ['stemverse_wifi_connect', 'stemverse_mqtt_publish'],
  generators: ['arduino', 'micropython'],
  assets: ['assets/icon.svg'],
  docs: ['docs/README.md'],
};

export async function seedMarketplace(prisma: PrismaClient) {
  const author = await prisma.user.upsert({
    where: { email: 'marketplace@stemverse.dev' },
    update: { role: UserRole.MARKETPLACE_CREATOR },
    create: {
      email: 'marketplace@stemverse.dev',
      passwordHash: '$2b$10$placeholderhashforseedonly',
      displayName: 'STEMVerse Marketplace',
      role: UserRole.MARKETPLACE_CREATOR,
    },
  });

  await prisma.marketplaceListing.upsert({
    where: { slug: SAMPLE_PLUGIN.slug },
    create: {
      slug: SAMPLE_PLUGIN.slug,
      type: MarketplaceItemType.PLUGIN,
      title: SAMPLE_PLUGIN.name,
      description: SAMPLE_PLUGIN.description,
      category: SAMPLE_PLUGIN.category,
      authorId: author.id,
      version: SAMPLE_PLUGIN.version,
      status: MarketplaceListingStatus.PUBLISHED,
      pluginManifest: SAMPLE_PLUGIN,
      tags: SAMPLE_PLUGIN.blocks,
      publishedAt: new Date(),
      metadata: { author: SAMPLE_PLUGIN.author, generators: SAMPLE_PLUGIN.generators },
    },
    update: {
      title: SAMPLE_PLUGIN.name,
      description: SAMPLE_PLUGIN.description,
      status: MarketplaceListingStatus.PUBLISHED,
      pluginManifest: SAMPLE_PLUGIN,
      publishedAt: new Date(),
    },
  });

  const dht = await prisma.sensor.findFirst({ where: { slug: 'dht22' } });
  if (dht) {
    await prisma.marketplaceListing.upsert({
      where: { slug: 'component-sensor-dht22' },
      create: {
        slug: 'component-sensor-dht22',
        type: MarketplaceItemType.COMPONENT_SENSOR,
        title: dht.name,
        description: 'Humidity and temperature sensor listing',
        category: 'sensors',
        authorId: author.id,
        componentSlug: dht.slug,
        componentKind: 'sensor',
        status: MarketplaceListingStatus.PUBLISHED,
        metadata: { registrySlug: dht.slug },
        publishedAt: new Date(),
      },
      update: { status: MarketplaceListingStatus.PUBLISHED },
    });
  }

  const roboticsCourse = await prisma.course.findUnique({
    where: { slug: 'robotics-maker-intro' },
  });
  if (roboticsCourse) {
    await prisma.marketplaceListing.upsert({
      where: { slug: `course-${roboticsCourse.slug}` },
      create: {
        slug: `course-${roboticsCourse.slug}`,
        type: MarketplaceItemType.COURSE,
        title: roboticsCourse.title,
        description: roboticsCourse.description ?? undefined,
        category: roboticsCourse.category,
        authorId: author.id,
        courseId: roboticsCourse.id,
        status: MarketplaceListingStatus.PUBLISHED,
        metadata: { level: roboticsCourse.level },
        publishedAt: new Date(),
      },
      update: { status: MarketplaceListingStatus.PUBLISHED },
    });
  }

  return { authorId: author.id, pluginSlug: SAMPLE_PLUGIN.slug };
}
