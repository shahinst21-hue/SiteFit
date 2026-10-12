import "server-only";
import { packetDigest } from "../analysis/canonical.ts";
import { validateContext, timestamp, uuid } from "../data/validation.ts";
import type { CollectionContext } from "../data/contracts.ts";
import { reviewRent, type RentPermission, type RentReview } from "./rent.ts";
import { publicReference, type SearchReceipt, type SearchCandidate } from "./search.ts";
import type { AddressParts } from "./model.ts";

/** Each adapter must independently fetch/parse its reviewed original source.
 * A search proposal, AI rights statement or model extraction is never admission. */
export type RentSourceAdapter = { permission: RentPermission;
  parse: (source: { url: string; body: string; observedAt: string }, target: AddressParts) => RentReview };
// No new rental source is approved by this implementation. Never populated from
// request bodies/environment strings or from AI output.
export const approvedRentalSources: readonly RentSourceAdapter[] = Object.freeze([]);
export type RentalFallback = { version: "rental-fallback-v1"; contextDigest: string;
  state: "structured_present" | "disabled" | "sources_pending" | "identity_unavailable" | "empty" | "unavailable" | "accepted";
  findings: { id: string; sourceDigest: string; review: RentReview; permission: RentPermission }[]; receipt: SearchReceipt | null };
export type RentalSearchExecution = { grantId: string; sources: readonly RentSourceAdapter[];
  reserve: (grantId: string, policyIds: string[]) => Promise<void>;
  discover: (address: string) => Promise<{ candidates: SearchCandidate[]; receipt: SearchReceipt }>;
  settle: (receipt: SearchReceipt | null, state: "received" | "unknown") => Promise<void>;
  fetch?: typeof fetch; now?: () => Date };

/** Paid preparation only. The durable reservation consumes an explicitly approved
 * grant BEFORE dispatch; failures never release it or cause retries. */
export async function rentalFallback(input: CollectionContext, structuredPriceCount: number, execution: RentalSearchExecution | null = null): Promise<RentalFallback> {
  const c = validateContext(input);
  const result: RentalFallback = { version: "rental-fallback-v1", contextDigest: packetDigest(c), state: "disabled", findings: [], receipt: null };
  if (!Number.isSafeInteger(structuredPriceCount) || structuredPriceCount < 0) throw Error("invalid_rental_fallback");
  if (structuredPriceCount > 0) return { ...result, state: "structured_present" };
  if (!execution || !uuid(execution.grantId) || process.env.VERCEL_ENV === "production") return result;
  if (!execution.sources.length) return { ...result, state: "sources_pending" };
  const parts = c.enrichment?.identity.selectedParts;
  if (!c.region.eligible || c.selectedProperty.resolution !== "provider_verified" || !parts?.primary || !parts.street || !parts.secondary)
    return { ...result, state: "identity_unavailable" }; // Exact trading unit required.
  const target: AddressParts = { primary: parts.primary, street: parts.street, postcode: parts.postcode, unit: parts.secondary };
  const policies = execution.sources.map(s => s.permission);
  if (policies.length > 3 || new Set(policies.map(p => p.id)).size !== policies.length || new Set(policies.map(p => p.host)).size !== policies.length || policies.some(p =>
    p.permitted !== true || p.retention !== "dated_historical_facts" || !timestamp(p.reviewedAt) ||
    !publicReference(p.termsReference) || !publicReference(`https://${p.host}/`))) throw Error("invalid_rental_source_policy");
  try { await execution.reserve(execution.grantId, policies.map(p => `${p.id}:${packetDigest(p)}`).sort()); }
  catch { return { ...result, state: "disabled" }; }
  let search: Awaited<ReturnType<RentalSearchExecution["discover"]>>;
  try { search = await execution.discover(c.selectedProperty.formattedAddress); }
  catch { await execution.settle(null, "unknown"); return { ...result, state: "unavailable" }; }
  result.receipt = search.receipt;
  await execution.settle(search.receipt, "received"); // Usage survives later preparation failure.
  if (search.candidates.length > 3) return { ...result, state: "unavailable" };
  const seen = new Set<string>();
  for (const candidate of search.candidates) {
    if (!publicReference(candidate.url) || seen.has(candidate.url)) continue;
    seen.add(candidate.url);
    const adapter = execution.sources.find(s => s.permission.host === new URL(candidate.url).hostname);
    if (!adapter) continue; // No arbitrary URL fetch/SSRF; no AI-proposed amount copied.
    try {
      const response = await (execution.fetch ?? fetch)(candidate.url, { headers: { Accept: "text/html,application/json" },
        redirect: "error", cache: "no-store", signal: AbortSignal.timeout(8000) });
      if (!response.ok || response.redirected || !response.body || Number(response.headers.get("content-length")) > 128_000 ||
        !/^(text\/html|application\/(?:ld\+)?json)(?:;|$)/i.test(response.headers.get("content-type") ?? "")) {
        await response.body?.cancel(); continue;
      }
      const reader = response.body.getReader(), chunks: Uint8Array[] = []; let bytes = 0;
      try { for (;;) { const part = await reader.read(); if (part.done) break; bytes += part.value.byteLength;
        if (bytes > 128_000) throw Error("rental_source_bounds"); chunks.push(part.value); } }
      finally { await reader.cancel(); }
      const body = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
      const sourceDigest = packetDigest(body), observedAt = (execution.now ?? (() => new Date()))().toISOString();
      const review = adapter.parse({ url: candidate.url, body, observedAt }, target);
      if (review.url !== candidate.url || review.observedAt !== observedAt) continue;
      const admission = reviewRent(review, target, adapter.permission);
      if (!admission.retainContent) continue;
      const id = packetDigest({ review, policy: adapter.permission, sourceDigest });
      if (!result.findings.some(f => f.id === id)) result.findings.push({ id, sourceDigest, review: structuredClone(review), permission: structuredClone(adapter.permission) });
    } catch { /* One failed source cannot overwrite or invalidate other findings. */ }
  }
  return { ...result, state: result.findings.length ? "accepted" : "empty" };
}
