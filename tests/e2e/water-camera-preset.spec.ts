import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PROVIDERS } from '../../src/models/motion-plan';

const preset = (page: Page, id: string) => page.locator(`[data-action="preset"][data-id="${id}"]`);
const motions = (page: Page) => page.locator('input[data-motion]:checked').evaluateAll(nodes => nodes.map(n => (n as HTMLInputElement).value));
const controls = '[data-action="copy"], [data-action="copy-variant"], [data-action="copy-provider"]';
test.beforeEach(async ({page}) => { await page.goto('/'); });
for (const mobile of [false,true])
  test(`${mobile ? 'mobile' : 'desktop'} audio/duration edits retain active preset and cancellation restores motion only, including Undo`, async ({page}) => {
    if (mobile) await page.setViewportSize({width:390,height:844});
    await page.locator('#image-file').setInputFiles(resolve('tests/fixtures/source.png'));
    await page.locator('#provider').selectOption('veo');
    await page.locator('#duration').selectOption('6');
    await page.locator('details[data-section="preservation"] summary').click();
    await page.locator('#audio').selectOption('provider-default');
    const before = await motions(page);
    const source = await page.locator('#source-preview').getAttribute('src');
    await preset(page,'nature-breeze').click();
    await page.locator('#duration').selectOption('8');
    await page.locator('#audio').selectOption('ambient');
    await page.locator('input[data-preserve="lighting"]').uncheck();
    await page.locator('#length').selectOption('concise');
    await expect(preset(page,'nature-breeze')).toHaveAttribute('aria-pressed','true');
    await preset(page,'nature-breeze').click();
    expect(await motions(page)).toEqual(before);
    await expect(page.locator('#duration')).toHaveValue('8');
    await expect(page.locator('#audio')).toHaveValue('ambient');
    await expect(page.locator('input[data-preserve="lighting"]')).not.toBeChecked();
    await expect(page.locator('#length')).toHaveValue('concise');
    await expect(page.locator('#source-preview')).toHaveAttribute('src',source!);
    await expect(page.locator('#provider')).toHaveValue('veo');
    await page.locator('[data-action="undo"]').click();
    await expect(preset(page,'nature-breeze')).toHaveAttribute('aria-pressed','true');
    await preset(page,'nature-breeze').click();
    expect(await motions(page)).toEqual(before);
    await expect(page.locator('#audio')).toHaveValue('ambient');
    await expect(page.locator('#duration')).toHaveValue('8');
  });

