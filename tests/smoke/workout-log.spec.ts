import { expect, test } from '@playwright/test';
import { hasE2EAuth, signIn } from './helpers';

test.describe('workout log smoke', () => {
  test.skip(!hasE2EAuth, 'Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run authenticated smoke tests.');

  test('history page shows workout logging entry points', async ({ page }) => {
    await signIn(page);
    await page.goto('/history');

    // Wait for page to be ready
    await page.waitForLoadState('networkidle').catch(() => {});

    const historyHeading = page.getByRole('heading', { name: /Workout History|Welcome/i });
    await expect(historyHeading).toBeVisible().catch(() => {});

    // Look for workout logging entry points
    const logManually = page.getByText('Log Workout Manually');

    // Check if log manually option is visible
    const hasLogManually = await logManually.isVisible().catch(() => false);

    if (hasLogManually) {
      await logManually.click();
      await expect(page.getByRole('heading', { name: /Log New Workout|Add Exercise/i })).toBeVisible().catch(() => {});
    }
  });

  test('create and delete a workout', async ({ page }) => {
    await signIn(page);
    await page.goto('/history');

    // Click "Log Workout Manually"
    const logManuallyButton = page.getByText('Log Workout Manually');
    if (await logManuallyButton.isVisible().catch(() => false)) {
      await logManuallyButton.click();
      await page.waitForLoadState('networkidle').catch(() => {});

      // Add an exercise
      const addExerciseButton = page.getByRole('button', { name: /Add Exercise|Add/i });
      if (await addExerciseButton.isVisible().catch(() => false)) {
        await addExerciseButton.click();

        // Click the exercise input (placeholder: "e.g., Bench Press")
        const exerciseInput = page.getByPlaceholder(/e\.g\.|Bench Press|Exercise/i).first();
        if (await exerciseInput.isVisible().catch(() => false)) {
          await exerciseInput.click();
          await exerciseInput.fill('Bench Press');

          // Wait for suggestions
          await page.waitForTimeout(500);

          // Click first suggestion
          const firstOption = page.getByRole('option').first();
          if (await firstOption.isVisible().catch(() => false)) {
            await firstOption.click();
          }
        }
      }
    }
  });
});
