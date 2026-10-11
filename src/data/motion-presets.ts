import type { MotionPlan, MotionPreset, GenerationMode } from '../models/motion-plan';
import { defaultPlan } from '../engine/motion-planner';
function preset(id:string,nameEn:string,nameZh:string,descriptionZh:string,category:MotionPreset['category'],mode:GenerationMode,edit:(p:MotionPlan)=>void):MotionPreset {
  const plan=defaultPlan();plan.subjectMotions=[];plan.environmentalMotions=[];plan.primaryMotion=null;plan.mode=mode;plan.loop=mode==='cinematic'?'none':'match-pose';plan.presetId=id;edit(plan);
  plan.primaryMotion=[...plan.environmentalMotions,...plan.subjectMotions][0]??null;
  return {id,nameEn,nameZh,descriptionZh,category,mode,plan,providerNotesZh:['提示由所選 provider 編譯；功能限制以當前 capability registry 為準。'],warningsZh:[mode==='rotation'?'單張原圖未驗證背面；此預設不保證幾何正確。':'只會描述原圖已存在的元素；請確認圖中確有對應動作主體。']};
}
export const BUILT_IN_PRESETS:MotionPreset[]=[
  preset('cafe-rain-window','Rainy Café Window','雨天咖啡廳窗邊','以窗上雨滴為主，杯中蒸氣為輔。','cafe','ambient',p=>{p.environmentalMotions=['rain','steam'];}),
  preset('cafe-steam','Coffee Steam','咖啡蒸氣','固定鏡頭，只讓原有熱飲的細薄蒸氣慢慢飄。','cafe','ambient',p=>{p.environmentalMotions=['steam'];p.loop='continuous';}),
  preset('cafe-morning','Quiet Morning Café','寧靜早晨咖啡廳','晨間熱飲蒸氣與原有窗簾的輕微郁動。','cafe','ambient',p=>{p.environmentalMotions=['steam','curtains'];}),
  preset('cafe-fireplace','Cozy Fireplace','溫暖壁爐','保留原有佈光，只讓壁爐火焰輕輕跳動。','cafe','ambient',p=>{p.environmentalMotions=['fire'];p.loop='continuous';}),
  preset('cafe-reading','Reading by the Window','窗邊閱讀','角色自然眨眼與呼吸；不添加書本或翻頁。','cafe','ambient',p=>{p.subjectMotions=['blink','breathing'];}),
  preset('character-blink','Gentle Blink','輕柔眨眼','有可見眼瞼的原圖角色偶爾眨眼。','character','ambient',p=>{p.subjectMotions=['blink'];p.intensity='minimal';}),
  preset('character-sleep','Sleeping Breath','熟睡呼吸','已在熟睡的主體保持閉眼，以細小呼吸起伏循環。','character','ambient',p=>{p.subjectMotions=['sleep'];p.intensity='minimal';}),
  preset('character-looking','Looking Outside','望向窗外','視線輕移；只適用於原圖已有可見眼睛的角色。','character','ambient',p=>{p.subjectMotions=['look'];}),
  preset('character-ears','Subtle Ear Movement','耳朵微動','原有可見耳朵偶爾輕輕郁動。','character','ambient',p=>{p.subjectMotions=['ears'];}),
  preset('character-tail','Gentle Tail Movement','尾巴輕擺','可見尾巴輕擺，身體留在原位。','character','ambient',p=>{p.subjectMotions=['tail'];}),
  preset('nature-leaves','Falling Autumn Leaves','秋葉飄落','只讓原有秋葉少量飄落。','nature','ambient',p=>{p.environmentalMotions=['leaves'];p.loop='continuous';}),
  preset('nature-snow','Snowfall','輕柔飄雪','原有雪景維持輕雪，不明顯累積。','nature','ambient',p=>{p.environmentalMotions=['snow'];p.loop='continuous';}),
  preset('nature-ocean','Ocean Waves','海浪起伏','已有海洋以穩定節奏起伏。','nature','ambient',p=>{p.environmentalMotions=['waves'];p.loop='continuous';}),
  preset('nature-breeze','Gentle Breeze','柔和微風','原有枝葉輕搖，不加入新樹。','nature','ambient',p=>{p.environmentalMotions=['trees'];}),
  preset('nature-clouds','Moving Clouds','雲朵緩移','已有雲朵慢慢飄移。','nature','ambient',p=>{p.environmentalMotions=['clouds'];p.loop='continuous';}),
  preset('rotation-360-turntable','360° Product Turntable','360° 產品自轉','產品沿 Y 軸順時針等速轉一圈；須先指定產品。','rotation','rotation',p=>{p.rotation.angle=360;}),
  preset('rotation-180-reveal','180° Object Reveal','180° 物件展示','物件緩慢轉半圈，適合展示側面及背面。','rotation','rotation',p=>{p.rotation.angle=180;p.rotation.returnToStart=false;p.rotation.speed='slow';p.loop='none';}),
  preset('rotation-slow-orbit','Slow Product Orbit','慢速產品繞拍','物件留在原位，由鏡頭沿 Y 軸繞拍。','rotation','rotation',p=>{p.rotation.type='orbit';p.camera='orbit';p.rotation.speed='slow';p.rotation.angle=180;p.rotation.returnToStart=false;p.loop='none';}),
  preset('rotation-character','Character Turnaround','角色全方向展示','角色剛性轉台展示，不加入肢體表演；身份須人手驗收。','rotation','rotation',p=>{p.rotation.angle=360;p.rotation.speed='uniform';}),
  preset('cinematic-locked','Locked Cinematic Shot','固定電影感鏡頭','保留原圖鏡頭，選定角色與環境作小幅動作。','cinematic','cinematic',p=>{p.subjectMotions=['breathing'];p.environmentalMotions=['steam'];}),
  preset('cinematic-push','Slow Push-In','慢慢推近','向前推近原有場景，不要求循環。','cinematic','cinematic',p=>{p.camera='push-in';}),
  preset('cinematic-parallax','Gentle Parallax','輕柔視差','原有前後景稍微錯開，保持小幅鏡頭側移。','cinematic','cinematic',p=>{p.camera='parallax';}),
  preset('cinematic-reveal','Slow Scene Reveal','慢速場景展示','由左至右慢慢展示原有場景。','cinematic','cinematic',p=>{p.camera='pan';}),
];
export function applyPreset(current:MotionPlan,preset:MotionPreset):MotionPlan {
  // Source content and selected provider stay under the user's control.
  return {...structuredClone(preset.plan),provider:current.provider,model:current.model,source:structuredClone(current.source),presetId:preset.id};
}
