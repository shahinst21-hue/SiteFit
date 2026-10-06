import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { verifiedUser } from "@/lib/supabase/server";
import { CLAIM_COOKIE,RESUME_COOKIE,AUTH_RECEIPT_COOKIE,claimCookie,permanentIdentity,purchaseUuid,validAuthReceipt } from "@/lib/auth/purchase-flow";
import { readClaim } from "@/lib/auth/claim-repository";
import { purchaseOrigin } from "@/lib/payments/config";
import { PurchaseClaim } from "@/components/purchase-claim";
import { PurchaseButton } from "@/components/purchase-button";
export const dynamic="force-dynamic";
export const metadata: Metadata={title:"Continue your purchase",robots:{index:false,follow:false},referrer:"no-referrer"};
export default async function Resume({searchParams}:{searchParams:Promise<{report?:string}>}){
 if(!purchaseOrigin(process.env))notFound();
 const {client,user}=await verifiedUser();if(!client||!permanentIdentity(user))notFound();
 const {report}=await searchParams;
 if(report&&purchaseUuid(report)){
  const {data,error}=await client.rpc("read_sitefit_free",{p_report:report});if(error||!data)notFound();
  const automatic=(await cookies()).get(RESUME_COOKIE)?.value===report;
  return <div className="page-wrap narrow-page"><h1>Your Snapshot is saved.</h1><p>Test Mode only. No real payment is taken. Full Report generation is not enabled in this development phase.</p><PurchaseButton report={report} checkout automatic={automatic}/><Link href={`/snapshots/${report}`}>Return to your Snapshot</Link></div>;
 }
 const proof=claimCookie((await cookies()).get(CLAIM_COOKIE)?.value);if(!proof)notFound();
 let claim;try{claim=await readClaim(proof);}catch{notFound();}
 const receipt=claim.method&&validAuthReceipt((await cookies()).get(AUTH_RECEIPT_COOKIE)?.value,proof,user.id,claim.method,process.env.SUPABASE_SECRET_KEY??'');
 if((claim.auth_target_id!==user.id&&!receipt)||!["pending","completed"].includes(claim.state)||Date.parse(claim.expires_at)<=Date.now())notFound();
 return <div className="page-wrap narrow-page"><h1>Keep your original Snapshot.</h1><PurchaseClaim/></div>;
}
