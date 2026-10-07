import { test } from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import columns from "../lib/data/census-columns.json" with { type: "json" };
import { censusProfiles, type CensusDataset } from "../scripts/data/census-enrichment.ts";
const code = "E00100001";
function archive(dataset: CensusDataset, mutate: (rows: string[][]) => void = () => {}) {
  const header = ["date", "geography", "geography code", ...columns[dataset].columns];
  const rows = [header, ["2021", "Synthetic OA", code, ...columns[dataset].columns.map((_, i) => i === 1 ? "" : String(i))]];
  mutate(rows);
  return zipSync({ [`census2021-${dataset.toLowerCase()}-oa.csv`]: strToU8(rows.map(r => r.map(v => `"${v.replaceAll('"', '""')}"`).join(",")).join("\n")) });
}
test("native Census profiles preserve actual bands, hierarchical categories, units, observed zero and missing cells", () => {
  for (const dataset of ["TS007A", "TS003", "TS045", "TS066"] as const) {
    const r = censusProfiles(archive(dataset), dataset, new Set([code]), false);
    assert.deepEqual(r.columns, columns[dataset].columns); assert.equal(r.profiles[0].values[0], 0);
    assert.equal(r.profiles[0].values[1], null); assert.equal(r.missingCells, 1);
    assert.equal(r.profiles[0].missingReasons[1], "source_blank");
    assert.equal(r.unit, dataset === "TS003" || dataset === "TS045" ? "households" : "persons");
    assert.match(r.sha256, /^[a-f0-9]{64}$/); assert.equal("workingAge16to64" in r, false);
  }
});
test("wrong artifact/schema/vintage/duplicate/missing OA or invented fractional counts cannot activate a release", () => {
  const codes = new Set([code]);
  assert.throws(() => censusProfiles(archive("TS007A"), "TS007A", codes));
  for (const mutate of [
    (r: string[][]) => { r[0][3] = "wrong denominator"; },
    (r: string[][]) => { r[1][0] = "2026"; },
    (r: string[][]) => { r.push([...r[1]]); },
    (r: string[][]) => { r[1][3] = "1.5"; },
    (r: string[][]) => { r[1][2] = "E00100002"; },
  ]) assert.throws(() => censusProfiles(archive("TS007A", mutate), "TS007A", codes, false));
});
