import 'server-only';
import {cookies} from 'next/headers';
import {measurementConfig} from './config.ts';
import {CONSENT_COOKIE,ACQUISITION_COOKIE,canMeasure,parseConsent} from './consent.ts';
import {parseAcquisition} from './attribution.ts';
import {frameworkClient} from '../data/server-client.ts';
export async function measurementAuthority(){
 const config=measurementConfig(process.env),jar=await cookies(),consent=parseConsent(jar.get(CONSENT_COOKIE)?.value);
 return config.enabled&&!config.rehearsal&&canMeasure(consent)&&consent?{config,consent,acquisition:parseAcquisition(jar.get(ACQUISITION_COOKIE)?.value,consent)}:null;
}
export type MeasurementRpc={rpc(name:string,args:Record<string,unknown>):{abortSignal(signal:AbortSignal):PromiseLike<{data:unknown;error:unknown}>}};
export const measurementRepository=()=>frameworkClient() as unknown as MeasurementRpc;

export const measurementReply=(body:object,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'}});
