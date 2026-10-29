import test from 'node:test';
import assert from 'node:assert/strict';
import {clarityChoice,clarityConfig,clarityPage,ClarityMeasurement,parseClarityConsent,optionalClarityCookie} from '../lib/measurement/clarity.ts';
import {consentChoice} from '../lib/measurement/consent.ts';
import {installClarity} from '../lib/measurement/clarity-browser.ts';
const yes=()=>consentChoice({analytics:true,advertising:true,personalization:false});
const config={enabled:true,rehearsal:true};
test('Clarity needs explicit Production activation; live project is never used by Local/Preview',()=>{
 assert.equal(clarityConfig({}).enabled,false);
 for(const VERCEL_ENV of ['preview','development','unknown'])assert.equal(clarityConfig({VERCEL_ENV,SITE_URL:'https://sitefit.co.uk',SITEFIT_CLARITY_MEASUREMENT:'1'}).enabled,false);
 assert.deepEqual(clarityConfig({VERCEL_ENV:'production',SITE_URL:'https://sitefit.co.uk',SITEFIT_CLARITY_MEASUREMENT:'1',SITEFIT_CLARITY_UI_REHEARSAL:'1'}),{enabled:true,rehearsal:false});
 assert.equal(clarityConfig({VERCEL_ENV:'production',SITE_URL:'https://other.invalid',SITEFIT_CLARITY_MEASUREMENT:'1'}).enabled,false);
 assert.deepEqual(clarityConfig({SITEFIT_CLARITY_UI_REHEARSAL:'1'}),config);
});
test('Google grants never imply replay consent; expired, forged, future and malformed replay choices fail closed',()=>{
 const now=Date.now();assert.equal(parseClarityConsent(undefined),null);assert.equal(parseClarityConsent(JSON.stringify(yes())),null);
 for(const value of [null,1,'true',{}])assert.throws(()=>clarityChoice(value));
 const c=clarityChoice(true,now);assert.deepEqual(parseClarityConsent(JSON.stringify(c),now),c);
 for(const change of [{at:0},{at:now+60001},{version:'old'},{extra:'private'},{allowed:'true'}])assert.equal(parseClarityConsent(JSON.stringify({...c,...change}),now),null);
 for(const name of ['_clck','_clsk'])assert.equal(optionalClarityCookie(name),true);
 for(const name of ['sb-project-auth-token','sitefit_consent_v1','sitefit_clarity_consent_v1','_ga'])assert.equal(optionalClarityCookie(name),false);
});
test('only exact public URLs pass; checker, private/legal paths, arbitrary slugs, queries and fragments are refused',()=>{
 const origin='https://sitefit.co.uk';
 for(const path of ['/','/pricing','/how-it-works','/sample-report','/blog','/methodology','/contact'])assert.equal(clarityPage(path,origin),true);
 for(const path of ['/check-location','/login','/auth/callback','/snapshots/private','/reports/private','/account','/purchase/return','/privacy','/terms','/dev/report','/api/measurement/consent','/?email=private','/#private','/blog/private-id','https://external.invalid/'])assert.equal(clarityPage(path,origin),false,path);
});
test('recording requires all separate grants, loads once and never resumes after navigation/withdrawal',()=>{
 let loads=0,stops=0;const r=new ClarityMeasurement(config,{load:()=>loads++,stop:()=>stops++});
 r.update(yes(),null,true);r.update(null,clarityChoice(true),true);r.update(consentChoice({analytics:true,advertising:false,personalization:false}),clarityChoice(true),true);r.update(yes(),clarityChoice(true),false);assert.equal(loads,0);
 r.update(yes(),clarityChoice(true),true);r.update(yes(),clarityChoice(true),true);assert.equal(loads,1);assert.equal(r.allowed(),true);
 r.stop();r.update(yes(),clarityChoice(true),true);assert.equal(r.allowed(),false);assert.equal(loads,1);assert.equal(stops,1);
 const denied=new ClarityMeasurement({enabled:false,rehearsal:false},{load:()=>assert.fail(),stop:()=>{}});denied.update(yes(),clarityChoice(true),true);assert.equal(denied.allowed(),false);
});

test('hosted executor is stopped before history changes; late two-stage downloads cannot start on a private page',()=>{
 // Minimal browser host: exercise actual queue/executor ownership, rather than duplicating the controller.
 const previousWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),previousDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
 try{
  for(const downloaded of [false,true]){
   const calls:unknown[][]=[],scripts:{id:string;src?:string;dataset:Record<string,string>}[]=[];let active=false;
   const location={href:'https://sitefit.co.uk/',origin:'https://sitefit.co.uk'};
   const windowMock=Object.assign(new EventTarget(),{location,history:{pushState(_d:unknown,_s:string,url:string){assert.equal(active,false,'Recorder must stop before the private URL is visible');location.href=new URL(url,location.href).href;},replaceState(){}}});
   const documentMock=Object.assign(new EventTarget(),{referrer:'',getElementById:()=>({remove(){}}),createElement:()=>({dataset:{},addEventListener(){}}),head:{appendChild(script:typeof scripts[number]){scripts.push(script);}}});
   Object.defineProperty(globalThis,'window',{configurable:true,value:windowMock});Object.defineProperty(globalThis,'document',{configurable:true,value:documentMock});
   const {measurement,eligible}=installClarity({enabled:true,rehearsal:false});measurement.update(yes(),clarityChoice(true),eligible());
   const host=windowMock as unknown as Window;assert.equal(scripts.length,1);assert.match(scripts[0].src!,/\/z574qs9jlu$/);
   host.clarity!('start',{projectId:'hosted'});host.clarity!.q!.unshift(host.clarity!.q!.pop()!);
   if(downloaded){const queued=host.clarity!.q!;host.clarity=(...args)=>{calls.push(args);if(args[0]==='start')active=true;if(args[0]==='stop')active=false;};while(queued.length)host.clarity(...queued.shift()!);assert.equal(active,true);}
   host.history.pushState(null,'','/reports/private-id');assert.equal(measurement.allowed(),false);
   assert.equal(calls.some(c=>c[0]==='stop'),downloaded);
   const queued=host.clarity!.q!;assert.equal(queued.length,0);
   const before=calls.length;host.clarity=(...args)=>calls.push(args);host.clarity('start',{projectId:'late'});host.clarity('event','private');host.clarity.q!.unshift(host.clarity.q!.pop()!);
   assert.equal(calls.length,before);assert.equal(host.clarity.q!.length,0,'Late tag cannot retain a start item or undefined sentinel');
  }
 }finally{
  if(previousWindow)Object.defineProperty(globalThis,'window',previousWindow);else Reflect.deleteProperty(globalThis,'window');
  if(previousDocument)Object.defineProperty(globalThis,'document',previousDocument);else Reflect.deleteProperty(globalThis,'document');
 }
});
