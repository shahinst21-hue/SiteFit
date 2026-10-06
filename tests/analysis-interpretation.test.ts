import assert from "node:assert/strict";
import test from "node:test";
import { validateSelection, type InterpretationPacket } from "../lib/analysis/interpretation.ts";
import type { Evidence } from "../lib/analysis/evidence.ts";
const evidence = { id: "evidence", sections: ["customer-base"], kind: "capability", quality: { available: false } } as Evidence;
const index = new Map([["evidence", evidence]]);
const packet: InterpretationPacket = { version: "bounded-propositions-v1", section: "customer-base", businessType: "coffee-shop", strength: "insufficient", score: null,
  scoreSuppression: ["daytime population missing"], metrics: [], mandatoryOpposition: ["dated"], mandatoryUnknowns: ["hours"],
  propositions: [
    { id: "conclusion", role: "conclusion", text: "Customer demand needs stronger evidence.", meaning: "no_basis" },
    { id: "reason", role: "reason", text: "Current demand was not measured.", meaning: null },
    { id: "dated", role: "opposition", text: "The available Census context is dated.", meaning: null },
    { id: "alternative", role: "alternative", text: "Visitors could change the customer mix.", meaning: null },
    { id: "hours", role: "unknown", text: "Trading-hour demand remains unknown.", meaning: null },
    { id: "implication", role: "implication", text: "A repeat-custom hypothesis remains untested.", meaning: null },
    { id: "question", role: "question", text: "Which customers could fit your offer and hours?", meaning: null },
  ].map(p => ({ ...p, kind: "availability" as const, evidenceIds: ["evidence"] })) as InterpretationPacket["propositions"] };
const selection = { conclusionId: "conclusion", reasonIds: ["reason"], supportIds: [], oppositionIds: ["dated"], alternativeIds: ["alternative"], unknownIds: ["hours"], implicationId: "implication", questionId: "question" };
test("interpretation preserves computed score/strength and customer-visible opposition, alternatives and gaps", () => {
  const result = validateSelection(selection, packet, index);
  assert.equal(result.score, null); assert.equal(result.strength, "insufficient");
  assert.equal(result.opposition[0].text, "The available Census context is dated.");
  assert.equal(result.unknowns.length, 1);
});
test("model cannot add a number, replace customer wording, cite another section or hide adverse evidence", () => {
  for (const forged of [{ ...selection, score: 99 }, { ...selection, conclusionId: "invented" },
    { ...selection, conclusionId: "reason" }, { ...selection, oppositionIds: [] }, { ...selection, unknownIds: [] },
    { ...selection, alternativeIds: [] }, { ...selection, reasonIds: ["reason", "reason"] }]) assert.throws(() => validateSelection(forged, packet, index));
  assert.throws(() => validateSelection(selection, packet, new Map([["evidence", { ...evidence, sections: ["premises"] }]])));
  const inflated = structuredClone(packet); inflated.propositions[0].meaning = "favourable";
  assert.throws(() => validateSelection(selection, inflated, index), /inflated_conclusion/);
});
