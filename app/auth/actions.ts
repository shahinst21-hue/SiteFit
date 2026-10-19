"use server";
import {cookies} from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  callbackCredentials,
  completeAuthCallback,
  authDestination,AUTH_RETURN_COOKIE,
} from "@/lib/auth/flow";
export async function confirmSignIn(form: FormData) {
  const token = form.get("token_hash");
  const credentials = callbackCredentials(
    new URLSearchParams({
      token_hash: typeof token === "string" ? token : "",
      type: "email",
    }),
  );
  const client = await createServerSupabase();
  if (!client) redirect("/login?error=unavailable");
  if (!credentials || !(await completeAuthCallback(credentials, client.auth)))
    redirect("/login?error=invalid-link");
  const jar=await cookies();const destination=authDestination(jar.get(AUTH_RETURN_COOKIE)?.value??form.get('next'));jar.set(AUTH_RETURN_COOKIE,'',{httpOnly:true,secure:process.env.VERCEL_ENV==='production',sameSite:'lax',path:'/auth',maxAge:0});
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
