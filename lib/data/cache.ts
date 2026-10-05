import "server-only";
import { isDeepStrictEqual } from "node:util";
import type { LicenceMetadata, ProviderResult } from "./contracts.ts";
import { permitted } from "./policy.ts";
import { validateResult } from "./validation.ts";
import { SourceError } from "./errors.ts";
export function normalisedCache(now: () => number = Date.now, maxEntries = 100, maxBytes = 2_000_000) {
  if (!Number.isSafeInteger(maxEntries) || maxEntries < 1 || maxEntries > 100 || !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 2_000_000) throw new SourceError("invalid_request");
  const entries = new Map<string, { result: ProviderResult; expires: number; bytes: number }>(); let bytes = 0;
  function remove(key: string) { const entry = entries.get(key); if (entry) { bytes -= entry.bytes; entries.delete(key); } }
  return {
    get(key: string, licence: LicenceMetadata) {
      const entry = entries.get(key); if (!entry) return null;
      if (entry.expires <= now() || !permitted(licence) || !isDeepStrictEqual(entry.result.meta.licence, licence)) { remove(key); return null; }
      return { result: structuredClone(entry.result), expiresAt: new Date(entry.expires).toISOString() };
    },
    set(key: string, value: ProviderResult) {
      const result = validateResult(value); const licence = result.meta.licence;
      if (!/^[0-9a-f]{64}$/.test(key) || !permitted(licence) || licence.cacheSeconds <= 0 || !["success", "partial", "empty"].includes(result.outcome) || result.error || result.meta.freshness.state === "stale") return;
      const size = Buffer.byteLength(JSON.stringify(result)); if (size > maxBytes) return;
      const expiry = Math.min(Date.parse(result.meta.sourceRetrievedAt) + licence.cacheSeconds * 1000, licence.normalised.maxDays === null ? Infinity : Date.parse(result.meta.sourceRetrievedAt) + licence.normalised.maxDays * 86400_000);
      if (expiry <= now()) return;
      remove(key);
      while (entries.size >= maxEntries || bytes + size > maxBytes) remove(entries.keys().next().value!);
      entries.set(key, { result, expires: expiry, bytes: size }); bytes += size;
    },
    size: () => entries.size,
  };
}
export type CacheStore = ReturnType<typeof normalisedCache>;
