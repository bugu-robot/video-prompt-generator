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
        plan.length === 'concise'
          ? "Use the supplied image as the shot's starting frame."
          : 'Use the supplied image as the starting frame of one controlled shot; direct its camera and visible action without restaging the scene.',
        '以原圖作受控鏡頭的首幀，指定鏡頭及可見動作，不重建場景設定。',
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
