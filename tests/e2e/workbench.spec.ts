import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const source = resolve('tests/fixtures/source.png');
const final = (page: import('@playwright/test').Page) =>
  page.locator('#final-prompt');
test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('default interface is Traditional Chinese with a real ambient prompt and no network APIs', async ({
  page,
}) => {
  const remote: string[] = [];
  page.on('request', (request) => {
    if (!new URL(request.url()).hostname.match(/127\.0\.0\.1|localhost/))
      remote.push(request.url());
  });
  await expect(
    page.getByRole('heading', { name: 'Video Prompt Generator', exact: true }),
  ).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-HK');
  await expect(final(page)).toContainText('camera locked');
  await expect(
    page.getByRole('button', { name: '複製英文', exact: true }).first(),
  ).toBeEnabled();
  await page.locator('#intensity').selectOption('minimal');
  await expect(final(page)).toContainText('smallest natural movement');
  expect(remote).toEqual([]);
});

test('bilingual displays and A/B/C have different actual motion plans', async ({
  page,
}) => {
  await page.getByRole('button', { name: '中英對照', exact: true }).click();
  await expect(
    final(page).getByRole('heading', { name: 'English Original' }),
  ).toBeVisible();
  await expect(
    final(page).getByRole('heading', { name: '繁體中文解讀' }),
  ).toBeVisible();
  await page.getByRole('button', { name: '查看 A', exact: true }).click();
  const a = await final(page).textContent();
  await expect(final(page)).toContainText('brief and infrequent');
  await page.getByRole('button', { name: '查看 C', exact: true }).click();
  const c = await final(page).textContent();
  expect(c).not.toBe(a);
  await expect(final(page)).toContainText('active throughout');
  await page.getByRole('button', { name: '回到原設定', exact: true }).click();
  await page.getByRole('button', { name: '繁中解讀', exact: true }).click();
  await expect(final(page)).not.toContainText('English Original');
  await expect(final(page)).toContainText('細微而克制');
});

test('provider switching retains selected camera and motion intent while showing compatibility', async ({
  page,
}) => {
  await page.locator('#camera').selectOption('pan');
  await page.locator('#duration').selectOption('10');
  await page.locator('#provider').selectOption('veo');
  await expect(page.locator('#camera')).toHaveValue('pan');
  await expect(page.locator('#duration')).toHaveValue('10');
  await expect(
    page.locator('[data-finding="duration-unsupported"]'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: '複製英文', exact: true }).first(),
  ).toBeDisabled();
  await page.locator('#duration').selectOption('8');
  await expect(final(page)).toContainText('Camera:');
  await page.locator('#provider').selectOption('grok');
  await expect(page.locator('#camera')).toHaveValue('pan');
  await expect(page.locator('[data-finding="i2v-unverified"]')).toBeVisible();
});

test('object turntable and camera orbit remain mechanically distinct', async ({
  page,
}) => {
  await page
    .getByRole('button', { name: '物件旋轉／鏡頭繞行', exact: true })
    .click();
  await expect(page.locator('[data-finding="rotation-subject"]')).toBeVisible();
  await page.locator('#subjectType').selectOption('product');
  await expect(final(page)).toContainText(
    'itself clockwise through 360 degrees',
  );
  await expect(final(page)).toContainText('camera remains stationary');
  await page.locator('#rotationType').selectOption('orbit');
  await expect(final(page)).toContainText(
    'Keep the product stationary; move the camera',
  );
  await expect(final(page)).not.toContainText('itself clockwise');
  await expect(page.locator('[data-finding="hidden-surfaces"]')).toBeVisible();
  await expect(
    page.locator('[data-finding="rotation-completion"]'),
  ).toBeVisible();
  await page.locator('#angle').selectOption('180');
  await expect(final(page)).toContainText('180-degree orbit');
  await expect(final(page)).not.toContainText('Finish at the starting');
});

test('cinematic camera controls are understandable and work', async ({
  page,
}) => {
  await page.getByRole('button', { name: '電影感動態', exact: true }).click();
  await expect(page.locator('#loop')).toHaveValue('none');
  await page.locator('#camera').selectOption('dolly');
  await expect(final(page)).toContainText('Dolly the camera slowly sideways');
  await page.locator('#camera').selectOption('orbit');
  await expect(final(page)).toContainText('stationary selected subject');
});

test('unsupported reference workflows are explicit and prevent unsafe copy', async ({
  page,
}) => {
  await page
    .getByRole('button', { name: '物件旋轉／鏡頭繞行', exact: true })
    .click();
  await page.locator('#subjectType').selectOption('product');
  await page.locator('#provider').selectOption('veo');
  await page.locator('#model').selectOption('veo-3.1-quality');
  await page.locator('#rotationInput').selectOption('references');
  await expect(
    page.locator('[data-finding="reference-unsupported"]'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: '複製英文', exact: true }).first(),
  ).toBeDisabled();
});

