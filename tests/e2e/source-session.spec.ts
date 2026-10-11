import { test as base, expect, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import type { MotionPlan } from '../../src/models/motion-plan';

// Chromium disables native BFCache by default in automation. Enable it for
// these history regressions using full Chromium's native cache, rather than
// Headless Shell (whose delegate disables BFCache). Keep project launch options.
const test = base.extend({
  launchOptions: async ({ launchOptions, browserName }, use) => {
    await use({
      ...launchOptions,
      channel:
        browserName === 'chromium' ? 'chromium' : launchOptions.channel,
      ignoreDefaultArgs:
        browserName === 'chromium' &&
        launchOptions.ignoreDefaultArgs !== true
          ? [
              ...(Array.isArray(launchOptions.ignoreDefaultArgs)
                ? launchOptions.ignoreDefaultArgs
                : []),
              '--disable-back-forward-cache',
            ]
          : launchOptions.ignoreDefaultArgs,
    });
  },
});

const confirmation = (page: Page) =>
  page.locator('[data-field="source.elementsConfirmed"]');
const settingsKey = 'video-prompts.settings.v1';
const presetsKey = 'video-prompts.presets.v1';
async function exportPlan(page: Page): Promise<MotionPlan> {
  const download = page.waitForEvent('download');
  await page.locator('[data-action="export-json"]').click();
  const file = (await (await download).path())!;
  return (
    JSON.parse(await readFile(file, 'utf8')) as { motionPlan: MotionPlan }
  ).motionPlan;
}
async function prepare(page: Page): Promise<string | null> {
  await page
    .locator('#image-file')
    .setInputFiles(resolve('tests/fixtures/source.png'));
  await page.locator('#provider').selectOption('veo');
  await page.locator('#length').selectOption('detailed');
  await page.locator('#theme').selectOption('light');
  await page.locator('details[data-section="context"] summary').click();
  await page.locator('#region-width').fill('50');
  await page.locator('#region-width').press('Tab');
  await page.locator('#presetName').fill('Session-safe Mochi');
  await page
    .getByRole('button', { name: '另存設定', exact: true })
    .click();
  await confirmation(page).check();
  await expect(confirmation(page)).toBeChecked();
  return page.evaluate((key) => localStorage.getItem(key), presetsKey);
}
async function assertNewSession(
  page: Page,
  presets: string | null,
): Promise<void> {
  await expect(confirmation(page)).not.toBeChecked();
  await expect(page.locator('#source-preview')).toHaveCount(0);
  await expect(page.locator('#provider')).toHaveValue('veo');
  await expect(page.locator('#length')).toHaveValue('detailed');
  await expect(page.locator('#theme')).toHaveValue('light');
  await expect(page.locator('#final-prompt pre[lang="en"]')).toContainText(
    'If ',
  );
  const p = await exportPlan(page);
  expect(p.source.image).toBeNull();
  expect(p.source.region).toBeNull();
  expect(p.source.elementsConfirmed).toBe(false);
  expect(p.subjectMotions).toEqual(['breathing']);
  expect(p.environmentalMotions).toEqual(['steam', 'rain']);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), presetsKey),
  ).toBe(presets);
}

test('normal reload drops source confirmation/media, retains intent and presets, and permits reconfirmation', async ({
  page,
}) => {
  await page.goto('/');
  const presets = await prepare(page);
  const stored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).settings.plan.source,
    settingsKey,
  );
  expect(stored).toMatchObject({
    image: null,
    region: null,
    elementsConfirmed: false,
  });
  await page.reload();
  await assertNewSession(page, presets);
  await confirmation(page).check();
  await page.locator('#length').selectOption('concise');
  await expect(confirmation(page)).toBeChecked();
  expect((await exportPlan(page)).source.elementsConfirmed).toBe(true);
  await page.reload();
  await expect(confirmation(page)).not.toBeChecked();
  await expect(page.locator('#length')).toHaveValue('concise');
});

test('legacy saved true confirmation is ignored even after image metadata was already omitted', async ({
  page,
}) => {
  await page.goto('/');
  const presets = await prepare(page);
  await page.evaluate((key) => {
    const v = JSON.parse(localStorage.getItem(key)!);
    v.settings.plan.source.elementsConfirmed = true;
    localStorage.setItem(key, JSON.stringify(v));
  }, settingsKey);
  await page.reload();
  await assertNewSession(page, presets);
});

