import { test, expect, type Page } from '@playwright/test';
import { resolve } from 'node:path';

const repoImage = resolve('tests/fixtures/source.png');
const motion = (page: Page, id: string) =>
  page.locator('label.chip').filter({
    has: page.locator(`input[value="${id}"]`),
  });
const preset = (page: Page, id: string) =>
  page.locator(`[data-action="preset"][data-id="${id}"]`);
const selected = (page: Page, id: string) =>
  page.locator(`input[data-motion][value="${id}"]`).isChecked();

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('preset click twice restores exact previous motion selection without clearing source', async ({ page }) => {
  await page.locator('#image-file').setInputFiles(repoImage);
  await page.locator('#provider').selectOption('veo');
  const initial = await Promise.all(['breathing','steam','rain','trees'].map(id => selected(page,id)));
  await preset(page,'nature-breeze').click();
  await expect(preset(page,'nature-breeze')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('input[data-motion="environmentalMotions"][value="trees"]')).toBeChecked();
  await expect(page.locator('input[data-motion="environmentalMotions"][value="rain"]')).not.toBeChecked();
  await preset(page,'nature-breeze').click();
  await expect(preset(page,'nature-breeze')).toHaveAttribute('aria-pressed','false');
  expect(await Promise.all(['breathing','steam','rain','trees'].map(id => selected(page,id)))).toEqual(initial);
  await expect(page.locator('#provider')).toHaveValue('veo');
  await expect(page.locator('#source-preview')).toHaveCount(1);
});

test('environment clear and Undo preserve subject selection and primary motion', async ({ page }) => {
  await page.locator('#provider').selectOption('veo');
  await page.locator('[data-action="clear-environment-motions"]').click();
  for(const id of ['steam','rain'])
    await expect(page.locator(`input[data-motion="environmentalMotions"][value="${id}"]`)).not.toBeChecked();
  await expect(page.locator('input[data-motion="subjectMotions"][value="breathing"]')).toBeChecked();
  await page.locator('[data-action="undo"]').click();
  for(const id of ['steam','rain'])
    await expect(page.locator(`input[data-motion="environmentalMotions"][value="${id}"]`)).toBeChecked();
});

test('subject clear and Undo preserve environment selection', async ({ page }) => {
  await page.locator('[data-action="clear-subject-motions"]').click();
  await expect(page.locator('input[data-motion="subjectMotions"][value="breathing"]')).not.toBeChecked();
  await expect(page.locator('input[data-motion="environmentalMotions"][value="rain"]')).toBeChecked();
  await expect(page.locator('#primaryMotion')).not.toHaveValue('breathing');
  await page.locator('[data-action="undo"]').click();
  await expect(page.locator('input[data-motion="subjectMotions"][value="breathing"]')).toBeChecked();
  await expect(page.locator('input[data-motion="environmentalMotions"][value="rain"]')).toBeChecked();
});

test('motion-only reset preserves image, provider, scene description and restores with Undo', async ({page}) => {
  await page.locator('#image-file').setInputFiles(repoImage);
  await page.locator('#provider').selectOption('veo');
  await page.locator('#subjectType').selectOption('custom');
  await page.locator('#subjectEn').fill('Mochi in the tent');
  await page.locator('[data-action="reset-motions"]').click();
  await expect(page.locator('#source-preview')).toHaveCount(1);
  await expect(page.locator('#subjectEn')).toHaveValue('Mochi in the tent');
  await expect(page.locator('#provider')).toHaveValue('veo');
  await expect(page.locator('input[data-motion="environmentalMotions"][value="rain"]')).not.toBeChecked();
  await expect(page.locator('input[data-motion="subjectMotions"][value="breathing"]')).not.toBeChecked();
  await page.locator('[data-action="undo"]').click();
  await expect(page.locator('input[data-motion="environmentalMotions"][value="rain"]')).toBeChecked();
  await expect(page.locator('input[data-motion="subjectMotions"][value="breathing"]')).toBeChecked();
  await expect(page.locator('#source-preview')).toHaveCount(1);
});

test('editing a selected preset deselects it; Undo recovers selectable preset and previous intent', async ({ page }) => {
  await preset(page,'nature-breeze').click();
  await expect(preset(page,'nature-breeze')).toHaveAttribute('aria-pressed','true');
  await motion(page,'steam').click();
  await expect(preset(page,'nature-breeze')).toHaveAttribute('aria-pressed','false');
  await page.locator('[data-action="undo"]').click();
  await expect(preset(page,'nature-breeze')).toHaveAttribute('aria-pressed','true');
  await preset(page,'nature-breeze').click();
  await expect(page.locator('input[data-motion="environmentalMotions"][value="rain"]')).toBeChecked();
});

test('image removal and reload discard Undo entries; presets and controls remain usable', async ({ page }) => {
  await page.locator('#image-file').setInputFiles(repoImage);
  await preset(page,'nature-breeze').click();
  await page.locator('[data-action="remove-image"]').click();
  await expect(page.locator('[data-action="undo"]')).toBeDisabled();
  await expect(page.locator('#source-preview')).toHaveCount(0);
  await page.locator('[data-action="clear-environment-motions"]').click();
  await page.locator('[data-action="undo"]').click();
  await expect(page.locator('#source-preview')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('[data-action="undo"]')).toBeDisabled();
});

test('mobile interface exposes the same undo and clear actions', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('[data-action="clear-environment-motions"]')).toBeVisible();
  await preset(page,'nature-breeze').click();
  await expect(page.locator('[data-action="undo"]')).toBeEnabled();
  await page.locator('[data-action="undo"]').click();
  await expect(page.locator('input[data-motion="environmentalMotions"][value="rain"]')).toBeChecked();
});
