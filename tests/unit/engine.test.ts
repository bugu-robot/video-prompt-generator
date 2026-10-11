import { describe, expect, it } from 'vitest';
import {
  defaultPlan,
  normalizePlan,
  switchProvider,
} from '../../src/engine/motion-planner';
import { compilePrompt, compareProviders } from '../../src/engine/compile';
import { generateVariations } from '../../src/engine/variations';
import { auditPlan } from '../../src/engine/quality-check';
import {
  CAMERAS,
  PRESERVATIONS,
  PROVIDERS,
} from '../../src/models/motion-plan';
import { MOTIONS } from '../../src/data/motions';
import { BUILT_IN_PRESETS, applyPreset } from '../../src/data/motion-presets';
import { PROVIDER_CAPABILITIES } from '../../src/models/provider-capabilities';
import type { MotionPlan } from '../../src/models/motion-plan';
function rotation(): MotionPlan {
  const p = defaultPlan();
  p.mode = 'rotation';
  p.source.subjectType = 'product';
  p.subjectMotions = [];
  p.environmentalMotions = [];
  p.primaryMotion = null;
  return p;
}
const has = (p: MotionPlan, id: string) =>
  auditPlan(p).some((f) => f.id === id);

describe('normalization and source intent', () => {
  it('returns independent default objects', () => {
    const a = defaultPlan(),
      b = defaultPlan();
    a.preservation.pop();
    expect(b.preservation).toHaveLength(9);
    expect(b.mode).toBe('ambient');
  });
  it('deduplicates valid motions and removes unknown IDs', () => {
    expect(
      normalizePlan({
        subjectMotions: ['blink', 'blink', 'bogus'],
        environmentalMotions: ['rain', {}, 'rain'],
      }),
    ).toMatchObject({
      subjectMotions: ['blink'],
      environmentalMotions: ['rain'],
    });
  });
  it('bounds duration and region, filters unrecognized enum types', () => {
    const p = normalizePlan({
      intensity: ['moderate'],
      durationSeconds: 999,
      source: { region: { x: 3, y: -2, width: 5, height: 7 } },
    });
    expect(p.intensity).toBe('subtle');
    expect(p.durationSeconds).toBe(60);
    expect(p.source.region).toEqual({
      x: 0.99,
      y: 0,
      width: 1 - 0.99,
      height: 1,
    });
  });
  it('rejects nonfinite metadata and mismatched model families', () => {
    expect(
      normalizePlan({
        provider: 'grok',
        model: 'veo-3.1-fast',
        source: {
          image: { width: NaN, height: 1, bytes: 1, mime: 'image/png' },
        },
      }),
    ).toMatchObject({
      model: 'grok-consumer-current',
      source: { image: null },
    });
  });
  it('retains intent during provider switching', () => {
    const p = defaultPlan();
    p.source.subjectType = 'cat';
    p.camera = 'pan';
    p.durationSeconds = 10;
    const switched = switchProvider(p, 'veo');
    expect({ ...switched, provider: p.provider, model: p.model }).toEqual(p);
    expect(has(switched, 'duration-unsupported')).toBe(true);
  });
  it('source notes stay user supplied without automatic translation', () => {
    const p = defaultPlan();
    p.source.sceneNotesEn = 'A hedgehog sits beside the window.';
    const out = compilePrompt(p);
    expect(out.english).toContain(p.source.sceneNotesEn);
    expect(out.chinese).toContain('未提供中文補充');
  });
  it('region becomes semantic location, not provider mask coordinates', () => {
    const p = defaultPlan();
    p.source.region = { x: 0, y: 0, width: 0.1, height: 0.1 };
    const out = compilePrompt(p);
    expect(out.english).toContain('upper-left');
    expect(out.chinese).toContain('不是供應商遮罩');
  });
});

