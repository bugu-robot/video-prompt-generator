import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PROVIDERS } from '../../src/models/motion-plan';
import { MOTION_BY_ID, MOTIONS } from '../../src/data/motions';
import { BUILT_IN_PRESETS, applyPreset } from '../../src/data/motion-presets';
import { defaultPlan, switchProvider } from '../../src/engine/motion-planner';
import { compilePrompt, compareProviders } from '../../src/engine/compile';
import { generateVariations } from '../../src/engine/variations';
import { motionSignature, restorePresetPlan } from '../../src/engine/preset-state';
import { invalidateSourceConfirmation } from '../../src/engine/source-confirmation';
import { cameraNotesConflict } from '../../src/engine/camera-notes';
import { UpdateNotice } from '../../src/pwa/update-notice';
import { importConfiguration, reviewConfigurationImport, type IntegrationExport } from '../../src/storage/export';

const groups = [
  { id: 'blink only', subject: ['blink'], environment: [], continuous: false, discrete: true },
  { id: 'breathing only', subject: ['breathing'], environment: [], continuous: true, discrete: false },
  { id: 'steam only', subject: [], environment: ['steam'], continuous: true, discrete: false },
  { id: 'leaves only', subject: [], environment: ['leaves'], continuous: false, discrete: true },
  { id: 'blink and steam', subject: ['blink'], environment: ['steam'], continuous: true, discrete: true },
  { id: 'none', subject: [], environment: [], continuous: false, discrete: false },
];
describe.each(PROVIDERS)('%s selected-motion pacing', (provider) => {
  for (const length of ['concise', 'balanced', 'detailed'] as const)
    for (const motionTiming of ['sparse', 'natural', 'sustained'] as const)
      it.each(groups)(`${length}/${motionTiming}/$id does not invent motion`, (g) => {
        const p = switchProvider(defaultPlan(), provider);
        Object.assign(p, { length, motionTiming, subjectMotions: g.subject, environmentalMotions: g.environment });
        p.source.subjectType = 'cat';
        p.source.elementsConfirmed = true;
        p.primaryMotion = [...g.subject, ...g.environment][0] ?? null;
        for (const v of generateVariations(p)) {
          if (!g.continuous) expect(v.changesZh.join('')).not.toContain('連續動作');
          if (!g.discrete) expect(v.changesZh.join('')).not.toContain('短動作');
        }
        for (const out of [compilePrompt(p), ...generateVariations(p).map(v => v.output)]) {
          expect(out.plan.subjectMotions).toEqual(g.subject);
          expect(out.plan.environmentalMotions).toEqual(g.environment);
          for (const id of [...g.subject, ...g.environment]) expect(out.english).toContain(MOTION_BY_ID.get(id)!.en);
          const pacing = out.sections.find(s => s.id === 'pacing');
          expect(Boolean(pacing)).toBe(g.continuous || g.discrete);
          expect(pacing?.en ?? '').not.toMatch(/environment|character gestures/i);
          expect((pacing?.en ?? '').includes('continuous')).toBe(g.continuous);
          expect((pacing?.en ?? '').includes('brief actions')).toBe(g.discrete);
          if (!g.discrete) expect(out.sections.find(s => s.id === 'continuity')?.en ?? '').not.toContain('poses');
          if (!g.continuous) expect(out.sections.find(s => s.id === 'continuity')?.en ?? '').not.toContain('continuous motion');
          expect(out.findings.filter(f => f.severity === 'error')).toEqual([]);
        }
      });
  it('all catalog actions retain their instruction and classify their own timing', () => {
    for (const m of MOTIONS) {
      const p = switchProvider(defaultPlan(), provider);
      p.source.subjectType = 'cat'; p.source.elementsConfirmed = true;
      p.subjectMotions = m.kind === 'subject' ? [m.id] : [];
      p.environmentalMotions = m.kind === 'environment' ? [m.id] : [];
      p.primaryMotion = m.id;
      for (const v of generateVariations(p)) {
        expect(v.output.english).toContain(m.en);
        const pacing = v.output.sections.find(s => s.id === 'pacing')!.en;
        expect(pacing.includes('continuous motion')).toBe(m.timing === 'continuous');
        expect(pacing.includes('brief actions')).toBe(m.timing === 'discrete');
      }
    }
  });
  it('rotation never reactivates dormant pacing', () => {
    const p = switchProvider(defaultPlan(), provider);
    p.mode = 'rotation'; p.source.subjectType = 'product'; p.length = 'detailed';
    p.subjectMotions = ['sleep', 'breathing'];
    for (const out of [compilePrompt(p), ...generateVariations(p).map(v => v.output)]) {
      expect(out.sections.some(s => s.id === 'pacing')).toBe(false);
      expect(out.english).not.toMatch(/brief actions|continuous motion|breathing|sleep/);
      expect(out.english).toContain('360 degrees');
      expect(out.plan.subjectMotions).toEqual(['sleep', 'breathing']);
    }
  });
});

