import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PROVIDERS } from '../../src/models/motion-plan';
import { defaultPlan, switchProvider } from '../../src/engine/motion-planner';
import { compilePrompt, compareProviders } from '../../src/engine/compile';
import { generateVariations } from '../../src/engine/variations';
import { cameraNotesConflict } from '../../src/engine/camera-notes';
import { motionSignature, presetSignature, restorePresetPlan } from '../../src/engine/preset-state';
import { BUILT_IN_PRESETS, applyPreset } from '../../src/data/motion-presets';
import { MOTION_BY_ID } from '../../src/data/motions';
import { createExport, reviewConfigurationImport, importConfiguration, type IntegrationExport } from '../../src/storage/export';

describe.each(PROVIDERS)('%s calm water surface', provider => {
  for (const length of ['concise','balanced','detailed'] as const)
    for (const confirmed of [false,true])
      it(`${length}/confirmed=${confirmed} retains breeze motion and explicit impact exclusions in base and ABC`, () => {
        const p = switchProvider(defaultPlan(), provider);
        Object.assign(p, {length, subjectMotions: [], environmentalMotions: ['ripples'], primaryMotion: 'ripples', loop: 'continuous'});
        p.source.elementsConfirmed = confirmed;
        for (const out of [compilePrompt(p), ...generateVariations(p).map(v => v.output)]) {
          const en = out.sections.find(s => s.id === 'environment')!.en;
          expect(en).toContain('gentle breeze');
          expect(en).toContain('soft continuous undulation');
          expect(en).toContain('subtle horizontal ripples');
          expect(en).toContain('natural shimmering');
          expect(en).toContain('calm, low-amplitude and loop-friendly');
          expect(en).toContain('without falling droplets, rain impacts, splashes, expanding circular or point-source ripples, or objects striking the water');
          const affirmative = en.split(';')[0]!;
          expect(affirmative).not.toMatch(/droplets|rain|splash|circular|point-source|striking|small ripples travel/);
          expect(out.chinese).toContain('微風輕拂原有水面');
          expect(out.chinese).toContain('不出現落下的水滴');
          expect(en.includes('If a water surface')).toBe(!confirmed);
          expect(out.plan.environmentalMotions).toEqual(['ripples']);
          expect(compilePrompt(out.plan)).toEqual(out);
          expect(out.findings.filter(f => f.severity === 'error')).toEqual([]);
        }
      });
  it('unselected and dormant water never introduce water constraints', () => {
    const p = switchProvider(defaultPlan(), provider);
    expect(compilePrompt(p).english).not.toContain('point-source');
    p.environmentalMotions = ['ripples']; p.primaryMotion = 'ripples'; p.mode = 'rotation'; p.source.subjectType = 'product';
    expect(compilePrompt(p).english).not.toContain('gentle breeze');
  });
});
it('water ID stays compatible with custom presets/exports and ocean presets keep distinct waves', () => {
  expect(MOTION_BY_ID.get('ripples')!.nameZh).toBe('微風吹拂水面');
  const p = defaultPlan(); p.environmentalMotions = ['ripples']; p.primaryMotion = 'ripples';
  const preset = {...BUILT_IN_PRESETS[0]!, id: 'custom-water', category: 'custom' as const, plan: p};
  expect(compilePrompt(applyPreset(defaultPlan(), preset)).english).toContain('gentle breeze');
  expect(importConfiguration(JSON.stringify(createExport(p)))).toEqual(p);
  // No released built-in selects ripples. Ocean waves are a distinct action.
  expect(BUILT_IN_PRESETS.filter(x => x.plan.environmentalMotions.includes('ripples'))).toEqual([]);
  const ocean = BUILT_IN_PRESETS.find(x => x.id === 'nature-ocean')!;
  expect(ocean.plan.environmentalMotions).toEqual(['waves']);
});
const moving = [
  'Tilt upward.', 'Slowly tilt the camera down.', 'Camera is tilting upward.',
  'Add subtle parallax.', 'Parallax movement.', 'Zoom in slowly.', 'Zoom-out gently.',
  'Use a slow zoom in.', 'The camera slowly zooms out.', 'Roll the camera.',
  'Truck left.', 'Track the subject.', 'Use a handheld shot.', 'Crane upward.',
  'Pedestal up.', 'Slide the camera sideways.', 'Move the camera to the left.',
  'No tilt, but zoom in.', 'Avoid parallax and use a zoom out.',
  'No pan, use a slow tilt.', 'Not only zoom in but pan left.',
];
const stationary = [
  'Do not pan', 'Avoid zoom', 'No parallax', 'Do not tilt the camera.',
  'No tilt, parallax or zoom in.', 'Avoid pan, tilt, zoom and dolly.',
  'Never zoom in or out.', "Don't tilt or use parallax.", 'Without camera movement.',
  'The cat tilts its head.', 'Gently tilt the head.', 'Keep the camera locked; the cat tilts its head.',
  'A zoom lens is on the table.', 'Use a zoom lens.', 'The truck is parked beside the track.',
  'Keep the camera locked with a frying pan on the counter.', 'The dolly toy is beside a pan.',
  'Use a crane to lift a chair.', 'Use a dolly to carry boxes.', 'Roll a ball.', 'Tilt the lantern.',
  'Move the cat to the left.', 'Shimmering water creates depth without parallax.',
];
it.each(moving)('detects locked-camera conflict: %s', notes => {
  expect(cameraNotesConflict(notes, 'locked')).toBe(true);
  const p = defaultPlan(); p.source.sceneNotesEn = notes;
  for (const out of [compilePrompt(p), ...generateVariations(p).map(v => v.output), ...Object.values(compareProviders(p))])
    expect(out.findings).toContainEqual(expect.objectContaining({id: 'notes-camera-conflict', severity:'error'}));
});
it.each(stationary)('allows negation/objects: %s', notes => {
  expect(cameraNotesConflict(notes, 'locked')).toBe(false);
});
it.each(['No locked camera.', 'Avoid a static shot.', 'Do not keep the camera fixed.'])('negated fixed camera remains compatible with camera movement: %s', notes => {
  expect(cameraNotesConflict(notes, 'tilt')).toBe(false);
});

