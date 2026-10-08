import "server-only";
import type { TransportAccessPoints } from "./contracts.ts";
import { frameworkClient } from "./server-client.ts";
import { SourceError } from "./errors.ts";
import { uuid } from "./validation.ts";
import { joinedStationActivity, mappedNativeStation, stationMappingVersion } from "./station-mapping.ts";

type Stop = TransportAccessPoints["items"][number];
type Read = (releaseId: string, asc: string, dayType: string, signal: AbortSignal) => Promise<unknown>;

/** Native typical-day profiles require an explicit reviewed identity crosswalk.
 * Missing coverage never falls back to a nearby station, another day or year. */
export function stationActivityRepository(releaseId: string, options: {read?: Read} = {}) {
  if (!uuid(releaseId)) throw new SourceError("invalid_request");
  const read: Read = options.read ?? (async (release, asc, day, signal) => {
    const {data, error} = await frameworkClient().rpc("lookup_sitefit_station_activity", {
      p_release_id: release, p_station_asc: asc, p_day_type: day,
    }).abortSignal(signal);
    if (error) throw new SourceError("provider_unavailable");
    return data;
  });
  return {async activity(stop: Stop, dayType: "MON" | "TWT" | "FRI" | "SAT" | "SUN", caller?: AbortSignal) {
    if (!["MON", "TWT", "FRI", "SAT", "SUN"].includes(dayType)) throw new SourceError("invalid_request");
    const mapping = mappedNativeStation(stop, releaseId);
    const provenance = {releaseId, mappingVersion: stationMappingVersion, requestedDayType: dayType};
    if (!mapping) return {...provenance, state: "unavailable" as const, reason: "station_mapping_unreviewed" as const, activity: null};
    const timeout = AbortSignal.timeout(8000), signal = caller ? AbortSignal.any([caller, timeout]) : timeout;
    if (signal.aborted) throw new SourceError("cancelled");
    try {
      const value = await read(releaseId, mapping.asc, dayType, signal);
      signal.throwIfAborted();
      if (value === null) return {...provenance, state: "unavailable" as const, reason: "native_profiles_missing" as const, activity: null};
      if (!Array.isArray(value) || value.length !== 2 || JSON.stringify(value).length > 50_000) throw new SourceError("invalid_response");
      const activity = joinedStationActivity(stop, releaseId, value);
      if (!activity || activity.dayType !== dayType) throw new SourceError("invalid_response");
      return {...provenance, state: "available" as const, reason: null, activity};
    } catch (error) {
      if (error instanceof SourceError) throw error;
      throw new SourceError(caller?.aborted ? "cancelled" : timeout.aborted ? "timeout" : "provider_unavailable");
    }
  }};
}
