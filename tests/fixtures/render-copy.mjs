import fs from 'node:fs';
import process from 'node:process';
import {fileURLToPath,pathToFileURL,URL} from 'node:url';
import {registerHooks} from 'node:module';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const root=new URL('../../',import.meta.url);
// Framework navigation only; customer components and their copy are real.
const mocks={
 'next/navigation':'export function useRouter(){return {push(){throw Error("No navigation in static fixture")}}};export function usePathname(){return "/"}',
 'next/link':'import {createElement} from "react";export default function Link(p){return createElement("a",p,p.children)}',
 'next/image':'import {createElement} from "react";export default function Image({priority,...p}){return createElement("img",p)}',
};
registerHooks({resolve(s,c,next){
 if(c.parentURL?.startsWith('data:'))c={...c,parentURL:import.meta.url};
 if(mocks[s])return {url:'data:text/javascript,'+encodeURIComponent(mocks[s]),shortCircuit:true};
 if(s.startsWith('@/')||s.startsWith('.')){
  const url=s.startsWith('@/')?new URL(s.slice(2),root):new URL(s,c.parentURL);
  for(const ext of ['.tsx','.ts','/index.ts'])if(fs.existsSync(url.href.startsWith('file:')?fileURLToPath(new URL(url.href+ext)):''))return next(url.href+ext,c);
 }return next(s,c);
},load(url,c,next){if(url.endsWith('.tsx'))return {format:'module',shortCircuit:true,source:ts.transpileModule(fs.readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext}}).outputText};return next(url,c)}});
globalThis.fetch=()=>{throw Error('Static copy verification must not request data');};
const name=process.argv[2];
if(!['home','pricing','how-it-works','sample-report','snapshot','snapshot-stored','purchase','checkout'].includes(name))throw Error('Unknown fixture');
let view;
if(name==='snapshot-stored'){
 const {FreeSnapshot}=await import('../../components/free-snapshot.tsx');
 const {decisionFixture}=await import('./snapshot-decision.ts');
 const report=decisionFixture(process.argv[3]||'coffee-shop');
 if(process.argv[4]==='advisor'){const {advisorFixture}=await import('./snapshot-advisor.ts');const stance=process.argv[5]||'conditional';if(!['recommended','conditional','not_recommended'].includes(stance))throw Error('Invalid fixture stance');report.earlyView.advisor=advisorFixture(stance);}
 if(process.argv[4]==='comparison')report.dimensions[0].why.comparison={description:'Whole Census output areas in the same local authority; not commercial peers.',density:80,units:'residents per hectare',percentile:72,peers:200,limitations:['Synthetic test comparison only.']};
 view=createElement(FreeSnapshot,{report});
}else if(name==='snapshot'){
 const {FreeSnapshotView}=await import('../../components/free-snapshot.tsx');
 const {snapshotDemo}=await import('../../lib/snapshot/demo.ts');
 const data=JSON.parse(fs.readFileSync('fixtures/free_snapshot/kingston_coffee_shop.json','utf8'));
 view=createElement(FreeSnapshotView,{snapshot:snapshotDemo(data,'development',process.argv[3])});
}else if(name==='purchase'||name==='checkout'){
 const {PurchaseButton}=await import('../../components/purchase-button.tsx');
 view=createElement(PurchaseButton,{report:process.argv[3]==='owned'?'00000000-0000-4000-8000-000000000001':undefined,checkout:name==='checkout'});
}else{
 const path=name==='home'?'app/page.tsx':`app/${name}/page.tsx`;
 const {default:Page}=await import(pathToFileURL(fileURLToPath(new URL(path,root))).href);
 const {LocationEntryProvider}=await import('../../components/location-entry.tsx');
 view=createElement(LocationEntryProvider,null,await Page());
}
process.stdout.write(renderToStaticMarkup(view));
