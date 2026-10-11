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
        JSON.stringify({
          marker,
          persisted: e.persisted,
          url: location.href,
        }),
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
  // Playwright documents that native BFCache desynchronizes its Page lifecycle.
  // Use Chromium's protocol for traversal and the current live realm instead
  // of waiting for a new load/commit event that a cached document never fires.
  const cdp =
    browserName === 'chromium'
      ? await page.context().newCDPSession(page)
      : null;
  async function inPage<T>(fn: () => T | Promise<T>): Promise<T> {
    if (!cdp) return page.evaluate(fn);
    const response = await cdp.send('Runtime.evaluate', {
      expression: `(${fn.toString()})()`,
      returnByValue: true,
      awaitPromise: true,
    });
    expect(response.exceptionDetails).toBeUndefined();
    return response.result.value as T;
  }
  async function travel(delta: -1 | 1): Promise<void> {
    if (cdp) {
      const history = await cdp.send('Page.getNavigationHistory');
      const entry = history.entries[history.currentIndex + delta];
      if (!entry)
        throw new Error('The requested history entry is missing');
      await cdp.send('Page.navigateToHistoryEntry', { entryId: entry.id });
      await expect.poll(() => inPage(() => location.href)).toBe(entry.url);
    } else if (delta === -1) await page.goBack();
    else await page.goForward();
  }
  async function historyPlan(): Promise<MotionPlan> {
    if (!cdp) return exportPlan(page);
    const download = page.waitForEvent('download');
    const exported = await inPage(async () => {
      // Observe the real export Blob without changing its bytes, download or
      // URL lifecycle. This also proves active intent, not just checkbox state.
      let captured: Blob | undefined;
      const create = URL.createObjectURL;
      URL.createObjectURL = (blob) => {
        if (blob instanceof Blob && blob.type === 'application/json')
          captured = blob;
        return create.call(URL, blob);
      };
      try {
        document
          .querySelector<HTMLButtonElement>('[data-action="export-json"]')!
          .click();
      } finally {
        URL.createObjectURL = create;
      }
      if (!captured)
        throw new Error('The UI did not produce a JSON export');
      return (
        JSON.parse(await captured.text()) as { motionPlan: MotionPlan }
      ).motionPlan;
    });
    // A still-starting download can be mistaken for the next navigation by
    // browser automation. Finish the real download before traversing history.
    await (await download).path();
    return exported;
  }
  await travel(-1);
  await expect
    .poll(() =>
      inPage(() => ({
        confirmed: document.querySelector<HTMLInputElement>(
          '[data-field="source.elementsConfirmed"]',
        )?.checked,
        previews: document.querySelectorAll('#source-preview').length,
        provider:
          document.querySelector<HTMLSelectElement>('#provider')?.value,
        length:
          document.querySelector<HTMLSelectElement>('#length')?.value,
        theme: document.querySelector<HTMLSelectElement>('#theme')?.value,
        conditional: document
          .querySelector('#final-prompt pre[lang="en"]')
          ?.textContent?.includes('If '),
      })),
    )
    .toEqual({
      confirmed: false,
      previews: 0,
      provider: 'veo',
      length: 'detailed',
      theme: 'light',
      conditional: true,
    });
  const restored = await historyPlan();
  expect(restored.source).toMatchObject({
    image: null,
    region: null,
    elementsConfirmed: false,
  });
  expect(restored.subjectMotions).toEqual(['breathing']);
  expect(restored.environmentalMotions).toEqual(['steam', 'rain']);
  const transition = await inPage(() =>
    JSON.parse(sessionStorage.getItem('test.pageshow')!),
  );
  expect(transition.url).toBe('http://127.0.0.1:4173/');
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
  await inPage(() => {
    document
      .querySelector<HTMLInputElement>(
        '[data-field="source.elementsConfirmed"]',
      )!
      .click();
    const length = document.querySelector<HTMLSelectElement>('#length')!;
    length.value = 'balanced';
    length.dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect((await historyPlan()).source.elementsConfirmed).toBe(true);
  await travel(1);
  await expect
    .poll(() => inPage(() => document.querySelector('h1')?.textContent))
    .toBe('History destination');
  await travel(-1);
  await expect
    .poll(() =>
      inPage(() => ({
        confirmed: document.querySelector<HTMLInputElement>(
          '[data-field="source.elementsConfirmed"]',
        )?.checked,
        length:
          document.querySelector<HTMLSelectElement>('#length')?.value,
      })),
    )
    .toEqual({ confirmed: false, length: 'balanced' });
  expect((await historyPlan()).source.elementsConfirmed).toBe(false);
  expect(
    await inPage(() => localStorage.getItem('video-prompts.presets.v1')),
  ).toBe(presets);
  await cdp?.detach();
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
