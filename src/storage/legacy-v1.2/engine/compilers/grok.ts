import type { MotionPlan, CompiledPrompt } from '../../models/motion-plan';
import { section, intentSections, type MotionExpression } from '../intent';
import { compileWith, actionOrder, orderSections } from './common';
// Direct I2V action commands, immediately followed by their timing, then the
// camera and endpoint behavior. xAI API examples inform wording, not UI gates.
const express: MotionExpression = (c, concise) => ({
  en:
    (c.primary ? 'Primary motion: ' : concise ? 'Also: ' : 'Also animate: ') +
    c.conditionEn +
    (c.kind === 'subject' ? `${c.subjectEn}: ` : '') +
    c.actionEn +
    '.',
  zh:
    (c.primary ? '主要動作：' : '亦作以下動畫：') +
    c.conditionZh +
    (c.kind === 'subject' ? `${c.subjectZh}：` : '') +
    c.actionZh +
    '。',
});
export function compileGrok(p: MotionPlan): CompiledPrompt {
  return compileWith(
    p,
    (plan) => [
      section(
        'opening',
        'Animation intent',
        '動畫意圖',
        plan.length === 'concise'
          ? 'Animate this image.'
          : 'Animate the supplied image with the following actions; use its visible content as the starting reference.',
        '將原圖按以下動作動畫化，以可見內容作起始參考。',
      ),
      ...orderSections(intentSections(plan, express), [
        'region',
        'rotation',
        ...actionOrder(plan),
        'duration',
        'pacing',
        'camera',
        'loop',
        'preservation',
        'continuity',
        'notes',
        'audio',
      ]),
    ],
    'direct',
  );
}
