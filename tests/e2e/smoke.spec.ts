import { test, expect } from '@playwright/test';

test.describe('STEMVerse smoke', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /STEMVerse/i }).first()).toBeVisible();
  });

  test('features page loads', async ({ page }) => {
    await page.goto('/features');
    await expect(page.getByRole('heading', { name: /Features/i })).toBeVisible();
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in|login/i })).toBeVisible();
  });

  test('register page loads', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /register|sign up|create/i })).toBeVisible();
  });

  test('blog and courses public pages', async ({ page }) => {
    await page.goto('/blog');
    await expect(page.getByRole('heading', { name: /Blog/i })).toBeVisible();
    await page.goto('/courses');
    await expect(page.getByRole('heading', { name: /Courses/i })).toBeVisible();
  });

  test('robots and sitemap', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.ok()).toBeTruthy();
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.ok()).toBeTruthy();
  });
});
