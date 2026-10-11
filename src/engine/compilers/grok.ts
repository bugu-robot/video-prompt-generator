import type { MotionPlan, CompiledPrompt } from '../../models/motion-plan';
import { section } from '../intent';
import { compileWith } from './common';
export function compileGrok(p: MotionPlan): CompiledPrompt {
  return compileWith(
    p,
    section(
      'opening',
      'Animation intent',
      '動畫意圖',
      'Bring the supplied image into motion. Continue its visible scene with the selected actions and timing below.',
      '讓提供的原圖郁起來，以以下所選動作和節奏延續可見場景。',
    ),
    'direct',
  );
}
