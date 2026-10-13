import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PROVIDERS } from '../../src/models/motion-plan';

const toggleMotion = (page: Page, id: string) =>
  page
    .locator('label.chip')
    .filter({ has: page.locator(`input[value="${id}"]`) })
    .click();
const confirmation = (page: Page) =>
  page.locator('[data-field="source.elementsConfirmed"]');
const jsonFile = (raw: string) => ({
  name: 'plan.json',
  mimeType: 'application/json',
  buffer: Buffer.from(raw),
});
test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

for (const provider of PROVIDERS)
  for (const other of ['breathing', 'blink', 'look', 'gesture'])
    test(`${provider} sleep/${other} blocks active base/ABC/comparison copy controls`, async ({
      page,
    }) => {
      await page.locator('#provider').selectOption(provider);
      await page.locator('#subjectType').selectOption('cat');
      await toggleMotion(page, 'steam');
      await toggleMotion(page, 'rain');
      if (other !== 'breathing') await toggleMotion(page, 'breathing');
      await page
        .locator('details[data-section="more-subject"] summary')
        .click();
      await toggleMotion(page, 'sleep');
      if (other !== 'breathing') await toggleMotion(page, other);
      await page.locator('#primaryMotion').selectOption('sleep');
      await expect(
        page.locator('[data-finding^="motion-conflict"]'),
      ).toHaveCount(1);
      for (const b of await page
        .locator(
          '[data-action="copy"], [data-action="copy-variant"], [data-action="copy-provider"]',
        )
        .all())
        await expect(b).toBeDisabled();
      for (const id of ['A', 'B', 'C']) {
        await page
          .locator(`[data-action="variant"][data-variant="${id}"]`)
          .click();
        await expect(
          page.locator('[data-finding^="motion-conflict"]'),
        ).toHaveCount(1);
        for (const b of await page
          .locator('[data-action="copy"], [data-action="copy-provider"]')
          .all())
          await expect(b).toBeDisabled();
      }
      await page.locator('[data-action="mode"][data-mode="cinematic"]').click();
      await expect(
        page.locator('[data-finding^="motion-conflict"]'),
      ).toHaveCount(1);
      await page.locator('[data-action="mode"][data-mode="rotation"]').click();
      await expect(
        page.locator('[data-finding^="motion-conflict"]'),
      ).toHaveCount(0);
      for (const b of await page
        .locator(
          '[data-action="copy"], [data-action="copy-variant"], [data-action="copy-provider"]',
        )
        .all())
        await expect(b).toBeEnabled();
    });

test('subject changes, motion removal and source replacement invalidate confirmation; unrelated controls retain it', async ({
  page,
}) => {
  await page
    .locator('#image-file')
    .setInputFiles(resolve('tests/fixtures/source.png'));
  await confirmation(page).check();
  await page.locator('#provider').selectOption('veo');
  await page.locator('#length').selectOption('detailed');
  await page.locator('[data-action="view"][data-view="zh"]').click();
  await page.locator('#intensity').selectOption('minimal');
  await expect(confirmation(page)).toBeChecked();
  await page.locator('#subjectType').selectOption('custom');
  await expect(confirmation(page)).not.toBeChecked();
  await page.locator('#subjectEn').fill('Mochi');
  await confirmation(page).check();
  await page.locator('#subjectEn').fill('the hedgehog by the window');
  await expect(confirmation(page)).not.toBeChecked();
  await expect(page.locator('#final-prompt')).toContainText('如原圖已有');
  await confirmation(page).check();
  await page.locator('#subjectZh').fill('窗邊的小刺蝟');
  await expect(confirmation(page)).not.toBeChecked();
  await confirmation(page).check();
  await toggleMotion(page, 'breathing');
  await expect(confirmation(page)).not.toBeChecked();
  await confirmation(page).check();
  await toggleMotion(page, 'steam');
  await expect(confirmation(page)).not.toBeChecked();
  await confirmation(page).check();
  await page
    .locator('#image-file')
    .setInputFiles(resolve('tests/fixtures/source.png'));
  await expect(confirmation(page)).not.toBeChecked();
  await confirmation(page).check();
  await page.locator('[data-action="remove-image"]').click();
  await expect(confirmation(page)).not.toBeChecked();
});

test('changing the selected source region invalidates confirmation without uploading media', async ({
  page,
}) => {
  const external: string[] = [];
  page.on('request', (request) => {
    if (
      !request.url().startsWith('http://127.0.0.1') &&
      !request.url().startsWith('blob:') &&
      !request.url().startsWith('data:')
    )
      external.push(request.url());
  });
  await page
    .locator('#image-file')
    .setInputFiles(resolve('tests/fixtures/source.png'));
  await confirmation(page).check();
  await page.locator('details[data-section="context"] summary').click();
  await page.locator('#region-width').fill('50');
  await page.locator('#region-width').press('Tab');
  await expect(confirmation(page)).not.toBeChecked();
  await confirmation(page).check();
  await page.locator('[data-action="clear-region"]').click();
  await expect(confirmation(page)).not.toBeChecked();
  expect(external).toEqual([]);
});

