export const QC_CHECKS = [
  ['identity','角色身份、面部及特徵一致'],['geometry','物件幾何與比例穩定'],['camera','鏡頭行為符合要求'],['objects','沒有意外出現或消失的物件'],['loop','播放多次後接點自然'],['rotation','完整時間線實際完成要求角度'],['natural','動畫動作自然']
] as const;
export type QcCheckId=typeof QC_CHECKS[number][0];
export interface FrameMetric {meanAbsoluteRgbDifference:number;meanAbsoluteLumaDifference:number;sampleWidth:number;sampleHeight:number;warningZh:string|null}
export interface VideoQcResult {name:string;mime:string;bytes:number;durationSeconds:number;width:number;height:number;firstFrameTime:number;lastFrameTime:number;firstFrame:string;lastFrame:string;metric:FrameMetric;checks:Partial<Record<QcCheckId,'pass'|'fail'|'na'>>;notes:string;evaluatedAt:string}
export function frameDifference(first:Uint8ClampedArray,last:Uint8ClampedArray,width:number,height:number):FrameMetric {
  if(first.length!==last.length||first.length!==width*height*4||width<1||height<1)throw new Error('Frame sample dimensions do not match.');
  let rgb=0,luma=0;
  for(let i=0;i<first.length;i+=4){rgb+=Math.abs(first[i]!-last[i]!)+Math.abs(first[i+1]!-last[i+1]!)+Math.abs(first[i+2]!-last[i+2]!);luma+=Math.abs((first[i]!-last[i]!)*0.2126+(first[i+1]!-last[i+1]!)*0.7152+(first[i+2]!-last[i+2]!)*0.0722);}
  const pixels=width*height,value=rgb/(pixels*3*255);
  return {meanAbsoluteRgbDifference:value,meanAbsoluteLumaDifference:luma/(pixels*255),sampleWidth:width,sampleHeight:height,warningZh:value>0.12?'首尾樣本差異較明顯；請檢查構圖、姿勢與光線。12% 是本機啟發式提醒門檻，不是供應商標準。':null};
}
function eventOnce(target:HTMLVideoElement,event:string,signal:AbortSignal,timeout=15000):Promise<void> {
  return new Promise((resolve,reject)=>{
    const cleanup=()=>{clearTimeout(timer);target.removeEventListener(event,done);target.removeEventListener('error',failed);signal.removeEventListener('abort',aborted);};
    const done=()=>{cleanup();resolve();},failed=()=>{cleanup();reject(new Error('瀏覽器無法解碼此影片；可嘗試 MP4 H.264 或 WebM。'));},aborted=()=>{cleanup();reject(new Error('影片檢查已取消。'));};
    const timer=setTimeout(()=>{cleanup();reject(new Error('影片載入／擷取逾時。'));},timeout);
    target.addEventListener(event,done,{once:true});target.addEventListener('error',failed,{once:true});signal.addEventListener('abort',aborted,{once:true});if(signal.aborted)aborted();
  });
}
export async function inspectVideo(file:File,signal:AbortSignal):Promise<VideoQcResult> {
  if(file.size===0||file.size>300*1024*1024)throw new Error('影片需非空白，並不超過 300 MB。');
  if(!['video/mp4','video/webm','video/quicktime'].includes(file.type))throw new Error('請選擇 MP4、WebM 或 MOV；實際支援取決於瀏覽器 codec。');
  const url=URL.createObjectURL(file),video=document.createElement('video');video.preload='auto';video.muted=true;video.playsInline=true;
  try {
    const ready=eventOnce(video,'loadeddata',signal);video.src=url;video.load();await ready;
    const duration=video.duration,width=video.videoWidth,height=video.videoHeight;
    if(!Number.isFinite(duration)||duration<=0||duration>600||width<1||height<1||width*height>33_177_600)throw new Error('影片 metadata 無效，或超過本機 QC 的 10 分鐘／8K 限制。');
    const capture=async(time:number):Promise<{preview:string;sample:Uint8ClampedArray}>=>{
      if(Math.abs(video.currentTime-time)>0.00001){const seek=eventOnce(video,'seeked',signal);video.currentTime=time;await seek;}
      if(signal.aborted)throw new Error('影片檢查已取消。');
      const canvas=document.createElement('canvas');canvas.width=Math.min(640,width);canvas.height=Math.max(1,Math.round(canvas.width*height/width));
      const context=canvas.getContext('2d');if(!context)throw new Error('瀏覽器不支援 Canvas 影片擷取。');context.drawImage(video,0,0,canvas.width,canvas.height);const preview=canvas.toDataURL('image/png');
      const sample=document.createElement('canvas');sample.width=Math.min(160,width);sample.height=Math.max(1,Math.round(sample.width*height/width));const ctx=sample.getContext('2d');if(!ctx)throw new Error('無法讀取影格。');ctx.drawImage(video,0,0,sample.width,sample.height);
      return {preview,sample:ctx.getImageData(0,0,sample.width,sample.height).data};
    };
    const first=await capture(0),lastTime=Math.max(0,duration-Math.min(0.04,duration/2)),last=await capture(lastTime);
    const sampleWidth=Math.min(160,width),sampleHeight=Math.max(1,Math.round(sampleWidth*height/width));
    return {name:file.name,mime:file.type,bytes:file.size,durationSeconds:duration,width,height,firstFrameTime:0,lastFrameTime:lastTime,firstFrame:first.preview,lastFrame:last.preview,metric:frameDifference(first.sample,last.sample,sampleWidth,sampleHeight),checks:{},notes:'',evaluatedAt:new Date().toISOString()};
  } finally {video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
}
export function qcReport(qc:VideoQcResult):string {
  const data:Partial<VideoQcResult>={...qc};delete data.firstFrame;delete data.lastFrame;
  return JSON.stringify({format:'video-prompt-generator-local-qc',schemaVersion:'1.0.0',...data,checkStatus:QC_CHECKS.map(([id,label])=>({id,label,status:qc.checks[id]??'pending'})),limitationsZh:['末幀是接近片尾的可解碼樣本，不是已驗證的最後一幀。','低差異不能證明整段循環無縫、身份穩定或轉足 360°。','所有 checklist 未選項目均保留為 pending；不會宣稱已通過。']},null,2);
}
