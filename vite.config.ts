import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
const root=process.cwd();
function files(dir:string):string[] {return readdirSync(dir,{withFileTypes:true}).flatMap(f=>f.isDirectory()?files(resolve(dir,f.name)):[resolve(dir,f.name)]);}
function pwaPlugin(base:string,mode:string):Plugin {
  const hash=createHash('sha256').update(base).update(mode);
  for(const f of [...files(resolve(root,'src')),...files(resolve(root,'public')),resolve(root,'index.html'),resolve(root,'package.json'),resolve(root,'package-lock.json'),resolve(root,'vite.config.ts'),resolve(root,'scripts/service-worker.template.js')].sort())hash.update(relative(root,f)).update(readFileSync(f));
  const id=hash.digest('hex').slice(0,16);
  return {name:'video-prompts-versioned-offline-shell',generateBundle(_options,bundle) {
    const precache=['./',...Object.keys(bundle),...files(resolve(root,'public')).map(f=>relative(resolve(root,'public'),f).replaceAll('\\','/'))];
    const source=readFileSync(resolve(root,'scripts/service-worker.template.js'),'utf8').replaceAll('__BUILD_ID__',id).replace('__PRECACHE__',JSON.stringify(precache)).replace('__SCOPE_ID__',JSON.stringify(base));
    this.emitFile({type:'asset',fileName:'sw.js',source});
  }};
}
export default defineConfig(({mode})=>{
  const repository=process.env.GITHUB_REPOSITORY?.split('/').at(-1)??'video-prompt-generator';
  const base=mode==='pages'?'/'+repository+'/':'/';
  return {base,plugins:[pwaPlugin(base,mode)],build:{target:'es2022',outDir:mode==='pages'?'dist-pages':'dist',sourcemap:false}};
});
