import { readFile, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { canonicalJSON } from "../../lib/analysis/canonical.ts";
import { censusPolicy } from "../../lib/data/policy.ts";
import { uuid } from "../../lib/data/validation.ts";
import { digest } from "./london-import.ts";
import { incomeProfiles, bresProfiles, nativeProfilesDigest } from "./native-enrichment.ts";

// Offline artifacts only. Loading and complete stored-content QA precede activation.
const directory = resolve(process.argv[2] ?? "supabase/.temp/phase8-implementation");
if (!directory.startsWith(resolve("supabase/.temp") + sep)) throw new Error("Ignored directory required.");
const geographyReleaseId = process.argv[3];
const membership = JSON.parse(await readFile(resolve(directory, "native-memberships-normalised.json"), "utf8")) as { oa: string; lsoa: string; msoa: string; lad: string }[];
const lookup = JSON.parse(await readFile(resolve(directory, "london-native-lookup.manifest.json"), "utf8")) as { sourceUrl: string; retrievedAt: string; sha256: string };
const placeholder = "00000000-0000-4000-8000-000000000001";
const base = { provider: "ons", subset: "london", licence: censusPolicy(), importerVersion: "native-statistics-1", publishedAt: null, effectiveAt: null };
if (!geographyReleaseId) {
  const manifest = { ...base, dataset: "london-native-geography", version: "OA_LSOA_MSOA_EW_DEC_2021_LU_v3-native1",
    sha256: digest(canonicalJSON(membership)), archiveSha256: lookup.sha256, sourceUrl: lookup.sourceUrl, retrievedAt: lookup.retrievedAt,
    oaReleaseId: "248a9600-59cb-4fbe-9791-d64f9cb28aa1", lookupVersion: "OA_LSOA_MSOA_EW_DEC_2021_LU_v3", rows: membership.length,
    geographyMethod: "Native 2021 membership; geometry reused from frozen OA2021 BFC, not new official LSOA/MSOA geometry." };
  await writeFile(resolve(directory, "native-geography-admission.json"), JSON.stringify({ manifest, rows: membership }));
  console.log(JSON.stringify({ prepared: "native-geography", rows: membership.length, activated: false }));
} else {
  if (!uuid(geographyReleaseId)) throw new Error("Native geography binding required.");
  for (const dataset of ["income", "bres"] as const) {
    const artifact = dataset === "income" ? "income-fye2023.xlsx" : "bres-london-2024.csv";
    const bytes = await readFile(resolve(directory, artifact));
    const download = JSON.parse(await readFile(resolve(directory, artifact + ".manifest.json"), "utf8")) as { sha256: string; retrievedAt: string; sourceUrl: string };
    const pinned = dataset === "income" ? "9f17da5c218d2edd336106e1f219e0f7f25e82373afa8be5d0dc7622e18c7ab7" : "b6a8f7d14c2fd735070b51a835479c18a0b15f57ecf44966c505fdba25e204ca";
    if (digest(bytes) !== pinned || download.sha256 !== pinned || !Number.isFinite(Date.parse(download.retrievedAt))) throw new Error("Pinned source required.");
    const profiles = dataset === "income" ? incomeProfiles(JSON.parse(await readFile(resolve(directory, "income-london-normalised.json"), "utf8")), placeholder, geographyReleaseId, new Set(membership.map(r => r.msoa))) :
      bresProfiles(bytes.toString("utf8"), placeholder, geographyReleaseId, new Set(membership.map(r => r.lsoa)));
    const manifest = { ...base, dataset: profiles[0].measure.dataset, version: `${profiles[0].measure.dataset}-native1-geo-${geographyReleaseId}`,
      sha256: nativeProfilesDigest(profiles), archiveSha256: pinned, artifactUrl: download.sourceUrl, sourceUrl: profiles[0].lineage.sourceReference,
      retrievedAt: download.retrievedAt, geographyReleaseId, profileSchemaVersion: 2, rows: profiles.length,
      referencePeriod: profiles[0].measure.referencePeriod, quality: profiles[0].quality };
    await writeFile(resolve(directory, dataset + "-admission.json"), JSON.stringify({ manifest, rows: profiles }));
    console.log(JSON.stringify({ prepared: dataset, rows: profiles.length, sha256: manifest.sha256, activated: false }));
  }
}
