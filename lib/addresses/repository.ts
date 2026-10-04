import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "../supabase/database.types";
import { AddressError } from "./provider";
import type { PropertyRepository } from "./service";
import type { PropertySelection } from "./model";
export function propertyRepository(): PropertyRepository {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  // This client is separate from Auth, has no cookies/session and is never sent to the browser.
  if (!url || !key || !/^sb_secret_[A-Za-z0-9_-]+$/.test(key))
    throw new AddressError("configuration");
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" ||
      parsed.pathname !== "/" ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    )
      throw new Error();
  } catch {
    throw new AddressError("configuration");
  }
  const client = createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return {
    async upsertSelected(address) {
      const { data, error } = await client.rpc("resolve_sitefit_property", {
        address: address as unknown as Json,
      });
      if (error || !data || !/^[0-9a-f-]{36}$/i.test(data.id))
        throw new AddressError("unavailable");
      return {
        ...address,
        id: data.id,
        resolvedAt: data.resolved_at!,
      } satisfies PropertySelection;
    },
  };
}
