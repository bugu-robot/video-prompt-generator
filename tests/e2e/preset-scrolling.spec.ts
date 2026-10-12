import { expect, test } from '@playwright/test';

test('desktop preset list scroll survives choosing and toggling a lower preset', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const list = page.locator('.preset-list');
  const metrics = await list.evaluate((element) => ({
    height: element.clientHeight,
    fullHeight: element.scrollHeight,
    overflow: getComputedStyle(element).overflowY,
  }));
  expect(metrics.fullHeight).toBeGreaterThan(metrics.height + 100);
  expect(metrics.overflow).toBe('auto');

  await list.evaluate((element) => { element.scrollTop = element.scrollHeight / 2; });
  const before = await list.evaluate((element) => element.scrollTop);
  expect(before).toBeGreaterThan(0);
  await page.locator('[data-action="preset"][data-id="nature-breeze"]').click();
  const afterApply = await list.evaluate((element) => element.scrollTop);
  expect(afterApply).toBeGreaterThan(0);

  await page.locator('[data-action="preset"][data-id="nature-breeze"]').click();
  const afterToggle = await list.evaluate((element) => element.scrollTop);
  expect(afterToggle).toBeGreaterThan(0);
});

test('mobile preset cards use native document scroll rather than trapped inner scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto('/');
  const list = page.locator('.preset-list');
  const metrics = await list.evaluate((el) => ({
    height: el.clientHeight,
    fullHeight: el.scrollHeight,
    maxHeight: getComputedStyle(el).maxHeight,
    overflowY: getComputedStyle(el).overflowY,
  }));
  expect(metrics.fullHeight - metrics.height).toBeLessThanOrEqual(2);
  expect(metrics.maxHeight).toBe('none');
  expect(metrics.overflowY).toBe('visible');

  const last = page.locator('[data-action="preset"][data-id="cinematic-reveal"]');
  await last.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expect(last).toBeVisible();
  await last.click();
  await expect(page.locator('[data-action="preset"][data-id="cinematic-reveal"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '另存設定', exact: true })).toBeAttached();

  await page.locator('#presetFilter').selectOption('nature');
  await expect(list.locator('.preset-card')).toHaveCount(5);
  await page.locator('#presetFilter').selectOption('all');
  await expect(list.locator('.preset-card')).toHaveCount(23);
});

test('tablet width also has page scrolling for the entire preset section', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto('/');
  const list = page.locator('.preset-list');
  await expect(page.locator('[data-action="preset"][data-id="rotation-character"]')).toBeAttached();
  expect(await list.evaluate(el => getComputedStyle(el).overflowY)).toBe('visible');
  expect(await list.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(2);
  await page.locator('[data-action="preset"][data-id="rotation-character"]').scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
