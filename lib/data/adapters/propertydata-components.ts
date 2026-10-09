import "server-only";
import { SourceError } from "../errors.ts";
import { object, text } from "../validation.ts";
import { normalisePostcode } from "../../addresses/model.ts";
import { validPoint } from "../../spatial/model.ts";
import type { ResolvedAddress } from "../../addresses/model.ts";
import type { PropertyMatch } from "./propertydata.ts";

export type StructuredPropertyMatch = PropertyMatch & {
  parts: { secondary: string | null; primary: string | null; street: string | null; town: string | null; district: string | null; postcode: string };
};
export type StructuredPropertyMatches = { schemaVersion: 1; outcome: "success" | "partial" | "empty"; candidates: StructuredPropertyMatch[]; retrievedAt: string; credits: number; sourceDate: null };

/** Alternative selected-postcode resolver for demonstrated address-label aliases.
 * Never persist the list, select by classification/rank/proximity or silently chain paid calls.
 */
export function propertyDataComponents(options: { key: string | undefined; fetcher?: typeof fetch; now?: () => Date }) {
  return async (postcode: string, signal?: AbortSignal): Promise<StructuredPropertyMatches> => {
    const canonical = normalisePostcode(postcode);
    if (!canonical) throw new SourceError("invalid_request");
    if (!options.key || options.key.length > 256 || /\s/.test(options.key) || Array.from(options.key).some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) throw new SourceError("configuration_missing");
    const timeout = AbortSignal.timeout(10_000), combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    if (combined.aborted) throw new SourceError("cancelled");
    try {
      const url = new URL("https://api.propertydata.co.uk/uprns");
      url.searchParams.set("postcode", canonical); url.searchParams.set("strict", "true"); url.searchParams.set("results", "200");
      const r = await (options.fetcher ?? fetch)(url, { signal: combined, redirect: "error", cache: "no-store", headers: { "X-API-Key": options.key, Accept: "application/json" } });
      if (!r.ok) throw new SourceError(r.status === 401 ? "authentication_failed" : r.status === 403 ? "permission_denied" : r.status === 429 ? "rate_limited" : "provider_unavailable", r.status);
      if (!r.body || !/^(application|text)\/json(?:;|$)/i.test(r.headers.get("content-type") ?? "") || Number(r.headers.get("content-length")) > 1_000_000) throw new SourceError("invalid_response");
      const reader = r.body.getReader(), chunks: Uint8Array[] = []; let bytes = 0;
      try { for (;;) { const part = await reader.read(); if (part.done) break; bytes += part.value.byteLength;
        if (bytes > 1_000_000) throw new SourceError("invalid_response"); chunks.push(part.value); } }
      finally { await reader.cancel(); }
      let decoded: unknown;
      try { decoded = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))); }
      catch { throw new SourceError("invalid_response"); }
      const root = object(decoded);
      if (root.status !== "success" || root.strict_postcode_mode !== true || normalisePostcode(root.postcode) !== canonical ||
          !Array.isArray(root.data) || root.data.length > 200 || !Number.isSafeInteger(root.api_calls_cost) || Number(root.api_calls_cost) < 0 || Number(root.api_calls_cost) > 20) throw new SourceError("invalid_response");
      const seen = new Set<string>();
      const nullable = (v: unknown, max: number): string | null => {
        if (v === null || v === undefined || v === "") return null;
        if (!text(v, max) || v.includes(options.key!)) throw new SourceError("invalid_response"); return v;
      };
      const candidates = root.data.map(value => {
        const row = object(value), raw = object(row.addressParts), uprn = typeof row.uprn === "number" && Number.isSafeInteger(row.uprn) ? String(row.uprn) : row.uprn;
        if (!text(uprn, 12) || !/^[1-9]\d{0,11}$/.test(uprn) || seen.has(uprn) || !text(row.address, 600) || row.address.includes(options.key!) || normalisePostcode(raw.postcode) !== canonical) throw new SourceError("invalid_response");
        seen.add(uprn);
        const coordinate = (v: unknown) => typeof v === "number" ? v : typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : NaN;
        const point = { longitude: coordinate(row.lng), latitude: coordinate(row.lat), crs: "EPSG:4326" as const, precision: "unknown" as const, source: "propertydata-uprn" };
        if (!validPoint(point)) throw new SourceError("invalid_response");
        return { uprn, address: row.address, point, classificationCode: nullable(row.classificationCode, 40), classificationDescription: nullable(row.classificationCodeDesc, 200),
          parts: { secondary: nullable(raw.secondary, 200), primary: nullable(raw.primary, 200), street: nullable(raw.street, 200), town: nullable(raw.town, 200), district: nullable(raw.district, 200), postcode: canonical } };
      });
      return { schemaVersion: 1, outcome: candidates.length >= 200 ? "partial" : candidates.length ? "success" : "empty", candidates, retrievedAt: (options.now ?? (() => new Date()))().toISOString(), credits: Number(root.api_calls_cost), sourceDate: null };
    } catch (error) {
      if (error instanceof SourceError) throw error;
      throw new SourceError(signal?.aborted ? "cancelled" : timeout.aborted ? "timeout" : "network_error");
    }
  };
}

export function exactSelectedComponents(selected: ResolvedAddress, result: StructuredPropertyMatches):
  { state: "matched"; candidate: StructuredPropertyMatch; method: "exact_selected_address_components" } |
  { state: "unresolved" | "ambiguous"; candidate: null; method: null } {
  const c = selected.components, normalise = (v: string | null) => v === null ? null : v.normalize("NFKC").toUpperCase().replace(/[,.]/g, " ").replace(/\s+/g, " ").trim();
  if (result.candidates.length >= 200) return { state: "ambiguous", candidate: null, method: null };
  // Composite primaries/dependent streets/departments require an explicit mapping, not lossy parsing.
  if (selected.resolution !== "provider_verified" || !c.thoroughfare || (!c.buildingNumber && !c.buildingName) || c.buildingNumber && c.buildingName ||
      c.dependentThoroughfare || c.department || c.poBox || !selected.postTown || !normalisePostcode(selected.postcode)) return { state: "unresolved", candidate: null, method: null };
  const exact = result.candidates.filter(p => p.parts.postcode === normalisePostcode(selected.postcode) &&
    normalise(p.parts.primary) === normalise(c.buildingNumber ?? c.buildingName) && normalise(p.parts.secondary) === normalise(c.subBuilding) &&
    normalise(p.parts.street) === normalise(c.thoroughfare) && normalise(p.parts.town) === normalise(selected.postTown));
  // Postio district is administrative (e.g. "Hackney London Boro"); provider district is postal.
  // They are retained separately, not treated as interchangeable identity fields.
  return exact.length === 1 ? { state: "matched", candidate: structuredClone(exact[0]), method: "exact_selected_address_components" } :
    { state: exact.length > 1 ? "ambiguous" : "unresolved", candidate: null, method: null };
}
