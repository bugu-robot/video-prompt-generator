import { describe, expect, it } from 'vitest';
import {
  defaultPlan,
  switchProvider,
} from '../../src/engine/motion-planner';
import { invalidateSourceConfirmation } from '../../src/engine/source-confirmation';
import {
  loadSettings,
  saveSettings,
  SETTINGS_KEY,
  PRESETS_KEY,
  type StorageLike,
} from '../../src/storage/local-storage';
import type { AppSettings } from '../../src/models/motion-plan';

function fixture(withImage: boolean, withRegion: boolean): AppSettings {
  const p = switchProvider(defaultPlan(), 'veo');
  p.source.subjectEn = 'Mochi';
  p.source.subjectZh = '窗邊的 Mochi';
  p.source.sceneNotesEn = 'Keep the visible cup steady.';
  p.source.elementsConfirmed = true;
  p.length = 'detailed';
  p.presetId = 'saved-mochi';
  if (withImage)
    p.source.image = {
      name: 'local.png',
      mime: 'image/png',
      width: 1600,
      height: 900,
      bytes: 500,
    };
  if (withRegion)
    p.source.region = { x: 0.1, y: 0.1, width: 0.3, height: 0.3 };
  return { plan: p, theme: 'light', view: 'both' };
}
function memory(): StorageLike {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
  };
}
function restored(settings: AppSettings): AppSettings {
  const expected = structuredClone(settings);
  Object.assign(expected.plan.source, {
    image: null,
    region: null,
    elementsConfirmed: false,
  });
  return expected;
}
const sources = [
  [true, true],
  [true, false],
  [false, false],
] as const;
describe('source confirmation belongs to the active session', () => {
  it.each(sources)(
    'legacy settings cannot restore confirmation: image=%s region=%s',
    (withImage, withRegion) => {
      const settings = fixture(withImage, withRegion),
        s = memory();
      const legacy = JSON.stringify({ schemaVersion: '1.0.0', settings });
      s.setItem(SETTINGS_KEY, legacy);
      s.setItem(PRESETS_KEY, 'unchanged preset bytes');
      expect(loadSettings(s)).toEqual(restored(settings));
      expect(s.getItem(SETTINGS_KEY)).toBe(legacy);
      expect(s.getItem(PRESETS_KEY)).toBe('unchanged preset bytes');
      expect(settings.plan.source.elementsConfirmed).toBe(true);
    },
  );
  it.each(sources)(
    'saving omits session confirmation without mutating active intent: image=%s region=%s',
    (withImage, withRegion) => {
      const settings = fixture(withImage, withRegion),
        before = structuredClone(settings),
        s = memory();
      s.setItem(PRESETS_KEY, 'unchanged preset bytes');
      saveSettings(s, settings);
      const stored = JSON.parse(s.getItem(SETTINGS_KEY)!) as {
        settings: AppSettings;
      };
      expect(stored.settings).toEqual(restored(before));
      expect(loadSettings(s)).toEqual(restored(before));
      expect(settings).toEqual(before);
      expect(s.getItem(PRESETS_KEY)).toBe('unchanged preset bytes');
    },
  );
  it('a new manual confirmation survives unrelated settings within the new session, but is never saved', () => {
    const s = memory();
    saveSettings(s, fixture(true, true));
    const settings = loadSettings(s);
    settings.plan.source.elementsConfirmed = true;
    const previous = structuredClone(settings.plan);
    settings.plan = switchProvider(settings.plan, 'omni');
    settings.plan.length = 'concise';
    settings.plan.camera = 'pan';
    settings.plan = invalidateSourceConfirmation(previous, settings.plan);
    expect(settings.plan.source.elementsConfirmed).toBe(true);
    saveSettings(s, settings);
    expect(settings.plan.source.elementsConfirmed).toBe(true);
    expect(loadSettings(s).plan.source.elementsConfirmed).toBe(false);
  });
});
