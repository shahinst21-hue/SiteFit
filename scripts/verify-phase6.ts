// Explicit local development proof; never run in CI or against Production.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import nextEnv from "@next/env";
import { frameworkClient } from "../lib/data/server-client.ts";
import { validateFreeProjection } from "../lib/analysis/projection.ts";
import { generateSnapshot } from "../lib/analysis/generate.ts";
import { packetDigest } from "../lib/analysis/canonical.ts";
nextEnv.loadEnvConfig(process.cwd(), true);
assert.equal(process.env.PHASE6_PROBES_ENABLED, "true");
assert.equal(new URL(process.env.SUPABASE_URL ?? "").hostname, "idlsjusbrmyucccostxt.supabase.co");
assert.ok(process.env.OPENAI_API_KEY && !process.env.CI && !process.env.VERCEL);
const origin = "http://localhost:3000";
const cases = [
  { name: "inner-coffee", postcode: "EC1N 7TE", match: /Pru.?rock|23-25.*Leather/i, business: "coffee-shop" },
  { name: "outer-coffee", postcode: "KT1 1RW", match: /Gail|3-5.*Church/i, business: "coffee-shop" },
  { name: "inner-restaurant", postcode: "WC2H 9FB", match: /Dishoom|12.*Upper St/i, business: "restaurant" },
  { name: "outer-restaurant", postcode: "W5 2NX", match: /Rosa|33.*Haven/i, business: "restaurant" },
  { name: "inner-salon", postcode: "N16 8BH", match: /Blue\s?tit|^7[, ].*Stoke/i, business: "hair-salon" },
  { name: "outer-salon", postcode: "KT3 4QF", match: /Headmasters|28.*Coombe/i, business: "beauty-salon" },
];
const client = frameworkClient();
// Conservative allowance for the initial separately recorded development diagnostics.
let verificationCostUpper = 0.30;
const proof: { fixture: string; incrementalAIPriceEstimateUSD: number }[] = existsSync("supabase/.temp/phase6-live-proof.json") ? JSON.parse(readFileSync("supabase/.temp/phase6-live-proof.json", "utf8")) : [];
verificationCostUpper += proof.reduce((sum, item) => sum + item.incrementalAIPriceEstimateUSD, 0);
for (const candidate of cases) {
  if (proof.some(item => item.fixture === candidate.name)) continue;
  assert.ok(verificationCostUpper + 0.52 <= 1, "Remaining approved budget cannot bound another analysis");
  const cookies = new Map<string, string>();
  async function request(route: string, body?: object) {
    const response = await fetch(origin + route, { method: body ? "POST" : "GET", redirect: "manual",
      headers: { Origin: origin, "Content-Type": "application/json", Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; ") },
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(125000) });
    for (const cookie of response.headers.getSetCookie()) { const part = cookie.split(";")[0]; const at = part.indexOf("="); cookies.set(part.slice(0, at), part.slice(at + 1)); }
    return response;
  }
  const lookup = await request("/api/addresses/lookup", { postcode: candidate.postcode });
  assert.equal(lookup.status, 200, `${candidate.name}: lookup HTTP status`);
  const results = await lookup.json() as { candidates: { label: string; reference: string }[] };
  const selected = results.candidates.find(item => candidate.match.test(item.label));
  if (!selected) { console.log(JSON.stringify({ fixture: candidate.name, stage: "candidate_not_returned", candidateLabels: results.candidates.map(item => item.label) })); continue; }
  const resolved = await request("/api/addresses/resolve", { reference: selected.reference });
  assert.equal(resolved.status, 200, `${candidate.name}: resolve HTTP status`);
  const { property } = await resolved.json() as { property: { id: string } };
  const nonce = randomUUID(); const submission = { propertyId: property.id, businessType: candidate.business, nonce };
  const started = Date.now(); const response = await request("/api/analyses/generate", submission);
  assert.equal(response.status, 200, `${candidate.name}: generation HTTP status`);
  const { reportId } = await response.json() as { reportId: string };
  const { data: report, error } = await client.from("reports").select("id,analysis_id,free_projection,provenance,status").eq("id", reportId).single();
  assert.ok(!error && report?.status === "ready");
  const projection = validateFreeProjection(report.free_projection);
  assert.ok(projection.dimensions.every(section => section.score === null));
  assert.equal(projection.dimensions.length, 4);
  assert.ok(projection.dimensions.every(section => section.why.opposition.length && section.why.unknowns.length));
  const audit = report.provenance as { ai: { receipts: { inputTokens: number; outputTokens: number; returnedModel: string }[]; dispatches: number } };
  assert.ok(audit.ai.receipts.every(receipt => receipt.returnedModel.startsWith("gpt-6.1-sol")));
  const cost = audit.ai.receipts.reduce((sum, receipt) => sum + receipt.inputTokens * 2 / 1000000 + receipt.outputTokens * 10 / 1000000, 0);
  verificationCostUpper += cost;
  const html = await request(`/snapshots/${reportId}`); assert.equal(html.status, 200);
  assert.ok(html.headers.get("cache-control")?.includes("no-store"));
  const htmlText = await html.text(); assert.ok(htmlText.includes("Why this result?") && htmlText.includes("Run Financial Analysis"));
  for (const name of ["OPENAI_API_KEY", "SUPABASE_SECRET_KEY", "POSTIO_API_KEY", "TFL_APP_KEY"]) {
    const secret = process.env[name]; if (secret) assert.ok(!htmlText.includes(secret), "Privileged value detected; withheld");
  }
  const { data: analysis } = await client.from("analyses").select("owner_id").eq("id", report.analysis_id).single(); assert.ok(analysis);
  let forbiddenCalls = 0; const originalFetch = globalThis.fetch;
  globalThis.fetch = async (...args) => {
    const url = String(args[0]);
    if (/api\.openai\.com|api\.tfl\.gov\.uk|api\.ratings\.food\.gov\.uk/.test(url)) { forbiddenCalls++; throw new Error("Ready replay attempted provider retrieval"); }
    return originalFetch(...args);
  };
  try { const replay = await generateSnapshot(analysis.owner_id, property.id, candidate.business, nonce); assert.equal(replay.reportId, reportId); assert.equal(replay.replay, true); }
  finally { globalThis.fetch = originalFetch; }
  assert.equal(forbiddenCalls, 0);
  const replayHttp = await request("/api/analyses/generate", submission); assert.equal(replayHttp.status, 200); assert.equal((await replayHttp.json()).reportId, reportId);
  const { data: after } = await client.from("reports").select("free_projection,provenance").eq("id", reportId).single();
  assert.equal(packetDigest(after), packetDigest({ free_projection: report.free_projection, provenance: report.provenance }));
  const result = { fixture: candidate.name, reportId, analysisId: report.analysis_id, generationMs: Date.now() - started,
    incrementalAIPriceEstimateUSD: cost, verificationCostUpperUSD: verificationCostUpper, forbiddenReadyProviderCalls: forbiddenCalls,
    conclusions: projection.dimensions.map(section => ({ dimension: section.id, conclusion: section.conclusion, meaning: section.meaning, strength: section.strength, score: section.score })),
    headline: projection.earlyView.headline };
  proof.push(result); writeFileSync("supabase/.temp/phase6-live-proof.json", JSON.stringify(proof, null, 2)); console.log(JSON.stringify(result));
}
assert.equal(proof.length, 6, "All six selected commercial fixtures must be verified; missing fixtures are not waived");
console.log("PASS: six controlled London selections, live model, owned ready persistence and zero-provider historical replay");
