"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { PublicSupabaseConfig } from "./config";
import type { Database } from "./database.types";
export function createBrowserSupabase(config: PublicSupabaseConfig) {
  return createBrowserClient<Database>(config.url, config.key, {
    cookieOptions: {
      sameSite: "lax",
      secure:
        typeof window !== "undefined" && window.location.protocol === "https:",
    },
  });
}