describe.each(PROVIDERS)('%s compiler', (provider) => {
  it('is reproducible, local and bilingual from the same sections', () => {
    const p = switchProvider(defaultPlan(), provider),
      out = compilePrompt(p);
    expect(compilePrompt(p)).toEqual(out);
    expect(out.plan).toEqual(p);
    for (const s of out.sections) {
      expect(out.english).toContain(s.en);
      expect(out.chinese).toContain(s.zh);
      expect(s.en).not.toBe('');
      expect(s.zh).not.toBe('');
    }
  });
  it('includes primary motion priority with source conditions', () => {
    const p = switchProvider(defaultPlan(), provider),
      out = compilePrompt(p);
    expect(out.english).toContain(
      'Primary motion: If a steaming drink is already visible',
    );
    expect(out.english).toContain('camera locked');
  });
  it('does not add music by default or promise silent output', () => {
    const out = compilePrompt(switchProvider(defaultPlan(), provider));
    expect(out.english).toContain('no audio is requested');
    expect(out.english).not.toMatch(/silent video|jazz music|background music/);
    expect(out.findings.some((f) => f.id === 'audio-removal')).toBe(true);
  });
  it('has no duplicated section IDs or contradictory camera behavior', () => {
    const p = switchProvider(rotation(), provider),
      out = compilePrompt(p);
    expect(new Set(out.sections.map((s) => s.id)).size).toBe(
      out.sections.length,
    );
    expect(out.english).toContain('camera remains stationary');
    expect(out.english).not.toContain('move the camera');
  });
});

it('providers expose meaningful prompt formatting differences, preserving shared intent', () => {
  const p = defaultPlan(),
    outs = compareProviders(p);
  expect(new Set(Object.values(outs).map((o) => o.english)).size).toBe(3);
  expect(outs.veo.english).toContain('Camera:');
  expect(outs.omni.english).not.toContain('Camera:');
  for (const out of Object.values(outs))
    expect(out.plan.subjectMotions).toEqual(p.subjectMotions);
});
it('comparison retains a selected Veo quality model rather than changing it silently', () => {
  const p = switchProvider(rotation(), 'veo');
  p.model = 'veo-3.1-quality';
  expect(compareProviders(p).veo.plan.model).toBe(p.model);
});

it.each(MOTIONS.map((m) => [m.id, m] as const))(
  'motion %s has observable English and Chinese action',
  (_id, m) => {
    const p = defaultPlan();
    p.subjectMotions = m.kind === 'subject' ? [m.id] : [];
    p.environmentalMotions = m.kind === 'environment' ? [m.id] : [];
    p.primaryMotion = m.id;
    const out = compilePrompt(p);
    expect(out.english).toContain(m.en);
    expect(out.chinese).toContain(m.zh);
    expect(out.english).toContain(m.elementEn);
    p.source.elementsConfirmed = true;
    expect(compilePrompt(p).english).not.toContain('If ' + m.elementEn);
  },
);
it.each(CAMERAS)('camera %s affects actual motion intent', (camera) => {
  const p = defaultPlan();
  p.mode = 'cinematic';
  p.loop = 'none';
  p.camera = camera;
  const out = compilePrompt(p);
  expect(out.sections.find((s) => s.id === 'camera')).toBeDefined();
  if (camera !== 'locked') expect(out.english).not.toContain('static tripod');
  expect(out.english).not.toBe(
    compilePrompt({ ...p, camera: camera === 'locked' ? 'pan' : 'locked' })
      .english,
  );
});
it.each(PRESERVATIONS)(
  'preservation %s changes the applicable prompt',
  (id) => {
    const p = defaultPlan();
    p.source.subjectType = 'cat';
    const en = compilePrompt(p).english;
    p.preservation = p.preservation.filter((v) => v !== id);
    expect(compilePrompt(p).english).not.toBe(en);
  },
);
it.each(['minimal', 'subtle', 'moderate'] as const)(
  'intensity %s is qualitative and meaningful',
  (intensity) => {
    const out = compilePrompt({ ...defaultPlan(), intensity });
    expect(out.sections.find((s) => s.id === 'pacing')?.en).toMatch(
      /smallest|subtle|readable/,
    );
  },
);
it.each(['match-pose', 'continuous', 'crossfade', 'none'] as const)(
  'loop strategy %s changes intention',
  (loop) => {
    const out = compilePrompt({ ...defaultPlan(), loop });
    expect(Boolean(out.sections.find((s) => s.id === 'loop'))).toBe(
      loop !== 'none',
    );
  },
);
it.each(['concise', 'balanced', 'detailed'] as const)(
  'prompt length %s has real structure or extra continuity effect',
  (length) => {
    const out = compilePrompt({ ...defaultPlan(), length });
    if (length === 'concise') expect(out.english).not.toContain('\n');
    if (length === 'balanced') expect(out.english).toContain('\n\n');
    if (length === 'detailed')
      expect(out.english).toContain('causally connected');
  },
);
it('audio preferences affect the prompt or omission without adding unrelated sound', () => {
  const p = defaultPlan();
  p.audio = 'ambient';
  expect(compilePrompt(p).english).toContain('natural ambient sound');
  p.audio = 'provider-default';
  expect(compilePrompt(p).sections.some((s) => s.id === 'audio')).toBe(false);
});
it('prioritizing a different selected motion changes order and roles', () => {
  const p = defaultPlan(),
    a = compilePrompt(p).english;
  p.primaryMotion = 'rain';
  expect(compilePrompt(p).english).not.toBe(a);
  expect(compilePrompt(p).english).toContain(
    'Primary motion: If a rain-covered window',
  );
});

