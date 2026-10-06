import "server-only";
import { createHash } from "node:crypto";

// Owner-mandated model. No automatic model fallback or provider substitution.
export const analysisAI = Object.freeze({ provider: "openai", model: "gpt-6.1-sol", promptVersion: "section-analyst-v3",
  schemaVersion: 1, maxDispatches: 8, maxPacketBytes: 12_000, maxInstructionsBytes: 4000, maxSchemaBytes: 4000, maxOutputTokens: 1800, timeoutMs: 25_000 });
export type AIReceipt = { provider: string; requestedModel: string; returnedModel: string; promptVersion: string;
  schemaVersion: number; generatedAt: string; packetDigest: string; inputTokens: number; outputTokens: number;
  durationMs: number; dispatch: number; store: false };
export class AnalysisAIError extends Error {
  code: "configuration_missing" | "dispatch_limit" | "invalid_packet" | "timeout" | "provider_unavailable" | "invalid_response" | "refused";
  constructor(code: AnalysisAIError["code"]) { super(code); this.code = code; }
}
type Fetch = typeof fetch;
export function analysisAIProvider(options: { fetch?: Fetch; key?: string; now?: () => Date; priorDispatches?: number } = {}) {
  const fetcher = options.fetch ?? fetch; const now = options.now ?? (() => new Date());
  let dispatches = options.priorDispatches ?? 0;
  const receipts: AIReceipt[] = [];
  if (!Number.isInteger(dispatches) || dispatches < 0 || dispatches > analysisAI.maxDispatches) throw new AnalysisAIError("dispatch_limit");
  return {
    dispatches: () => dispatches,
    receipts: () => structuredClone(receipts),
    async interpret(packet: Record<string, unknown>, instructions: string, schema: Record<string, unknown>, signal?: AbortSignal): Promise<{ output: unknown; receipt: AIReceipt }> {
      const key = options.key ?? process.env.OPENAI_API_KEY;
      if (!key || !key.startsWith("sk-")) throw new AnalysisAIError("configuration_missing");
      const input = JSON.stringify(packet);
      if (Buffer.byteLength(input) > analysisAI.maxPacketBytes || Buffer.byteLength(instructions) > analysisAI.maxInstructionsBytes ||
        Buffer.byteLength(JSON.stringify(schema)) > analysisAI.maxSchemaBytes || /"(?:formattedAddress|postcode|uprn|ownerId|email|providerAddressId|latitude|longitude|secret|apiKey)"\s*:/i.test(input)) throw new AnalysisAIError("invalid_packet");
      if (dispatches >= analysisAI.maxDispatches) throw new AnalysisAIError("dispatch_limit");
      if (signal?.aborted) throw new AnalysisAIError("timeout");
      const dispatch = ++dispatches; const started = now().getTime();
      const bounded = AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(analysisAI.timeoutMs)]);
      let response: Response;
      try {
        response = await fetcher("https://api.openai.com/v1/responses", { method: "POST", redirect: "error", signal: bounded,
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: analysisAI.model, store: false, reasoning: { effort: "low" }, max_output_tokens: analysisAI.maxOutputTokens,
            instructions, input: [{ role: "user", content: [{ type: "input_text", text: input }] }],
            text: { format: { type: "json_schema", name: "sitefit_analysis", strict: true, schema } } }) });
      } catch { throw new AnalysisAIError(bounded.aborted ? "timeout" : "provider_unavailable"); }
      if (!response.ok) { await response.body?.cancel(); throw new AnalysisAIError("provider_unavailable"); }
      if (!response.headers.get("content-type")?.includes("application/json") || Number(response.headers.get("content-length")) > 128_000) { await response.body?.cancel(); throw new AnalysisAIError("invalid_response"); }
      const reader = response.body?.getReader(); if (!reader) throw new AnalysisAIError("invalid_response");
      const chunks: Uint8Array[] = []; let bytes = 0;
      try {
        while (true) {
          const part = await reader.read(); if (part.done) break;
          bytes += part.value.byteLength;
          if (bytes > 128_000) { await reader.cancel(); throw new AnalysisAIError("invalid_response"); }
          chunks.push(part.value);
        }
      } catch { throw new AnalysisAIError(bounded.aborted ? "timeout" : "invalid_response"); }
      let body: Record<string, unknown>;
      try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new AnalysisAIError("invalid_response"); }
      if (body.status !== "completed" || typeof body.model !== "string" || !body.model.startsWith(analysisAI.model) || !Array.isArray(body.output)) throw new AnalysisAIError("invalid_response");
      const outputTexts: string[] = [];
      for (const message of body.output as { type?: string; content?: { type?: string; text?: string }[] }[]) {
        if (message.type === "message" && Array.isArray(message.content)) for (const content of message.content) {
          if (content.type === "refusal") throw new AnalysisAIError("refused");
          if (content.type === "output_text" && typeof content.text === "string") outputTexts.push(content.text);
        }
      }
      if (outputTexts.length !== 1) throw new AnalysisAIError("invalid_response");
      const usage = body.usage as Record<string, unknown> | undefined;
      if (!usage || !Number.isSafeInteger(usage.input_tokens) || !Number.isSafeInteger(usage.output_tokens) || Number(usage.input_tokens) < 0 || Number(usage.output_tokens) < 0) throw new AnalysisAIError("invalid_response");
      let output: unknown;
      try { output = JSON.parse(outputTexts[0]); } catch { throw new AnalysisAIError("invalid_response"); }
      const receipt: AIReceipt = { provider: analysisAI.provider, requestedModel: analysisAI.model, returnedModel: body.model,
        promptVersion: packet.version === "validated-synthesis-v1" ? "synthesis-analyst-v3" : analysisAI.promptVersion,
        schemaVersion: 1, generatedAt: now().toISOString(), packetDigest: createHash("sha256").update(input).digest("hex"),
        inputTokens: Number(usage.input_tokens), outputTokens: Number(usage.output_tokens), durationMs: now().getTime() - started, dispatch, store: false };
      receipts.push(receipt);
      return { output, receipt };
    },
  };
}
