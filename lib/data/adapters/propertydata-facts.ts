import "server-only";
import { SourceError } from "../errors.ts";
import { object, text, uuid } from "../validation.ts";
import { validPoint } from "../../spatial/model.ts";
import type { PropertyMatch } from "./propertydata.ts";
import type { EnrichmentInput } from "../enrichment-input.ts";
import { normalisePostcode } from "../../addresses/model.ts";

export type PropertyFactsSelection = PropertyMatch & { osReleaseId: string; coordinateBasis: "address_building_not_entrance";
  selectedParts?: NonNullable<EnrichmentInput["identity"]["selectedParts"]> };
type Operation = "uprn" | "flood-risk" | "rents-commercial" | "planning-applications";
type Cost = { observedCredits: number | null; estimatedCreditCeiling: number };
const cost = (v: Record<string, unknown>, ceiling: number): Cost => {
  if (v.api_calls_cost === undefined) return { observedCredits: null, estimatedCreditCeiling: ceiling };
  if (!Number.isSafeInteger(v.api_calls_cost) || Number(v.api_calls_cost) < 0 || Number(v.api_calls_cost) > ceiling) throw new SourceError("invalid_response");
  return { observedCredits: Number(v.api_calls_cost), estimatedCreditCeiling: ceiling };
};
const missing = (reason: string) => ({ state: "unavailable" as const, value: null, reason });
const nonnegative = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0;

/** Exact selected UPRN facts, not an address resolver, consent check or domestic
 * EPC substitute. Field publication dates absent from this source stay unknown. */
export function normalisePremises(value: unknown, selected: PropertyFactsSelection) {
  const root = object(value), d = object(root.data);
  let addressMatches = d.address === selected.address;
  if (selected.selectedParts) {
    const expected = selected.selectedParts, returned = object(d.addressParts);
    const normalise = (v: unknown) => v === null || v === undefined || v === "" ? null :
      text(v, 200) ? v.normalize("NFKC").toUpperCase().replace(/[,.]/g, " ").replace(/\s+/g, " ").trim() : undefined;
    addressMatches = expected.primary !== null && expected.street !== null && expected.town !== null &&
      ["primary", "secondary", "street", "town"].every(k => normalise(returned[k]) === normalise(expected[k as keyof typeof expected])) &&
      normalisePostcode(returned.postcode) === expected.postcode;
  }
  if (root.status !== "success" || !text(d.address, 600) || !addressMatches || !text(d.description, 200) ||
    !/^[1-9]\d{0,11}$/.test(selected.uprn) || !validPoint(selected.point) || selected.point.source !== "os-open-uprn" || selected.point.precision !== "building" || selected.coordinateBasis !== "address_building_not_entrance" || !uuid(selected.osReleaseId) ||
    ![d.lat, d.lng].every(v => typeof v === "number" && Number.isFinite(v) || typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v)) || Math.abs(Number(d.lat) - selected.point.latitude) > .000001 ||
    Math.abs(Number(d.lng) - selected.point.longitude) > .000001) throw new SourceError("invalid_response");
  if (d.useClass !== null && d.useClass !== undefined && !text(d.useClass, 40)) throw new SourceError("invalid_response");
  return { schemaVersion: 1 as const, kind: "premises_facts" as const, uprn: selected.uprn, sourceDate: null,
    description: { value: d.description, basis: "provider_register_description" as const },
    providerUseClass: { value: d.useClass ?? null, basis: "provider_classification_not_planning_consent" as const, sourceDate: null },
    permittedUse: missing("authoritative_planning_consent_not_returned"),
    floorArea: missing("non_domestic_certificate_unit_date_and_area_basis_unproven"),
    epc: missing("non_domestic_certificate_identity_and_vintage_unproven"),
    commercialRates: missing("domestic_council_tax_is_not_commercial_rateable_value"),
    cost: cost(root, 10) };
}

export function normalisePointFlood(value: unknown, location: string) {
  const root = object(value);
  if (root.status !== "success" || root.location !== location || !["Very Low", "Low", "Medium", "High"].includes(String(root.flood_risk))) throw new SourceError("invalid_response");
  return { schemaVersion: 1 as const, kind: "point_flood_context" as const, location,
    riversAndSea: root.flood_risk as "Very Low" | "Low" | "Medium" | "High", sourceDate: null,
    spatialBasis: "os_address_building_point_not_premises_extent" as const,
    surfaceWater: missing("not_returned"), overallPremisesRisk: missing("point_rivers_sea_is_not_overall_premises_risk"), cost: cost(root, 1) };
}

