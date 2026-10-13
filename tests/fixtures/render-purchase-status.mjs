import {registerHooks} from 'node:module';
import process from 'node:process';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
import ts from 'typescript';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
registerHooks({resolve(specifier,context,next){
 if(specifier==='next/link')return next('next/link.js',context);
 if(specifier.startsWith('.')||specifier.startsWith('@/')){
 const base=specifier.startsWith('@/')?path.resolve(specifier.slice(2)):path.resolve(path.dirname(fileURLToPath(context.parentURL)),specifier);
 if(!path.extname(base))for(const ext of ['.tsx','.ts'])if(fs.existsSync(base+ext))return next(pathToFileURL(base+ext).href,context);
 }return next(specifier,context);
},load(url,context,next){if(url.endsWith('.tsx'))return {format:'module',shortCircuit:true,source:ts.transpileModule(fs.readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext}}).outputText};return next(url,context);}});
const {PurchaseStatus}=await import('../../components/purchase-status.tsx');
process.stdout.write(renderToStaticMarkup(createElement(PurchaseStatus,{initial:JSON.parse(fs.readFileSync(0,'utf8')),cancelled:false})));
