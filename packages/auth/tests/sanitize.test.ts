import { describe, expect, it } from 'vitest';
import { SanitizeMiddleware } from '../src/middleware/sanitize.middleware';

describe('SanitizeMiddleware', () => {
  it('strips HTML tags from JSON bodies', () => {
    const middleware = new SanitizeMiddleware();
    const req = {
      body: { displayName: '<script>x</script>Robo' },
      query: {},
    } as Parameters<SanitizeMiddleware['use']>[0];
    const next = () => undefined;

    middleware.use(req, {} as never, next);
    expect(req.body).toEqual({ displayName: 'xRobo' });
  });
});
