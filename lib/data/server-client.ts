import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types.ts";
import { SourceError } from "./errors.ts";
export function frameworkClient() {
  const url = process.env.SUPABASE_URL?.trim(), key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key || !/^sb_secret_[A-Za-z0-9_-]+$/.test(key)) throw new SourceError("configuration_missing");
  try { const parsed = new URL(url); if (parsed.protocol !== "https:" || parsed.pathname !== "/" || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error(); }
  catch { throw new SourceError("configuration_missing"); }
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
