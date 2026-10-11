import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { MOTIONS } from '../../src/data/motions';
import {
  PROVIDERS,
  PRESERVATIONS,
  type MotionPlan,
} from '../../src/models/motion-plan';
import { defaultPlan, switchProvider } from '../../src/engine/motion-planner';
import { invalidateSourceConfirmation } from '../../src/engine/source-confirmation';
import { compilePrompt, compareProviders } from '../../src/engine/compile';
import { generateVariations } from '../../src/engine/variations';
import { auditPlan } from '../../src/engine/quality-check';
import {
  createExport,
  importConfiguration,
  reviewConfigurationImport,
} from '../../src/storage/export';
import { compilePrompt as compileV1 } from '../../src/storage/legacy-v1/engine/compile';

const pairs = [
  ...new Set(
    MOTIONS.flatMap((m) =>
      (m.conflicts ?? []).map((other) => [m.id, other].sort().join('/')),
    ),
  ),
];
function activePair(
  pair: string,
  reversed: boolean,
  provider: MotionPlan['provider'],
  mode: 'ambient' | 'cinematic',
): MotionPlan {
  const p = switchProvider(defaultPlan(), provider);
  p.mode = mode;
  p.source.subjectType = 'cat';
  p.subjectMotions = pair.split('/');
  if (reversed) p.subjectMotions.reverse();
  p.primaryMotion = p.subjectMotions[0]!;
  p.environmentalMotions = [];
  return p;
}
describe.each(PROVIDERS)('%s undirected conflicts', (provider) => {
  for (const mode of ['ambient', 'cinematic'] as const)
    for (const pair of pairs)
      it.each([false, true])(
        `${mode} ${pair}, reversed=%s blocks all active copy plans exactly once`,
        (reversed) => {
          const p = activePair(pair, reversed, provider, mode);
          const outputs = [
            compilePrompt(p),
            ...generateVariations(p).map((v) => v.output),
            ...Object.values(compareProviders(p)),
          ];
          for (const out of outputs) {
            const conflicts = out.findings.filter((f) =>
              f.id.startsWith('motion-conflict'),
            );
            expect(conflicts).toHaveLength(1);
            expect(conflicts[0]?.severity).toBe('error');
            expect(conflicts[0]?.id).toBe(
              'motion-conflict-' + pair.replace('/', '-'),
            );
          }
          expect(auditPlan(p)).toEqual(
            auditPlan({
              ...p,
              subjectMotions: [...p.subjectMotions].reverse(),
            }),
          );
        },
      );
  it.each(['turntable', 'orbit'] as const)(
    '%s preserves dormant conflicts but never emits or blocks them',
    (type) => {
      const p = activePair('breathing/sleep', false, provider, 'ambient');
      p.mode = 'rotation';
      p.rotation.type = type;
      p.camera = type === 'orbit' ? 'orbit' : 'locked';
      p.source.subjectType = 'product';
      for (const out of [
        compilePrompt(p),
        ...generateVariations(p).map((v) => v.output),
        ...Object.values(compareProviders(p)),
      ]) {
        expect(out.findings.filter((f) => f.severity === 'error')).toEqual([]);
        expect(out.english).not.toMatch(/sleep|breath|blink/);
        expect(out.plan.subjectMotions).toEqual(p.subjectMotions);
      }
    },
  );
});

