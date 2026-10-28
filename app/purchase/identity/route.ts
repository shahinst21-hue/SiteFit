import { cookies } from "next/headers";
import { verifiedUser } from "@/lib/supabase/server";
import { purchaseOrigin,purchaseSameOrigin } from "@/lib/payments/config";
import { boundedJson,paymentReply } from "@/lib/payments/http";
import { CLAIM_COOKIE,claimCookie,hashProof } from "@/lib/auth/purchase-flow";
import { readClaim,startClaimAuth,cancelClaim } from "@/lib/auth/claim-repository";
import {signEmailContinuation} from '@/lib/auth/email-continuation';
import { emailInput } from "@/lib/auth/flow";
import { googleAuthRedirect } from "@/lib/auth/google-redirect";
import {prepareGuestPurchase} from '@/lib/auth/guest-purchase';
function safeAuthCode(error:unknown){
 const code=error&&typeof error==='object'&&'code' in error?error.code:error instanceof Error?error.message:null;
 return typeof code==='string'&&['email_address_not_authorized','over_email_send_rate_limit','provider_disabled','validation_failed','claim_missing','claim_expired','claim_auth_unavailable','claim_already_verified','guest_required','session_missing','invalid_otp'].includes(code)?code:'unavailable';
}
export async function POST(request: Request){
 if(!purchaseSameOrigin(request,process.env))return paymentReply({error:"Purchasing is not available here."},403);
 let stage='request';
 try{
  const body=await boundedJson(request);if(Object.keys(body).some(k=>!["action","email"].includes(k)))throw Error("invalid_request");
  stage='claim';let proof=claimCookie((await cookies()).get(CLAIM_COOKIE)?.value);if(!proof)throw Error("claim_missing");
  let claim=await readClaim(proof);const {client,user}=await verifiedUser();if(!client||!user)throw Error("session_missing");
  if(claim.state!=="pending")throw Error("claim_expired");
  if(body.action==="cancel"){
   if(user.id!==claim.guest_id)throw Error("claim_owner_required");
   await cancelClaim(proof,user.id);(await cookies()).delete({name:CLAIM_COOKIE,path:"/purchase"});
   return paymentReply({url:`/snapshots/${claim.report_id}`});
  }
  const email=emailInput(body.email);const origin=purchaseOrigin(process.env)!;
  if(user.id!==claim.guest_id||!user.is_anonymous)throw Error("guest_required");
  const method=body.action==="google"||body.action==="existing_google"?"google":body.action==="email"||body.action==="existing_email"?"email":null;
  if(!method||method==="email"&&!email)throw Error("invalid_action");
  if(claim.auth_target_id)throw Error('claim_already_verified');
  if(Date.parse(claim.expires_at)<=Date.now()||claim.method!==null&&(claim.method!==method||claim.email_sha256!==(email&&method==='email'?hashProof(email.toLowerCase()):null))){
   // Change an unverified attempt through the existing cancel/reprepare graph.
   // Rotate both proofs; never rewrite verified/completed identity bindings.
   await cancelClaim(proof,user.id);
   proof=await prepareGuestPurchase(user,claim.report_id,origin.startsWith('https:'));
   claim=await readClaim(proof);
  }
  stage='start-auth';await startClaimAuth(proof,user.id,method,method==="email"?email:null);
  if(method==="google"){
   stage='google';
   const credentials={provider:"google" as const,options:{redirectTo:`${origin}/purchase/callback`,skipBrowserRedirect:true,queryParams:{prompt:"select_account"}}};
   const result=await client.auth.signInWithOAuth(credentials);
   if(result.error||!result.data.url){console.warn('purchase_signin_failure',{stage,code:safeAuthCode(result.error)});return paymentReply({error:"Google sign-in could not start. Your Snapshot is saved; please try again."},503);}
   return paymentReply({url:googleAuthRedirect(result.data.url,process.env.SUPABASE_URL!,false)});
  }
  stage='email';const result=await client.auth.signInWithOtp({email:email!,options:{shouldCreateUser:true,emailRedirectTo:`${origin}/purchase/callback?continuation=${signEmailContinuation(proof,claim.report_id,email!,claim.expires_at,process.env.SUPABASE_SECRET_KEY??'')}`}});
  if(result.error){console.warn('purchase_signin_failure',{stage,code:safeAuthCode(result.error)});return paymentReply({error:"We could not send your sign-in link. Your Snapshot is saved. Try Google or request a link later."},result.error.status===429?429:503);}
  return paymentReply({sent:true});
 }catch(error){console.warn('purchase_signin_failure',{stage,code:safeAuthCode(error)});return paymentReply({error:"We could not verify this purchase sign-in. Keep the same browser and try again, or return to your Snapshot."},400);}
}
