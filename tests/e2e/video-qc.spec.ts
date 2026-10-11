import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
test('actual local video metadata, endpoint samples and incomplete checklist export are honest', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .locator('#video-file')
    .setInputFiles(resolve('tests/fixtures/qc.mp4'));
  await expect(page.locator('.video-panel .metadata')).toContainText(
    '320 × 180',
  );
  await expect(page.getByAltText('首幀樣本')).toBeVisible();
  await expect(page.getByAltText('接近片尾的樣本')).toBeVisible();
  await expect(page.locator('.metric')).toContainText('RGB 平均絕對差異');
  await expect(page.locator('.video-panel')).toContainText('不能確認循環');
  await page.locator('#qc-identity').selectOption('pass');
  const dp = page.waitForEvent('download');
  await page
    .getByRole('button', { name: '匯出 QC JSON 報告', exact: true })
    .click();
  const data = JSON.parse(
    await readFile((await (await dp).path())!, 'utf8'),
  ) as {
    durationSeconds: number;
    firstFrame?: string;
    checkStatus: { status: string }[];
  };
  expect(data.durationSeconds).toBeCloseTo(2, 1);
  expect(data.firstFrame).toBeUndefined();
  expect(data.checkStatus.filter((c) => c.status === 'pending')).toHaveLength(
    6,
  );
  await page
    .getByRole('button', { name: '清除影片與 QC', exact: true })
    .click();
  await expect(page.locator('.video-panel video')).toHaveCount(0);
});
test('broken or unsupported video is reported instead of fabricated QC', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .locator('#video-file')
    .setInputFiles({
      name: 'bad.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('this is not a video'),
    });
  await expect(page.locator('#toast')).toContainText('無法解碼');
  await expect(page.getByAltText('首幀樣本')).toHaveCount(0);
  await page
    .locator('#video-file')
    .setInputFiles({
      name: 'bad.avi',
      mimeType: 'video/x-msvideo',
      buffer: Buffer.from('not supported'),
    });
  await expect(page.locator('#toast')).toContainText('MP4');
});
