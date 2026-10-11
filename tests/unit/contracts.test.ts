import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { EXPORT_SCHEMA } from '../../src/storage/schema';
import {
  importConfiguration,
  createExport,
  reviewConfigurationImport,
} from '../../src/storage/export';
import { defaultPlan } from '../../src/engine/motion-planner';
import { auditPlan } from '../../src/engine/quality-check';
it('published JSON Schema matches the versioned runtime contract', () => {
  expect(
    JSON.parse(readFileSync('docs/motion-plan-export.schema.json', 'utf8')),
  ).toEqual(EXPORT_SCHEMA);
});
it('published v1 example retains its exact historical prompt and migrates only explicitly', () => {
  const raw = readFileSync('docs/motion-plan-export.example.json', 'utf8'),
    data = JSON.parse(raw) as { exportTimestamp: string };
  const review = reviewConfigurationImport(raw);
  expect(review.original).toEqual(JSON.parse(raw));
  expect(review.originalRaw).toBe(raw);
  expect(review.migrationRequired).toBe(true);
  expect(() => importConfiguration(raw)).toThrow('明確確認');
  const plan = importConfiguration(raw, { acceptMigration: true });
  expect(createExport(plan, data.exportTimestamp)).toEqual(review.recompiled);
  expect(review.recompiled.motionPlan).toEqual(review.original.motionPlan);
});
it('published current example validates with exact current provenance', () => {
  const raw = readFileSync('docs/motion-plan-export.current.example.json', 'utf8');
  const review = reviewConfigurationImport(raw);
  expect(review.migrationRequired).toBe(false);
  expect(review.original).toEqual(review.recompiled);
  expect(importConfiguration(raw)).toEqual(review.original.motionPlan);
});
const historicalFixtures = JSON.parse(readFileSync('tests/fixtures/historical-exports-v1.json', 'utf8')) as { id: string; export: unknown }[];
it.each(historicalFixtures)('immutable historical fixture $id validates unchanged', (fixture) => {
  const raw = JSON.stringify(fixture.export);
  const review = reviewConfigurationImport(raw);
  expect(review.original).toEqual(fixture.export);
  expect(review.originalRaw).toBe(raw);
  expect(review.original.compilerVersion).toBe('1.0.0');
  expect(review.recompiled.motionPlan).toEqual(review.original.motionPlan);
});
it('inanimate selection cannot silently animate a breathing product', () => {
  const p = defaultPlan();
  p.source.subjectType = 'coffee-cup';
  expect(
    auditPlan(p).some(
      (f) => f.id === 'inanimate-subject' && f.severity === 'error',
    ),
  ).toBe(true);
});
it('export timestamp must be a canonical real ISO date', () => {
  const data = createExport(defaultPlan(), '2026-02-30T09:00:00.000Z');
  expect(() => importConfiguration(JSON.stringify(data))).toThrow();
});
