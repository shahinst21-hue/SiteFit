import { uuid } from "../data/validation.ts";
export const intelligenceId = uuid;
export function verificationEnabled(env: Record<string, string | undefined>, hostname: string) {
  if (env.SITEFIT_PHASE12_VERIFICATION !== "1" || env.VERCEL_ENV === "production") return false;
  if (env.VERCEL === "1" || env.VERCEL_ENV) return env.VERCEL_ENV === "preview";
  return ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
}
