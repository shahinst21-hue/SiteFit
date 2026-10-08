import { object, uuid } from "./validation.ts";
import { SourceError } from "./errors.ts";
import { joinedStationActivity, stationMappingVersion } from "./station-mapping.ts";
import { errorCodes, type SafeSourceError, type TransportAccessPoints } from "./contracts.ts";

export type StationActivityResult = {schemaVersion: 1; kind: "station_activity";
  parent: {snapshotId: string; checksum: string}; releaseId: string; mappingVersion: string; dayType: "TWT";
  stations: {id: string; activity: NonNullable<ReturnType<typeof joinedStationActivity>>}[];
  failures: {id: string; reason: "native_profiles_missing" | "native_read_failed"; error: SafeSourceError | null}[];
  registerComplete: boolean; omittedIds: string[]; truncatedReviewedIds: string[]; entranceConfirmed: false};
function demand(v: unknown): asserts v { if (!v) throw new SourceError("invalid_response"); }
const keys = (v: Record<string, unknown>, names: string) => {const k = names.split(" "); demand(Object.keys(v).length === k.length && k.every(n => n in v));};
/** Revalidate the exact native joins; this cannot infer activity for an unreviewed station. */
export function validateStationActivityResult(value: unknown): StationActivityResult {
  const r = object(value), parent = object(r.parent);
  keys(r, "schemaVersion kind parent releaseId mappingVersion dayType stations failures registerComplete omittedIds truncatedReviewedIds entranceConfirmed");
  keys(parent, "snapshotId checksum");
  demand(r.schemaVersion === 1 && r.kind === "station_activity" && uuid(parent.snapshotId) && /^[a-f0-9]{64}$/.test(String(parent.checksum)) &&
    uuid(r.releaseId) && r.mappingVersion === stationMappingVersion && r.dayType === "TWT" && r.entranceConfirmed === false &&
    typeof r.registerComplete === "boolean" && Array.isArray(r.stations) && r.stations.length > 0 && r.stations.length <= 8);
  for (const key of ["omittedIds", "truncatedReviewedIds"] as const) demand(Array.isArray(r[key]) && r[key].length <= 300 &&
    r[key].every(v => typeof v === "string" && /^[A-Za-z0-9:_-]{1,120}$/.test(v)) && new Set(r[key]).size === r[key].length);
  const seen = new Set<string>();
  for (const value of r.stations) {
    const station = object(value), activity = object(station.activity), mapping = object(activity.mapping);
    keys(station, "id activity"); keys(activity, "mapping dayType profiles basis customerCount measuredPedestrianFootfall");
    demand(typeof station.id === "string" && !seen.has(station.id) && station.id === mapping.stopId && Array.isArray(activity.profiles)); seen.add(station.id);
    const stop: TransportAccessPoints["items"][number] = {id: station.id, name: String(mapping.stopName), originalMode: "overground", mode: "rail", point: null};
    const expected = joinedStationActivity(stop, r.releaseId as string, activity.profiles);
    demand(expected && expected.dayType === r.dayType && activity.dayType === expected.dayType && activity.basis === expected.basis &&
      activity.customerCount === null && activity.measuredPedestrianFootfall === null &&
      Object.keys(mapping).length === Object.keys(expected.mapping).length &&
      Object.entries(expected.mapping).every(([key, expectedValue]) => mapping[key] === expectedValue));
  }
  demand(Array.isArray(r.failures) && r.failures.length <= 8);
  for (const value of r.failures) {
    const f = object(value); keys(f, "id reason error");
    demand(typeof f.id === "string" && /^[A-Za-z0-9:_-]{1,120}$/.test(f.id) && !seen.has(f.id)); seen.add(f.id);
    if (f.reason === "native_profiles_missing") demand(f.error === null);
    else {
      demand(f.reason === "native_read_failed"); const e = object(f.error); keys(e, "code retryable status");
      demand(errorCodes.includes(e.code as typeof errorCodes[number]) && typeof e.retryable === "boolean" &&
        (e.status === null || Number.isSafeInteger(e.status) && Number(e.status) >= 100 && Number(e.status) <= 599));
    }
  }
  demand(r.stations.length + r.failures.length <= 8);
  const allIds = [...seen, ...(r.omittedIds as string[]), ...(r.truncatedReviewedIds as string[])];
  demand(allIds.length <= 300 && new Set(allIds).size === allIds.length);
  return structuredClone(value) as StationActivityResult;
}