describe('rotation mechanics and warnings', () => {
  it.each([90, 180, 360] as const)(
    'angle %s appears in both languages',
    (angle) => {
      const p = rotation();
      p.rotation.angle = angle;
      p.rotation.returnToStart = angle === 360;
      const out = compilePrompt(p);
      expect(out.english).toContain(angle + ' degrees');
      expect(out.chinese).toContain(angle + '°');
      expect(has(p, 'rotation-completion')).toBe(angle === 360);
    },
  );
  it.each(['clockwise', 'counterclockwise'] as const)(
    'direction %s is explicit with observer convention',
    (direction) => {
      const p = rotation();
      p.rotation.direction = direction;
      expect(compilePrompt(p).english).toContain(direction);
    },
  );
  it.each(['x', 'y', 'z'] as const)(
    'axis %s has actual prompt effect',
    (axis) => {
      const p = rotation();
      p.rotation.axis = axis;
      expect(compilePrompt(p).english).toContain(axis.toUpperCase() + '-axis');
    },
  );
  it.each(['uniform', 'slow', 'ease'] as const)(
    'speed %s changes the movement',
    (speed) => {
      const p = rotation();
      p.rotation.speed = speed;
      const en = compilePrompt(p).english;
      expect(en).toMatch(
        speed === 'uniform'
          ? /uniform angular speed/
          : speed === 'slow'
            ? /slow, steady/
            : /ease-in/,
      );
    },
  );
  it.each([
    'centered',
    'stableFraming',
    'consistentScale',
    'stableLighting',
    'geometry',
    'details',
    'returnToStart',
  ] as const)('rotation constraint %s affects prompt', (key) => {
    const p = rotation(),
      en = compilePrompt(p).english;
    p.rotation[key] = false;
    expect(compilePrompt(p).english).not.toBe(en);
  });
  it('distinguishes turntable and camera orbit', () => {
    const p = rotation(),
      turn = compilePrompt(p).english;
    p.rotation.type = 'orbit';
    p.camera = 'orbit';
    const orbit = compilePrompt(p).english;
    expect(turn).toContain('itself clockwise');
    expect(turn).toContain('camera remains stationary');
    expect(orbit).toContain('Keep the product stationary; move the camera');
    expect(orbit).not.toContain('itself clockwise');
  });
  it('single-image 360 requests include hidden geometry and completion warnings', () => {
    const p = rotation();
    expect(has(p, 'hidden-surfaces')).toBe(true);
    expect(has(p, 'rotation-completion')).toBe(true);
  });
  it('partial single-direction rotations cannot also return to start', () => {
    const p = rotation();
    p.rotation.angle = 180;
    expect(has(p, 'partial-return')).toBe(true);
    expect(compilePrompt(p).english).not.toContain('Finish at the starting');
  });
  it('missing rotation subjects, ambiguous cameras and uncommon depth orbit are surfaced', () => {
    const p = rotation();
    p.source.subjectType = 'unspecified';
    expect(has(p, 'rotation-subject')).toBe(true);
    p.camera = 'orbit';
    expect(has(p, 'rotation-camera')).toBe(true);
    p.rotation.type = 'orbit';
    p.rotation.axis = 'z';
    expect(has(p, 'z-orbit')).toBe(true);
  });
  it('reference mode is gated by consumer model, not API claims', () => {
    const p = switchProvider(rotation(), 'veo');
    p.model = 'veo-3.1-quality';
    p.rotation.inputMode = 'references';
    expect(has(p, 'reference-unsupported')).toBe(true);
    p.model = 'veo-3.1-fast';
    p.durationSeconds = 6;
    expect(has(p, 'reference-duration')).toBe(true);
    p.provider = 'grok';
    p.model = 'grok-consumer-current';
    expect(has(p, 'reference-unknown')).toBe(true);
  });
  it('true 3D source produces external rendering guidance, not a fake renderer', () => {
    const p = rotation();
    p.rotation.inputMode = '3d';
    const out = compilePrompt(p);
    expect(has(p, 'true-3d')).toBe(true);
    expect(out.workflowZh.join('')).toContain('外部 renderer');
  });
});

