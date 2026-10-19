import {cookies} from 'next/headers';
import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  authDestination,AUTH_RETURN_COOKIE,
  callbackCredentials,
  completeAuthCallback,
} from "@/lib/auth/flow";
export async function GET(request: NextRequest) {
  const credentials = callbackCredentials(request.nextUrl.searchParams);
  let destination: string = "/login?error=invalid-link";
  // Token hashes require the confirmation POST; GET only exchanges a PKCE code.
  if (credentials?.kind === "code") {
    const client = await createServerSupabase();
    if (!client) destination = "/login?error=unavailable";
    else if (await completeAuthCallback(credentials, client.auth)){
      const jar=await cookies();
      destination = authDestination(jar.get(AUTH_RETURN_COOKIE)?.value??request.nextUrl.searchParams.get("next"));
      jar.set(AUTH_RETURN_COOKIE,'',{httpOnly:true,secure:request.nextUrl.protocol==='https:',sameSite:'lax',path:'/auth',maxAge:0});
    }
  }
  const response = NextResponse.redirect(
    new URL(destination, request.url),
    303,
  );
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
