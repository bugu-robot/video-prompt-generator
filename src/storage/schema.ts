import {
  CAMERAS,
  INTENSITIES,
  LOOP_STRATEGIES,
  MODEL_IDS,
  MODES,
  PRESERVATIONS,
  PROVIDERS,
  SUBJECT_TYPES,
} from '../models/motion-plan';
import { SUBJECT_MOTIONS, ENVIRONMENTAL_MOTIONS } from '../data/motions';
import { isRecord } from '../engine/motion-planner';
interface Schema {
  type?:
    'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean' | 'null';
  const?: unknown;
  enum?: readonly unknown[];
  properties?: Record<string, Schema>;
  required?: string[];
  additionalProperties?: boolean;
  items?: Schema;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  anyOf?: Schema[];
}
const text = (maxLength: number): Schema => ({ type: 'string', maxLength });
const enumeration = (values: readonly unknown[]): Schema => ({
  type: 'string',
  enum: values,
});
const number = (minimum: number, maximum: number): Schema => ({
  type: 'number',
  minimum,
  maximum,
});
const integer = (minimum: number, maximum: number): Schema => ({
  type: 'integer',
  minimum,
  maximum,
});
const nullable = (s: Schema): Schema => ({ anyOf: [s, { type: 'null' }] });
const object = (properties: Record<string, Schema>): Schema => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const list = (s: Schema, maxItems: number): Schema => ({
  type: 'array',
  items: s,
  maxItems,
  uniqueItems: true,
});
const boolean: Schema = { type: 'boolean' };
export const SOURCE_SCHEMA = object({
  subjectType: enumeration(SUBJECT_TYPES),
  subjectEn: text(160),
  subjectZh: text(160),
  sceneNotesEn: text(500),
  sceneNotesZh: text(500),
  elementsConfirmed: boolean,
  image: nullable(
    object({
      name: text(200),
      mime: enumeration(['image/png', 'image/jpeg', 'image/webp']),
      bytes: integer(1, 25 * 1024 * 1024),
      width: integer(1, 12000),
      height: integer(1, 12000),
    }),
  ),
  region: nullable(
    object({
      x: number(0, 0.99),
      y: number(0, 0.99),
      width: number(0.01, 1),
      height: number(0.01, 1),
    }),
  ),
});
export const PLAN_SCHEMA = object({
  schemaVersion: { const: '1.0.0' },
  provider: enumeration(PROVIDERS),
  model: enumeration(MODEL_IDS),
  mode: enumeration(MODES),
  durationSeconds: nullable(integer(1, 60)),
  source: SOURCE_SCHEMA,
  subjectMotions: list(
    enumeration(SUBJECT_MOTIONS.map((m) => m.id)),
    SUBJECT_MOTIONS.length,
  ),
  environmentalMotions: list(
    enumeration(ENVIRONMENTAL_MOTIONS.map((m) => m.id)),
    ENVIRONMENTAL_MOTIONS.length,
  ),
  primaryMotion: nullable(text(80)),
  intensity: enumeration(INTENSITIES),
  motionTiming: enumeration(['sparse', 'natural', 'sustained']),
  camera: enumeration(CAMERAS),
  loop: enumeration(LOOP_STRATEGIES),
  preservation: list(enumeration(PRESERVATIONS), PRESERVATIONS.length),
  rotation: object({
    type: enumeration(['turntable', 'orbit']),
    angle: { type: 'integer', enum: [90, 180, 360] },
    direction: enumeration(['clockwise', 'counterclockwise']),
    speed: enumeration(['uniform', 'slow', 'ease']),
    axis: enumeration(['y', 'x', 'z']),
    centered: boolean,
    stableFraming: boolean,
    consistentScale: boolean,
    stableLighting: boolean,
    geometry: boolean,
    details: boolean,
    returnToStart: boolean,
    inputMode: enumeration(['single', 'references', '3d']),
  }),
  audio: enumeration(['none-requested', 'ambient', 'provider-default']),
  length: enumeration(['concise', 'balanced', 'detailed']),
  presetId: nullable(text(100)),
});
export const PRESET_SCHEMA = object({
  id: { type: 'string', minLength: 1, maxLength: 100 },
  nameEn: { type: 'string', minLength: 1, maxLength: 80 },
  nameZh: { type: 'string', minLength: 1, maxLength: 80 },
  descriptionZh: text(500),
  category: enumeration(['custom']),
  mode: enumeration(MODES),
  plan: PLAN_SCHEMA,
  providerNotesZh: list(text(500), 20),
  warningsZh: list(text(500), 20),
  updatedAt: text(40),
});
export const PRESET_BUNDLE_SCHEMA = object({
  format: { const: 'video-prompt-generator-presets' },
  schemaVersion: { const: '1.0.0' },
  presets: { type: 'array', minItems: 1, maxItems: 100, items: PRESET_SCHEMA },
});
const FINDING_SCHEMA = object({
  id: text(160),
  severity: enumeration(['error', 'warning', 'recommendation']),
  messageZh: text(2000),
  messageEn: text(2000),
});
export const EXPORT_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://github.com/bugu-robot/video-prompt-generator/blob/main/docs/motion-plan-export.schema.json',
  title: 'Video Prompt Generator export v1',
  ...object({
    format: { const: 'video-prompt-generator' },
    schemaVersion: { const: '1.0.0' },
    provider: enumeration(PROVIDERS),
    modelSelection: enumeration(MODEL_IDS),
    generationMode: enumeration(MODES),
    motionPlan: PLAN_SCHEMA,
    sourceImageReference: SOURCE_SCHEMA.properties!.image!,
    generatedEnglishPrompt: { type: 'string', minLength: 1, maxLength: 30000 },
    compilerVersion: { const: '1.0.0' },
    capabilitySnapshotDate: { const: '2026-10-11' },
    presetIdentity: nullable(text(100)),
    loopSettings: object({
      strategy: enumeration(LOOP_STRATEGIES),
      returnToStart: boolean,
    }),
    qcWarnings: { type: 'array', items: FINDING_SCHEMA, maxItems: 200 },
    exportTimestamp: { type: 'string', minLength: 20, maxLength: 40 },
  }),
};
const unsafe = new Set(['__proto__', 'prototype', 'constructor']);
export function assertSafe(v: unknown, depth = 0): void {
  if (depth > 25) throw new Error('JSON 層級太深。');
  if (Array.isArray(v)) {
    if (v.length > 300) throw new Error('JSON 陣列過大。');
    for (const i of v) assertSafe(i, depth + 1);
  } else if (isRecord(v)) {
    for (const [k, value] of Object.entries(v)) {
      if (unsafe.has(k)) throw new Error('JSON 含不安全鍵值。');
      assertSafe(value, depth + 1);
    }
  }
}
export function validate(v: unknown, s: Schema, path = 'root'): void {
  if (s.anyOf) {
    for (const option of s.anyOf) {
      try {
        validate(v, option, path);
        return;
      } catch {
        /* Try the next explicit union. */
      }
    }
    throw new Error(path + ' 格式不符。');
  }
  if ('const' in s && v !== s.const)
    throw new Error(path + ' 版本／常數不符。');
  if (s.enum && !s.enum.includes(v)) throw new Error(path + ' 選項無效。');
  if (
    (s.type === 'null' && v !== null) ||
    (s.type === 'boolean' && typeof v !== 'boolean')
  )
    throw new Error(path + ' 類型不符。');
  if (s.type === 'string') {
    if (
      typeof v !== 'string' ||
      v.length > (s.maxLength ?? Infinity) ||
      v.trim().length < (s.minLength ?? 0) ||
      ([...v].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127) &&
        path !== 'root.generatedEnglishPrompt')
    )
      throw new Error(path + ' 文字無效。');
  }
  if (s.type === 'number' || s.type === 'integer') {
    if (
      typeof v !== 'number' ||
      !Number.isFinite(v) ||
      (s.type === 'integer' && !Number.isInteger(v)) ||
      v < (s.minimum ?? -Infinity) ||
      v > (s.maximum ?? Infinity)
    )
      throw new Error(path + ' 數值無效。');
  }
  if (s.type === 'array') {
    if (
      !Array.isArray(v) ||
      v.length > (s.maxItems ?? Infinity) ||
      v.length < (s.minItems ?? 0)
    )
      throw new Error(path + ' 陣列無效。');
    if (
      s.uniqueItems &&
      new Set(v.map((x) => JSON.stringify(x))).size !== v.length
    )
      throw new Error(path + ' 有重複項。');
    if (s.items) v.forEach((x, i) => validate(x, s.items!, path + '.' + i));
  }
  if (s.type === 'object') {
    if (!isRecord(v)) throw new Error(path + ' 必須是物件。');
    for (const key of s.required ?? [])
      if (!(key in v)) throw new Error(path + '.' + key + ' 缺失。');
    for (const [key, value] of Object.entries(v)) {
      const child = s.properties?.[key];
      if (!child && s.additionalProperties === false)
        throw new Error(path + '.' + key + ' 未知欄位。');
      if (child) validate(value, child, path + '.' + key);
    }
  }
}
export const MAX_JSON_BYTES = 1024 * 1024;
export function jsonByteLength(raw: string): number {
  return new TextEncoder().encode(raw).byteLength;
}
export function assertJsonByteLimit(
  raw: string,
  message = 'JSON 不能超過 1 MiB（1,048,576 UTF-8 bytes）。',
): void {
  if (jsonByteLength(raw) > MAX_JSON_BYTES) throw new Error(message);
}
export function parseSafeJson(raw: string): unknown {
  assertJsonByteLimit(raw);
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('JSON 不是有效格式。');
  }
  assertSafe(value);
  return value;
}
