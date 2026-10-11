import type { MotionPlan, VariationId, CompiledPrompt } from '../models/motion-plan';
import { compilePrompt } from './compile';
import { normalizePlan } from './motion-planner';
export interface PromptVariation {id:VariationId;nameZh:string;descriptionZh:string;output:CompiledPrompt;changesZh:string[]}
export function generateVariations(p:MotionPlan):PromptVariation[] {
  const base=normalizePlan(p),a=structuredClone(base),b=structuredClone(base),c=structuredClone(base);
  a.motionTiming='sparse';b.motionTiming='natural';c.motionTiming='sustained';
  if(base.mode!=='rotation') {
    a.intensity='minimal';
    const all=[...base.subjectMotions,...base.environmentalMotions];
    const keep=[base.primaryMotion??all[0],...all.filter(id=>id!==base.primaryMotion)].filter((x):x is string=>Boolean(x)).slice(0,2);
    a.subjectMotions=a.subjectMotions.filter(id=>keep.includes(id));a.environmentalMotions=a.environmentalMotions.filter(id=>keep.includes(id));
  }
  const rotationBound=base.mode==='rotation'&&base.rotation.speed!=='ease';
  return [
    {id:'A',nameZh:'保守',descriptionZh:'減少次要動作，動作短暫疏落。',output:compilePrompt(a),changesZh:base.mode==='rotation'?['保留旋轉角度、方向、軸和幾何約束；柔和加減速只適用於已選緩入緩出。']:['主要動作優先，最多一個次要動作。','幅度極少，角色動作短暫疏落。']},
    {id:'B',nameZh:'平衡 · 推薦',descriptionZh:'完整保留所選動作，以自然節奏呈現。',output:compilePrompt(b),changesZh:['保留完整所選動作與約束。','自然節奏，克制而易讀。']},
    {id:'C',nameZh:'生動',descriptionZh:'延長所選動作的可見時間，保留強度上限。',output:compilePrompt(c),changesZh:base.mode==='rotation'?['已選緩入緩出時，調整加減速所佔時間；角度、方向、軸保持一致。']:['不加入新物件或動作。','環境持續活動，角色動作維持較長時間；不超出所選幅度。']},
  ].map(v=> {
    if(rotationBound)v.changesZh.push('等速／穩定慢轉加上固定角度的純旋轉沒有可變動作自由度，因此三版核心 prompt 相同；不會強行加入額外動作。');
    return v as PromptVariation;
  });
}