const compatibleNotes = [
  'Keep the camera locked. No pan, no dolly, no push-in.',
  'No pan or dolly. No orbit or pull-out.',
  'Do not pan the camera. Avoid dolly movement.',
  'Keep a static shot without camera orbit.',
  "Don't push-in or pull-out. Never pan.",
  'The scene contains a frying pan.',
  'Keep the camera locked with a pan on the counter.',
];
const incompatibleNotes = [
  'Pan the camera slowly.', 'Use a slow dolly.', 'Orbit around the subject.',
  'Slow camera push-in.', 'Pull-out slowly.',
  'No pan, but orbit the camera.', 'Avoid camera cuts and use a dolly.',
];
describe.each(PROVIDERS)('%s camera notes and all copy gates', (provider) => {
  it.each(compatibleNotes)('allows compatible notes: %s', (notes) => {
    const p = switchProvider(defaultPlan(), provider); p.source.sceneNotesEn = notes;
    for (const out of [compilePrompt(p), ...generateVariations(p).map(v => v.output), ...Object.values(compareProviders(p))])
      expect(out.findings.some(f => f.id === 'notes-camera-conflict')).toBe(false);
  });
  it.each(incompatibleNotes)('blocks affirmative incompatible notes: %s', (notes) => {
    const p = switchProvider(defaultPlan(), provider); p.source.sceneNotesEn = notes;
    for (const out of [compilePrompt(p), ...generateVariations(p).map(v => v.output), ...Object.values(compareProviders(p))])
      expect(out.findings).toContainEqual(expect.objectContaining({id: 'notes-camera-conflict', severity: 'error'}));
  });
});
it.each(['locked camera', 'static shot', 'keep the camera locked'])('moving camera still rejects affirmative %s', notes => {
  expect(cameraNotesConflict(notes, 'pan')).toBe(true);
  expect(cameraNotesConflict('No ' + notes, 'pan')).toBe(false);
});

describe('motion preset cancellation', () => {
  const preset = BUILT_IN_PRESETS.find(p => p.id === 'nature-breeze')!;
  it.each(['concise', 'balanced', 'detailed'] as const)('preserves later provider, source and %s density', length => {
    const before = defaultPlan(); before.source.subjectEn = 'the hedgehog';
    const applied = applyPreset(before, preset);
    const current = switchProvider(applied, 'veo');
    current.source.subjectEn = 'the black cat'; current.source.sceneNotesEn = 'Existing fireplace';
    current.source.region = {x: 0.1, y: 0.2, width: 0.3, height: 0.4};
    current.source.elementsConfirmed = true; current.length = length;
    const raw = JSON.stringify({before, applied, current});
    const restored = restorePresetPlan(current, before, preset.plan);
    expect(restored.provider).toBe('veo'); expect(restored.model).toBe(current.model);
    expect(restored.source).toEqual(current.source); expect(restored.source).not.toBe(current.source);
    expect(restored.length).toBe(length);
    expect(motionSignature(restored)).toBe(motionSignature(before));
    expect(invalidateSourceConfirmation(current, restored).source.elementsConfirmed).toBe(false);
    expect(JSON.stringify({before, applied, current})).toBe(raw);
  });
  it('restores pre-apply density if the user did not subsequently change it', () => {
    const before = defaultPlan(); before.length = 'concise';
    const applied = applyPreset(before, preset);
    expect(restorePresetPlan(applied, before, preset.plan).length).toBe('concise');
  });
});