describe('peripheral edits preserve cancellable preset state', () => {
  const preset = BUILT_IN_PRESETS.find(x => x.id === 'nature-breeze')!;
  it('audio/duration/preservation/density do not change motion signature but remain dirty for custom update', () => {
    const applied = applyPreset(defaultPlan(), preset), current = structuredClone(applied);
    current.audio = 'ambient'; current.durationSeconds = 8; current.preservation = []; current.length = 'concise';
    expect(motionSignature(current)).toBe(motionSignature(applied));
    expect(presetSignature(current)).not.toBe(presetSignature(applied));
    current.environmentalMotions.push('steam');
    expect(motionSignature(current)).not.toBe(motionSignature(applied));
  });
  it('cancellation restores original motion while preserving interleaved independent edits without mutation', () => {
    const before = defaultPlan(); before.audio = 'provider-default'; before.durationSeconds = 6; before.length = 'detailed';
    const applied = applyPreset(before, preset), current = switchProvider(applied, 'veo');
    current.audio = 'ambient'; current.durationSeconds = 8; current.length = 'concise'; current.preservation = [];
    current.source.subjectEn = 'black cat';
    const raw = JSON.stringify({before,applied,current});
    const restored = restorePresetPlan(current,before,applied);
    expect(motionSignature(restored)).toBe(motionSignature(before));
    expect(restored.audio).toBe('ambient'); expect(restored.durationSeconds).toBe(8);
    expect(restored.length).toBe('concise'); expect(restored.preservation).toEqual([]);
    expect(restored.source).toEqual(current.source); expect(restored.provider).toBe('veo');
    expect(JSON.stringify({before,applied,current})).toBe(raw);
  });
  it('untouched peripheral settings return to pre-apply values', () => {
    const before = defaultPlan(); before.audio = 'ambient'; before.durationSeconds = 6; before.length = 'detailed'; before.preservation = [];
    const applied = applyPreset(before,preset);
    expect(restorePresetPlan(applied,before,applied)).toEqual({...before, source: applied.source});
  });
});
const files = JSON.parse(readFileSync('tests/fixtures/compiler-v1.2-sha256.json','utf8')) as {path:string; sha256:string}[];
it.each(files)('released 1.2.0 dependency $path remains byte-immutable', ({path,sha256}) => {
  expect(createHash('sha256').update(readFileSync('src/storage/legacy-v1.2/'+path)).digest('hex')).toBe(sha256);
});
const historical = JSON.parse(readFileSync('tests/fixtures/historical-exports-v1.2.json','utf8')) as {id:string; export:IntegrationExport}[];
it.each(historical)('released 1.2.0 $id preserves original bytes and requires explicit lossless migration', ({export:old}) => {
  const raw = JSON.stringify(old,null,2), review = reviewConfigurationImport(raw);
  expect(review.originalRaw).toBe(raw); expect(review.original).toEqual(old);
  expect(review.recompiled.compilerVersion).toBe('1.3.0'); expect(review.migrationRequired).toBe(true);
  expect(review.recompiled.motionPlan).toEqual(old.motionPlan);
  expect(() => importConfiguration(raw)).toThrow('明確確認');
  expect(importConfiguration(raw,{acceptMigration:true})).toEqual(old.motionPlan);
  expect(() => reviewConfigurationImport(JSON.stringify({...old,generatedEnglishPrompt:old.generatedEnglishPrompt+' Extra action.'}))).toThrow();
  expect(() => reviewConfigurationImport(JSON.stringify({...old,qcWarnings:[]}))).toThrow();
});