test('custom preset peripheral edits keep Update/Rename/Delete usable and preserve sibling storage', async ({page}) => {
  await page.locator('#presetName').fill('Sibling');
  await page.locator('[data-action="save-preset"]').click();
  await page.locator('#presetName').fill('Water breeze');
  await page.locator('[data-action="save-preset"]').click();
  await page.locator('[data-action="clear-environment-motions"]').click();
  await page.locator('details[data-section="more-environment"] summary').click();
  await expect(page.locator('label.chip').filter({has:page.locator('input[value="ripples"]')})).toBeVisible();
  await page.locator('label.chip').filter({has:page.locator('input[value="ripples"]')}).click();
  await page.locator('[data-action="update-preset"]').click();
  await page.locator('#presetFilter').selectOption('custom');
  const id = await page.evaluate(() => JSON.parse(localStorage.getItem('video-prompts.settings.v1')!).plan.presetId as string);
  const before = await motions(page);
  // Switch to built-ins, then cancel after peripheral edits to restore custom identity.
  await page.locator('#presetFilter').selectOption('all');
  await preset(page,'nature-breeze').click();
  await page.locator('details[data-section="preservation"] summary').click();
  await page.locator('#audio').selectOption('ambient');
  await preset(page,'nature-breeze').click();
  expect(await motions(page)).toEqual(before);
  await expect(page.locator('[data-action="update-preset"]')).toBeEnabled();
  await expect(page.locator('[data-action="rename-preset"]')).toBeEnabled();
  await expect(page.locator('[data-action="delete-preset"]')).toBeEnabled();
  await page.locator('[data-action="update-preset"]').click();
  await page.locator('#presetName').fill('Renamed breeze');
  await page.locator('[data-action="rename-preset"]').click();
  const items = await page.evaluate(() => JSON.parse(localStorage.getItem('video-prompts.presets.v1')!).presets as {id:string; nameZh:string; plan:{audio:string}}[]);
  expect(items.find(x => x.id === id)).toMatchObject({nameZh:'Renamed breeze',plan:{audio:'ambient'}});
  expect(items.find(x => x.nameZh === 'Sibling')).toBeTruthy();
  await page.locator('[data-action="delete-preset"]').click();
  const remaining = await page.evaluate(() => JSON.parse(localStorage.getItem('video-prompts.presets.v1')!).presets as {id:string; nameZh:string}[]);
  expect(remaining.map(x => x.nameZh)).toEqual(['Sibling']);
});
for (const provider of PROVIDERS) {
  test(`${provider} breeze-water text and new locked-camera conflicts reach all output gates`, async ({page}) => {
    await page.locator('#provider').selectOption(provider);
    await page.locator('[data-action="clear-subject-motions"]').click();
    await page.locator('[data-action="clear-environment-motions"]').click();
    await page.locator('details[data-section="more-environment"] summary').click();
    await expect(page.locator('label.chip').filter({has:page.locator('input[value="ripples"]')})).toBeVisible();
    await page.locator('label.chip').filter({has:page.locator('input[value="ripples"]')}).click();
    await expect(page.locator('label.chip').filter({has:page.locator('input[value="ripples"]')})).toContainText('微風吹拂水面');
    for (const variant of ['base','A','B','C']) {
      if (variant !== 'base') await page.locator(`[data-action="variant"][data-variant="${variant}"]`).click();
      await expect(page.locator('#final-prompt pre[lang="en"]')).toContainText('gentle breeze');
      await expect(page.locator('#final-prompt pre[lang="en"]')).toContainText('without falling droplets, rain impacts, splashes, expanding circular or point-source ripples, or objects striking the water');
    }
    await page.locator('details[data-section="context"] summary').click();
    await page.locator('#sceneNotesEn').fill('Do not pan. Avoid zoom. No parallax or tilt.');
    for (const button of await page.locator(controls).all()) await expect(button).toBeEnabled();
    for (const notes of ['Tilt the camera upward.', 'Add subtle parallax.', 'Zoom in slowly.']) {
      await page.locator('#sceneNotesEn').fill(notes);
      await expect(page.locator('[data-finding="notes-camera-conflict"]')).toHaveCount(1);
      for (const button of await page.locator(controls).all()) await expect(button).toBeDisabled();
    }
  });
}
test('compiler 1.2.0 water export retains exact original backup and requires review before compiler 1.3.0 adoption', async ({page}) => {
  const fixtures = JSON.parse(await readFile('tests/fixtures/historical-exports-v1.2.json','utf8')) as {export:unknown}[];
  const raw = JSON.stringify(fixtures[0]!.export,null,2);
  const before = await page.evaluate(() => localStorage.getItem('video-prompts.settings.v1'));
  await page.locator('#json-file').setInputFiles({name:'water-v1.2.json',mimeType:'application/json',buffer:Buffer.from(raw)});
  await expect(page.locator('#configuration-import-review')).toContainText('compiler 1.2.0');
  await expect(page.locator('#configuration-import-review')).toContainText('compiler 1.3.0');
  expect(await page.evaluate(() => localStorage.getItem('video-prompts.settings.v1'))).toBe(before);
  const backup = page.waitForEvent('download');
  await page.locator('[data-action="export-original-configuration"]').click();
  expect(await readFile((await (await backup).path())!,'utf8')).toBe(raw);
  await page.locator('[data-action="accept-configuration-migration"]').click();
  await expect(page.locator('#final-prompt pre[lang="en"]')).toContainText('gentle breeze');
  const downloaded = page.waitForEvent('download');
  await page.locator('[data-action="export-json"]').click();
  const out = JSON.parse(await readFile((await (await downloaded).path())!,'utf8')) as {compilerVersion:string;generatedEnglishPrompt:string};
  expect(out.compilerVersion).toBe('1.3.0');
  expect(out.generatedEnglishPrompt).toBe(await page.locator('#final-prompt pre[lang="en"]').innerText());
});
