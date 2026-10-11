import { CAMERAS, INTENSITIES, LOOP_STRATEGIES, MODEL_IDS, MODES, PRESERVATIONS, PROVIDERS, SUBJECT_TYPES } from '../models/motion-plan';
import type { MotionPlan, Provider, Region, SourceImageMetadata } from '../models/motion-plan';
import { DEFAULT_MODEL, PROVIDER_CAPABILITIES } from '../models/provider-capabilities';
import { ENVIRONMENTAL_MOTIONS, SUBJECT_MOTIONS } from '../data/motions';

export function defaultPlan(): MotionPlan {
  return {
    schemaVersion:'1.0.0',provider:'omni',model:'omni-flash-1.1',mode:'ambient',durationSeconds:null,
    source:{subjectType:'unspecified',subjectEn:'',subjectZh:'',sceneNotesEn:'',sceneNotesZh:'',elementsConfirmed:false,image:null,region:null},
    subjectMotions:['breathing'],environmentalMotions:['steam','rain'],primaryMotion:'steam',intensity:'subtle',motionTiming:'natural',camera:'locked',loop:'match-pose',
    preservation:[...PRESERVATIONS],
    rotation:{type:'turntable',angle:360,direction:'clockwise',speed:'uniform',axis:'y',centered:true,stableFraming:true,consistentScale:true,stableLighting:true,geometry:true,details:true,returnToStart:true,inputMode:'single'},
    audio:'none-requested',length:'balanced',presetId:null,
  };
}
export function isRecord(v: unknown): v is Record<string,unknown> {return typeof v==='object' && v!==null && !Array.isArray(v);}
export function safeText(v: unknown, max=500): string {return typeof v==='string'? [...v].map(c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127?' ':c).join('').trim().slice(0,max):'';}
function enumeration<T extends string>(v: unknown, options: readonly T[], fallback:T):T {return typeof v==='string' && options.includes(v as T)? v as T:fallback;}
const bool = (v:unknown,fallback:boolean):boolean=>typeof v==='boolean'?v:fallback;
const finite = (v:unknown): v is number=>typeof v==='number' && Number.isFinite(v);
export function normalizeRegion(v: unknown): Region|null {
  if(!isRecord(v)||!['x','y','width','height'].every(k=>finite(v[k])))return null;
  const x=Math.max(0,Math.min(0.99,v.x as number)), y=Math.max(0,Math.min(0.99,v.y as number));
  return {x,y,width:Math.max(0.01,Math.min(1-x,v.width as number)),height:Math.max(0.01,Math.min(1-y,v.height as number))};
}
function normalizeImage(v:unknown): SourceImageMetadata|null {
  if(!isRecord(v)||!finite(v.width)||!finite(v.height)||!finite(v.bytes)||v.width<1||v.height<1||v.width>12000||v.height>12000||v.bytes<1)return null;
  if(typeof v.mime!=='string'||!['image/png','image/jpeg','image/webp'].includes(v.mime))return null;
  return {name:safeText(v.name,200),mime:v.mime,bytes:v.bytes,width:Math.round(v.width),height:Math.round(v.height)};
}
export function normalizePlan(v: unknown): MotionPlan {
  const d=defaultPlan(), raw=isRecord(v)?v:{}, s=isRecord(raw.source)?raw.source:{}, r=isRecord(raw.rotation)?raw.rotation:{};
  const provider=enumeration(raw.provider,PROVIDERS,d.provider);
  const candidate=enumeration(raw.model,MODEL_IDS,DEFAULT_MODEL[provider]);
  const model=PROVIDER_CAPABILITIES[candidate].provider===provider?candidate:DEFAULT_MODEL[provider];
  const ids=(v:unknown,valid:readonly string[],fallback:string[]):string[]=>Array.isArray(v)?[...new Set(v.filter((x):x is string=>typeof x==='string'&&valid.includes(x)))]:[...fallback];
  const subjectMotions=ids(raw.subjectMotions,SUBJECT_MOTIONS.map(m=>m.id),d.subjectMotions);
  const environmentalMotions=ids(raw.environmentalMotions,ENVIRONMENTAL_MOTIONS.map(m=>m.id),d.environmentalMotions);
  const all=[...subjectMotions,...environmentalMotions];
  return {
    schemaVersion:'1.0.0',provider,model,mode:enumeration(raw.mode,MODES,d.mode),
    durationSeconds:finite(raw.durationSeconds)?Math.max(1,Math.min(60,Math.round(raw.durationSeconds))):null,
    source:{subjectType:enumeration(s.subjectType,SUBJECT_TYPES,d.source.subjectType),subjectEn:safeText(s.subjectEn,160),subjectZh:safeText(s.subjectZh,160),sceneNotesEn:safeText(s.sceneNotesEn),sceneNotesZh:safeText(s.sceneNotesZh),elementsConfirmed:bool(s.elementsConfirmed,false),image:normalizeImage(s.image),region:normalizeRegion(s.region)},
    subjectMotions,environmentalMotions,primaryMotion:typeof raw.primaryMotion==='string'&&all.includes(raw.primaryMotion)?raw.primaryMotion:all[0]??null,
    intensity:enumeration(raw.intensity,INTENSITIES,d.intensity),motionTiming:enumeration(raw.motionTiming,['sparse','natural','sustained'],'natural'),camera:enumeration(raw.camera,CAMERAS,d.camera),loop:enumeration(raw.loop,LOOP_STRATEGIES,d.loop),
    preservation:ids(raw.preservation,PRESERVATIONS,d.preservation) as MotionPlan['preservation'],
    rotation:{type:enumeration(r.type,['turntable','orbit'],d.rotation.type),angle:[90,180,360].includes(r.angle as number)?r.angle as 90|180|360:360,
      direction:enumeration(r.direction,['clockwise','counterclockwise'],d.rotation.direction),speed:enumeration(r.speed,['uniform','slow','ease'],d.rotation.speed),axis:enumeration(r.axis,['y','x','z'],d.rotation.axis),
      centered:bool(r.centered,true),stableFraming:bool(r.stableFraming,true),consistentScale:bool(r.consistentScale,true),stableLighting:bool(r.stableLighting,true),geometry:bool(r.geometry,true),details:bool(r.details,true),returnToStart:bool(r.returnToStart,true),inputMode:enumeration(r.inputMode,['single','references','3d'],'single')},
    audio:enumeration(raw.audio,['none-requested','ambient','provider-default'],d.audio),length:enumeration(raw.length,['concise','balanced','detailed'],d.length),presetId:raw.presetId===null?null:safeText(raw.presetId,100)||null,
  };
}
export function switchProvider(plan:MotionPlan,provider:Provider):MotionPlan {return {...structuredClone(plan),provider,model:DEFAULT_MODEL[provider]};}
