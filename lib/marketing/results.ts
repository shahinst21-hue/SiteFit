import { campaignCode } from "./campaign.ts";
export type CampaignRow = { campaign: string; snapshots: number; purchaseStarts: number | null; checkoutAttempts: number;
  confirmedPayments: number; paidAnalyses: number; retainedPayments: number; fullRefunds: number; uncertainReceipts: number;
  fullReportsReady: number; requestPayments: number; interruptedJobs: number; netReceiptsMinor: number | null };
export type CampaignExport = { version: 1; testOnly: boolean; cohortFrom: string; cohortTo: string; asOf: string; rows: CampaignRow[] };
export type SpendInput = { campaign: string; spendMinor: number | null; visits: number | null; checkerStarts: number | null };
const fields = ["campaign", "snapshots", "purchaseStarts", "checkoutAttempts", "confirmedPayments", "paidAnalyses", "retainedPayments", "fullRefunds", "uncertainReceipts", "fullReportsReady", "requestPayments", "interruptedJobs", "netReceiptsMinor"];
const count = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) >= 0;
function object(v: unknown): Record<string, unknown> { if (!v || typeof v !== "object" || Array.isArray(v)) throw Error("invalid_campaign_export"); return v as Record<string, unknown>; }
function exact(v: Record<string, unknown>, keys: string[]) { if (Object.keys(v).length !== keys.length || keys.some(k => !Object.hasOwn(v, k))) throw Error("invalid_campaign_export"); }
export function validateCampaignExport(value: unknown): CampaignExport {
  const v = object(value); exact(v, ["version", "testOnly", "cohortFrom", "cohortTo", "asOf", "rows"]);
  if (v.version !== 1 || typeof v.testOnly !== "boolean" || !Array.isArray(v.rows) || v.rows.length > 4 ||
    [v.cohortFrom, v.cohortTo, v.asOf].some(d => typeof d !== "string" || !Number.isFinite(Date.parse(d))) ||
    Date.parse(String(v.cohortTo)) <= Date.parse(String(v.cohortFrom))) throw Error("invalid_campaign_export");
  const seen = new Set<string>();
  for (const raw of v.rows) {
    const r = object(raw); exact(r, fields);
    if (r.campaign !== "unattributed" && !campaignCode(r.campaign) || seen.has(String(r.campaign))) throw Error("invalid_campaign_export");
    seen.add(String(r.campaign));
    for (const k of fields.slice(1)) if (!(k === "purchaseStarts" || k === "netReceiptsMinor") && !count(r[k])) throw Error("invalid_campaign_export");
    if (!(r.purchaseStarts === null || count(r.purchaseStarts)) || !(r.netReceiptsMinor === null || count(r.netReceiptsMinor)) ||
      Number(r.retainedPayments) + Number(r.fullRefunds) + Number(r.uncertainReceipts) > Number(r.confirmedPayments) ||
      Number(r.confirmedPayments) > Number(r.checkoutAttempts) || Number(r.fullReportsReady) > Number(r.snapshots) ||
      Number(r.paidAnalyses) > Number(r.snapshots) || Number(r.paidAnalyses) > Number(r.confirmedPayments) ||
      r.purchaseStarts !== null && Number(r.purchaseStarts) > Number(r.snapshots) ||
      Number(r.uncertainReceipts) > 0 && r.netReceiptsMinor !== null) throw Error("inconsistent_campaign_export");
  }
  return v as unknown as CampaignExport;
}
export function validateSpend(value: unknown): SpendInput[] {
  if (!Array.isArray(value) || value.length > 3) throw Error("invalid_campaign_spend");
  const seen = new Set<string>();
  return value.map(raw => {
    const r = object(raw); exact(r, ["campaign", "spendMinor", "visits", "checkerStarts"]);
    if (!campaignCode(r.campaign) || seen.has(String(r.campaign)) || !(r.spendMinor === null || count(r.spendMinor)) ||
      ![r.visits, r.checkerStarts].every(n => n === null || count(n))) throw Error("invalid_campaign_spend");
    seen.add(String(r.campaign)); return r as unknown as SpendInput;
  });
}
const money = (n: number | null) => n === null ? "Unknown" : `£${(n / 100).toFixed(2)}`;
export function campaignResults(value: unknown, spendValue: unknown = []) {
  const data = validateCampaignExport(value), spend = validateSpend(spendValue);
  const rows = [...data.rows];
  for (const s of spend) if (!rows.some(r => r.campaign === s.campaign)) rows.push({ campaign: s.campaign, snapshots: 0, purchaseStarts: 0, checkoutAttempts: 0, confirmedPayments: 0, paidAnalyses: 0, retainedPayments: 0, fullRefunds: 0, uncertainReceipts: 0, fullReportsReady: 0, requestPayments: 0, interruptedJobs: 0, netReceiptsMinor: 0 });
  rows.sort((a, b) => a.campaign.localeCompare(b.campaign));
  const output = [data.testOnly?"# SiteFit campaign results — TEST DATA ONLY":"# SiteFit campaign results — LIVE PAYMENT DATA", "", `Snapshot cohort: ${data.cohortFrom} to ${data.cohortTo} (end exclusive). Outcomes as of ${data.asOf}.`, "",
    "| Campaign | Channel visits* | Checker starts* | Snapshots | Purchase starts | Checkout attempts | Confirmed | Snapshot → paid | Retained | Full refunds | Ready analyses | Requests | Interrupted | Net receipts** | Spend* | Cost / retained payment |", "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|"];
  for (const r of rows) {
    const s = spend.find(x => x.campaign === r.campaign);
    const cac = s && s.spendMinor !== null && r.retainedPayments > 0 ? Math.round(s.spendMinor / r.retainedPayments) : null;
    const conversion = r.snapshots > 0 ? `${Math.round(r.paidAnalyses / r.snapshots * 100)}%` : "Unknown";
    output.push(`| ${r.campaign} | ${s?.visits ?? "Unknown"} | ${s?.checkerStarts ?? "Unknown"} | ${r.snapshots} | ${r.purchaseStarts ?? "Unknown"} | ${r.checkoutAttempts} | ${r.confirmedPayments} | ${conversion} | ${r.retainedPayments} | ${r.fullRefunds} | ${r.fullReportsReady} | ${r.requestPayments} | ${r.interruptedJobs} | ${money(r.netReceiptsMinor)} | ${money(s?.spendMinor ?? null)} | ${money(cac)} |`);
  }
  output.push("", "* Owner-entered channel records, not first-party unique visitors. Unknown is not zero. Counts are analyses or payments, not people. Consent gaps, browser/session loss and unrecorded starts limit attribution; unattributed does not mean organic.",
    "** Confirmed payments are not delivery. Ready analyses are not proof of receipt by a customer. Requests are not issued refunds. Partial/pending refunds and disputes withhold net receipts; totals exclude provider fees, tax and generation costs. Cost per retained payment is not unique-customer CAC or profit.",
    "", data.testOnly?"This Test-only export cannot demonstrate real willingness to pay. Live reconciliation, campaign launch and approved measurement/retention settings belong to Phase17.":"Live counts represent verified transactions, not guaranteed customer benefit or profit. Keep Test exports separate; reconcile refunds and attribution coverage before investment decisions.", "Compare repeated exports using the same cohort and as-of timestamp; outcomes can change as refunds/recovery occur.");
  return output.join("\n") + "\n";
}
