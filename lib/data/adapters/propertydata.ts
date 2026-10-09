import "server-only";
import { SourceError } from "../errors.ts";
import { object, text, timestamp } from "../validation.ts";
import { validPoint } from "../../spatial/model.ts";
import type { Point } from "../../spatial/model.ts";

export type PropertyMatch = {
  uprn: string; address: string; point: Point;
  classificationCode: string | null; classificationDescription: string | null;
};
export type PropertyMatches = {
  schemaVersion: 1; outcome: "success" | "empty"; candidates: PropertyMatch[];
  retrievedAt: string; credits: number; sourceDate: null;
};
const endpoint = "https://api.propertydata.co.uk/address-match-uprn";

/** Candidates live in request memory only. Persist only a defensibly selected match. */
export function propertyDataResolver(options: {
  key: string | undefined; fetcher?: typeof fetch; now?: () => Date;
}) {
  return async function matches(address: string, signal?: AbortSignal): Promise<PropertyMatches> {
    if (!text(address, 600) || !/[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i.test(address.trim())) throw new SourceError("invalid_request");
    if (!options.key || options.key.length > 256 || /\s/.test(options.key) || Array.from(options.key).some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) throw new SourceError("configuration_missing");
    const timeout = AbortSignal.timeout(10_000);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    if (combined.aborted) throw new SourceError("cancelled");
    let response: Response | undefined;
    try {
      const url = new URL(endpoint); url.searchParams.set("address", address);
      // Never query-string authentication, redirects, automatic retries or logging raw responses.
      response = await (options.fetcher ?? fetch)(url, { redirect: "error", signal: combined, cache: "no-store",
        headers: { "X-API-Key": options.key, Accept: "application/json" } });
      if (response.redirected || response.status >= 300 && response.status < 400) throw new SourceError("permission_denied", response.status);
      if (!response.ok) throw new SourceError(response.status === 401 ? "authentication_failed" : response.status === 403 ? "permission_denied" : response.status === 429 ? "rate_limited" : "provider_unavailable", response.status);
      if (!response.body || !/^(application|text)\/json(?:;|$)/i.test(response.headers.get("content-type") ?? "") ||
          Number(response.headers.get("content-length")) > 1_000_000) throw new SourceError("invalid_response");
      const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
      try { for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength;
        if (size > 1_000_000) throw new SourceError("invalid_response"); chunks.push(part.value); }
      } finally { await reader.cancel(); }
      let decoded: unknown;
      try { decoded = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))); }
      catch { throw new SourceError("invalid_response"); }
      const root = object(decoded);
      if (root.status !== "success" || !Array.isArray(root.data) || root.data.length > 10 ||
          !Number.isSafeInteger(root.api_calls_cost) || Number(root.api_calls_cost) < 0 || Number(root.api_calls_cost) > 10) throw new SourceError("invalid_response");
      const seen = new Set<string>();
      const candidates = root.data.map(value => {
        const r = object(value);
        const uprn = typeof r.uprn === "number" && Number.isSafeInteger(r.uprn) ? String(r.uprn) : r.uprn;
        if (!text(uprn, 12) || !/^[1-9]\d{0,11}$/.test(uprn) || seen.has(uprn) || !text(r.address, 600)) throw new SourceError("invalid_response");
        seen.add(uprn);
        const coordinate = (v: unknown) => typeof v === "number" ? v : typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : NaN;
        const point: Point = { longitude: coordinate(r.lng), latitude: coordinate(r.lat), crs: "EPSG:4326", precision: "unknown", source: "propertydata-uprn" };
        if (!validPoint(point)) throw new SourceError("invalid_response");
        const nullableText = (v: unknown, max: number) => { if (v === undefined || v === null || v === "") return null;
          if (!text(v, max) || v.includes(options.key!)) throw new SourceError("invalid_response"); return v; };
        if (r.address.includes(options.key!)) throw new SourceError("invalid_response");
        return { uprn, address: r.address, point, classificationCode: nullableText(r.classificationCode, 40), classificationDescription: nullableText(r.classificationCodeDesc, 200) };
      });
      const retrievedAt = (options.now ?? (() => new Date()))().toISOString();
      if (!timestamp(retrievedAt)) throw new SourceError("invalid_response");
      return { schemaVersion: 1, outcome: candidates.length ? "success" : "empty", candidates, retrievedAt, credits: Number(root.api_calls_cost), sourceDate: null };
    } catch (error) {
      if (error instanceof SourceError) throw error;
      throw new SourceError(signal?.aborted ? "cancelled" : timeout.aborted ? "timeout" : "network_error");
    } finally { await response?.body?.cancel().catch(() => {}); }
  };
}

/** No fuzzy/rank/nearest fallback; unresolved aliases may be reviewed without losing unit distinctions. */
export function exactPropertyMatch(address: string, matches: PropertyMatches):
  { state: "matched"; candidate: PropertyMatch; method: "exact_normalised_address" } |
  { state: "unresolved" | "ambiguous"; candidate: null; method: null } {
  const normalise = (s: string) => s.normalize("NFKC").toUpperCase().replace(/[,.]/g, " ").replace(/\s+/g, " ").trim();
  const exact = matches.candidates.filter(c => normalise(c.address) === normalise(address));
  return exact.length === 1 ? { state: "matched", candidate: structuredClone(exact[0]), method: "exact_normalised_address" } :
    { state: exact.length > 1 || matches.candidates.length > 1 ? "ambiguous" : "unresolved", candidate: null, method: null };
}
