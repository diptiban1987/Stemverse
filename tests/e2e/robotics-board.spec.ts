import { test, expect } from '@playwright/test';

test.describe('Robotics Board Selection', () => {
  test('reverts ESP32 selection until the 4th time', async ({ page }) => {
    // Forward browser console logs to Node console
    page.on('console', (msg) => {
      console.log(`BROWSER LOG [${msg.type()}]: ${msg.text()}`);
    });

    // 1. Go to login page
    await page.goto('/login');
    
    // Fill credentials
    await page.getByLabel('Email').fill('satyadeep@stemverse.dev');
    await page.getByLabel('Password').fill('Satyadeep@2021');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // If login failed (maybe user doesn't exist yet, we check if url didn't change)
    // We try to register the user.
    try {
      await expect(page).toHaveURL(/.*dashboard|.*robotics/, { timeout: 5000 });
    } catch {
      // Register since login failed
      await page.goto('/register');
      await page.getByLabel('Display name').fill('Satyadeep');
      await page.getByLabel('Email').fill('satyadeep@stemverse.dev');
      await page.getByLabel('Password').fill('Satyadeep@2021');
      await page.getByRole('button', { name: 'Create account' }).click();
      await expect(page).toHaveURL(/.*dashboard|.*robotics/, { timeout: 10000 });
    }

    // Go to robotics studio
    await page.goto('/robotics');
    
    // Click New Project link
    await page.getByRole('link', { name: 'New Robotics Project', exact: true }).click();

    // Wait for the workspace to load
    await expect(page).toHaveURL(/.*robotics\/[a-zA-Z0-9_-]+/, { timeout: 15000 });
    await expect(page.getByText('Loading Blockly workspace…')).not.toBeVisible({ timeout: 15000 });
    
    // The Board Manager should be visible
    await expect(page.getByText('Board Manager')).toBeVisible();

    // Select dropdown element by its label
    const boardSelect = page.getByLabel('Board');
    
    // Initial value should be 'arduino_uno'
    await expect(boardSelect).toHaveValue('arduino_uno');

    // Select ESP32
    await boardSelect.selectOption('esp32');
    await expect(boardSelect).toHaveValue('esp32');

    // Test transition between ESP32 boards
    await boardSelect.selectOption('esp32_s3');
    await expect(boardSelect).toHaveValue('esp32_s3');

    // Select Arduino Uno again
    await boardSelect.selectOption('arduino_uno');
    await expect(boardSelect).toHaveValue('arduino_uno');

    // Test template application: applying "Smart Home" should update board to esp32 immediately
    await page.getByRole('button', { name: /Smart Home/i }).click();
    
    // Board select should update to 'esp32' immediately through template injection
    await expect(boardSelect).toHaveValue('esp32');

    // Switching to Arduino Uno from here should work normally
    await boardSelect.selectOption('arduino_uno');
    await expect(boardSelect).toHaveValue('arduino_uno');
  });
});
