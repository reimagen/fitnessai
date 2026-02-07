import { expect, test } from '@playwright/test';
import { hasE2EAuth, signIn } from './helpers';

test.describe('screenshot parsing smoke', () => {
  test.skip(!hasE2EAuth, 'Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run authenticated smoke tests.');

  test('history parser surface is accessible', async ({ page }) => {
    await signIn(page);
    await page.goto('/history');

    await page.getByText('Upload Screenshot').click();

    await expect(page.getByRole('heading', { name: 'Parse Workout from Screenshot' })).toBeVisible();
    await expect(page.getByText('Choose File')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Parse Screenshot' })).toBeVisible();
  });

  test('prs parser surface is accessible', async ({ page }) => {
    await signIn(page);
    await page.goto('/prs');

    await expect(page.getByRole('heading', { name: 'Milestones & Achievements' })).toBeVisible();
    await page.getByText('Upload Screenshot').click();
    await expect(page.getByRole('heading', { name: 'Upload from Screenshot' })).toBeVisible();
  });
});
