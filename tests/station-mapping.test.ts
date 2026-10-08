import { test } from "node:test";
import assert from "node:assert/strict";
import { joinedStationActivity, mappedNativeStation, stationMappingRelease } from "../lib/data/station-mapping.ts";
import { stationActivityRepository } from "../lib/data/station-activity-repository.ts";
const stop = { id: "910GLONFLDS", name: "London Fields Rail Station", originalMode: "national-rail,overground", mode: "other" as const, point: null };
test("station crosswalk is exact, native-release pinned and separates station identity from entrance", () => {
  const mapping = mappedNativeStation(stop, stationMappingRelease)!;
  assert.equal(mapping.asc, "LOFr"); assert.equal(mapping.nlc, 6966);
  assert.equal(mapping.method, "explicit_reviewed_crosswalk"); assert.equal(mapping.entranceConfirmed, false);
  for (const candidate of [{ ...stop, id: "9100LONFLDS1" }, { ...stop, id: "4900LONFLDS1" }, { ...stop, name: "London Fields" }, { ...stop, originalMode: "bus" }, { ...stop, id: "910GKNGSTON", name: "Kingston Rail Station" }]) assert.equal(mappedNativeStation(candidate, stationMappingRelease), null);
  assert.equal(mappedNativeStation(stop, "other-release"), null);
});
test("native activity requires both distinct measures, original NLC/ASC/name and one day type", async () => {
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
  let reads = 0;
  const repository = stationActivityRepository(stationMappingRelease, {read: async (release, asc, day) => {
    reads++; assert.equal(release, stationMappingRelease); assert.equal(asc, "LOFr"); assert.equal(day, "TWT"); return [profile, exit];
  }});
  const stored = await repository.activity(stop, "TWT");
  assert.equal(stored.state, "available"); assert.equal(stored.activity?.customerCount, null);
  const unmapped = await repository.activity({...stop, id: "910GKNGSTON"}, "TWT");
  assert.equal(unmapped.reason, "station_mapping_unreviewed"); assert.equal(reads, 1);
  await assert.rejects(() => stationActivityRepository(stationMappingRelease, {read: async () => [profile, {...exit, dayType: "MON"}]}).activity(stop, "TWT"));
  assert.equal((await stationActivityRepository(stationMappingRelease, {read: async () => null}).activity(stop, "TWT")).reason, "native_profiles_missing");
  const abort = new AbortController(); abort.abort();
  await assert.rejects(() => repository.activity(stop, "TWT", abort.signal)); assert.equal(reads, 1);
});
