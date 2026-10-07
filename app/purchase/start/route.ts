import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { verifiedUser } from "@/lib/supabase/server";
import { purchaseSameOrigin } from "@/lib/payments/config";
import { boundedJson,paymentReply } from "@/lib/payments/http";
import { CLAIM_COOKIE,RESUME_COOKIE,claimCookie,newProof,permanentIdentity } from "@/lib/auth/purchase-flow";
import { prepareClaim,readClaim } from "@/lib/auth/claim-repository";
import { purchaseUuid as uuid } from "@/lib/auth/purchase-flow";
import { validateFreeProjection } from "@/lib/analysis/projection";
export async function POST(request: Request){
 if(!purchaseSameOrigin(request,process.env))return paymentReply({error:"Purchasing is not available here."},403);
 try{
  const body=await boundedJson(request);if(Object.keys(body).length!==1||!uuid(body.reportId))return paymentReply({error:"Choose your saved Snapshot."},400);
  const {client,user}=await verifiedUser();if(!client||!user)return paymentReply({error:"Your Snapshot session is unavailable."},401);
  const {data,error}=await client.rpc("read_sitefit_free",{p_report:body.reportId});if(error||!data)return paymentReply({error:"Snapshot not found."},404);
  validateFreeProjection(data);
  if(permanentIdentity(user)){
   (await cookies()).set(RESUME_COOKIE,body.reportId,{httpOnly:true,secure:request.url.startsWith("https:"),sameSite:"strict",path:"/purchase",maxAge:600});
   return paymentReply({url:`/purchase/resume?report=${body.reportId}`});
  }
  if(!user.is_anonymous)return paymentReply({error:"Verify your account before purchasing."},403);
  const jar=await cookies();const existing=claimCookie(jar.get(CLAIM_COOKIE)?.value);
  let reusable=existing;
  if(existing){
   try{const pending=await readClaim(existing);if(pending.guest_id!==user.id||pending.state!=="pending"||Date.parse(pending.expires_at)<=Date.now())reusable=null;}
   catch{reusable=null;}
  }
  const proof=reusable??{id:randomUUID(),capability:newProof(),browser:newProof()};
  const claim=await prepareClaim(user.id,body.reportId,proof);
  jar.set(CLAIM_COOKIE,`${claim.id}.${proof.capability}.${proof.browser}`,{httpOnly:true,secure:request.url.startsWith("https:"),sameSite:"lax",path:"/purchase",maxAge:3600});
  return paymentReply({url:"/purchase/auth"});
 }catch{return paymentReply({error:"A purchase sign-in may already be open. Finish it or return to your Snapshot and retry."},409);}
}