describe('audit rules', () => {
  it('flags conflicting sleep and blinking instead of copying a contradictory prompt', () => {
    const p = defaultPlan();
    p.subjectMotions = ['sleep', 'blink'];
    expect(
      auditPlan(p).some(
        (f) => f.severity === 'error' && f.id.includes('motion-conflict'),
      ),
    ).toBe(true);
  });
  it('flags excessive independent motion', () => {
    const p = defaultPlan();
    p.environmentalMotions = ['rain', 'steam', 'trees', 'snow', 'clouds'];
    expect(has(p, 'motion-count')).toBe(true);
  });
  it('flags loop-hostile camera moves and source-note conflicts', () => {
    const p = defaultPlan();
    p.camera = 'pan';
    expect(has(p, 'loop-camera')).toBe(true);
    p.source.sceneNotesEn = 'Use a fixed camera.';
    expect(has(p, 'notes-camera-conflict')).toBe(true);
  });
  it('marks unsupported durations, consumer unknowns and long-clip risk', () => {
    const p = defaultPlan();
    p.durationSeconds = 30;
    expect(has(p, 'duration-unsupported')).toBe(true);
    expect(has(p, 'duration-complexity')).toBe(true);
    const g = switchProvider(p, 'grok');
    expect(has(g, 'duration-unverified')).toBe(true);
    expect(has(g, 'i2v-unverified')).toBe(true);
  });
  it('warns on deformation and lighting-preservation tension', () => {
    const p = defaultPlan();
    p.intensity = 'moderate';
    p.subjectMotions = ['head'];
    p.environmentalMotions = ['light'];
    expect(has(p, 'deformation')).toBe(true);
    expect(has(p, 'lighting-tension')).toBe(true);
  });
  it('no numeric compatibility percentage or success promise is exposed', () => {
    const out = compilePrompt(defaultPlan());
    expect(JSON.stringify(out.findings)).not.toMatch(
      /score|compatibilityPercent/,
    );
  });
});

