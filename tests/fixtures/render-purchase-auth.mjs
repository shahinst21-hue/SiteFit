import {registerHooks} from 'node:module';import process from 'node:process';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
import ts from 'typescript';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
registerHooks({resolve(s,c,next){
 if(s==='next/navigation')return {url:'data:text/javascript,export const useRouter=()=>({refresh(){}});',shortCircuit:true};
 if(s==='next/image')return next(pathToFileURL(path.resolve('tests/fixtures/next-image-adapter.mjs')).href,c);
 if(s==='next/link')return next('next/link.js',c);
 if(s.startsWith('.')||s.startsWith('@/')){const base=s.startsWith('@/')?path.resolve(s.slice(2)):path.resolve(path.dirname(fileURLToPath(c.parentURL)),s);if(!path.extname(base))for(const ext of ['.ts','.tsx'])if(fs.existsSync(base+ext))return next(pathToFileURL(base+ext).href,c);}
 return next(s,c);
},load(url,c,next){if(url.endsWith('.tsx'))return {format:'module',shortCircuit:true,source:ts.transpileModule(fs.readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext}}).outputText};return next(url,c);}});
const {PurchaseAuth}=await import('../../components/purchase-auth.tsx');
process.stdout.write(renderToStaticMarkup(createElement(PurchaseAuth,{test:false})));
