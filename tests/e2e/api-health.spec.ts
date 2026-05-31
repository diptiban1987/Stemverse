import { test, expect } from '@playwright/test';

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4000/api';

test.describe('API health', () => {
  test('gateway health', async ({ request }) => {
    const res = await request.get(`${API_URL}/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('full health aggregation', async ({ request }) => {
    const res = await request.get(`${API_URL}/health/full`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('database');
    expect(body).toHaveProperty('services');
  });
});
