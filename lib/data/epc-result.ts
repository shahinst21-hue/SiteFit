import "server-only";
import { isDeepStrictEqual } from "node:util";
import { normaliseNonDomesticCertificate } from "./non-domestic-epc.ts";
import { object, timestamp, uuid } from "./validation.ts";
import { validPoint, type Point } from "../spatial/model.ts";
import { SourceError } from "./errors.ts";

export type EpcResult = {schemaVersion: 1; kind: "non_domestic_certificate";
 binding: {uprn: string; point: Point; osReleaseId: string}; parent: {snapshotId: string; checksum: string};
 discovery: {retrievedAt: string; count: number; complete: boolean; selection: "single_certificate" | "none" | "ambiguous" | "incomplete"};
 certificate: ReturnType<typeof normaliseNonDomesticCertificate> | null};
const demand = (v: unknown) => {if (!v) throw new SourceError("invalid_response");};
export function validateEpcResult(value: unknown): EpcResult {
 const r=object(value), b=object(r.binding), p=object(r.parent), d=object(r.discovery);
 demand(Object.keys(r).length===6 && r.schemaVersion===1 && r.kind==="non_domestic_certificate" && Object.keys(b).length===3 &&
  typeof b.uprn==="string" && /^[1-9]\d{0,11}$/.test(b.uprn) && validPoint(b.point) && b.point.precision==="building" && b.point.source==="os-open-uprn" && uuid(b.osReleaseId) &&
  Object.keys(p).length===2 && uuid(p.snapshotId) && typeof p.checksum==="string" && /^[a-f0-9]{64}$/.test(p.checksum) &&
  Object.keys(d).length===4 && timestamp(d.retrievedAt) && Number.isSafeInteger(d.count) && Number(d.count)>=0 && typeof d.complete==="boolean");
 const expected=!d.complete?"incomplete":d.count===0?"none":d.count===1?"single_certificate":"ambiguous";
 demand(d.selection===expected);
 if (expected!=="single_certificate") demand(r.certificate===null);
 else {
  const c=object(r.certificate), area=object(c.nativeFloorArea);
  const reconstructed=normaliseNonDomesticCertificate({data:{schema_type:c.sourceSchema,assessment_type:"CEPC",uprn:c.uprn,status:c.nativeStatus,
   property_type:c.propertyType,registration_date:c.registeredOn,inspection_date:c.inspectedOn,issue_date:c.issuedOn,valid_until:c.validUntil,
   current_energy_efficiency_band:c.energyBand,asset_rating:c.assetRating,technical_information:{floor_area:area.value}}},
   {certificateNumber:c.certificateNumber as string,expectedUprn:b.uprn as string,retrievedAt:d.retrievedAt as string});
  demand(isDeepStrictEqual(c,reconstructed));
 }
 return structuredClone(value) as EpcResult;
}
