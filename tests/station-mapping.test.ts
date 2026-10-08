import { test } from "node:test";
import assert from "node:assert/strict";
import { joinedStationActivity, mappedNativeStation, stationMappingRelease } from "../lib/data/station-mapping.ts";
const stop = { id: "910GLONFLDS", name: "London Fields Rail Station", originalMode: "national-rail,overground", mode: "other" as const, point: null };
test("station crosswalk is exact, native-release pinned and separates station identity from entrance", () => {
  const mapping = mappedNativeStation(stop, stationMappingRelease)!;
  assert.equal(mapping.asc, "LOFr"); assert.equal(mapping.nlc, 6966);
  assert.equal(mapping.method, "explicit_reviewed_crosswalk"); assert.equal(mapping.entranceConfirmed, false);
  for (const candidate of [{ ...stop, id: "9100LONFLDS1" }, { ...stop, id: "4900LONFLDS1" }, { ...stop, name: "London Fields" }, { ...stop, originalMode: "bus" }, { ...stop, id: "910GKNGSTON", name: "Kingston Rail Station" }]) assert.equal(mappedNativeStation(candidate, stationMappingRelease), null);
  assert.equal(mappedNativeStation(stop, "other-release"), null);
});
test("native activity requires both distinct measures, original NLC/ASC/name and one day type", () => {
  const clock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}${String(minutes % 60).padStart(2, "0")}`;
  const profile = { schemaVersion: 1, year: 2025, dayType: "TWT", measure: "gateline_entries",
    station: { nlc: 6966, asc: "LOFr", name: "London Fields", fareZone: "2" }, trafficDayStartMinutes: 300,
    quarterHourIds: Array.from({ length: 96 }, (_, i) => i + 21),
    periodLabels: Array.from({ length: 96 }, (_, i) => `${clock((300 + i * 15) % 1440)}-${clock((315 + i * 15) % 1440)}`),
    values: Array(96).fill(0), missingReasons: Array(96).fill(null), publishedTotals: [0, null, null, null, null, null, null],
    workbookProducedAt: "2026-07-01 00:00:00", sourceSheet: "Station_Entries", sourceRow: 4, sourceKind: "modelled", units: "typical_day_gateline_passenger_movements" };
  const exit = { ...profile, measure: "gateline_exits", sourceSheet: "Station_Exits" };
  const result = joinedStationActivity(stop, stationMappingRelease, [profile, exit])!;
  assert.equal(result.dayType, "TWT"); assert.equal(result.customerCount, null); assert.equal(result.measuredPedestrianFootfall, null);
  assert.equal(result.profiles[0].values[0], 0);
  assert.equal(joinedStationActivity(stop, stationMappingRelease, [profile, profile]), null);
  assert.equal(joinedStationActivity(stop, stationMappingRelease, [profile, { ...exit, dayType: "MON" }]), null);
  assert.equal(joinedStationActivity(stop, stationMappingRelease, [profile, { ...exit, station: { ...exit.station, nlc: 1 } }]), null);
});
