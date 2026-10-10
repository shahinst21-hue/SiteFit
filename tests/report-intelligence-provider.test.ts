import assert from "node:assert/strict";
import { test } from "node:test";
import { fullProvider } from "../lib/report-intelligence/provider.ts";
import { newCheckpoint, reserveDispatch } from "../lib/report-intelligence/execution.ts";

test("malformed/refused paid output retains usage; transport uncertainty cannot become retryable", async () => {
  const packet = { facts: [] }, instructions = "Select admitted claims", schema = {};
  const { dispatch } = reserveDispatch(newCheckpoint({ frozen: true }), "context", packet, instructions, schema);
  let requests = 0;
  const provider = fullProvider({ key: "sk-synthetic", fetch: async (_url, request) => {
    requests++; const body = JSON.parse(String(request?.body));
    assert.equal(body.store, false); assert.equal(body.model, "gpt-6.1-sol"); assert.equal(body.tools, undefined);
    return Response.json({ status: "completed", model: "gpt-6.1-sol", usage: { input_tokens: 50, output_tokens: 10 },
      output: [{ type: "message", content: [{ type: "refusal" }] }] });
  } });
  const result = await provider.interpret(dispatch, packet, instructions, schema);
  assert.equal(result.state, "invalid"); assert.equal(result.receipt?.estimatedMicros, 200); assert.equal(requests, 1);
  const unknown = await fullProvider({ key: "sk-synthetic", fetch: async () => { throw Error("private provider error"); } }).interpret(dispatch, packet, instructions, schema);
  assert.equal(unknown.state, "ambiguous"); assert.equal(unknown.receipt, null);
  assert.doesNotMatch(JSON.stringify(unknown), /private provider/);
});
test("changed binding and oversize requests are rejected without external dispatch", async () => {
  const packet = { facts: [] }, { dispatch } = reserveDispatch(newCheckpoint({}), "context", packet, "", {});
  const provider = fullProvider({ key: "sk-synthetic", fetch: async () => { throw Error("must not send"); } });
  await assert.rejects(provider.interpret(dispatch, { changed: true }, "", {}), /dispatch_binding_invalid/);
  const big = { text: "x".repeat(12_001) }, reserved = reserveDispatch(newCheckpoint({}), "context", big, "", {}).dispatch;
  await assert.rejects(provider.interpret(reserved, big, "", {}), /invalid_packet/);
});
