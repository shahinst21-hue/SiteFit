/* global console */
import process from 'node:process';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
import {registerHooks} from 'node:module';import ts from 'typescript';import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
const mode=process.argv[2];
process.env.VERCEL_ENV='production';process.env.SITE_URL='https://sitefit.co.uk';process.env.SITEFIT_CONTROLLED_TRIAL_ENABLED='1';process.env.SITEFIT_CONTROLLED_TRIAL_ID='00000000-0000-4000-8000-000000000001';
globalThis.entryFixture={user:{id:'00000000-0000-4000-8000-000000000002',is_anonymous:false,email:mode.startsWith('owner')?'shahinst21@gmail.com':'customer@example.invalid',email_confirmed_at:'2026-10-26'},available:mode!=='capacity'&&mode!=='owner-active',expired:mode==='owner-expired'};
globalThis.entryCreateElement=createElement;
const mocks={
 'server-only':'export {};',
 '@/components/location-wizard':'export const LocationWizard=()=>globalThis.entryCreateElement("div",null,"Location wizard");',
 '@/lib/seo':'export const pageMetadata=()=>({});',
 '@/lib/supabase/server':'export const createServerSupabase=async()=>({auth:{getUser:async()=>({data:{user:globalThis.entryFixture.user},error:null})}});',
 '@/lib/proof/repository':'export const readSnapshotProof=async()=>null;',
 '@/lib/proof/trial':'export const publicCustomersAvailable=async()=>globalThis.entryFixture.available;export const assertTrialOwner=async()=>{if(globalThis.entryFixture.expired)throw Error("expired");};',
 'next/link':'export default function Link({href,children,...props}){return globalThis.entryCreateElement("a",{href,...props},children);}',
};
registerHooks({resolve(s,c,next){if(mocks[s])return {url:'data:text/javascript,'+encodeURIComponent(mocks[s]),shortCircuit:true};if(s.startsWith('@/')||s.startsWith('.')){const base=s.startsWith('@/')?path.resolve(s.slice(2)):path.resolve(path.dirname(fileURLToPath(c.parentURL)),s);if(!path.extname(base))for(const ext of ['.ts','.tsx'])if(fs.existsSync(base+ext))return next(pathToFileURL(base+ext).href,c);}return next(s,c);},load(url,context,next){if(url.endsWith('.tsx'))return {format:'module',source:ts.transpileModule(fs.readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText,shortCircuit:true};return next(url,context);}});
const {default:Page}=await import('../../app/check-location/page.tsx');console.log(renderToStaticMarkup(await Page()));
