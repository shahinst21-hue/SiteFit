import "server-only";
import type { Json } from "../supabase/database.types.ts";
import { frameworkClient } from "../data/server-client.ts";
import { SourceError } from "../data/errors.ts";
import { uuid, validateContext } from "../data/validation.ts";
import { canonicalJSON } from "../analysis/canonical.ts";
import { validateDiscovery } from "./model.ts";
import { collectDiscovery } from "./collect.ts";
import { validatePropertyFactResult } from "../data/property-fact-result.ts";

export function webDiscoveryRepository(ownerId: string) {
  if (!uuid(ownerId)) throw new SourceError("permission_denied");
  const client = frameworkClient();
  const read = async (analysisId: string, inputId: string) => {
    if (![analysisId,inputId].every(uuid)) throw new SourceError("invalid_request");
    const { data, error } = await client.rpc("read_sitefit_web_discovery", { p_owner: ownerId, p_analysis: analysisId, p_input: inputId }).abortSignal(AbortSignal.timeout(8000));
    if (error) throw new SourceError("permission_denied");
    return data === null ? null : validateDiscovery(data);
  };
  return { read, async prepare(analysisId: string, inputId: string, options: Parameters<typeof collectDiscovery>[2]) {
    // No client route invokes this. Paid Full Report preparation integration is a later caller.
    const { error: denied } = await client.rpc("authorise_sitefit_web_discovery", { p_owner: ownerId, p_analysis: analysisId, p_input: inputId });
    if (denied) throw new SourceError("permission_denied");
    const stored = await read(analysisId,inputId); if (stored) return stored;
    const { data: input, error } = await client.from("analysis_inputs").select("resolved_context").eq("id",inputId).eq("analysis_id",analysisId).single();
    if (error || !input) throw new SourceError("invalid_request");
    const context = validateContext(input.resolved_context);
    const { data: sources, error: failed } = await client.from("data_snapshots").select("id,source,provider_metadata").eq("analysis_id",analysisId).eq("input_id",inputId).limit(30);
    if (failed) throw new SourceError("persistence_failed");
    const bindings = (sources ?? []).flatMap(s => {
      const metadata = s.provider_metadata as unknown as { meta?: { checksum?: string } };
      return metadata.meta?.checksum && s.source ? [{ snapshotId: s.id, source: s.source, checksum: metadata.meta.checksum }] : [];
    });
    // Read only the frozen rent payloads, not every potentially large source outcome.
    // No new PropertyData call and no copying of scalar operands or private fields.
    const { data: rents, error: rentError } = await client.from("data_snapshots").select("id,normalised_data").eq("analysis_id",analysisId)
      .eq("input_id",inputId).eq("normalised_data->>operation","rents-commercial").limit(3);
    if (rentError) throw new SourceError("persistence_failed");
    const rentReferences = (rents ?? []).map(row => {
      const rent = validatePropertyFactResult(row.normalised_data);
      const binding = bindings.find(s => s.snapshotId===row.id);
      if (rent.operation!=="rents-commercial" || !binding || rent.binding.uprn!==context.enrichment?.identity.uprn || rent.binding.osReleaseId!==context.enrichment?.releases.osReleaseId) throw new SourceError("invalid_response");
      return { snapshotId:row.id,checksum:binding.checksum };
    });
    const bundle = await collectDiscovery(context,bindings,{...options,structuredRentReferences:rentReferences});
    const { data, error: writeError } = await client.rpc("freeze_sitefit_web_discovery", { p_owner: ownerId, p_analysis: analysisId, p_input: inputId,
      p_context_canonical: canonicalJSON(context), p_bundle: bundle as unknown as Json }).abortSignal(AbortSignal.timeout(8000));
    if (writeError || !data) throw new SourceError("persistence_failed");
    return validateDiscovery(data);
  } };
}
