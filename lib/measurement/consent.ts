export const CONSENT_COOKIE='sitefit_consent_v1',ACQUISITION_COOKIE='sitefit_acquisition_v1';
export const consentVersion='sitefit-measurement-v1';
export const consentMaxAge=60*60*24*180;
export type Consent={version:typeof consentVersion;analytics:boolean;advertising:boolean;personalization:boolean;at:number};
export const deniedConsent=():Consent=>({version:consentVersion,analytics:false,advertising:false,personalization:false,at:Date.now()});
export function consentChoice(value:unknown,now=Date.now()):Consent{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('invalid_consent');
 const r=value as Record<string,unknown>;
 if(Object.keys(r).sort().join(',')!=='advertising,analytics,personalization'||['analytics','advertising','personalization'].some(k=>typeof r[k]!=='boolean')||r.personalization&&!r.advertising)throw Error('invalid_consent');
 return {version:consentVersion,analytics:r.analytics as boolean,advertising:r.advertising as boolean,personalization:r.personalization as boolean,at:now};
}
export function parseConsent(raw:string|undefined,now=Date.now()):Consent|null{
 try{const r=JSON.parse(raw??'null');if(r.version!==consentVersion||!Number.isSafeInteger(r.at)||r.at>now+60000||r.at<now-consentMaxAge*1000)return null;
 const c=consentChoice({analytics:r.analytics,advertising:r.advertising,personalization:r.personalization},r.at);return Object.keys(r).length===5?c:null;}catch{return null;}
}
export function googleConsent(c:Consent){return {analytics_storage:c.analytics?'granted':'denied',ad_storage:c.advertising?'granted':'denied',ad_user_data:c.advertising?'granted':'denied',ad_personalization:c.advertising&&c.personalization?'granted':'denied'};}
/** Strict Basic mode: the one shared Ads/GA tag cannot load until BOTH measurement purposes are allowed. No denied-purpose pings. */
export const canMeasure=(c:Consent|null)=>c?.analytics===true&&c.advertising===true;
