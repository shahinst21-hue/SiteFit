import assert from "node:assert/strict";
import test from "node:test";
import { context, result, ids } from "./fixtures/data/framework.ts";
import { sectionPackets } from "../lib/analysis/packets.ts";
import { analysisAIProvider } from "../lib/analysis/ai-provider.ts";
import { interpretSections, synthesiseSections, restoreSynthesis } from "../lib/analysis/section-engine.ts";
import { packetDigest } from "../lib/analysis/canonical.ts";
import type { InterpretationPacket } from "../lib/analysis/interpretation.ts";
function provider(invalid = false) {
  return analysisAIProvider({ key: "sk-fixture", fetch: async (_url, init) => {
    const input = JSON.parse(String(init?.body)); const packet = JSON.parse(input.input[0].content[0].text);
    let selection: unknown;
    if (packet.version === "validated-synthesis-v1") selection = { headlineId: "case-open", supportingSectionIds: packet.sections.map((s: { id: string }) => s.id), unknownSectionIds: packet.sections.map((s: { id: string }) => s.id) };
    else {
      const p = packet as InterpretationPacket;
      const pick = (role: string) => p.propositions.find(prop => prop.role === role)!.id;
      selection = invalid ? { score: 100 } : { conclusionId: pick("conclusion"), reasonIds: [pick("reason")],
        supportIds: p.propositions.filter(prop => prop.role === "support").map(prop => prop.id), oppositionIds: p.mandatoryOpposition,
        alternativeIds: p.propositions.filter(prop => prop.role === "alternative").slice(0, 1).map(prop => prop.id), unknownIds: p.mandatoryUnknowns,
        implicationId: pick("implication"), questionId: pick("question") };
    }
    return Response.json({ status: "completed", model: "gpt-6.1-sol", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(selection) }] }], usage: { input_tokens: 500, output_tokens: 100 } });
  } });
}
test("missing sources preserve four useful explicit gaps with no wasted dimension AI call", async () => {
  const c = context(); const prepared = sectionPackets(c, [], null, new Date()); const ai = provider();
  const output = await interpretSections(prepared.packets, prepared.index, ai);
  assert.equal(ai.dispatches(), 0); assert.equal(output.sections.length, 4); assert.equal(output.errors.length, 0);
  assert.ok(output.sections.every(s => s.score === null && s.strength === "insufficient"));
  const early = await synthesiseSections(output.sections, ai);
  assert.equal(ai.dispatches(), 1); assert.equal(early.headline, "Local evidence does not yet establish the customer case.");
  assert.equal(early.unknownSections.length, 4);
  assert.ok(early.supportingSections.includes("premises"), "Unverified premises can support an open case without becoming favourable evidence");
  const stored = restoreSynthesis(early, packetDigest(output.sections), output.sections, prepared.index);
  assert.deepEqual(stored, early); assert.equal(ai.dispatches(), 1);
  assert.throws(() => restoreSynthesis(early, "changed", output.sections, prepared.index), /stored_synthesis_binding_mismatch/);
  assert.throws(() => restoreSynthesis({ ...early, unknownSections: [] }, packetDigest(output.sections), output.sections, prepared.index), /stored_synthesis_binding_mismatch/);
  assert.throws(() => restoreSynthesis({ ...early, evidenceIds: ["forged"] }, packetDigest(output.sections), output.sections, prepared.index), /stored_synthesis_binding_mismatch/);
});
test("partial source result creates bounded interpretation and retains premises and demand gaps", async () => {
  const c = context(); const r = result(); r.outcome = "partial";
  const prepared = sectionPackets(c, [{ id: ids.correlation, analysisId: ids.analysis, inputId: ids.input, collectionKey: "free-v1", requestHash: "fixture", result: r }], null, new Date());
  const ai = provider(); const output = await interpretSections(prepared.packets, prepared.index, ai);
  assert.equal(ai.dispatches(), 1); assert.equal(output.sections.length, 4);
  const access = output.sections.find(s => s.section === "customer-access")!;
  assert.equal(access.conclusion.meaning, "conditional"); assert.equal(access.strength, "limited"); assert.equal(access.score, null);
  assert.ok(access.opposition.some(p => p.text.includes("walkable")));
  const serialized = JSON.stringify(prepared.packets);
  assert.ok(!serialized.includes(c.selectedProperty.formattedAddress));
  assert.ok(!serialized.includes("longitude")); assert.ok(!serialized.includes("ownerId"));
});
test("failed AI is repaired once, preserves other completed sections and blocks synthesis", async () => {
  const c = context(); const r = result();
  const prepared = sectionPackets(c, [{ id: ids.correlation, analysisId: ids.analysis, inputId: ids.input, collectionKey: "free-v1", requestHash: "fixture", result: r }], null, new Date());
  const ai = provider(true); const output = await interpretSections(prepared.packets, prepared.index, ai);
  assert.equal(ai.dispatches(), 2); assert.equal(output.sections.length, 3); assert.equal(output.errors.length, 1);
  await assert.rejects(synthesiseSections(output.sections, ai), /incomplete_synthesis_sections/);
});
test("stored validated sections replay without another AI dispatch and reject changed packets", async () => {
  const c = context(); const r = result();
  const prepared = sectionPackets(c, [{ id: ids.correlation, analysisId: ids.analysis, inputId: ids.input, collectionKey: "free-v1", requestHash: "fixture", result: r }], null, new Date());
  const initial = await interpretSections(prepared.packets, prepared.index, provider());
  const replayProvider = provider();
  const replay = await interpretSections(prepared.packets, prepared.index, replayProvider, undefined, initial.sections);
  assert.equal(replayProvider.dispatches(), 0);
  assert.deepEqual(replay.sections, initial.sections);
  const reorder = (value: unknown): unknown => Array.isArray(value) ? value.map(reorder) : value && typeof value === "object" ?
    Object.fromEntries(Object.entries(value).reverse().map(([key, child]) => [key, reorder(child)])) : value;
  const jsonbPackets = reorder(prepared.packets) as InterpretationPacket[];
  const jsonbReplay = await interpretSections(jsonbPackets, prepared.index, replayProvider, undefined, initial.sections);
  assert.equal(jsonbReplay.sections.length, 4); assert.equal(replayProvider.dispatches(), 0);
  const changed = structuredClone(prepared.packets); changed[0].businessType = "restaurant";
  await assert.rejects(interpretSections(changed, prepared.index, replayProvider, undefined, initial.sections), /stored_section_packet_mismatch/);
});
