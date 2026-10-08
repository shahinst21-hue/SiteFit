import "server-only";
import type { DataAdapter, SourceDefinition, SourceId } from "./contracts.ts";
import { SourceError } from "./errors.ts";
export const definitions: Readonly<Record<SourceId, SourceDefinition>> = {
  "govuk-non-domestic-epc": {id:"govuk-non-domestic-epc",provider:"govuk-energy-data",dataset:"non-domestic-CEPC8",operation:"conditional-uprn-certificate",adapterVersion:"1",normalisationVersion:"1",maxPages:2,maxRecords:3,maxBytes:1_000_000,timeoutMs:20_000,maxAttempts:2},
  "ons-income-context": {id: "ons-income-context", provider: "ons", dataset: "income-AHC-FYE2023", operation: "native-target-excluded-distribution", adapterVersion: "1", normalisationVersion: "1", maxPages: 0, maxRecords: 1002, maxBytes: 1_000_000, timeoutMs: 8000, maxAttempts: 1},
  "ons-jobs-context": {id: "ons-jobs-context", provider: "ons", dataset: "BRES2024", operation: "native-target-excluded-distribution", adapterVersion: "1", normalisationVersion: "1", maxPages: 0, maxRecords: 4994, maxBytes: 1_000_000, timeoutMs: 8000, maxAttempts: 1},
  "propertydata-premises": {id: "propertydata-premises", provider: "propertydata", dataset: "selected-property-facts", operation: "uprn", adapterVersion: "1", normalisationVersion: "1", maxPages: 1, maxRecords: 1, maxBytes: 1_000_000, timeoutMs: 10_000, maxAttempts: 1},
  "propertydata-flood": {id: "propertydata-flood", provider: "propertydata", dataset: "point-rivers-sea", operation: "flood-risk", adapterVersion: "1", normalisationVersion: "1", maxPages: 1, maxRecords: 1, maxBytes: 1_000_000, timeoutMs: 10_000, maxAttempts: 1},
  "propertydata-rent": {id: "propertydata-rent", provider: "propertydata", dataset: "commercial-quoting-rent", operation: "rents-commercial", adapterVersion: "1", normalisationVersion: "1", maxPages: 1, maxRecords: 1, maxBytes: 1_000_000, timeoutMs: 10_000, maxAttempts: 1},
  "ons-population": { id: "ons-population", provider: "ons", dataset: "TS001", operation: "area-total", adapterVersion: "1", normalisationVersion: "1", maxPages: 0, maxRecords: 1, maxBytes: 0, timeoutMs: 2000, maxAttempts: 1 },
  "tfl-stop-points": { id: "tfl-stop-points", provider: "tfl", dataset: "StopPoint", operation: "nearby", adapterVersion: "1", normalisationVersion: "1", maxPages: 1, maxRecords: 300, maxBytes: 2_000_000, timeoutMs: 8000, maxAttempts: 2 },
  "tfl-stations": { id: "tfl-stations", provider: "tfl", dataset: "StopPoint", operation: "station-register-1000m", adapterVersion: "1", normalisationVersion: "1", maxPages: 1, maxRecords: 300, maxBytes: 2_000_000, timeoutMs: 8000, maxAttempts: 2 },
  "geoapify-access": { id: "geoapify-access", provider: "geoapify", dataset: "walking-matrix", operation: "reviewed-station-targets", adapterVersion: "1", normalisationVersion: "1", maxPages: 1, maxRecords: 8, maxBytes: 1_000_000, timeoutMs: 8000, maxAttempts: 1 },
  "tfl-station-activity": { id: "tfl-station-activity", provider: "tfl", dataset: "NUMBAT2025", operation: "TWT-native-gateline-profiles", adapterVersion: "1", normalisationVersion: "1", maxPages: 0, maxRecords: 16, maxBytes: 200_000, timeoutMs: 8000, maxAttempts: 1 },
  "fsa-establishments": { id: "fsa-establishments", provider: "fsa", dataset: "FHRS", operation: "nearby", adapterVersion: "1", normalisationVersion: "1", maxPages: 2, maxRecords: 200, maxBytes: 2_000_000, timeoutMs: 8000, maxAttempts: 2 },
  "planning-conservation": { id: "planning-conservation", provider: "planning-data", dataset: "conservation-area", operation: "point-profile", adapterVersion: "1", normalisationVersion: "1", maxPages: 0, maxRecords: 500, maxBytes: 2_000_000, timeoutMs: 8000, maxAttempts: 1 },
  "planning-article4": { id: "planning-article4", provider: "planning-data", dataset: "article-4-direction-area", operation: "point-profile", adapterVersion: "1", normalisationVersion: "1", maxPages: 0, maxRecords: 500, maxBytes: 2_000_000, timeoutMs: 8000, maxAttempts: 1 },
  "geoapify-walking": { id: "geoapify-walking", provider: "geoapify", dataset: "walking-isolines", operation: "walk-300-600-900", adapterVersion: "1", normalisationVersion: "1", maxPages: 1, maxRecords: 3, maxBytes: 1_000_000, timeoutMs: 8000, maxAttempts: 1 },
  "ons-catchments": { id: "ons-catchments", provider: "ons", dataset: "census-income-bres", operation: "frozen-walking-operands", adapterVersion: "1", normalisationVersion: "1", maxPages: 0, maxRecords: 12, maxBytes: 2_000_000, timeoutMs: 8000, maxAttempts: 1 },
  "overture-catchments": { id: "overture-catchments", provider: "overture", dataset: "places", operation: "frozen-walking-inventory", adapterVersion: "1", normalisationVersion: "1", maxPages: 0, maxRecords: 25000, maxBytes: 2_000_000, timeoutMs: 8000, maxAttempts: 1 },
};
for (const definition of Object.values(definitions)) Object.freeze(definition);
Object.freeze(definitions);
export function registry(adapters: DataAdapter[]) {
  const map = new Map<SourceId, DataAdapter>();
  for (const adapter of adapters) {
    if (!Object.hasOwn(definitions, adapter.source.id) || map.has(adapter.source.id) || JSON.stringify(adapter.source) !== JSON.stringify(definitions[adapter.source.id])) throw new SourceError("invalid_request");
    map.set(adapter.source.id, adapter);
  }
  return { get(id: SourceId) { const adapter = map.get(id); if (!adapter) throw new SourceError("invalid_request"); return adapter; } };
}
