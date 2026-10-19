import {CHECKOUT_INTENT_COOKIE,readCheckoutIntent} from '@/lib/auth/checkout-intent';
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { verifiedUser } from "@/lib/supabase/server";
import { CLAIM_COOKIE,AUTH_RECEIPT_COOKIE,claimCookie,permanentIdentity,purchaseUuid,validAuthReceipt } from "@/lib/auth/purchase-flow";
import { readClaim } from "@/lib/auth/claim-repository";
import { purchaseOrigin } from "@/lib/payments/config";
import { activePurchaseId } from "@/lib/payments/purchase-projection";
import { PurchaseClaim } from "@/components/purchase-claim";


import {controlledTrialConfigured} from '@/lib/proof/trial-policy';
import {assertTrialOwner} from '@/lib/proof/trial';
export const dynamic="force-dynamic";
export const metadata: Metadata={title:"Continue your purchase",robots:{index:false,follow:false},referrer:"no-referrer"};
export default async function Resume({searchParams}:{searchParams:Promise<{report?:string}>}){
 if(!purchaseOrigin(process.env))notFound();
 const {report}=await searchParams;
 const {client,user}=await verifiedUser();if(!client||!permanentIdentity(user)){
 if(report&&purchaseUuid(report))redirect(`/login?next=${encodeURIComponent(`/purchase/resume?report=${report}`)}`);
 notFound();
 }
 if(controlledTrialConfigured(process.env))try{await assertTrialOwner(user);}catch{notFound();}
 if(report&&purchaseUuid(report)){
  const {data,error}=await client.rpc("read_sitefit_free",{p_report:report});if(error||!data)notFound();
  const purchase=await client.rpc("read_sitefit_purchase",{p_report:report});
  if(purchase.error)notFound();
  const active=activePurchaseId(purchase.data,process.env.VERCEL_ENV!=="production");
  if(active)redirect(`/purchase/return?purchase=${active}`);
  const intent=readCheckoutIntent((await cookies()).get(CHECKOUT_INTENT_COOKIE)?.value,process.env.SUPABASE_SECRET_KEY??'');
  if(intent?.report===report)redirect('/purchase/continue');
  redirect(`/snapshots/${report}?purchase=1`);
 }
 const proof=claimCookie((await cookies()).get(CLAIM_COOKIE)?.value);if(!proof)notFound();
 let claim;try{claim=await readClaim(proof);}catch{notFound();}
 const receipt=claim.method&&validAuthReceipt((await cookies()).get(AUTH_RECEIPT_COOKIE)?.value,proof,user.id,claim.method,process.env.SUPABASE_SECRET_KEY??'');
 if((claim.auth_target_id!==user.id&&!receipt)||!["pending","completed"].includes(claim.state)||Date.parse(claim.expires_at)<=Date.now())notFound();
 return <div className="page-wrap narrow-page"><h1>Keep your original Snapshot.</h1><PurchaseClaim/></div>;
}
