import type { MotionPlan, CompiledPrompt } from '../../models/motion-plan';
import { section, intentSections, type MotionExpression } from '../intent';
import { compileWith, actionOrder, orderSections } from './common';
// Natural conversation: motion intent first, concurrent accompaniment, then
// camera/continuity constraints. Never re-describe the unseen source scene.
const express: MotionExpression = (c, concise) => {
  const actionEn =
    c.kind === 'subject' ? `let ${c.subjectEn} ${c.actionEn}` : c.actionEn;
  const actionZh =
    c.kind === 'subject' ? `讓${c.subjectZh}${c.actionZh}` : c.actionZh;
  return {
    en:
      (c.primary ? 'Primary motion: ' : concise ? 'Also: ' : 'Alongside it, ') +
      c.conditionEn +
      actionEn +
      '.',
    zh: (c.primary ? '主要動作：' : '同時，') + c.conditionZh + actionZh + '。',
  };
};
export function compileOmni(p: MotionPlan): CompiledPrompt {
  return compileWith(
    p,
    (plan) => [
      section(
        'opening',
        'Scene continuation',
        '場景延續',
        plan.length === 'concise'
          ? 'Continue this image naturally.'
          : 'Continue the supplied image naturally, focusing on the requested movement.',
        '自然延續原圖，以所選動作為重點。',
      ),
      ...orderSections(intentSections(plan, express), [
        'region',
        'rotation',
        ...actionOrder(plan),
        'pacing',
        'camera',
        'preservation',
        'loop',
        'duration',
        'continuity',
        'notes',
        'audio',
      ]),
    ],
    'natural',
  );
}
