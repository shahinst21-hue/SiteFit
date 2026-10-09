import columns from "./census-columns.json" with { type: "json" };
import { object, uuid, timestamp } from "./validation.ts";
import { SourceError } from "./errors.ts";
import { validateCatchmentOperands } from "./catchment-result.ts";
import { validatePlaceInventory } from "./place-inventory.ts";
import type { EnrichmentInput } from "./enrichment-input.ts";
import { enrichmentReleaseKeys } from "./enrichment-input.ts";
import { errorCodes } from "./contracts.ts";
import type { SafeSourceError } from "./contracts.ts";
export const catchmentDatasets = ["TS007A", "TS003", "TS045", "TS066"] as const;
export const catchmentReleaseKeys = ["censusReleaseId", "householdReleaseId", "carsReleaseId", "economicActivityReleaseId"] as const;
export type CatchmentDataset = typeof catchmentDatasets[number];
type Parent = { snapshotId: string; checksum: string };
export type CatchmentSources = { schemaVersion: 1; kind: "catchment_statistics"; parent: Parent; releases: EnrichmentInput["releases"];
  ranges: { seconds: 300 | 600 | 900; statistics: { dataset: CatchmentDataset; releaseId: string; referencePeriod: "2021-03-21";
    outcome: "success" | "unavailable"; operands: unknown | null; error: SafeSourceError | null }[] }[] };
export type CatchmentPlaces = { schemaVersion: 1; kind: "catchment_places"; parent: Parent; releaseId: string; geographyReleaseId: string; retrievedAt: string;
  ranges: { seconds: 300 | 600 | 900; outcome: "success" | "unavailable"; inventory: ReturnType<typeof validatePlaceInventory> | null; error: SafeSourceError | null }[] };
function demand(v: unknown): asserts v { if (!v) throw new SourceError("invalid_response"); }
function fields(r: Record<string, unknown>, names: string) {const f=names.split(" ");demand(Object.keys(r).length===f.length&&f.every(k=>k in r));}
function parent(value: unknown) {const p=object(value);fields(p,"snapshotId checksum");demand(uuid(p.snapshotId)&&typeof p.checksum==="string"&&/^[0-9a-f]{64}$/.test(p.checksum));}
function failed(value: unknown){const e=object(value);fields(e,"code retryable status");demand(errorCodes.includes(e.code as typeof errorCodes[number])&&typeof e.retryable==="boolean"&&(e.status===null||Number.isSafeInteger(e.status)&&Number(e.status)>=0&&Number(e.status)<=599));}
export function validateCatchmentSources(value: unknown): CatchmentSources {
  const r=object(value);fields(r,"schemaVersion kind parent releases ranges");parent(r.parent);
  const releases=object(r.releases);demand(r.schemaVersion===1&&r.kind==="catchment_statistics"&&Object.keys(releases).length===13&&enrichmentReleaseKeys.every(k=>uuid(releases[k])));
  demand(Array.isArray(r.ranges)&&r.ranges.length===3);
  r.ranges.forEach((value,index)=>{const range=object(value);fields(range,"seconds statistics");demand(range.seconds===[300,600,900][index]&&Array.isArray(range.statistics)&&range.statistics.length===4);
    range.statistics.forEach((value,i)=>{const s=object(value);fields(s,"dataset releaseId referencePeriod outcome operands error");
      demand(s.dataset===catchmentDatasets[i]&&s.releaseId===releases[catchmentReleaseKeys[i]]&&s.referencePeriod==="2021-03-21");
      if(s.outcome==="success"){demand(s.operands!==null&&s.error===null);validateCatchmentOperands(s.operands,{geographyReleaseId:releases.geographyReleaseId as string,nativeReleaseId:releases.nativeReleaseId as string,
        censusReleaseId:s.releaseId as string,incomeReleaseId:releases.incomeReleaseId as string,bresReleaseId:releases.bresReleaseId as string},columns[catchmentDatasets[i]].columns.length);}
      else {demand(s.outcome==="unavailable"&&s.operands===null);failed(s.error);}
    });
  });
  return structuredClone(value) as CatchmentSources;
}
export function validateCatchmentPlaces(value: unknown): CatchmentPlaces {
  const r=object(value);fields(r,"schemaVersion kind parent releaseId geographyReleaseId retrievedAt ranges");parent(r.parent);
  demand(r.schemaVersion===1&&r.kind==="catchment_places"&&uuid(r.releaseId)&&uuid(r.geographyReleaseId)&&timestamp(r.retrievedAt)&&Array.isArray(r.ranges)&&r.ranges.length===3);
  r.ranges.forEach((value,index)=>{const range=object(value);fields(range,"seconds outcome inventory error");demand(range.seconds===[300,600,900][index]);
    if(range.outcome==="success"){demand(range.inventory!==null&&range.error===null);validatePlaceInventory(range.inventory,r.releaseId as string,r.geographyReleaseId as string);}
    else {demand(range.outcome==="unavailable"&&range.inventory===null);failed(range.error);}
  });
  return structuredClone(value) as CatchmentPlaces;
}
