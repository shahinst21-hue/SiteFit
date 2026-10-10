import "server-only";
import { packetDigest } from "../analysis/canonical.ts";
import { type Catalog, type SectionKey, sectionKeys, catalogPacket } from "./catalog.ts";
import { reserveDispatch, settleDispatch, recoverCheckpoint, type Checkpoint, type Group } from "./execution.ts";
import { fullProvider, fullRequest } from "./provider.ts";
import { fullRepository, type StoredEdition } from "./repository.ts";
import { groupInstructions, selectionSchema, validateSelection, renderSelection, type Selection } from "./selection.ts";

const groupKeys: Record<Group, SectionKey[]> = { context: ["customer-context", "competition", "access"], premises: ["premises", "rental-context"], synthesis: ["overview", "actions"] };
/** Synthesis can rank accepted evidence but cannot invent a stronger overall judgement. */
function synthesisCatalog(catalog: Catalog, selections: Selection[]): Catalog {
  const copy = structuredClone(catalog), selected = new Set(selections.flatMap(s => s.sections.flatMap(v => [...v.reasons, ...v.implications, ...v.actions])));
  for (const atom of catalog.atoms) {
    if (selected.has(atom.id) && atom.role !== "action") copy.atoms.push({ ...atom, section: "overview", id: `overview-${atom.id}` });
    if (atom.role === "action") copy.atoms.push({ ...atom, role: "reason", section: "actions", id: `actions-${atom.id}` });
  }
  for (const section of selections.flatMap(s => s.sections)) {
    const lead = catalog.atoms.find(a => a.id === section.lead);
    if (lead) copy.atoms.push({ ...lead, section: "overview", id: `overview-${lead.id}` });
  }
  copy.atoms.push({ id: "actions-conclusion-v1", section: "actions", role: "conclusion",
    text: "Resolve the evidenced premises and lease unknowns before committing; use the location evidence to focus those checks.", factIds: [], rule: "readiness-action-priority-v1" });
  // Premises qualifications survive regardless of ranking or context index.
  for (const atom of catalog.atoms.filter(a => a.role === "caution" || a.rule === "mandatory-premises-unknown-v1"))
    copy.atoms.push({ ...atom, section: "overview", role: "caution", id: `mandatory-${atom.id}` });
  return copy;
}
export type FullProjection = { version: "full-report-v1"; bindingDigest: string; generatedAt: string;
  business: Catalog["business"]; index: Catalog["index"]; readiness: Catalog["readiness"];
  sections: unknown[]; sourceDirectory: Catalog["facts"]; financialEngineIncluded: false; contentDigest: string };

/** Database CAS is retried; external requests never are. */
async function commit(repo: ReturnType<typeof fullRepository>, reportId: string, change: (c: Checkpoint) => Checkpoint) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const current = await repo.read(reportId);
    try { return await repo.checkpoint(current, change(current.checkpoint)); }
    catch { if (attempt === 3) throw Error("checkpoint_commit_unavailable"); }
  }
  throw Error("checkpoint_commit_unavailable");
}

