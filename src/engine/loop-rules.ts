import type { MotionPlan, PromptSection } from '../models/motion-plan';
export function loopSection(plan:MotionPlan):PromptSection|null {
  if(plan.loop==='none')return null;
  let en:string,zh:string;
  if(plan.loop==='match-pose') {
    en=plan.mode==='rotation'?'Aim for a repeatable boundary with matching framing and appearance.':'Let the selected movements settle back to the starting pose and framing at the end of the clip.';
    zh=plan.mode==='rotation'?'以可重複的片段邊界為目標，首尾構圖與外觀相配。':'片段結束時，讓所選動作自然回到開首姿勢和構圖。';
  } else if(plan.loop==='continuous') {en='Keep ambient movement steady across the clip boundary, without a visible stop or restart.';zh='在片段接點保持穩定的環境動作，避免明顯停頓或重新開始。';}
  else {en='Keep the beginning and ending visually calm and similar enough for a short crossfade during editing.';zh='讓片頭和片尾平靜、外觀接近，方便剪輯時作短交叉淡化。';}
  return {id:'loop',titleEn:'Loop intention',titleZh:'循環意圖',en,zh};
}
