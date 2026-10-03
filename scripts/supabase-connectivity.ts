// Node-only infrastructure helper. Never import scripts into application code.
export type SupabaseConnection = { url: URL; key: string };
type Request = (url: URL, init: RequestInit) => Promise<Response>;

export function readSupabaseConnection(env: Record<string, string | undefined>): SupabaseConnection {
  if (!env.SUPABASE_URL?.trim()) {
    throw new Error("Set SUPABASE_URL in ignored .env.local or the process environment.");
  }
  if (!env.SUPABASE_PUBLISHABLE_KEY?.trim()) {
    throw new Error("Set SUPABASE_PUBLISHABLE_KEY in ignored .env.local or the process environment.");
  }

  let url: URL;
  try {
    url = new URL(env.SUPABASE_URL.trim());
  } catch {
    throw new Error("SUPABASE_URL must be a valid project origin.");
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
      url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("SUPABASE_URL must be an HTTPS origin, or an HTTP loopback origin for local development.");
  }

  const key = env.SUPABASE_PUBLISHABLE_KEY.trim();
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
    throw new Error("SUPABASE_PUBLISHABLE_KEY must be a publishable key; privileged and legacy keys are not accepted.");
  }
  return { url, key };
}

export async function verifySupabaseConnection(
  connection: SupabaseConnection,
  request: Request = fetch,
): Promise<void> {
  let response: Response;
  try {
    // Deliberately absent relation: PostgREST's schema-cache response confirms
    // authenticated Data API access without a schema migration or data read.
    response = await request(new URL("/rest/v1/__sitefit_infrastructure_probe__", connection.url), {
      method: "GET",
      headers: { apikey: connection.key, Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
      redirect: "error",
      cache: "no-store",
    });
  } catch {
    throw new Error("Supabase Data API request failed or timed out. Check configuration and network access.");
  }
  let document: unknown;
  try {
    document = await response.json();
  } catch {
    throw new Error(`Supabase Data API returned an unexpected response (HTTP ${response.status}).`);
  }
  if (response.status === 404 && document && typeof document === "object" &&
      "code" in document && document.code === "PGRST205") {
    return;
  }
  throw new Error(`Supabase Data API did not confirm the absent diagnostic relation (HTTP ${response.status}).`);
}
