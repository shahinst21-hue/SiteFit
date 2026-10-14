import { commercialExecution } from "../release/policy.ts";
export const fulfilmentPolicy = Object.freeze({ version: "fulfilment-v1", leaseSeconds: 300,
  maxJobsPerInvocation: 1, maxOwnerStartsPerTenMinutes: 5, databaseCheckpointBytes: 450_000_000 });

export function developmentFulfilment(env: Record<string, string | undefined>, hostname: string) {
  if (env.SITEFIT_FULFILMENT_ENABLED !== "1" || env.VERCEL_ENV === "production") return false;
  if (env.VERCEL === "1" || env.VERCEL_ENV) return env.VERCEL_ENV === "preview";
  return ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
}
export function runnerEnabled(env:Record<string,string|undefined>,hostname:string){
 return developmentFulfilment(env,hostname)||commercialExecution(env,hostname);
}

export type Completion = { state: "ready" | "intervention" | "awaiting_authorisation";
  reason: "dispatch_ambiguous" | "validation_failed" | "execution_interrupted" | "budget_unavailable" | "configuration_unavailable" | null };
export function completion(status: string, dispatches: readonly { state: string }[]): Completion {
  if (status === "ready") return { state: "ready", reason: null };
  if (dispatches.some(d => ["intent", "ambiguous"].includes(d.state))) return { state: "intervention", reason: "dispatch_ambiguous" };
  if (dispatches.some(d => d.state === "invalid")) return { state: "intervention", reason: "validation_failed" };
  return { state: "intervention", reason: "execution_interrupted" };
}

export function progressLabel(state: string) {
  return ({ queued: "Your report is waiting to be prepared.", running: "Your report is being prepared.",
    ready: "Your report is ready.", intervention: "Report preparation has stopped for review. Your purchase and saved analysis remain recorded. Do not buy again; contact info@sitefit.co.uk.",
    awaiting_authorisation: "Report preparation is paused. Your purchase remains recorded; check your account or contact info@sitefit.co.uk." } as Record<string, string>)[state] ?? "Report progress is unavailable.";
}

export type Progress = { state: string; reportId: string | null; stage?: string };
export function parseProgress(value: unknown): Progress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.state !== "string" || !["queued", "running", "ready", "intervention", "awaiting_authorisation"].includes(v.state) ||
    v.reportId !== null && (typeof v.reportId !== "string" || !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(v.reportId))) return null;
  const stage = typeof v.stage === "string" && ["context", "premises", "synthesis", "validating"].includes(v.stage) ? v.stage : undefined;
  return { state: v.state, reportId: v.state === "ready" ? v.reportId as string : null, ...(stage ? { stage } : {}) };
}
