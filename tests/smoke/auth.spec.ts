import { expect, test } from '@playwright/test';

test('signin page loads with core controls', async ({ page }) => {
  await page.goto('/signin');

  await expect(page.getByRole('heading', { name: 'FitnessAI' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
});
