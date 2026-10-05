import "server-only";
import type { DataAdapter, SourceDefinition, SourceId } from "./contracts.ts";
import { SourceError } from "./errors.ts";
export const definitions: Readonly<Record<SourceId, SourceDefinition>> = {
  "ons-population": { id: "ons-population", provider: "ons", dataset: "TS001", operation: "area-total", adapterVersion: "1", normalisationVersion: "1", maxPages: 0, maxRecords: 1, maxBytes: 0, timeoutMs: 2000, maxAttempts: 1 },
  "tfl-stop-points": { id: "tfl-stop-points", provider: "tfl", dataset: "StopPoint", operation: "nearby", adapterVersion: "1", normalisationVersion: "1", maxPages: 1, maxRecords: 300, maxBytes: 2_000_000, timeoutMs: 8000, maxAttempts: 2 },
  "fsa-establishments": { id: "fsa-establishments", provider: "fsa", dataset: "FHRS", operation: "nearby", adapterVersion: "1", normalisationVersion: "1", maxPages: 2, maxRecords: 200, maxBytes: 2_000_000, timeoutMs: 8000, maxAttempts: 2 },
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
