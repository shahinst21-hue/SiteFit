import { object, uuid } from "./validation.ts";
import { SourceError } from "./errors.ts";
import { validPoint } from "../spatial/model.ts";
import { validateWalkingMatrix } from "./walking-matrix-result.ts";
import { stationMappingVersion } from "./station-mapping.ts";
import type { WalkingMatrix } from "./adapters/geoapify.ts";
export type StationWalkingResult = {schemaVersion: 1; kind: "station_walking";
  parent: {snapshotId: string; checksum: string}; mappingVersion: string; selectionVersion: "reviewed-station-id-order-1";
  registerComplete: boolean; omittedIds: string[]; truncatedReviewedIds: string[]; entranceConfirmed: false; matrix: WalkingMatrix};
function demand(v: unknown): asserts v { if (!v) throw new SourceError("invalid_response"); }
export function validateStationWalkingResult(value: unknown): StationWalkingResult {
  const r = object(value), p = object(r.parent), matrix = object(r.matrix);
  const keys = "schemaVersion kind parent mappingVersion selectionVersion registerComplete omittedIds truncatedReviewedIds entranceConfirmed matrix".split(" ");
  demand(Object.keys(r).length === keys.length && keys.every(k => k in r) && r.schemaVersion === 1 && r.kind === "station_walking" &&
    Object.keys(p).length === 2 && uuid(p.snapshotId) && /^[a-f0-9]{64}$/.test(String(p.checksum)) &&
    r.mappingVersion === stationMappingVersion && r.selectionVersion === "reviewed-station-id-order-1" &&
    r.entranceConfirmed === false && typeof r.registerComplete === "boolean" && validPoint(matrix.origin) && Array.isArray(matrix.targets));
  const targets = matrix.targets.map(value => {const t = object(value); demand(typeof t.id === "string" && /^[A-Za-z0-9:_-]{1,120}$/.test(t.id) && validPoint(t.point)); return {id: t.id, point: t.point};});
  validateWalkingMatrix(r.matrix, matrix.origin, targets);
  for (const key of ["omittedIds", "truncatedReviewedIds"] as const) demand(Array.isArray(r[key]) && r[key].length <= 300 &&
    r[key].every(v => typeof v === "string" && /^[A-Za-z0-9:_-]{1,120}$/.test(v)));
  const all = [...targets.map(t => t.id), ...(r.omittedIds as string[]), ...(r.truncatedReviewedIds as string[])];
  demand(all.length <= 300 && new Set(all).size === all.length);
  return structuredClone(value) as StationWalkingResult;
}
