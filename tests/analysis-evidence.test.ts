import assert from "node:assert/strict";
import test from "node:test";
import { evidenceIndex, requireClaimEvidence, validateEvidence, type Evidence } from "../lib/analysis/evidence.ts";
const analysisId = "00000000-0000-4000-8000-000000000001";
const inputId = "00000000-0000-4000-8000-000000000002";
const firstId = "00000000-0000-4000-8000-000000000003";
const secondId = "00000000-0000-4000-8000-000000000004";
const now = new Date("2026-10-06T12:00:00Z");
function fixture(): Evidence { return { schemaVersion: 1, id: firstId, analysisId, inputId, snapshotId: null,
  sections: ["customer-base"], source: { provider: "ONS", dataset: "TS001", releaseId: "pinned", reference: "Census 2021", adapterVersion: "v1" },
  sourceClass: "official_public", kind: "measured", scope: "Census output area", value: 300, units: "usual residents", retrievedAt: now.toISOString(), effectiveAt: "2021-03-21",
  geography: { precision: "postcode_centroid", crs: "EPSG:4326", scope: "OA", method: "centroid_proxy" },
  quality: { available: true, partial: false, freshness: "stale", limitations: ["Not current customer demand"] }, parents: [], observationIds: ["population"],
  licence: { policyId: "ons-ogl", version: 1, representationAllowed: true, expiresAt: null, notices: ["Contains public sector information licensed under OGL"] } }; }
test("evidence validates runtime shape and freezes lineage operands", () => {
  const item = fixture(); validateEvidence(item);
  const index = evidenceIndex([item], analysisId, inputId, now);
  item.value = 999; assert.equal(index.get(firstId)?.value, 300);
  assert.throws(() => validateEvidence({ ...fixture(), invented: true }));
  assert.throws(() => validateEvidence({ ...fixture(), value: NaN }));
});
test("wrong ownership/input, duplicate IDs and expired licences are rejected", () => {
  for (const item of [{ ...fixture(), analysisId: secondId }, { ...fixture(), inputId: secondId },
    { ...fixture(), licence: { ...fixture().licence, representationAllowed: false } },
    { ...fixture(), licence: { ...fixture().licence, expiresAt: now.toISOString() } }])
    assert.throws(() => evidenceIndex([item], analysisId, inputId, now));
  assert.throws(() => evidenceIndex([fixture(), fixture()], analysisId, inputId, now));
});
test("derived evidence needs acyclic, same-context parents", () => {
  assert.throws(() => evidenceIndex([{ ...fixture(), kind: "derived" }], analysisId, inputId, now));
  assert.throws(() => evidenceIndex([{ ...fixture(), parents: [secondId] }], analysisId, inputId, now));
  assert.throws(() => evidenceIndex([{ ...fixture(), parents: [firstId] }], analysisId, inputId, now));
  assert.throws(() => evidenceIndex([{ ...fixture(), parents: [secondId] }, { ...fixture(), id: secondId, parents: [firstId] }], analysisId, inputId, now));
  assert.equal(evidenceIndex([fixture(), { ...fixture(), id: secondId, kind: "derived", parents: [firstId] }], analysisId, inputId, now).size, 2);
});
test("real IDs cannot support unrelated sections or turn missing capability into local absence", () => {
  const index = evidenceIndex([fixture()], analysisId, inputId, now);
  requireClaimEvidence(index, "customer-base", [firstId], "local_fact");
  assert.throws(() => requireClaimEvidence(index, "premises", [firstId], "local_fact"));
  assert.throws(() => requireClaimEvidence(index, "customer-base", [secondId], "local_fact"));
  const capability = evidenceIndex([{ ...fixture(), kind: "capability", quality: { ...fixture().quality, available: false } }], analysisId, inputId, now);
  requireClaimEvidence(capability, "customer-base", [firstId], "availability");
  assert.throws(() => requireClaimEvidence(capability, "customer-base", [firstId], "local_fact"));
  assert.throws(() => requireClaimEvidence(capability, "customer-base", [firstId], "inference"));
});
