import { createHash,createHmac,timingSafeEqual,randomBytes } from "node:crypto";
import { uuid } from "../data/validation.ts";
export { uuid as purchaseUuid } from "../data/validation.ts";
export type PurchaseIdentity = {
 id: string; is_anonymous?: boolean; email?: string; email_confirmed_at?: string;
 identities?: { provider: string }[];
};
export function permanentIdentity(user: PurchaseIdentity | null): user is PurchaseIdentity & { email: string } {
 return !!user && uuid(user.id) && user.is_anonymous === false && !!user.email_confirmed_at &&
  typeof user.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email) && user.email.length<=254 &&
  !!user.identities?.some(identity=>identity.provider==="email"||identity.provider==="google");
}
export const hashProof = (value: string) => createHash("sha256").update(value).digest("hex");
export const newProof = () => randomBytes(32).toString("hex");
export type ClaimCookie = { id: string; capability: string; browser: string };
export function claimCookie(value: unknown): ClaimCookie | null {
 if(typeof value!=="string")return null;
 const [id,capability,browser,...extra]=value.split(".");
 return uuid(id)&&/^[a-f0-9]{64}$/.test(capability??"")&&/^[a-f0-9]{64}$/.test(browser??"")&&!extra.length?{id,capability,browser}:null;
}
export const CLAIM_COOKIE="sitefit_purchase_claim";
export const RESUME_COOKIE="sitefit_purchase_resume";
export const AUTH_RECEIPT_COOKIE="sitefit_purchase_auth_receipt";
// A short continuation receipt covers a DB-write failure after PKCE consumes its
// code. It never replaces getUser(), the guest proofs or SQL authorisation.
function receiptSignature(payload:string,secret:string){
 if(!secret)throw Error('receipt_unavailable');
 return createHmac('sha256',createHash('sha256').update('sitefit:claim-auth:v1:'+secret).digest()).update(payload).digest('hex');
}
export function signedAuthReceipt(proof:ClaimCookie,target:string,method:'email'|'google',secret:string,now=Date.now()){
 const payload=Buffer.from(JSON.stringify({claim:proof.id,target,method,proof:hashProof(proof.capability+'.'+proof.browser),expires:now+600000})).toString('base64url');
 return payload+'.'+receiptSignature(payload,secret);
}
export function validAuthReceipt(value:unknown,proof:ClaimCookie,target:string,method:'email'|'google',secret:string,now=Date.now()):boolean{
 try{
  if(typeof value!=='string'||value.length>1024)return false;
  const [payload,signature,...extra]=value.split('.');
  if(extra.length||!signature||!/^[a-f0-9]{64}$/.test(signature))return false;
  if(!timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(receiptSignature(payload,secret),'hex')))return false;
  const body=JSON.parse(Buffer.from(payload,'base64url').toString());
  return body.claim===proof.id&&body.target===target&&body.method===method&&body.proof===hashProof(proof.capability+'.'+proof.browser)&&Number.isSafeInteger(body.expires)&&body.expires>now&&body.expires<=now+600000;
 }catch{return false;}
}
