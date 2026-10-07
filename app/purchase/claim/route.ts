import { cookies } from "next/headers";
import { verifiedUser } from "@/lib/supabase/server";
import { CLAIM_COOKIE,RESUME_COOKIE,AUTH_RECEIPT_COOKIE,claimCookie,permanentIdentity,validAuthReceipt } from "@/lib/auth/purchase-flow";
import { finishClaim,readClaim,recordClaimAuth } from "@/lib/auth/claim-repository";
import { purchaseSameOrigin } from "@/lib/payments/config";
import { boundedJson,paymentReply } from "@/lib/payments/http";
export async function POST(request: Request){
 if(!purchaseSameOrigin(request,process.env))return paymentReply({error:"Purchasing is unavailable."},403);
 try{
  const body=await boundedJson(request);if(Object.keys(body).length)throw Error("invalid_request");
  const proof=claimCookie((await cookies()).get(CLAIM_COOKIE)?.value);
  const {user}=await verifiedUser();if(!proof||!permanentIdentity(user))throw Error("permanent_required");
  const claim=await readClaim(proof);
  if(!claim.auth_target_id){
   if(!claim.method||!user.identities?.some(i=>i.provider===claim.method)||!validAuthReceipt((await cookies()).get(AUTH_RECEIPT_COOKIE)?.value,proof,user.id,claim.method,process.env.SUPABASE_SECRET_KEY??''))throw Error('auth_receipt_required');
   await recordClaimAuth(proof,user.id,claim.method);
  }
  const report=await finishClaim(proof,user.id);
  (await cookies()).set(RESUME_COOKIE,report,{httpOnly:true,secure:request.url.startsWith("https:"),sameSite:"strict",path:"/purchase",maxAge:600});
  return paymentReply({url:`/purchase/resume?report=${report}`});
 }catch{return paymentReply({error:"We could not save this account connection. Your original Snapshot has not changed."},409);}
}
