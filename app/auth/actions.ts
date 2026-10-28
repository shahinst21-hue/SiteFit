"use server";
import {cookies} from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import {emailReturn,readEmailContinuation,EMAIL_RECEIPT_COOKIE,signEmailReceipt,readEmailReceipt} from '@/lib/auth/email-continuation';
import {permanentIdentity,hashProof} from '@/lib/auth/purchase-flow';
import {finishEmailClaim} from '@/lib/auth/claim-repository';
import {headers} from 'next/headers';
import {
  callbackCredentials,
  completeAuthCallback,
  authDestination,AUTH_RETURN_COOKIE,
} from "@/lib/auth/flow";
export async function confirmSignIn(form: FormData) {
  const requestHeaders=await headers();
  const origin=new URL(process.env.SITE_URL??'http://localhost:3000').origin;
  if(requestHeaders.get('origin')!==origin||requestHeaders.get('sec-fetch-site')==='cross-site')redirect('/login?error=invalid-link');
  const secret=process.env.SUPABASE_SECRET_KEY??'';
  const jar=await cookies();
  const retry=form.get('retry')==='1';
  const returnValue=form.get('next');
  // A malformed purchase continuation must never degrade into an unbound account login.
  const emailNext=emailReturn(returnValue,origin,secret);
  if(!retry&&typeof returnValue==='string'&&returnValue.startsWith('http')&&!emailNext)redirect('/login?error=invalid-link');
  const token = form.get("token_hash");
  const credentials = callbackCredentials(
    new URLSearchParams({
      token_hash: typeof token === "string" ? token : "",
      type: "email",
    }),
  );
  const client = await createServerSupabase();
  if (!client) redirect("/login?error=unavailable");
  if (!retry&&(!credentials || !(await completeAuthCallback(credentials, client.auth))))
    redirect("/login?error=invalid-link");
  const {data,error}=await client.auth.getUser();
  if(error||!permanentIdentity(data.user))redirect('/login?error=invalid-link');
  const continuation=retry?readEmailReceipt(jar.get(EMAIL_RECEIPT_COOKIE)?.value,data.user.id,secret):emailNext?.continuation;
  if(retry&&!continuation)redirect('/login?error=invalid-link');
  if(continuation){
    const claim=readEmailContinuation(continuation,secret);
    if(!claim||hashProof(data.user.email.toLowerCase())!==claim.emailHash)redirect('/login?error=invalid-link');
    if(!retry)jar.set(EMAIL_RECEIPT_COOKIE,signEmailReceipt(continuation,data.user.id,secret),{httpOnly:true,secure:origin.startsWith('https:'),sameSite:'lax',path:'/auth',maxAge:600});
    let report:string;
    try{report=await finishEmailClaim(claim.claim,data.user.id,claim.capability,claim.report);}
    catch{redirect('/auth/confirm?retry=1');}
    jar.set(EMAIL_RECEIPT_COOKIE,'',{httpOnly:true,secure:origin.startsWith('https:'),sameSite:'lax',path:'/auth',maxAge:0});
    redirect(`/purchase/resume?report=${report}`);
  }
  const destination=emailNext?.next??authDestination(jar.get(AUTH_RETURN_COOKIE)?.value??form.get('next'));jar.set(AUTH_RETURN_COOKIE,'',{httpOnly:true,secure:process.env.VERCEL_ENV==='production',sameSite:'lax',path:'/auth',maxAge:0});
  redirect(destination);
}
export async function signOut() {
  const client = await createServerSupabase();
  if (!client) redirect("/login?error=unavailable");
  let failed: boolean;
  try {
    const result = await client.auth.signOut({ scope: "local" });
    failed = !!result.error;
  } catch {
    failed = true;
  }
  if (failed) redirect("/login?error=sign-out-failed");
  redirect("/login?signed_out=1");
}
