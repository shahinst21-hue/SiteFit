import type { LicenceMetadata, SourceId } from "./contracts.ts";
import { SourceError } from "./errors.ts";

const permit = { allowed: true, maxDays: null, condition: "Retain with source attribution and continuing licence compliance." };
const terms = {
  "ons-population": "https://www.ons.gov.uk/methodology/geography/licences",
  "tfl-stop-points": "https://tfl.gov.uk/corporate/terms-and-conditions/transport-data-service",
  "fsa-establishments": "https://ratings.food.gov.uk/terms-and-conditions",
  "planning-conservation": "https://www.planning.data.gov.uk/dataset/conservation-area",
  "planning-article4": "https://www.planning.data.gov.uk/dataset/article-4-direction-area",
};
export function policy(source: SourceId): LicenceMetadata {
  if (source === "planning-conservation" || source === "planning-article4") return structuredClone({
    policyId: source, version: 1, reviewedAt: "2026-10-08T00:00:00Z", termsUrl: terms[source],
    raw: { allowed: false, maxDays: 0, condition: "Persist only admitted native profiles; no external raw response." },
    normalised: permit, derived: permit, references: permit, timestamps: permit,
    attribution: ["Contains public sector information licensed under the Open Government Licence v3.0.",
      "Source: Planning Data and named local authority publishers.", "Contains OS data © Crown copyright and database rights; Historic England data where supplied."],
    cacheSeconds: 0, rawDisposition: "not_returned",
  });
  const attribution = source === "ons-population" ? ["Source: Office for National Statistics licensed under the Open Government Licence v.3.0", "Contains OS data © Crown copyright and database right 2021"] :
    source === "tfl-stop-points" ? ["Powered by TfL Open Data", "Contains OS data © Crown copyright and database rights 2016", "Geomni UK Map data © and database rights [2019]"] :
    ["Contains public sector information licensed under the Open Government Licence v3.0. Source: Food Standards Agency."];
  if (!Object.hasOwn(terms, source)) throw new SourceError("licence_blocked");
  return structuredClone({ policyId: source, version: 1, reviewedAt: "2026-10-05T00:00:00Z", termsUrl: terms[source],
    raw: { allowed: false, maxDays: 0, condition: "Discard raw response after bounded normalisation." }, normalised: permit, derived: permit, references: permit, timestamps: permit,
    attribution, cacheSeconds: source === "ons-population" ? 0 : 86400, rawDisposition: "discarded" });
}
export function permitted(value: LicenceMetadata | null): value is LicenceMetadata {
  return Boolean(value && ["ons-population", "ons-london", "tfl-stop-points", "fsa-establishments", "planning-conservation", "planning-article4"].includes(value.policyId) && value.version === 1 && !value.raw.allowed && value.normalised.allowed && value.references.allowed && value.timestamps.allowed && value.attribution.length);
}
export function assertPolicy(value: LicenceMetadata | null) { if (!permitted(value)) throw new SourceError("licence_blocked"); }

/** Versioned Census bulk admission; does not alter historical v1 source-policy acceptance. */
export function censusPolicy(): LicenceMetadata {
  return structuredClone({ policyId: "ons-census", version: 1, reviewedAt: "2026-10-07T00:00:00Z",
    termsUrl: "https://www.ons.gov.uk/methodology/geography/licences",
    raw: { allowed: false, maxDays: 0, condition: "Discard temporary national archives after validated London ingestion." },
    normalised: permit, derived: permit, references: permit, timestamps: permit,
    attribution: ["Source: Office for National Statistics licensed under the Open Government Licence v.3.0", "Contains OS data © Crown copyright and database right 2021"],
    cacheSeconds: 0, rawDisposition: "discarded" });
}
