import type { MotionPlan, CompiledPrompt } from '../../models/motion-plan';
import { section, intentSections, type MotionExpression } from '../intent';
import { compileWith, actionOrder, orderSections } from './common';
// Cinematographic shot specification: camera first, explicit main/supporting
// action hierarchy, pace/duration/boundary and then preservation.
const express: MotionExpression = (c, concise) => ({
  en:
    (c.primary
      ? 'Primary motion: '
      : concise
        ? 'Supporting: '
        : 'Secondary motion: ') +
    c.conditionEn +
    (c.kind === 'subject' ? `${c.subjectEn} should ` : '') +
    c.actionEn +
    '.',
  zh:
    (c.primary ? '主要動作：' : '次要動作：') +
    c.conditionZh +
    (c.kind === 'subject' ? `${c.subjectZh}要` : '') +
    c.actionZh +
    '。',
});
export function compileVeo(p: MotionPlan): CompiledPrompt {
  return compileWith(
    p,
    (plan) => [
      section(
        'opening',
        'Image-to-video shot',
        '原圖動畫鏡頭',
        plan.mode === 'rotation' && plan.rotation.inputMode === 'references'
          ? plan.length === 'concise'
            ? 'Use the supplied views as references for the same object in one controlled shot.'
            : 'Use the supplied views as references for the same object in one controlled shot; preserve its appearance while following the requested rotation path.'
          : plan.length === 'concise'
            ? "Use the supplied image as the shot's starting frame."
            : 'Use the supplied image as the starting frame of one controlled shot; direct its camera and visible action without restaging the scene.',
        plan.mode === 'rotation' && plan.rotation.inputMode === 'references'
          ? '以提供的多角度圖片作同一物件的參考，保留外觀並遵守所選旋轉路徑，不假定已鎖定首幀。'
          : '以原圖作受控鏡頭的首幀，指定鏡頭及可見動作，不重建場景設定。',
      ),
      ...orderSections(intentSections(plan, express), [
        'region',
        'camera',
        'rotation',
        ...actionOrder(plan),
        'pacing',
        'duration',
        'continuity',
        'loop',
        'preservation',
        'notes',
        'audio',
      ]),
    ],
    'cinematic',
  );
}
