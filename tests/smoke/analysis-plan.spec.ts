import { expect, test } from '@playwright/test';
import { expectOneOfHeadings, hasE2EAuth, signIn } from './helpers';

test.describe('analysis and plan smoke', () => {
  test.skip(!hasE2EAuth, 'Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run authenticated smoke tests.');

  test('analysis route loads with expected top-level state', async ({ page }) => {
    await signIn(page);
    await page.goto('/analysis');

    await expectOneOfHeadings(page, ['Workout Analysis', 'Unlock Your Analysis']);
  });

  test('plan route loads with expected top-level state', async ({ page }) => {
    await signIn(page);
    await page.goto('/plan');

    await expectOneOfHeadings(page, ['Weekly Plan', 'Get Your AI Plan']);
    await expect(
      page.getByRole('button', { name: /Generate My Weekly Plan|Generate Plan|Regenerate with Feedback/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });
});
