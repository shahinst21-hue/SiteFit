import "server-only";
import { frameworkClient } from "../data/server-client.ts";
import { uuid, object } from "../data/validation.ts";
import type { Json } from "../supabase/database.types.ts";
import type { Completion } from "./policy.ts";

type Rpc = { rpc(name: string, args: Record<string, Json | null>): PromiseLike<{ data: unknown; error: unknown }> };
export const fulfilmentId = uuid;
export type Job = { id: string; ownerId: string; freeReportId: string; reportId: string | null; token: string };
export function fulfilmentRepository() {
  const client = frameworkClient() as unknown as Rpc;
  async function invoke(name: string, args: Record<string, Json | null> = {}) {
    const result = await client.rpc(name, args);
    if (result.error) throw Error("fulfilment_operation_unavailable");
    return result.data;
  }
  return {
    async claim(): Promise<Job | null> {
      const raw = await invoke("claim_sitefit_fulfilment"); if (raw === null) return null;
      const j = object(raw);
      if (![j.id, j.ownerId, j.freeReportId, j.token].every(uuid) || j.reportId !== null && !uuid(j.reportId)) throw Error("invalid_fulfilment_job");
      return j as unknown as Job;
    },
    async supplyAllowed(job: Job) {
      return (await invoke("authorise_sitefit_supply", {p_job:job.id,p_token:job.token})) === true;
    },
    async bind(job: Job, reportId: string) {
      if (!uuid(reportId)) throw Error("invalid_report");
      await invoke("bind_sitefit_fulfilment", { p_job: job.id, p_token: job.token, p_report: reportId });
    },
    async finish(job: Job, result: Completion) {
      await invoke("finish_sitefit_fulfilment", { p_job: job.id, p_token: job.token, p_state: result.state, p_reason: result.reason });
    },
    async progress(owner: string, payment: string) {
      if (![owner, payment].every(uuid)) throw Error("invalid_request");
      return invoke("read_sitefit_fulfilment", { p_owner: owner, p_payment: payment });
    },
    async support(actor: string) {
      if (!uuid(actor)) throw Error("invalid_request");
      return invoke("sitefit_fulfilment_support", { p_actor: actor });
    },
    async resume(actor: string, job: string) {
      if (![actor, job].every(uuid)) throw Error("invalid_request");
      await invoke("resume_sitefit_fulfilment", { p_actor: actor, p_job: job });
    },
  };
}