describe('session-only waiting update presentation', () => {
  it('dismisses repeated offers of the same worker until explicitly reopened', () => {
    const notice = new UpdateNotice(), worker = {};
    notice.offer(worker); expect(notice.visible).toBe(true);
    notice.dismiss(); expect(notice.visible).toBe(false);
    for (let n = 0; n < 5; n++) { notice.offer(worker); expect(notice.visible).toBe(false); }
    notice.show(); expect(notice.visible).toBe(true);
  });
  it('a genuinely different waiting worker is offered, not globally suppressed', () => {
    const notice = new UpdateNotice(); notice.offer({}); notice.dismiss();
    notice.offer({}); expect(notice.visible).toBe(true);
  });
  it('missing/stale waiting workers clear the notice and new sessions reset dismissal', () => {
    const notice = new UpdateNotice(), worker = {}; notice.offer(worker); notice.dismiss();
    notice.offer(null); notice.show(); expect(notice.visible).toBe(false);
    notice.offer(worker); expect(notice.visible).toBe(true);
    const next = new UpdateNotice(); next.offer(worker); expect(next.visible).toBe(true);
  });
});

it.each(['concise', 'balanced', 'detailed'] as const)('Veo %s references and single-image openings match the actual workflow', length => {
  const p = switchProvider(defaultPlan(), 'veo'); p.mode = 'rotation';
  p.source.subjectType = 'product'; p.durationSeconds = 8; p.length = length;
  p.rotation.inputMode = 'references';
  const out = compilePrompt(p);
  expect(out.english).not.toContain('starting frame');
  expect(out.sections.find(s => s.id === 'opening')!.en).toContain('references');
  expect(out.workflowZh.join(' ')).toContain('Flow Ingredients');
  expect(out.findings.filter(f => f.severity === 'error')).toEqual([]);
  expect(out.english).toContain('360 degrees');
  p.rotation.inputMode = 'single';
  expect(compilePrompt(p).sections.find(s => s.id === 'opening')!.en).toContain('starting frame');
});

const historical = JSON.parse(readFileSync('tests/fixtures/historical-exports-v1.1.json', 'utf8')) as {id: string; export: IntegrationExport}[];
const frozenFiles = JSON.parse(readFileSync('tests/fixtures/compiler-v1.1-sha256.json', 'utf8')) as {path: string; sha256: string}[];
it.each(frozenFiles)('released 1.1.0 verifier dependency $path stays byte-immutable', ({path, sha256}) => {
  expect(createHash('sha256').update(readFileSync('src/storage/legacy-v1.1/' + path)).digest('hex')).toBe(sha256);
});
it.each(historical)('frozen 1.1.0 $id remains verifiable with explicit lossless migration and tamper rejection', ({export: old}) => {
  const raw = JSON.stringify(old, null, 2), review = reviewConfigurationImport(raw);
  expect(review.original.compilerVersion).toBe('1.1.0');
  expect(review.recompiled.compilerVersion).toBe('1.3.0');
  expect(review.originalRaw).toBe(raw); expect(review.original.generatedEnglishPrompt).toBe(old.generatedEnglishPrompt);
  expect(review.recompiled.motionPlan).toEqual(old.motionPlan);
  expect(() => importConfiguration(raw)).toThrow('明確確認');
  expect(importConfiguration(raw, {acceptMigration: true})).toEqual(old.motionPlan);
  expect(() => reviewConfigurationImport(JSON.stringify({...old, generatedEnglishPrompt: old.generatedEnglishPrompt + ' Extra action.'}))).toThrow('generatedEnglishPrompt');
  expect(() => reviewConfigurationImport(JSON.stringify({...old, qcWarnings: []}))).toThrow('qcWarnings');
  expect(() => reviewConfigurationImport(JSON.stringify({...old, compilerVersion: '9.9.9'}))).toThrow();
  const relabeled = JSON.stringify({...old, compilerVersion: '1.3.0'});
  if (old.generatedEnglishPrompt !== review.recompiled.generatedEnglishPrompt ||
      JSON.stringify(old.qcWarnings) !== JSON.stringify(review.recompiled.qcWarnings))
    expect(() => reviewConfigurationImport(relabeled)).toThrow();
  else // Identical rigid-rotation output is a fully self-consistent new export, not signed provenance.
    expect(reviewConfigurationImport(relabeled).migrationRequired).toBe(false);
});
