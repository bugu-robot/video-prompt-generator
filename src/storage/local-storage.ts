import type {
  AppSettings,
  MotionPlan,
  MotionPreset,
} from '../models/motion-plan';
import {
  defaultPlan,
  isRecord,
  normalizePlan,
  safeText,
} from '../engine/motion-planner';
import {
  PRESET_BUNDLE_SCHEMA,
  PRESET_SCHEMA,
  assertJsonByteLimit,
  parseSafeJson,
  validate,
} from './schema';
import { validateMotionPlan } from './export';
import { clearSourceSession } from '../engine/source-confirmation';
export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}
const memory = new Map<string, string>();
const volatile: StorageLike = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => {
    memory.set(k, v);
  },
};
export const SETTINGS_KEY = 'video-prompts.settings.v1',
  PRESETS_KEY = 'video-prompts.presets.v1';
export function browserStorage(): {
  storage: StorageLike;
  persistent: boolean;
} {
  try {
    const s = localStorage;
    const key = 'video-prompts.storage-test';
    try {
      s.setItem(key, '1');
      s.removeItem(key);
    } catch {
      // A full or read-only store may still contain recoverable presets. Keep
      // its reader; later writes report errors rather than hiding it in memory.
    }
    return { storage: s, persistent: true };
  } catch {
    return { storage: volatile, persistent: false };
  }
}
export function loadSettings(s: StorageLike): AppSettings {
  const fallback: AppSettings = {
    plan: defaultPlan(),
    view: 'en',
    theme: 'dark',
  };
  try {
    const v = parseSafeJson(s.getItem(SETTINGS_KEY) ?? 'null');
    if (!isRecord(v) || v.schemaVersion !== '1.0.0' || !isRecord(v.settings))
      return fallback;
    const x = v.settings,
      plan = normalizePlan(x.plan);
    clearSourceSession(plan);
    return {
      plan,
      view: ['en', 'zh', 'both'].includes(String(x.view))
        ? (x.view as AppSettings['view'])
        : 'en',
      theme: ['dark', 'light', 'system'].includes(String(x.theme))
        ? (x.theme as AppSettings['theme'])
        : 'dark',
    };
  } catch {
    return fallback;
  }
}
export function saveSettings(s: StorageLike, settings: AppSettings): void {
  const clean = structuredClone(settings);
  clearSourceSession(clean.plan);
  s.setItem(
    SETTINGS_KEY,
    JSON.stringify({ schemaVersion: '1.0.0', settings: clean }),
  );
}
export type PresetRead =
  | { status: 'ready'; presets: MotionPreset[]; raw: string | null }
  | { status: 'unreadable'; raw: string | null; messageZh: string };
