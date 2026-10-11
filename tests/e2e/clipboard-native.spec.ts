import { test, expect } from '@playwright/test';
test('actual Chromium clipboard always receives original English even in Chinese view', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  const expected = (await page.locator('#final-prompt pre').textContent())!;
  await page.getByRole('button', { name: '繁中解讀', exact: true }).click();
  await page
    .getByRole('button', { name: '複製英文', exact: true })
    .first()
    .click();
  await expect(page.locator('#toast')).toContainText('已複製英文');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(expected);
});
