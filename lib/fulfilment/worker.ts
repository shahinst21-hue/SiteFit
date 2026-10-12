import "server-only";
import { fulfilmentRepository, type Job } from "./repository.ts";
import { completion } from "./policy.ts";
import { fullRepository } from "../report-intelligence/repository.ts";
import { generateFullIntelligence } from "../report-intelligence/generate.ts";
import { fullProvider } from "../report-intelligence/provider.ts";

type Queue = ReturnType<typeof fulfilmentRepository>;
type Reports = ReturnType<typeof fullRepository>;
/** One durable claim, no loop and no external retry. Dependencies permit offline verification. */
export async function fulfilOne(options: { queue?: Queue; reports?: (owner: string) => Reports;
  generate?: typeof generateFullIntelligence; provider?: ReturnType<typeof fullProvider>; paidExecutionApproved?: boolean } = {}) {
  const queue = options.queue ?? fulfilmentRepository();
  const job: Job | null = await queue.claim(); if (!job) return "idle";
  try {
    const repo = (options.reports ?? fullRepository)(job.ownerId);
    let edition = job.reportId ? await repo.read(job.reportId) : null;
    // Disabled execution cannot prepare a new edition or reserve money.
    if (edition?.status !== "ready" && options.paidExecutionApproved !== true) {
      await queue.finish(job, { state: "awaiting_authorisation", reason: "budget_unavailable" }); return "awaiting_authorisation";
    }
    edition ??= await repo.start(job.freeReportId);
    await queue.bind(job, edition.id);
    if (edition.status !== "ready") {
      if (edition.checkpoint.dispatches.some(d => ["intent", "ambiguous", "invalid"].includes(d.state))) {
        await queue.finish(job, completion(edition.status, edition.checkpoint.dispatches)); return "intervention";
      }
      const provider = options.provider ?? fullProvider();
      const fenced: ReturnType<typeof fullProvider> = { async interpret(...args) {
        // Re-check lease, exact report binding and current entitlement before EACH external dispatch.
        await queue.bind(job, edition!.id); return provider.interpret(...args);
      } };
      edition = await (options.generate ?? generateFullIntelligence)(job.ownerId, edition.id,
        { repository: repo, provider: fenced, resume: edition.revision > 0, allowSemanticRepair: false });
    }
    const result = completion(edition.status, edition.checkpoint.dispatches);
    await queue.finish(job, result); return result.state;
  } catch {
    // Never infer "not charged" from an exception or log the private error.
    try { await queue.finish(job, { state: "intervention", reason: "execution_interrupted" }); } catch { /* expired claim is recovered conservatively by SQL */ }
    return "intervention";
  }
}
