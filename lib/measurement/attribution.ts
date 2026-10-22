import type {Consent} from './consent.ts';
export type Acquisition=Partial<Record<'utm_source'|'utm_medium'|'utm_campaign'|'utm_content'|'utm_term'|'gclid'|'gbraid'|'wbraid',string>>;
const allow:Record<string,readonly string[]>={utm_source:['google','bing','newsletter','linkedin','sitefit'],utm_medium:['cpc','ppc','paid-search','paid_search','email','social'],utm_campaign:['campaign-01','campaign-02','campaign-03'],utm_content:['search','responsive-search','coffee-shop','restaurant','salon','ad-01','ad-02','ad-03'],utm_term:['coffee-shop-location','restaurant-location','salon-location','commercial-property-report','location-analysis']};
export function acquisition(value:unknown,c:Pick<Consent,'analytics'|'advertising'>):Acquisition{
 if(!c.analytics||!value||typeof value!=='object'||Array.isArray(value))return {};
 const r=value as Record<string,unknown>,out:Acquisition={};
 for(const [key,values] of Object.entries(allow)){const v=r[key];if(typeof v==='string'&&values.includes(v))out[key as keyof Acquisition]=v;}
 if(c.advertising)for(const key of ['gclid','gbraid','wbraid'] as const){const v=r[key];if(typeof v==='string'&&/^[A-Za-z0-9_-]{6,256}$/.test(v))out[key]=v;}
 return out;
}
/** Capture only admitted campaign codes in memory; never save/query arbitrary URL input. */
export function acquisitionFromSearch(search:string):Acquisition{
 const p=new URLSearchParams(search),r:Record<string,string>={};
 for(const key of [...Object.keys(allow),'gclid','gbraid','wbraid'])if(p.getAll(key).length===1)r[key]=p.get(key)!;
 if(!r.utm_campaign&&p.getAll('sf_campaign').length===1)r.utm_campaign=p.get('sf_campaign')!;
 return acquisition(r,{analytics:true,advertising:true});
}
export function parseAcquisition(raw:string|undefined,c:Consent|null,now=Date.now()):Acquisition{
 try{const v=JSON.parse(raw??'null');return c&&Number.isSafeInteger(v.at)&&v.at<=now&&v.at>now-90*86400000?acquisition(v.values,c):{};}catch{return {};}
}
