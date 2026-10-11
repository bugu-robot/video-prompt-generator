import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { EXPORT_SCHEMA } from '../../src/storage/schema';
import { importConfiguration, createExport } from '../../src/storage/export';
import { defaultPlan } from '../../src/engine/motion-planner';
import { auditPlan } from '../../src/engine/quality-check';
it('published JSON Schema matches the versioned runtime contract', () => {
  expect(
    JSON.parse(readFileSync('docs/motion-plan-export.schema.json', 'utf8')),
  ).toEqual(EXPORT_SCHEMA);
});
it('published stable example validates and recompiles byte-for-byte', () => {
  const raw = readFileSync('docs/motion-plan-export.example.json', 'utf8'),
    data = JSON.parse(raw) as { exportTimestamp: string };
  const plan = importConfiguration(raw);
  expect(createExport(plan, data.exportTimestamp)).toEqual(JSON.parse(raw));
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