export async function generateFullIntelligence(owner: string, reportId: string,
  options: { repository?: ReturnType<typeof fullRepository>; provider?: ReturnType<typeof fullProvider>; resume?: boolean } = {}) {
  const repo = options.repository ?? fullRepository(owner);
  let edition = await repo.read(reportId);
  if (edition.status === "ready") return edition; // No packet/provider/calculator work on replay.
  const provider = options.provider ?? fullProvider();
  if (!options.resume && edition.revision !== 0) return edition;
  if (options.resume && edition.checkpoint.dispatches.some(d => d.state === "intent")) {
    // Explicit recovery cannot interrupt a still-bounded active execution. A
    // stale intent remains an unknown paid outcome, never a resend permission.
    if (edition.checkpoint.dispatches.some(d => d.state === "intent" && d.reservedAt && Date.now() - Date.parse(d.reservedAt) <= 180_000)) return edition;
    edition = await commit(repo, reportId, recoverCheckpoint); return edition;
  }
  if (edition.checkpoint.dispatches.some(d => d.state === "ambiguous")) return edition;
  const pending: { group: Group; dispatch: ReturnType<typeof reserveDispatch>["dispatch"] }[] = [];
  for (const group of ["context", "premises"] as const) {
    const previous = edition.checkpoint.dispatches.filter(d => d.group === group);
    const repair = previous.length > 0 && options.resume === true && !edition.checkpoint.repairUsed &&
      previous.every(d => d.state === "invalid" && (d.receipt as { validation?: string } | null)?.validation === "selection_rejected");
    if (previous.length && !repair) continue;
    const packet = catalogPacket(edition.preparation.catalog, groupKeys[group]);
    if (packetDigest(packet) !== edition.preparation.packetDigests[group]) throw Error("stored_packet_changed");
    fullRequest(group, packet, groupInstructions, selectionSchema);
    const reserved = reserveDispatch(edition.checkpoint, group, packet, groupInstructions, selectionSchema, repair);
    try { edition = await repo.checkpoint(edition, reserved.checkpoint); pending.push({ group, dispatch: reserved.dispatch }); }
    catch { return repo.read(reportId); } // A duplicate worker has not acquired dispatch authority.
  }
  await Promise.allSettled(pending.map(async ({ group, dispatch }) => {
    const outcome = await provider.interpret(dispatch, catalogPacket(edition.preparation.catalog, groupKeys[group]), groupInstructions, selectionSchema);
    let accepted: Selection | null = null;
    if (outcome.state === "received") {
      try { accepted = validateSelection(outcome.output, edition.preparation.catalog, groupKeys[group]); } catch { /* Paid semantic failure retains receipt. */ }
    }
    await commit(repo, reportId, c => settleDispatch(c, dispatch.ordinal,
      accepted ? { state: "accepted", output: accepted, receipt: outcome.receipt } :
        { state: outcome.state === "ambiguous" ? "ambiguous" : "invalid", receipt: outcome.state === "received" ?
          { ...outcome.receipt, validation: "selection_rejected" } : outcome.receipt }));
  }));
  edition = await repo.read(reportId);
  const groups = ["context", "premises"].map(group => edition.checkpoint.dispatches.find(d => d.group === group && d.state === "accepted"));
  if (groups.some(d => !d) || edition.checkpoint.dispatches.some(d => d.state === "intent" || d.state === "ambiguous")) return edition;
  const selections = groups.map((d, i) => validateSelection(d!.output, edition.preparation.catalog, groupKeys[i === 0 ? "context" : "premises"]));
  const synthesis = synthesisCatalog(edition.preparation.catalog, selections);
  const packet = { ...catalogPacket(synthesis, groupKeys.synthesis), version: "full-decision-v1",
    readiness: synthesis.readiness, scope: "Resident & Workplace Context Index is not a commercial suitability score. No finance or legal clearance." };
  let dispatch = edition.checkpoint.dispatches.findLast(d => d.group === "synthesis");
  const repair = dispatch?.state === "invalid" && options.resume === true && !edition.checkpoint.repairUsed &&
    (dispatch.receipt as { validation?: string } | null)?.validation === "selection_rejected";
  if (!dispatch || repair) {
    fullRequest("synthesis", packet, groupInstructions, selectionSchema);
    const reserved = reserveDispatch(edition.checkpoint, "synthesis", packet, groupInstructions, selectionSchema, repair);
    try { edition = await repo.checkpoint(edition, reserved.checkpoint); dispatch = reserved.dispatch; }
    catch { return repo.read(reportId); }
    const outcome = await provider.interpret(dispatch, packet, groupInstructions, selectionSchema);
    let accepted: Selection | null = null;
    if (outcome.state === "received") try { accepted = validateSelection(outcome.output, synthesis, groupKeys.synthesis); } catch { /* No partial publication. */ }
    edition = await commit(repo, reportId, c => settleDispatch(c, dispatch!.ordinal,
      accepted ? { state: "accepted", output: accepted, receipt: outcome.receipt } :
        { state: outcome.state === "ambiguous" ? "ambiguous" : "invalid", receipt: outcome.state === "received" ?
          { ...outcome.receipt, validation: "selection_rejected" } : outcome.receipt }));
    dispatch = edition.checkpoint.dispatches.findLast(d => d.group === "synthesis");
  }
  if (dispatch?.state !== "accepted") return edition;
  const finalSelection = validateSelection(dispatch.output, synthesis, groupKeys.synthesis), catalog = edition.preparation.catalog;
  const rendered = [...renderSelection(selections[0], catalog), ...renderSelection(selections[1], catalog), ...renderSelection(finalSelection, synthesis)];
  const sections = sectionKeys.map(key => key === "appendix" ? { key, availability: "assessed", evidenceIds: catalog.facts.map(f => f.evidenceId),
    methodology: "Stored scoped evidence; deterministic figures and reviewed implication rules; AI ranks admitted atoms. Missing records do not imply absence.",
    limitations: catalog.unknowns, sourceIds: catalog.facts.map(f => f.id) } : { ...rendered.find(s => s.key === key)!,
      ...(key === "customer-context" ? { profiles: edition.preparation.profiles ?? null } : {}),
      ...(key === "premises" ? { timeline: catalog.timeline } : {}), ...(key === "rental-context" ? { rentalObservations: catalog.rentalObservations } : {}) });
  const content = { version: "full-report-v1" as const, bindingDigest: edition.checkpoint.bindingDigest, generatedAt: new Date().toISOString(),
    business: catalog.business, index: catalog.index, readiness: catalog.readiness, premises: catalog.premises, stance: catalog.stance, sections,
    presentation: edition.preparation.presentation ?? null,
    chartOperands: catalog.facts.filter(f => typeof f.value === "number").map(f => ({ factId: f.id, value: f.value,
      unit: f.units, period: f.effectiveAt, scope: f.scope, comparator: null, available: true })),
    sourceDirectory: catalog.facts, supplementReferences: catalog.supplementReferences, financialEngineIncluded: false as const };
  const projection: FullProjection = { ...content, contentDigest: packetDigest(content) };
  if (Buffer.byteLength(JSON.stringify(projection)) > 131072) throw Error("full_report_bounds");
  return repo.freeze(edition, projection);
}

export function fullStatus(edition: StoredEdition) {
  const staleIntent = edition.checkpoint.dispatches.some(d => d.state === "intent" && (!d.reservedAt || Date.now() - Date.parse(d.reservedAt) > 180_000));
  return { reportId: edition.id, status: edition.status,
    stage: edition.status === "ready" ? "ready" : staleIntent || edition.checkpoint.dispatches.some(d => d.state === "ambiguous") ? "interrupted" :
      edition.checkpoint.dispatches.some(d => d.state === "invalid") ? "validation_failed" : edition.checkpoint.dispatches.at(-1)?.group ?? "checking-evidence",
    completed: edition.checkpoint.dispatches.filter(d => d.state === "accepted").map(d => d.group),
    recoveryAvailable: edition.status !== "ready" && staleIntent,
    resumable: edition.status !== "ready" && !edition.checkpoint.dispatches.some(d => d.state === "intent" || d.state === "ambiguous") &&
      (!edition.checkpoint.dispatches.some(d => d.state === "invalid") || !edition.checkpoint.repairUsed &&
        edition.checkpoint.dispatches.filter(d => d.state === "invalid").every(d => (d.receipt as { validation?: string } | null)?.validation === "selection_rejected")) };
}
