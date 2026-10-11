import type {
  MotionPlan,
  CompiledPrompt,
  AuditFinding,
} from '../models/motion-plan';
import { compilePrompt } from '../engine/compile';
import { normalizePlan, isRecord } from '../engine/motion-planner';
import {
  PROVIDER_CAPABILITIES,
  VERIFIED_AT,
} from '../models/provider-capabilities';
import { EXPORT_SCHEMA, PLAN_SCHEMA, parseSafeJson, validate } from './schema';
import { EXPORT_PROFILES } from './export-profiles';
export interface IntegrationExport {
  format: 'video-prompt-generator';
  schemaVersion: '1.0.0';
  provider: MotionPlan['provider'];
  modelSelection: MotionPlan['model'];
  generationMode: MotionPlan['mode'];
  motionPlan: MotionPlan;
  sourceImageReference: MotionPlan['source']['image'];
  generatedEnglishPrompt: string;
  compilerVersion: string;
  capabilitySnapshotDate: string;
  presetIdentity: string | null;
  loopSettings: { strategy: MotionPlan['loop']; returnToStart: boolean };
  qcWarnings: AuditFinding[];
  exportTimestamp: string;
}
export function validateMotionPlan(v: unknown, normalize = true): MotionPlan {
  validate(v, PLAN_SCHEMA);
  const p = v as MotionPlan;
  if (PROVIDER_CAPABILITIES[p.model].provider !== p.provider)
    throw new Error('模型與供應商不吻合。');
  if (
    p.primaryMotion !== null &&
    ![...p.subjectMotions, ...p.environmentalMotions].includes(p.primaryMotion)
  )
    throw new Error('主要動作不在選項內。');
  if (
    p.source.region &&
    (p.source.region.x + p.source.region.width > 1.000001 ||
      p.source.region.y + p.source.region.height > 1.000001)
  )
    throw new Error('框選範圍超出圖片。');
  if (
    p.source.image &&
    p.source.image.width * p.source.image.height > 40_000_000
  )
    throw new Error('圖片像素過大。');
  return normalize ? normalizePlan(v) : structuredClone(p);
}
export function createExport(
  p: MotionPlan,
  timestamp = new Date().toISOString(),
): IntegrationExport {
  return exportFromOutput(compilePrompt(p), timestamp, VERIFIED_AT);
}
function exportFromOutput(
  output: CompiledPrompt,
  timestamp: string,
  snapshot: string,
): IntegrationExport {
  return {
    format: 'video-prompt-generator',
    schemaVersion: '1.0.0',
    provider: output.plan.provider,
    modelSelection: output.plan.model,
    generationMode: output.plan.mode,
    motionPlan: output.plan,
    sourceImageReference: output.plan.source.image,
    generatedEnglishPrompt: output.english,
    compilerVersion: output.compilerVersion,
    capabilitySnapshotDate: snapshot,
    presetIdentity: output.plan.presetId,
    loopSettings: {
      strategy: output.plan.loop,
      returnToStart:
        output.plan.mode === 'rotation' && output.plan.rotation.returnToStart,
    },
    qcWarnings: output.findings,
    exportTimestamp: timestamp,
  };
}
// Both operands have already passed the strict schema. Object key order has no
// JSON meaning; array order, primitive types and values still must match exactly.
function sameJsonValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b))
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((value, index) => sameJsonValue(value, b[index]))
    );
  if (isRecord(a) && isRecord(b)) {
    const keys = Object.keys(a);
    return (
      keys.length === Object.keys(b).length &&
      keys.every(
        (key) => Object.hasOwn(b, key) && sameJsonValue(a[key], b[key]),
      )
    );
  }
  return a === b;
}
export interface ConfigurationReview {
  originalRaw: string;
  original: IntegrationExport;
  recompiled: IntegrationExport;
  migrationRequired: boolean;
  changesZh: string[];
}
export function reviewConfigurationImport(raw: string): ConfigurationReview {
  const v = parseSafeJson(raw);
  validate(v, EXPORT_SCHEMA);
  if (!isRecord(v)) throw new Error('JSON 無效。');
  const profile = EXPORT_PROFILES.find(
    (p) =>
      p.compilerVersion === v.compilerVersion &&
      p.capabilitySnapshotDate === v.capabilitySnapshotDate,
  );
  if (!profile)
    throw new Error(
      '此 compiler／能力版本組合尚未支援安全遷移；請保留原檔，勿修改版本欄位。',
    );
  const p = validateMotionPlan(v.motionPlan, false);
  const expected = exportFromOutput(
    profile.compile(p),
    String(v.exportTimestamp),
    profile.capabilitySnapshotDate,
  );
  for (const key of [
    'provider',
    'modelSelection',
    'generationMode',
    'sourceImageReference',
    'presetIdentity',
    'loopSettings',
    'qcWarnings',
    'generatedEnglishPrompt',
  ] as const) {
    if (!sameJsonValue(v[key], expected[key]))
      throw new Error('匯出欄位 ' + key + ' 與 Motion Plan 不一致。');
  }
  if (
    typeof v.exportTimestamp !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T.*Z$/.test(v.exportTimestamp) ||
    !Number.isFinite(Date.parse(v.exportTimestamp)) ||
    new Date(v.exportTimestamp).toISOString() !== v.exportTimestamp
  )
    throw new Error('匯出時間無效。');
  // Exporter-produced plans are already canonical. Reject any normalization
  // that would silently discard/trim/change imported user intent.
  if (!sameJsonValue(v.motionPlan, expected.motionPlan))
    throw new Error(
      'Motion Plan 不是原編譯器的標準表示；請保留原檔並檢查設定。',
    );
  const original = structuredClone(v) as unknown as IntegrationExport;
  const recompiled = createExport(p, original.exportTimestamp);
  if (!sameJsonValue(original.motionPlan, recompiled.motionPlan))
    throw new Error(
      '新編譯器不能無損保留此舊設定；請保留原檔並明確調整設定，不會自動改寫意圖。',
    );
  const migrationRequired =
    original.compilerVersion !== recompiled.compilerVersion ||
    original.capabilitySnapshotDate !== recompiled.capabilitySnapshotDate;
  return {
    originalRaw: raw,
    original,
    recompiled,
    migrationRequired,
    changesZh: migrationRequired
      ? [
          `原檔 compiler ${original.compilerVersion}／能力快照 ${original.capabilitySnapshotDate} 已通過其歷史驗證器；新編譯使用 ${recompiled.compilerVersion}／${recompiled.capabilitySnapshotDate}。`,
          '原英文提示及原始 JSON 保留供備份；動作設定不變，新提示及新審核須重新檢查。',
        ]
      : [],
  };
}
export function importConfiguration(
  raw: string,
  options: { acceptMigration?: boolean } = {},
): MotionPlan {
  const review = reviewConfigurationImport(raw);
  if (review.migrationRequired && !options.acceptMigration)
    throw new Error(
      '舊版本設定須先比較原提示與新提示，再明確確認遷移；原檔沒有更改。',
    );
  return structuredClone(review.recompiled.motionPlan);
}
export function plainText(output: CompiledPrompt): string {
  return [
    'Video Prompt Generator · ' +
      PROVIDER_CAPABILITIES[output.plan.model].displayName,
    output.english,
    '繁體中文解讀',
    output.chinese,
    '檢查及工作流程',
    ...output.findings.map((f) => '[' + f.severity + '] ' + f.messageZh),
    ...output.workflowZh,
  ].join('\n\n');
}
export function downloadFile(
  name: string,
  data: string,
  mime = 'application/json',
): void {
  const url = URL.createObjectURL(new Blob([data], { type: mime })),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function copyEnglish(text: string): Promise<void> {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      /* Browser policy may require the local fallback. */
    }
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  area.setAttribute('aria-label', '英文提示詞複製');
  document.body.append(area);
  area.select();
  const ok = document.execCommand('copy');
  area.remove();
  if (!ok) throw new Error('瀏覽器不允許複製，請直接選取英文提示詞。');
}