export function normaliseRentBenchmark(value: unknown, location: string, type: "restaurants" | "retail") {
  const root = object(value), d = object(root.data);
  if (root.status !== "success" || root.location !== location || root.type !== type || !Number.isSafeInteger(d.points_analysed) ||
    Number(d.points_analysed) < 0 || !["NIA", "GIA"].includes(String(d.unit_type)) ||
    ![d.avg_quoting_rent_per_sqft, d.avg_size, d.avg_quoting_rent, d.radius].every(nonnegative) || typeof d.size_banded !== "boolean") throw new SourceError("invalid_response");
  return { schemaVersion: 1 as const, kind: "commercial_rent_candidate" as const, location, type,
    pointsAnalysed: Number(d.points_analysed), areaBasis: d.unit_type as "NIA" | "GIA", sizeBanded: d.size_banded,
    poundsPerSqftYear: Number(d.avg_quoting_rent_per_sqft), averageSqft: Number(d.avg_size), poundsPerYear: Number(d.avg_quoting_rent),
    nativeRadius: Number(d.radius), radiusUnits: null, sourceDate: null, dispersion: null,
    basis: "modelled_headline_quoting_rent_not_achieved_lease" as const, currency: "GBP" as const,
    admitted: false as const, missing: ["source_model_vintage", "radius_units", "dispersion", "selected_format_comparability"], cost: cost(root, 1) };
}

/** Bounded server-side calls only. No key in URLs, redirects, retries, provider
 * logging, stored raw payload, paid resolver fallback or automatic enrichment. */
export function propertyDataFacts(options: { key: string | undefined; fetcher?: typeof fetch; now?: () => Date }) {
  async function request(operation: Operation, params: Record<string, string>, signal?: AbortSignal) {
    const key = options.key;
    if (!key || key.length > 256 || /\s/.test(key) || Array.from(key).some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) throw new SourceError("configuration_missing");
    const timeout = AbortSignal.timeout(10_000), bound = signal ? AbortSignal.any([signal, timeout]) : timeout;
    if (bound.aborted) throw new SourceError("cancelled");
    let response: Response | undefined;
    try {
      const url = new URL(`https://api.propertydata.co.uk/${operation}`);
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
      response = await (options.fetcher ?? fetch)(url, { headers: { "X-API-Key": key, Accept: "application/json" }, redirect: "error", cache: "no-store", signal: bound });
      if (!response.ok) throw new SourceError(response.status === 401 ? "authentication_failed" : response.status === 403 ? "permission_denied" : response.status === 429 ? "rate_limited" : "provider_unavailable", response.status);
      if (response.redirected || !response.body || !/^(application|text)\/json(?:;|$)/i.test(response.headers.get("content-type") ?? "") || Number(response.headers.get("content-length")) > 1_000_000) throw new SourceError("invalid_response");
      const reader = response.body.getReader(), chunks: Uint8Array[] = []; let bytes = 0;
      try { for (;;) { const p = await reader.read(); if (p.done) break; bytes += p.value.byteLength; if (bytes > 1_000_000) throw new SourceError("invalid_response"); chunks.push(p.value); } }
      finally { await reader.cancel(); }
      let value: unknown;
      try {
        const body = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
        if (body.includes(key)) throw new SourceError("invalid_response");
        value = JSON.parse(body) as unknown;
      } catch { throw new SourceError("invalid_response"); }
      return { value, retrievedAt: (options.now ?? (() => new Date()))().toISOString() };
    } catch (e) {
      if (e instanceof SourceError) throw e;
      throw new SourceError(signal?.aborted ? "cancelled" : timeout.aborted ? "timeout" : "network_error");
    } finally { await response?.body?.cancel().catch(() => undefined); }
  }
  const validateSelected = (selected: PropertyFactsSelection) => {
    if (!/^[1-9]\d{0,11}$/.test(selected.uprn) || !text(selected.address, 600) || !validPoint(selected.point) ||
      selected.point.precision !== "building" || selected.coordinateBasis !== "address_building_not_entrance" || !uuid(selected.osReleaseId) || selected.point.source !== "os-open-uprn") throw new SourceError("insufficient_precision");
    return `${selected.point.latitude},${selected.point.longitude}`;
  };
  return {
    async planning(selected: PropertyFactsSelection, signal?: AbortSignal) {
      const location = validateSelected(selected);
      return request("planning-applications", { location, results: "10", max_radius: "0.1" }, signal);
    },
    async premises(selected: PropertyFactsSelection, signal?: AbortSignal) { validateSelected(selected); const r = await request("uprn", { uprn: selected.uprn }, signal); return { ...normalisePremises(r.value, selected), retrievedAt: r.retrievedAt }; },
    async flood(selected: PropertyFactsSelection, signal?: AbortSignal) { const location = validateSelected(selected), r = await request("flood-risk", { location }, signal); return { ...normalisePointFlood(r.value, location), retrievedAt: r.retrievedAt }; },
    async rent(selected: PropertyFactsSelection, type: "restaurants" | "retail", signal?: AbortSignal) { const location = validateSelected(selected); if (!["restaurants", "retail"].includes(type)) throw new SourceError("invalid_request"); const r = await request("rents-commercial", { location, type }, signal); return { ...normaliseRentBenchmark(r.value, location, type), retrievedAt: r.retrievedAt }; },
  };
}
