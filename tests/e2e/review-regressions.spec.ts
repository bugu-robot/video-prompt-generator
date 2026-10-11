import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { largePresetBatch } from '../fixtures/presets';
import { presetBundle } from '../../src/storage/local-storage';
import { MODEL_IDS, PROVIDERS } from '../../src/models/motion-plan';
import { PROVIDER_CAPABILITIES } from '../../src/models/provider-capabilities';

const key = 'video-prompts.presets.v1';
const asFile = (raw: string) => ({
  name: 'presets.json',
  mimeType: 'application/json',
  buffer: Buffer.from(raw),
});
test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('aggregate imports reject oversized merges without losing the first batch or later saves', async ({
  page,
}) => {
  await page.locator('#presetName').fill('Keep');
  await page.getByRole('button', { name: '另存設定', exact: true }).click();
  await page
    .locator('#json-file')
    .setInputFiles(asFile(presetBundle(largePresetBatch('first'))));
  await expect(page.locator('#toast')).toContainText('已匯入 30 個');
  const before = await page.evaluate((k) => localStorage.getItem(k), key);
  await page
    .locator('#json-file')
    .setInputFiles(asFile(presetBundle(largePresetBatch('second'))));
  await expect(page.locator('#toast')).toContainText('合併後');
  await expect(page.locator('#toast')).toContainText('1 MiB');
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(before);
  await page.reload();
  await page.locator('#presetFilter').selectOption('custom');
  await expect(page.locator('.preset-card')).toHaveCount(31);
  await page.locator('#presetName').fill('After');
  await page.getByRole('button', { name: '另存設定', exact: true }).click();
  await expect(page.locator('.preset-card')).toHaveCount(32);
});

for (const kind of ['malformed', 'oversized'] as const) {
  test(`${kind} existing presets stay intact and can be backed up and explicitly recovered`, async ({
    page,
  }) => {
    const raw =
      kind === 'malformed'
        ? '  {broken JSON\n'
        : JSON.stringify(
            {
              format: 'video-prompt-generator-presets',
              schemaVersion: '1.0.0',
              presets: largePresetBatch('legacy', 60),
            },
            null,
            2,
          );
    await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), {
      key,
      raw,
    });
    await page.reload();
    await expect(page.locator('#preset-recovery')).toContainText(
      '原始資料已保留',
    );
    await expect(
      page.getByRole('button', { name: '另存設定', exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole('button', { name: '複製設定', exact: true }),
    ).toBeDisabled();
    await page
      .locator('#json-file')
      .setInputFiles(asFile(presetBundle(largePresetBatch('new', 1))));
    await expect(page.locator('#toast')).toContainText('原始資料已保留');
    expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(raw);
    const dp = page.waitForEvent('download');
    await page
      .getByRole('button', { name: '匯出原始預設備份', exact: true })
      .click();
    const download = await dp;
    expect(await readFile((await download.path())!, 'utf8')).toBe(raw);
    await page
      .locator('details[data-section="preset-recovery"] summary')
      .click();
    await expect(
      page.locator('[data-action="restore-presets"]'),
    ).toBeDisabled();
    await page.locator('#preset-recovery-confirm').check();
    await expect(page.locator('[data-action="restore-presets"]')).toBeEnabled();
    await page.locator('#recovery-file').setInputFiles(asFile('{invalid}'));
    await expect(page.locator('#toast')).toContainText('有效格式');
    expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(raw);
    await page
      .locator('#recovery-file')
      .setInputFiles(asFile(presetBundle(largePresetBatch('repaired', 1))));
    await expect(page.locator('#toast')).toContainText('已復原 1 個');
    await expect(page.locator('#preset-recovery')).toHaveCount(0);
    await page.locator('#presetFilter').selectOption('custom');
    await expect(page.locator('.preset-card')).toHaveCount(1);
    await expect(
      page.getByRole('button', { name: '另存設定', exact: true }),
    ).toBeEnabled();
  });
}

test('actual localStorage quota errors preserve prior presets and show an actionable message', async ({
  page,
}) => {
  await page.locator('#presetName').fill('Keep');
  await page.getByRole('button', { name: '另存設定', exact: true }).click();
  const before = await page.evaluate((k) => localStorage.getItem(k), key);
  await page.evaluate((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === key)
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      original.call(this, k, v);
    };
  }, key);
  await page.locator('#presetName').fill('New');
  await page.getByRole('button', { name: '另存設定', exact: true }).click();
  await expect(page.locator('#toast')).toContainText('原有資料未更改');
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(before);
  // Also hit quota during startup's probe; existing data must not disappear
  // behind a newly selected empty memory adapter.
  await page.addInitScript(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    };
  });
  await page.reload();
  await page.locator('#presetFilter').selectOption('custom');
  await expect(page.locator('.preset-card')).toHaveCount(1);
  await expect(page.locator('.preset-card')).toContainText('Keep');
  await expect(
    page.getByRole('button', { name: '匯出全部自訂', exact: true }),
  ).toBeEnabled();
  await page.locator('#presetName').fill('Still blocked');
  await page.getByRole('button', { name: '另存設定', exact: true }).click();
  await expect(page.locator('#toast')).toContainText('原有資料未更改');
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(before);
});

