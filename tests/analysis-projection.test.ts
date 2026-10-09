import assert from "node:assert/strict";
import test from "node:test";
import { validateFreeProjection, type FreeProjection } from "../lib/analysis/projection.ts";
import { readFile } from "node:fs/promises";
import { snapshotFromStored, validateSnapshotView } from "../lib/snapshot/model.ts";
function fixture(): FreeProjection { return { schemaVersion: 2, analysisId: "00000000-0000-4000-8000-000000000001", generatedAt: "2026-10-06T12:00:00Z", property: { address: "Fictional very long test address, London", resolution: "provider_verified", precision: "postcode_centroid" }, businessType: "coffee-shop",
  earlyView: { headline: "The customer case remains open.", reason: "Current demand is unmeasured.", meaning: "conditional", strength: "limited", keyQuestions: ["Demand", "Permitted use"], coverage: "Dated and partial sources" },
  dimensions: (["customer-base", "market-position", "customer-access", "premises"] as const).map(id => ({ id, title: "fixture", conclusion: "More evidence needed.", reason: "Important checks were not run.", strength: "insufficient", meaning: "no_basis", score: null, scoreNote: "Score needs relevant evidence.", question: "What could change the case?", implication: "The case remains untested.", why: { support: [], opposition: ["Missing evidence"], alternatives: [], unknowns: ["Unverified"], observations: [], comparison: null, sources: [] } })) }; }
test("safe projection strips private/full/AI fields and rejects fabricated numeric scores", () => {
  const input = { ...fixture(), fullReport: "private", secretKey: "synthetic", provenance: { prompt: "private" } };
  const safe = validateFreeProjection(input);
  assert.equal(JSON.stringify(safe).includes("private"), false); assert.equal(JSON.stringify(safe).includes("synthetic"), false);
  for (const value of [NaN, 101, -1, 12.5]) { const forged = fixture(); forged.dimensions[0].score = value; assert.throws(() => validateFreeProjection(forged)); }
  const attack = fixture(); attack.dimensions[0].conclusion = "<script>attack</script>"; assert.throws(() => validateFreeProjection(attack));
});
test("customer read route contains only stored projection access, never analytical execution", async () => {
  const code = await readFile(new URL("../app/snapshots/[id]/page.tsx", import.meta.url), "utf8");
  assert.ok(code.includes('rpc("read_sitefit_free"'));
  for (const importName of ["generateSnapshot", "framework(", "residentialMetric(", "analysisAIProvider(", "synthesiseSections("]) assert.ok(!code.includes(importName));
  const ui = await readFile(new URL("../components/free-snapshot.tsx", import.meta.url), "utf8");
  assert.ok(ui.includes("Why this result?")); assert.ok(!ui.includes("SnapshotFinancePreview")); assert.ok(ui.includes("Qualified commercial rental context")); assert.ok(!ui.includes("Financial scenarios and daily transactions")); assert.ok(ui.includes("Purchasing is not enabled"));
  assert.ok(!ui.includes("Economics optional"));
});

test("enriched stored projection preserves holes, disconnected parts and no-route nulls without forwarding raw fields", async () => {
  const outer = [[-.11,51.49],[-.09,51.49],[-.09,51.51],[-.11,51.51],[-.11,51.49]];
  const hole = [[-.105,51.495],[-.095,51.495],[-.095,51.505],[-.105,51.505],[-.105,51.495]];
  const input = {...fixture(), schemaVersion: 3, spatial: {schemaVersion: 1,
    origin: {longitude: -.1, latitude: 51.5, crs: "EPSG:4326", precision: "building", source: "synthetic"},
    catchments: [300,600,900].map(seconds => ({seconds, geometry: {type: "MultiPolygon", coordinates: [[outer,hole]]}})),
    stations: [{id: "synthetic-station", name: "Synthetic station", mode: "rail", point: {longitude: -.1, latitude: 51.5, crs: "EPSG:4326", precision: "building", source: "synthetic"}, seconds: null, metres: null, outcome: "no_route"}],
    notices: ["Synthetic fixture"], references: ["https://example.org/synthetic"], limitations: ["Unconfirmed entrance"]},
    privateProviderBody: "forbidden"};
  const safe = validateFreeProjection(input), view = validateSnapshotView(snapshotFromStored(safe), "production");
  assert.equal(view.map.status, "available"); assert.equal(view.map.layers[1].polygonParts![0].length, 2);
  assert.equal(view.transport.places[0].status, "unavailable"); assert.equal(view.transport.places[0].walkingMinutes, null);
  assert.ok(!JSON.stringify(safe).includes("forbidden"));
  const broken = structuredClone(input); broken.spatial.stations[0].seconds = 0 as unknown as null;
  assert.throws(() => validateFreeProjection(broken));
  const open = structuredClone(input); open.spatial.catchments[0].geometry.coordinates[0][0].pop();
  assert.throws(() => validateFreeProjection(open));
  assert.ok((await readFile(new URL("../components/snapshot-map.tsx", import.meta.url), "utf8")).includes('fillRule="evenodd"'));
});
