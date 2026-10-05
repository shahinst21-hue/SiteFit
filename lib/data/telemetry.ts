import "server-only";
import type { ProviderResult } from "./contracts.ts";
import { frameworkClient } from "./server-client.ts";
import { validateResult } from "./validation.ts";
export function safeSummary(result: ProviderResult) {
  const m = validateResult(result).meta;
  return { correlationId: m.correlationId, source: m.source, operation: m.operation, releaseId: m.datasetReleaseId,
    outcome: result.outcome, code: result.error?.code ?? null, status: m.execution.httpStatus, durationMs: m.execution.durationMs,
    attempts: m.execution.attempts, pages: m.execution.pages, cache: m.cache.state, missingCount: m.quality.missing.length, costCategory: m.cost.category };
}
export async function recordSummary(result: ProviderResult): Promise<boolean> {
  // Diagnostic failure never erases an already stored successful source outcome.
  try { const { error } = await frameworkClient().from("system_events").insert({ event_type: "data_source_outcome", correlation_id: result.meta.correlationId, outcome: result.outcome, safe_metadata: safeSummary(result) }); return !error; } catch { return false; }
}
