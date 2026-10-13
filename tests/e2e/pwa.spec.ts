import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
// The versioned update fixture shares one server per browser; do not let
// update/reset cases race against each other within a browser project.
test.describe.configure({ mode: 'serial' });
async function ready(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.locator('#pwa-status')).toContainText('離線已就緒');
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
}
test('production shell, manifest, icons and prompt tools remain offline', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await ready(page);
  const response = await page.request.get('/manifest.webmanifest');
  const manifest = (await response.json()) as { icons: { src: string }[] };
  for (const icon of manifest.icons)
    expect((await page.request.get('/' + icon.src)).ok()).toBe(true);
  await page.locator('#presetName').fill('Offline');
  await page.getByRole('button', { name: '另存設定', exact: true }).click();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Video Prompt Generator', exact: true }),
  ).toBeVisible();
  await page.locator('#provider').selectOption('veo');
  await expect(page.locator('#final-prompt')).toContainText('Camera:');
  await page.locator('#presetFilter').selectOption('custom');
  await expect(page.locator('.preset-card')).toHaveCount(1);
});
test('GitHub Pages base path installs and reloads completely offline', async ({
  page,
  context,
}) => {
  await page.goto('http://127.0.0.1:4174/video-prompt-generator/');
  await ready(page);
  const scope = await page.evaluate(
    async () => (await navigator.serviceWorker.ready).scope,
  );
  expect(scope).toBe('http://127.0.0.1:4174/video-prompt-generator/');
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#final-prompt')).toContainText('camera locked');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    'href',
    '/video-prompt-generator/manifest.webmanifest',
  );
});
test('new worker waits visibly, preserves settings and activates only after user update', async ({
  page,
  browserName,
  request,
}) => {
  const port = { chromium: 4191, firefox: 4192, webkit: 4193 }[browserName],
    base = `http://127.0.0.1:${port}`;
  await request.get(base + '/__test/reset');
  await page.goto(base + '/');
  await ready(page);
  await page.locator('#camera').selectOption('pan');
  const original = await page.evaluate(async () => (await caches.keys())[0]);
  await request.get(base + '/__test/update');
  await page.evaluate(async () =>
    (await navigator.serviceWorker.ready).update(),
  );
  await expect(page.locator('#update-banner')).toBeVisible();
  const state = await page.evaluate(async () => ({
    active: (await navigator.serviceWorker.ready).active?.state,
    waiting: (await navigator.serviceWorker.ready).waiting?.state,
    keys: await caches.keys(),
  }));
  expect(state.waiting).toBe('installed');
  expect(state.keys).toContain(original);
  await page
    .getByRole('button', { name: '儲存設定並更新', exact: true })
    .click();
  await expect(page.locator('#update-banner')).toBeHidden();
  await expect(page.locator('#camera')).toHaveValue('pan');
  await expect
    .poll(async () =>
      page.evaluate(async () =>
        (await caches.keys()).includes(
          'video-prompts-/-test-' + location.port + '-updated',
        ),
      ),
    )
    .toBe(true);
  expect(
    await page.evaluate(
      async (key) => (await caches.keys()).includes(key!),
      original,
    ),
  ).toBe(false);
});

test('mobile waiting update can be dismissed and reopened without activation, source loss or QC playback reset', async ({page, context, request, browserName}) => {
  await page.setViewportSize({width: 390, height: 844});
  const base = `http://127.0.0.1:${{chromium: 4191, firefox: 4192, webkit: 4193}[browserName]}`;
  await request.get(base + '/__test/reset');
  await page.goto(base + '/'); await ready(page);
  await page.locator('#presetName').fill('Keep after dismiss');
  await page.locator('[data-action="save-preset"]').click();
  const presets = await page.evaluate(() => localStorage.getItem('video-prompts.presets.v1'));
  await page.locator('#image-file').setInputFiles(resolve('tests/fixtures/source.png'));
  await page.locator('[data-field="source.elementsConfirmed"]').check();
  const source = await page.locator('#source-preview').getAttribute('src');
  await page.locator('#video-file').setInputFiles(resolve('tests/fixtures/qc.mp4'));
  await expect(page.locator('.video-panel .metadata')).toContainText('320 × 180');
  await page.locator('#qc-notes').fill('保留這次檢查');
  await page.locator('#qc-identity').selectOption('pass');
  await page.locator('.video-panel video').evaluate((v: HTMLVideoElement) => {
    (window as unknown as {dismissPlayer: HTMLVideoElement}).dismissPlayer = v;
    v.pause(); v.currentTime = 0.65; v.playbackRate = 0.25;
  });
  await request.get(base + '/__test/update');
  await page.evaluate(async () => (await navigator.serviceWorker.ready).update());
  await expect(page.locator('#update-banner')).toBeVisible();
  const close = page.locator('[data-action="dismiss-update"]');
  await expect(close).toBeVisible();
  const box = await close.boundingBox(); expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await close.focus(); await close.press('Enter');
  await expect(page.locator('#update-banner')).toBeHidden();
  await expect(page.locator('#show-update')).toBeFocused();
  await page.locator('#provider').selectOption('veo');
  await page.locator('#length').selectOption('concise');
  await page.locator('#theme').selectOption('light');
  await page.locator('[data-action="view"][data-view="both"]').click();
  await context.setOffline(true); await context.setOffline(false);
  await page.evaluate(async () => {
    window.dispatchEvent(new PageTransitionEvent('pageshow', {persisted: false}));
    document.dispatchEvent(new Event('visibilitychange'));
    await (await navigator.serviceWorker.ready).update();
  });
  await expect(page.locator('#update-banner')).toBeHidden();
  await expect(page.locator('#show-update')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  expect(await page.evaluate(async () => (await navigator.serviceWorker.ready).waiting?.state)).toBe('installed');
  await expect(page.locator('#source-preview')).toHaveAttribute('src', source!);
  await expect(page.locator('[data-field="source.elementsConfirmed"]')).toBeChecked();
  expect(await page.locator('.video-panel video').evaluate((v: HTMLVideoElement) => ({
    same: v === (window as unknown as {dismissPlayer: HTMLVideoElement}).dismissPlayer,
    time: v.currentTime, paused: v.paused, rate: v.playbackRate,
  }))).toEqual({same: true, time: 0.65, paused: true, rate: 0.25});
  await expect(page.locator('#qc-notes')).toHaveValue('保留這次檢查');
  await expect(page.locator('#qc-identity')).toHaveValue('pass');
  expect(await page.evaluate(() => localStorage.getItem('video-prompts.presets.v1'))).toBe(presets);
  await page.locator('#show-update').click();
  await expect(page.locator('#update-banner')).toBeVisible();
  await page.locator('[data-action="update"]').click();
  await expect(page.locator('#update-banner')).toBeHidden();
  await expect(page.locator('#provider')).toHaveValue('veo');
  await expect(page.locator('#length')).toHaveValue('concise');
  await expect(page.locator('#source-preview')).toHaveCount(0);
  await expect(page.locator('[data-field="source.elementsConfirmed"]')).not.toBeChecked();
  await expect(page.locator('.video-panel video')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('video-prompts.presets.v1'))).toBe(presets);
});

