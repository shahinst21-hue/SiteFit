import {canMeasure,consentMaxAge,type Consent} from './consent.ts';

/** Public installation ID supplied by the owner; never a privileged credential. */
export const clarityProject='z574qs9jlu';
export const CLARITY_CONSENT_COOKIE='sitefit_clarity_consent_v1';
export type ClarityConsent={version:'sitefit-clarity-v1';allowed:boolean;at:number};
export type ClarityConfig={enabled:boolean;rehearsal:boolean};
export function clarityConfig(env:Record<string,string|undefined>):ClarityConfig{
 const rehearsal=env.VERCEL_ENV!=='production'&&env.SITEFIT_CLARITY_UI_REHEARSAL==='1';
 return {enabled:rehearsal||env.VERCEL_ENV==='production'&&env.SITE_URL==='https://sitefit.co.uk'&&env.SITEFIT_CLARITY_MEASUREMENT==='1',rehearsal};
}
export function clarityChoice(allowed:unknown,now=Date.now()):ClarityConsent{
 if(typeof allowed!=='boolean')throw Error('invalid_clarity_consent');
 return {version:'sitefit-clarity-v1',allowed,at:now};
}
export function parseClarityConsent(raw:string|undefined,now=Date.now()):ClarityConsent|null{
 try{const r=JSON.parse(raw??'null');if(r.version!=='sitefit-clarity-v1'||Object.keys(r).length!==3||!Number.isSafeInteger(r.at)||r.at>now+60000||r.at<now-consentMaxAge*1000)return null;return clarityChoice(r.allowed,r.at);}catch{return null;}
}
export const optionalClarityCookie=(name:string)=>name==='_clck'||name==='_clsk';
/** Exact static public pages only. Never admit a query, fragment, checker, private ID or arbitrary slug. */
export function clarityPage(href:string,origin:string):boolean{
 try{const u=new URL(href,origin);return u.origin===origin&&!u.search&&!u.hash&&['/','/pricing','/how-it-works','/sample-report','/methodology','/contact','/blog'].includes(u.pathname);}catch{return false;}
}
export type ClaritySink={load:()=>void;stop:()=>void};
/** A document records only its original public page. Any navigation/reduction is terminal until a fresh document. */
export class ClarityMeasurement{
 private injected=false;private terminal=false;private permitted=false;
 private config:ClarityConfig;private sink:ClaritySink;
 constructor(config:ClarityConfig,sink:ClaritySink){this.config=config;this.sink=sink;}
 update(consent:Consent|null,choice:ClarityConsent|null,eligible:boolean){
  this.permitted=this.config.enabled&&eligible&&canMeasure(consent)&&choice?.allowed===true;
  if(!this.permitted){if(this.injected)this.stop();return;}
  if(!this.terminal&&!this.injected){this.injected=true;this.sink.load();}
 }
 allowed(){return this.permitted&&!this.terminal;}
 needsReload(){return this.permitted&&this.terminal;}
 stop(){this.terminal=true;this.permitted=false;if(this.injected)this.sink.stop();}
 loaded(){return this.injected;}
}
