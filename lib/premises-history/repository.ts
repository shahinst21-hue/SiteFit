import "server-only";
import type { Json } from "../supabase/database.types.ts";
import { frameworkClient } from "../data/server-client.ts";
import { SourceError } from "../data/errors.ts";
import { uuid, validateContext } from "../data/validation.ts";
import { canonicalJSON } from "../analysis/canonical.ts";
import { collectHistory } from "./collect.ts";
import { validateHistory, projectHistory } from "./model.ts";

/** Internal service entry, verified identity supplied by trusted caller only.
 * Stored read occurs first and never invokes providers, AI or scoring. */
export function premisesHistoryRepository(ownerId: string) {
  if (!uuid(ownerId)) throw new SourceError("permission_denied");
  const client = frameworkClient();
  const read = async (analysisId: string, inputId: string) => {
    if (![analysisId, inputId].every(uuid)) throw new SourceError("invalid_request");
    const { data, error } = await client.rpc("read_sitefit_premises_history", { p_owner: ownerId, p_analysis: analysisId, p_input: inputId }).abortSignal(AbortSignal.timeout(8000));
    if (error) throw new SourceError("permission_denied");
    return data === null ? null : validateHistory(data);
  };
  return { read, async project(analysisId: string, inputId: string) { const b = await read(analysisId, inputId); return b ? projectHistory(b) : null; },
    async collect(analysisId: string, inputId: string, options: Parameters<typeof collectHistory>[2]) {
      const stored = await read(analysisId, inputId);
      if (stored) return stored;
      // Authorisation already checked by service RPC before privileged context reads.
      const { data: input, error } = await client.from("analysis_inputs").select("resolved_context").eq("id", inputId).eq("analysis_id", analysisId).single();
      if (error || !input) throw new SourceError("invalid_request");
      const context = validateContext(input.resolved_context);
      const { data: sources, error: sourceError } = await client.from("data_snapshots").select("id,source,provider_metadata").eq("analysis_id", analysisId).eq("input_id", inputId).limit(30);
      if (sourceError) throw new SourceError("persistence_failed");
      const references = (sources ?? []).flatMap(s => {
        const metadata = s.provider_metadata as unknown as { meta?: { checksum?: string } };
        return metadata.meta?.checksum ? [{ snapshotId: s.id, source: s.source!, checksum: metadata.meta.checksum }] : [];
      });
      const bundle = await collectHistory(context, references, options);
      const { data, error: writeError } = await client.rpc("freeze_sitefit_premises_history", {
        p_owner: ownerId, p_analysis: analysisId, p_input: inputId, p_context_canonical: canonicalJSON(context), p_bundle: bundle as unknown as Json,
      }).abortSignal(AbortSignal.timeout(8000));
      if (writeError || !data) throw new SourceError("persistence_failed");
      return validateHistory(data);
    } };
}