describe('provider composition and useful density', () => {
  it('uses different action expression and camera/temporal prioritization, beyond headings/openings', () => {
    const p = defaultPlan();
    p.source.subjectEn = 'Mochi';
    p.durationSeconds = 8;
    const { omni, veo, grok } = compareProviders(p);
    const ids = (o: typeof omni) => o.sections.map((s) => s.id);
    expect(ids(omni).indexOf('environment')).toBeLessThan(
      ids(omni).indexOf('camera'),
    );
    expect(ids(veo).indexOf('camera')).toBeLessThan(
      ids(veo).indexOf('environment'),
    );
    expect(ids(grok).indexOf('duration')).toBeLessThan(
      ids(grok).indexOf('pacing'),
    );
    expect(omni.sections.find((s) => s.id === 'subject')?.en).toContain(
      'let Mochi breathe',
    );
    expect(veo.sections.find((s) => s.id === 'subject')?.en).toContain(
      'Mochi should breathe',
    );
    expect(grok.sections.find((s) => s.id === 'subject')?.en).toContain(
      'Mochi: breathe',
    );
    const bodies = [omni, veo, grok].map((o) =>
      o.sections
        .filter((s) => s.id !== 'opening')
        .map((s) => s.en)
        .join(' '),
    );
    expect(new Set(bodies).size).toBe(3);
    for (const out of [omni, veo, grok])
      expect(out.plan).toEqual(switchProvider(p, out.plan.provider));
  });
  for (const provider of PROVIDERS)
    for (const mode of ['ambient', 'rotation', 'cinematic'] as const)
      it.each([false, true])(
        `${provider} ${mode}, confirmed=%s densities retain intent with materially shorter clauses`,
        (confirmed) => {
          const p = switchProvider(defaultPlan(), provider);
          p.mode = mode;
          p.source.subjectType = mode === 'rotation' ? 'product' : 'cat';
          p.source.subjectEn = mode === 'rotation' ? 'the marked cup' : 'Mochi';
          p.source.elementsConfirmed = confirmed;
          p.durationSeconds = 8;
          if (mode === 'cinematic') {
            p.camera = 'pan';
            p.loop = 'none';
          }
          const outputs = (['concise', 'balanced', 'detailed'] as const).map(
            (length) => compilePrompt({ ...p, length }),
          );
          const body = (out: (typeof outputs)[number]) =>
            out.sections
              .map((s) => s.en)
              .join(' ')
              .replace(/\s+/g, '');
          expect(body(outputs[0]!).length).toBeLessThan(
            body(outputs[1]!).length * 0.93,
          );
          expect(body(outputs[2]!).length).toBeGreaterThan(
            body(outputs[1]!).length * 1.1,
          );
          for (const out of outputs) {
            expect(out.plan).toEqual({ ...p, length: out.plan.length });
            expect(out.english).toContain('8 seconds');
            for (const section of out.sections) {
              expect(out.english).toContain(section.en);
              expect(out.chinese).toContain(section.zh);
            }
            const preserve = out.sections.find((s) => s.id === 'preservation')!;
            expect(preserve.en).toContain('identity');
            if (mode !== 'rotation') {
              for (const id of [...p.subjectMotions, ...p.environmentalMotions])
                expect(out.english).toContain(
                  MOTIONS.find((m) => m.id === id)!.en,
                );
              expect(out.english.includes('If ')).toBe(!confirmed);
              expect(out.sections.find((s) => s.id === 'camera')?.en).toContain(
                mode === 'cinematic' ? 'left to right' : 'camera locked',
              );
            } else {
              expect(out.english).toContain('360 degrees');
              expect(out.english).toContain('clockwise');
              expect(out.english).toContain('vertical Y-axis');
              expect(out.english).toContain('camera remains stationary');
              expect(out.english).not.toContain('move the camera');
              expect(out.english).toContain('geometry and proportions');
            }
            expect(new Set(out.sections.map((s) => s.id)).size).toBe(
              out.sections.length,
            );
          }
        },
      );
  for (const provider of PROVIDERS)
    it.each(MOTIONS.map((m) => m.id))(
      `${provider} concise retains selected action %s`,
      (id) => {
        const p = switchProvider(defaultPlan(), provider),
          m = MOTIONS.find((m) => m.id === id)!;
        p.subjectMotions = m.kind === 'subject' ? [id] : [];
        p.environmentalMotions = m.kind === 'environment' ? [id] : [];
        p.primaryMotion = id;
        p.length = 'concise';
        expect(compilePrompt(p).english).toContain(m.en);
      },
    );
  for (const provider of PROVIDERS)
    for (const type of ['turntable', 'orbit'] as const)
      it.each([90, 180, 360] as const)(
        `${provider} ${type} all densities keep angle %s and counterclockwise X geometry`,
        (angle) => {
          const p = switchProvider(defaultPlan(), provider);
          p.mode = 'rotation';
          p.source.subjectType = 'product';
          Object.assign(p.rotation, {
            type,
            angle,
            axis: 'x',
            direction: 'counterclockwise',
            returnToStart: angle === 360,
          });
          p.camera = type === 'orbit' ? 'orbit' : 'locked';
          for (const length of ['concise', 'balanced', 'detailed'] as const) {
            const out = compilePrompt({ ...p, length });
            expect(out.english).toContain(
              type === 'orbit' ? `${angle}-degree orbit` : `${angle} degrees`,
            );
            expect(out.english).toContain('counterclockwise');
            expect(out.english).toContain('horizontal X-axis');
            expect(out.english).toContain(
              type === 'orbit'
                ? 'stationary; move the camera'
                : 'camera remains stationary',
            );
            expect(out.english).toContain('identifying markings');
            if (angle !== 360)
              expect(out.english).not.toContain('Finish at the starting');
          }
        },
      );
});