for (const provider of PROVIDERS)
  for (const type of ['turntable', 'orbit'] as const) {
    test(`${provider} ${type} ignores dormant conflicts for all copy gates and restores them in active modes`, async ({
      page,
    }) => {
      await page.locator('#provider').selectOption(provider);
      const toggleMotion = (id: string) =>
        page
          .locator('label.chip')
          .filter({ has: page.locator(`input[value="${id}"]`) })
          .click();
      await toggleMotion('breathing');
      await page
        .locator('details[data-section="more-subject"] summary')
        .click();
      await toggleMotion('sleep');
      await toggleMotion('blink');
      await page.locator('#primaryMotion').selectOption('sleep');
      await expect(
        page.locator('[data-finding^="motion-conflict"]'),
      ).toHaveCount(1);
      await page.locator('[data-action="mode"][data-mode="rotation"]').click();
      await page.locator('#subjectType').selectOption('product');
      await page.locator('#rotationType').selectOption(type);
      await expect(
        page.locator('[data-finding^="motion-conflict"]'),
      ).toHaveCount(0);
      for (const button of await page
        .locator(
          '[data-action="copy"], [data-action="copy-variant"], [data-action="copy-provider"]',
        )
        .all())
        await expect(button).toBeEnabled();
      for (const variant of ['A', 'B', 'C']) {
        await page
          .locator(`[data-action="variant"][data-variant="${variant}"]`)
          .click();
        await expect(page.locator('#final-prompt')).not.toContainText(
          /blink|sleep|breath/i,
        );
        for (const button of await page
          .locator('[data-action="copy"], [data-action="copy-provider"]')
          .all())
          await expect(button).toBeEnabled();
      }
      for (const mode of ['ambient', 'cinematic']) {
        await page.locator('[data-action="base"]').click();
        await page
          .locator('[data-action="mode"][data-mode="' + mode + '"]')
          .click();
        await page.locator('#subjectType').selectOption('cat');
        await expect(
          page.locator('[data-motion="subjectMotions"][value="sleep"]'),
        ).toBeChecked();
        await expect(
          page.locator('[data-motion="subjectMotions"][value="blink"]'),
        ).toBeChecked();
        await expect(
          page.locator('[data-finding^="motion-conflict"]'),
        ).toHaveCount(1);
        for (const button of await page
          .locator(
            '[data-action="copy"], [data-action="copy-variant"], [data-action="copy-provider"]',
          )
          .all())
          await expect(button).toBeDisabled();
        // Select a derived version so the copy gate is also checked after rendering its actual plan.
        await page.locator('[data-action="variant"][data-variant="B"]').click();
        await expect(
          page.locator('[data-action="copy"]').first(),
        ).toBeDisabled();
      }
    });
  }

for (const model of MODEL_IDS) {
  test(`${model} partial turntable/orbit endpoints agree with prompts and retain requested motion`, async ({
    page,
  }) => {
    await page
      .locator('#provider')
      .selectOption(PROVIDER_CAPABILITIES[model].provider);
    await page.locator('#model').selectOption(model);
    await page.locator('[data-action="mode"][data-mode="rotation"]').click();
    await page.locator('#subjectType').selectOption('product');
    await page.locator('#direction').selectOption('counterclockwise');
    await page.locator('details[data-section="workflow"] summary').click();
    for (const type of ['turntable', 'orbit'])
      for (const angle of ['90', '180']) {
        await page.locator('#rotationType').selectOption(type);
        await page.locator('#angle').selectOption(angle);
        await expect(page.locator('#final-prompt')).toContainText(
          'counterclockwise',
        );
        await expect(page.locator('#final-prompt')).toContainText(angle);
        await expect(page.locator('#final-prompt')).toContainText(
          'separately designed return path',
        );
        await expect(page.locator('.workflow')).toContainText('不同尾幀');
        await expect(page.locator('.workflow')).not.toContainText(
          '相同原圖設為首尾幀',
        );
        if (model === 'grok-consumer-current')
          await expect(page.locator('.workflow')).toContainText('未核實');
        await expect(page.locator('#direction')).toHaveValue(
          'counterclockwise',
        );
        await expect(
          page.locator('[data-action="copy"]').first(),
        ).toBeEnabled();
      }
    await page.locator('#angle').selectOption('360');
    if (model !== 'grok-consumer-current')
      await expect(page.locator('.workflow')).toContainText(
        '相同原圖設為首尾幀',
      );
  });
}

test('configuration imports accept reordered object keys and preserve the original English output', async ({
  page,
}) => {
  await page.locator('#camera').selectOption('pan');
  const original = await page.locator('#final-prompt').textContent();
  const dp = page.waitForEvent('download');
  await page.getByRole('button', { name: '匯出 JSON', exact: true }).click();
  const data = JSON.parse(
    await readFile((await (await dp).path())!, 'utf8'),
  ) as { loopSettings: { strategy: string; returnToStart: boolean } };
  data.loopSettings = {
    returnToStart: data.loopSettings.returnToStart,
    strategy: data.loopSettings.strategy,
  };
  await page.getByRole('button', { name: '清除／重設', exact: true }).click();
  await page.locator('#json-file').setInputFiles(asFile(JSON.stringify(data)));
  await expect(page.locator('#toast')).toContainText('設定已匯入');
  await expect(page.locator('#final-prompt')).toHaveText(original!);
});
