import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { verifiedUser } from "@/lib/supabase/server";
import { CLAIM_COOKIE,AUTH_RECEIPT_COOKIE,claimCookie,permanentIdentity,purchaseUuid,validAuthReceipt } from "@/lib/auth/purchase-flow";
import { readClaim } from "@/lib/auth/claim-repository";
import { purchaseOrigin } from "@/lib/payments/config";
import { activePurchaseId } from "@/lib/payments/purchase-projection";
import { PurchaseClaim } from "@/components/purchase-claim";
import { PurchaseTerms } from "@/components/purchase-terms";
import { formatPrice,site } from "@/lib/site-config";
import {controlledTrialConfigured} from '@/lib/proof/trial-policy';
import {assertTrialOwner} from '@/lib/proof/trial';
export const dynamic="force-dynamic";
export const metadata: Metadata={title:"Continue your purchase",robots:{index:false,follow:false},referrer:"no-referrer"};
export default async function Resume({searchParams}:{searchParams:Promise<{report?:string}>}){
 if(!purchaseOrigin(process.env))notFound();
 const {client,user}=await verifiedUser();if(!client||!permanentIdentity(user))notFound();
 if(controlledTrialConfigured(process.env))try{await assertTrialOwner(user);}catch{notFound();}
 const {report}=await searchParams;
 if(report&&purchaseUuid(report)){
  const {data,error}=await client.rpc("read_sitefit_free",{p_report:report});if(error||!data)notFound();
  const purchase=await client.rpc("read_sitefit_purchase",{p_report:report});
  if(purchase.error)notFound();
  const active=activePurchaseId(purchase.data,process.env.VERCEL_ENV!=="production");
  if(active)redirect(`/purchase/return?purchase=${active}`);
  return <div className="page-wrap narrow-page"><p className="eyebrow">REVIEW YOUR PURCHASE</p><h1>Your Snapshot is saved. Review the Full Report purchase.</h1><section className="simple-panel"><p>One Full Report for this location: {formatPrice(site.pricing.fullReport)}, paid once. {process.env.VERCEL_ENV!=="production"&&"This is Test Checkout; no real payment is taken."}</p><p className="field-help">Review the terms below before continuing to Stripe. Preparation starts only when the purchase and confirmation requirements are met. Your Free Snapshot stays unchanged.</p><PurchaseTerms report={report}/><Link className="text-link" href={`/snapshots/${report}`}>Return to your Snapshot</Link></section></div>;
 }
 const proof=claimCookie((await cookies()).get(CLAIM_COOKIE)?.value);if(!proof)notFound();
 let claim;try{claim=await readClaim(proof);}catch{notFound();}
 const receipt=claim.method&&validAuthReceipt((await cookies()).get(AUTH_RECEIPT_COOKIE)?.value,proof,user.id,claim.method,process.env.SUPABASE_SECRET_KEY??'');
 if((claim.auth_target_id!==user.id&&!receipt)||!["pending","completed"].includes(claim.state)||Date.parse(claim.expires_at)<=Date.now())notFound();
 return <div className="page-wrap narrow-page"><h1>Keep your original Snapshot.</h1><PurchaseClaim/></div>;
}
