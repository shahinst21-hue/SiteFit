import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { campaignCode, campaignChoice, campaignFromSearch, measurementEnabled } from "../lib/marketing/campaign.ts";
import { campaignResults, validateCampaignExport, validateSpend } from "../lib/marketing/results.ts";
import { publicRobotsRules } from "../lib/seo.ts";
const row = { campaign: "campaign-01", snapshots: 5, purchaseStarts: 3, checkoutAttempts: 3, confirmedPayments: 3, paidAnalyses: 2,
  retainedPayments: 2, fullRefunds: 1, uncertainReceipts: 0, fullReportsReady: 2, requestPayments: 1, interruptedJobs: 0, netReceiptsMinor: 5800 };
const data = { version: 1, testOnly: true, cohortFrom: "2026-10-01T00:00:00Z", cohortTo: "2026-10-02T00:00:00Z", asOf: "2026-10-03T00:00:00Z", rows: [row] };
test("campaign codes reject private/free text and duplicate query keys; consent is explicit and Production stays off", () => {
  assert.equal(campaignCode("someone@example.invalid"), null); assert.equal(campaignCode("__proto__"), null);
  assert.equal(campaignFromSearch("?sf_campaign=campaign-01&utm_term=private+property"), "campaign-01");
  assert.equal(campaignFromSearch("?sf_campaign=campaign-01&sf_campaign=campaign-02"), null);
  assert.throws(() => campaignChoice({ action: "accept", campaign: "campaign-01", address: "private" }));
  assert.throws(() => campaignChoice({ action: "accept" })); assert.deepEqual(campaignChoice({ action: "clear" }), { action: "clear" });
  assert.equal(measurementEnabled({}), false);
  assert.equal(measurementEnabled({ SITEFIT_CAMPAIGN_MEASUREMENT: "1", VERCEL_ENV: "preview" }), true);
  assert.equal(measurementEnabled({ SITEFIT_CAMPAIGN_MEASUREMENT: "1", VERCEL_ENV: "production" }), false);
});
test("configured indexing fixtures exclude private reports, payments and internal tools; Preview blocks all", () => {
  assert.deepEqual(publicRobotsRules({ VERCEL_ENV: "preview", SITE_URL: "https://example.invalid" }), { userAgent: "*", disallow: "/" });
  const rules = publicRobotsRules({ VERCEL_ENV: "production", SITE_URL: "https://example.invalid",SITEFIT_PUBLIC_INDEXING_ENABLED:"1" },{productionApproved:true,paidExecutionApproved:false,measurementApproved:false}) as { disallow: string[] };
  for (const path of ["/reports/", "/snapshots/", "/purchase/", "/internal/", "/dev/", "/account", "/api/"]) assert.ok(rules.disallow.includes(path));
});
test("aggregate reports are reproducible, zero-safe and do not mistake payment counts for people or delivery", () => {
  const spend = [{ campaign: "campaign-01", spendMinor: 2500, visits: 20, checkerStarts: null }];
  const report = campaignResults(data, spend);
  assert.equal(report, campaignResults(data, spend)); assert.match(report, /TEST DATA ONLY/);
  assert.match(report, /40%/); assert.match(report, /£58.00/); assert.match(report, /£12.50/);
  assert.match(report, /not proof of receipt/); assert.match(report, /Unknown is not zero/);
  assert.match(campaignResults({...data,testOnly:false},spend),/LIVE PAYMENT DATA/);
  assert.doesNotMatch(campaignResults({...data,testOnly:false},spend),/TEST DATA ONLY/);
  assert.match(campaignResults({ ...data, rows: [] }, spend), /Unknown/);
  assert.throws(() => validateCampaignExport({ ...data, rows: [row, row] }));
  assert.throws(() => validateCampaignExport({ ...data, testOnly: "false" }));
  assert.throws(() => validateCampaignExport({ ...data, rows: [{ ...row, snapshots: 0 }] }));
  assert.throws(() => validateSpend([{ ...spend[0], email: "private" }]));
  assert.match(campaignResults({ ...data, rows: [{ ...row, retainedPayments: 1, fullRefunds: 1, uncertainReceipts: 1, netReceiptsMinor: null }] }), /Unknown/);
});
test("campaign export excludes partial financial totals and critical product paths never depend on observation", async () => {
  assert.throws(() => validateCampaignExport({ ...data, rows: [{ ...row, uncertainReceipts: 1 }] }));
  const code = await readFile(new URL("../lib/marketing/repository.ts", import.meta.url), "utf8");
  assert.match(code, /AbortSignal.timeout\(750\)/); assert.match(code, /catch/);
  assert.doesNotMatch(code, /generateSnapshot|openCheckout|start_sitefit_full|paymentReply/);
});
