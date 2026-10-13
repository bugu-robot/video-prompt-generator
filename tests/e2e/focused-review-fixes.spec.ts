import { test, expect, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { PROVIDERS } from '../../src/models/motion-plan';

const controls = '[data-action="copy"], [data-action="copy-variant"], [data-action="copy-provider"]';
const selected = (page: Page) => page.locator('input[data-motion]:checked').evaluateAll(
  nodes => nodes.map(n => (n as HTMLInputElement).value),
);
const motion = (page: Page, id: string) => page.locator('label.chip').filter({has: page.locator(`input[value="${id}"]`)});
test.beforeEach(async ({page}) => { await page.goto('/'); });

for (const mobile of [false, true])
  test(`${mobile ? 'mobile' : 'desktop'} preset cancellation preserves interleaved edits, active image and custom presets`, async ({page}) => {
    if (mobile) await page.setViewportSize({width: 390, height: 844});
    await page.locator('#image-file').setInputFiles(resolve('tests/fixtures/source.png'));
    await page.locator('#subjectType').selectOption('custom');
    await page.locator('#subjectEn').fill('the hedgehog');
    await page.locator('#presetName').fill('Keep my custom preset');
    await page.locator('[data-action="save-preset"]').click();
    const presetBytes = await page.evaluate(() => localStorage.getItem('video-prompts.presets.v1'));
    const motions = await selected(page);
    const source = await page.locator('#source-preview').getAttribute('src');
    const preset = page.locator('[data-action="preset"][data-id="nature-breeze"]');
    await preset.click();
    await page.locator('#provider').selectOption('veo');
    await page.locator('#subjectEn').fill('the black cat');
    await page.locator('#length').selectOption('concise');
    await page.locator('details[data-section="context"] summary').click();
    await page.locator('#sceneNotesEn').fill('Keep the camera locked.');
    await expect(preset).toHaveAttribute('aria-pressed', 'true');
    await preset.click();
    await expect(page.locator('#provider')).toHaveValue('veo');
    await expect(page.locator('#subjectEn')).toHaveValue('the black cat');
    await expect(page.locator('#sceneNotesEn')).toHaveValue('Keep the camera locked.');
    await expect(page.locator('#length')).toHaveValue('concise');
    await expect(page.locator('#source-preview')).toHaveAttribute('src', source!);
    expect(await selected(page)).toEqual(motions);
    expect(await page.evaluate(() => localStorage.getItem('video-prompts.presets.v1'))).toBe(presetBytes);
    await expect(page.locator('[data-field="source.elementsConfirmed"]')).not.toBeChecked();
  });

for (const provider of PROVIDERS) {
  test(`${provider} negated camera instructions stay copyable; affirmative conflicts block all copy gates`, async ({page}) => {
    await page.locator('#provider').selectOption(provider);
    await page.locator('details[data-section="context"] summary').click();
    await page.locator('#sceneNotesEn').fill('Keep the camera locked. No pan, no dolly, no push-in.');
    await expect(page.locator('[data-finding="notes-camera-conflict"]')).toHaveCount(0);
    await expect(page.locator(controls)).toHaveCount(8);
    for (const button of await page.locator(controls).all()) await expect(button).toBeEnabled();
    for (const variant of ['A', 'B', 'C']) {
      await page.locator(`[data-action="variant"][data-variant="${variant}"]`).click();
      for (const button of await page.locator(controls).all()) await expect(button).toBeEnabled();
    }
    await page.locator('[data-action="base"]').click();
    await page.locator('#sceneNotesEn').fill('Pan the camera slowly.');
    await expect(page.locator('[data-finding="notes-camera-conflict"]')).toHaveCount(1);
    for (const button of await page.locator(controls).all()) await expect(button).toBeDisabled();
    for (const variant of ['A', 'B', 'C']) {
      await page.locator(`[data-action="variant"][data-variant="${variant}"]`).click();
      await expect(page.locator('[data-finding="notes-camera-conflict"]')).toHaveCount(1);
      for (const button of await page.locator(controls).all()) await expect(button).toBeDisabled();
    }
  });
  test(`${provider} cleared groups never reappear in base, A/B/C or comparison prompt pacing`, async ({page}) => {
    await page.locator('#provider').selectOption(provider);
    await page.locator('[data-action="clear-environment-motions"]').click();
    await page.locator('[data-action="clear-subject-motions"]').click();
    await motion(page, 'blink').click();
    await page.locator('[data-field="source.elementsConfirmed"]').check();
    await page.locator('#length').selectOption('concise');
    for (const variant of ['base', 'A', 'B', 'C']) {
      if (variant !== 'base') await page.locator(`[data-action="variant"][data-variant="${variant}"]`).click();
      const text = await page.locator('#final-prompt pre[lang="en"]').innerText();
      expect(text).toContain('blink naturally');
      expect(text).not.toMatch(/environment motion|environmental movement|continuous motion|character gestures/);
      await expect(page.locator('.comparison pre[lang="en"]')).toHaveCount(3);
      for (const comparison of await page.locator('.comparison pre[lang="en"]').all()) {
        expect(await comparison.innerText()).toContain('blink naturally');
        expect(await comparison.innerText()).not.toMatch(/environment motion|continuous motion/);
      }
    }
    await page.locator('[data-action="base"]').click();
    await page.locator('[data-action="clear-subject-motions"]').click();
    await motion(page, 'steam').click();
    await page.locator('#length').selectOption('detailed');
    for (const variant of ['A', 'B', 'C']) {
      await page.locator(`[data-action="variant"][data-variant="${variant}"]`).click();
      await expect(page.locator('#final-prompt pre[lang="en"]')).toContainText('steam');
      await expect(page.locator('#final-prompt pre[lang="en"]')).not.toContainText('gestures');
      await expect(page.locator('#final-prompt pre[lang="en"]')).not.toContainText('brief actions');
    }
  });
}

test('Veo Ingredients opening never claims a configured starting frame; Frames keeps the existing contract', async ({page}) => {
  await page.locator('#provider').selectOption('veo');
  await page.locator('#subjectType').selectOption('product');
  await page.locator('[data-action="mode"][data-mode="rotation"]').click();
  await page.locator('#duration').selectOption('8');
  await page.locator('#rotationInput').selectOption('references');
  for (const length of ['concise', 'balanced', 'detailed']) {
    await page.locator('#length').selectOption(length);
    await expect(page.locator('#final-prompt pre[lang="en"]')).toContainText('views as references');
    await expect(page.locator('#final-prompt pre[lang="en"]')).not.toContainText('starting frame');
    await expect(page.locator('#final-prompt pre[lang="en"]')).toContainText('360 degrees');
    await expect(page.locator('#output [data-action="copy"]')).toBeEnabled();
  }
  await page.locator('#rotationInput').selectOption('single');
  await expect(page.locator('#final-prompt pre[lang="en"]')).toContainText('starting frame');
});

test('compiler 1.1.0 import preserves original bytes, requires review, and exports 1.2.0 only after explicit adoption', async ({page}) => {
  const raw = await readFile('docs/motion-plan-export.compiler-1.1.example.json', 'utf8');
  const before = await page.evaluate(() => localStorage.getItem('video-prompts.settings.v1'));
  await page.locator('#json-file').setInputFiles({name: 'historical.json', mimeType: 'application/json', buffer: Buffer.from(raw)});
  await expect(page.locator('#configuration-import-review')).toContainText('compiler 1.1.0');
  await expect(page.locator('#configuration-import-review')).toContainText('compiler 1.2.0');
  expect(await page.evaluate(() => localStorage.getItem('video-prompts.settings.v1'))).toBe(before);
  const download = page.waitForEvent('download');
  await page.locator('[data-action="export-original-configuration"]').click();
  expect(await readFile((await (await download).path())!, 'utf8')).toBe(raw);
  await page.locator('[data-action="accept-configuration-migration"]').click();
  const updated = page.waitForEvent('download');
  await page.locator('[data-action="export-json"]').click();
  const output = JSON.parse(await readFile((await (await updated).path())!, 'utf8')) as {compilerVersion: string; generatedEnglishPrompt: string};
  expect(output.compilerVersion).toBe('1.2.0');
  expect(output.generatedEnglishPrompt).toBe(await page.locator('#final-prompt pre[lang="en"]').innerText());
  await expect(page.locator('[data-field="source.elementsConfirmed"]')).not.toBeChecked();
});
