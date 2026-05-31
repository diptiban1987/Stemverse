import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://stemverse.app';

export function buildPageMetadata(opts: {
  title: string;
  description: string;
  path?: string;
  ogImage?: string;
}): Metadata {
  const url = `${siteUrl}${opts.path ?? ''}`;
  return {
    title: `${opts.title} | STEMVerse`,
    description: opts.description,
    alternates: { canonical: url },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url,
      siteName: 'STEMVerse',
      type: 'website',
      images: opts.ogImage ? [{ url: opts.ogImage }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: opts.title,
      description: opts.description,
    },
  };
}
