import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound,redirect } from "next/navigation";
import { verifiedUser } from "@/lib/supabase/server";
import { CLAIM_COOKIE,AUTH_RECEIPT_COOKIE,claimCookie,permanentIdentity,validAuthReceipt } from "@/lib/auth/purchase-flow";
import { readClaim } from "@/lib/auth/claim-repository";
import { purchaseOrigin } from "@/lib/payments/config";
import { PurchaseAuth } from "@/components/purchase-auth";
export const dynamic="force-dynamic";
export const metadata: Metadata={title:"Keep your SiteFit report",robots:{index:false,follow:false},referrer:"no-referrer"};
export default async function PurchaseAuthPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 if(!purchaseOrigin(process.env))notFound();
 const proof=claimCookie((await cookies()).get(CLAIM_COOKIE)?.value);const {user}=await verifiedUser();if(!proof||!user)notFound();
 let claim;try{claim=await readClaim(proof);}catch{notFound();}
 if(claim.state==="completed"&&claim.target_id===user.id)redirect(`/purchase/resume?report=${claim.report_id}`);
 if(permanentIdentity(user)&&claim.method&&claim.state==='pending'&&Date.parse(claim.expires_at)>Date.now()&&
  (claim.auth_target_id===user.id||validAuthReceipt((await cookies()).get(AUTH_RECEIPT_COOKIE)?.value,proof,user.id,claim.method,process.env.SUPABASE_SECRET_KEY??'')))redirect('/purchase/resume');
 if(claim.guest_id!==user.id||claim.state!=="pending")notFound();
 const params=await searchParams;
 return <div className="page-wrap narrow-page">{params.error&&<p role="alert" className="field-error">Sign-in did not complete. Keep this browser open and try again, or return to your Snapshot.</p>}<PurchaseAuth test={process.env.VERCEL_ENV!=="production"}/></div>;
}