test('dismissal does not suppress a genuinely newer waiting worker or auto-activate it', async ({page, request, browserName}) => {
  const base = `http://127.0.0.1:${{chromium: 4191, firefox: 4192, webkit: 4193}[browserName]}`;
  await request.get(base + '/__test/reset'); await page.goto(base + '/'); await ready(page);
  const active = await page.evaluate(async () => (await caches.keys()).find(k => k.endsWith('initial')));
  await request.get(base + '/__test/update');
  await page.evaluate(async () => (await navigator.serviceWorker.ready).update());
  await expect(page.locator('#update-banner')).toBeVisible();
  await page.locator('[data-action="dismiss-update"]').click();
  await expect(page.locator('#update-banner')).toBeHidden();
  await request.get(base + '/__test/newer');
  await page.evaluate(async () => (await navigator.serviceWorker.ready).update());
  await expect(page.locator('#update-banner')).toBeVisible();
  expect(await page.evaluate(async () => (await navigator.serviceWorker.ready).waiting?.state)).toBe('installed');
  expect(await page.evaluate(async key => (await caches.keys()).includes(key!), active)).toBe(true);
  await page.locator('[data-action="update"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-test-deployment', 'newer');
  await expect(page.locator('#update-banner')).toBeHidden();
});

test('online reload sees changed entry HTML despite an installed offline shell', async ({
  page,
  context,
  request,
  browserName,
}) => {
  const port = { chromium: 4191, firefox: 4192, webkit: 4193 }[browserName];
  const base = `http://127.0.0.1:${port}`;
  await request.get(base + '/__test/reset');
  await page.goto(base + '/');
  await ready(page);
  await page.locator('#camera').selectOption('pan');

  await request.get(base + '/__test/update');
  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-test-deployment', 'updated');
  await expect(page.locator('#camera')).toHaveValue('pan');
  // registerPwa checks for the new waiting worker without a manual API call.
  await expect(page.locator('#update-banner')).toBeVisible();

  // Offline fallback may be the old *or* newly activated version-matched
  // shell. Firefox can activate the waiting worker across this navigation;
  // the observable requirement is complete offline functionality and data.
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#camera')).toHaveValue('pan');
  await expect(page.getByRole('heading', { name: 'Video Prompt Generator' })).toBeVisible();
  await expect(page.locator('#final-prompt')).not.toBeEmpty();
  await expect(page.locator('#pwa-status')).toContainText('離線');
});

test('known pre-fix cache automatically adopts recovery worker and preserves presets', async ({
  page,
  request,
  browserName,
}) => {
  const port = { chromium: 4191, firefox: 4192, webkit: 4193 }[browserName];
  const base = `http://127.0.0.1:${port}`;
  await request.get(base + '/__test/reset');
  await page.goto(base + '/');
  await ready(page);
  await page.locator('#presetName').fill('Before PWA recovery');
  await page.getByRole('button', { name: '另存設定', exact: true }).click();

  const legacy = 'video-prompts-/-82515efa691a7e44';
  await page.evaluate(async (name) => { await caches.open(name); }, legacy);
  await request.get(base + '/__test/update');
  await page.evaluate(async () => (await navigator.serviceWorker.ready).update());

  // Only known old production caches are eligible for emergency activation.
  await expect.poll(() => page.evaluate(async () => {
    const keys = await caches.keys();
    return keys.some((key) => key.includes('-updated')) && !keys.includes('video-prompts-/-82515efa691a7e44');
  })).toBe(true);

  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-test-deployment', 'updated');
  await page.locator('#presetFilter').selectOption('custom');
  await expect(page.getByRole('button', { name: /Before PWA recovery/ })).toHaveCount(1);
});
