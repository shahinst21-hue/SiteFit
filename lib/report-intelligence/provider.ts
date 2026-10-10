import "server-only";
import { packetDigest } from "../analysis/canonical.ts";
import { intelligencePolicy, usageMicros, type Dispatch, type Group } from "./execution.ts";

export type FullReceipt = { model: string; promptVersion: string; generatedAt: string; durationMs: number;
  inputTokens: number; outputTokens: number; estimatedMicros: number; requestDigest: string; store: false };
export type ProviderOutcome = { state: "received"; output: unknown; receipt: FullReceipt } |
  { state: "invalid" | "ambiguous"; code: "provider_unavailable" | "timeout" | "invalid_response" | "refused"; receipt: FullReceipt | null };
/** Pure preflight: reject oversized/private packets before persisting a dispatch
 * intent. The exact same bounded request is used for actual execution. */
export function fullRequest(group: Group, packet: unknown, instructions: string, schema: Record<string, unknown>, question = false) {
  const input = JSON.stringify(packet), maxOutput = question ? 1000 : group === "synthesis" ? 2000 : 3000;
  if (Buffer.byteLength(input) > (question ? 8000 : 12_000) || Buffer.byteLength(instructions) > 4000 || Buffer.byteLength(JSON.stringify(schema)) > 4000 ||
    question && Buffer.byteLength(instructions) + Buffer.byteLength(JSON.stringify(schema)) > 6000 ||
    /"(?:formattedAddress|postcode|uprn|ownerId|email|providerAddressId|latitude|longitude|secret|apiKey)"\s*:/i.test(input)) throw Error("invalid_packet");
  const request = { model: intelligencePolicy.model, store: false, reasoning: { effort: "low" }, max_output_tokens: maxOutput,
    instructions, input: [{ role: "user", content: [{ type: "input_text", text: input }] }],
    text: { format: { type: "json_schema", name: "sitefit_full_intelligence", strict: true, schema } } };
  const encoded = JSON.stringify(request);
  if (Buffer.byteLength(encoded) > (question ? 14_000 : intelligencePolicy.maxRequestBytes)) throw Error("invalid_packet");
  return { request, encoded };
}
export function fullProvider(options: { fetch?: typeof fetch; key?: string; now?: () => Date; profile?: "question" } = {}) {
  return { async interpret(dispatch: Dispatch, packet: unknown, instructions: string, schema: Record<string, unknown>): Promise<ProviderOutcome> {
    const key = options.key ?? process.env.OPENAI_API_KEY;
    if (!key?.startsWith("sk-")) throw Error("configuration_missing");
    if (dispatch.state !== "intent" || dispatch.packetDigest !== packetDigest(packet) ||
      dispatch.instructionsDigest !== packetDigest(instructions) || dispatch.schemaDigest !== packetDigest(schema)) throw Error("dispatch_binding_invalid");
    const question = options.profile === "question";
    const promptVersion = question ? "report-answer-v1" : dispatch.group === "context" ? "full-context-v1" : dispatch.group === "premises" ? "full-premises-rent-v1" : "full-decision-v1";
    const { request, encoded } = fullRequest(dispatch.group, packet, instructions, schema, question);
    const now = options.now ?? (() => new Date()), started = now().getTime();
    const signal = AbortSignal.timeout(question ? 25_000 : dispatch.group === "synthesis" ? 30_000 : 45_000);
    let receipt: FullReceipt | null = null;
    try {
      const response = await (options.fetch ?? fetch)("https://api.openai.com/v1/responses", { method: "POST", redirect: "error", signal,
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: encoded });
      if (!response.ok) { await response.body?.cancel(); return { state: "ambiguous", code: "provider_unavailable", receipt }; }
      if (!response.headers.get("content-type")?.includes("application/json")) { await response.body?.cancel(); return { state: "ambiguous", code: "invalid_response", receipt }; }
      const reader = response.body?.getReader(); if (!reader) return { state: "ambiguous", code: "invalid_response", receipt };
      const chunks: Uint8Array[] = []; let bytes = 0;
      while (true) { const part = await reader.read(); if (part.done) break; bytes += part.value.byteLength;
        if (bytes > 128_000) { await reader.cancel(); return { state: "ambiguous", code: "invalid_response", receipt }; } chunks.push(part.value); }
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
      const usage = body.usage as { input_tokens?: unknown; output_tokens?: unknown } | undefined;
      if (!usage || ![usage.input_tokens, usage.output_tokens].every(v => Number.isSafeInteger(v) && Number(v) >= 0))
        return { state: "ambiguous", code: "invalid_response", receipt };
      receipt = { model: String(body.model), promptVersion, generatedAt: now().toISOString(), durationMs: now().getTime() - started,
        inputTokens: Number(usage.input_tokens), outputTokens: Number(usage.output_tokens),
        estimatedMicros: usageMicros(Number(usage.input_tokens), Number(usage.output_tokens)), requestDigest: packetDigest(request), store: false };
      if (body.status !== "completed" || typeof body.model !== "string" ||
        !(body.model === intelligencePolicy.model || body.model.startsWith(`${intelligencePolicy.model}-`)) || !Array.isArray(body.output))
        return { state: "invalid", code: "invalid_response", receipt };
      const texts: string[] = [];
      for (const message of body.output as { type?: string; content?: { type?: string; text?: string }[] }[]) {
        if (message.type !== "message" || !Array.isArray(message.content)) continue;
        for (const content of message.content) { if (content.type === "refusal") return { state: "invalid", code: "refused", receipt };
          if (content.type === "output_text" && typeof content.text === "string") texts.push(content.text); }
      }
      if (texts.length !== 1) return { state: "invalid", code: "invalid_response", receipt };
      try { return { state: "received", output: JSON.parse(texts[0]), receipt }; }
      catch { return { state: "invalid", code: "invalid_response", receipt }; }
    } catch { return { state: receipt ? "invalid" : "ambiguous", code: signal.aborted ? "timeout" : "invalid_response", receipt }; }
  } };
}
