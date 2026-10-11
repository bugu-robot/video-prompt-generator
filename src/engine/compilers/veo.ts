import type { MotionPlan, CompiledPrompt } from '../../models/motion-plan';
import { section } from '../intent';
import { compileWith } from './common';
export function compileVeo(p:MotionPlan):CompiledPrompt {
  return compileWith(p,section('opening','Image-to-video shot','原圖動畫鏡頭','Continue the supplied image as the visual starting reference for a single controlled shot. Direct the camera and selected visible action as follows.','以提供的原圖作起始視覺參考，建立一個受控鏡頭，按以下鏡頭及可見動作指示拍攝。'),'cinematic');
}
