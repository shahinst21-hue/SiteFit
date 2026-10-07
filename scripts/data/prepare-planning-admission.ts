import { readFile, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { canonicalJSON } from "../../lib/analysis/canonical.ts";
import { constraintDatasets, validateConstraintFeature } from "../../lib/data/planning-constraints.ts";
import { digest } from "./london-import.ts";

const directory = resolve(process.argv[2] ?? "supabase/.temp/phase8-implementation");
if (!directory.startsWith(resolve("supabase/.temp") + sep)) throw new Error("Ignored directory required.");
for (const dataset of constraintDatasets) {
  const file = await readFile(resolve(directory, `planning-${dataset}-london.json`));
  const source = JSON.parse(await readFile(resolve(directory, `planning-${dataset}-london-manifest.json`), "utf8")) as {
    sourceUrl: string; sourceBytes: number; sourceSha256: string; normalisedSha256: string; retrievedAt: string;
    sourceGeometricFeatures: number; londonIntersectionRows: number; invalidSourceGeometries: unknown[]; organisationCounts: unknown;
  };
  if (digest(file) !== source.normalisedSha256) throw new Error("Extract hash mismatch.");
  const decoded: unknown = JSON.parse(file.toString("utf8"));
  if (!Array.isArray(decoded) || decoded.length !== source.londonIntersectionRows || decoded.length > 10000) throw new Error("Full source count required.");
  const rows = decoded.map(validateConstraintFeature).map(r => ({ ...r, geometry: r.geometry.type === "Polygon" ?
    { type: "MultiPolygon" as const, coordinates: [r.geometry.coordinates] } : r.geometry }));
  if (new Set(rows.map(r => r.entity)).size !== rows.length) throw new Error("Duplicate native entity.");
  const permit = { allowed: true, maxDays: null, condition: "Dated official OGL designation representation with publisher/OS attribution; coverage and legal-scope limitations retained." };
  const manifest = { provider: "planning-data", dataset, subset: "london", version: "20261007-native-designation1",
    sha256: digest(canonicalJSON(rows)), rows: rows.length, profileSchemaVersion: 1,
    geographyReleaseId: "248a9600-59cb-4fbe-9791-d64f9cb28aa1", sourceUrl: source.sourceUrl,
    retrievedAt: source.retrievedAt, publishedAt: null, effectiveAt: null,
    coverage: "published_features_coverage_unconfirmed", source, qa: { admitted: false, state: "operator_spatial_coverage_and_storage_review_required" },
    licence: { policyId: "planning-data-OGL-3.0", version: 1, reviewedAt: "2026-10-07T00:00:00Z",
      termsUrl: `https://www.planning.data.gov.uk/dataset/${dataset}`,
      raw: { allowed: false, maxDays: 0, condition: "Temporary national extract discarded after admitted normalisation." },
      normalised: permit, derived: permit, references: permit, timestamps: permit,
      attribution: dataset === "conservation-area" ? ["© Historic England 2026. Contains Ordnance Survey data © Crown copyright and database right 2026.", "Historic England GIS Data obtained 7 October 2026; current source available at HistoricEngland.org.uk."] : ["© Crown copyright and database right 2026"],
      cacheSeconds: 0, rawDisposition: "discarded" },
    limitations: ["Published source coverage is incomplete/unconfirmed and may include duplicate designations.", "No record is not legal clearance or permission to trade.", "Invalid native features are explicitly recorded as unavailable, never repaired.", "Point overlap does not establish the affected premises extent or applicable legal clause."],
    normalisation: "Polygon wrapped as one-part MultiPolygon; native coordinates, rings and parts unchanged; no clipping or repair.",
    importerVersion: "planning-native-designation1" };
  await writeFile(resolve(directory, `planning-${dataset}-admission.json`), JSON.stringify({ manifest, rows }));
  console.log(JSON.stringify({ dataset, rows: rows.length, sha256: manifest.sha256, activated: false }));
}
