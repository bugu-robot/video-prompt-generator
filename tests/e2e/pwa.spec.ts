import { test, expect } from '@playwright/test';
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

  // Previous matched shell remains usable when the network goes away.
  // Never store online HTML from a new build in an older worker's shell.
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('body')).not.toHaveAttribute('data-test-deployment', 'updated');
  await expect(page.locator('#camera')).toHaveValue('pan');
  await expect(page.getByRole('heading', { name: 'Video Prompt Generator' })).toBeVisible();
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
