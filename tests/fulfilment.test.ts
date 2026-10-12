import { test } from "node:test";
import assert from "node:assert/strict";
import { completion, developmentFulfilment, progressLabel } from "../lib/fulfilment/policy.ts";
import { runnerAuthorised } from "../lib/fulfilment/auth.ts";
import { fulfilOne } from "../lib/fulfilment/worker.ts";
import type { Job, fulfilmentRepository } from "../lib/fulfilment/repository.ts";
import type { StoredEdition, fullRepository } from "../lib/report-intelligence/repository.ts";
import type { generateFullIntelligence } from "../lib/report-intelligence/generate.ts";
const job: Job = { id: "00000000-0000-4000-8000-000000000001", ownerId: "00000000-0000-4000-8000-000000000002",
  freeReportId: "00000000-0000-4000-8000-000000000003", reportId: "00000000-0000-4000-8000-000000000004", token: "00000000-0000-4000-8000-000000000005" };
function fixture(status = "draft", dispatches: { state: string }[] = []) {
  let claimed = false; let calls = 0; const finished: unknown[] = [];
  const edition = { id: job.reportId, status, revision: 0, checkpoint: { dispatches } } as StoredEdition;
  const queue = { async claim() { if (claimed) return null; claimed = true; return job; }, async bind() {},
    async finish(_job: Job, outcome: unknown) { finished.push(outcome); } } as unknown as ReturnType<typeof fulfilmentRepository>;
  const reports = () => ({ async read() { return edition; }, async start() { throw Error("unexpected reservation"); } }) as unknown as ReturnType<typeof fullRepository>;
  const generate = (async () => { calls++; return { ...edition, status: "ready" }; }) as unknown as typeof generateFullIntelligence;
  return { queue, reports, generate, calls: () => calls, finished };
}
test("runner denies absent/wrong secrets and Production regardless of flags", () => {
  const secret = "a".repeat(64);
  assert.equal(runnerAuthorised(`Bearer ${secret}`, secret), true);
  assert.equal(runnerAuthorised(`Bearer ${"b".repeat(64)}`, secret), false);
  assert.equal(runnerAuthorised(null, secret), false);
  assert.equal(runnerAuthorised("Bearer short", "short"), false);
  assert.equal(developmentFulfilment({ SITEFIT_FULFILMENT_ENABLED: "1", VERCEL_ENV: "production" }, "localhost"), false);
  assert.equal(developmentFulfilment({ SITEFIT_FULFILMENT_ENABLED: "1" }, "attacker.invalid"), false);
  assert.equal(developmentFulfilment({ SITEFIT_FULFILMENT_ENABLED: "1", VERCEL_ENV: "preview" }, "preview.vercel.app"), true);
});
test("disabled paid execution neither starts an edition nor invokes inference", async () => {
  const f = fixture(); assert.equal(await fulfilOne(f), "awaiting_authorisation");
  assert.equal(f.calls(), 0); assert.deepEqual(f.finished, [{ state: "awaiting_authorisation", reason: "budget_unavailable" }]);
});
test("duplicate workers perform one generation; ready reopening performs none", async () => {
  const f = fixture(); const result = await Promise.all([fulfilOne({ ...f, paidExecutionApproved: true }), fulfilOne({ ...f, paidExecutionApproved: true })]);
  assert.deepEqual(result.sort(), ["idle", "ready"]); assert.equal(f.calls(), 1);
  const ready = fixture("ready"); assert.equal(await fulfilOne(ready), "ready"); assert.equal(ready.calls(), 0);
});
test("unknown and rejected dispatches stop without repair or retry", async () => {
  for (const state of ["intent", "ambiguous", "invalid"]) {
    const f = fixture("draft", [{ state }]); assert.equal(await fulfilOne({ ...f, paidExecutionApproved: true }), "intervention");
    assert.equal(f.calls(), 0); assert.equal((f.finished[0] as { reason: string }).reason, state === "invalid" ? "validation_failed" : "dispatch_ambiguous");
    const disabled = fixture("draft", [{ state }]);
    assert.equal(await fulfilOne(disabled), "intervention", "an existing ambiguous/invalid execution remains intervention even when new spending is disabled");
  }
  assert.equal(completion("draft", []).reason, "execution_interrupted");
  assert.match(progressLabel("intervention"), /retained/); assert.doesNotMatch(progressLabel("running"), /%|minute/);
});

test("worker exception persists intervention without exposing the private failure or retrying", async () => {
  const f = fixture(); let calls = 0;
  const generate = (async () => { calls++; throw Error("private provider response must not escape"); }) as typeof generateFullIntelligence;
  assert.equal(await fulfilOne({ ...f, generate, paidExecutionApproved: true }), "intervention");
  assert.equal(await fulfilOne({ ...f, generate, paidExecutionApproved: true }), "idle");
  assert.equal(calls, 1); assert.deepEqual(f.finished, [{ state: "intervention", reason: "execution_interrupted" }]);
});


test("lease or entitlement loss between dispatches prevents a second provider execution", async () => {
  const f = fixture(); let bindings = 0, paidCalls = 0;
  const queue = { ...f.queue, async bind() { bindings++; if (bindings === 3) throw Error("entitlement_revoked"); } };
  const provider = { async interpret() { paidCalls++; return { state: "received", output: {}, receipt: {} }; } };
  const generate = (async (_owner, _report, options) => {
    await options!.provider!.interpret({} as never, {}, "", {});
    await options!.provider!.interpret({} as never, {}, "", {});
    throw Error("must not reach Ready");
  }) as typeof generateFullIntelligence;
  assert.equal(await fulfilOne({ ...f, queue, provider: provider as never, generate, paidExecutionApproved: true }), "intervention");
  assert.equal(paidCalls, 1);
  assert.deepEqual(f.finished, [{ state: "intervention", reason: "execution_interrupted" }]);
});
