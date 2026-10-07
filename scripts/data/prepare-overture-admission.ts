import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, sep } from "node:path";
import { validatePlaceChunk } from "../../lib/data/overture.ts";
import { digest } from "./london-import.ts";

const directory = resolve(process.argv[2] ?? "supabase/.temp/phase8-implementation");
if (!directory.startsWith(resolve("supabase/.temp") + sep)) throw new Error("Ignored directory required.");
const packed = JSON.parse(await readFile(resolve(directory, "overture-compact-manifest.json"), "utf8")) as {
  rows: number; bytes: number; sha256: string; sourceSha256: string; chunks: { ordinal: number; tileX: number; tileY: number; rows: number; sha256: string; bytes: number }[] };
if (packed.rows !== 432553 || packed.sha256 !== "2cec9468100070bc0f2b9819ffad4f601a8f135327c1e7c83989c276061f3ce1" ||
  packed.sourceSha256 !== "a924bf853ad6c9e4b1d26f8e3297dbe7fc3e84a40fba0b409b9c12c69bc6aa21") throw new Error("Pinned complete London inventory required.");
const ids = new Set<string>(), whole = createHash("sha256"); let count = 0;
for (const [i, c] of packed.chunks.entries()) {
  const bytes = await readFile(resolve(directory, `overture-chunk-${String(i).padStart(4, "0")}.json`));
  if (c.ordinal !== i || c.bytes !== bytes.length || digest(bytes) !== c.sha256) throw new Error("Chunk checksum mismatch.");
  const rows = validatePlaceChunk(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)));
  if (rows.length !== c.rows || rows.some(r => Math.floor(r[5] * 100) !== c.tileX || Math.floor(r[6] * 100) !== c.tileY)) throw new Error("Spatial tile binding failed.");
  for (const r of rows) { if (ids.has(r[0])) throw new Error("Duplicate native ID."); ids.add(r[0]); }
  count += rows.length; whole.update(bytes);
}
if (count !== packed.rows || whole.digest("hex") !== packed.sha256) throw new Error("Full inventory checksum mismatch.");
const source = JSON.parse(await readFile(resolve(directory, "overture-london-native.manifest.json"), "utf8")) as { retrievedAt: string };
const permit = { allowed: true, maxDays: null, condition: "Permitted dated normalised attributes with native per-record licences and source-specific notices." };
const manifest = { provider: "overture", dataset: "places", version: "2026-09-23.1-london-compact1", subset: "london", sha256: packed.sha256,
  sourceUrl: "https://overturemaps.org/download/", retrievedAt: source.retrievedAt, publishedAt: null, effectiveAt: null,
  sourceRelease: "2026-09-23.1", sourceSchema: "2.0.0", geographyReleaseId: "248a9600-59cb-4fbe-9791-d64f9cb28aa1",
  sourceSha256: packed.sourceSha256, rows: count, format: 1, chunks: packed.chunks, duplicateNativeIds: 0,
  licence: { policyId: "overture-places", version: 1, reviewedAt: "2026-10-07T00:00:00Z", termsUrl: "https://docs.overturemaps.org/attribution/",
    raw: { allowed: false, maxDays: 0, condition: "Discard temporary source extraction after admitted normalisation." },
    normalised: permit, derived: permit, references: permit, timestamps: permit, cacheSeconds: 0, rawDisposition: "discarded",
    attribution: ["Overture Maps Foundation, overturemaps.org; source-specific CDLA Permissive 2.0, CC0 1.0 and Apache 2.0 licences retained per record.",
      "Foursquare data copyright 2024 Foursquare Labs, Inc.; transformed to Overture schema. See retained source notice reference."],
    noticeReferences: ["https://docs.overturemaps.org/attribution/", "https://opensource.foursquare.com/places-notice-txt/", "https://www.apache.org/licenses/LICENSE-2.0", "https://cdla.dev/permissive-2-0/"] },
  quality: { inventoryCompleteness: "unknown", categoryMissing: 32254, permanentlyClosedRecords: 3,
    sourceConfidenceMeaning: "Native existence estimate; not evidence strength or measured category/completeness accuracy.", entityDuplicateQa: "pending" },
  importerVersion: "overture-compact1", activated: false };
await writeFile(resolve(directory, "overture-admission-manifest.json"), JSON.stringify(manifest));
console.log(JSON.stringify({ fullValidatedRecords: count, chunks: packed.chunks.length, bytes: packed.bytes, sha256: packed.sha256, activated: false }));
