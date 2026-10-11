import { describe, expect, it, vi } from 'vitest';
import { largePresetBatch } from '../fixtures/presets';
import { defaultPlan, switchProvider } from '../../src/engine/motion-planner';
import { compilePrompt, compareProviders } from '../../src/engine/compile';
import { generateVariations } from '../../src/engine/variations';
import { MODEL_IDS, PROVIDERS } from '../../src/models/motion-plan';
import { PROVIDER_CAPABILITIES } from '../../src/models/provider-capabilities';
import {
  deletePreset,
  importPresets,
  listCustomPresets,
  parsePresetBundle,
  PRESETS_KEY,
  presetBundle,
  renamePreset,
  savePreset,
  type StorageLike,
  inspectCustomPresets,
  rawPresetBackup,
  restorePresets,
  browserStorage,
} from '../../src/storage/local-storage';
import { parseSafeJson } from '../../src/storage/schema';
import { createExport, importConfiguration } from '../../src/storage/export';

const limit = 1024 * 1024;
const bytes = (raw: string) => new TextEncoder().encode(raw).byteLength;
function memory(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

describe('independent review: preset data preservation', () => {
  it('retains access to the existing store when the initial write probe hits quota', () => {
    const s = memory();
    s.setItem(PRESETS_KEY, '{broken existing data}');
    const full = {
      getItem: s.getItem,
      setItem: () => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      },
      removeItem: () => {},
    };
    vi.stubGlobal('localStorage', full);
    try {
      const selected = browserStorage();
      expect(selected.storage).toBe(full);
      expect(rawPresetBackup(selected.storage)).toBe('{broken existing data}');
      expect(() => savePreset(selected.storage, 'New', defaultPlan())).toThrow(
        /原始/,
      );
      expect(s.getItem(PRESETS_KEY)).toBe('{broken existing data}');
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it('rejects a second individually valid batch when the merged bundle exceeds 1 MiB', () => {
    const s = memory();
    savePreset(s, 'Keep', defaultPlan(), 'keep');
    const first = presetBundle(largePresetBatch('first'));
    const second = presetBundle(largePresetBatch('second'));
    expect(bytes(first)).toBeLessThan(limit);
    expect(bytes(second)).toBeLessThan(limit);
    expect(parsePresetBundle(first)).toHaveLength(30);
    expect(parsePresetBundle(second)).toHaveLength(30);
    let id = 0;
    importPresets(s, first, () => 'new-' + id++);
    const before = s.getItem(PRESETS_KEY)!;
    expect(bytes(before)).toBeLessThan(limit);
    expect(() => importPresets(s, second, () => 'new-' + id++)).toThrow(
      /1 MiB|分批/,
    );
    expect(s.getItem(PRESETS_KEY)).toBe(before);
    expect(listCustomPresets(s)).toHaveLength(31);
    savePreset(s, 'After rejection', defaultPlan(), 'after');
    expect(listCustomPresets(s)).toHaveLength(32);
  });
  it('uses exact UTF-8 bytes including Chinese and supplementary characters at the parser boundary', () => {
    const content = '界'.repeat(Math.floor((limit - 2) / 3));
    const exact = JSON.stringify(
      content + 'a'.repeat(limit - 2 - bytes(content)),
    );
    expect(bytes(exact)).toBe(limit);
    expect(() => parseSafeJson(exact)).not.toThrow();
    expect(() => parseSafeJson(exact.slice(0, -1) + 'a"')).toThrow();
    const emoji = JSON.stringify('🐱'.repeat(limit / 4));
    expect(emoji.length).toBeLessThan(limit);
    expect(() => parseSafeJson(emoji)).toThrow();
  });
  it('rejects an oversized UTF-8 serialized export even when its character count is below the limit', () => {
    const presets = largePresetBatch('unicode', 20);
    for (const p of presets) {
      p.providerNotesZh = p.providerNotesZh.map(
        (_, i) => String(i).padStart(2, '0') + '界'.repeat(498),
      );
      p.warningsZh = p.warningsZh.map(
        (_, i) => String(i).padStart(2, '0') + '界'.repeat(498),
      );
    }
    const unvalidated = JSON.stringify({
      format: 'video-prompt-generator-presets',
      schemaVersion: '1.0.0',
      presets,
    });
    expect(unvalidated.length).toBeLessThan(limit);
    expect(bytes(unvalidated)).toBeGreaterThan(limit);
    expect(() => presetBundle(presets)).toThrow();
  });
  it.each(['malformed', 'oversized', 'wrong-schema'] as const)(
    'refuses every ordinary mutation against %s stored data and preserves the raw string',
    (kind) => {
      const s = memory();
      const raw =
        kind === 'malformed'
          ? '  {broken JSON\n'
          : kind === 'oversized'
            ? JSON.stringify(
                {
                  format: 'video-prompt-generator-presets',
                  schemaVersion: '1.0.0',
                  presets: largePresetBatch('old', 60),
                },
                null,
                2,
              )
            : '{"format":"unknown","schemaVersion":"1.0.0","presets":[]}';
      s.setItem(PRESETS_KEY, raw);
      const incoming = presetBundle(largePresetBatch('incoming', 1));
      const mutations = [
        () => savePreset(s, 'New', defaultPlan(), 'new'),
        () => savePreset(s, 'Update', defaultPlan(), 'old-0'),
        () => renamePreset(s, 'old-0', 'Renamed'),
        () => deletePreset(s, 'old-0'),
        () => importPresets(s, incoming, () => 'new'),
      ];
      expect(() => listCustomPresets(s)).toThrow(/原始|備份/);
      for (const mutate of mutations) {
        expect(mutate).toThrow(/原始|備份/);
        expect(s.getItem(PRESETS_KEY)).toBe(raw);
      }
    },
  );
  it.each(['save', 'rename', 'delete', 'import'] as const)(
    'quota failure during %s leaves prior stored bytes intact',
    (operation) => {
      const s = memory();
      const p = savePreset(s, 'Keep', defaultPlan(), 'keep');
      const before = s.getItem(PRESETS_KEY);
      const blocked: StorageLike = {
        getItem: s.getItem,
        setItem: () => {
          throw new DOMException('Quota exceeded', 'QuotaExceededError');
        },
      };
      const operations = {
        save: () => savePreset(blocked, 'New', defaultPlan()),
        rename: () => renamePreset(blocked, 'keep', 'Rename'),
        delete: () => deletePreset(blocked, 'keep'),
        import: () => importPresets(blocked, presetBundle([p]), () => 'new'),
      };
      expect(operations[operation]).toThrow();
      expect(s.getItem(PRESETS_KEY)).toBe(before);
    },
  );
  it('accepts the exact serialized UTF-8 limit and rejects an additional save without altering it', () => {
    const presets = largePresetBatch('boundary', 50);
    const encode = () =>
      JSON.stringify(
        {
          format: 'video-prompt-generator-presets',
          schemaVersion: '1.0.0',
          presets,
        },
        null,
        2,
      );
    let excess = bytes(encode()) - limit;
    expect(excess).toBeGreaterThan(0);
    for (const p of presets)
      for (let i = 0; i < p.warningsZh.length && excess > 0; i++) {
        const trim = Math.min(excess, p.warningsZh[i]!.length - 2);
        p.warningsZh[i] = p.warningsZh[i]!.slice(0, -trim || undefined);
        excess -= trim;
      }
    expect(excess).toBe(0);
    const raw = presetBundle(presets);
    expect(bytes(raw)).toBe(limit);
    expect(parsePresetBundle(raw)).toHaveLength(50);
    const s = memory();
    s.setItem(PRESETS_KEY, raw);
    expect(() => savePreset(s, 'Extra', defaultPlan(), 'extra')).toThrow(
      /1 MiB/,
    );
    expect(s.getItem(PRESETS_KEY)).toBe(raw);
    expect(presetBundle(listCustomPresets(s))).toBe(raw);
  });
  it('exports unreadable raw data exactly and only restores a validated replacement against that backup', () => {
    const s = memory();
    const raw = '  {broken JSON\n';
    s.setItem(PRESETS_KEY, raw);
    expect(inspectCustomPresets(s)).toMatchObject({
      status: 'unreadable',
      raw,
    });
    expect(rawPresetBackup(s)).toBe(raw);
    expect(() => restorePresets(s, '{bad}', raw)).toThrow();
    expect(s.getItem(PRESETS_KEY)).toBe(raw);
    const restored = presetBundle(largePresetBatch('repaired', 1));
    expect(() => restorePresets(s, restored, 'stale backup')).toThrow(
      /重新匯出/,
    );
    expect(s.getItem(PRESETS_KEY)).toBe(raw);
    expect(restorePresets(s, restored, raw)).toHaveLength(1);
    expect(listCustomPresets(s)[0]!.id).toBe('repaired-0');
    const before = s.getItem(PRESETS_KEY);
    expect(() => restorePresets(s, restored, before!)).toThrow(/一般匯入/);
    expect(s.getItem(PRESETS_KEY)).toBe(before);
  });
  it('failed recovery writes preserve unreadable data and denied reads block ordinary mutations', () => {
    const raw = 'unreadable';
    const s = memory();
    s.setItem(PRESETS_KEY, raw);
    const blocked: StorageLike = {
      getItem: s.getItem,
      setItem: () => {
        throw new DOMException('Quota', 'QuotaExceededError');
      },
    };
    expect(() =>
      restorePresets(
        blocked,
        presetBundle(largePresetBatch('restore', 1)),
        raw,
      ),
    ).toThrow(/原有資料未更改/);
    expect(s.getItem(PRESETS_KEY)).toBe(raw);
    let writes = 0;
    const denied: StorageLike = {
      getItem: () => {
        throw new Error('Read denied');
      },
      setItem: () => {
        writes++;
      },
    };
    expect(inspectCustomPresets(denied)).toMatchObject({
      status: 'unreadable',
      raw: null,
    });
    expect(() => savePreset(denied, 'New', defaultPlan())).toThrow(/原始/);
    expect(() => deletePreset(denied, 'old')).toThrow(/原始/);
    expect(() =>
      importPresets(denied, presetBundle(largePresetBatch('import', 1))),
    ).toThrow(/原始/);
    expect(writes).toBe(0);
  });
});

describe('independent review: active-mode motion audit', () => {
  for (const provider of PROVIDERS)
    for (const type of ['turntable', 'orbit'] as const) {
      it(`${provider} ${type} base, variants and comparisons ignore dormant motion conflicts and retain them`, () => {
        const p = switchProvider(defaultPlan(), provider);
        p.subjectMotions = ['sleep', 'blink'];
        p.primaryMotion = 'sleep';
        p.mode = 'rotation';
        p.source.subjectType = 'product';
        p.rotation.type = type;
        p.camera = type === 'orbit' ? 'orbit' : 'locked';
        const before = structuredClone(p);
        const outputs = [
          compilePrompt(p),
          ...generateVariations(p).map((v) => v.output),
        ];
        for (const out of outputs) {
          for (const compiled of [
            out,
            ...Object.values(compareProviders(out.plan)),
          ]) {
            expect(
              compiled.findings.filter((f) => f.severity === 'error'),
            ).toEqual([]);
            expect(compiled.english).not.toMatch(/blink|breath|sleep/i);
            expect(compiled.plan.subjectMotions).toEqual(['sleep', 'blink']);
          }
        }
        expect(p).toEqual(before);
        p.source.subjectType = 'cat';
        p.camera = 'locked';
        for (const mode of ['ambient', 'cinematic'] as const) {
          p.mode = mode;
          for (const out of [
            compilePrompt(p),
            ...generateVariations(p).map((v) => v.output),
          ]) {
            for (const compiled of [
              out,
              ...Object.values(compareProviders(out.plan)),
            ]) {
              expect(
                compiled.findings.some(
                  (f) =>
                    f.id.startsWith('motion-conflict') &&
                    f.severity === 'error',
                ),
              ).toBe(true);
            }
          }
        }
      });
    }
});

describe('independent review: rotation endpoint workflow', () => {
  for (const model of MODEL_IDS)
    for (const type of ['turntable', 'orbit'] as const)
      for (const angle of [90, 180] as const) {
        it(`${model} ${angle}° ${type} never recommends identical endpoints`, () => {
          const p = switchProvider(
            defaultPlan(),
            PROVIDER_CAPABILITIES[model].provider,
          );
          p.model = model;
          p.mode = 'rotation';
          p.source.subjectType = 'product';
          p.rotation = {
            ...p.rotation,
            type,
            angle,
            direction: 'counterclockwise',
            returnToStart: false,
          };
          p.camera = type === 'orbit' ? 'orbit' : 'locked';
          const out = compilePrompt(p);
          const workflow = out.workflowZh.join(' ');
          expect(workflow).not.toMatch(/相同原圖.*首尾幀/);
          expect(workflow).toMatch(/不同尾幀|不同的尾幀/);
          expect(workflow).toContain('單向');
          if (p.provider === 'grok') expect(workflow).toContain('未核實');
          expect(out.english).toContain('counterclockwise');
          expect(out.english).toContain(String(angle));
          expect(out.english).toContain('separately designed return path');
          expect(out.plan.rotation).toEqual(p.rotation);
        });
      }
  it.each(
    MODEL_IDS.filter(
      (m) => PROVIDER_CAPABILITIES[m].consumer.endFrame.status === 'supported',
    ),
  )(
    '%s retains identical endpoint suggestions for a full revolution and returning ambient pose',
    (model) => {
      const p = switchProvider(
        defaultPlan(),
        PROVIDER_CAPABILITIES[model].provider,
      );
      p.model = model;
      expect(compilePrompt(p).workflowZh.join('')).toMatch(/相同原圖.*首尾幀/);
      p.mode = 'rotation';
      p.source.subjectType = 'product';
      expect(compilePrompt(p).workflowZh.join('')).toMatch(/相同原圖.*首尾幀/);
    },
  );
});

describe('independent review: semantic export mirrors', () => {
  const reorder = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(reorder)
      : v !== null && typeof v === 'object'
        ? Object.fromEntries(
            Object.entries(v)
              .reverse()
              .map(([k, x]) => [k, reorder(x)]),
          )
        : v;
  it('accepts recursively reordered object keys including loop settings and source metadata', () => {
    const p = defaultPlan();
    p.source.image = {
      name: 'source.png',
      mime: 'image/png',
      bytes: 100,
      width: 320,
      height: 180,
    };
    expect(
      importConfiguration(JSON.stringify(reorder(createExport(p)))),
    ).toEqual(p);
  });
  it('still rejects reordered warning arrays and changed values', () => {
    const out = createExport(defaultPlan());
    out.qcWarnings.reverse();
    expect(() => importConfiguration(JSON.stringify(out))).toThrow(
      /qcWarnings/,
    );
    const changed = createExport(defaultPlan());
    changed.loopSettings.returnToStart = true;
    expect(() => importConfiguration(JSON.stringify(reorder(changed)))).toThrow(
      /loopSettings/,
    );
  });
  it.each([
    'compilerVersion',
    'capabilitySnapshotDate',
    'schemaVersion',
    'exportTimestamp',
    'generatedEnglishPrompt',
  ] as const)(
    'key-order interoperability does not weaken strict %s validation',
    (key) => {
      const out = createExport(defaultPlan()) as unknown as Record<
        string,
        unknown
      >;
      out[key] =
        key === 'exportTimestamp' ? '2026-02-30T09:00:00.000Z' : 'invalid';
      expect(() => importConfiguration(JSON.stringify(reorder(out)))).toThrow();
    },
  );
});
