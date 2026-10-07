import { NextResponse,type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabase } from "@/lib/supabase/server";
import { purchaseOrigin } from "@/lib/payments/config";
import { callbackCredentials,completeAuthCallback } from "@/lib/auth/flow";
import { CLAIM_COOKIE,AUTH_RECEIPT_COOKIE,claimCookie,permanentIdentity,signedAuthReceipt } from "@/lib/auth/purchase-flow";
import { readClaim,recordClaimAuth } from "@/lib/auth/claim-repository";
export async function GET(request: NextRequest){
 const origin=purchaseOrigin(process.env);if(!origin)return new Response(null,{status:404});
 let destination="/purchase/auth?error=invalid-link";
 try{
  const proof=claimCookie((await cookies()).get(CLAIM_COOKIE)?.value);const credentials=callbackCredentials(request.nextUrl.searchParams);
  if(!proof||credentials?.kind!=="code")throw Error("invalid_callback");
  const claim=await readClaim(proof);if(!claim.method||claim.state!=="pending"||Date.parse(claim.expires_at)<=Date.now())throw Error("invalid_claim");
  const client=await createServerSupabase();if(!client||!await completeAuthCallback(credentials,client.auth))throw Error("invalid_callback");
  const {data,error}=await client.auth.getUser();if(error||!permanentIdentity(data.user)||!data.user.identities?.some(i=>i.provider===claim.method))throw Error("invalid_identity");
  (await cookies()).set(AUTH_RECEIPT_COOKIE,signedAuthReceipt(proof,data.user.id,claim.method,process.env.SUPABASE_SECRET_KEY??''),{httpOnly:true,secure:origin.startsWith('https:'),sameSite:'lax',path:'/purchase',maxAge:600});
  destination="/purchase/resume";
  try{await recordClaimAuth(proof,data.user.id,claim.method);}catch{/* Resume retries the receipt write after fresh getUser and proof validation. */}
 }catch{/* Safe fixed callback error; no provider output or token logging. */}
 const response=NextResponse.redirect(new URL(destination,origin),303);response.headers.set("Cache-Control","private, no-store");response.headers.set("Referrer-Policy","no-referrer");return response;
}
