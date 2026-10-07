import nextEnv from "@next/env";
import { readFile, unlink } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { frameworkClient } from "../../lib/data/server-client.ts";
import { censusPolicy } from "../../lib/data/policy.ts";
import { uuid } from "../../lib/data/validation.ts";
import { censusProfiles } from "./census-enrichment.ts";
import type { Json } from "../../lib/supabase/database.types.ts";

nextEnv.loadEnvConfig(process.cwd(), true);
let stage = "development_guard";
try {
  const geographyReleaseId = process.argv[2];
  const tempRoot = resolve("supabase/.temp"), directory = resolve(process.argv[3] ?? "supabase/.temp/phase8-implementation");
  if (process.env.DATA_SOURCE_PROBES_ENABLED !== "true" || new URL(process.env.SUPABASE_URL ?? "").hostname !== "idlsjusbrmyucccostxt.supabase.co" ||
      !uuid(geographyReleaseId) || !directory.startsWith(tempRoot + sep)) throw new Error("Development import guard required.");
  const lookup = JSON.parse(await readFile(resolve(directory, "london-oa-codes.json"), "utf8")) as { rows: { geography_code: string }[] };
  if (!Array.isArray(lookup.rows)) throw new Error("Frozen London lookup required.");
  const codes = new Set(lookup.rows.map(r => r.geography_code));
  if (codes.size !== lookup.rows.length) throw new Error("Duplicate lookup.");
  const client = frameworkClient();
  for (const dataset of ["TS007A", "TS003", "TS045", "TS066"] as const) {
    stage = `${dataset}_normalisation`;
    const archivePath = resolve(directory, `census2021-${dataset.toLowerCase()}.zip`);
    const normalised = censusProfiles(await readFile(archivePath), dataset, codes);
    const download = JSON.parse(await readFile(resolve(directory, `${dataset.toLowerCase()}-manifest.json`), "utf8")) as { sha256?: string; retrievedAt?: string; sourceUrl?: string };
    const sourceUrl = `https://www.nomisweb.co.uk/output/census/2021/census2021-${dataset.toLowerCase()}.zip`;
    if (download.sha256 !== normalised.archiveSha256 || download.sourceUrl !== sourceUrl ||
        typeof download.retrievedAt !== "string" || !Number.isFinite(Date.parse(download.retrievedAt))) throw new Error("Pinned retrieval provenance required.");
    const { profiles, ...summary } = normalised;
    const manifest = { ...summary, provider: "ons", subset: "london", dataset,
      version: `Census2021-${dataset}-${normalised.archiveSha256.slice(0, 12)}-native2-geo-${geographyReleaseId}`,
      sourceUrl,
      geographyReleaseId, profileSchemaVersion: 2, effectiveAt: "2021-03-21T00:00:00Z", publishedAt: null,
      retrievedAt: download.retrievedAt, licence: censusPolicy(), importerVersion: "census-native2-1",
      geographyType: "OA2021", rows: profiles.length,
      quality: { missingCells: normalised.missingCells, fullLondonCodeJoin: true, crossTableReconciliation: "not_assumed_due_to_disclosure_control" } };
    stage = `${dataset}_stage`;
    const staged = await client.rpc("stage_sitefit_release", { p_manifest: manifest as unknown as Json }).abortSignal(AbortSignal.timeout(8_000));
    if (staged.error || !staged.data || typeof staged.data !== "object" || Array.isArray(staged.data) || !uuid(staged.data.id)) throw new Error("Release staging failed.");
    const id = staged.data.id;
    if (staged.data.state !== "ready") {
      for (let i = 0; i < profiles.length; i += 1000) {
        stage = `${dataset}_batch_${i}`;
        const imported = await client.rpc("import_sitefit_census_profiles", { p_release_id: id, p_geography_release_id: geographyReleaseId, p_rows: profiles.slice(i, i + 1000) as unknown as Json }).abortSignal(AbortSignal.timeout(8_000));
        if (imported.error) throw new Error("Census batch failed; inactive release retained.");
      }
      stage = `${dataset}_activation`;
      const activated = await client.rpc("activate_sitefit_census_release", { p_release_id: id, p_expected_rows: profiles.length }).abortSignal(AbortSignal.timeout(8_000));
      if (activated.error) throw new Error("Census activation failed.");
    }
    stage = `${dataset}_stored_join`;
    const probe = await client.rpc("lookup_sitefit_census_profile", { p_release_id: id, p_geography_release_id: geographyReleaseId, p_code: profiles[0].code }).abortSignal(AbortSignal.timeout(8_000));
    if (probe.error || !probe.data || typeof probe.data !== "object" || Array.isArray(probe.data) ||
        JSON.stringify(probe.data.values) !== JSON.stringify(profiles[0].values) || probe.data.unit !== normalised.unit || probe.data.universe !== normalised.universe) throw new Error("Stored native operands differ.");
    console.log(JSON.stringify({ dataset, releaseId: id, rows: profiles.length, missingCells: normalised.missingCells, sha256: normalised.sha256, storedProbePassed: true }));
    // Downloaded temporary national bytes only; the validated London representation/release remains.
    await unlink(archivePath);
  }
} catch {
  console.error(JSON.stringify({ stage, error: "Census development ingestion failed; raw database/provider details withheld." }));
  process.exitCode = 1;
}
