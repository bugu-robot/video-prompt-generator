import type { AppSettings, MotionPlan, MotionPreset } from '../models/motion-plan';
import { defaultPlan, isRecord, normalizePlan, safeText } from '../engine/motion-planner';
import { PRESET_BUNDLE_SCHEMA, PRESET_SCHEMA, parseSafeJson, validate } from './schema';
import { validateMotionPlan } from './export';
export interface StorageLike {getItem(k:string):string|null;setItem(k:string,v:string):void}
const memory=new Map<string,string>();
const volatile:StorageLike={getItem:k=>memory.get(k)??null,setItem:(k,v)=>{memory.set(k,v);}};
export const SETTINGS_KEY='video-prompts.settings.v1',PRESETS_KEY='video-prompts.presets.v1';
export function browserStorage():{storage:StorageLike;persistent:boolean} {
  try {const s=localStorage;const key='video-prompts.storage-test';s.setItem(key,'1');s.removeItem(key);return {storage:s,persistent:true};}catch{return {storage:volatile,persistent:false};}
}
export function loadSettings(s:StorageLike):AppSettings {
  const fallback:AppSettings={plan:defaultPlan(),view:'en',theme:'dark'};
  try {const v=parseSafeJson(s.getItem(SETTINGS_KEY)??'null');if(!isRecord(v)||v.schemaVersion!=='1.0.0'||!isRecord(v.settings))return fallback;
    const x=v.settings,plan=normalizePlan(x.plan);plan.source.image=null;plan.source.region=null;
    return {plan,view:['en','zh','both'].includes(String(x.view))?x.view as AppSettings['view']:'en',theme:['dark','light','system'].includes(String(x.theme))?x.theme as AppSettings['theme']:'dark'};
  }catch{return fallback;}
}
export function saveSettings(s:StorageLike,settings:AppSettings):void {const clean=structuredClone(settings);clean.plan.source.image=null;clean.plan.source.region=null;s.setItem(SETTINGS_KEY,JSON.stringify({schemaVersion:'1.0.0',settings:clean}));}
export function listCustomPresets(s:StorageLike):MotionPreset[] {
  try {const raw=s.getItem(PRESETS_KEY);if(!raw)return [];return parsePresetBundle(raw);}catch{return [];}
}
function custom(p:MotionPreset):void {validate(p,PRESET_SCHEMA);validateMotionPlan(p.plan);if(p.plan.mode!==p.mode)throw new Error('預設模式與設定不吻合。');}
export function parsePresetBundle(raw:string):MotionPreset[] {
  const v=parseSafeJson(raw);validate(v,PRESET_BUNDLE_SCHEMA);
  const presets=(v as {presets:MotionPreset[]}).presets;for(const p of presets)custom(p);
  if(new Set(presets.map(p=>p.id)).size!==presets.length)throw new Error('預設 ID 重複。');return structuredClone(presets);
}
export function presetBundle(presets:MotionPreset[]):string {
  const data={format:'video-prompt-generator-presets',schemaVersion:'1.0.0',presets};
  validate(data,PRESET_BUNDLE_SCHEMA);return JSON.stringify(data,null,2);
}
function write(s:StorageLike,ps:MotionPreset[]):void {if(ps.length>100)throw new Error('最多儲存 100 個自訂預設。');s.setItem(PRESETS_KEY,ps.length?presetBundle(ps):'');}
export function savePreset(s:StorageLike,name:string,plan:MotionPlan,id:string=crypto.randomUUID(),timestamp=new Date().toISOString()):MotionPreset {
  const label=safeText(name,80);if(!label)throw new Error('請填寫預設名稱。');
  const clean=normalizePlan(plan);clean.source.image=null;clean.source.region=null;clean.presetId=id;
  const preset:MotionPreset={id,nameEn:label,nameZh:label,descriptionZh:'自訂動作設定',category:'custom',mode:clean.mode,plan:clean,providerNotesZh:[],warningsZh:[],updatedAt:timestamp};custom(preset);
  const ps=listCustomPresets(s),index=ps.findIndex(p=>p.id===id);if(index>=0)ps[index]=preset;else ps.push(preset);write(s,ps);return preset;
}
export function renamePreset(s:StorageLike,id:string,name:string):void {const p=listCustomPresets(s).find(p=>p.id===id);if(!p)throw new Error('找不到自訂預設。');savePreset(s,name,p.plan,id);}
export function deletePreset(s:StorageLike,id:string):void {write(s,listCustomPresets(s).filter(p=>p.id!==id));}
export function importPresets(s:StorageLike,raw:string,idFactory:()=>string=()=>crypto.randomUUID()):MotionPreset[] {
  // Validate the entire batch before writing once. Existing presets cannot be overwritten by supplied IDs.
  const imported=parsePresetBundle(raw).map(p=>{const id=idFactory();return {...p,id,plan:{...p.plan,presetId:id}};});
  const all=[...listCustomPresets(s),...imported];if(new Set(all.map(p=>p.id)).size!==all.length)throw new Error('新預設 ID 衝突。');write(s,all);return imported;
}
