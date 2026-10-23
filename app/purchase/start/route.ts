import { cookies } from "next/headers";
import { verifiedUser } from "@/lib/supabase/server";
import { purchaseSameOrigin } from "@/lib/payments/config";
import { boundedJson,paymentReply } from "@/lib/payments/http";
import { RESUME_COOKIE,permanentIdentity } from "@/lib/auth/purchase-flow";
import {prepareGuestPurchase} from "@/lib/auth/guest-purchase";
import { purchaseUuid as uuid } from "@/lib/auth/purchase-flow";
import { validateFreeProjection } from "@/lib/analysis/projection";
import { observeCampaign } from "@/lib/marketing/repository";
import {controlledTrialConfigured} from '@/lib/proof/trial-policy';
import {assertTrialOwner} from '@/lib/proof/trial';
export async function POST(request: Request){
 if(!purchaseSameOrigin(request,process.env))return paymentReply({error:"Purchasing is not available here."},403);
 try{
  const body=await boundedJson(request);if(Object.keys(body).length!==1||!uuid(body.reportId))return paymentReply({error:"Choose your saved Snapshot."},400);
  const {client,user}=await verifiedUser();if(!client||!user)return paymentReply({error:"Your Snapshot session is unavailable."},401);
  if(controlledTrialConfigured(process.env))await assertTrialOwner(user,new URL(request.url).hostname);
  const {data,error}=await client.rpc("read_sitefit_free",{p_report:body.reportId});if(error||!data)return paymentReply({error:"Snapshot not found."},404);
  validateFreeProjection(data);
  await observeCampaign(user.id,body.reportId,true);
  if(permanentIdentity(user)){
   (await cookies()).set(RESUME_COOKIE,body.reportId,{httpOnly:true,secure:request.url.startsWith("https:"),sameSite:"strict",path:"/purchase",maxAge:600});
   return paymentReply({url:`/purchase/resume?report=${body.reportId}`});
  }
  if(!user.is_anonymous)return paymentReply({error:"Verify your account before purchasing."},403);
  await prepareGuestPurchase(user,body.reportId,request.url.startsWith('https:'));
  return paymentReply({url:"/purchase/auth"});
 }catch{return paymentReply({error:"A purchase sign-in may already be open. Finish it or return to your Snapshot and retry."},409);}
}
