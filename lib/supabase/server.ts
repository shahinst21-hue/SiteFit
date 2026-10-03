import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { readPublicSupabaseConfig } from "./config";
import type { Database } from "./database.types";
export async function createServerSupabase() {
  const config = readPublicSupabaseConfig(process.env);
  if (!config) return null;
  const cookieStore = await cookies();
  return createServerClient<Database>(config.url, config.key, {
    cookieOptions: {
      sameSite: "lax",
      secure:
        process.env.VERCEL === "1" ||
        process.env.SITE_URL?.startsWith("https:") === true,
    },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => {
        // Server Components cannot write cookies; Proxy refreshes them before render.
        try {
          values.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          /* Read-only render context. */
        }
      },
    },
  });
}
export async function verifiedUser() {
  const client = await createServerSupabase();
  if (!client) return { client: null, user: null, unavailable: true };
  try {
    const { data, error } = await client.auth.getUser();
    return {
      client,
      user: error ? null : data.user,
      unavailable: !!error && error.name !== "AuthSessionMissingError",
    };
  } catch {
    return { client, user: null, unavailable: true };
  }
}
