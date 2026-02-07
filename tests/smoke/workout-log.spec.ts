import { expect, test } from '@playwright/test';
import { hasE2EAuth, signIn } from './helpers';

test.describe('workout log smoke', () => {
  test.skip(!hasE2EAuth, 'Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run authenticated smoke tests.');

  test('history page shows workout logging entry points', async ({ page }) => {
    await signIn(page);
    await page.goto('/history');

    await expect(page.getByRole('heading', { name: 'Workout History' })).toBeVisible();
    await expect(page.getByText('Log Workout Manually')).toBeVisible();
    await expect(page.getByText('Upload Screenshot')).toBeVisible();

    await page.getByText('Log Workout Manually').click();
    await expect(page.getByRole('heading', { name: 'Log New Workout' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Exercise' })).toBeVisible();
  });
});
