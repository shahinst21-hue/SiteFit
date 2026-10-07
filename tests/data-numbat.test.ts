import test from "node:test";
import assert from "node:assert/strict";
import { validateNumbatProfile, type NumbatProfile } from "../lib/data/numbat.ts";

function fixture(): NumbatProfile {
  const time = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}${String(m % 60).padStart(2, "0")}`;
  return { schemaVersion: 1, year: 2025, dayType: "TWT", measure: "gateline_entries",
    station: { nlc: 750, asc: "ABRd", name: "Synthetic station", fareZone: "2/3" }, trafficDayStartMinutes: 300,
    quarterHourIds: Array.from({ length: 96 }, (_, i) => i + 21),
    periodLabels: Array.from({ length: 96 }, (_, i) => `${time((300 + i * 15) % 1440)}-${time((315 + i * 15) % 1440)}`),
    values: Array(96).fill(0.5), missingReasons: Array(96).fill(null), publishedTotals: [48, null, null, null, null, null, null],
    workbookProducedAt: "2026-07-01 00:00:00", sourceSheet: "Station_Entries", sourceRow: 4,
    sourceKind: "modelled", units: "typical_day_gateline_passenger_movements" };
}
test("NUMBAT preserves fractional typical-day counts, midnight traffic-day slots and native station identity", () => {
  const x = validateNumbatProfile(fixture());
  assert.equal(x.values[0], 0.5); assert.equal(x.periodLabels[76], "0000-0015");
  assert.equal(x.periodLabels[95], "0445-0500"); assert.equal(x.dayType, "TWT");
  assert.equal(x.station.asc, "ABRd");
});
test("NUMBAT source blanks remain distinct from zero and cannot silently enter a complete total", () => {
  const x = fixture(); x.values[0] = null; x.missingReasons[0] = "source_blank";
  assert.equal(validateNumbatProfile(x).values[0], null);
  x.missingReasons[0] = null; assert.throws(() => validateNumbatProfile(x));
  const zero = fixture(); zero.values[0] = 0; zero.publishedTotals[0] = 47.5;
  assert.equal(validateNumbatProfile(zero).values[0], 0);
});
test("NUMBAT rejects shifted periods, inconsistent totals, flow/boarder semantics and fabricated annual or footfall units", () => {
  const x = fixture();
  for (const changed of [{ ...x, year: 2026 }, { ...x, units: "footfall" }, { ...x, measure: "station_boarders" },
    { ...x, sourceSheet: "Station_Exits" }, { ...x, publishedTotals: [49, null, null, null, null, null, null] },
    { ...x, quarterHourIds: x.quarterHourIds.map(v => v - 1) }]) assert.throws(() => validateNumbatProfile(changed));
});