for (const [name, url] of [
  ['root', 'http://127.0.0.1:4173/'],
  ['Pages', 'http://127.0.0.1:4174/video-prompt-generator/'],
] as const)
  test(`${name} controlled PWA reload stays offline and requires fresh source confirmation`, async ({
    page,
    context,
  }) => {
    await page.goto(url);
    const presets = await prepare(page);
    await expect(page.locator('#pwa-status')).toContainText('離線已就緒');
    await page.waitForFunction(() =>
      Boolean(navigator.serviceWorker.controller),
    );
    await context.setOffline(true);
    await page.reload();
    await assertNewSession(page, presets);
    await confirmation(page).check();
    await page.locator('#length').selectOption('balanced');
    await expect(confirmation(page)).toBeChecked();
    await page.reload();
    await expect(confirmation(page)).not.toBeChecked();
    await expect(page.locator('#length')).toHaveValue('balanced');
  });

test('after reload, live confirmation survives unrelated changes and same-file replacement invalidates it', async ({
  page,
}) => {
  await page.goto('/');
  await prepare(page);
  await page.reload();
  await page
    .locator('#image-file')
    .setInputFiles(resolve('tests/fixtures/source.png'));
  await confirmation(page).check();
  await page.locator('#provider').selectOption('omni');
  await page.locator('#length').selectOption('concise');
  await page.locator('[data-action="view"][data-view="both"]').click();
  await page.locator('#intensity').selectOption('minimal');
  await page.locator('#camera').selectOption('pan');
  await expect(confirmation(page)).toBeChecked();
  await page
    .locator('#image-file')
    .setInputFiles(resolve('tests/fixtures/source.png'));
  await expect(confirmation(page)).not.toBeChecked();
  expect((await exportPlan(page)).source.elementsConfirmed).toBe(false);
});

test('real backward/forward history cannot revive discarded image confirmation', async ({
  page,
  browserName,
}) => {
  await page.addInitScript(() => {
    const marker = crypto.randomUUID();
    window.addEventListener('pageshow', (e) =>
      sessionStorage.setItem(
        'test.pageshow',
        JSON.stringify({ marker, persisted: e.persisted }),
      ),
    );
  });
  await page.goto('/');
  const presets = await prepare(page);
  const before = await page.evaluate(
    () => JSON.parse(sessionStorage.getItem('test.pageshow')!).marker,
  );
  await expect(page.locator('#pwa-status')).toContainText('離線已就緒');
  await page.waitForFunction(() =>
    Boolean(navigator.serviceWorker.controller),
  );
  await expect(page.locator('#source-preview')).toHaveJSProperty(
    'complete',
    true,
  );
  await page.goto('http://127.0.0.1:4191/__test/history');
  await expect(
    page.getByRole('heading', { name: 'History destination' }),
  ).toBeVisible();
  await page.goBack();
  await assertNewSession(page, presets);
  const transition = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem('test.pageshow')!),
  );
  console.info(
    `History restoration: ${browserName}, pageshow.persisted=${transition.persisted}`,
  );
  test.info().annotations.push({
    type: 'history-restoration',
    description: transition.persisted
      ? 'native BFCache pageshow.persisted=true'
      : 'fresh document history restore',
  });
  if (browserName === 'chromium') {
    expect(transition.persisted).toBe(true);
    expect(transition.marker).toBe(before);
  }
  await confirmation(page).check();
  await page.locator('#length').selectOption('balanced');
  await expect(confirmation(page)).toBeChecked();
  await page.goForward();
  await expect(
    page.getByRole('heading', { name: 'History destination' }),
  ).toBeVisible();
  await page.goBack();
  await expect(confirmation(page)).not.toBeChecked();
  await expect(page.locator('#length')).toHaveValue('balanced');
  expect((await exportPlan(page)).source.elementsConfirmed).toBe(false);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), presetsKey),
  ).toBe(presets);
});

test('persisted page lifecycle clears discarded source and browser-restored checkbox without blocking a new confirmation', async ({
  page,
}) => {
  await page.goto('/');
  const presets = await prepare(page);
  // Explicit lifecycle dispatch exercises the persisted handler on every
  // engine independently of its native BFCache automation availability.
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent('pageshow', { persisted: true }),
    ),
  );
  await expect(confirmation(page)).toBeChecked(); // the live image still exists
  await page.evaluate(() => {
    window.dispatchEvent(
      new PageTransitionEvent('pagehide', { persisted: true }),
    );
    window.dispatchEvent(
      new PageTransitionEvent('pageshow', { persisted: true }),
    );
    // Simulate late browser-owned form restoration; it must not change intent.
    document.querySelector<HTMLInputElement>(
      '[data-field="source.elementsConfirmed"]',
    )!.checked = true;
  });
  await assertNewSession(page, presets);
  await confirmation(page).check();
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent('pageshow', { persisted: false }),
    ),
  );
  await page.locator('#provider').selectOption('omni');
  await expect(confirmation(page)).toBeChecked();
  expect((await exportPlan(page)).source.elementsConfirmed).toBe(true);
});
