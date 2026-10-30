export const journeyEvents=['landing_view','check_started','address_selected','business_selected','free_analysis_started','free_analysis_completed','free_report_viewed','report_viewed','full_analysis_completed','pdf_downloaded','analysis_failed'] as const;
export type JourneyEvent=typeof journeyEvents[number];
export const sampleEvents=['sample_section_viewed','sample_cta_clicked','sample_pdf_clicked'] as const;
export type SampleEvent=typeof sampleEvents[number];
export type SamplePlacement='navigation'|'hero'|'sticky'|'closing'|'export';
export type SampleTarget='snapshot'|'pricing'|'full'|'section';
export function safeSample(event:SampleEvent,section:string,placement:SamplePlacement,target:SampleTarget='snapshot') {
 if(!sampleEvents.includes(event)||!['overview','customer-context','competition','access','premises','rental-context','actions','appendix'].includes(section)||
   !['navigation','hero','sticky','closing','export'].includes(placement)||!['snapshot','pricing','full','section'].includes(target)||
   event==='sample_section_viewed'&&(placement!=='navigation'||target!=='snapshot')||event==='sample_pdf_clicked'&&(placement!=='export'||!['full','section'].includes(target))||
   event==='sample_cta_clicked'&&(!['hero','sticky','closing'].includes(placement)||!['snapshot','pricing'].includes(target)))throw Error('invalid_sample_event');
 return {event,params:{section,placement,...(event==='sample_section_viewed'?{}:{target})}};
}
export const businessCategories=['coffee-shop','restaurant','hair-salon','beauty-salon'] as const;
export type BusinessCategory=typeof businessCategories[number];
export function safeJourney(name:JourneyEvent,business?:string,reason?:string){
 if(!journeyEvents.includes(name))throw Error('invalid_event');
 return {event:name,params:{...(businessCategories.includes(business as BusinessCategory)?{business_type:business}:{}),...(name==='analysis_failed'?{failure_category:['timeout','unavailable','rejected'].includes(reason??'')?reason:'unavailable'}:{})}};
}
/** Never export page query/hash, report IDs, user titles, addresses or raw referrers. */
export function safePage(path:string){
 if(path==='/')return {path:'/',title:'SiteFit'};
 if(path==='/check-location')return {path,title:'Check a location'};
 if(path.startsWith('/snapshots/'))return {path:'/snapshots/view',title:'Free Snapshot'};
 if(path.startsWith('/reports/'))return {path:'/reports/view',title:'Full Report'};
 if(path.startsWith('/purchase/'))return {path:'/purchase/status',title:'Purchase'};
 if(path.startsWith('/auth/')||path==='/login')return {path:'/login',title:'Sign in'};
 if(path.startsWith('/account'))return {path:'/account',title:'Account'};
 if(['/pricing','/how-it-works','/sample-report','/methodology','/privacy','/terms','/contact','/blog'].includes(path))return {path,title:'SiteFit '+path.slice(1)};
 if(/^\/blog\/[a-z0-9-]+$/.test(path))return {path:'/blog/article',title:'SiteFit Resources'};
 return {path:'/other',title:'SiteFit'};
}
export type Ecommerce={business_type?:BusinessCategory;transaction_id?:string;currency:'GBP';value:number;tax?:number;shipping?:number;items:{item_id:string;item_name:string;price:number;quantity:1}[]};
/** Amounts are provider-verified minor units; value excludes tax/shipping and includes any applied discount. */
export function ecommerce(input:{total:number;tax:number;shipping:number;currency:string;transaction?:string;business?:string}):Ecommerce{
 if(input.currency.toLowerCase()!=='gbp'||[input.total,input.tax,input.shipping].some(n=>!Number.isSafeInteger(n)||n<0)||input.tax+input.shipping>input.total)throw Error('invalid_ecommerce');
 const value=(input.total-input.tax-input.shipping)/100;
 return {...(businessCategories.includes(input.business as BusinessCategory)?{business_type:input.business as BusinessCategory}:{}),...(input.transaction?{transaction_id:input.transaction}:{}),currency:'GBP',value,tax:input.tax/100,shipping:input.shipping/100,items:[{item_id:'sitefit-full-report',item_name:'SiteFit Full Report',price:value,quantity:1}]};
}

export function admittedEcommerce(value:unknown,event:'purchase'|'begin_checkout'|'refund'):Ecommerce{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('invalid_ecommerce');
 const r=value as Record<string,unknown>;
 if(Object.keys(r).some(k=>!['transaction_id','currency','value','tax','shipping','items','business_type'].includes(k))||r.currency!=='GBP'||typeof r.value!=='number'||!Number.isFinite(r.value)||r.value<0||!Array.isArray(r.items)||r.items.length!==1)throw Error('invalid_ecommerce');
 if(event!=='begin_checkout'&&(typeof r.transaction_id!=='string'||!/^sf_[0-9a-f-]{36}$/.test(r.transaction_id)))throw Error('invalid_ecommerce');
 if(r.business_type!==undefined&&!businessCategories.includes(r.business_type as BusinessCategory))throw Error('invalid_ecommerce');
 const tax=r.tax??0,shipping=r.shipping??0;if(typeof tax!=='number'||typeof shipping!=='number')throw Error('invalid_ecommerce');
 const item=r.items[0];if(!item||item.item_id!=='sitefit-full-report'||item.item_name!=='SiteFit Full Report'||item.quantity!==1||item.price!==r.value||Object.keys(item).sort().join(',')!=='item_id,item_name,price,quantity')throw Error('invalid_ecommerce');
 return ecommerce({total:Math.round((r.value+tax+shipping)*100),tax:Math.round(tax*100),shipping:Math.round(shipping*100),currency:'GBP',business:r.business_type as string|undefined,...(event==='begin_checkout'?{}:{transaction:r.transaction_id as string})});
}
