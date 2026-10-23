import assert from "node:assert/strict";
const origin = process.argv[2] ?? "http://localhost:3000";
const production = process.argv[3] === "production";
const states = ["", "missing-metric", "missing-section", "unknown", "loading", "locked"];
for (const state of states) {
  const response = await fetch(`${origin}/dev/snapshot${state ? `?state=${state}` : ""}`, { signal: AbortSignal.timeout(30000) });
  if (production) { assert.equal(response.status, 404); const html = await response.text(); assert.ok(!html.includes("Unit 1, Hutton House")); continue; }
  assert.equal(response.status, 200); const html = await response.text();
  assert.ok(html.includes("Development demo")); assert.equal((html.match(/id="factor-/g) ?? []).length, 4);
  assert.ok(html.includes("Full Report purchasing is not open yet")); assert.ok(html.includes("Ask SiteFit"));
  assert.ok(!html.includes('sf-score-ring')&&!html.includes('sf-score-ready'));
  if (state === "missing-section") assert.ok(html.includes("This part of the case is still open."));
  if (state === "loading") assert.ok(html.includes('aria-busy="true"'));
  if (!state) assert.ok(html.includes("12,400") && html.includes("Kingston Station"));
}
console.log(`PASS: six Snapshot rendering states${production ? " blocked in production" : " served explicitly in development"}.`);
const rehearsal = await fetch(`${origin}/dev/snapshot?state=journey`);
assert.equal(rehearsal.status, production ? 404 : 200);
const rehearsalHtml = await rehearsal.text();
if (production) assert.ok(!rehearsalHtml.includes('Interface rehearsal'));
else {
  assert.ok(rehearsalHtml.includes('Interface rehearsal'));
  assert.ok(rehearsalHtml.includes('Start with your property.'));
  assert.ok(!rehearsalHtml.includes('What would you open here?'));
  assert.ok(!rehearsalHtml.includes('Get my Free Snapshot'));
}
console.log('PASS: synthetic journey is labelled, starts with one active stage, and is denied in Production.');
