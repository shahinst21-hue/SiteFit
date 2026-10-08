import { object, timestamp, uuid } from "../data/validation.ts";
import { validateNativeStatistic } from "../data/statistics.ts";
import { SourceError } from "../data/errors.ts";
import { percentileMidrank, type Cohort } from "./scoring.ts";

const fields = "schemaVersion methodVersion definition releaseId geographyReleaseId releaseVersion releaseChecksum sourceRetrievedAt publishedAt effectiveAt target eligibleCount rows".split(" ");
function demand(value: unknown): asserts value { if (!value) throw new SourceError("invalid_response"); }
/** Preserve the native distribution and exclusions for later calibration.
 * Income position is descriptive; native job counts are not an admitted
 * density/commercial comparison and deliberately have no ranking. */
export function nativeComparison(value: unknown, releaseId: string, geographyReleaseId: string, code: string) {
  const r = object(value);
  demand(Object.keys(r).length === fields.length && fields.every(k => k in r) && r.schemaVersion === 1 &&
    r.methodVersion === "native-london-distribution-1" && typeof r.definition === "string" && r.definition.length > 0 &&
    uuid(releaseId) && uuid(geographyReleaseId) && r.releaseId === releaseId && r.geographyReleaseId === geographyReleaseId &&
    typeof r.releaseVersion === "string" && r.releaseVersion.length > 0 && typeof r.releaseChecksum === "string" && /^[a-f0-9]{64}$/.test(r.releaseChecksum) &&
    timestamp(r.sourceRetrievedAt) && (r.publishedAt === null || timestamp(r.publishedAt)) && (r.effectiveAt === null || timestamp(r.effectiveAt)));
  const target = validateNativeStatistic(r.target);
  demand(target.releaseId === releaseId && target.geographyReleaseId === geographyReleaseId && target.geography.code === code &&
    ["income-AHC-FYE2023", "BRES2024"].includes(target.measure.dataset) &&
    Number.isSafeInteger(r.eligibleCount) && Number(r.eligibleCount) >= 0 && Number(r.eligibleCount) <= 4994 &&
    Array.isArray(r.rows) && r.rows.length === r.eligibleCount);
  const seen = new Set<string>();
  const members = r.rows.map(value => {
    demand(Array.isArray(value) && value.length === 6 && typeof value[0] === "string" && value[0] !== code && !seen.has(value[0]));
    seen.add(value[0]);
    const profile = validateNativeStatistic({...target, geography: {...target.geography, code: value[0]},
      value: value[1], state: value[2], missingReason: value[3], interval: value[4],
      lineage: {...target.lineage, sourceRecord: value[5] ?? value[0]}});
    return {id: profile.geography.code, value: profile.value, state: profile.state, missingReason: profile.missingReason,
      interval: profile.interval, sourceRecord: value[5] ?? null};
  });
  const available = members.filter((m): m is typeof m & {value: number} => m.state === "available" && m.value !== null);
  const cohort: Cohort = {definition: r.definition as string, releaseId, effectiveAt: r.sourceRetrievedAt as string,
    units: target.measure.unit, geographyUnit: target.geography.type, authorityCode: "E12000007",
    eligibleCount: Number(r.eligibleCount), members: available.map(m => ({id: m.id, value: m.value}))};
  const ranking = target.measure.dataset === "income-AHC-FYE2023" && target.value !== null
    ? percentileMidrank(target.value, cohort) : null;
  return {schemaVersion: 1, methodVersion: r.methodVersion, definition: r.definition,
    releaseId, geographyReleaseId, releaseVersion: r.releaseVersion, releaseChecksum: r.releaseChecksum,
    sourceRetrievedAt: r.sourceRetrievedAt, publishedAt: r.publishedAt, effectiveAt: r.effectiveAt,
    target, eligibleCount: r.eligibleCount, members, ranking,
    reasons: target.value === null ? ["target_unavailable"] : ranking?.reason ? [ranking.reason] :
      target.measure.dataset === "BRES2024" ? ["native_job_count_comparison_not_admitted"] : [],
    suitabilityDirection: null, commercialScore: null,
    limitations: ["All-London native-area source distribution; not comparable commercial sites or walking catchments.",
      "Source retrieval timestamp identifies this distribution; reference period remains separately pinned in the native measure.",
      "Income is modelled household mean, not individual/customer spending; jobs are employee counts, not footfall."]};
}
