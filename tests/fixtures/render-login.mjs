import fs from 'node:fs';
import {fileURLToPath,pathToFileURL,URL} from 'node:url';
import process from 'node:process';
import {registerHooks} from 'node:module';
import ts from 'typescript';
import {renderToStaticMarkup} from 'react-dom/server';
const root=new URL('../../',import.meta.url);
const mocks={
 'server-only':'export {};',
 'next/navigation':'export function redirect(path){throw Error("Unexpected fixture redirect: "+path)}',
 'next/link':'import {createElement} from "react";export default function Link(p){return createElement("a",p,p.children)}',
 '@/lib/supabase/server':'export async function verifiedUser(){return {user:null,unavailable:false}}',
 '@/lib/seo':'export function pageMetadata(){return {}}',
 '@/app/auth/actions':'export async function signOut(){}',
 '@/components/ui':'import {createElement} from "react";export function PageIntro(p){return createElement("div",null,p.children)};export function Wordmark(){return null}',
 '@/components/icon':'export function Icon(){return null}',
 './icon':'export function Icon(){return null}',
 '@/lib/supabase/browser':'export function createBrowserSupabase(){throw Error("Fixture must not dispatch")}'
};
registerHooks({resolve(s,c,next){
 if(c.parentURL?.startsWith('data:'))c={...c,parentURL:import.meta.url};
 if(mocks[s])return {url:'data:text/javascript,'+encodeURIComponent(mocks[s]),shortCircuit:true};
 if(s.startsWith('@/')){const name=s.slice(2);for(const ext of ['.ts','.tsx']){const url=new URL(name+ext,root);if(fs.existsSync(url))return {url:url.href,shortCircuit:true}}}
 return next(s,c);
},load(url,c,next){if(url.endsWith('.tsx'))return {format:'module',shortCircuit:true,source:ts.transpileModule(fs.readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext}}).outputText};return next(url,c)}});
Object.assign(process.env,JSON.parse(fs.readFileSync(0,'utf8')));
const {default:Login}=await import(pathToFileURL(fileURLToPath(new URL('app/login/page.tsx',root))).href);
process.stdout.write(renderToStaticMarkup(await Login({searchParams:Promise.resolve({})})));