test('useful densities and provider composition preserve actual selected motion', async ({
  page,
}) => {
  for (const provider of PROVIDERS) {
    await page.locator('#provider').selectOption(provider);
    const outputs: string[] = [];
    for (const length of ['concise', 'balanced', 'detailed']) {
      await page.locator('#length').selectOption(length);
      const text = await page
        .locator('#final-prompt pre[lang="en"]')
        .innerText();
      expect(text).toContain('breathe gently');
      expect(text).toContain('steam');
      expect(text).toContain('rain');
      expect(text).toContain('camera locked');
      outputs.push(text.replace(/\s+/g, ''));
    }
    expect(outputs[0]!.length).toBeLessThan(outputs[1]!.length * 0.93);
    expect(outputs[2]!.length).toBeGreaterThan(outputs[1]!.length * 1.1);
  }
});

test('historical import requires review and explicit acceptance, preserves exact original backup and new export provenance', async ({
  page,
}) => {
  const raw = await readFile('docs/motion-plan-export.example.json', 'utf8');
  await page.locator('#subjectType').selectOption('cat');
  const before = await page.evaluate(() =>
    localStorage.getItem('video-prompts.settings.v1'),
  );
  await page.locator('#json-file').setInputFiles(jsonFile(raw));
  await expect(page.locator('#configuration-import-review')).toContainText(
    'compiler 1.0.0',
  );
  await expect(page.locator('#configuration-import-review')).toContainText(
    'compiler 1.2.0',
  );
  expect(
    await page.evaluate(() =>
      localStorage.getItem('video-prompts.settings.v1'),
    ),
  ).toBe(before);
  const originalDownload = page.waitForEvent('download');
  await page.locator('[data-action="export-original-configuration"]').click();
  expect(await readFile((await (await originalDownload).path())!, 'utf8')).toBe(
    raw,
  );
  await page.locator('[data-action="cancel-configuration-migration"]').click();
  expect(
    await page.evaluate(() =>
      localStorage.getItem('video-prompts.settings.v1'),
    ),
  ).toBe(before);
  await page.locator('#json-file').setInputFiles(jsonFile(raw));
  await page.locator('[data-action="accept-configuration-migration"]').click();
  await expect(page.locator('#configuration-import-review')).toHaveCount(0);
  await expect(confirmation(page)).not.toBeChecked();
  const dp = page.waitForEvent('download');
  await page.locator('[data-action="export-json"]').click();
  const exported = JSON.parse(
    await readFile((await (await dp).path())!, 'utf8'),
  ) as { compilerVersion: string; generatedEnglishPrompt: string };
  expect(exported.compilerVersion).toBe('1.2.0');
  expect(exported.generatedEnglishPrompt).toBe(
    await page.locator('#final-prompt pre[lang="en"]').innerText(),
  );
  expect(exported.generatedEnglishPrompt).not.toBe(
    (JSON.parse(raw) as { generatedEnglishPrompt: string })
      .generatedEnglishPrompt,
  );
  const backup = page.waitForEvent('download');
  await page.locator('[data-action="export-original-configuration"]').click();
  expect(await readFile((await (await backup).path())!, 'utf8')).toBe(raw);
});

test('tampered historical prompt is rejected without replacing settings or opening migration', async ({
  page,
}) => {
  const v = JSON.parse(
    await readFile('docs/motion-plan-export.example.json', 'utf8'),
  ) as { generatedEnglishPrompt: string };
  v.generatedEnglishPrompt += ' Extra gesture.';
  const before = await page.evaluate(() =>
    localStorage.getItem('video-prompts.settings.v1'),
  );
  await page.locator('#json-file').setInputFiles(jsonFile(JSON.stringify(v)));
  await expect(page.locator('#toast')).toContainText('generatedEnglishPrompt');
  expect(
    await page.evaluate(() =>
      localStorage.getItem('video-prompts.settings.v1'),
    ),
  ).toBe(before);
  await expect(page.locator('#configuration-import-review')).toHaveCount(0);
});

