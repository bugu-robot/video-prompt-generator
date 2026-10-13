import type {
  CompiledPrompt,
  MotionPlan,
  PromptSection,
} from '../../models/motion-plan';
import { PROVIDER_CAPABILITIES } from '../../models/provider-capabilities';
import { normalizePlan } from '../motion-planner';
import { auditPlan } from '../quality-check';
export const COMPILER_VERSION = '1.1.0';
export function workflow(p: MotionPlan): string[] {
  const cap = PROVIDER_CAPABILITIES[p.model];
  const result = [
    `外部網站選擇 ${cap.displayName}；本機程式不會登入或提交。`,
    '自行在供應商網站加入原圖；本機上傳與框選不會傳送至網站。',
  ];
  if (p.durationSeconds !== null)
    result.push(
      `在外部網站確認可用時長後，設定約 ${p.durationSeconds} 秒；提示文字不能更改生成控制項。`,
    );
  if (p.mode === 'rotation' && p.rotation.angle !== 360)
    result.push(
      cap.consumer.endFrame.status === 'supported'
        ? `單向 ${p.rotation.angle}° ${p.rotation.type === 'orbit' ? '鏡頭繞行' : '物件自轉'}應使用與目標方向／視角相符的不同尾幀（如使用 Flow Frames），或不設定尾幀及選擇「不要求循環」。重複播放須另行設計回程或剪輯；這裡不會更改角度、方向或路徑。`
        : `單向 ${p.rotation.angle}° 旋轉的網站首尾幀功能未核實；只有確認實際控制項支援後，才提供相符的不同尾幀。可不設定尾幀及選擇「不要求循環」，重複播放則須另行設計回程或剪輯；這裡不會更改角度、方向或路徑。`,
    );
  else if (p.loop === 'match-pose')
    result.push(
      cap.consumer.endFrame.status === 'supported'
        ? '如使用 Flow Frames，可自行把相同原圖設為首尾幀並描述中間動作；這只提高邊界相配機會。'
        : '網站首尾幀功能未核實；請先查看實際控制項，不要只靠 prompt 假定已設定尾幀。',
    );
  if (p.mode === 'rotation' && p.rotation.inputMode === 'references')
    result.push(
      cap.consumer.references.status === 'supported'
        ? '在支援的 Flow Ingredients 流程手動提供多角度圖，註明是同一物件；首幀是否可同時鎖定須另行確認。'
        : '先確認網站是否支援多參考圖影片；未確認前採用單張圖或外部 3D renderer。',
    );
  if (p.mode === 'rotation' && p.rotation.inputMode === '3d')
    result.push(
      '精確 3D 模型應在外部 renderer 轉台渲染；這裡不提供 3D 上傳或真實幾何重建。',
    );
  return result;
}
export function orderSections(
  sections: PromptSection[],
  order: string[],
): PromptSection[] {
  return [...sections].sort(
    (a, b) => order.indexOf(a.id) - order.indexOf(b.id),
  );
}
export function actionOrder(p: MotionPlan): string[] {
  return p.environmentalMotions.includes(p.primaryMotion ?? '')
    ? ['environment', 'subject']
    : ['subject', 'environment'];
}
export function compileWith(
  p: MotionPlan,
  compose: (plan: MotionPlan) => PromptSection[],
  style: 'natural' | 'cinematic' | 'direct',
): CompiledPrompt {
  const plan = normalizePlan(p),
    sections = compose(plan);
  const english =
    plan.length === 'concise'
      ? sections.map((s) => s.en).join(' ')
      : style === 'cinematic'
        ? sections.map((s) => s.titleEn + ': ' + s.en).join('\n\n')
        : sections.map((s) => s.en).join('\n\n');
  return {
    compilerVersion: COMPILER_VERSION,
    plan,
    sections,
    english,
    chinese: sections.map((s) => s.titleZh + '：' + s.zh).join('\n\n'),
    findings: auditPlan(plan),
    workflowZh: workflow(plan),
  };
}
