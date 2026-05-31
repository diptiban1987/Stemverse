import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://stemverse.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    '',
    '/features',
    '/pricing',
    '/courses',
    '/blog',
    '/community',
    '/docs',
    '/about',
    '/contact',
  ];

  return routes.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : 0.7,
  }));
}