test('QC player stays in place while editing prompts, providers and languages, preserving playback and review state', async ({
  page,
}) => {
  await page
    .locator('#video-file')
    .setInputFiles(resolve('tests/fixtures/qc.mp4'));
  await expect(page.locator('.video-panel .metadata')).toContainText(
    '320 × 180',
  );
  await page.locator('#qc-identity').selectOption('pass');
  await page.locator('#qc-geometry').selectOption('fail');
  await page.locator('#qc-notes').fill('檢查到尾段幾何漂移，待重做。');
  await page
    .locator('.video-panel video')
    .evaluate(async (v: HTMLVideoElement) => {
      v.pause();
      v.currentTime = 0.65;
      v.playbackRate = 0.25;
      v.volume = 0.3;
      const w = window as unknown as {
        qcPlayer: HTMLVideoElement;
        resets: number;
      };
      w.qcPlayer = v;
      w.resets = 0;
      v.addEventListener('emptied', () => {
        w.resets++;
      });
    });
  await expect
    .poll(() =>
      page
        .locator('.video-panel video')
        .evaluate((v: HTMLVideoElement) => v.currentTime),
    )
    .toBeCloseTo(0.65, 2);
  const edits = [
    () => page.locator('#subjectType').selectOption('custom'),
    () => page.locator('#subjectEn').fill('Mochi with headphones'),
    () => page.locator('#provider').selectOption('veo'),
    () => page.locator('#model').selectOption('veo-3.1-quality'),
    () => page.locator('[data-action="view"][data-view="zh"]').click(),
    () => page.locator('[data-action="view"][data-view="both"]').click(),
    () => page.locator('#length').selectOption('concise'),
    () => page.locator('[data-action="variant"][data-variant="B"]').click(),
    () => page.locator('#presetFilter').selectOption('nature'),
  ];
  for (const edit of edits) {
    await edit();
    expect(
      await page
        .locator('.video-panel video')
        .evaluate((v: HTMLVideoElement) => ({
          same:
            (window as unknown as { qcPlayer: HTMLVideoElement }).qcPlayer ===
            v,
          time: v.currentTime,
          rate: v.playbackRate,
          paused: v.paused,
          resets: (window as unknown as { resets: number }).resets,
        })),
    ).toEqual({ same: true, time: 0.65, rate: 0.25, paused: true, resets: 0 });
    await expect(page.locator('#qc-notes')).toHaveValue(
      '檢查到尾段幾何漂移，待重做。',
    );
    await expect(page.locator('#qc-identity')).toHaveValue('pass');
    await expect(page.locator('#qc-geometry')).toHaveValue('fail');
  }
  await page
    .locator('.video-panel video')
    .evaluate(async (v: HTMLVideoElement) => {
      v.loop = true;
      await v.play();
    });
  await page.locator('#provider').selectOption('grok');
  await page.locator('[data-action="view"][data-view="en"]').click();
  expect(
    await page
      .locator('.video-panel video')
      .evaluate((v: HTMLVideoElement) => ({
        same:
          v === (window as unknown as { qcPlayer: HTMLVideoElement }).qcPlayer,
        paused: v.paused,
        resets: (window as unknown as { resets: number }).resets,
      })),
  ).toEqual({ same: true, paused: false, resets: 0 });
  const dp = page.waitForEvent('download');
  await page.locator('[data-action="export-qc"]').click();
  const report = JSON.parse(
    await readFile((await (await dp).path())!, 'utf8'),
  ) as { notes: string; checkStatus: { id: string; status: string }[] };
  expect(report.notes).toBe('檢查到尾段幾何漂移，待重做。');
  expect(report.checkStatus.find((c) => c.id === 'identity')?.status).toBe(
    'pass',
  );
});

test('QC replacement cancels stale work and releases only retired Blob URLs; media stays local', async ({
  page,
}) => {
  await page.evaluate(() => {
    const original = URL.revokeObjectURL,
      w = window as unknown as { revoked: string[] };
    w.revoked = [];
    URL.revokeObjectURL = (url) => {
      w.revoked.push(url);
      original.call(URL, url);
    };
  });
  await page
    .locator('#video-file')
    .setInputFiles(resolve('tests/fixtures/qc.mp4'));
  await expect(page.locator('.video-panel .metadata')).toContainText(
    '320 × 180',
  );
  const url = await page.locator('.video-panel video').getAttribute('src');
  await page.locator('#provider').selectOption('grok');
  expect(
    await page.evaluate(
      () => (window as unknown as { revoked: string[] }).revoked,
    ),
  ).not.toContain(url);
  const buffer = await readFile('tests/fixtures/qc.mp4');
  await page
    .locator('#video-file')
    .setInputFiles({ name: 'cancelled.mp4', mimeType: 'video/mp4', buffer });
  await page
    .locator('#video-file')
    .setInputFiles({ name: 'latest.mp4', mimeType: 'video/mp4', buffer });
  await expect(page.locator('.video-panel .metadata')).toContainText(
    'latest.mp4',
  );
  expect(
    await page.evaluate(
      () => (window as unknown as { revoked: string[] }).revoked,
    ),
  ).toContain(url);
  const latest = await page.locator('.video-panel video').getAttribute('src');
  await page.locator('[data-action="clear-qc"]').click();
  await expect(page.locator('.video-panel video')).toHaveCount(0);
  expect(
    await page.evaluate(
      () => (window as unknown as { revoked: string[] }).revoked,
    ),
  ).toContain(latest);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    'blob:',
  );
});
