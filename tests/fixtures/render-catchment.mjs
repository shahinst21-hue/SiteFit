import {registerHooks} from 'node:module';
import process from 'node:process';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
import ts from 'typescript';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
registerHooks({resolve(specifier,context,next){
 if(specifier==='server-only')return {url:'data:text/javascript,export {};',shortCircuit:true};
 if(specifier==='next/link')return next('next/link.js',context);
 if(specifier==='next/image')return next('next/image.js',context);
 if(specifier.startsWith('.')||specifier.startsWith('@/')){
 const base=specifier.startsWith('@/')?path.resolve(specifier.slice(2)):path.resolve(path.dirname(fileURLToPath(context.parentURL)),specifier);
 if(!path.extname(base))for(const ext of ['.tsx','.ts'])if(fs.existsSync(base+ext))return next(pathToFileURL(base+ext).href,context);
 }return next(specifier,context);
},load(url,context,next){if(url.endsWith('.tsx'))return {format:'module',shortCircuit:true,source:ts.transpileModule(fs.readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext}}).outputText};return next(url,context);}});
const {ResidentialCatchment}=await import('../../components/residential-catchment.tsx');
const {residentialScore}=await import('../../lib/analysis/residential-catchment.ts');
const score=residentialScore([3500,9000,25000],{evidenceIds:['synthetic'],snapshotIds:[],releaseIds:[],precision:'postcode_centroid',referencePeriod:'2021-03-21',retrievedAt:[],point:{longitude:0,latitude:51}});
process.stdout.write(renderToStaticMarkup(createElement(ResidentialCatchment,{value:process.argv[2]==='missing'?null:score,detailed:process.argv[2]==='full'})));
