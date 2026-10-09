import "server-only";
import { packetDigest } from "../analysis/canonical.ts";
import { SourceError } from "../data/errors.ts";
import { object, text, timestamp, uuid } from "../data/validation.ts";
import { assertPolicy } from "../data/policy.ts";
import type { LicenceMetadata } from "../data/contracts.ts";

export type HistoryEvent = {
  id: string; recordId: string; source: "propertydata" | "epc";
  date: string; dateMeaning: "application_received" | "decision_recorded" | "certificate_issued";
  precision: "day"; scope: "matched_building_not_verified_trading_unit";
  fact: string; reference: string; evidencePath: string;
};
export type HistoryReceipt = {
  source: "propertydata" | "epc"; operation: string; retrievedAt: string;
  outcome: "success" | "empty" | "unavailable" | "unsupported";
  complete: boolean; candidates: number; rejected: number; credits: number | null;
  error: string | null; bounds: string; licence: LicenceMetadata;
};
export type HistoryBundle = {
  schemaVersion: 1; analysisId: string; inputId: string; propertyId: string; uprn: string | null;
  contextDigest: string; generatedAt: string;
  receipts: HistoryReceipt[]; events: HistoryEvent[];
  contextSources: { snapshotId: string; checksum: string; source: string }[];
  unknowns: string[]; limitations: string[];
};
const exactKeys = (v: Record<string, unknown>, keys: string[]) => {
  if (Object.keys(v).length !== keys.length || Object.keys(v).some(k => !keys.includes(k))) throw new SourceError("invalid_response");
};
export function historyDate(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v) || !timestamp(`${v}T00:00:00Z`)) return false;
  return new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
}
export function historyReference(v: unknown): v is string {
  if (!text(v, 1000)) return false;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && !u.username && !u.password && !u.hash &&
      (u.hostname.endsWith(".gov.uk") || u.hostname === "gov.uk") &&
      [...u.searchParams.keys()].every(k => ["fa", "id", "keyVal", "activeTab"].includes(k));
  } catch { return false; }
}
export function validateHistory(value: unknown): HistoryBundle {
  const v = object(value);
  exactKeys(v, ["schemaVersion", "analysisId", "inputId", "propertyId", "uprn", "contextDigest", "generatedAt", "receipts", "events", "contextSources", "unknowns", "limitations"]);
  const serialised = JSON.stringify(v);
  if (Buffer.byteLength(serialised) > 100_000 || /sb_secret_|sk_(?:live|test)_|Bearer\s|(?:app_key|api_key|authorization|rawResponse|headers)"?\s*[:=]/i.test(serialised) ||
    v.schemaVersion !== 1 || ![v.analysisId, v.inputId, v.propertyId].every(uuid) || !(v.uprn === null || typeof v.uprn === "string" && /^[1-9]\d{0,11}$/.test(v.uprn)) ||
    typeof v.contextDigest !== "string" || !/^[a-f0-9]{64}$/.test(v.contextDigest) || !timestamp(v.generatedAt)) throw new SourceError("invalid_response");
  if (!Array.isArray(v.receipts) || v.receipts.length !== 2 || !Array.isArray(v.events) || v.events.length > 30 || !Array.isArray(v.contextSources) || v.contextSources.length > 30) throw new SourceError("invalid_response");
  for (const list of [v.unknowns, v.limitations]) if (!Array.isArray(list) || list.length > 20 || list.some(x => !text(x, 500))) throw new SourceError("invalid_response");
  const receipts = v.receipts.map(x => {
    const r = object(x);
    exactKeys(r, ["source", "operation", "retrievedAt", "outcome", "complete", "candidates", "rejected", "credits", "error", "bounds", "licence"]);
    if (!["propertydata", "epc"].includes(String(r.source)) || !text(r.operation, 100) || !timestamp(r.retrievedAt) ||
      !["success", "empty", "unavailable", "unsupported"].includes(String(r.outcome)) || typeof r.complete !== "boolean" ||
      ![r.candidates, r.rejected].every(n => Number.isSafeInteger(n) && Number(n) >= 0 && Number(n) <= 100_000) || Number(r.rejected) > Number(r.candidates) ||
      !(r.credits === null || r.credits === 0 || r.credits === 1) || !(r.error === null || text(r.error, 100)) || !text(r.bounds, 500)) throw new SourceError("invalid_response");
    assertPolicy(r.licence as LicenceMetadata);
    const l = object(r.licence);
    exactKeys(l, ["policyId", "version", "reviewedAt", "termsUrl", "raw", "normalised", "derived", "references", "timestamps", "attribution", "cacheSeconds", "rawDisposition"]);
    if (!timestamp(l.reviewedAt) || !text(l.termsUrl, 1000) || !Array.isArray(l.attribution) || l.attribution.some(x => !text(x, 500)) || l.cacheSeconds !== 0 || l.rawDisposition !== "discarded") throw new SourceError("licence_blocked");
    for (const name of ["raw", "normalised", "derived", "references", "timestamps"]) {
      const p = object(l[name]); exactKeys(p, ["allowed", "maxDays", "condition"]);
      if (typeof p.allowed !== "boolean" || !(p.maxDays === null || Number.isSafeInteger(p.maxDays) && Number(p.maxDays) >= 0) || !text(p.condition, 1000)) throw new SourceError("licence_blocked");
    }
    if ((r.source === "epc" && (r.licence as LicenceMetadata).policyId !== "govuk-non-domestic-epc") ||
      (r.source === "propertydata" && (r.licence as LicenceMetadata).policyId !== "propertydata-premises")) throw new SourceError("licence_blocked");
    return r as unknown as HistoryReceipt;
  });
  if (new Set(receipts.map(r => r.source)).size !== 2) throw new SourceError("invalid_response");
  if (v.uprn === null && (v.events.length || receipts.some(r => r.outcome !== "unsupported"))) throw new SourceError("invalid_response");
  const events = v.events.map(x => {
    const e = object(x);
    exactKeys(e, ["id", "recordId", "source", "date", "dateMeaning", "precision", "scope", "fact", "reference", "evidencePath"]);
    if (!text(e.recordId, 100) || !text(e.fact, 1500) || !historyDate(e.date) || !historyReference(e.reference) || e.precision !== "day" ||
      e.scope !== "matched_building_not_verified_trading_unit" || !["propertydata", "epc"].includes(String(e.source)) ||
      !(e.source === "propertydata" ? ["application_received", "decision_recorded"] : ["certificate_issued"]).includes(String(e.dateMeaning)) ||
      e.evidencePath !== `receipts.${receipts.findIndex(r => r.source === e.source)}` ||
      e.id !== packetDigest({ source: e.source, recordId: e.recordId, date: e.date, dateMeaning: e.dateMeaning, fact: e.fact })) throw new SourceError("invalid_response");
    if (!receipts.some(r => r.source === e.source && r.outcome === "success")) throw new SourceError("invalid_response");
    if ((e.date as string) > receipts.find(r => r.source === e.source)!.retrievedAt.slice(0, 10)) throw new SourceError("invalid_response");
    return e as unknown as HistoryEvent;
  });
  if (new Set(events.map(e => e.id)).size !== events.length) throw new SourceError("invalid_response");
  for (const x of v.contextSources) {
    const s = object(x); exactKeys(s, ["snapshotId", "checksum", "source"]);
    if (!uuid(s.snapshotId) || typeof s.checksum !== "string" || !/^[a-f0-9]{64}$/.test(s.checksum) || !text(s.source, 100)) throw new SourceError("invalid_response");
  }
  return v as unknown as HistoryBundle;
}
export function historyEvent(value: Omit<HistoryEvent, "id" | "precision" | "scope">): HistoryEvent {
  return { ...value, id: packetDigest({ source: value.source, recordId: value.recordId, date: value.date, dateMeaning: value.dateMeaning, fact: value.fact }),
    precision: "day", scope: "matched_building_not_verified_trading_unit" };
}
export function projectHistory(bundle: HistoryBundle) {
  const v = validateHistory(bundle);
  return { schemaVersion: 1, conclusion: v.events.length ? "Dated premises records were found; occupancy and implemented use still need confirmation." : "No dated premises history is established by the stored evidence.",
    events: v.events.toSorted((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)),
    sourceStates: v.receipts.map(r => ({ source: r.source, outcome: r.outcome, complete: r.complete, error: r.error })), unknowns: v.unknowns,
    limitations: [...v.limitations, "Planning entries are PropertyData-reported metadata with council references; original council documents and implementation are not independently certified."] };
}
