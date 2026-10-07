import { readFile, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { validateOsChunk, lookupOsChunk } from "../../lib/data/os-uprn.ts";
import { digest } from "./london-import.ts";

const root = resolve("supabase/.temp"), directory = resolve(process.argv[2] ?? "supabase/.temp/phase8-implementation");
if (!directory.startsWith(root + sep)) throw new Error("Ignored artifact directory required.");
const manifest = JSON.parse(await readFile(resolve(directory, "os-compact-measurement.json"), "utf8")) as {
  rows: number; sha256: string; chunkManifest: { rows: number; sha256: string }[] };
if (manifest.rows !== 5317412 || manifest.chunkManifest.length !== 532 ||
  manifest.sha256 !== "edbbb860d1a17fb68c61dc8e82efd9a460ef91c3d54eb5a3421010338ff4d491") throw new Error("Pinned complete release required.");
const expected: { ordinal: number; expected: Record<string, string | number> }[] = [];
const selected = new Set(["128051286", "10008292401"]);
for (let ordinal = 0; ordinal < manifest.chunkManifest.length; ordinal++) {
  const b = await readFile(resolve(directory, `os-chunk-${String(ordinal).padStart(3, "0")}.bin`));
  const metadata = validateOsChunk(b);
  if (metadata.rows !== manifest.chunkManifest[ordinal].rows || digest(b) !== manifest.chunkManifest[ordinal].sha256) throw new Error("QA source differs.");
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  for (const i of [0, Math.floor(metadata.rows / 2), metadata.rows - 1]) {
    const o = i * 24;
    expected.push({ ordinal, expected: { uprn: v.getBigUint64(o).toString(), eastingCentimetres: v.getInt32(o + 8),
      northingCentimetres: v.getInt32(o + 12), latitudeE7: v.getInt32(o + 16), longitudeE7: v.getInt32(o + 20) } });
  }
  for (const id of [...selected]) {
    const r = lookupOsChunk(b, id);
    if (r) { expected.push({ ordinal, expected: r }); selected.delete(id); }
  }
}
if (selected.size) throw new Error("Required selected property UPRNs absent.");
await writeFile(resolve(directory, "os-lookup-expected.json"), JSON.stringify(expected));
console.log(JSON.stringify({ independentlyDecodedLookups: expected.length, fullChunkCoverage: manifest.chunkManifest.length, selectedPropertyProofs: 2, activation: false }));
