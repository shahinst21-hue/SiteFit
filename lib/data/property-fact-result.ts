import "server-only";
import { isDeepStrictEqual } from "node:util";
import { object, timestamp, uuid } from "./validation.ts";
import { SourceError } from "./errors.ts";
import { validPoint, type Point } from "../spatial/model.ts";
import { normalisePremises, normalisePointFlood, normaliseRentBenchmark } from "./adapters/propertydata-facts.ts";

type Premises = ReturnType<typeof normalisePremises> & {retrievedAt: string};
type Flood = ReturnType<typeof normalisePointFlood> & {retrievedAt: string};
type Rent = ReturnType<typeof normaliseRentBenchmark> & {retrievedAt: string};
export type PropertyFactResult = {schemaVersion: 1; kind: "property_fact";
  binding: {uprn: string; point: Point; osReleaseId: string};
} & ({operation: "uprn"; facts: Premises} | {operation: "flood-risk"; facts: Flood} | {operation: "rents-commercial"; facts: Rent});
function demand(v: unknown): asserts v {if (!v) throw new SourceError("invalid_response");}
/** Reconstruct the permitted representation, rejecting extra raw/private fields,
 * fabricated consent/area/current dates, and rent benchmark admission claims. */
export function validatePropertyFactResult(value: unknown): PropertyFactResult {
  const r = object(value), b = object(r.binding), f = object(r.facts), cost = object(f.cost);
  demand(Object.keys(r).length === 5 && r.schemaVersion === 1 && r.kind === "property_fact" &&
    Object.keys(b).length === 3 && typeof b.uprn === "string" && /^[1-9]\d{0,11}$/.test(b.uprn) &&
    validPoint(b.point) && b.point.precision === "building" && b.point.source === "os-open-uprn" && uuid(b.osReleaseId) && timestamp(f.retrievedAt));
  const address = "Retained facts validation only", selection = {uprn: b.uprn, point: b.point, osReleaseId: b.osReleaseId as string,
    coordinateBasis: "address_building_not_entrance" as const, address, classificationCode: null, classificationDescription: null};
  const credit = cost.observedCredits === null ? {} : {api_calls_cost: cost.observedCredits};
  const location = `${b.point.latitude},${b.point.longitude}`;
  let expected: Premises | Flood | Rent;
  if (r.operation === "uprn") {
    expected = {...normalisePremises({status: "success", ...credit, data: {address, lat: b.point.latitude, lng: b.point.longitude,
      description: object(f.description).value, useClass: object(f.providerUseClass).value}}, selection), retrievedAt: f.retrievedAt};
  } else if (r.operation === "flood-risk") {
    expected = {...normalisePointFlood({status: "success", ...credit, location, flood_risk: f.riversAndSea}, location), retrievedAt: f.retrievedAt};
  } else {
    demand(r.operation === "rents-commercial" && ["restaurants", "retail"].includes(String(f.type)));
    expected = {...normaliseRentBenchmark({status: "success", ...credit, location, type: f.type, data: {
      points_analysed: f.pointsAnalysed, unit_type: f.areaBasis, size_banded: f.sizeBanded,
      avg_quoting_rent_per_sqft: f.poundsPerSqftYear, avg_size: f.averageSqft, avg_quoting_rent: f.poundsPerYear, radius: f.nativeRadius,
    }}, location, f.type as "restaurants" | "retail"), retrievedAt: f.retrievedAt};
  }
  demand(isDeepStrictEqual(f, expected));
  return structuredClone(value) as PropertyFactResult;
}
