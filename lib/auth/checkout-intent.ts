import {createHmac,timingSafeEqual} from 'node:crypto';
import {validateSaleConsent,type SaleConsent} from '../legal/sale.ts';
import {uuid} from '../data/validation.ts';
export const CHECKOUT_INTENT_COOKIE='sitefit_checkout_intent';
const ttl=10*60*1000;
export function signCheckoutIntent(report:string,consent:SaleConsent,secret:string,now=Date.now()){
 if(!uuid(report)||!secret)throw Error('invalid_checkout_intent');
 const payload=Buffer.from(JSON.stringify({report,consent:validateSaleConsent(consent),expires:now+ttl})).toString('base64url');
 return payload+'.'+createHmac('sha256',secret).update('sitefit:checkout-intent:v1:'+payload).digest('hex');
}
export function readCheckoutIntent(value:unknown,secret:string,now=Date.now()):{report:string;consent:SaleConsent}|null{
 try{if(typeof value!=='string'||value.length>2048||!secret)return null;
 const [payload,signature,...extra]=value.split('.');if(extra.length||!payload||!signature||!/^[a-f0-9]{64}$/.test(signature))return null;
 const expected=createHmac('sha256',secret).update('sitefit:checkout-intent:v1:'+payload).digest();
 if(!timingSafeEqual(Buffer.from(signature,'hex'),expected))return null;
 const v=JSON.parse(Buffer.from(payload,'base64url').toString());if(!uuid(v.report)||!Number.isSafeInteger(v.expires)||v.expires<=now||v.expires>now+ttl)return null;
 return {report:v.report,consent:validateSaleConsent(v.consent)};
 }catch{return null;}
}
