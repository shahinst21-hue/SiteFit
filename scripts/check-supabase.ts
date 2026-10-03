import nextEnv from "@next/env";
import { readSupabaseConnection, verifySupabaseConnection } from "./supabase-connectivity.ts";

// Match Next.js development env-file precedence without logging file contents.
nextEnv.loadEnvConfig(process.cwd(), true);

try {
  await verifySupabaseConnection(readSupabaseConnection(process.env));
  console.log("Supabase Data API connectivity verified through its schema-cache response. No application data was read or modified.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Supabase connectivity check failed.");
  process.exitCode = 1;
}
