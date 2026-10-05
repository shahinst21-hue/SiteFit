import { test } from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import { csv, statistics, geographyRows, verifyJoin, londonLookup } from "../scripts/data/london-import.ts";
test("CSV quoting and exact TS001 London join reject malformed, duplicate and missing source rows", () => {
  assert.deepEqual(csv('"a,b","a""b"\r\n1,2\n'), [["a,b", 'a"b'], ["1", "2"]]);
  assert.throws(() => csv('"unfinished')); assert.throws(() => csv('"x"junk,2'));
  const header = '"date","geography","geography code","Residence type: Total; measures: Value","Residence type: Lives in a household; measures: Value","Residence type: Lives in a communal establishment; measures: Value"\n';
  const archive = (rows: string) => zipSync({ "census2021-ts001-oa.csv": strToU8(header + rows) });
  const map = new Map([["E00100001", "E09000001"]]);
  assert.deepEqual(statistics(archive('"2021","E00100001","E00100001",0,0,0\n"2021","E00100002","E00100002",80,80,0\n'), map), [{ code: "E00100001", count: 0, missingReason: null }]);
  assert.throws(() => statistics(archive('"2021","E00100001","E00100001",,0,0\n'), map));
  assert.throws(() => statistics(archive('"2021","E00100001","E00100001",1,1,0\n'.repeat(2)), map));
  assert.throws(() => statistics(archive('"2021","E00100002","E00100002",1,1,0\n'), map));
});
test("London lookup requires all 33 official-authority assignments and rejects leakage/duplicates", () => {
  const boroughs = Array.from({ length: 33 }, (_, i) => ({ LAD21CD: `E090000${String(i + 1).padStart(2, "0")}`, RGN21CD: "E12000007" }));
  // Synthetic OA assignments, not a real national lookup fixture.
  const rows = boroughs.map((b, i) => ({ OA21CD: `E00100${String(i + 1).padStart(3, "0")}`, LAD22CD: b.LAD21CD }));
  assert.equal(londonLookup(boroughs, rows).size, 33);
  assert.throws(() => londonLookup(boroughs, rows.slice(1)));
  assert.throws(() => londonLookup(boroughs, [...rows, rows[0]]));
  assert.throws(() => londonLookup(boroughs, [...rows.slice(1), { OA21CD: "E00199999", LAD22CD: "E08000001" }]));
  assert.throws(() => londonLookup([{ ...boroughs[0], RGN21CD: "E12000008" }, ...boroughs.slice(1)], rows));
});
test("boundary CRS and complete code joins are checked before any staging or activation", () => {
  const map = new Map([["E00100001", "E09000001"]]);
  const feature = { type: "FeatureCollection", features: [{ properties: { OA21CD: "E00100001" }, geometry: { type: "Polygon", coordinates: [[[-0.1,51.5],[0,51.5],[0,51.6],[-0.1,51.5]]] } }] };
  assert.equal(geographyRows(feature, map)[0].parent, "E09000001");
  assert.throws(() => geographyRows({ ...feature, crs: "EPSG:27700" }, map));
  const bad = structuredClone(feature); bad.features[0].geometry.coordinates[0][0] = [530000, 180000]; assert.throws(() => geographyRows(bad, map));
  assert.throws(() => verifyJoin(geographyRows(feature, map), [], map));
});
