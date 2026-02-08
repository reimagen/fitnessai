import { expect, type Page } from '@playwright/test';

export const hasE2EAuth = !!process.env.E2E_AUTH_EMAIL && !!process.env.E2E_AUTH_PASSWORD;

export async function signIn(page: Page): Promise<void> {
  if (!hasE2EAuth) {
    throw new Error('E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD are required for authenticated smoke tests.');
  }

  await page.goto('/signin');
  await page.getByLabel('Email').fill(process.env.E2E_AUTH_EMAIL!);
  await page.getByLabel('Password').fill(process.env.E2E_AUTH_PASSWORD!);
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for either dashboard or profile setup screen
  await page.waitForURL(/\/(pending|profile)?$/, { timeout: 10000 }).catch(() => {});

  // If on profile setup, skip it for now (tests don't need full profile)
  // Just wait for page to load
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
}

export async function expectOneOfHeadings(page: Page, options: string[]): Promise<void> {
  for (const heading of options) {
    const matcher = page.getByRole('heading', { name: heading });
    if (await matcher.first().isVisible().catch(() => false)) {
      await expect(matcher.first()).toBeVisible();
      return;
    }
  }

  throw new Error(`None of the expected headings were visible: ${options.join(', ')}`);
}
