import "server-only";
import type { Json } from "../supabase/database.types.ts";
import type { CollectionContext, ProviderResult, SnapshotRepository, SourceId, StoredSnapshot } from "./contracts.ts";
import { SourceError } from "./errors.ts";
import { object, uuid, validateContext, validateResult } from "./validation.ts";
import { frameworkClient } from "./server-client.ts";

type Preparation = Pick<CollectionContext, "region" | "geography" | "releases">;
function json(value: unknown): Json { return value as Json; }
function decode(value: unknown): StoredSnapshot {
  const row = object(value);
  if (!uuid(row.id) || !uuid(row.analysis_id) || !uuid(row.input_id) || typeof row.collection_key !== "string" || typeof row.request_sha256 !== "string") throw new SourceError("persistence_failed");
  const result = validateResult({ ...object(row.provider_metadata), payload: row.normalised_data });
  if (result.meta.source !== row.source || result.meta.datasetReleaseId !== row.dataset_release_id) throw new SourceError("persistence_failed");
  return { id: row.id, analysisId: row.analysis_id, inputId: row.input_id, collectionKey: row.collection_key, requestHash: row.request_sha256, result };
}
export function snapshotRepository(): SnapshotRepository & { prepare(analysisId: string, userSupplied: Json, context: Preparation): Promise<CollectionContext> } {
  // Separate short-lived privileged client; no Auth cookie/session and no browser consumer.
  const client = frameworkClient();
  return {
    async prepare(analysisId, userSupplied, context) {
      if (!uuid(analysisId)) throw new SourceError("invalid_request");
      const { data, error } = await client.rpc("prepare_sitefit_input", { p_analysis_id: analysisId, p_user_supplied: userSupplied, p_context: json(context) });
      if (error || !data) throw new SourceError("persistence_failed");
      return validateContext(data.resolved_context);
    },
    async context(analysisId, inputId) {
      if (!uuid(analysisId) || !uuid(inputId)) throw new SourceError("invalid_request");
      const checked = await client.rpc("sitefit_assert_collectable", { p_analysis_id: analysisId });
      if (checked.error || !checked.data) throw new SourceError("invalid_request");
      const { data, error } = await client.from("analysis_inputs").select("resolved_context").eq("analysis_id", analysisId).eq("id", inputId).single();
      if (error || !data?.resolved_context) throw new SourceError("invalid_request");
      const context = validateContext(data.resolved_context);
      if (context.analysisId !== analysisId || context.inputId !== inputId || context.selectedProperty.id !== checked.data.property_id || context.category !== checked.data.business_category || context.businessType !== checked.data.business_type) throw new SourceError("invalid_request");
      return context;
    },
    async find(context: CollectionContext, key: string, source: SourceId, hash: string) {
      const { data, error } = await client.from("data_snapshots").select("*").eq("analysis_id", context.analysisId).eq("input_id", context.inputId).eq("collection_key", key).eq("source", source).eq("request_sha256", hash).maybeSingle();
      if (error) throw new SourceError("persistence_failed");
      return data ? decode(data) : null;
    },
    async append(context: CollectionContext, key: string, hash: string, value: ProviderResult) {
      const result = validateResult(value);
      if (!result.meta.licence.normalised.allowed || !result.meta.licence.references.allowed || !result.meta.licence.timestamps.allowed) throw new SourceError("licence_blocked");
      const { data, error } = await client.rpc("append_sitefit_snapshot", { p_analysis_id: context.analysisId, p_input_id: context.inputId, p_collection_key: key, p_request_sha256: hash, p_result: json(result) });
      if (error || !data) throw new SourceError("persistence_failed");
      return decode(data);
    },
  };
}
