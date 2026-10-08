import "server-only";
import { validateNumbatProfile, type NumbatProfile } from "./numbat.ts";
import type { TransportAccessPoints } from "./contracts.ts";

export const stationMappingVersion = "tfl-numbat-reviewed-20261007-1";
export const stationMappingRelease = "4f0ccc73-3f4c-4300-82f9-f53e21d3d4a7";
/** Explicit reviewed crosswalk, not a common identifier supplied by TfL API.
 * Two unambiguous current TfL station identities corroborate the original 2025
 * native catalogue. Other stations require their own review, never fuzzy/nearest
 * name matching or guessed NLCs. Platform and bus children are not these IDs. */
const mappings = [
  { stopId: "910GLONFLDS", stopName: "London Fields Rail Station", asc: "LOFr", nlc: 6966, nativeName: "London Fields",
    sourceReference: "https://tfl.gov.uk/hub/stop/910GLONFLDS/london-fields-rail-station/" },
  { stopId: "910GCAMHTH", stopName: "Cambridge Heath (London) Rail Station", asc: "CBHr", nlc: 6962, nativeName: "Cambridge Heath",
    sourceReference: "https://tfl.gov.uk/hub/stop/910GCAMHTH/cambridge-heath-london-rail-station/" },
] as const;

export function mappedNativeStation(stop: TransportAccessPoints["items"][number], releaseId: string) {
  if (releaseId !== stationMappingRelease || !stop.originalMode.split(",").some(m => ["overground", "national-rail"].includes(m))) return null;
  const mapping = mappings.find(m => m.stopId === stop.id);
  if (!mapping || mapping.stopName !== stop.name) return null;
  return { ...mapping, mappingVersion: stationMappingVersion, nativeReleaseId: releaseId,
    method: "explicit_reviewed_crosswalk" as const, reviewedAt: "2026-10-07T21:27:02.387Z",
    entranceConfirmed: false as const };
}

export function joinedStationActivity(stop: TransportAccessPoints["items"][number], releaseId: string, values: unknown[]) {
  const mapping = mappedNativeStation(stop, releaseId);
  if (!mapping || values.length !== 2) return null;
  const profiles: NumbatProfile[] = values.map(validateNumbatProfile);
  if (profiles.some(p => p.station.asc !== mapping.asc || p.station.nlc !== mapping.nlc || p.station.name !== mapping.nativeName) ||
    profiles[0].dayType !== profiles[1].dayType || new Set(profiles.map(p => p.measure)).size !== 2) return null;
  return { mapping, dayType: profiles[0].dayType, profiles,
    basis: "modelled_typical_day_gateline_movements_not_pedestrian_footfall" as const,
    customerCount: null, measuredPedestrianFootfall: null };
}
