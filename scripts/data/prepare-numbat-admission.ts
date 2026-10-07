import { readFile, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { canonicalJSON } from "../../lib/analysis/canonical.ts";
import { validateNumbatProfile } from "../../lib/data/numbat.ts";
import { digest } from "./london-import.ts";

const directory = resolve(process.argv[2] ?? "supabase/.temp/phase8-implementation");
if (!directory.startsWith(resolve("supabase/.temp") + sep)) throw new Error("Ignored directory required.");
const decoded: unknown = JSON.parse(await readFile(resolve(directory, "numbat-normalised.json"), "utf8"));
if (!Array.isArray(decoded) || decoded.length !== 4710) throw new Error("Complete pinned NUMBAT required.");
const profiles = decoded.map(validateNumbatProfile);
const keys = profiles.map(p => `${p.dayType}:${p.station.asc}:${p.measure}`);
if (new Set(keys).size !== profiles.length || new Set(profiles.map(p => p.station.asc)).size !== 471) throw new Error("Duplicate/missing native station key.");
const permit = { allowed: true, maxDays: null, condition: "Dated normalised official rail statistics with TfL attribution and terms compliance." };
const archives = await Promise.all(["MON", "TWT", "FRI", "SAT", "SUN"].map(async day => {
  const m = JSON.parse(await readFile(resolve(directory, `NBT25${day}_manifest.json`), "utf8")) as { sourceUrl: string; sha256: string; retrievedAt: string | null; verifiedAt?: string };
  if (digest(await readFile(resolve(directory, `NBT25${day}_Outputs.xlsx`))) !== m.sha256) throw new Error("Artifact hash mismatch.");
  return { dayType: day, ...m };
}));
const manifest = { provider: "tfl", dataset: "NUMBAT2025", subset: "london", version: "2025-produced20260701-station-native1-five-days",
  sha256: digest(canonicalJSON(profiles)), rows: profiles.length, stationCount: 471, archives,
  sourceUrl: "https://crowding.data.tfl.gov.uk/", retrievedAt: new Date().toISOString(), publishedAt: null, effectiveAt: null,
  retrievalMeaning: "Normalisation verification; per-artifact retrieval timestamps are retained separately.",
  coverage: "TfL-managed rail network includes stations outside London; owned analysis eligibility remains London only.",
  referenceYear: 2025, sourceKind: "modelled", quarterHours: 96, trafficDay: "05:00 through next-day 04:59", profileSchemaVersion: 1,
  licence: { policyId: "tfl-numbat", version: 1, reviewedAt: "2026-10-07T00:00:00Z",
    termsUrl: "https://tfl.gov.uk/corporate/terms-and-conditions/transport-data-service",
    raw: { allowed: false, maxDays: 0, condition: "Temporary official workbooks discarded after admitted normalisation." },
    normalised: permit, derived: permit, references: permit, timestamps: permit, attribution: ["Powered by TfL Open Data"], cacheSeconds: 0, rawDisposition: "discarded" },
  limitations: ["Typical autumn day, not annual demand or pedestrian footfall.", "TWT is a Tuesday–Thursday average, not three additive observations.", "Kingston and other non-TfL National Rail activity may be unavailable; no automatic annual fallback."], importerVersion: "numbat-stations-native1" };
await writeFile(resolve(directory, "numbat-admission.json"), JSON.stringify({ manifest, rows: profiles }));
console.log(JSON.stringify({ profiles: profiles.length, stations: 471, sha256: manifest.sha256, activated: false }));