test('conflicting selected motions and loop-hostile camera moves are diagnosed', async ({
  page,
}) => {
  await page.locator('details[data-section="more-subject"] summary').click();
  await page
    .locator('label.chip')
    .filter({ has: page.locator('input[value="sleep"]') })
    .click();
  await page
    .locator('label.chip')
    .filter({ has: page.locator('input[value="blink"]') })
    .click();
  await expect(
    page.locator('[data-finding^="motion-conflict"]').first(),
  ).toBeVisible();
  await page
    .locator('label.chip')
    .filter({ has: page.locator('input[value="sleep"]') })
    .click();
  await page.locator('#camera').selectOption('push-in');
  await expect(page.locator('[data-finding="loop-camera"]')).toBeVisible();
});

test('source image is validated locally and pointer/keyboard subject marking has real metadata', async ({
  page,
}) => {
  const external: string[] = [];
  page.on('request', (r) => {
    if (
      r.url().startsWith('http') &&
      (r.method() !== 'GET' || !r.url().startsWith('http://127.0.0.1'))
    )
      external.push(r.url());
  });
  await page.locator('#image-file').setInputFiles(source);
  await expect(page.locator('#source-preview')).toBeVisible();
  await expect(page.locator('.metadata').first()).toContainText('320 × 180');
  await page.locator('#subjectType').selectOption('cat');
  await page.getByRole('button', { name: '框選主體位置', exact: true }).click();
  const box = await page.locator('#image-stage').boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width * 0.1, box!.y + box!.height * 0.1);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * 0.4, box!.y + box!.height * 0.5);
  await page.mouse.up();
  await expect(page.locator('#region-overlay')).toBeVisible();
  await expect(final(page)).toContainText('intended subject');
  await page.locator('details[data-section="context"] summary').click();
  await page.locator('#region-x').fill('65');
  await page.locator('#region-x').dispatchEvent('change');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '匯出 JSON', exact: true }).click();
  const download = await downloadPromise,
    data = JSON.parse(await readFile((await download.path())!, 'utf8')) as {
      motionPlan: { source: { region: { x: number } } };
      sourceImageReference: { width: number };
    };
  expect(data.motionPlan.source.region.x).toBe(0.65);
  expect(data.sourceImageReference.width).toBe(320);
  expect(external).toEqual([]);
});

test('invalid source files do not damage the last valid image', async ({
  page,
}) => {
  await page.locator('#image-file').setInputFiles(source);
  const old = await page.locator('#source-preview').getAttribute('src');
  await page
    .locator('#image-file')
    .setInputFiles({
      name: 'bad.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from('<svg><script>bad()</script></svg>'),
    });
  await expect(page.locator('#toast')).toContainText('PNG');
  await expect(page.locator('#source-preview')).toHaveAttribute('src', old!);
});

test('image objects and new preset elements cannot reuse an earlier confirmation', async ({
  page,
}) => {
  await page.locator('[data-field="source.elementsConfirmed"]').check();
  await page.locator('#image-file').setInputFiles(source);
  await expect(
    page.locator('[data-field="source.elementsConfirmed"]'),
  ).not.toBeChecked();
  await page.locator('[data-field="source.elementsConfirmed"]').check();
  await page.getByRole('button', { name: /咖啡蒸氣/ }).click();
  await expect(
    page.locator('[data-field="source.elementsConfirmed"]'),
  ).not.toBeChecked();
});

test('presets support save/update/rename/duplicate/delete with persistence', async ({
  page,
}) => {
  await page.locator('#presetName').fill('我的雨天');
  await page.getByRole('button', { name: '另存設定', exact: true }).click();
  await page.locator('#camera').selectOption('pan');
  await page.getByRole('button', { name: '更新自訂', exact: true }).click();
  await page.locator('#presetName').fill('重命名');
  await page.getByRole('button', { name: '重新命名', exact: true }).click();
  await page.getByRole('button', { name: '複製設定', exact: true }).click();
  await page.reload();
  await page.locator('#presetFilter').selectOption('custom');
  await expect(page.locator('.preset-card')).toHaveCount(2);
  await page.getByRole('button', { name: /重命名（副本）/ }).click();
  await expect(page.locator('#camera')).toHaveValue('pan');
  await page.getByRole('button', { name: '刪除自訂', exact: true }).click();
  await expect(page.locator('.preset-card')).toHaveCount(1);
});

test('configuration JSON export/import round trip recompiles trusted output', async ({
  page,
}) => {
  await page.locator('#camera').selectOption('pan');
  const en = await final(page).textContent(),
    downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '匯出 JSON', exact: true }).click();
  const path = (await (await downloadPromise).path())!;
  await page.getByRole('button', { name: '清除／重設', exact: true }).click();
  await expect(page.locator('#camera')).toHaveValue('locked');
  await page.locator('#json-file').setInputFiles(path);
  await expect(page.locator('#camera')).toHaveValue('pan');
  await expect(final(page)).toHaveText(en!);
});

