import type { LicenceMetadata, SourceId } from "./contracts.ts";
import { SourceError } from "./errors.ts";

const permit = { allowed: true, maxDays: null, condition: "Retain with source attribution and continuing licence compliance." };
const terms = {
  "govuk-non-domestic-epc": "https://get-energy-performance-data.communities.gov.uk/",
  "ons-income-context": "https://www.ons.gov.uk/methodology/geography/licences",
  "ons-jobs-context": "https://www.ons.gov.uk/methodology/geography/licences",
  "propertydata-premises": "https://propertydata.co.uk/api/documentation/licensing",
  "propertydata-flood": "https://propertydata.co.uk/api/documentation/licensing",
  "propertydata-rent": "https://propertydata.co.uk/api/documentation/licensing",
  "ons-population": "https://www.ons.gov.uk/methodology/geography/licences",
  "tfl-stop-points": "https://tfl.gov.uk/corporate/terms-and-conditions/transport-data-service",
  "tfl-stations": "https://tfl.gov.uk/corporate/terms-and-conditions/transport-data-service",
  "tfl-station-activity": "https://tfl.gov.uk/corporate/terms-and-conditions/transport-data-service",
  "geoapify-access": "https://www.geoapify.com/terms-and-conditions/",
  "fsa-establishments": "https://ratings.food.gov.uk/terms-and-conditions",
  "planning-conservation": "https://www.planning.data.gov.uk/dataset/conservation-area",
  "planning-article4": "https://www.planning.data.gov.uk/dataset/article-4-direction-area",
  "geoapify-walking": "https://apidocs.geoapify.com/docs/isolines",
  "ons-catchments": "https://www.ons.gov.uk/methodology/geography/licences",
  "overture-catchments": "https://docs.overturemaps.org/attribution/",
};
export function policy(source: SourceId): LicenceMetadata {
  if (source === "govuk-non-domestic-epc") return structuredClone({policyId:source,version:1,reviewedAt:"2026-10-08T00:00:00Z",termsUrl:terms[source],
    raw:{allowed:false,maxDays:0,condition:"Discard raw search/certificate bodies and all restricted address, postcode, assessor and personal fields."},
    normalised:{...permit,condition:"Only permitted non-address CEPC facts and provenance under OGL; never a copy of restricted address records."},
    derived:permit,references:permit,timestamps:permit,attribution:["Contains public sector information licensed under the Open Government Licence v3.0. Source: GOV.UK non-domestic energy performance data."],cacheSeconds:0,rawDisposition:"discarded"});
  if (source.startsWith("propertydata-")) return structuredClone({policyId: source, version: 1, reviewedAt: "2026-10-08T00:00:00Z", termsUrl: terms[source],
    raw: {allowed: false, maxDays: 0, condition: "Discard provider bodies, personal owners, photos, transactions and candidate lists after bounded normalisation."},
    normalised: {...permit, condition: "Dated per-analysis historical facts only; not a standing searchable/current bulk copy. Current caching is at most 60 days; reopening never refreshes historical reports. Applicable termination/archival rights require focused pre-launch review."},
    derived: {...permit, condition: "Historical dated per-analysis derivatives under applicable PropertyData terms."}, references: permit, timestamps: permit,
    attribution: ["Source: PropertyData; dated per-analysis historical observation, not current property verification."], cacheSeconds: 0, rawDisposition: "discarded"});
  if (source === "geoapify-access") return structuredClone({policyId: source, version: 1, reviewedAt: "2026-10-08T00:00:00Z", termsUrl: terms[source],
    raw: {allowed: false, maxDays: 0, condition: "Discard raw provider body, credential URL and diagnostics after bounded normalisation."},
    normalised: {...permit, condition: "Retain calculated time/distance/snapping results with Geoapify and OSM attribution and continuing terms compliance; launch-scale rights remain a pre-launch gate."},
    derived: permit, references: permit, timestamps: permit, attribution: ["Powered by Geoapify: https://www.geoapify.com/", "© OpenStreetMap contributors: https://www.openstreetmap.org/copyright"],
    cacheSeconds: 0, rawDisposition: "discarded"});
  if (["ons-catchments", "ons-income-context", "ons-jobs-context", "overture-catchments"].includes(source)) return structuredClone({ policyId: source, version: 1, reviewedAt: "2026-10-08T00:00:00Z", termsUrl: terms[source],
    raw: { allowed: false, maxDays: 0, condition: "Store only admitted normalised release operands, not temporary national raw archives." },
    normalised: permit, derived: permit, references: permit, timestamps: permit,
    attribution: source !== "overture-catchments" ? ["Source: Office for National Statistics licensed under the Open Government Licence v3.0.", "Contains OS data © Crown copyright and database rights."] :
      ["Overture Maps Foundation — CDLA-Permissive-2.0; required release notices retained.", "Foursquare Open Source Places — Apache-2.0.", "All The Places — CC0-1.0; native per-record sources/licences retained."],
    cacheSeconds: 0, rawDisposition: "not_returned",
  });
  if (source === "geoapify-walking") return structuredClone({ policyId: source, version: 1, reviewedAt: "2026-10-08T00:00:00Z", termsUrl: terms[source],
    raw: { allowed: false, maxDays: 0, condition: "Discard external raw response and credential URL after bounded normalisation." },
    normalised: { ...permit, condition: "Calculated isolines may be stored under Geoapify Isoline terms with required Geoapify/OSM attribution." },
    derived: permit, references: permit, timestamps: permit,
    attribution: ["Powered by Geoapify: https://www.geoapify.com/", "© OpenStreetMap contributors: https://www.openstreetmap.org/copyright"],
    cacheSeconds: 0, rawDisposition: "discarded",
  });
  if (source === "planning-conservation" || source === "planning-article4") return structuredClone({
    policyId: source, version: 1, reviewedAt: "2026-10-08T00:00:00Z", termsUrl: terms[source],
    raw: { allowed: false, maxDays: 0, condition: "Persist only admitted native profiles; no external raw response." },
    normalised: permit, derived: permit, references: permit, timestamps: permit,
    attribution: ["Contains public sector information licensed under the Open Government Licence v3.0.",
      "Source: Planning Data and named local authority publishers.", "Contains OS data © Crown copyright and database rights; Historic England data where supplied."],
    cacheSeconds: 0, rawDisposition: "not_returned",
  });
  const attribution = source === "ons-population" ? ["Source: Office for National Statistics licensed under the Open Government Licence v.3.0", "Contains OS data © Crown copyright and database right 2021"] :
    ["tfl-stop-points", "tfl-stations", "tfl-station-activity"].includes(source) ? ["Powered by TfL Open Data", "Contains OS data © Crown copyright and database rights 2016", "Geomni UK Map data © and database rights [2019]"] :
    ["Contains public sector information licensed under the Open Government Licence v3.0. Source: Food Standards Agency."];
  if (!Object.hasOwn(terms, source)) throw new SourceError("licence_blocked");
  return structuredClone({ policyId: source, version: 1, reviewedAt: "2026-10-05T00:00:00Z", termsUrl: terms[source],
    raw: { allowed: false, maxDays: 0, condition: "Discard raw response after bounded normalisation." }, normalised: permit, derived: permit, references: permit, timestamps: permit,
    attribution, cacheSeconds: ["ons-population", "tfl-stations", "tfl-station-activity"].includes(source) ? 0 : 86400, rawDisposition: "discarded" });
}
export function permitted(value: LicenceMetadata | null): value is LicenceMetadata {
  return Boolean(value && ["govuk-non-domestic-epc", "ons-income-context", "ons-jobs-context", "ons-population", "ons-london", "tfl-stop-points", "tfl-stations", "tfl-station-activity", "geoapify-access", "fsa-establishments", "planning-conservation", "planning-article4", "geoapify-walking", "ons-catchments", "overture-catchments", "propertydata-premises", "propertydata-flood", "propertydata-rent"].includes(value.policyId) && value.version === 1 && !value.raw.allowed && value.normalised.allowed && value.references.allowed && value.timestamps.allowed && value.attribution.length);
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
