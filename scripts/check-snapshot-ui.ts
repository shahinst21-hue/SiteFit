import assert from "node:assert/strict";
const origin = process.argv[2] ?? "http://localhost:3000";
const production = process.argv[3] === "production";
const states = ["", "missing-metric", "missing-section", "unknown", "loading", "locked"];
for (const state of states) {
  const response = await fetch(`${origin}/dev/snapshot${state ? `?state=${state}` : ""}`, { signal: AbortSignal.timeout(30000) });
  if (production) { assert.equal(response.status, 404); const html = await response.text(); assert.ok(!html.includes("Unit 1, Hutton House")); continue; }
  assert.equal(response.status, 200); const html = await response.text();
  assert.ok(html.includes("Development demo")); assert.equal((html.match(/class="sf-factor result-/g) ?? []).length, 4);
  assert.ok(html.includes("Purchasing is not enabled")); assert.ok(html.includes("Preview inputs"));
  if (state === "missing-metric" || state === "unknown") assert.ok(html.includes(">Unknown</strong>"));
  if (state === "missing-section") assert.ok(html.includes("No verified metrics available"));
  if (state === "loading") assert.ok(html.includes("Loading location context") && html.includes('aria-busy="true"'));
  if (state === "locked") assert.ok(html.includes("Detailed catchment") && html.includes("sf-metric-locked"));
  if (!state) assert.ok(html.includes("12,400") && html.includes("Kingston Station") && html.includes("sf-score-ready"));
}
console.log(`PASS: six Snapshot rendering states${production ? " blocked in production" : " served explicitly in development"}.`);
