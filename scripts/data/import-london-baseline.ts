import nextEnv from "@next/env";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { frameworkClient } from "../../lib/data/server-client.ts";
import type { Json } from "../../lib/supabase/database.types.ts";
import { arcgisRoot, services, censusUrl, download, digest, query, attributes, londonLookup, geographyRows, statistics, verifyJoin } from "./london-import.ts";

nextEnv.loadEnvConfig(process.cwd(), true);
let stageName = "development_guard";
try {
  if (process.env.DATA_SOURCE_PROBES_ENABLED !== "true" || new URL(process.env.SUPABASE_URL ?? "").hostname !== "idlsjusbrmyucccostxt.supabase.co") throw new Error("Explicit linked development import guard required.");
  const client = frameworkClient(); const retrievedAt = new Date().toISOString();
  stageName = "borough_lookup";
  const hashes: string[] = [];
  const b = await query(services.boroughs, { where: "RGN21CD='E12000007'", outFields: "LAD21CD,RGN21CD", f: "json", returnGeometry: "false" }); hashes.push(b.sha256);
  const boroughs = attributes(b.value); const boroughCodes = boroughs.map(r => `'${String(r.LAD21CD)}'`).join(",");
  if (!/^'E090000\d\d'(,'E090000\d\d')*$/.test(boroughCodes)) throw new Error("London borough code validation failed.");
  const lookupRows: Record<string, unknown>[] = [];
  stageName = "oa_lookup";
  for (let offset = 0; offset < 40_000; offset += 1000) {
    const page = await query(services.lookup, { where: `LAD22CD in (${boroughCodes})`, outFields: "OA21CD,LAD22CD", f: "json", returnGeometry: "false", orderByFields: "OA21CD", resultOffset: String(offset), resultRecordCount: "1000" });
    hashes.push(page.sha256); const rows = attributes(page.value); lookupRows.push(...rows);
    if (!page.value.exceededTransferLimit) break;
    if (!rows.length || offset === 39000) throw new Error("Lookup paging bounds exceeded.");
  }
  const lookup = londonLookup(boroughs, lookupRows); const codes = [...lookup.keys()].sort();
  stageName = "region_boundary";
  const region = await query(services.region, { where: "RGN21CD='E12000007'", outFields: "RGN21CD", outSR: "4326", f: "geojson" }); hashes.push(region.sha256);
  const geographies = geographyRows(region.value, lookup, true);
  let size = Buffer.byteLength(JSON.stringify(geographies));
  for (let offset = 0; offset < codes.length; offset += 100) {
    stageName = `oa_boundary_batch_${offset}`;
    const page = await query(services.oa, { where: `OA21CD in (${codes.slice(offset, offset + 100).map(c => `'${c}'`).join(",")})`, outFields: "OA21CD", outSR: "4326", orderByFields: "OA21CD", f: "geojson" });
    hashes.push(page.sha256); const rows = geographyRows(page.value, lookup); size += Buffer.byteLength(JSON.stringify(rows));
    if (rows.length !== Math.min(100, codes.length - offset) || size > 200_000_000 || page.value.exceededTransferLimit) throw new Error("Geography size/count bounds exceeded.");
    geographies.push(...rows); if (offset % 2000 === 0) console.log(`Validated ${Math.min(offset + 100, codes.length)}/${codes.length} London OA boundaries.`);
  }
  stageName = "ts001_download_and_join";
  const archive = await download(censusUrl, 12_000_000); const archiveSha256 = digest(archive);
  const counts = statistics(archive, lookup); verifyJoin(geographies, counts, lookup);
  const permit = { allowed: true, maxDays: null, condition: "Open Government Licence v3.0; attribution and third-party notices preserved." };
  const licence = { policyId: "ons-london", version: 1, reviewedAt: "2026-10-05T00:00:00Z", termsUrl: "https://www.ons.gov.uk/methodology/geography/licences", raw: { allowed: false, maxDays: 0, condition: "Discard temporary ingestion bytes." }, normalised: permit, derived: permit, references: permit, timestamps: permit,
    attribution: ["Source: Office for National Statistics licensed under the Open Government Licence v.3.0", "Contains OS data © Crown copyright and database right 2021"], cacheSeconds: 0, rawDisposition: "discarded" };
  const manifest = { provider: "ons", subset: "london", retrievedAt, effectiveAt: "2021-03-21T00:00:00Z", publishedAt: null, licence, importerVersion: "2", geometryNormalisation: "postgis-makevalid-area-preserving-v1", sourceCrs: "EPSG:27700", servingCrs: "EPSG:4326", transformation: "Official ArcGIS outSR=4326; validated GeoJSON longitude/latitude; opt-in zero-area topology repair only", versions: services,
    artefacts: [{ sourceUrl: `${arcgisRoot}${services.oa}/FeatureServer/0`, pageSha256: hashes }, { sourceUrl: censusUrl, sha256: archiveSha256 }], boroughs: boroughs.map(r => r.LAD21CD).sort(), oaCount: counts.length };
  await mkdir("supabase/.temp", { recursive: true });
  // Permitted minimal London representation, not raw responses or a national archive.
  // Keep only if loading fails, for explicit operator inspection; delete on success.
  await writeFile("supabase/.temp/london-import-normalised.json", JSON.stringify({ geographies, counts, manifest }));
  async function stage(dataset: string, version: string, rows: unknown[], sourceUrl: string, geographyReleaseId: string | null = null) {
    const hash = digest(JSON.stringify(rows));
    // Equal counts joined to a different geography are a different population release.
    const pinnedVersion = geographyReleaseId ? `${version}-geo-${geographyReleaseId}` : version;
    const { data, error } = await client.rpc("stage_sitefit_release", { p_manifest: { ...manifest, dataset, version: pinnedVersion, geographyReleaseId, sha256: hash, sourceUrl } as Json });
    if (error || !data || typeof data !== "object" || Array.isArray(data) || typeof data.id !== "string") throw new Error("Release staging failed.");
    return { id: data.id, state: data.state, hash };
  }
  const geo = await stage("london-geography", "OA2021-BFC-V8-region2021-BFC-lookup-V3-import2", geographies, `${arcgisRoot}${services.oa}/FeatureServer/0`);
  if (geo.state !== "ready") for (let i = 0; i < geographies.length; i += 100) {
    stageName = `geography_import_batch_${i}`;
    const { error } = await client.rpc("import_sitefit_geographies", { p_release_id: geo.id, p_rows: geographies.slice(i, i + 100) as unknown as Json });
    if (error) { console.error(`Safe database status: ${/^[0-9A-Z]{5}$/.test(error.code) ? error.code : "unknown"}`); throw new Error("Geography import failed; release remains inactive."); }
    if (i % 2000 === 0) console.log(`Loaded ${Math.min(i + 100, geographies.length)}/${geographies.length} London geometries.`);
  }
  stageName = "geography_activation";
  const activatedGeo = await client.rpc("activate_sitefit_release", { p_release_id: geo.id, p_expected_rows: geographies.length }); if (activatedGeo.error) throw new Error("Geography activation failed.");
  const pop = await stage("TS001", "Census2021-TS001-bulk-import1", counts, censusUrl, geo.id);
  if (pop.state !== "ready") for (let i = 0; i < counts.length; i += 1000) {
    stageName = `statistics_import_batch_${i}`;
    const { error } = await client.rpc("import_sitefit_statistics", { p_release_id: pop.id, p_geography_release_id: geo.id, p_rows: counts.slice(i, i + 1000) as unknown as Json });
    if (error) throw new Error("Census import failed; release remains inactive.");
  }
  const activatedPop = await client.rpc("activate_sitefit_release", { p_release_id: pop.id, p_expected_rows: counts.length }); if (activatedPop.error) throw new Error("Census activation failed.");
  // Re-staging proves identical validated artifacts select the same immutable identities.
  const geoAgain = await stage("london-geography", "OA2021-BFC-V8-region2021-BFC-lookup-V3-import2", geographies, `${arcgisRoot}${services.oa}/FeatureServer/0`);
  const popAgain = await stage("TS001", "Census2021-TS001-bulk-import1", counts, censusUrl, geo.id);
  if (geoAgain.id !== geo.id || popAgain.id !== pop.id || geoAgain.state !== "ready" || popAgain.state !== "ready") throw new Error("Identical ready release reuse failed.");
  await mkdir("supabase/.temp", { recursive: true });
  await writeFile("supabase/.temp/london-baseline-manifest.json", JSON.stringify({ ...manifest, geography: geoAgain, population: popAgain, normalisedBytes: size }, null, 2));
  await unlink("supabase/.temp/london-import-normalised.json");
  console.log(JSON.stringify({ geographyRelease: geo.id, populationRelease: pop.id, oaCount: counts.length, normalisedBytes: size, identicalReuse: true, rawPersisted: false }));
} catch (error) { console.error(`London baseline import failed at ${stageName}. ${error instanceof Error && /^download_status_\d+$/.test(error.message) ? error.message : "No secret/provider error body logged."} Release activation is not assumed.`); process.exitCode = 1; }
