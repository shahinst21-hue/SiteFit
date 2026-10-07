import { unzipSync, strFromU8 } from "fflate";
import columns from "../../lib/data/census-columns.json" with { type: "json" };
import { csv, digest } from "./london-import.ts";

export type CensusDataset = keyof typeof columns;
export type CensusProfile = { code: string; values: (number | null)[]; missingReasons: (string | null)[] };
export const censusSemantics = {
  TS007A: { unit: "persons", universe: "usual_residents" },
  TS003: { unit: "households", universe: "households" },
  TS045: { unit: "households", universe: "households" },
  TS066: { unit: "persons", universe: "residents_16_plus" },
} as const;
function invalid(): never { throw new Error("Census enrichment admission failed; release must remain inactive."); }

/** Native OA profiles retain the original published category hierarchy; no scoring or age-band interpolation. */
export function censusProfiles(archive: Uint8Array, dataset: CensusDataset, londonCodes: Set<string>, verifyArchive = true) {
  if (!Object.hasOwn(columns, dataset) || !londonCodes.size || londonCodes.size > 40_000 || [...londonCodes].some(c => !/^E00\d{6}$/.test(c)) || archive.length > 30_000_000) invalid();
  const contract = columns[dataset];
  if (verifyArchive && digest(archive) !== contract.archiveSha256) invalid();
  const entry = `census2021-${dataset.toLowerCase()}-oa.csv`;
  const files = unzipSync(archive, { filter: item => item.name === entry && item.originalSize <= 160_000_000 });
  if (!files[entry] || files[entry].length > 160_000_000) invalid();
  const rows = csv(strFromU8(files[entry]).replace(/^\uFEFF/, ""));
  if (JSON.stringify(rows.shift()) !== JSON.stringify(["date", "geography", "geography code", ...contract.columns])) invalid();
  if (rows.length > 220_000) invalid();
  const seen = new Set<string>(); const profiles: CensusProfile[] = [];
  for (const row of rows) {
    if (row.length !== contract.columns.length + 3 || row[0] !== "2021" || !/^[EW]00\d{6}$/.test(row[2]) || seen.has(row[2])) invalid();
    seen.add(row[2]);
    if (!londonCodes.has(row[2])) continue;
    const values = row.slice(3).map(v => {
      if (v === "") return null;
      if (!/^\d+$/.test(v) || !Number.isSafeInteger(Number(v))) invalid();
      return Number(v);
    });
    profiles.push({ code: row[2], values, missingReasons: values.map(v => v === null ? "source_blank" : null) });
  }
  if (profiles.length !== londonCodes.size) invalid();
  profiles.sort((a, b) => a.code.localeCompare(b.code));
  return { dataset, columns: [...contract.columns], ...censusSemantics[dataset],
    referencePeriod: "2021-03-21", archiveSha256: digest(archive), sha256: digest(JSON.stringify(profiles)),
    disclosureControl: "ONS targeted record swapping and cell-key perturbation; category and cross-table counts may not reconcile exactly.",
    profiles, missingCells: profiles.reduce((n, r) => n + r.values.filter(v => v === null).length, 0) };
}
