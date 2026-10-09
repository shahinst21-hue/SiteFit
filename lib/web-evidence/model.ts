import "server-only";
import { packetDigest } from "../analysis/canonical.ts";
import { object, text, timestamp, uuid } from "../data/validation.ts";
import { historyDate } from "../premises-history/model.ts";
import { publicReference } from "./search.ts";
import type { SearchReceipt } from "./search.ts";

export type AddressParts = { primary: string; street: string; postcode: string; unit: string | null };
export type FindingKind = "asking_rent" | "reported_contract_rent" | "market_estimate" | "floor_area" | "lease_term" | "additional_charge" | "business_name" | "business_change";
export type WebFinding = { id: string; kind: FindingKind; value: string | number; basis: string;
  source: string; sourceRecord: string; observedAt: string; publishedDate: string | null;
  eventDate: string | null; dateMeaning: "inspection_date" | "listing_effective_date" | "source_reported_event" | "observation_only";
  match: "exact_unit" | "building_only"; sourceAddress: AddressParts;
  policyId: "fsa-ogl-v3"; attribution: string; verificationVersion: "public-facts-review-v1" };
export type DiscoveryBundle = { schemaVersion: 1; analysisId: string; inputId: string; propertyId: string;
  contextDigest: string; generatedAt: string; outcome: "success" | "empty" | "unavailable";
  findings: WebFinding[]; references: { url: string; state: "rights_unknown" | "unit_unknown" | "verified" | "fetch_failed" }[];
  sourceBindings: { snapshotId: string; source: string; checksum: string }[];
  searchReceipt: SearchReceipt | null; limitations: string[] };
const canonical = (v: string) => v.normalize("NFKC").toUpperCase().replace(/[.,]/g, "").replace(/\s+/g, " ").trim();
const unitKey = (v: string) => ["GROUND FLOOR AND BASEMENT", "BASEMENT TO GROUND FLOOR"].includes(canonical(v)) ? "BASEMENT+GROUND" : canonical(v);
export function addressMatch(target: AddressParts, source: AddressParts): "exact_unit" | "building_only" | "rejected" {
  if (![target.primary, target.street, target.postcode, source.primary, source.street, source.postcode].every(x => text(x, 200))) return "rejected";
  if (canonical(target.primary) !== canonical(source.primary) || canonical(target.street) !== canonical(source.street) || canonical(target.postcode).replace(/ /g, "") !== canonical(source.postcode).replace(/ /g, "")) return "rejected";
  if (target.unit && source.unit && unitKey(target.unit) !== unitKey(source.unit)) return "rejected";
  return target.unit && source.unit ? "exact_unit" : "building_only";
}
const keys = (v: Record<string, unknown>, allowed: string) => {
  const names = allowed.split(" "); if (Object.keys(v).length !== names.length || Object.keys(v).some(k => !names.includes(k))) throw new Error("discovery_invalid");
};
/** Source policy is explicit, not AI-selected. Initially only independently fetched
 * FSA public facts have established commercial reuse permission. Other public
 * sources remain discovery references until their own terms have been reviewed. */