describe('curated presets and variations', () => {
  it('has 23 stable, unique, extensible presets', () => {
    expect(BUILT_IN_PRESETS).toHaveLength(23);
    expect(new Set(BUILT_IN_PRESETS.map((p) => p.id)).size).toBe(23);
  });
  it.each(BUILT_IN_PRESETS.map((p) => [p.id, p] as const))(
    'preset %s is internally valid and preserves the selected source',
    (_id, preset) => {
      const p = defaultPlan();
      p.source.subjectType = 'product';
      p.provider = 'grok';
      p.model = 'grok-consumer-current';
      const applied = applyPreset(p, preset);
      expect(applied.source).toEqual(p.source);
      expect(applied.provider).toBe('grok');
      expect(applied.mode).toBe(preset.mode);
      expect(normalizePlan(preset.plan)).toEqual(preset.plan);
      expect(preset.nameEn.length).toBeGreaterThan(0);
      expect(preset.nameZh.length).toBeGreaterThan(0);
      expect(compilePrompt(applied).english.length).toBeGreaterThan(50);
    },
  );
  it('A/B/C alter actual intent, do not introduce unselected actions, and are deterministic', () => {
    const p = defaultPlan(),
      a = generateVariations(p);
    expect(generateVariations(p)).toEqual(a);
    expect(new Set(a.map((v) => v.output.english)).size).toBe(3);
    expect(a[0]!.output.plan.intensity).toBe('minimal');
    expect(
      a[0]!.output.plan.subjectMotions.length +
        a[0]!.output.plan.environmentalMotions.length,
    ).toBeLessThan(p.subjectMotions.length + p.environmentalMotions.length);
    for (const v of a) {
      expect(v.output.plan.preservation).toEqual(p.preservation);
      expect(v.output.plan.camera).toBe(p.camera);
      for (const id of v.output.plan.environmentalMotions)
        expect(p.environmentalMotions).toContain(id);
    }
  });
  it('C respects a minimal amplitude choice while extending visible timing', () => {
    const p = defaultPlan();
    p.intensity = 'minimal';
    const c = generateVariations(p)[2]!;
    expect(c.output.plan.intensity).toBe('minimal');
    expect(c.output.plan.motionTiming).toBe('sustained');
  });
  it('pure uniform rotation is honestly constraint-bound, eased timing varies', () => {
    const p = rotation(),
      fixed = generateVariations(p);
    expect(new Set(fixed.map((v) => v.output.english)).size).toBe(1);
    expect(fixed[0]!.changesZh.join('')).toContain('沒有可變');
    p.rotation.speed = 'ease';
    const varied = generateVariations(p);
    expect(new Set(varied.map((v) => v.output.english)).size).toBe(3);
    for (const v of varied) {
      expect(v.output.plan.rotation).toEqual(p.rotation);
    }
  });
  it('continuous rotation loops describe angular motion without inventing environmental animation', () => {
    const p = rotation();
    p.loop = 'continuous';
    for (const provider of PROVIDERS) {
      const output = compilePrompt(switchProvider(p, provider));
      expect(output.english).toContain('continuous angular movement');
      expect(output.english).not.toContain('ambient movement');
      expect(output.chinese).toContain('連續的角度移動');
    }
  });
  it('partial turns warn about loop boundaries without requesting the starting orientation', () => {
    for (const angle of [90, 180] as const) {
      const p = rotation();
      p.rotation.angle = angle;
      p.rotation.returnToStart = false;
      for (const loop of ['match-pose', 'continuous'] as const) {
        p.loop = loop;
        const output = compilePrompt(p);
        expect(
          output.findings.some((f) => f.id === 'partial-rotation-loop'),
        ).toBe(true);
        expect(output.english).toContain('separately designed return path');
        expect(output.english).not.toContain(
          'Finish at the starting object orientation',
        );
        expect(output.english).not.toContain(
          'continuous angular movement across',
        );
      }
      p.loop = 'none';
      expect(
        compilePrompt(p).findings.some((f) => f.id === 'partial-rotation-loop'),
      ).toBe(false);
    }
  });
  it('every model entry has source-backed statuses and distinct API scope', () => {
    for (const cap of Object.values(PROVIDER_CAPABILITIES)) {
      for (const feature of Object.values(cap.consumer)) {
        expect(['supported', 'unsupported', 'unknown']).toContain(
          feature.status,
        );
        expect(feature.verifiedAt).toBe('2026-10-11');
        if (feature.status !== 'unknown')
          expect(feature.sourceUrl).toMatch(/^https:\/\//);
      }
    }
  });
});
