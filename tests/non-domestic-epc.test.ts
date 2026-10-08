import { test } from "node:test";
import assert from "node:assert/strict";
import { normaliseNonDomesticCertificate } from "../lib/data/non-domestic-epc.ts";
const context = { certificateNumber: "1111-2222-3333-4444-5555", expectedUprn: "123456789", retrievedAt: "2026-10-07T20:00:00Z" };
const certificate = () => ({ data: { uprn: 123456789, schema_type: "CEPC-8.0.0", assessment_type: "CEPC", status: "entered", property_type: "Synthetic retail",
  registration_date: "2026-10-01", inspection_date: "2026-09-30", issue_date: "2026-10-01", valid_until: "2036-09-30",
  current_energy_efficiency_band: "C", asset_rating: 65, technical_information: { floor_area: 193 },
  address_line_1: "Restricted synthetic address", postcode: "Restricted postcode", assessor_name: "Private assessor" } });

test("CEPC representation strips restricted and personal fields, preserving historical identity and uncertainty", () => {
  const result = normaliseNonDomesticCertificate(certificate(), context);
  assert.equal(result.uprn, context.expectedUprn); assert.equal(result.nativeFloorArea.value, 193);
  assert.equal(result.nativeFloorArea.unit, "square_metres"); assert.equal(result.currentCertificateConfirmed, false);
  assert.equal(result.sourceReference, `https://find-energy-certificate.service.gov.uk/energy-certificate/${context.certificateNumber}`);
  assert.equal(result.tradingUnitMatchConfirmed, false); assert.equal(result.validity, "within_certificate_dates");
  for (const excluded of ["Restricted", "Private assessor", "postcode", "address_line_1"]) assert.equal(JSON.stringify(result).includes(excluded), false);
  assert.equal(result.licence.rawRetained, false);
  const negative = certificate(); negative.data.asset_rating = -5; negative.data.current_energy_efficiency_band = "A+";
  assert.equal(normaliseNonDomesticCertificate(negative, context).assetRating, -5);
});

test("domestic, wrong UPRN, unsupported schema and malformed dates cannot be admitted", () => {
  for (const patch of [{ assessment_type: "RdSAP" }, { uprn: 987654321 }, { schema_type: "CEPC-7.1" }, { inspection_date: "2026-02-30" },
    { valid_until: "2025-01-01" }, { asset_rating: NaN }, { current_energy_efficiency_band: "Unknown" }]) {
    const fixture = certificate(); Object.assign(fixture.data, patch);
    assert.throws(() => normaliseNonDomesticCertificate(fixture, context));
  }
  const expired = certificate(); expired.data.issue_date = "2010-01-01"; expired.data.inspection_date = "2009-12-31"; expired.data.valid_until = "2020-01-01";
  assert.equal(normaliseNonDomesticCertificate(expired, context).validity, "expired");
  const cancelled = certificate(); cancelled.data.status = "cancelled";
  assert.equal(normaliseNonDomesticCertificate(cancelled, context).validity, "status_requires_review");
});