describe('version-aware historical validation and explicit migration', () => {
  for (const provider of PROVIDERS)
    for (const mode of ['ambient', 'rotation', 'cinematic'] as const)
      it.each(['concise', 'balanced', 'detailed'] as const)(
        `${provider} historical ${mode} %s retains raw and plan; verifies old compiler then reaudits`,
        (length) => {
          const p = switchProvider(defaultPlan(), provider);
          p.mode = mode;
          p.length = length;
          p.source.subjectType = mode === 'rotation' ? 'product' : 'cat';
          const historical = compileV1(p);
          const v = {
            ...createExport(p, '2026-10-11T12:00:00.000Z'),
            compilerVersion: '1.0.0',
            generatedEnglishPrompt: historical.english,
            qcWarnings: historical.findings,
          };
          const raw = JSON.stringify(v, null, 2),
            review = reviewConfigurationImport(raw);
          expect(review.originalRaw).toBe(raw);
          expect(review.original).toEqual(v);
          expect(review.recompiled.motionPlan).toEqual(v.motionPlan);
          expect(review.recompiled.compilerVersion).toBe('1.1.0');
          expect(review.recompiled.generatedEnglishPrompt).not.toBe(
            v.generatedEnglishPrompt,
          );
          expect(() => importConfiguration(raw)).toThrow('明確確認');
          expect(importConfiguration(raw, { acceptMigration: true })).toEqual(
            v.motionPlan,
          );
        },
      );
  it('does not mistake the old asymmetric audit for current approval', () => {
    const p = activePair('breathing/sleep', false, 'omni', 'ambient'),
      old = compileV1(p);
    expect(old.findings.filter((f) => f.severity === 'error')).toEqual([]);
    const raw = JSON.stringify({
      ...createExport(p),
      compilerVersion: '1.0.0',
      generatedEnglishPrompt: old.english,
      qcWarnings: old.findings,
    });
    const review = reviewConfigurationImport(raw);
    expect(
      review.recompiled.qcWarnings.some(
        (f) => f.id === 'motion-conflict-breathing-sleep',
      ),
    ).toBe(true);
  });
  it.each([
    'generatedEnglishPrompt',
    'compilerVersion',
    'capabilitySnapshotDate',
    'schemaVersion',
    'qcWarnings',
    'loopSettings',
    'exportTimestamp',
  ] as const)(
    'historical %s tampering remains rejected, even when migration is confirmed',
    (key) => {
      const v = JSON.parse(
        readFileSync('docs/motion-plan-export.example.json', 'utf8'),
      ) as Record<string, unknown>;
      v[key] =
        key === 'qcWarnings'
          ? []
          : key === 'loopSettings'
            ? { strategy: 'none', returnToStart: false }
            : 'tampered';
      expect(() =>
        importConfiguration(JSON.stringify(v), { acceptMigration: true }),
      ).toThrow();
    },
  );
  it('current exports remain exact without opt-in migration and preserve key-order interoperability', () => {
    const v = createExport(defaultPlan());
    v.loopSettings = {
      returnToStart: v.loopSettings.returnToStart,
      strategy: v.loopSettings.strategy,
    };
    const review = reviewConfigurationImport(JSON.stringify(v));
    expect(review.migrationRequired).toBe(false);
    expect(review.original).toEqual(review.recompiled);
    expect(importConfiguration(JSON.stringify(v))).toEqual(v.motionPlan);
  });
});

describe('confirmation belongs to the semantic source selection', () => {
  const changes: [string, (p: MotionPlan) => void][] = [
    [
      'subject type',
      (p) => {
        p.source.subjectType = 'cat';
      },
    ],
    [
      'English subject',
      (p) => {
        p.source.subjectEn = 'Mochi';
      },
    ],
    [
      'Chinese subject',
      (p) => {
        p.source.subjectZh = '小刺蝟';
      },
    ],
    [
      'scene notes',
      (p) => {
        p.source.sceneNotesEn = 'A tree in the background.';
      },
    ],
    [
      'source image',
      (p) => {
        p.source.image = {
          name: 'new.png',
          mime: 'image/png',
          bytes: 100,
          width: 2,
          height: 2,
        };
      },
    ],
    [
      'region',
      (p) => {
        p.source.region = { x: 0, y: 0, width: 0.5, height: 0.5 };
      },
    ],
    [
      'added subject motion',
      (p) => {
        p.subjectMotions.push('blink');
      },
    ],
    [
      'removed subject motion',
      (p) => {
        p.subjectMotions = [];
      },
    ],
    [
      'added environment motion',
      (p) => {
        p.environmentalMotions.push('clouds');
      },
    ],
    [
      'removed environment motion',
      (p) => {
        p.environmentalMotions = [];
      },
    ],
  ];
  it.each(changes)('%s invalidates previous confirmation', (_, change) => {
    const before = defaultPlan();
    before.source.elementsConfirmed = true;
    const after = structuredClone(before);
    change(after);
    expect(
      invalidateSourceConfirmation(before, after).source.elementsConfirmed,
    ).toBe(false);
    expect(before.source.elementsConfirmed).toBe(true);
  });
  it.each([
    'provider',
    'density',
    'duration',
    'camera',
    'intensity',
    'loop',
    'audio',
    'preservation',
    'primary ordering',
  ] as const)('unrelated %s preserves confirmation', (key) => {
    const before = defaultPlan();
    before.source.elementsConfirmed = true;
    let after = structuredClone(before);
    if (key === 'provider') after = switchProvider(after, 'grok');
    if (key === 'density') after.length = 'detailed';
    if (key === 'duration') after.durationSeconds = 8;
    if (key === 'camera') after.camera = 'push-in';
    if (key === 'intensity') after.intensity = 'minimal';
    if (key === 'loop') after.loop = 'continuous';
    if (key === 'audio') after.audio = 'ambient';
    if (key === 'preservation') after.preservation = [PRESERVATIONS[0]!];
    if (key === 'primary ordering') {
      after.primaryMotion = 'rain';
      after.environmentalMotions.reverse();
    }
    expect(
      invalidateSourceConfirmation(before, after).source.elementsConfirmed,
    ).toBe(true);
  });
});
