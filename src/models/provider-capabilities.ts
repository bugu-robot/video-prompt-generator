import type { ModelId, Provider } from './motion-plan';
export type CapabilityStatus = 'supported' | 'unsupported' | 'unknown';
export interface Capability { status: CapabilityStatus; sourceUrl: string; verifiedAt: string; confidence: 'high' | 'medium' | 'low'; noteZh: string }
export type Feature = 'imageToVideo' | 'endFrame' | 'references' | 'videoEditing' | 'extension' | 'audio' | 'preciseRotation' | 'guaranteedLoop';
export interface ProviderCapabilities {
  provider: Provider; model: ModelId; displayName: string; verifiedModelName: string | null;
  consumer: Record<Feature, Capability>;
  consumerDurations: number[] | null;
  consumerAspectRatios: string[] | null;
  consumerResolutions: string[] | null;
  apiNotes: { sourceUrl: string; modelIds: string[]; noteZh: string }[];
}
export const VERIFIED_AT = '2026-10-11';
export const FLOW_SOURCE = 'https://support.google.com/flow/answer/16352836?hl=en';
export const XAI_API_SOURCE = 'https://docs.x.ai/developers/model-capabilities/video/image-to-video';
const capability = (status: CapabilityStatus, sourceUrl: string, noteZh: string, confidence: Capability['confidence'] = 'high'): Capability => ({status, sourceUrl, verifiedAt: VERIFIED_AT, confidence, noteZh});
const noGuarantee = () => capability('unknown', '', '官方沒有承諾精準幾何旋轉或數學上無縫循環；須逐片驗收。', 'low');
function flowFeatures(references: boolean, editing: boolean, extension: boolean): Record<Feature, Capability> {
  return {
    imageToVideo:capability('supported',FLOW_SOURCE,'官方列出首幀生成；帳戶及地區仍須自行確認。'),
    endFrame:capability('supported',FLOW_SOURCE,'可在 Flow 網站自行提供首尾幀；本機程式不設定外部網站。'),
    references:capability(references?'supported':'unsupported',FLOW_SOURCE,references?'在 Flow Ingredients 手動加入參考圖；不等於鎖定首幀。':'此 Veo Quality 模型未支援 Ingredients/References。'),
    videoEditing:capability(editing?'supported':'unsupported',FLOW_SOURCE,editing?'Omni 可編輯影片；此 app 只產生 Image-to-Video 提示。':'此模型不支援 Video-to-Video 編輯。'),
    extension:capability(extension?'supported':'unsupported',FLOW_SOURCE,extension?'官方列出延長功能，須在 Flow 操作。':'目前未支援或列為 coming soon，不能當成已可用。'),
    audio:capability('unknown',FLOW_SOURCE,'消費版精確音訊控制未核實；提示不能保證靜音。','low'),
    preciseRotation:noGuarantee(), guaranteedLoop:noGuarantee(),
  };
}
export const PROVIDER_CAPABILITIES: Record<ModelId, ProviderCapabilities> = {
  'omni-flash-1.1': {provider:'omni',model:'omni-flash-1.1',displayName:'Gemini Omni Flash 1.1',verifiedModelName:'Gemini Omni Flash 1.1',consumer:flowFeatures(true,true,false),consumerDurations:[4,6,8,10],consumerAspectRatios:['16:9','9:16'],consumerResolutions:['720p','360p draft'],apiNotes:[{sourceUrl:'https://deepmind.google/models/gemini-omni/prompt-guide/',modelIds:[],noteZh:'模型指南提及延長片段；Flow 網站功能表仍列 coming soon。以網站表作消費版判斷。'}]},
  'veo-3.1-fast': {provider:'veo',model:'veo-3.1-fast',displayName:'Veo 3.1 Fast',verifiedModelName:'Veo 3.1 Fast',consumer:flowFeatures(true,false,false),consumerDurations:[4,6,8],consumerAspectRatios:['16:9','9:16'],consumerResolutions:null,apiNotes:[{sourceUrl:'https://ai.google.dev/gemini-api/docs/veo',modelIds:['veo-3.1-fast-generate-preview'],noteZh:'Gemini API 規格獨立於 Flow；本程式不使用 API。'}]},
  'veo-3.1-lite': {provider:'veo',model:'veo-3.1-lite',displayName:'Veo 3.1 Lite',verifiedModelName:'Veo 3.1 Lite',consumer:flowFeatures(true,false,true),consumerDurations:[4,6,8],consumerAspectRatios:['16:9','9:16'],consumerResolutions:null,apiNotes:[]},
  'veo-3.1-quality': {provider:'veo',model:'veo-3.1-quality',displayName:'Veo 3.1 Quality',verifiedModelName:'Veo 3.1 Quality',consumer:flowFeatures(false,false,false),consumerDurations:[4,6,8],consumerAspectRatios:['16:9','9:16'],consumerResolutions:null,apiNotes:[]},
  'grok-consumer-current': {provider:'grok',model:'grok-consumer-current',displayName:'Grok Imagine · 網站當前模型（版本未核實）',verifiedModelName:null,
    consumer: {
      imageToVideo:capability('unknown','https://docs.x.ai/grok/overview','官方消費版頁面確認 Imagine 影片；Image-to-Video 專頁是 API，網站具體入口須自行確認。','low'),
      endFrame:capability('unknown',XAI_API_SOURCE,'API 1.5 有首尾幀，但網站未核實；只提供待確認流程。','low'),
      references:capability('unknown','https://docs.x.ai/developers/model-capabilities/video/reference-to-video','API 參考圖能力不代表網站能力；請先確認網站支援。','low'),
      videoEditing:capability('unknown','https://docs.x.ai/developers/model-capabilities/video/editing','僅 API 編輯已記錄；網站未核實。','low'),
      extension:capability('unknown','https://docs.x.ai/developers/model-capabilities/video/extension','網站延長片段能力未核實。','low'),
      audio:capability('unknown','https://docs.x.ai/grok/faq','網站精確音訊控制未核實；不要視提示為靜音保證。','low'),
      preciseRotation:noGuarantee(),guaranteedLoop:noGuarantee()
    },consumerDurations:null,consumerAspectRatios:null,consumerResolutions:null,
    apiNotes:[{sourceUrl:XAI_API_SOURCE,modelIds:['grok-imagine-video-1.5'],noteZh:'API 有 Image-to-Video；API 版本、時長、畫質不能推論網站支援。'}]
  },
};
export const DEFAULT_MODEL: Record<Provider,ModelId> = {omni:'omni-flash-1.1',veo:'veo-3.1-fast',grok:'grok-consumer-current'};
export function modelsFor(provider: Provider): ProviderCapabilities[] {return Object.values(PROVIDER_CAPABILITIES).filter(c=>c.provider===provider);}
