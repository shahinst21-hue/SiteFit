# Phase16 campaign measurement — v1

## Operator procedure

1. Choose an approved campaign code: campaign-01, campaign-02 or campaign-03. Prepare a link to the existing approved public origin with only `?sf_campaign=campaign-01`. No property/person/click identifiers in URLs. Production links and actual advertising are Phase17 work.
2. Measurement is disabled by default. `SITEFIT_CAMPAIGN_MEASUREMENT=1` permits Local/Preview verification only; Production is refused even with the flag. No paid/source flags are enabled by this setting.
3. Visitor may explicitly Allow measurement or No thanks. Only Allow sets `sitefit_campaign`, HTTP-only SameSite Lax, session-only, Secure on HTTPS. A small footer preference permits stopping future collection. No marketing consent is bundled into checkout.
4. Successful owned Snapshot generation observes the campaign; owned purchase start marks an existing/new fresh association. Neither analytics operation creates a Snapshot, payment or inference. Missing/expired cookie, errors and old reports remain unattributed. Login can retain the same browser cookie; cross-device/restarted-session attribution is not promised.
5. Run the explicit development-only read export with privately configured existing Supabase credentials:

```powershell
node --conditions=react-server scripts/marketing/export-campaign.ts 2026-10-01T00:00:00Z 2026-10-13T00:00:00Z supabase/.temp/campaign-aggregate.json
node scripts/marketing/campaign-results.ts supabase/.temp/campaign-aggregate.json docs/campaigns/spend-template.json supabase/.temp/campaign-results.md
```

Dates above illustrate the command; choose a valid nonfuture range, maximum 93 days. This query cap is not retention policy. Do not commit operational inputs/outputs or credentials. Output has no identifiers, addresses, report text or source payloads. Export returns only current Test outcomes; it cannot prove commercial demand. Input schema rejects unexpected fields and inconsistent totals. Known empty aggregate means zero matching records; missing traffic/spend means Unknown.

## Metric definitions

| Metric | Exact basis |
|---|---|
| Snapshots | Distinct analyses with a Ready free report whose earliest Ready free report creation falls in the cohort |
| Purchase starts | One timestamp per attributed analysis from an authorised purchase-start POST; unavailable for unattributed analyses |
| Checkout attempts | Existing payment-version-1 Test records, including unpaid/failed attempts |
| Confirmed payments | Verified Test records with status succeeded or refunded; not browser return parameters |
| Snapshot → paid | Distinct cohort analyses with at least one verified succeeded/refunded payment divided by cohort Snapshots |
| Retained payments | Verified succeeded, active access, no reversal; payment count, not unique customers |
| Full refunds | Verified full-refund state |
| Ready analyses | Distinct cohort analyses with stored Ready Full Report; not customer receipt |
| Requests | Distinct payments with recorded cancellation/problem requests; not amounts refunded |
| Interrupted | Current cohort payment jobs in intervention or awaiting_authorisation; not a failure diagnosis |
| Net receipts | Clean retained face-value amounts, withheld if any confirmed partial/pending refund/dispute in the cohort. Fees/tax/generation costs excluded |
| Spend and traffic | Owner-entered source records. Keep source/date/window in campaign review notes |
| Cost / retained payment | Campaign spend divided by retained payment count; undefined at zero, not lifetime/unique-customer CAC |

Reports use a Snapshot cohort, not payment-period accounting; late conversions/refunds alter later exports. Save as-of timestamp. This is a low-volume campaign decision aid, not financial accounting. Consent-selection bias, copied campaign codes and attribution loss limit comparisons. Never equate unattributed to organic traffic. Record qualitative purchaser feedback without putting personal/property details in this export.

## Privacy and operational boundary

Campaign association is private, browser roles have no table/RPC access; server verifies ownership after existing generation/start validation. Stored data is limited to existing analysis/report references, campaign code and stage timestamps. No new report fields, payment parameters or historical projection mutations. Storage capacity remains 450,000,000 bytes. Before any hosted schema writes, recheck capacity and historical fingerprints.

Production collection, retention/erasure arrangements, legal disclosure, compliant hosting and Live counting remain separate launch gates. Removing consent does not certify deletion of past linked records. Keep measurement disabled commercially until those gates are resolved under separate authority.
