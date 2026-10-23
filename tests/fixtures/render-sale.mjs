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
const {PurchaseTerms}=await import('../../components/purchase-terms.tsx');
if(process.argv[2]==='policies'){
 const {default:Terms}=await import('../../app/terms/page.tsx');
 const {default:Privacy}=await import('../../app/privacy/page.tsx');
 const {default:Contact}=await import('../../app/contact/page.tsx');
 process.stdout.write(JSON.stringify({terms:renderToStaticMarkup(createElement(Terms)),privacy:renderToStaticMarkup(createElement(Privacy)),contact:renderToStaticMarkup(createElement(Contact))}));
}else if(process.argv[2]==='consent'){
 const {PurchaseConsent}=await import('../../components/purchase-consent.tsx');
 const {saleDisclosure}=await import('../../lib/legal/sale.ts');
 const {consentLabels,formationRule,deliveryCommitment}=await import('../../lib/legal/policy-text.ts');
 process.stdout.write(renderToStaticMarkup(createElement(PurchaseConsent,{report:'00000000-0000-4000-8000-000000000001',disclosure:saleDisclosure,sellerDisclosure:'Synthetic private disclosure',formation:formationRule,delivery:deliveryCommitment,labels:consentLabels})));
}else process.stdout.write(renderToStaticMarkup(createElement(PurchaseTerms,{report:'00000000-0000-4000-8000-000000000001'})));