export function finding(value: Omit<WebFinding, "id" | "attribution" | "verificationVersion">): WebFinding {
  const record = { ...value, attribution: "Food Standards Agency, Crown copyright, Open Government Licence v3.0", verificationVersion: "public-facts-review-v1" as const };
  return validateFinding({ ...record, id: packetDigest(record) });
}
export function validateFinding(value: unknown): WebFinding {
  const f = object(value); keys(f, "id kind value basis source sourceRecord observedAt publishedDate eventDate dateMeaning match sourceAddress policyId attribution verificationVersion");
  const address = object(f.sourceAddress); keys(address,"primary street postcode unit");
  if (![address.primary,address.street,address.postcode].every(v => text(v,200)) || !(address.unit===null || text(address.unit,200))) throw new Error("discovery_invalid");
  if (!publicReference(f.source) || !/^https:\/\/ratings\.food\.gov\.uk\/business\/\d+$/.test(f.source) || f.policyId !== "fsa-ogl-v3" ||
    !["business_name", "business_change"].includes(String(f.kind)) || !text(f.value, 200) || !text(f.basis, 300) || !/^\d+$/.test(String(f.sourceRecord)) ||
    !timestamp(f.observedAt) || !(f.publishedDate === null || historyDate(f.publishedDate)) || !(f.eventDate === null || historyDate(f.eventDate)) ||
    !["inspection_date", "observation_only"].includes(String(f.dateMeaning)) || !["exact_unit", "building_only"].includes(String(f.match)) ||
    f.attribution !== "Food Standards Agency, Crown copyright, Open Government Licence v3.0" || f.verificationVersion !== "public-facts-review-v1" ||
    (f.eventDate !== null && String(f.eventDate) > String(f.observedAt).slice(0,10)) || (f.publishedDate !== null && String(f.publishedDate) > String(f.observedAt).slice(0,10))) throw new Error("discovery_invalid");
  const { id, ...fields } = f; if (id !== packetDigest(fields)) throw new Error("discovery_invalid");
  return f as unknown as WebFinding;
}
export function validateDiscovery(value: unknown): DiscoveryBundle {
  const b = object(value); keys(b, "schemaVersion analysisId inputId propertyId contextDigest generatedAt outcome findings references sourceBindings searchReceipt limitations");
  const serialised = JSON.stringify(b);
  if (Buffer.byteLength(serialised) > 30_000 || /sb_secret_|sk-(?:proj-)?|sk_(?:test|live)_|Bearer\s|rawResponse|authorization|guestClaim/i.test(serialised) ||
    b.schemaVersion !== 1 || ![b.analysisId,b.inputId,b.propertyId].every(uuid) || !/^[a-f0-9]{64}$/.test(String(b.contextDigest)) || !timestamp(b.generatedAt) ||
    !["success","empty","unavailable"].includes(String(b.outcome)) || !Array.isArray(b.findings) || b.findings.length > 12 ||
    !Array.isArray(b.references) || b.references.length > 6 || !Array.isArray(b.sourceBindings) || b.sourceBindings.length > 30 ||
    !Array.isArray(b.limitations) || b.limitations.length > 12 || b.limitations.some(x => !text(x,500))) throw new Error("discovery_invalid");
  for (const f of b.findings) validateFinding(f);
  if (new Set(b.findings.map(f => object(f).id)).size !== b.findings.length || (b.outcome !== "success" && b.findings.length)) throw new Error("discovery_invalid");
  for (const ref of b.references) { const r = object(ref); keys(r,"url state"); if (!publicReference(r.url) || !["rights_unknown","unit_unknown","verified","fetch_failed"].includes(String(r.state))) throw new Error("discovery_invalid"); }
  for (const ref of b.sourceBindings) { const r = object(ref); keys(r,"snapshotId source checksum"); if (!uuid(r.snapshotId) || !text(r.source,100) || !/^[a-f0-9]{64}$/.test(String(r.checksum))) throw new Error("discovery_invalid"); }
  if (b.searchReceipt !== null) { const r = object(b.searchReceipt); keys(r,"model promptVersion generatedAt packetDigest inputTokens outputTokens toolCalls durationMs estimatedUsd priceVersion store");
    if (!String(r.model).startsWith("gpt-6.1-sol") || r.promptVersion !== "commercial-discovery-v1" || !timestamp(r.generatedAt) || !/^[a-f0-9]{64}$/.test(String(r.packetDigest)) ||
      ![r.inputTokens,r.outputTokens,r.durationMs].every(n => Number.isSafeInteger(n) && Number(n)>=0) || Number(r.outputTokens)>512 || r.toolCalls !== 1 ||
      typeof r.estimatedUsd !== "number" || r.estimatedUsd<0 || r.priceVersion !== "openai-standard-2026-10-09" || r.store !== false) throw new Error("discovery_invalid"); }
  return structuredClone(b) as unknown as DiscoveryBundle;
}

/** Relevance is explained, never recency-only. No automatic economic assumption. */
export function reconcileRent(records: { id: string; kind: FindingKind; match: "exact_unit" | "building_only"; effectiveDate: string | null; sourceVerified: boolean }[]) {
  return records.map(r => ({ ...r, exactUnitDatedAskingEvidence: r.kind === "asking_rent" && r.match === "exact_unit" && r.sourceVerified && r.effectiveDate !== null,
    relevance: r.match !== "exact_unit" ? "Building evidence cannot establish rent for the selected unit." : !r.sourceVerified ? "Source verification is incomplete." :
      r.kind === "market_estimate" ? "Comparable-market estimate; not a property asking or contracted rent." : r.kind === "reported_contract_rent" ? "Source-reported contract rent; not independently verified lease terms or current asking rent." :
        r.effectiveDate === null ? "Effective date unknown; current applicability requires confirmation." : "Exact-unit dated source evidence; compare terms and stale status before use." }));
}
