import type { INestApplication } from '@nestjs/common';
import { createProxyMiddleware } from 'http-proxy-middleware';

function serviceUrl(envKey: string, fallback: string): string {
  return process.env[envKey] ?? fallback;
}

export function setupGatewayProxy(app: INestApplication): void {
  const expressApp = app.getHttpAdapter().getInstance();

  const routes: Array<{
    mount: string;
    target: string;
    pathRewrite?: Record<string, string>;
  }> = [
    {
      mount: '/api/ai',
      target: serviceUrl('AI_SERVICE_URL', 'http://127.0.0.1:4002'),
    },
    {
      mount: '/api/compiler',
      target: serviceUrl('COMPILER_SERVICE_URL', 'http://127.0.0.1:4001'),
      pathRewrite: { '^/api/compiler': '/api/compile' },
    },
    {
      mount: '/api/lms',
      target: serviceUrl('LMS_SERVICE_URL', 'http://127.0.0.1:4003'),
      pathRewrite: { '^/api/lms': '/api' },
    },
    {
      mount: '/api/marketplace',
      target: serviceUrl('MARKETPLACE_SERVICE_URL', 'http://127.0.0.1:4004'),
      pathRewrite: { '^/api/marketplace': '/api' },
    },
  ];

  for (const route of routes) {
    expressApp.use(
      route.mount,
      createProxyMiddleware({
        target: route.target,
        changeOrigin: true,
        pathRewrite: route.pathRewrite,
        // Preserve SSE streaming from AI service (no response buffering).
        proxyTimeout: 120_000,
        timeout: 120_000,
        on: {
          proxyReq: (proxyReq, req) => {
            const auth = req.headers.authorization;
            if (auth) {
              proxyReq.setHeader('authorization', auth);
            }
            if (req.headers.accept?.includes('text/event-stream')) {
              proxyReq.setHeader('Accept', 'text/event-stream');
            }
          },
          proxyRes: (proxyRes) => {
            const ct = proxyRes.headers['content-type'];
            if (typeof ct === 'string' && ct.includes('text/event-stream')) {
              proxyRes.headers['cache-control'] = 'no-cache, no-transform';
              proxyRes.headers['x-accel-buffering'] = 'no';
            }
          },
        },
      }),
    );
  }
}
