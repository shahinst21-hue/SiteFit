import { test } from "node:test";
import assert from "node:assert/strict";
import { enrichmentRepository } from "../lib/data/enrichment-repository.ts";
import type { PolygonGeometry } from "../lib/spatial/polygon.ts";
const id = "248a9600-59cb-4fbe-9791-d64f9cb28aa1";
const releases = () => ({ geographyReleaseId: id, nativeReleaseId: id, censusReleaseId: id, incomeReleaseId: id,
  bresReleaseId: id, placesReleaseId: id, conservationReleaseId: id, article4ReleaseId: id });
const polygon: PolygonGeometry = { type: "Polygon", coordinates: [[[-.1,51.5],[-.09,51.5],[-.09,51.51],[-.1,51.5]]] };
const point = { longitude: -.1, latitude: 51.5, crs: "EPSG:4326" as const, precision: "building" as const, source: "os-open-uprn" };
test("source read boundary freezes releases and preserves independent outcomes without clearances", async () => {
  const vector = releases(), calls: string[] = [];
  const repository = enrichmentRepository(vector, { read: async (name, args, signal) => {
    calls.push(name); assert.equal(signal.aborted, false);
    assert.equal("p_release_id" in args && args.p_release_id, id);
    if (name === "lookup_sitefit_place_operands") throw new Error("private diagnostic must not escape");
    return { releaseId: id, dataset: "conservation-area", features: [], coverage: "published_features_coverage_unconfirmed",
      absenceIsClearance: false, spatialBasis: "address_building_point_not_premises_extent" };
  } });
  vector.conservationReleaseId = "changed";
  const outcomes = await Promise.allSettled([repository.places(polygon), repository.constraints("conservation-area", point)]);
  assert.equal(outcomes[0].status, "rejected"); assert.equal(outcomes[1].status, "fulfilled");
  if (outcomes[0].status === "rejected") assert.equal(outcomes[0].reason.message, "provider_unavailable");
  if (outcomes[1].status === "fulfilled") {
    assert.equal(outcomes[1].value.releaseId, id); assert.equal(outcomes[1].value.permittedUseConfirmed, false);
  }
  assert.equal(calls.length, 2);
});
test("invalid geometry, coarse point and cancellation spend no queries; missing/oversized responses are unavailable", async () => {
  let calls = 0;
  const repository = enrichmentRepository(releases(), { read: async () => { calls++; return null; } });
  await assert.rejects(repository.constraints("conservation-area", { ...point, precision: "postcode_centroid" }));
  await assert.rejects(repository.places({ ...polygon, coordinates: [] }));
  await assert.rejects(repository.catchment(polygon, 0));
  await assert.rejects(repository.places(polygon, AbortSignal.abort()));
  assert.equal(calls, 0);
  await assert.rejects(repository.places(polygon), /dataset_missing/); assert.equal(calls, 1);
  const oversized = enrichmentRepository(releases(), { read: async () => ({ diagnostic: "x".repeat(2_000_001) }) });
  await assert.rejects(oversized.places(polygon), /invalid_response/);
  assert.throws(() => enrichmentRepository({ ...releases(), placesReleaseId: "bad" }, { read: async () => null }));
});
