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

  await expect(page).toHaveURL(/\/(pending)?$/);
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
