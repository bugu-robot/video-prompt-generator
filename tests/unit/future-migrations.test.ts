import { expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
// Simulate a later legitimate capability snapshot without editing or weakening
// historical validation. The old compiler's own dated registry is immutable.
vi.mock('../../src/models/provider-capabilities', async (original) => ({
  ...(await original<
    typeof import('../../src/models/provider-capabilities')
  >()),
  VERIFIED_AT: '2026-10-12',
}));
import {
  createExport,
  importConfiguration,
  reviewConfigurationImport,
} from '../../src/storage/export';
const raw = readFileSync('docs/motion-plan-export.example.json', 'utf8');
it('a legitimate future capability update verifies the old snapshot and explicitly recompiles against the new one', () => {
  const review = reviewConfigurationImport(raw);
  expect(review.original.capabilitySnapshotDate).toBe('2026-10-11');
  expect(review.recompiled.capabilitySnapshotDate).toBe('2026-10-12');
  expect(review.originalRaw).toBe(raw);
  expect(review.recompiled.motionPlan).toEqual(review.original.motionPlan);
  expect(() => importConfiguration(raw)).toThrow('明確確認');
  const p = importConfiguration(raw, { acceptMigration: true });
  expect(createExport(p).capabilitySnapshotDate).toBe('2026-10-12');
});
it('known versions in an unregistered compiler/snapshot combination are rejected', () => {
  const v = JSON.parse(raw) as Record<string, unknown>;
  v.capabilitySnapshotDate = '2026-10-12';
  expect(() =>
    importConfiguration(JSON.stringify(v), { acceptMigration: true }),
  ).toThrow('版本組合');
});
it('changing old prompt or old warnings is rejected despite later capability changes', () => {
  const v = JSON.parse(raw) as Record<string, unknown>;
  v.generatedEnglishPrompt += ' Extra motion.';
  expect(() =>
    importConfiguration(JSON.stringify(v), { acceptMigration: true }),
  ).toThrow('generatedEnglishPrompt');
  v.generatedEnglishPrompt = (
    JSON.parse(raw) as Record<string, unknown>
  ).generatedEnglishPrompt;
  v.qcWarnings = [];
  expect(() =>
    importConfiguration(JSON.stringify(v), { acceptMigration: true }),
  ).toThrow('qcWarnings');
});