export function inspectCustomPresets(s: StorageLike): PresetRead {
  let raw: string | null = null;
  try {
    raw = s.getItem(PRESETS_KEY);
    return {
      status: 'ready',
      presets: raw === null || raw === '' ? [] : parsePresetBundle(raw),
      raw,
    };
  } catch (error) {
    return {
      status: 'unreadable',
      raw,
      messageZh:
        '自訂預設無法讀取，原始資料已保留；另存、更新、重新命名、刪除及合併匯入已停止。請先匯出原始備份，再修復或分拆 JSON，使用復原功能。原因：' +
        (error instanceof Error ? error.message : '瀏覽器不允許讀取儲存資料。'),
    };
  }
}
export function listCustomPresets(s: StorageLike): MotionPreset[] {
  const result = inspectCustomPresets(s);
  if (result.status === 'unreadable') throw new Error(result.messageZh);
  return result.presets;
}
export function rawPresetBackup(s: StorageLike): string {
  const raw = s.getItem(PRESETS_KEY);
  if (raw === null || raw === '') throw new Error('沒有可匯出的原始預設資料。');
  return raw;
}
function custom(p: MotionPreset): void {
  validate(p, PRESET_SCHEMA);
  validateMotionPlan(p.plan);
  if (p.plan.mode !== p.mode) throw new Error('預設模式與設定不吻合。');
  if (
    !p.updatedAt ||
    !Number.isFinite(Date.parse(p.updatedAt)) ||
    new Date(p.updatedAt).toISOString() !== p.updatedAt
  )
    throw new Error('預設時間無效。');
}
export function parsePresetBundle(raw: string): MotionPreset[] {
  const v = parseSafeJson(raw);
  validate(v, PRESET_BUNDLE_SCHEMA);
  const presets = (v as { presets: MotionPreset[] }).presets;
  for (const p of presets) custom(p);
  if (new Set(presets.map((p) => p.id)).size !== presets.length)
    throw new Error('預設 ID 重複。');
  return structuredClone(presets);
}
export function presetBundle(presets: MotionPreset[]): string {
  const data = {
    format: 'video-prompt-generator-presets',
    schemaVersion: '1.0.0',
    presets,
  };
  validate(data, PRESET_BUNDLE_SCHEMA);
  for (const p of presets) custom(p);
  if (new Set(presets.map((p) => p.id)).size !== presets.length)
    throw new Error('預設 ID 重複。');
  const raw = JSON.stringify(data, null, 2);
  assertJsonByteLimit(
    raw,
    '合併後的自訂預設超過 1 MiB（1,048,576 UTF-8 bytes）；原有資料未更改。請先匯出備份，刪除不需要的預設或縮短備註，再分批匯入。分批匯入仍須符合儲存總量上限。',
  );
  return raw;
}
function write(s: StorageLike, ps: MotionPreset[]): void {
  if (ps.length > 100) throw new Error('最多儲存 100 個自訂預設。');
  // Validate the exact representation before the single atomic localStorage write.
  const raw = ps.length ? presetBundle(ps) : '';
  try {
    s.setItem(PRESETS_KEY, raw);
  } catch {
    throw new Error(
      '無法寫入自訂預設（瀏覽器儲存空間或政策限制）；原有資料未更改。請先匯出備份，再釋放儲存空間。',
    );
  }
}
export function restorePresets(
  s: StorageLike,
  raw: string,
  backedUpRaw: string,
): MotionPreset[] {
  const restored = parsePresetBundle(raw);
  const current = inspectCustomPresets(s);
  if (current.status !== 'unreadable')
    throw new Error('資料目前可正常讀取；請使用一般匯入以保留已有預設。');
  if (current.raw === null || current.raw !== backedUpRaw)
    throw new Error('原始資料已變更或無法讀取；請重新匯出原始備份後再復原。');
  // Replacement is only available through the explicit, backed-up recovery workflow.
  write(s, restored);
  return restored;
}
export function savePreset(
  s: StorageLike,
  name: string,
  plan: MotionPlan,
  id: string = crypto.randomUUID(),
  timestamp = new Date().toISOString(),
): MotionPreset {
  const label = safeText(name, 80);
  if (!label) throw new Error('請填寫預設名稱。');
  const clean = normalizePlan(plan);
  clean.source.image = null;
  clean.source.region = null;
  clean.presetId = id;
  const preset: MotionPreset = {
    id,
    nameEn: label,
    nameZh: label,
    descriptionZh: '自訂動作設定',
    category: 'custom',
    mode: clean.mode,
    plan: clean,
    providerNotesZh: [],
    warningsZh: [],
    updatedAt: timestamp,
  };
  custom(preset);
  const ps = listCustomPresets(s),
    index = ps.findIndex((p) => p.id === id);
  if (index >= 0) ps[index] = preset;
  else ps.push(preset);
  write(s, ps);
  return preset;
}
export function renamePreset(s: StorageLike, id: string, name: string): void {
  const p = listCustomPresets(s).find((p) => p.id === id);
  if (!p) throw new Error('找不到自訂預設。');
  savePreset(s, name, p.plan, id);
}
export function deletePreset(s: StorageLike, id: string): void {
  write(
    s,
    listCustomPresets(s).filter((p) => p.id !== id),
  );
}
export function importPresets(
  s: StorageLike,
  raw: string,
  idFactory: () => string = () => crypto.randomUUID(),
): MotionPreset[] {
  // Validate the entire batch before writing once. Existing presets cannot be overwritten by supplied IDs.
  const imported = parsePresetBundle(raw).map((p) => {
    const id = idFactory();
    return { ...p, id, plan: { ...p.plan, presetId: id } };
  });
  const all = [...listCustomPresets(s), ...imported];
  if (new Set(all.map((p) => p.id)).size !== all.length)
    throw new Error('新預設 ID 衝突。');
  write(s, all);
  return imported;
}
