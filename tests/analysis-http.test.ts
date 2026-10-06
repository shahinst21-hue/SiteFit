import assert from "node:assert/strict";
import test from "node:test";
import { ownedGeneration, sameOrigin, submissionBody, validateSubmission } from "../lib/analysis/http.ts";
const input = { propertyId: "00000000-0000-4000-8000-000000000001", businessType: "coffee-shop" as const, nonce: "00000000-0000-4000-8000-000000000002" };
test("submission cannot inject identity, status, address, score or entitlement", () => {
  assert.deepEqual(validateSubmission(input), input);
  for (const forged of [{ ...input, ownerId: "forged" }, { ...input, score: 100 }, { ...input, tier: "full" }, { ...input, nonce: "invalid" }, { ...input, businessType: "invented" }]) assert.throws(() => validateSubmission(forged));
});
test("origin and streaming byte limits reject cross-site and oversized bodies", async () => {
  const request = new Request("https://sitefit.example/api/analyses/generate", { method: "POST", headers: { Origin: "https://sitefit.example", "Content-Type": "application/json" }, body: JSON.stringify(input) });
  assert.equal(sameOrigin(request), true); assert.deepEqual(await submissionBody(request), input);
  assert.equal(sameOrigin(new Request("https://sitefit.example/api/analyses/generate", { headers: { Origin: "https://evil.example" } })), false);
  await assert.rejects(submissionBody(new Request("https://sitefit.example", { method: "POST", headers: { "Content-Type": "application/json" }, body: "x".repeat(513) })), /invalid_submission/);
});
test("same-process duplicate intent coalesces; conflicting work cannot take a second slot", async () => {
  let calls = 0; let release!: () => void;
  const hold = new Promise<void>(resolve => { release = resolve; });
  const run = async () => { calls++; await hold; return { reportId: input.propertyId, replay: false }; };
  const first = ownedGeneration("fixture-owner", input, run);
  const second = ownedGeneration("fixture-owner", input, run);
  assert.equal(first, second);
  assert.throws(() => ownedGeneration("fixture-owner", { ...input, businessType: "restaurant" }, run), /generation_busy/);
  release(); await first; assert.equal(calls, 1);
});
