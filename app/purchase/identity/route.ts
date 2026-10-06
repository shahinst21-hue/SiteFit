import { cookies } from "next/headers";
import { verifiedUser } from "@/lib/supabase/server";
import { purchaseOrigin,purchaseSameOrigin } from "@/lib/payments/config";
import { boundedJson,paymentReply } from "@/lib/payments/http";
import { CLAIM_COOKIE,claimCookie,permanentIdentity,hashProof } from "@/lib/auth/purchase-flow";
import { readClaim,startClaimAuth,recordClaimAuth,cancelClaim } from "@/lib/auth/claim-repository";
import { emailInput } from "@/lib/auth/flow";
import { googleAuthRedirect } from "@/lib/auth/google-redirect";
export async function POST(request: Request){
 if(!purchaseSameOrigin(request,process.env))return paymentReply({error:"Purchasing is not available here."},403);
 try{
  const body=await boundedJson(request);if(Object.keys(body).some(k=>!["action","email","token"].includes(k)))throw Error("invalid_request");
  const proof=claimCookie((await cookies()).get(CLAIM_COOKIE)?.value);if(!proof)throw Error("claim_missing");
  const claim=await readClaim(proof);const {client,user}=await verifiedUser();if(!client||!user)throw Error("session_missing");
  if(claim.state!=="pending"||Date.parse(claim.expires_at)<=Date.now())throw Error("claim_expired");
  if(body.action==="cancel"){
   if(user.id!==claim.guest_id)throw Error("claim_owner_required");
   await cancelClaim(proof,user.id);(await cookies()).delete({name:CLAIM_COOKIE,path:"/purchase"});
   return paymentReply({url:`/snapshots/${claim.report_id}`});
  }
  const email=emailInput(body.email);const origin=purchaseOrigin(process.env)!;
  if(body.action==="verify_email"){
   if(user.id!==claim.guest_id||!user.is_anonymous)throw Error("guest_required");
   if(claim.method!=="email"||!email||hashProof(email.toLowerCase())!==claim.email_sha256||typeof body.token!=="string"||!/^\d{6,10}$/.test(body.token))throw Error("invalid_otp");
   const {error}=await client.auth.verifyOtp({email,token:body.token,type:"email_change"});if(error)throw Error("otp_failed");
   const refreshed=await client.auth.getUser();if(!permanentIdentity(refreshed.data.user))throw Error("permanent_required");
   await recordClaimAuth(proof,refreshed.data.user.id,"email");return paymentReply({url:"/purchase/resume"});
  }
  if(user.id!==claim.guest_id||!user.is_anonymous)throw Error("guest_required");
  const method=body.action==="google"||body.action==="existing_google"?"google":body.action==="email"||body.action==="existing_email"?"email":null;
  if(!method||method==="email"&&!email)throw Error("invalid_action");
  await startClaimAuth(proof,user.id,method,method==="email"?email:null);
  if(method==="google"){
   const credentials={provider:"google" as const,options:{redirectTo:`${origin}/purchase/callback`,skipBrowserRedirect:true,queryParams:{prompt:"select_account"}}};
   const result=body.action==="existing_google"?await client.auth.signInWithOAuth(credentials):await client.auth.linkIdentity(credentials);
   if(result.error||!result.data.url)return paymentReply({error:"Google sign-in could not start. If you already have an account, use its sign-in option."},503);
   return paymentReply({url:googleAuthRedirect(result.data.url,process.env.SUPABASE_URL!,body.action==="google")});
  }
  const result=body.action==="existing_email"?await client.auth.signInWithOtp({email:email!,options:{shouldCreateUser:false,emailRedirectTo:`${origin}/purchase/callback`}}):
   await client.auth.updateUser({email:email!},{emailRedirectTo:`${origin}/purchase/callback`});
  if(result.error)return paymentReply({error:"We could not send that verification. If you already have a SiteFit account, choose Sign in with email."},400);
  return paymentReply({sent:true});
 }catch{return paymentReply({error:"We could not verify this purchase sign-in. Keep the same browser and try again, or return to your Snapshot."},400);}
}
