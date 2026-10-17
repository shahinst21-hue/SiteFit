import {registerHooks} from 'node:module';
import process from 'node:process';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
import ts from 'typescript';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
registerHooks({resolve(specifier,context,next){
 if(specifier==='next/image')return next(pathToFileURL(path.resolve('tests/fixtures/next-image-adapter.mjs')).href,context);
 if(specifier.startsWith('.')||specifier.startsWith('@/')){
 const base=specifier.startsWith('@/')?path.resolve(specifier.slice(2)):path.resolve(path.dirname(fileURLToPath(context.parentURL)),specifier);
 if(!path.extname(base))for(const ext of ['.tsx','.ts'])if(fs.existsSync(base+ext))return next(pathToFileURL(base+ext).href,context);
 }return next(specifier,context);
},load(url,context,next){if(url.endsWith('.tsx'))return {format:'module',shortCircuit:true,source:ts.transpileModule(fs.readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext}}).outputText};return next(url,context);}});
const {GenerationProgress,OpeningProgress}=await import('../../components/generation-progress.tsx');
const {snapshotView,fullView}=await import('../../lib/generation-progress.ts');
const views=[snapshotView({stage:'identity',completed:0}),snapshotView({stage:'analysis',completed:4}),snapshotView({stage:'ready',completed:8}),fullView({status:'succeeded',access:'active',confirmationDelivered:false,fulfilment:{state:'queued',reportId:null}}),fullView({status:'succeeded',access:'active',fulfilment:{state:'running',stage:'synthesis',reportId:null}}),fullView({status:'succeeded',access:'active',fulfilment:{state:'intervention',reportId:null}},3),fullView({status:'succeeded',access:'active',fulfilment:{state:'ready',reportId:'00000000-0000-4000-8000-000000000001'}})];
process.stdout.write(views.map(view=>renderToStaticMarkup(createElement(GenerationProgress,{view}))).join('\n')+renderToStaticMarkup(createElement(GenerationProgress,{view:views[4],stale:true}))+renderToStaticMarkup(createElement(OpeningProgress)));
