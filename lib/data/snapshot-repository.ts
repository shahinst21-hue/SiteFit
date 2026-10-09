import "server-only";
import type { Json } from "../supabase/database.types.ts";
import type { CollectionContext, ProviderResult, SnapshotRepository, SourceId, StoredSnapshot } from "./contracts.ts";
import { SourceError } from "./errors.ts";
import { object, uuid, validateContext, validateResult } from "./validation.ts";
import { frameworkClient } from "./server-client.ts";
import { assertPolicy } from "./policy.ts";
import { validateEnrichmentInput, type EnrichmentInput } from "./enrichment-input.ts";

type Preparation = Pick<CollectionContext, "region" | "geography" | "releases">;
function json(value: unknown): Json { return value as Json; }
function limited(signal?: AbortSignal) { return AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(2000)]); }
function checkAbort(signal: AbortSignal) { if (signal.aborted) throw new SourceError(signal.reason?.name === "TimeoutError" ? "timeout" : "cancelled"); }
function decode(value: unknown): StoredSnapshot {
  const row = object(value);
  if (!uuid(row.id) || !uuid(row.analysis_id) || !uuid(row.input_id) || typeof row.collection_key !== "string" || typeof row.request_sha256 !== "string") throw new SourceError("persistence_failed");
  const result = validateResult({ ...object(row.provider_metadata), payload: row.normalised_data });
  if (result.meta.source !== row.source || result.meta.datasetReleaseId !== row.dataset_release_id) throw new SourceError("persistence_failed");
  return { id: row.id, analysisId: row.analysis_id, inputId: row.input_id, collectionKey: row.collection_key, requestHash: row.request_sha256, result };
}
type PreparedRepository = SnapshotRepository & {
  prepare(analysisId: string, userSupplied: Json, context: Preparation): Promise<CollectionContext>;
  prepareEnriched(analysisId: string, userSupplied: Json, context: Preparation, enrichment: EnrichmentInput): Promise<CollectionContext>;
};
export function snapshotRepository(ownerId: string): PreparedRepository {
  // Caller supplies a verified identity, never an identity from a public request body.
  if (!uuid(ownerId)) throw new SourceError("permission_denied");
  // Separate short-lived privileged client; no Auth cookie/session and no browser consumer.
  const client = frameworkClient();
  async function owned(analysisId: string, signal?: AbortSignal) {
    const bound = limited(signal);
    const { data, error } = await client.rpc("sitefit_assert_collectable", { p_analysis_id: analysisId }).abortSignal(bound);
    checkAbort(bound);
    if (error || !data || data.owner_id !== ownerId) throw new SourceError("permission_denied");
    return data;
  }
  const repository: PreparedRepository = {
    async prepareEnriched(analysisId, userSupplied, context, enrichment) {
      if (!uuid(analysisId)) throw new SourceError("invalid_request");
      const validated = validateEnrichmentInput(enrichment);
      await owned(analysisId);
      const bound = AbortSignal.timeout(8000);
      const { data, error } = await client.rpc("prepare_sitefit_enriched_input", {
        p_analysis_id: analysisId, p_user_supplied: userSupplied, p_context: json(context), p_enrichment: json(validated),
      }).abortSignal(bound);
      checkAbort(bound);
      if (error || !data) throw new SourceError("persistence_failed");
      const frozen = validateContext(data.resolved_context);
      if (frozen.schemaVersion !== 2 || frozen.analysisId !== analysisId) throw new SourceError("persistence_failed");
      return frozen;
    },
    async prepare(analysisId, userSupplied, context) {
      if (!uuid(analysisId)) throw new SourceError("invalid_request");
      await owned(analysisId);
      const { data, error } = await client.rpc("prepare_sitefit_input", { p_analysis_id: analysisId, p_user_supplied: userSupplied, p_context: json(context) }).abortSignal(AbortSignal.timeout(2000));
      if (error || !data) throw new SourceError("persistence_failed");
      return validateContext(data.resolved_context);
    },
    async context(analysisId, inputId, signal) {
      if (!uuid(analysisId) || !uuid(inputId)) throw new SourceError("invalid_request");
      const checked = await owned(analysisId, signal);
      const { data, error } = await client.from("analysis_inputs").select("resolved_context").eq("analysis_id", analysisId).eq("id", inputId).abortSignal(AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(2000)])).single();
      if (error || !data?.resolved_context) throw new SourceError("invalid_request");
      const context = validateContext(data.resolved_context);
      if (context.analysisId !== analysisId || context.inputId !== inputId || context.selectedProperty.id !== checked.property_id || context.category !== checked.business_category || context.businessType !== checked.business_type) throw new SourceError("invalid_request");
      return context;
    },
    async find(context: CollectionContext, key: string, source: SourceId, hash: string, signal) {
      await owned(context.analysisId, signal);
      // Bounded historical envelope transfer; indexed ONS/context lookups still use two seconds.
      const readSignal = AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(8000)]);
      const { data, error } = await client.from("data_snapshots").select("*").eq("analysis_id", context.analysisId).eq("input_id", context.inputId).eq("collection_key", key).eq("source", source).eq("request_sha256", hash).abortSignal(readSignal).maybeSingle();
      checkAbort(readSignal);
      if (error) throw new SourceError("persistence_failed");
      return data ? decode(data) : null;
    },
    async append(context: CollectionContext, key: string, hash: string, value: ProviderResult, signal) {
      await owned(context.analysisId, signal);
      const result = validateResult(value);
      assertPolicy(result.meta.licence);
      if (!result.meta.licence.normalised.allowed || !result.meta.licence.references.allowed || !result.meta.licence.timestamps.allowed) throw new SourceError("licence_blocked");
      // The two-second local lookup bound is separate from transferring a bounded snapshot write.
      const writeSignal = AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(8000)]);
      const { data, error } = await client.rpc("append_sitefit_snapshot", { p_analysis_id: context.analysisId, p_input_id: context.inputId, p_collection_key: key, p_request_sha256: hash, p_result: json(result) }).abortSignal(writeSignal);
      checkAbort(writeSignal);
      if (error || !data) throw new SourceError("persistence_failed");
      return decode(data);
    },
  };
  return repository;
}
