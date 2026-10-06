import assert from "node:assert/strict";
import test from "node:test";
import { validateFreeProjection, type FreeProjection } from "../lib/analysis/projection.ts";
import { readFile } from "node:fs/promises";
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
  assert.ok(ui.includes("Why this result?")); assert.ok(ui.includes("SnapshotFinancePreview")); assert.ok(ui.includes("Purchasing is not enabled"));
  assert.ok(!ui.includes("Economics optional"));
});
