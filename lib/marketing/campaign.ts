import { productionOrigin, releasePolicy, type ReleaseAuthority } from "../release/policy.ts";
/** Marketing codes never contain a property, person, raw referrer or free text. */
export const campaigns = {
  "campaign-01": { audience: "Coffee shop lease decision", source: "search", medium: "paid-search" },
  "campaign-02": { audience: "Restaurant premises decision", source: "search", medium: "paid-search" },
  "campaign-03": { audience: "Winning message follow-up", source: "owner-selected", medium: "owner-selected" },
} as const;
export type Campaign = keyof typeof campaigns;
export const CAMPAIGN_COOKIE = "sitefit_campaign";
export function campaignCode(value: unknown): Campaign | null {
  return typeof value === "string" && Object.hasOwn(campaigns, value) ? value as Campaign : null;
}
export function campaignFromSearch(search: string): Campaign | null {
  const params = new URLSearchParams(search);
  const codes = params.getAll("sf_campaign");
  return codes.length === 1 ? campaignCode(codes[0]) : null;
}
/** Phase17 must separately authorise Production collection and its privacy settings. */
export function measurementEnabled(env: Record<string, string | undefined>, authority: ReleaseAuthority = releasePolicy) {
  if(env.VERCEL_ENV==="production")return env.SITEFIT_CAMPAIGN_MEASUREMENT==="1"&&authority.measurementApproved&&!!productionOrigin(env,authority);
  return env.SITEFIT_CAMPAIGN_MEASUREMENT === "1" && env.VERCEL_ENV !== "production" &&
    (env.VERCEL_ENV === "preview" || !env.VERCEL_ENV);
}
export function campaignChoice(value: unknown): { action: "accept"; campaign: Campaign } | { action: "clear" } {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("invalid_campaign_choice");
  const row = value as Record<string, unknown>;
  if (row.action === "clear" && Object.keys(row).length === 1) return { action: "clear" };
  const campaign = campaignCode(row.campaign);
  if (row.action !== "accept" || !campaign || Object.keys(row).length !== 2) throw Error("invalid_campaign_choice");
  return { action: "accept", campaign };
}
