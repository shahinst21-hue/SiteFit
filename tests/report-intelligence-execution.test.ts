import assert from "node:assert/strict";
import { test } from "node:test";
import { newCheckpoint, reserveDispatch, settleDispatch, recoverCheckpoint, usageMicros } from "../lib/report-intelligence/execution.ts";

test("interruption preserves accepted work and never redispatches a persisted intent", () => {
  let c = reserveDispatch(newCheckpoint({ input: "frozen" }), "context", { facts: [] }, "instructions", {}).checkpoint;
  c = settleDispatch(c, 1, { state: "accepted", output: { selected: [] }, receipt: { inputTokens: 10 } });
  c = reserveDispatch(c, "premises", { facts: [] }, "instructions", {}).checkpoint;
  const recovered = recoverCheckpoint(JSON.parse(JSON.stringify(c)));
  assert.deepEqual(recovered.dispatches[0].output, { selected: [] });
  assert.equal(recovered.dispatches[1].state, "ambiguous");
  assert.throws(() => reserveDispatch(recovered, "premises", {}, "", {}), /dispatch_not_permitted/);
  assert.throws(() => reserveDispatch(recovered, "synthesis", {}, "", {}), /dispatch_not_permitted/);
});
test("synthesis waits for both durable groups; one shared semantic repair and no duplicate settlement", () => {
  let c = newCheckpoint({ input: "frozen" });
  assert.throws(() => reserveDispatch(c, "synthesis", {}, "", {}), /groups_not_accepted/);
  c = reserveDispatch(c, "context", {}, "", {}).checkpoint;
  c = settleDispatch(c, 1, { state: "invalid", receipt: { outputTokens: 100 } });
  c = reserveDispatch(c, "context", {}, "", {}, true).checkpoint;
  c = settleDispatch(c, 2, { state: "accepted", output: {}, receipt: {} });
  assert.throws(() => settleDispatch(c, 2, { state: "accepted", output: { overwrite: true }, receipt: {} }), /already_settled/);
  c = reserveDispatch(c, "premises", {}, "", {}).checkpoint;
  c = settleDispatch(c, 3, { state: "accepted", output: {}, receipt: {} });
  c = reserveDispatch(c, "synthesis", {}, "", {}).checkpoint;
  c = settleDispatch(c, 4, { state: "invalid", receipt: {} });
  assert.throws(() => reserveDispatch(c, "synthesis", {}, "", {}, true), /dispatch_not_permitted/);
});
test("cost records integer microdollars, including reasoning within output", () => {
  assert.equal(usageMicros(20_000, 3_000), 70_000);
  assert.throws(() => usageMicros(1.5, 10), /invalid_usage/);
});
