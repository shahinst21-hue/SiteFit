import { add, fraction, mul, rounded, serialise } from "../economics/rational.ts";
import { packetDigest } from "./canonical.ts";
import { object, uuid } from "../data/validation.ts";

export const contextPolicy = {
  methodVersion: "resident-workplace-context-v1",
  label: "Resident & Workplace Context Index",
  transform: "native-density-midrank-bng-rounded-6-v1",
  profileVersion: "business-context-hypothesis-v1",
  weights: { "coffee-shop": [45, 55], restaurant: [55, 45], "hair-beauty-salon": [80, 20] },
  scope: "Dated resident and employee-job density context only",
  exclusions: ["actual customer demand", "commercial success", "competition", "profitability", "premises suitability"],
  methodReview: "native-context-six-area-sensitivity-20261009-v1",
  reviewedFrames: {
    population: "2f4031359bd142772694245532727eaac7753763fa75046a763fed15abdc9c93",
    oa: "a6021f1a5cb28848d12086ed12d8ac67a1663d0e3029cbf1da6bf9fa4d974b62",
    jobs: "d79a30276362991524d315d842c6ff4e3f5893b190b218965fa9e937d215cc9c",
    membership: "617e753ba48bb0754bfb7558feeaa1d24110867d0fc5be88faf39e3e41a2d8b7",
  },
} as const;
export type ContextBusiness = keyof typeof contextPolicy.weights;
export type DensityRank = {
  component: "resident" | "workplace"; code: string; count: number; areaM2: number;
  density: number; less: number; equal: number; peers: number; eligible: number;
  memberDigest: string; releaseId: string; releaseChecksum: string;
  geographyReleaseId: string; geographyChecksum: string; referencePeriod: string;
  footprintVerified: boolean; nonconstant: boolean; reasons: string[];
};
const digest = (s: string) => /^[a-f0-9]{64}$/.test(s);
export function reviewedContextFrame(r:DensityRank|null,j:DensityRank|null){
  const f=contextPolicy.reviewedFrames;
  return (!r||r.releaseChecksum===f.population&&r.geographyChecksum===f.oa)&&(!j||j.releaseChecksum===f.jobs&&j.geographyChecksum===f.membership);
}
export function validateDensityRank(value:unknown):DensityRank {
  const r=object(value),fields="component code count areaM2 density less equal peers eligible memberDigest releaseId releaseChecksum geographyReleaseId geographyChecksum referencePeriod footprintVerified nonconstant reasons".split(" ");
  if(Object.keys(r).length!==fields.length||fields.some(k=>!(k in r))||!["resident","workplace"].includes(String(r.component))||
    !new RegExp(r.component==="resident"?"^E00[0-9]{6}$":"^E01[0-9]{6}$").test(String(r.code))||
    ![r.releaseId,r.geographyReleaseId].every(uuid)||![r.memberDigest,r.releaseChecksum,r.geographyChecksum].every(v=>typeof v==="string"&&digest(v))||
    ![r.count,r.areaM2,r.density].every(v=>typeof v==="number"&&Number.isFinite(v))||Number(r.count)<0||Number(r.areaM2)<=0||Number(r.density)<0||
    Math.abs(Number(r.density)-Number(r.count)*1e6/Number(r.areaM2))>.00000051||
    ![r.less,r.equal,r.peers,r.eligible].every(v=>Number.isSafeInteger(v)&&Number(v)>=0&&Number(v)<=100000)||
    typeof r.footprintVerified!=="boolean"||typeof r.nonconstant!=="boolean"||!Array.isArray(r.reasons)||r.reasons.length>16||r.reasons.some(s=>typeof s!=="string"||s.length>100)||
    r.referencePeriod!==(r.component==="resident"?"2021":"2024"))throw Error("invalid_density_rank");
  return r as DensityRank;
}
export function admittedRank(r: DensityRank | null, component: DensityRank["component"]): r is DensityRank {
  return !!r && r.component === component && r.footprintVerified && r.nonconstant && r.reasons.length === 0 &&
    Number.isFinite(r.count) && r.count >= 0 && Number.isFinite(r.areaM2) && r.areaM2 > 0 &&
    Number.isFinite(r.density) && r.density >= 0 &&
    [r.less,r.equal,r.peers,r.eligible].every(Number.isSafeInteger) && r.less >= 0 && r.equal >= 0 &&
    r.less+r.equal <= r.peers && r.peers >= 30 && r.eligible >= r.peers && r.peers/r.eligible >= .9 &&
    [r.memberDigest,r.releaseChecksum,r.geographyChecksum].every(digest) &&
    r.referencePeriod === (component === "resident" ? "2021" : "2024");
}
export function contextIndex(business: ContextBusiness, resident: DensityRank|null, workplace: DensityRank|null, methodValidated: boolean) {
  if (!(business in contextPolicy.weights)) throw new Error("invalid_business");
  const weights = contextPolicy.weights[business];
  const ranks = [resident,workplace];
  const valid = [admittedRank(resident,"resident"),admittedRank(workplace,"workplace")];
  const components = ranks.map((r,i) => {
    const exact = valid[i] && r ? fraction(BigInt(100*r.less+50*r.equal),BigInt(r.peers)) : null;
    const contribution = exact ? mul(exact,fraction(BigInt(weights[i]),100n)) : null;
    return { operand:r, weight:weights[i], exact:exact?serialise(exact):null, contribution:contribution?serialise(contribution):null };
  });
  const available = valid.every(Boolean) && methodValidated;
  const total = available ? add(
    mul(fraction(BigInt(100*resident!.less+50*resident!.equal),BigInt(resident!.peers)),fraction(BigInt(weights[0]),100n)),
    mul(fraction(BigInt(100*workplace!.less+50*workplace!.equal),BigInt(workplace!.peers)),fraction(BigInt(weights[1]),100n))) : null;
  return { label:contextPolicy.label, methodVersion:contextPolicy.methodVersion, configDigest:packetDigest(contextPolicy),
    hypotheticalPolicy:true, state:available?"available" as const:"withheld" as const, display:total?Number(rounded(total)):null,
    exact:total?serialise(total):null, components, methodValidated,
    reasons:[...(!valid[0]?["resident_not_admitted"]:[]),...(!valid[1]?["workplace_not_admitted"]:[]),...(!methodValidated?["combined_method_not_validated"]:[])],
    scope:contextPolicy.scope, exclusions:contextPolicy.exclusions };
}
