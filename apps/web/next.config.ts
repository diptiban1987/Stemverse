import type { NextConfig } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const nextConfig: NextConfig = {
  transpilePackages: ['@stemverse/ui'],
  async rewrites() {
    // Only proxy to external backend when NEXT_PUBLIC_API_URL is explicitly set.
    // Otherwise, local Next.js API routes in src/app/api/ handle requests.
    if (!API_URL) return [];
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
