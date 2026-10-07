import "server-only";
import { SourceError } from "./errors.ts";
import { object, text, timestamp } from "./validation.ts";

const certificatePattern = /^\d{4}-\d{4}-\d{4}-\d{4}-\d{4}$/;
function date(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && timestamp(`${value}T00:00:00Z`);
}
function uprn(value: unknown): string {
  const result = typeof value === "number" && Number.isSafeInteger(value) ? String(value) : value;
  if (typeof result !== "string" || !/^[1-9]\d{0,11}$/.test(result)) throw new SourceError("invalid_response");
  return result;
}

/** Explicitly permitted non-address representation for the verified CEPC 8
 * schema. UPRN match is necessary, but does not establish a trading-unit match.
 * No address, postcode, assessor details, recommendations or raw payload escape. */
export function normaliseNonDomesticCertificate(value: unknown, context: {
  certificateNumber: string; expectedUprn: string; retrievedAt: string;
}) {
  if (!certificatePattern.test(context.certificateNumber) || !timestamp(context.retrievedAt) || uprn(context.expectedUprn) !== context.expectedUprn) throw new SourceError("invalid_request");
  const root = object(value), d = object(root.data);
  if (d.schema_type !== "CEPC-8.0.0" || d.assessment_type !== "CEPC" || uprn(d.uprn) !== context.expectedUprn ||
    !text(d.status, 40) || !text(d.property_type, 200) || !date(d.registration_date) || !date(d.inspection_date) ||
    !date(d.issue_date) || !date(d.valid_until) || d.inspection_date > d.issue_date || d.issue_date > d.valid_until ||
    !["A+", "A", "B", "C", "D", "E", "F", "G"].includes(String(d.current_energy_efficiency_band)) ||
    typeof d.asset_rating !== "number" || !Number.isFinite(d.asset_rating)) throw new SourceError("invalid_response");
  const technical = object(d.technical_information);
  if (technical.floor_area !== null && technical.floor_area !== undefined &&
    (typeof technical.floor_area !== "number" || !Number.isFinite(technical.floor_area) || technical.floor_area <= 0)) throw new SourceError("invalid_response");
  const expired = d.valid_until < context.retrievedAt.slice(0, 10);
  return {
    schemaVersion: 1 as const, provider: "govuk-energy-data" as const,
    certificateNumber: context.certificateNumber, uprn: context.expectedUprn, sourceSchema: "CEPC-8.0.0" as const,
    assessmentType: "non_domestic_epc" as const, nativeStatus: d.status, propertyType: d.property_type,
    registeredOn: d.registration_date, inspectedOn: d.inspection_date, issuedOn: d.issue_date, validUntil: d.valid_until,
    retrievedAt: context.retrievedAt, energyBand: d.current_energy_efficiency_band as string, assetRating: d.asset_rating,
    validity: expired ? "expired" as const : d.status === "entered" ? "within_certificate_dates" as const : "status_requires_review" as const,
    // A retrieved certificate is historical evidence, not proof of latest/current
    // certification or unit-level fit. Supersession requires complete discovery.
    currentCertificateConfirmed: false as const, tradingUnitMatchConfirmed: false as const,
    nativeFloorArea: { value: technical.floor_area ?? null, unit: null, areaBasis: "certificate_area_not_verified_lease_NIA" as const },
    sourceReference: `https://api.get-energy-performance-data.communities.gov.uk/api/certificate?certificate_number=${context.certificateNumber}`,
    licence: { id: "OGL-3.0", representation: "non_address_fields_only", attribution: "Contains public sector information licensed under the Open Government Licence v3.0.", rawRetained: false },
  };
}
