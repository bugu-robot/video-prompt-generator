import type { Preservation, SubjectType } from '../models/motion-plan';
export const SUBJECT_LABELS:Record<SubjectType,{en:string;zh:string}>= {
  unspecified:{en:'the existing subject',zh:'原圖主體（未指明）'},character:{en:'the character',zh:'角色'},cat:{en:'the cat',zh:'貓咪'},'coffee-cup':{en:'the coffee cup',zh:'咖啡杯'},window:{en:'the window',zh:'窗戶'},tree:{en:'the tree',zh:'樹木'},product:{en:'the product',zh:'產品'},custom:{en:'the selected object',zh:'自訂物件'}
};
export const PRESERVATION_LABELS:Record<Preservation,{en:string;zh:string}>= {
  identity:{en:'identity and appearance',zh:'身份及外觀'},face:{en:'facial features',zh:'面部特徵'},proportions:{en:'original proportions',zh:'原有比例'},objects:{en:'existing objects',zh:'現有物件'},composition:{en:'composition',zh:'構圖'},lighting:{en:'lighting setup',zh:'光源佈局'},palette:{en:'color palette',zh:'色彩'},background:{en:'background structure',zh:'背景結構'},style:{en:'visual style',zh:'視覺風格'}
};
export const MODE_LABELS={ambient:'環境微動作循環',rotation:'物件旋轉／鏡頭繞行',cinematic:'電影感動態'};
export const LOOP_LABELS={'match-pose':'首尾姿勢相配',continuous:'持續環境動作',crossfade:'方便剪輯交叉淡化',none:'不要求循環'};
export const LOOP_DESCRIPTIONS={
  'match-pose':'讓主體回到原來姿勢；連續蒸氣或雨滴仍可能需要剪輯接點。',
  continuous:'讓動作持續穿過接點；不會要求每粒雨滴或微粒回到原位。',
  crossfade:'片頭片尾保持相似與平靜，再在剪輯軟件短暫淡化；可能有殘影。',
  none:'適合一次性的電影感片段，不要求首尾吻合。'
};
export const INTENSITY_LABELS={minimal:'極少',subtle:'細微',moderate:'適中'};
export const PROVIDER_LABELS={omni:'Flow · Gemini Omni',veo:'Flow · Veo',grok:'Grok Imagine'};
export const COPY={appName:'Video Prompt Generator',subtitle:'讓原圖輕輕郁起來。',privacy:'圖片、影片與提示詞只在本機處理。',source:'原圖與主體',provider:'模型與用途',motion:'動作與鏡頭',output:'提示詞工作台',copy:'複製英文',exportJson:'匯出 JSON',exportText:'匯出文字',viewNote:'中文解讀來自同一 Motion Plan；自行輸入的英文文字不會自動翻譯。',local:'本機處理',drop:'拖放圖片至此，或選擇檔案',noImage:'圖片只用作參考；沒有自動辨識或 AI 分析。'};
