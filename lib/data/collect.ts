import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { sourceIds as allowedSources } from "./contracts.ts";
import type { CollectionContext, DataAdapter, ProviderResult, SnapshotRepository, SourceId, StoredSnapshot } from "./contracts.ts";
import { normalisedCache } from "./cache.ts";
import type { CacheStore } from "./cache.ts";
import { registry } from "./registry.ts";
import { policy, assertPolicy } from "./policy.ts";
import { initialResult } from "./result.ts";
import { SourceError, safeError } from "./errors.ts";
import { validateContext, validateResult } from "./validation.ts";
import { safeSummary, recordSummary } from "./telemetry.ts";

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
const digest = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
function abortError(signal: AbortSignal) { return new SourceError(signal.reason?.name === "TimeoutError" ? "timeout" : "cancelled"); }
async function bounded<T>(task: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) { void task.catch(() => {}); throw abortError(signal); }
  let cancel: () => void = () => {};
  try { return await Promise.race([task, new Promise<never>((_, reject) => { cancel = () => reject(abortError(signal)); signal.addEventListener("abort", cancel, { once: true }); })]); }
  finally { signal.removeEventListener("abort", cancel); }
}
type SourceOutcome = { source: SourceId; snapshot: StoredSnapshot | null; outcome: ProviderResult["outcome"]; error: ProviderResult["error"] };
// One finite process coordinator, shared by request-scoped collectors; not distributed ownership.
export function processCoordination() {
  const flights = new Map<string, Promise<SourceOutcome>>();
  const tails = new Map<SourceId, Promise<void>>();
  let queued = 0;
  return {
    async once(key: string, run: () => Promise<SourceOutcome>, signal: AbortSignal) {
      const existing = flights.get(key); if (existing) return bounded(existing, signal);
      if (flights.size >= 100) throw new SourceError("rate_limited");
      const flight = run(); flights.set(key, flight);
      try { return await flight; } finally { if (flights.get(key) === flight) flights.delete(key); }
    },
    async serial<T>(source: SourceId, run: () => Promise<T>, signal: AbortSignal): Promise<T> {
      if (queued >= 100) throw new SourceError("rate_limited");
      queued++; const prior = tails.get(source) ?? Promise.resolve(); let release: () => void = () => {};
      const tail = new Promise<void>(resolve => { release = resolve; });
      const joined = prior.then(() => tail); tails.set(source, joined);
      let work: Promise<T> | null = null;
      const done = () => { release(); queued--; if (tails.get(source) === joined) void joined.then(() => { if (tails.get(source) === joined) tails.delete(source); }); };
      try { await bounded(prior, signal); if (signal.aborted) throw abortError(signal); work = Promise.resolve().then(run); return await bounded(work, signal); }
      finally {
        // Cancellation ends the caller's wait, but does not free a live dispatch slot until work settles.
        if (work && signal.aborted) void work.then(done, done); else done();
      }
    },
    size: () => flights.size,
  };
}
const sharedCoordination = processCoordination();
const sharedCache = normalisedCache();
export function collector(repository: SnapshotRepository, adapters: DataAdapter[], options: {
  cache?: CacheStore; coordination?: ReturnType<typeof processCoordination>; now?: () => Date;
  record?: (result: ProviderResult) => Promise<unknown>; deadlineMs?: number;
} = {}) {
  const sources = registry(adapters), cache = options.cache ?? sharedCache, coordination = options.coordination ?? sharedCoordination;
  const now = options.now ?? (() => new Date()), record = options.record ?? recordSummary;
  const deadlineMs = options.deadlineMs ?? 30_000;
  if (!Number.isSafeInteger(deadlineMs) || deadlineMs < 1 || deadlineMs > 30_000) throw new SourceError("invalid_request");
  return { async collectSources(input: CollectionContext, ids: SourceId[], collectionKey: string, signal?: AbortSignal) {
    const requested = validateContext(input);
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 3 || new Set(ids).size !== ids.length || ids.some(id => !allowedSources.includes(id)) || !/^[A-Za-z0-9_-]{1,80}$/.test(collectionKey)) throw new SourceError("invalid_request");
    const batchSignal = AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(deadlineMs)]);
    const context = validateContext(await bounded(repository.context(requested.analysisId, requested.inputId, batchSignal), batchSignal));
    if (canonical(context) !== canonical(requested)) throw new SourceError("invalid_request");
    const outcomes = await Promise.all(ids.map(async (id): Promise<SourceOutcome> => {
      try {
        const adapter = sources.get(id), licence = policy(id); assertPolicy(licence);
        const request = { context, collectionKey, radiusMetres: 500 };
        const identity = { context, source: adapter.source, licence, radiusMetres: request.radiusMetres };
        const hash = digest(identity), key = digest({ analysisId: context.analysisId, inputId: context.inputId, collectionKey, source: id, hash });
        return await coordination.once(key, async () => {
          const stored = await bounded(repository.find(context, collectionKey, id, hash, batchSignal), batchSignal);
          if (stored) return { source: id, snapshot: stored, outcome: stored.result.outcome, error: stored.result.error };
          const execution = { signal: batchSignal, correlationId: randomUUID(), now };
          const cacheKey = digest({ source: adapter.source, licence, point: context.selectedProperty.point, region: context.region,
            geography: context.geography, releases: context.releases, radiusMetres: request.radiusMetres, category: id === "fsa-establishments" ? context.category : null });
          let value = initialResult(adapter.source, request, execution);
          const eligible = adapter.supports(context);
          if (!eligible.eligible) { value.outcome = eligible.outcome; value.error = { code: eligible.code, status: null, retryable: false }; }
          else {
            const hit = cache.get(cacheKey, licence);
            if (hit) {
              value = hit.result; value.meta.correlationId = execution.correlationId; value.meta.retrievedAt = now().toISOString();
              value.meta.freshness.assessedAt = value.meta.retrievedAt;
              value.meta.cache = { state: "hit", key: cacheKey, expiresAt: hit.expiresAt };
              value.meta.execution = { durationMs: 0, attempts: 0, pages: 0, httpStatus: null, providerRequestId: null };
              value.meta.cost = { units: 0, money: "0", currency: "GBP", category: "estimated", priceReference: value.meta.cost.priceReference };
            } else {
              try { value = await coordination.serial(id, () => adapter.retrieve(request, execution), batchSignal); }
              catch (error) { value.outcome = "unavailable"; value.error = safeError(error); }
              if (value.meta.cache.state !== "local_release") value.meta.cache = { state: "miss", key: cacheKey, expiresAt: null };
            }
          }
          value = validateResult(value); assertPolicy(value.meta.licence);
          if (value.meta.source !== id || value.meta.provider !== adapter.source.provider || value.meta.operation !== adapter.source.operation || value.meta.adapterVersion !== adapter.source.adapterVersion || value.meta.normalisationVersion !== adapter.source.normalisationVersion || ![id, ...(id === "ons-population" ? ["ons-london"] : [])].includes(value.meta.licence.policyId)) throw new SourceError("invalid_response");
          if (batchSignal.aborted) throw abortError(batchSignal);
          if (value.meta.checksum === null && value.payload) value.meta.checksum = digest({ payload: value.payload, observations: value.observations });
          const snapshot = await bounded(repository.append(context, collectionKey, hash, value, batchSignal), batchSignal);
          cache.set(cacheKey, snapshot.result);
          // Telemetry is bounded and cannot change the already persisted outcome.
          try { await bounded(record(snapshot.result), batchSignal); } catch { /* Safe diagnostic failure only. */ }
          return { source: id, snapshot, outcome: snapshot.result.outcome, error: snapshot.result.error };
        }, batchSignal);
      } catch (error) { const safe = safeError(error); return { source: id, snapshot: null, outcome: safe.code === "licence_blocked" ? "policy_blocked" : "unavailable", error: safe }; }
    }));
    return { outcomes, summary: outcomes.map(o => o.snapshot ? safeSummary(o.snapshot.result) : { source: o.source, outcome: o.outcome, code: o.error?.code ?? null }) };
  } };
}
