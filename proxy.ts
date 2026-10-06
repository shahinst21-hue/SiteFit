import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readPublicSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
export async function proxy(request: NextRequest) {
  const config = readPublicSupabaseConfig(process.env);
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  if (!config) return response;
  const client = createServerClient<Database>(config.url, config.key, {
    cookieOptions: {
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        response.headers.set("Cache-Control", "private, no-store, max-age=0");
        response.headers.set("Referrer-Policy", "no-referrer");
      },
    },
  });
  try {
    await client.auth.getClaims();
  } catch {
    /* Protected handlers independently fail closed. */
  }
  return response;
}
export const config = {
  matcher: ["/login", "/account/:path*", "/auth/:path*", "/purchase/:path*"],
};
