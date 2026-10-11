import type {
  CompiledPrompt,
  MotionPlan,
  PromptSection,
} from '../../models/motion-plan';
import { PROVIDER_CAPABILITIES } from '../../models/provider-capabilities';
import { normalizePlan } from '../motion-planner';
import { auditPlan } from '../quality-check';
import { intentSections } from '../intent';
export const COMPILER_VERSION = '1.0.0';
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
  if (p.loop === 'match-pose')
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
export function compileWith(
  p: MotionPlan,
  opening: PromptSection,
  style: 'natural' | 'cinematic' | 'direct',
): CompiledPrompt {
  const plan = normalizePlan(p),
    sections = [opening, ...intentSections(plan)];
  const english =
    plan.length === 'concise'
      ? sections.map((s) => s.en).join(' ')
      : style === 'cinematic'
        ? sections.map((s) => s.titleEn + ': ' + s.en).join('\n\n')
        : sections.map((s) => s.en).join('\n\n');
  const chinese = sections.map((s) => s.titleZh + '：' + s.zh).join('\n\n');
  return {
    compilerVersion: COMPILER_VERSION,
    plan,
    sections,
    english,
    chinese,
    findings: auditPlan(plan),
    workflowZh: workflow(plan),
  };
}
