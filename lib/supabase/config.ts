export type PublicSupabaseConfig = { url: string; key: string };
// Deliberately public Auth configuration. Privileged keys are never accepted.
export function readPublicSupabaseConfig(
  env: Record<string, string | undefined>,
): PublicSupabaseConfig | null {
  const value = env.SUPABASE_URL?.trim();
  const key = env.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!value || !key) return null;
  try {
    const url = new URL(value);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      (url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)
    )
      return null;
    return { url: url.origin, key };
  } catch {
    return null;
  }
}
