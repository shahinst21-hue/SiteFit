import "server-only";
import { setTimeout as delay } from "node:timers/promises";
import type { ExecutionContext, SourceDefinition } from "./contracts.ts";
import { SourceError } from "./errors.ts";
import { object } from "./validation.ts";

export type TransportSummary = { durationMs: number; attempts: number; pages: number; httpStatus: number | null; providerRequestId: null };
export type JsonTransport = { request(query: Record<string, string>): Promise<unknown>; summary(): TransportSummary };
const endpoints = { "tfl-stop-points": "https://api.tfl.gov.uk/StopPoint", "fsa-establishments": "https://api.ratings.food.gov.uk/Establishments" };
const allowed = { "tfl-stop-points": ["lat", "lon", "radius", "stopTypes", "useStopPointHierarchy", "returnLines", "categories"], "fsa-establishments": ["longitude", "latitude", "maxDistanceLimit", "pageNumber", "pageSize", "sortOptionKey", "schemeTypeKey"] };
export function createTransport(source: SourceDefinition, execution: ExecutionContext, options: { key?: string; fetcher?: typeof fetch; quota?: () => boolean } = {}): JsonTransport {
  let attempts = 0, pages = 0, bytes = 0, status: number | null = null; const started = performance.now();
  if (source.id === "ons-population" || !Object.hasOwn(endpoints, source.id)) throw new SourceError("invalid_request");
  const id = source.id;
  return {
    summary: () => ({ durationMs: Math.round(performance.now() - started), attempts, pages, httpStatus: status, providerRequestId: null }),
    async request(query) {
      if (execution.signal.aborted) throw new SourceError("cancelled");
      if (pages >= source.maxPages || attempts >= source.maxAttempts || Object.keys(query).some(k => !allowed[id].includes(k)) || Object.values(query).some(v => v.length > 300)) throw new SourceError("invalid_request");
      const lat = Number(query[id === "tfl-stop-points" ? "lat" : "latitude"]), lon = Number(query[id === "tfl-stop-points" ? "lon" : "longitude"]);
      const radius = Number(query[id === "tfl-stop-points" ? "radius" : "maxDistanceLimit"]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180 || !(radius > 0 && radius <= (id === "tfl-stop-points" ? 1000 : 1000 / 1609.344))) throw new SourceError("invalid_request");
      if (id === "fsa-establishments" && (!/^[12]$/.test(query.pageNumber ?? "") || !/^\d+$/.test(query.pageSize ?? "") || Number(query.pageSize) < 1 || Number(query.pageSize) > 100)) throw new SourceError("invalid_request");
      if (id === "tfl-stop-points" && (!options.key || !/^[A-Za-z0-9_-]{16,200}$/.test(options.key))) throw new SourceError("configuration_missing");
      const url = new URL(endpoints[id]); for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
      if (id === "tfl-stop-points") url.searchParams.set("app_key", options.key!);
      let pageStarted = false;
      while (attempts < source.maxAttempts) {
        if (execution.signal.aborted) throw new SourceError("cancelled");
        if (options.quota && !options.quota()) throw new SourceError("rate_limited");
        if (!pageStarted) { pages++; pageStarted = true; }
        attempts++; const timeout = AbortSignal.timeout(source.timeoutMs); const signal = AbortSignal.any([execution.signal, timeout]);
        let response: Response | undefined; let failure: SourceError; let retryMs = 100;
        try {
          response = await (options.fetcher ?? fetch)(url, { redirect: "error", signal, headers: id === "fsa-establishments" ? { Accept: "application/json", "x-api-version": "2", "Accept-Language": "en-GB" } : { Accept: "application/json" } });
          status = response.status;
          if (response.redirected || status >= 300 && status < 400) throw new SourceError("permission_denied", status);
          if (!response.ok) {
            await response.body?.cancel();
            const code = status === 401 ? "authentication_failed" : status === 403 ? "permission_denied" : status === 429 ? "rate_limited" : "provider_unavailable";
            const header = response.headers.get("retry-after");
            const requestedDelay = header === null ? 100 : /^\d+(\.\d+)?$/.test(header) ? Number(header) * 1000 : Date.parse(header) - execution.now().getTime();
            retryMs = Number.isFinite(requestedDelay) ? Math.max(100, requestedDelay) : 1000;
            // A longer provider delay cannot be honoured inside this small proof budget.
            // Preserve rate-limited outcome rather than retry earlier than instructed.
            throw new SourceError(code, status, (status === 429 || status >= 500) && retryMs <= 1000);
          }
          if (!/^(application|text)\/json(?:;|$)/i.test(response.headers.get("content-type") ?? "") || !response.body || Number(response.headers.get("content-length")) > source.maxBytes) throw new SourceError("invalid_response", status);
          const reader = response.body.getReader(); const chunks: Uint8Array[] = [];
          try { for (;;) { const { done, value } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > source.maxBytes) throw new SourceError("invalid_response", status); chunks.push(value); } } finally { await reader.cancel(); }
          try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))) as unknown; } catch { throw new SourceError("invalid_response", status); }
        } catch (error) {
          await response?.body?.cancel().catch(() => {});
          failure = error instanceof SourceError ? error : new SourceError(execution.signal.aborted ? "cancelled" : timeout.aborted ? "timeout" : "network_error", status, !execution.signal.aborted);
        }
        if (!failure.safe.retryable || attempts >= source.maxAttempts || execution.signal.aborted) throw failure;
        try { await delay(retryMs, undefined, { signal: execution.signal }); } catch { throw new SourceError("cancelled"); }
      }
      throw new SourceError("provider_unavailable");
    },
  };
}
// Small technical proof cap, not a provider contractual quota or a global Vercel cap.
export function processQuota(limit: number, now: () => number = Date.now) {
  let start = now(), count = 0;
  return () => { if (now() - start >= 60_000) { start = now(); count = 0; } return ++count <= limit; };
}
export function jsonObject(value: unknown) { return object(value); }
