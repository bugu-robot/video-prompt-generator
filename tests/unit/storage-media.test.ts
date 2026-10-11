import { describe, expect, it } from 'vitest';
import { defaultPlan, normalizePlan } from '../../src/engine/motion-planner';
import {
  createExport,
  importConfiguration,
  validateMotionPlan,
} from '../../src/storage/export';
import {
  deletePreset,
  importPresets,
  listCustomPresets,
  loadSettings,
  PRESETS_KEY,
  presetBundle,
  renamePreset,
  savePreset,
  saveSettings,
  type StorageLike,
} from '../../src/storage/local-storage';
import {
  EXPORT_SCHEMA,
  parseSafeJson,
  validate,
} from '../../src/storage/schema';
import {
  validateImageHeader,
  aspectRatio,
  IMAGE_LIMIT,
} from '../../src/media/image';
import {
  frameDifference,
  QC_CHECKS,
  qcReport,
  type VideoQcResult,
} from '../../src/media/video-qc';
import { applyPreset, BUILT_IN_PRESETS } from '../../src/data/motion-presets';
const now = '2026-10-11T09:00:00.000Z';
function memory(): StorageLike {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => {
      m.set(k, v);
    },
  };
}

describe('versioned integration schema', () => {
  it('round-trips a complete, self-consistent plan and stable example', () => {
    const p = defaultPlan();
    p.source.subjectType = 'cat';
    const exported = createExport(p, now);
    validate(exported, EXPORT_SCHEMA);
    expect(importConfiguration(JSON.stringify(exported))).toEqual(p);
    expect(createExport(p, now)).toEqual(exported);
  });
  it('retains source metadata and semantic region but never media bytes or URLs', () => {
    const p = defaultPlan();
    p.source.image = {
      name: 'mochi.png',
      mime: 'image/png',
      bytes: 120,
      width: 1920,
      height: 1080,
    };
    p.source.region = { x: 0.1, y: 0.2, width: 0.2, height: 0.3 };
    const raw = JSON.stringify(createExport(p, now));
    expect(importConfiguration(raw).source).toEqual(p.source);
    expect(raw).not.toMatch(/data:image|blob:|base64|imageBytes/);
  });
  it.each([
    'provider',
    'modelSelection',
    'generationMode',
    'generatedEnglishPrompt',
    'presetIdentity',
    'loopSettings',
    'qcWarnings',
    'sourceImageReference',
  ] as const)('rejects tampered mirror %s', (key) => {
    const data = createExport(defaultPlan(), now) as unknown as Record<
      string,
      unknown
    >;
    const values: Record<string, unknown> = {
      provider: 'veo',
      modelSelection: 'grok-consumer-current',
      generationMode: 'cinematic',
      generatedEnglishPrompt: 'Different prompt',
      presetIdentity: 'tampered',
      loopSettings: { strategy: 'none', returnToStart: false },
      qcWarnings: [],
      sourceImageReference: {
        name: 'other.png',
        mime: 'image/png',
        bytes: 120,
        width: 100,
        height: 100,
      },
    };
    data[key] = values[key];
    expect(() => importConfiguration(JSON.stringify(data))).toThrow();
  });
  it('rejects future versions and unknown properties', () => {
    const a = createExport(defaultPlan(), now) as unknown as Record<
      string,
      unknown
    >;
    a.schemaVersion = '9.0.0';
    expect(() => importConfiguration(JSON.stringify(a))).toThrow();
    a.schemaVersion = '1.0.0';
    a.backendApiKey = 'not-allowed';
    expect(() => importConfiguration(JSON.stringify(a))).toThrow();
  });
  it('rejects inconsistent provider/model and invalid primary motion', () => {
    const p = defaultPlan();
    p.provider = 'grok';
    expect(() => validateMotionPlan(p)).toThrow();
    p.provider = 'omni';
    p.primaryMotion = 'clouds';
    expect(() => validateMotionPlan(p)).toThrow();
  });
  it('rejects unsupported source payloads and regions outside the image', () => {
    const p = defaultPlan();
    p.source.region = { x: 0.9, y: 0, width: 0.2, height: 0.5 };
    expect(() => validateMotionPlan(p)).toThrow();
    const unknown = {
      ...defaultPlan(),
      source: { ...defaultPlan().source, imageBytes: 'not-allowed' },
    };
    expect(() => validateMotionPlan(unknown)).toThrow();
  });
  it('validates decoded dimension limits and dates', () => {
    const p = defaultPlan();
    p.source.image = {
      name: 'huge.png',
      mime: 'image/png',
      bytes: 100,
      width: 12000,
      height: 12000,
    };
    expect(() => validateMotionPlan(p)).toThrow();
    const out = createExport(defaultPlan(), now);
    out.exportTimestamp = 'not-a-date';
    expect(() => importConfiguration(JSON.stringify(out))).toThrow();
  });
  it('rejects non-string enum lookalikes and malformed nested configuration', () => {
    expect(() =>
      validateMotionPlan({ ...defaultPlan(), intensity: ['subtle'] }),
    ).toThrow();
    expect(() =>
      validateMotionPlan({ ...defaultPlan(), rotation: {} }),
    ).toThrow();
  });
});

