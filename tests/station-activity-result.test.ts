import test from "node:test";
import assert from "node:assert/strict";
import { joinedStationActivity, stationMappingRelease, stationMappingVersion } from "../lib/data/station-mapping.ts";
import { validateStationActivityResult } from "../lib/data/station-activity-result.ts";
import { ids } from "./fixtures/data/framework.ts";
const clock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}${String(minutes % 60).padStart(2, "0")}`;
function fixture() {
  const profile = {schemaVersion: 1, year: 2025, dayType: "TWT", measure: "gateline_entries", station: {nlc: 6966, asc: "LOFr", name: "London Fields", fareZone: "2"},
    trafficDayStartMinutes: 300, quarterHourIds: Array.from({length: 96}, (_, i) => i + 21),
    periodLabels: Array.from({length: 96}, (_, i) => `${clock((300 + i * 15) % 1440)}-${clock((315 + i * 15) % 1440)}`),
    values: Array(96).fill(0), missingReasons: Array(96).fill(null), publishedTotals: [0, null, null, null, null, null, null],
    workbookProducedAt: "2026-07-01 00:00:00", sourceSheet: "Station_Entries", sourceRow: 4, sourceKind: "modelled", units: "typical_day_gateline_passenger_movements"};
  const activity = joinedStationActivity({id: "910GLONFLDS", name: "London Fields Rail Station", originalMode: "overground", mode: "rail", point: null},
    stationMappingRelease, [profile, {...profile, measure: "gateline_exits", sourceSheet: "Station_Exits"}])!;
  return {schemaVersion: 1, kind: "station_activity", parent: {snapshotId: ids.input, checksum: "a".repeat(64)},
    releaseId: stationMappingRelease, mappingVersion: stationMappingVersion, dayType: "TWT", stations: [{id: "910GLONFLDS", activity}],
    failures: [], registerComplete: false, omittedIds: ["unreviewed-station"], truncatedReviewedIds: [] as string[], entranceConfirmed: false};
}
test("station activity keeps native day/mapping/missing coverage and never admits customers, pedestrian counts or entrance claims", () => {
  const raw = fixture(), result = validateStationActivityResult(raw);
  assert.equal(result.stations[0].activity.customerCount, null); assert.equal(result.registerComplete, false);
  result.stations[0].activity.profiles[0].values[0] = 1; assert.equal(raw.stations[0].activity.profiles[0].values[0], 0);
  for (const value of [{...raw, entranceConfirmed: true}, {...raw, dayType: "MON"}, {...raw, releaseId: ids.release},
    {...raw, omittedIds: ["910GLONFLDS"]}, {...raw, stations: [{...raw.stations[0], activity: {...raw.stations[0].activity, customerCount: 100}}]},
    {...raw, stations: [{...raw.stations[0], activity: {...raw.stations[0].activity, mapping: {...raw.stations[0].activity.mapping, entranceConfirmed: true}}}]}]) {
    assert.throws(() => validateStationActivityResult(value));
  }
  // PostgreSQL JSONB object-key order is not analytical content.
  const reordered = Object.fromEntries(Object.entries(raw.stations[0].activity).reverse());
  assert.deepEqual(validateStationActivityResult({...raw, stations: [{...raw.stations[0], activity: reordered}]}), raw);
});
