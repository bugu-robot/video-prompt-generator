import type { MotionPlan, PromptSection, Preservation } from '../models/motion-plan';
import { MOTION_BY_ID } from '../data/motions';
import { CAMERA_BY_ID } from '../data/cameras';
import { PRESERVATION_LABELS, SUBJECT_LABELS } from '../i18n/zh-HK';
import { loopSection } from './loop-rules';
export function section(id:string,titleEn:string,titleZh:string,en:string,zh:string):PromptSection {return {id,titleEn,titleZh,en,zh};}
export function subject(p:MotionPlan):{en:string;zh:string} {
  return {en:p.source.subjectEn||SUBJECT_LABELS[p.source.subjectType].en,zh:p.source.subjectZh||SUBJECT_LABELS[p.source.subjectType].zh+(p.source.subjectEn?'（英文主體：'+p.source.subjectEn+'）':'')};
}
const intensityText = {minimal:{en:'Use the smallest natural movement amplitude.',zh:'使用極少、自然的動作幅度。'},subtle:{en:'Keep movement subtle and restrained.',zh:'動作保持細微而克制。'},moderate:{en:'Use clearly readable but controlled movement, without exaggerated action.',zh:'動作可以明顯可見，但保持受控，避免誇張。'}};
const timingText = {sparse:{en:'Make character gestures brief and infrequent; keep selected continuous environmental motion very faint.',zh:'角色動作短暫而疏落；所選連續環境動作保持十分微弱。'},natural:{en:'Let selected movements recur at relaxed, natural intervals.',zh:'讓所選動作以放鬆、自然的節奏重現。'},sustained:{en:'Keep the selected environmental movement active throughout; allow character gestures to last longer within the chosen intensity, with natural rests.',zh:'所選環境動作持續進行；在所選強度內，角色動作維持較長時間並有自然休息。'}};
function motionSection(p:MotionPlan,kind:'subject'|'environment'):PromptSection|null {
  const ids=kind==='subject'?p.subjectMotions:p.environmentalMotions;
  if(!ids.length)return null;
  const ordered=[...ids].sort((a,b)=>a===p.primaryMotion?-1:b===p.primaryMotion?1:0);
  const s=subject(p);
  const lines=ordered.flatMap(id=>{
    const m=MOTION_BY_ID.get(id);
    if(!m)return [];
    const priority=id===p.primaryMotion;
    let en=kind==='subject'?`${s.en}: ${m.en}.`:`${m.en.charAt(0).toUpperCase()+m.en.slice(1)}.`;
    let zh=kind==='subject'?`${s.zh}：${m.zh}。`:`${m.zh}。`;
    if(!p.source.elementsConfirmed){en=`If ${m.elementEn} is already visible in the source image, ${kind==='subject'?`${s.en} should `:''}${m.en}.`;zh=`如原圖已有${m.elementZh}，${kind==='subject'?s.zh+'要':''}${m.zh}。`;}
    return [{en:(priority?'Primary motion: ':'Secondary motion: ')+en,zh:(priority?'主要動作：':'次要動作：')+zh}];
  });
  return section(kind==='subject'?'subject':'environment',kind==='subject'?'Subject motion':'Environmental motion',kind==='subject'?'主體動作':'環境動作',lines.map(l=>l.en).join(' '),lines.map(l=>l.zh).join(' '));
}
export function rotationSection(p:MotionPlan):PromptSection {
  const r=p.rotation,s=subject(p),directionEn=r.direction==='clockwise'?'clockwise':'counterclockwise',directionZh=r.direction==='clockwise'?'順時針':'逆時針';
  const axisEn={y:'vertical Y-axis',x:'horizontal X-axis',z:'depth Z-axis aligned with the viewing direction'}[r.axis];
  const axisZh={y:'垂直 Y 軸',x:'水平 X 軸',z:'沿視線的深度 Z 軸'}[r.axis];
  const pathEn=r.type==='turntable'?`Rotate ${s.en} itself ${directionEn} through ${r.angle} degrees around its own ${axisEn}; the camera remains stationary.`:`Keep ${s.en} stationary; move the camera ${directionEn} through a ${r.angle}-degree orbit around the object's ${axisEn}.`;
  const pathZh=r.type==='turntable'?`${s.zh}本身沿自己的${axisZh}${directionZh}旋轉 ${r.angle}°；鏡頭保持靜止。`:`${s.zh}留在原位；鏡頭繞物件的${axisZh}${directionZh}移動 ${r.angle}°。`;
  const speedEn=r.speed==='uniform'?'Maintain uniform angular speed throughout, including the clip boundary.':r.speed==='slow'?'Use slow, steady angular movement throughout.':p.motionTiming==='sparse'?'Use very gentle acceleration and deceleration, with a long steady middle portion.':p.motionTiming==='sustained'?'Use a clearly defined smooth ease-in and ease-out, with a shorter steady middle portion.':'Use smooth, symmetrical ease-in and ease-out.';
  const speedZh=r.speed==='uniform'?'全程保持等角速度，包括片段接點。':r.speed==='slow'?'全程以緩慢而穩定的角度速度移動。':p.motionTiming==='sparse'?'十分輕柔地加速與減速，中間較長時間等速。':p.motionTiming==='sustained'?'以較清楚、平滑的加速和減速，中間等速部分較短。':'使用平滑、對稱的加速和減速。';
  const constraints:{en:string;zh:string}[]=[];
  if(r.centered)constraints.push({en:'Keep the object centered.',zh:'物件保持置中。'});
  if(r.stableFraming)constraints.push({en:'Keep the framing stable without abrupt reframing.',zh:'構圖穩定，不突然重新取景。'});
  if(r.consistentScale)constraints.push({en:'Maintain consistent apparent object scale.',zh:'物件在畫面中的大小保持一致。'});
  if(r.stableLighting)constraints.push({en:'Keep lighting sources fixed in the scene.',zh:'光源保持固定在場景中。'});
  if(r.geometry)constraints.push({en:'Preserve the visible object geometry and proportions during the turn.',zh:'旋轉時保留可見物件幾何與比例。'});
  if(r.details)constraints.push({en:'Retain the identifying markings and material details.',zh:'保留辨識標記及材質細節。'});
  if(r.angle===360)constraints.push({en:'Complete one full revolution.',zh:'完成完整一圈。'});
  if(r.returnToStart&&r.angle===360)constraints.push({en:r.type==='turntable'?'Finish at the starting object orientation.':'Finish at the starting camera position and viewing direction.',zh:r.type==='turntable'?'結束時回到物件的起始方向。':'結束時回到鏡頭的起始位置和視線。'});
  return section('rotation',r.type==='turntable'?'Object turntable':'Camera orbit',r.type==='turntable'?'物件自轉':'鏡頭繞行',[pathEn,speedEn,...constraints.map(c=>c.en)].join(' '),[pathZh,speedZh,...constraints.map(c=>c.zh)].join(' '));
}
function preservationSection(p:MotionPlan):PromptSection|null {
  const character=['character','cat'].includes(p.source.subjectType)||p.mode!=='rotation'&&p.subjectMotions.length>0;
  const applicable=p.preservation.filter(id=>{
    if(id==='face')return character;
    if(id==='identity')return character||p.mode==='rotation';
    if(id==='proportions'&&p.mode==='rotation'&&p.rotation.geometry)return false;
    if(id==='lighting'&&p.mode==='rotation'&&p.rotation.stableLighting)return false;
    if(id==='composition'&&p.mode==='rotation'&&p.rotation.stableFraming)return false;
    return true;
  });
  if(!applicable.length)return null;
  const label=(id:Preservation):{en:string;zh:string}=>id==='composition'&&p.camera!=='locked'?{en:'relative scene layout during camera movement',zh:'鏡頭移動時的場景相對佈局'}:PRESERVATION_LABELS[id];
  const en=applicable.map(id=>label(id).en).join(', '),zh=applicable.map(id=>label(id).zh).join('、');
  return section('preservation','Preserve from source','原圖保留項目',`Preserve ${en} from the source image${!p.source.elementsConfirmed&&character?', where those features are visible':''}.`,`保留原圖的${zh}${!p.source.elementsConfirmed&&character?'（只適用於原圖可見的特徵）':''}。`);
}
export function intentSections(p:MotionPlan):PromptSection[] {
  const sections:PromptSection[]=[];
  if(p.source.region) {
    const r=p.source.region,cx=r.x+r.width/2,cy=r.y+r.height/2;
    const horizontal=cx<0.33?'left':cx>0.67?'right':'central',vertical=cy<0.33?'upper':cy>0.67?'lower':'middle';
    const zoneEn=`${vertical}-${horizontal}`,zoneZh={upper:'上方',middle:'中間',lower:'下方'}[vertical]+{left:'左側',central:'中央',right:'右側'}[horizontal];
    sections.push(section('region','Selected subject','指定主體',`The intended subject is ${subject(p).en} in the ${zoneEn} area of the source image.`,`指定主體是原圖${zoneZh}的${subject(p).zh}；框選位置只是描述，不是供應商遮罩。`));
  }
  if(p.mode==='rotation')sections.push(rotationSection(p));
  else {
    const camera=CAMERA_BY_ID.get(p.camera)!;
    sections.push(section('camera','Camera','鏡頭',camera.en,camera.zh));
    const a=motionSection(p,'subject'),b=motionSection(p,'environment');if(a)sections.push(a);if(b)sections.push(b);
    if(a||b) {
      const level=intensityText[p.intensity],timing=timingText[p.motionTiming];
      sections.push(section('pacing','Motion scale and timing','動作幅度與節奏',level.en+' '+timing.en,level.zh+timing.zh));
    }
  }
  if(p.durationSeconds!==null)sections.push(section('duration','Timing preference','時長偏好',`Pace this movement over approximately ${p.durationSeconds} seconds.`,`以約 ${p.durationSeconds} 秒安排動作；真正時長須在供應商控制項設定。`));
  const preserve=preservationSection(p);if(preserve)sections.push(preserve);
  const loop=loopSection(p);if(loop)sections.push(loop);
  if(p.source.sceneNotesEn)sections.push(section('notes','User scene notes','使用者補充',p.source.sceneNotesEn,p.source.sceneNotesZh||'未提供中文補充；英文原文：'+p.source.sceneNotesEn));
  if(p.audio==='none-requested')sections.push(section('audio','Audio intention','音訊意圖','Focus on visual motion; no audio is requested.','以視覺動作為主，沒有要求音訊；不保證輸出靜音。'));
  if(p.audio==='ambient')sections.push(section('audio','Audio intention','音訊意圖','If audio is generated, use only natural ambient sound appropriate to the visible scene, without added music or speech.','如有生成音訊，只用適合可見場景的自然環境聲，不另加音樂或說話。'));
  if(p.length==='detailed')sections.push(section('continuity','Temporal continuity','時間連續性','Use one continuous shot. Keep motion causally connected from frame to frame, with no abrupt cuts or unrelated transitions.','使用單一連續鏡頭；每幀動作自然相接，不突然切鏡或加入無關轉場。'));
  return sections;
}
