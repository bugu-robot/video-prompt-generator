import type { MotionPlan, CompiledPrompt } from '../../models/motion-plan';
import { section } from '../intent';
import { compileWith } from './common';
export function compileOmni(p:MotionPlan):CompiledPrompt {
  return compileWith(p,section('opening','Scene continuation','場景延續','Animate the supplied image as a natural continuation of the existing scene, following the motion intent below.','把提供的原圖作自然場景延續，按以下動作意圖動畫化。'),'natural');
}
