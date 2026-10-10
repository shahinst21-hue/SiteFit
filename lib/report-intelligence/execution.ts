import { packetDigest } from "../analysis/canonical.ts";

export const intelligencePolicy = Object.freeze({ version: "full-intelligence-v1", model: "gpt-6.1-sol",
  phaseBudgetMicros: 1_000_000, reportReserveMicros: 300_000, questionReserveMicros: 40_000,
  maxDispatches: 4, maxRequestBytes: 20_000, maxCheckpointBytes: 65_536, maxPreparationBytes: 128_000 });
export type Group = "context" | "premises" | "synthesis";
export type Dispatch = { ordinal: number; group: Group; packetDigest: string; instructionsDigest: string;
  schemaDigest: string; state: "intent" | "accepted" | "invalid" | "ambiguous";
  output: unknown; receipt: unknown; reservedAt?: string };
export type Checkpoint = { version: "full-intelligence-v1"; revision: number; bindingDigest: string;
  state: "prepared" | "running" | "interrupted" | "validating" | "ready";
  dispatches: Dispatch[]; repairUsed: boolean };

export function newCheckpoint(binding: unknown): Checkpoint {
  return { version: intelligencePolicy.version, revision: 0, bindingDigest: packetDigest(binding),
    state: "prepared", dispatches: [], repairUsed: false };
}
export function validateCheckpoint(value: Checkpoint): Checkpoint {
  if (value.version !== intelligencePolicy.version || !Number.isSafeInteger(value.revision) || value.revision < 0 ||
    !/^[a-f0-9]{64}$/.test(value.bindingDigest) || !["prepared", "running", "interrupted", "validating", "ready"].includes(value.state) ||
    typeof value.repairUsed !== "boolean" || value.dispatches.length > intelligencePolicy.maxDispatches ||
    Buffer.byteLength(JSON.stringify(value)) > intelligencePolicy.maxCheckpointBytes) throw Error("invalid_checkpoint");
  for (const [i, d] of value.dispatches.entries()) {
    if (d.ordinal !== i + 1 || !["context", "premises", "synthesis"].includes(d.group) ||
      ![d.packetDigest, d.instructionsDigest, d.schemaDigest].every(v => /^[a-f0-9]{64}$/.test(v)) ||
      (d.reservedAt !== undefined && !Number.isFinite(Date.parse(d.reservedAt))) ||
      !["intent", "accepted", "invalid", "ambiguous"].includes(d.state) ||
      (d.state === "accepted" ? d.output === null || d.receipt === null : d.output !== null)) throw Error("invalid_dispatch");
  }
  return structuredClone(value);
}

/** The returned intent MUST be committed by CAS before invoking a provider. */
export function reserveDispatch(checkpoint: Checkpoint, group: Group, packet: unknown, instructions: string,
  schema: unknown, repair = false): { checkpoint: Checkpoint; dispatch: Dispatch } {
  const c = validateCheckpoint(checkpoint);
  if (c.state === "ready" || c.dispatches.length >= intelligencePolicy.maxDispatches ||
    c.dispatches.some(d => d.state === "ambiguous")) throw Error("dispatch_not_permitted");
  const previous = c.dispatches.filter(d => d.group === group);
  if (previous.some(d => d.state === "intent" || d.state === "accepted") ||
    (previous.length > 0 && (!repair || c.repairUsed || !previous.every(d => d.state === "invalid"))) ||
    (repair && previous.length === 0)) throw Error("dispatch_not_permitted");
  if (group === "synthesis" && !["context", "premises"].every(g => c.dispatches.some(d => d.group === g && d.state === "accepted")))
    throw Error("groups_not_accepted");
  const dispatch: Dispatch = { ordinal: c.dispatches.length + 1, group, packetDigest: packetDigest(packet),
    instructionsDigest: packetDigest(instructions), schemaDigest: packetDigest(schema), state: "intent", output: null, receipt: null, reservedAt: new Date().toISOString() };
  c.dispatches.push(dispatch); c.revision++; c.state = "running"; c.repairUsed ||= repair;
  return { checkpoint: validateCheckpoint(c), dispatch: structuredClone(dispatch) };
}

export function settleDispatch(checkpoint: Checkpoint, ordinal: number,
  outcome: { state: "accepted"; output: unknown; receipt: unknown } | { state: "invalid" | "ambiguous"; receipt: unknown }): Checkpoint {
  const c = validateCheckpoint(checkpoint), d = c.dispatches.find(d => d.ordinal === ordinal);
  if (!d || d.state !== "intent" || c.state === "ready") throw Error("dispatch_already_settled");
  d.state = outcome.state; d.receipt = outcome.receipt; d.output = outcome.state === "accepted" ? outcome.output : null;
  c.revision++; c.state = outcome.state === "ambiguous" ? "interrupted" : "running";
  return validateCheckpoint(c);
}

/** Explicit recovery is conservative: persisted intents never become sendable again. */
export function recoverCheckpoint(checkpoint: Checkpoint): Checkpoint {
  const c = validateCheckpoint(checkpoint); if (c.state === "ready") return c;
  for (const d of c.dispatches) if (d.state === "intent") d.state = "ambiguous";
  c.revision++; c.state = c.dispatches.some(d => d.state === "ambiguous") ? "interrupted" : c.state;
  return validateCheckpoint(c);
}

export function usageMicros(inputTokens: number, outputTokens: number): number {
  if (![inputTokens, outputTokens].every(v => Number.isSafeInteger(v) && v >= 0)) throw Error("invalid_usage");
  return inputTokens * 2 + outputTokens * 10;
}
