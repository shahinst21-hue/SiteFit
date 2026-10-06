import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { emptyMetric, metricValue, scoreIsDisplayable, snapshotFromStored, validateSnapshotView } from "../lib/snapshot/model.ts";
import { snapshotDemo } from "../lib/snapshot/demo.ts";
import { validateFreeProjection } from "../lib/analysis/projection.ts";
const example = JSON.parse(await readFile(new URL("../fixtures/free_snapshot/kingston_coffee_shop.json", import.meta.url), "utf8"));

test("fixture mode is explicit and rejected outside development; no production fallback", () => {
  assert.equal(snapshotDemo(example, "development", undefined).mode, "demo");
  for (const env of ["production", "test", undefined]) assert.throws(() => snapshotDemo(example, env, undefined), /demo_disabled/);
  assert.throws(() => validateSnapshotView(example, "production"));
});
test("nullable values retain meaningful states and observed zero, including missing whole factors", () => {
  for (const scenario of ["missing-metric", "missing-section", "unknown", "loading", "locked"]) assert.doesNotThrow(() => snapshotDemo(example, "development", scenario));
  assert.equal(snapshotDemo(example, "development", "missing-section").factors.length, 3);
  assert.equal(metricValue({ ...emptyMetric("x", "Observation"), status: "available", value: 0 }), "0");
  assert.equal(metricValue({ ...emptyMetric("x", "Observation"), status: "available" }), "Unknown");
  for (const [state, expected] of [["unknown", "Unknown"], ["unavailable", "Not available"], ["locked", "Full Report"], ["loading", "Loading"], ["not_applicable", "Not applicable"]] as const) assert.equal(metricValue(emptyMetric("x", "Observation", state)), expected);
  const forged = structuredClone(example); forged.factors[0].metrics[0].status = "unknown";
  assert.throws(() => validateSnapshotView(forged, "demo"), /invalid_snapshot_metric/);
});
test("overall score requires all factors, complete weights, references, method and consistent numeric outcome", () => {
  const score = validateSnapshotView(example, "demo").overallAssessment.score;
  assert.ok(scoreIsDisplayable(score));
  for (const value of [null, -1, NaN, 101, 12.5, 99]) assert.equal(scoreIsDisplayable({ ...score, value }), false);
  const missing = structuredClone(score); missing.method!.components.pop(); assert.equal(scoreIsDisplayable(missing), false);
  const factorMissing = structuredClone(example); factorMissing.factors.pop(); assert.throws(() => validateSnapshotView(factorMissing, "demo"));
  const weights = structuredClone(score); weights.method!.components[0].weight = 60; assert.equal(scoreIsDisplayable(weights), false);
  const refs = structuredClone(score); refs.method!.components[0].evidenceReferences = []; assert.equal(scoreIsDisplayable(refs), false);
  const model = structuredClone(score); model.method!.aiModel = null; assert.equal(scoreIsDisplayable(model), false);
});
test("actual stored projection maps without demo metrics, scoring, geometry or financial assumptions", () => {
  const report = validateFreeProjection({ schemaVersion: 2, analysisId: "00000000-0000-4000-8000-000000000001", generatedAt: "2026-10-06T12:00:00Z",
    property: { address: "Actual stored property", resolution: "provider_verified", precision: "postcode_centroid" }, businessType: "coffee-shop",
    earlyView: { headline: "Stored historical finding", reason: "Stored reason", meaning: "conditional", strength: "limited", keyQuestions: ["Unverified use"], coverage: "Dated partial evidence" },
    dimensions: (["customer-base", "market-position", "customer-access", "premises"] as const).map(id => ({ id, title: "stored", conclusion: "Stored conclusion", reason: "Stored reason", strength: "limited", meaning: "conditional", score: null, scoreNote: "Not enough evidence", question: "Open question", implication: "Stored implication", why: { support: [], opposition: ["Stored adverse evidence"], alternatives: [], unknowns: ["Unknown input"], observations: id === "customer-access" ? [{ label: "Observed stops", value: 0, units: "stops", effectiveAt: "2026-10-01", scope: "Defined query" }] : [], comparison: null, sources: [] } })) });
  const before = JSON.stringify(report);
  const view = validateSnapshotView(snapshotFromStored(report), "production");
  assert.equal(view.property.address, "Actual stored property"); assert.equal(view.overallAssessment.headline, "Stored historical finding");
  assert.equal(view.overallAssessment.score.value, null); assert.equal(view.map.bounds, null); assert.deepEqual(view.transport.places, []);
  assert.equal(view.factors[2].metrics[0].value, 0); assert.equal(view.factors[0].metrics[0].value, null);
  assert.deepEqual(view.factors[0].details!.opposition, ["Stored adverse evidence"]);
  assert.deepEqual(Object.values(view.financialPreview.inputs), [null, null, null]); assert.equal(JSON.stringify(report), before);
  assert.ok(!JSON.stringify(view).includes("12400")); assert.ok(!JSON.stringify(view).includes("Kingston Station"));
});
test("invalid finite metrics and map geometry are rejected at the normalised boundary", () => {
  for (const value of [NaN, Infinity, -1]) { const row = structuredClone(example); row.factors[0].metrics[0].value = value; assert.throws(() => validateSnapshotView(row, "demo")); }
  const map = structuredClone(example); map.map.layers[0].points = [[NaN, 51]]; assert.throws(() => validateSnapshotView(map, "demo"));
});
test("client map/finance props strip arbitrary provider metadata", () => {
  const injected = structuredClone(example); injected.map.rawResponse = "synthetic-private"; injected.map.layers[0].apiCredential = "synthetic-private"; injected.financialPreview.session = "synthetic-private";
  const safe = validateSnapshotView(injected, "demo");
  assert.ok(!JSON.stringify(safe.map).includes("synthetic-private")); assert.ok(!JSON.stringify(safe.financialPreview).includes("synthetic-private"));
});
