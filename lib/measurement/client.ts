import type {JourneyEvent,Ecommerce,SampleEvent,SamplePlacement,SampleTarget} from './events.ts';
import type {GoogleMeasurement} from './runtime.ts';
let runtime:GoogleMeasurement|null=null;
export function installMeasurement(value:GoogleMeasurement){runtime=value;window.dispatchEvent(new Event('sitefit-google-ready'));}
export const measurementAllowed=()=>runtime?.allowed()===true;
export const measurementEligible=(at?:string)=>runtime?.eligible(at)===true;
export function trackJourney(name:JourneyEvent,key:string,business?:string,reason?:string){runtime?.track(name,key,business,reason);}
export function trackSample(name:SampleEvent,section:string,placement:SamplePlacement,target:SampleTarget='snapshot'){runtime?.sample(name,section,placement,target);}
/** Server claims, not browser storage, are the purchase/checkout deduplication authority. Failure never blocks the product. */
export async function trackEcommerce(paymentId:string,event:'purchase'|'begin_checkout'){
 if(!measurementAllowed()||!/^[0-9a-f-]{36}$/i.test(paymentId))return;
 try{const response=await fetch('/api/measurement/purchase',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({paymentId,event}),signal:AbortSignal.timeout(event==='begin_checkout'?1800:15000)});
 if(!response.ok||!measurementAllowed())return;const value:unknown=await response.json();
 if(!value||typeof value!=='object'||!('events' in value)||!Array.isArray(value.events))return;
 for(const entry of value.events){if(!measurementAllowed())return;if(entry&&typeof entry==='object'&&['purchase','begin_checkout','refund'].includes(entry.name)&&entry.payload?.currency==='GBP'&&typeof entry.payload.value==='number'&&Array.isArray(entry.payload.items))runtime?.ecommerce(entry.name,entry.payload as Ecommerce);}
 }catch{/* At most once dispatch can undercount after a lost response/blocker; no automatic payment or ambiguous event retry. */}
}
export async function bindAcquisition(report:string){
 if(!measurementAllowed())return;try{await fetch('/api/measurement/attribution',{keepalive:true,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({report}),signal:AbortSignal.timeout(1500)});}catch{/* Reporting only. */}
}
