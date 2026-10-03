import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  authDestination,
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
    else if (await completeAuthCallback(credentials, client.auth))
      destination = authDestination(request.nextUrl.searchParams.get("next"));
  }
  const response = NextResponse.redirect(
    new URL(destination, request.url),
    303,
  );
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
