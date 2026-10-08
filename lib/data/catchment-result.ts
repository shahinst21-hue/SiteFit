import { object } from "./validation.ts";
import { SourceError } from "./errors.ts";
import { validateNativeStatistic } from "./statistics.ts";
import { catchmentAllocationOperands, type CatchmentReleaseBindings } from "../analysis/catchment-operands.ts";
function demand(v: unknown): asserts v { if (!v) throw new SourceError("invalid_response"); }
const close=(a:number,b:number)=>Math.abs(a-b)<=Math.max(1e-7,Math.abs(b)*1e-8);
const positive=(v:unknown):v is number=>typeof v==="number"&&Number.isFinite(v)&&v>0;
function keys(r:Record<string,unknown>,names:string){const fields=names.split(" ");demand(Object.keys(r).length===fields.length&&fields.every(k=>k in r));}
/** Full private operands; income stays a native non-additive context and jobs
 * stay employee counts. This adds no score, spending or footfall inference. */
export function validateCatchmentOperands(value: unknown, releases: CatchmentReleaseBindings, columns: number) {
  try {
    const r=object(value);keys(r,"schemaVersion methodVersion allocation geographyReleaseId nativeReleaseId censusReleaseId incomeReleaseId bresReleaseId catchmentAreaM2 londonCoveredAreaM2 londonCoverageFraction oaOperands censusEstimates employeeJobsOperands incomeNativeContext incomeMissingGeographies limitations");
    const allocation=catchmentAllocationOperands(value,releases,columns);
    const lsoaAreas=new Map<string,number>(),msoaCodes=new Set<string>();
    for(const value of r.oaOperands as unknown[]) {
      const o=object(value);keys(o,"code lsoaCode msoaCode intersectionAreaM2 nativeAreaM2 allocationFraction values missingReasons");
      demand(typeof o.lsoaCode==="string"&&/^E01\d{6}$/.test(o.lsoaCode)&&typeof o.msoaCode==="string"&&/^E02\d{6}$/.test(o.msoaCode));
      msoaCodes.add(o.msoaCode);lsoaAreas.set(o.lsoaCode,(lsoaAreas.get(o.lsoaCode)??0)+Number(o.intersectionAreaM2));
    }
    demand(Array.isArray(r.employeeJobsOperands)&&r.employeeJobsOperands.length===lsoaAreas.size&&r.employeeJobsOperands.length<=4994);
    const jobsSeen=new Set<string>();
    for(const value of r.employeeJobsOperands) {
      const o=object(value);keys(o,"code intersectionAreaM2 nativeAreaM2 nativeProfile knownContribution");
      demand(typeof o.code==="string"&&lsoaAreas.has(o.code)&&!jobsSeen.has(o.code)&&positive(o.intersectionAreaM2)&&positive(o.nativeAreaM2)&&
        o.intersectionAreaM2<=o.nativeAreaM2*(1+1e-8)&&close(o.intersectionAreaM2,lsoaAreas.get(o.code)!));jobsSeen.add(o.code);
      if(o.nativeProfile===null){demand(o.knownContribution===null);continue;}
      const p=validateNativeStatistic(o.nativeProfile);
      demand(p.releaseId===releases.bresReleaseId&&p.geographyReleaseId===releases.nativeReleaseId&&p.measure.dataset==="BRES2024"&&p.geography.type==="LSOA2021"&&p.geography.code===o.code);
      if(p.state==="available")demand(typeof o.knownContribution==="number"&&close(o.knownContribution,p.value!*Math.min(1,o.intersectionAreaM2/o.nativeAreaM2)));
      else demand(o.knownContribution===null);
    }
    demand(Array.isArray(r.incomeNativeContext)&&Array.isArray(r.incomeMissingGeographies)&&r.incomeNativeContext.length+r.incomeMissingGeographies.length===msoaCodes.size&&msoaCodes.size<=1002);
    const incomeSeen=new Set<string>();
    for(const value of r.incomeNativeContext) {
      const p=validateNativeStatistic(value);demand(p.releaseId===releases.incomeReleaseId&&p.geographyReleaseId===releases.nativeReleaseId&&p.measure.dataset==="income-AHC-FYE2023"&&p.geography.type==="MSOA2021"&&msoaCodes.has(p.geography.code)&&!incomeSeen.has(p.geography.code));incomeSeen.add(p.geography.code);
    }
    for(const code of r.incomeMissingGeographies){demand(typeof code==="string"&&msoaCodes.has(code)&&!incomeSeen.has(code));incomeSeen.add(code);}
    demand(Array.isArray(r.limitations)&&r.limitations.length>0&&r.limitations.length<=32&&r.limitations.every(v=>typeof v==="string"&&v.length>0&&v.length<=1000));
    return {operands:structuredClone(value),allocation};
  }catch {throw new SourceError("invalid_response");}
}