describe('safe import and local preset lifecycle', () => {
  it('saves, reloads, renames, duplicates and deletes without losing sibling presets', () => {
    const s = memory(),
      p = defaultPlan();
    savePreset(s, 'Rain', p, 'first', now);
    savePreset(s, 'Steam', p, 'second', now);
    renamePreset(s, 'first', 'Renamed');
    expect(listCustomPresets(s).map((p) => p.nameZh)).toEqual([
      'Renamed',
      'Steam',
    ]);
    deletePreset(s, 'first');
    expect(listCustomPresets(s).map((p) => p.id)).toEqual(['second']);
  });
  it('updates a custom preset with actual edited motion', () => {
    const s = memory(),
      p = defaultPlan();
    savePreset(s, 'One', p, 'one', now);
    p.camera = 'pan';
    savePreset(s, 'One', p, 'one', now);
    expect(listCustomPresets(s)).toHaveLength(1);
    expect(listCustomPresets(s)[0]!.plan.camera).toBe('pan');
  });
  it('imports validated presets under new IDs instead of overwriting', () => {
    const s = memory();
    const original = savePreset(s, 'One', defaultPlan(), 'one', now);
    const data = presetBundle([original]);
    importPresets(s, data, () => 'new-id');
    expect(listCustomPresets(s).map((p) => p.id)).toEqual(['one', 'new-id']);
  });
  it('rejects the entire malformed batch atomically', () => {
    const s = memory(),
      original = savePreset(s, 'One', defaultPlan(), 'one', now),
      before = s.getItem(PRESETS_KEY);
    const good = presetBundle([original]);
    const data = JSON.parse(good) as { presets: unknown[] };
    data.presets.push({ nameZh: 'broken' });
    expect(() => importPresets(s, JSON.stringify(data))).toThrow();
    expect(s.getItem(PRESETS_KEY)).toBe(before);
  });
  it('rejects empty names, duplicate bundle IDs and excess presets', () => {
    const s = memory();
    expect(() => savePreset(s, ' ', defaultPlan())).toThrow();
    const p = savePreset(s, 'One', defaultPlan(), 'one', now),
      data = presetBundle([p]);
    const parsed = JSON.parse(data) as { presets: unknown[] };
    parsed.presets.push(p);
    expect(() => importPresets(s, JSON.stringify(parsed))).toThrow();
    expect(() =>
      presetBundle(
        Array.from({ length: 101 }, (_, i) => ({ ...p, id: 'id' + i })),
      ),
    ).toThrow();
  });
  it('hostile keys, oversized and deeply nested JSON are rejected', () => {
    expect(() => parseSafeJson('{"__proto__":{"polluted":true}}')).toThrow();
    expect(() => parseSafeJson('{"source":{"constructor":"x"}}')).toThrow();
    expect(() =>
      parseSafeJson('['.repeat(30) + '0' + ']'.repeat(30)),
    ).toThrow();
    expect(() =>
      parseSafeJson(JSON.stringify('x'.repeat(1024 * 1024))),
    ).toThrow();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
  it('quota failure leaves the original presets untouched', () => {
    const s = memory();
    savePreset(s, 'One', defaultPlan(), 'one', now);
    const before = s.getItem(PRESETS_KEY),
      blocked: StorageLike = {
        getItem: s.getItem,
        setItem: () => {
          throw new Error('Quota exceeded');
        },
      };
    expect(() => savePreset(blocked, 'Two', defaultPlan())).toThrow();
    expect(s.getItem(PRESETS_KEY)).toBe(before);
  });
  it('corrupt stored settings fail safely and tolerate old option data', () => {
    const s = memory();
    s.setItem('video-prompts.settings.v1', 'not JSON');
    expect(loadSettings(s).plan).toEqual(defaultPlan());
    const p = normalizePlan({ subjectMotions: ['unknown', 'blink'] });
    saveSettings(s, { plan: p, theme: 'light', view: 'both' });
    expect(loadSettings(s)).toEqual({ plan: p, theme: 'light', view: 'both' });
  });
  it('settings and presets omit media metadata/regions without persisting bytes', () => {
    const s = memory(),
      p = defaultPlan();
    p.source.image = {
      name: 'local.png',
      mime: 'image/png',
      width: 1600,
      height: 900,
      bytes: 500,
    };
    p.source.region = { x: 0.1, y: 0.1, width: 0.3, height: 0.3 };
    saveSettings(s, { plan: p, view: 'en', theme: 'dark' });
    const q = savePreset(s, 'Generic', p, 'id', now);
    expect(loadSettings(s).plan.source.image).toBeNull();
    expect(q.plan.source.image).toBeNull();
    expect(q.plan.source.region).toBeNull();
    expect(p.source.image).not.toBeNull();
  });
  it('built-in recommendation cannot confirm a new set of image objects', () => {
    const p = defaultPlan();
    p.source.elementsConfirmed = true;
    const next = applyPreset(p, BUILT_IN_PRESETS[0]!);
    expect(next.source.elementsConfirmed).toBe(false);
    expect(p.source.elementsConfirmed).toBe(true);
  });
});

describe('media validation and honest QC signals', () => {
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
  const jpg = new Uint8Array([255, 216, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const webp = new TextEncoder().encode('RIFFxxxxWEBP');
  it.each([
    ['image/png', png],
    ['image/jpeg', jpg],
    ['image/webp', webp],
  ] as const)('validates magic bytes for %s', (mime, bytes) => {
    expect(validateImageHeader({ size: 30, type: mime }, bytes)).toBe(mime);
  });
  it('rejects zero/oversized files, SVG and MIME disguises', () => {
    expect(() =>
      validateImageHeader({ size: 0, type: 'image/png' }, png),
    ).toThrow();
    expect(() =>
      validateImageHeader({ size: IMAGE_LIMIT + 1, type: 'image/png' }, png),
    ).toThrow();
    expect(() =>
      validateImageHeader({ size: 30, type: 'image/jpeg' }, png),
    ).toThrow();
    expect(() =>
      validateImageHeader(
        { size: 30, type: 'image/svg+xml' },
        new TextEncoder().encode('<svg></svg>'),
      ),
    ).toThrow();
  });
  it('calculates real image ratio without provider-resolution claims', () => {
    expect(aspectRatio(1920, 1080)).toBe('16:9 (1.778)');
    expect(aspectRatio(100, 100)).toBe('1:1 (1.000)');
  });
  it('same frames and completely different frames have interpretable metrics', () => {
    const black = new Uint8ClampedArray([0, 0, 0, 255]),
      white = new Uint8ClampedArray([255, 255, 255, 255]);
    expect(frameDifference(black, black, 1, 1).meanAbsoluteRgbDifference).toBe(
      0,
    );
    const diff = frameDifference(black, white, 1, 1);
    expect(diff.meanAbsoluteRgbDifference).toBe(1);
    expect(diff.warningZh).toContain('啟發式');
  });
  it('ignores alpha-only differences for video and preserves distinct luma/RGB signals', () => {
    const a = new Uint8ClampedArray([200, 0, 0, 0]),
      b = new Uint8ClampedArray([200, 0, 0, 255]);
    expect(frameDifference(a, b, 1, 1).meanAbsoluteRgbDifference).toBe(0);
    expect(() => frameDifference(a, b, 2, 1)).toThrow();
  });
  it('QC export excludes frame bytes and marks incomplete manual checks pending', () => {
    const q: VideoQcResult = {
      name: 'clip.mp4',
      mime: 'video/mp4',
      bytes: 100,
      durationSeconds: 8,
      width: 1920,
      height: 1080,
      firstFrameTime: 0,
      lastFrameTime: 7.96,
      firstFrame: 'data:private-first',
      lastFrame: 'data:private-last',
      metric: frameDifference(
        new Uint8ClampedArray(4),
        new Uint8ClampedArray(4),
        1,
        1,
      ),
      checks: { identity: 'pass' },
      notes: '',
      evaluatedAt: now,
    };
    const raw = qcReport(q);
    expect(raw).not.toContain('data:private');
    const report = JSON.parse(raw) as { checkStatus: { status: string }[] };
    expect(
      report.checkStatus.filter((c) => c.status === 'pending'),
    ).toHaveLength(QC_CHECKS.length - 1);
    expect(raw).toContain('不能證明');
  });
});
