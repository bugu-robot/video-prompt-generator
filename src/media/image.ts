import type { SourceImageMetadata } from '../models/motion-plan';
export const IMAGE_LIMIT=25*1024*1024;
export function validateImageHeader(file:{size:number;type:string},header:Uint8Array):string {
  if(file.size<12)throw new Error('圖片檔案空白或不完整。');
  if(file.size>IMAGE_LIMIT)throw new Error('圖片不能超過 25 MB。');
  const png=[137,80,78,71,13,10,26,10].every((v,i)=>header[i]===v);
  const jpeg=header[0]===255&&header[1]===216&&header[2]===255;
  const webp=new TextDecoder().decode(header.slice(0,4))==='RIFF'&&new TextDecoder().decode(header.slice(8,12))==='WEBP';
  const mime=png?'image/png':jpeg?'image/jpeg':webp?'image/webp':'';
  if(!mime||file.type&&file.type!==mime)throw new Error('請選擇有效的 PNG、JPEG 或 WebP；不接受 SVG 或動畫 GIF。');return mime;
}
export interface LoadedImage {url:string;metadata:SourceImageMetadata;dispose:()=>void}
export async function loadImage(file:File):Promise<LoadedImage> {
  const mime=validateImageHeader(file,new Uint8Array(await file.slice(0,12).arrayBuffer())),url=URL.createObjectURL(file);
  const image=new Image();image.src=url;
  try {
    await Promise.race([image.decode(),new Promise<never>((_,reject)=>{const id=setTimeout(()=>reject(new Error('圖片解碼逾時。')),15000);image.addEventListener('load',()=>clearTimeout(id),{once:true});image.addEventListener('error',()=>clearTimeout(id),{once:true});})]);
    const width=image.naturalWidth,height=image.naturalHeight;
    if(width<1||height<1||width>12000||height>12000||width*height>40_000_000)throw new Error('圖片尺寸無效或超過 4,000 萬像素限制。');
    return {url,metadata:{name:file.name.slice(0,200),mime,bytes:file.size,width,height},dispose:()=>URL.revokeObjectURL(url)};
  } catch(error) {URL.revokeObjectURL(url);throw error;}
}
export function aspectRatio(width:number,height:number):string {
  const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;const g=gcd(width,height);return `${width/g}:${height/g} (${(width/height).toFixed(3)})`;
}