test('malformed preset import is atomic and cannot execute HTML or change prior settings', async ({
  page,
}) => {
  await page.locator('#presetName').fill('Keep');
  await page.getByRole('button', { name: '另存設定', exact: true }).click();
  const before = await page.evaluate(() =>
    localStorage.getItem('video-prompts.presets.v1'),
  );
  await page
    .locator('#json-file')
    .setInputFiles({
      name: 'bad.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        '{"format":"video-prompt-generator-presets","schemaVersion":"1.0.0","presets":[{"__proto__":{"polluted":true}}]}',
      ),
    });
  await expect(page.locator('#toast')).toContainText('不安全');
  expect(
    await page.evaluate(() => localStorage.getItem('video-prompts.presets.v1')),
  ).toBe(before);
  await page.locator('#presetName').fill('<img src=x onerror=alert(1)>');
  await page.getByRole('button', { name: '另存設定', exact: true }).click();
  await expect(page.locator('.preset-card img')).toHaveCount(0);
  await expect(page.locator('.preset-card').last()).toContainText('<img');
});

test('all custom presets export and import without overriding originals', async ({
  page,
}) => {
  await page.locator('#presetName').fill('One');
  await page.getByRole('button', { name: '另存設定', exact: true }).click();
  const dp = page.waitForEvent('download');
  await page.getByRole('button', { name: '匯出全部自訂', exact: true }).click();
  const path = (await (await dp).path())!;
  await page.locator('#json-file').setInputFiles(path);
  await expect(page.locator('#toast')).toContainText('已匯入 1 個');
  await page.locator('#presetFilter').selectOption('custom');
  await expect(page.locator('.preset-card')).toHaveCount(2);
});

test('theme and prompt display persist, media bytes are never persisted', async ({
  page,
}) => {
  await page.locator('#theme').selectOption('light');
  await page.getByRole('button', { name: '中英對照', exact: true }).click();
  await page.locator('#image-file').setInputFiles(source);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(final(page)).toContainText('繁體中文解讀');
  await expect(page.locator('#source-preview')).toHaveCount(0);
  const data = await page.evaluate(() => Object.values(localStorage).join(''));
  expect(data).not.toMatch(/data:image|blob:|source\.png/);
});

test('provider comparison exports original English for consistent selected intent', async ({
  page,
}) => {
  await page.locator('details[data-section="comparison"] summary').click();
  await expect(page.locator('.comparison-grid article')).toHaveCount(3);
  await expect(page.locator('.comparison-grid')).toContainText('Camera:');
  await expect(page.locator('.comparison-grid')).toContainText(
    '網站規格未核實',
  );
});

test('mobile and tablet layouts keep essential actions accessible without horizontal overflow', async ({
  page,
}) => {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator('#provider')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.locator('#output').scrollIntoViewIfNeeded();
    await expect(final(page)).toBeVisible();
  }
});

test('keyboard users can reach labeled controls and the prompt', async ({
  page,
}) => {
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#output')).toBeFocused();
  await page.locator('#provider').focus();
  await expect(page.locator('#provider')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.locator('#provider')).not.toHaveValue('omni');
});

test('local storage rejection still offers a working generator and export', async ({
  browser,
}) => {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('blocked');
      },
    });
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('#toast')).toContainText('永久儲存不可用');
  await expect(final(page)).toContainText('camera locked');
  await page.locator('#presetName').fill('Memory');
  await page.getByRole('button', { name: '另存設定', exact: true }).click();
  await expect(page.locator('.preset-card').last()).toContainText('Memory');
  await context.close();
});

test('native or fallback copy succeeds across engines and still uses English in Chinese view', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const record = window as unknown as { copiedOriginal?: string };
    if (navigator.clipboard) {
      const original = navigator.clipboard.writeText.bind(navigator.clipboard);
      navigator.clipboard.writeText = (text: string) => {
        record.copiedOriginal = text;
        return original(text);
      };
    }
    const command = document.execCommand.bind(document);
    document.execCommand = (name: string, ...args: unknown[]) => {
      if (name === 'copy')
        record.copiedOriginal = document.querySelector('textarea')?.value;
      return command(
        name,
        args[0] as boolean | undefined,
        args[1] as string | undefined,
      );
    };
  });
  await page.reload();
  const expected = (await page.locator('#final-prompt pre').textContent())!;
  await page.getByRole('button', { name: '繁中解讀', exact: true }).click();
  await page
    .getByRole('button', { name: '複製英文', exact: true })
    .first()
    .click();
  await expect(page.locator('#toast')).toContainText('已複製英文');
  expect(
    await page.evaluate(
      () => (window as unknown as { copiedOriginal?: string }).copiedOriginal,
    ),
  ).toBe(expected);
});
