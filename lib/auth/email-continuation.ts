import {createHmac,timingSafeEqual} from 'node:crypto';
import {uuid} from '../data/validation.ts';
import {hashProof,type ClaimCookie} from './purchase-flow.ts';

export const EMAIL_RECEIPT_COOKIE='sitefit_email_claim_receipt';
type EmailContinuation={claim:string;capability:string;report:string;emailHash:string;expires:number};
function sign(payload:string,secret:string,purpose:string){
 if(!secret)throw Error('email_continuation_unavailable');
 return createHmac('sha256',secret).update(`sitefit:${purpose}:v1:${payload}`).digest('hex');
}
function unpack(value:unknown,secret:string,purpose:string):Record<string,unknown>|null{
 try{
  if(typeof value!=='string'||value.length>2048)return null;
  const [payload,signature,...rest]=value.split('.');
  if(rest.length||!payload||!/^[a-f0-9]{64}$/.test(signature??'')||!timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(sign(payload,secret,purpose),'hex')))return null;
  return JSON.parse(Buffer.from(payload,'base64url').toString());
 }catch{return null;}
}
export function signEmailContinuation(proof:ClaimCookie,report:string,email:string,expires:string,secret:string){
 const payload=Buffer.from(JSON.stringify({claim:proof.id,capability:proof.capability,report,emailHash:hashProof(email.toLowerCase()),expires:Date.parse(expires)})).toString('base64url');
 const result=payload+'.'+sign(payload,secret,'email-claim');
 if(!readEmailContinuation(result,secret))throw Error('email_continuation_unavailable');
 return result;
}
export function readEmailContinuation(value:unknown,secret:string,now=Date.now()):EmailContinuation|null{
 const v=unpack(value,secret,'email-claim');
 return v&&uuid(v.claim)&&uuid(v.report)&&typeof v.capability==='string'&&/^[a-f0-9]{64}$/.test(v.capability)&&typeof v.emailHash==='string'&&/^[a-f0-9]{64}$/.test(v.emailHash)&&typeof v.expires==='number'&&Number.isSafeInteger(v.expires)&&v.expires>now&&v.expires<=now+3600000?v as EmailContinuation:null;
}
/** RedirectTo is carried as one nested URL, never an authority for arbitrary navigation. */
export function emailReturn(value:unknown,origin:string,secret:string):{continuation:string|null;next:string}|null{
 try{
  if(typeof value!=='string')return null;
  const u=new URL(value);
  if(u.origin!==origin||u.username||u.password||u.hash)return null;
  if(u.pathname==='/purchase/callback'&&u.searchParams.size===1){
   const c=u.searchParams.get('continuation');
   return readEmailContinuation(c,secret)?{continuation:c,next:'/account'}:null;
  }
  if(u.pathname==='/auth/callback'&&!u.search)return {continuation:null,next:'/account'};
  if(u.pathname==='/auth/confirm'&&u.searchParams.size===1){
   const next=u.searchParams.get('next');
   if(next==='/account'||next==='/check-location'||next==='/purchase/continue'||typeof next==='string'&&/^\/purchase\/resume\?report=[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(next))return {continuation:null,next};
  }
 }catch{/* Fixed local destinations only. */}
 return null;
}
/** Issued only after token verification; retries never consume the one-time token again. */
export function signEmailReceipt(continuation:string,target:string,secret:string,now=Date.now()){
 const payload=Buffer.from(JSON.stringify({continuation,target,expires:now+600000})).toString('base64url');
 return payload+'.'+sign(payload,secret,'email-receipt');
}
export function readEmailReceipt(value:unknown,target:string,secret:string,now=Date.now()):string|null{
 const v=unpack(value,secret,'email-receipt');
 return v&&v.target===target&&typeof v.expires==='number'&&v.expires>now&&v.expires<=now+600000&&readEmailContinuation(v.continuation,secret,now)?v.continuation as string:null;
}
