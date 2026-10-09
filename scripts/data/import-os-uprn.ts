import nextEnv from "@next/env";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, sep } from "node:path";
import { frameworkClient } from "../../lib/data/server-client.ts";
import { validateOsChunk } from "../../lib/data/os-uprn.ts";
import type { Json } from "../../lib/supabase/database.types.ts";

nextEnv.loadEnvConfig(process.cwd(), true);
let stage = "development_guard";
try {
  const root = resolve("supabase/.temp"), directory = resolve(process.argv[2] ?? "supabase/.temp/phase8-implementation");
  if (process.env.DATA_SOURCE_PROBES_ENABLED !== "true" || new URL(process.env.SUPABASE_URL ?? "").hostname !== "idlsjusbrmyucccostxt.supabase.co" ||
    !directory.startsWith(root + sep)) throw new Error("Development guard required.");
  const packed = JSON.parse(await readFile(resolve(directory, "os-compact-measurement.json"), "utf8")) as {
    rows: number; bytes: number; sha256: string; chunkManifest: { first: number; last: number; rows: number; sha256: string }[] };
  const source = JSON.parse(await readFile(resolve(directory, "os-uprn-download-manifest.json"), "utf8")) as { sha256: string; retrievedAt: string; sourceUrl: string };
  const subset = JSON.parse(await readFile(resolve(directory, "os-uprn-london-manifest.json"), "utf8")) as { sha256: string; geographyReleaseId: string };
  // One reviewed release, not an arbitrary artifact import or inferred future licence.
  if (packed.rows !== 5317412 || packed.bytes !== 127617888 || packed.chunkManifest.length !== 532 ||
    packed.sha256 !== "edbbb860d1a17fb68c61dc8e82efd9a460ef91c3d54eb5a3421010338ff4d491" ||
    source.sha256 !== "107503d45bedaab7f74511766eedbd617f9ca3592113363711e94f4b6458d55a" ||
    source.sourceUrl !== "https://api.os.uk/downloads/v1/products/OpenUPRN/downloads" || !Number.isFinite(Date.parse(source.retrievedAt)) ||
    subset.sha256 !== "27c677c2381e42ff917248ab163b0a0154bf9ce0853b95c6ba9e8f3fe9db0d3c" ||
    subset.geographyReleaseId !== "248a9600-59cb-4fbe-9791-d64f9cb28aa1") throw new Error("Pinned source required.");
  const whole = createHash("sha256"); let rows = 0, previous = 0n;
  for (let i = 0; i < packed.chunkManifest.length; i++) {
    const b = await readFile(resolve(directory, `os-chunk-${String(i).padStart(3, "0")}.bin`));
    const checked = validateOsChunk(b), expected = packed.chunkManifest[i];
    if (checked.rows !== expected.rows || checked.first !== String(expected.first) || checked.last !== String(expected.last) ||
      BigInt(checked.first) <= previous || createHash("sha256").update(b).digest("hex") !== expected.sha256) throw new Error("Invalid OS chunk.");
    previous = BigInt(checked.last); rows += checked.rows; whole.update(b);
  }
  if (rows !== packed.rows || whole.digest("hex") !== packed.sha256) throw new Error("Full checksum failed.");
  const permit = { allowed: true, maxDays: null, condition: "Historical dated OS release with OGL attribution." };
  const manifest = { provider: "os", dataset: "open-uprn", version: "202609-extract20260814-london-compact1-batch10000", subset: "london",
    sha256: packed.sha256, sourceUrl: source.sourceUrl, retrievedAt: source.retrievedAt, publishedAt: null,
    effectiveAt: "2026-08-14T00:00:00Z", nativeExtractionDate: "2026-08-14", archiveSha256: source.sha256,
    londonCsvSha256: subset.sha256, geographyReleaseId: subset.geographyReleaseId, compactFormat: 1, recordBytes: 24,
    chunkRows: 20000, rows: packed.rows, chunks: packed.chunkManifest, pointPrecision: "address_building_not_entrance",
    importerVersion: "os-compact1-1", licence: { policyId: "os-open-uprn", version: 1, reviewedAt: "2026-10-07T00:00:00Z",
      termsUrl: "https://www.ordnancesurvey.co.uk/products/os-open-uprn", raw: { allowed: false, maxDays: 0, condition: "Temporary national archive only." },
      normalised: permit, derived: permit, references: permit, timestamps: permit,
      attribution: ["Contains Ordnance Survey data © Crown copyright and database right 2026."], cacheSeconds: 0, rawDisposition: "discarded" } };
  const client = frameworkClient(); stage = "staging";
  const result = await client.rpc("stage_sitefit_release", { p_manifest: manifest as unknown as Json }).abortSignal(AbortSignal.timeout(8000));
  if (result.error || !result.data || typeof result.data !== "object" || Array.isArray(result.data) || typeof result.data.id !== "string") throw new Error("Staging failed.");
  const id = result.data.id;
  for (let i = 0; i < packed.chunkManifest.length; i++) {
    stage = `chunk_${i}`;
    const b = await readFile(resolve(directory, `os-chunk-${String(i).padStart(3, "0")}.bin`));
    const started = Date.now();
    // Offline ingestion has a separate finite 45-second per-chunk budget; runtime remains unchanged.
    const inserted = await client.rpc("import_sitefit_os_chunk", { p_release_id: id, p_ordinal: i, p_hex: b.toString("hex") }).abortSignal(AbortSignal.timeout(45000));
    if (inserted.error) {
      const ownError = /^os_[a-z_]+$/.test(inserted.error.message) ? inserted.error.message : null;
      console.error(JSON.stringify({ status: inserted.status, code: /^[A-Z0-9]{5}$/.test(inserted.error.code) ? inserted.error.code : null, ownError }));
      throw new Error("Import failed; loading release retained.");
    }
    if (i % 25 === 0 || i === packed.chunkManifest.length - 1) console.log(JSON.stringify({ releaseId: id, completedChunks: i + 1, totalChunks: packed.chunkManifest.length, elapsedMs: Date.now() - started }));
  }
  console.log(JSON.stringify({ releaseId: id, rows, loaded: true, activated: false, next: "Full hosted integrity, actual storage and lookup QA required before activation." }));
} catch { console.error(`OS import failed at ${stage}; secret/provider bodies withheld; no automatic activation.`); process.exitCode = 1; }
