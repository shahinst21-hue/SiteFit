import assert from "node:assert/strict";
import { test } from "node:test";
import { context, ids, date } from "./fixtures/data/framework.ts";
import { buildAssessment } from "../lib/analysis/assessment.ts";
import { packetDigest } from "../lib/analysis/canonical.ts";
import { buildCatalog, catalogPacket } from "../lib/report-intelligence/catalog.ts";
import { newCheckpoint } from "../lib/report-intelligence/execution.ts";
import { generateFullIntelligence } from "../lib/report-intelligence/generate.ts";
import type { fullRepository, StoredEdition, Preparation } from "../lib/report-intelligence/repository.ts";
import type { fullProvider } from "../lib/report-intelligence/provider.ts";
import { verificationEnabled } from "../lib/report-intelligence/http.ts";
import { suggestedAnswer } from "../lib/report-intelligence/questions.ts";

function store() {
  const a = buildAssessment(context(), [], [], [], null, null, false, [], new Date(date)), catalog = buildCatalog(a, [], new Date(date));
  const preparation: Preparation = { version: "full-preparation-v1", configuration: "full-intelligence-v1", analysisId: ids.analysis,
    inputId: ids.input, assessmentId: ids.property, assessmentDigest: packetDigest(a), catalog, packetDigests: {
      context: packetDigest(catalogPacket(catalog, ["customer-context", "competition", "access"])),
      premises: packetDigest(catalogPacket(catalog, ["premises", "rental-context"])) } };
  let value: StoredEdition = { id: ids.property, analysisId: ids.analysis, inputId: ids.input, revision: 0, status: "draft", preparation,
    checkpoint: newCheckpoint(preparation), projection: null };
  const repo = { async read() { return structuredClone(value); }, async checkpoint(e: StoredEdition, c: StoredEdition["checkpoint"]) {
    assert.equal(e.revision, value.revision); value = { ...value, checkpoint: structuredClone(c), revision: c.revision }; return structuredClone(value);
  }, async freeze(e: StoredEdition, p: unknown) { assert.equal(e.revision, value.revision); value = { ...value, status: "ready", projection: p }; return structuredClone(value); } };
  return { repo: repo as unknown as ReturnType<typeof fullRepository>, value: () => value };
}
test("group failure preserves successes; explicit interrupted recovery cannot redispatch", async () => {
  const db = store(); let calls = 0;
  const provider = { async interpret(d: { group: string }, packet: { sections: string[] }) {
    calls++; if (d.group === "premises") throw Error("process-loss");
    return { state: "received", output: { sections: packet.sections.map(key => ({ key, lead: "unavailable", reasons: [], implications: [], actions: [] })) }, receipt: {} };
  } } as unknown as ReturnType<typeof fullProvider>;
  await generateFullIntelligence(ids.analysis, ids.property, { repository: db.repo, provider });
  assert.equal(db.value().checkpoint.dispatches[0].state, "accepted");
  assert.equal(db.value().checkpoint.dispatches[1].state, "intent");
  await generateFullIntelligence(ids.analysis, ids.property, { repository: db.repo, provider, resume: true });
  assert.equal(db.value().checkpoint.dispatches[1].state, "intent", "active dispatch cannot be cancelled by a concurrent resume");
  db.value().checkpoint.dispatches[1].reservedAt = new Date(Date.now() - 181_000).toISOString();
  await generateFullIntelligence(ids.analysis, ids.property, { repository: db.repo, provider, resume: true });
  assert.equal(db.value().checkpoint.dispatches[1].state, "ambiguous");
  await generateFullIntelligence(ids.analysis, ids.property, { repository: db.repo, provider, resume: true });
  assert.equal(calls, 2); assert.equal(db.value().status, "draft");
});
test("ready replay and deterministic answers never invoke a provider", async () => {
  const db = store(); await db.repo.freeze(db.value(), { stored: true });
  const provider = { interpret() { throw Error("must not dispatch"); } } as unknown as ReturnType<typeof fullProvider>;
  const result = await generateFullIntelligence(ids.analysis, ids.property, { repository: db.repo, provider });
  assert.deepEqual(result.projection, { stored: true });
  const before = packetDigest(db.value()); const answer = suggestedAnswer(result, "main-risk");
  assert.equal(answer.immutableReport, true); assert.equal(packetDigest(db.value()), before);
});
test("verification can never activate Production or an unknown deployment", () => {
  assert.equal(verificationEnabled({ SITEFIT_PHASE12_VERIFICATION: "1", VERCEL_ENV: "production" }, "localhost"), false);
  assert.equal(verificationEnabled({ SITEFIT_PHASE12_VERIFICATION: "1" }, "sitefit.example"), false);
  assert.equal(verificationEnabled({ SITEFIT_PHASE12_VERIFICATION: "1" }, "localhost"), true);
  assert.equal(verificationEnabled({ SITEFIT_PHASE12_VERIFICATION: "1", VERCEL_ENV: "preview", VERCEL: "1" }, "preview.example"), true);
});
