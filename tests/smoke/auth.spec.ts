import { expect, test } from '@playwright/test';
import { hasE2EAuth, signIn } from './helpers';

test.describe('auth smoke', () => {
  test('signin page loads with core controls', async ({ page }) => {
    await page.goto('/signin');

    await expect(page.getByRole('heading', { name: 'FitnessAI' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('sign in and out flow', async ({ page }) => {
    test.skip(!hasE2EAuth, 'Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run authenticated smoke tests.');

    await signIn(page);

    // Should not be on signin page
    await expect(page).not.toHaveURL(/\/signin/);

    // Sign out - look for profile menu
    const profileButton = page.getByRole('button', { name: /profile|menu|account/i }).first();
    if (await profileButton.isVisible().catch(() => false)) {
      await profileButton.click();
      const signOutItem = page.getByRole('menuitem', { name: /sign out|logout/i });
      if (await signOutItem.isVisible().catch(() => false)) {
        await signOutItem.click();
        await expect(page).toHaveURL(/\/signin/);
      }
    }
  });
});
