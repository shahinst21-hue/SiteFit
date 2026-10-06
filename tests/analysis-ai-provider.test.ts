import assert from "node:assert/strict";
import test from "node:test";
import { analysisAIProvider, analysisAI } from "../lib/analysis/ai-provider.ts";
function response() { return Response.json({ status: "completed", model: "gpt-6.1-sol", output: [{ type: "message", content: [{ type: "output_text", text: '{"result":"fixture"}' }] }], usage: { input_tokens: 100, output_tokens: 20 } }); }
test("AI transport uses owner model, bounded structured output, no storage/tools/retries and safe usage receipt", async () => {
  let calls = 0;
  const provider = analysisAIProvider({ key: "sk-synthetic-fixture", fetch: async (url, init) => {
    calls++; assert.equal(url, "https://api.openai.com/v1/responses");
    const body = JSON.parse(String(init?.body)); assert.equal(body.model, "gpt-6.1-sol"); assert.equal(body.store, false);
    assert.equal(body.reasoning.effort, "low"); assert.equal(body.text.format.strict, true); assert.equal(body.tools, undefined);
    assert.equal(body.max_output_tokens, analysisAI.maxOutputTokens); return response();
  } });
  const result = await provider.interpret({ businessType: "coffee-shop", evidence: [] }, "Synthetic test", { type: "object" });
  assert.deepEqual(result.output, { result: "fixture" }); assert.equal(result.receipt.outputTokens, 20);
  assert.equal(result.receipt.packetDigest.length, 64); assert.equal(calls, 1);
  assert.ok(!JSON.stringify(result).includes("sk-synthetic"));
});
test("oversized or identifying packets cannot dispatch and eight calls is an absolute per-analysis bound", async () => {
  let calls = 0; const provider = analysisAIProvider({ key: "sk-fixture", fetch: async () => { calls++; return response(); } });
  for (const packet of [{ formattedAddress: "private" }, { email: "private" }, { text: "x".repeat(12_001) }])
    await assert.rejects(provider.interpret(packet, "fixture", {}), /invalid_packet/);
  assert.equal(calls, 0);
  await assert.rejects(provider.interpret({}, "x".repeat(4001), {}), /invalid_packet/);
  await assert.rejects(provider.interpret({}, "fixture", { text: "x".repeat(4001) }), /invalid_packet/);
  assert.equal(calls, 0);
  for (let index = 0; index < 8; index++) await provider.interpret({}, "fixture", {});
  await assert.rejects(provider.interpret({}, "fixture", {}), /dispatch_limit/); assert.equal(calls, 8);
});
test("resume preserves the dispatch ceiling and keeps immutable usage receipts", async () => {
  let calls = 0;
  const provider = analysisAIProvider({ key: "sk-fixture", priorDispatches: 7, fetch: async () => { calls++; return response(); } });
  await provider.interpret({}, "fixture", {});
  assert.equal(provider.receipts()[0].dispatch, 8);
  const receipts = provider.receipts(); receipts[0].inputTokens = 999;
  assert.equal(provider.receipts()[0].inputTokens, 100);
  await assert.rejects(provider.interpret({}, "fixture", {}), /dispatch_limit/);
  assert.equal(calls, 1);
  assert.throws(() => analysisAIProvider({ priorDispatches: 9 }), /dispatch_limit/);
});
test("provider errors never expose response secrets or silently retry/switch model", async () => {
  let calls = 0; const provider = analysisAIProvider({ key: "sk-fixture", fetch: async () => { calls++; return new Response("private provider error", { status: 429 }); } });
  await assert.rejects(provider.interpret({}, "fixture", {}), error => error instanceof Error && error.message === "provider_unavailable");
  assert.equal(calls, 1);
  const wrong = analysisAIProvider({ key: "sk-fixture", fetch: async () => Response.json({ status: "completed", model: "other", output: [] }) });
  await assert.rejects(wrong.interpret({}, "fixture", {}), /invalid_response/);
  const oversized = analysisAIProvider({ key: "sk-fixture", fetch: async () => new Response("x".repeat(128_001), { headers: { "Content-Type": "application/json" } }) });
  await assert.rejects(oversized.interpret({}, "fixture", {}), /invalid_response/);
});
