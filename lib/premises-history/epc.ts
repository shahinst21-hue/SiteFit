import "server-only";
import { SourceError } from "../data/errors.ts";
import { object } from "../data/validation.ts";
import { normaliseNonDomesticCertificate } from "../data/non-domestic-epc.ts";
import { historyEvent } from "./model.ts";

export async function epcHistory(uprn: string, options: { key?: string; fetcher?: typeof fetch; signal?: AbortSignal; now?: () => Date }) {
  if (!/^[1-9]\d{0,11}$/.test(uprn)) throw new SourceError("insufficient_precision");
  const key = options.key;
  if (!key || key.length > 4096 || /\s/.test(key)) throw new SourceError("configuration_missing");
  const signal = AbortSignal.any([AbortSignal.timeout(8000), ...(options.signal ? [options.signal] : [])]);
  let bytes = 0;
  async function get(path: string, params: Record<string, string>) {
    const url = new URL(path, "https://api.get-energy-performance-data.communities.gov.uk");
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    let response: Response;
    try { response = await (options.fetcher ?? fetch)(url, { headers: { Authorization: `Bearer ${key}`, Accept: "application/json" }, signal, redirect: "error", cache: "no-store" }); }
    catch { throw new SourceError(options.signal?.aborted ? "cancelled" : signal.aborted ? "timeout" : "network_error"); }
    if (response.status === 404) { await response.body?.cancel(); return null; }
    if (!response.ok || response.redirected || !response.body || !/^application\/json(?:;|$)/i.test(response.headers.get("content-type") ?? "")) {
      await response.body?.cancel(); throw new SourceError(response.status === 401 ? "authentication_failed" : response.status === 429 ? "rate_limited" : "provider_unavailable");
    }
    const reader = response.body.getReader(), chunks: Uint8Array[] = [];
    try { for (;;) { const p = await reader.read(); if (p.done) break; bytes += p.value.byteLength; if (bytes > 1_000_000) throw new SourceError("invalid_response"); chunks.push(p.value); } }
    finally { await reader.cancel(); }
    const body = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
    if (body.includes(key!)) throw new SourceError("invalid_response");
    try { return object(JSON.parse(body)); } catch { throw new SourceError("invalid_response"); }
  }
  const retrievedAt = (options.now ?? (() => new Date()))().toISOString();
  const search = await get("/api/non-domestic/search", { uprn: uprn.padStart(12, "0"), page_size: "10", current_page: "1" });
  if (!search) return { events: [], candidates: 0, rejected: 0, complete: true, retrievedAt };
  const pagination = object(search.pagination);
  if (!Array.isArray(search.data) || search.data.length > 10 || !Number.isSafeInteger(pagination.totalRecords) || Number(pagination.totalRecords) < search.data.length) throw new SourceError("invalid_response");
  const numbers: string[] = [];
  for (const item of search.data) {
    const r = object(item);
    if (String(r.uprn).replace(/^0+/, "") !== uprn || r.schemaType !== "CEPC-8.0.0" || typeof r.certificateNumber !== "string" || !/^\d{4}(?:-\d{4}){4}$/.test(r.certificateNumber)) throw new SourceError("invalid_response");
    if (!numbers.includes(r.certificateNumber)) numbers.push(r.certificateNumber);
  }
  const events = [];
  for (const certificateNumber of numbers.slice(0, 3)) {
    const raw = await get("/api/certificate", { certificate_number: certificateNumber });
    if (!raw) throw new SourceError("invalid_response");
    const c = normaliseNonDomesticCertificate(raw, { certificateNumber, expectedUprn: uprn, retrievedAt });
    events.push(historyEvent({ source: "epc", recordId: certificateNumber, date: c.issuedOn, dateMeaning: "certificate_issued",
      fact: `Non-domestic EPC issued; energy band ${c.energyBand}; certificate status ${c.nativeStatus}. This does not confirm current certification or selected trading-unit suitability.`, reference: c.sourceReference, evidencePath: "receipts.1" }));
  }
  return { events, candidates: Number(pagination.totalRecords), rejected: 0, complete: Number(pagination.totalRecords) === search.data.length && numbers.length <= 3, retrievedAt };
}
