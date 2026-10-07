import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeOsChunk, lookupOsChunk, validateOsChunk, type OsRecord } from "../lib/data/os-uprn.ts";

const a: OsRecord = { uprn: "128051286", eastingCentimetres: 51900023, northingCentimetres: 16900001,
  latitudeE7: 514138289, longitudeE7: -2869818 };
const b: OsRecord = { uprn: "10008292401", eastingCentimetres: 53455100, northingCentimetres: 18384300,
  latitudeE7: 515374622, longitudeE7: -613296 };

test("compact OS preserves exact signed coordinates, sub-metre XY and identifier boundaries", () => {
  const bytes = encodeOsChunk([a, b]);
  assert.equal(bytes.length, 48);
  assert.deepEqual(validateOsChunk(bytes), { rows: 2, first: a.uprn, last: b.uprn });
  assert.deepEqual(lookupOsChunk(bytes, a.uprn), a);
  assert.deepEqual(lookupOsChunk(bytes, b.uprn), b);
  for (const id of ["1", "128051287", "999999999999"]) assert.equal(lookupOsChunk(bytes, id), null);
  const padded = new Uint8Array(60); padded.set(bytes, 6);
  assert.deepEqual(lookupOsChunk(padded.subarray(6, 54), b.uprn), b);
});

test("compact OS rejects truncation, duplicates, invalid units, bounds and oversized artifacts", () => {
  for (const rows of [[], [b, a], [a, a], [{ ...a, uprn: "012" }], [{ ...a, uprn: "1000000000000" }],
    [{ ...a, eastingCentimetres: 1.5 }], [{ ...a, latitudeE7: 900000001 }], Array(20001).fill(a)])
    assert.throws(() => encodeOsChunk(rows));
  for (const bytes of [new Uint8Array(), new Uint8Array(23), new Uint8Array(480024)])
    assert.throws(() => validateOsChunk(bytes));
  const bytes = encodeOsChunk([a, b]);
  bytes.set(bytes.subarray(0, 24), 24);
  assert.throws(() => lookupOsChunk(bytes, a.uprn));
  assert.throws(() => lookupOsChunk(encodeOsChunk([a]), "1e8"));
});

test("compact OS finds interior records across a full bounded chunk without rounding", () => {
  const records = Array.from({ length: 20000 }, (_, i) => ({ ...a, uprn: String(5000001 + i),
    eastingCentimetres: a.eastingCentimetres + i, longitudeE7: a.longitudeE7 - i }));
  const bytes = encodeOsChunk(records);
  assert.equal(bytes.length, 480000);
  for (const i of [0, 1, 7919, 10000, 19998, 19999]) assert.deepEqual(lookupOsChunk(bytes, records[i].uprn), records[i]);
  const corrupt = bytes.slice();
  new DataView(corrupt.buffer).setInt32(16, 900000001);
  assert.throws(() => validateOsChunk(corrupt));
});
