// Offline estimate only: no environment loading, credentials, fetch or dispatch.
// Run: node --conditions=react-server scripts/payments/check-live-proof-budget.ts
import assert from 'node:assert/strict';
import {analysisAI} from '../../lib/analysis/ai-provider.ts';
import {intelligencePolicy} from '../../lib/report-intelligence/execution.ts';
assert.equal(analysisAI.model,'gpt-6.1-sol');assert.equal(intelligencePolicy.model,analysisAI.model);
// Official short-context standard tariff rechecked 17 October 2026.
// Price validity is distinct from the actual account's billing/tax/residency profile.
// No cache discounts assumed; the cache-write rate is the conservative input rate.
const inputMicrosPerToken=2.5,outputMicrosPerToken=10,framingAllowancePerCall=1000;
const snapshotInput=analysisAI.maxDispatches*(analysisAI.maxPacketBytes+analysisAI.maxInstructionsBytes+analysisAI.maxSchemaBytes+framingAllowancePerCall);
const snapshotOutput=analysisAI.maxDispatches*analysisAI.maxOutputTokens;
// Existing Full request encoded limits: context20k, premises20k, synthesis28k.
// Strict three-call proof only: no repair, question or fourth dispatch.
const fullInput=20_000+20_000+intelligencePolicy.maxRequestBytes+3*framingAllowancePerCall,fullOutput=3000+3000+6000;
const snapshotMicros=Math.ceil(snapshotInput*inputMicrosPerToken+snapshotOutput*outputMicrosPerToken);
const fullMicros=Math.ceil(fullInput*inputMicrosPerToken+fullOutput*outputMicrosPerToken);
assert.ok(snapshotMicros<=600_000,'Snapshot estimate exceeds proposed allowance');
assert.ok(fullMicros<=intelligencePolicy.reportReserveMicros,'Full estimate exceeds existing reservation');
const combinedMicros=snapshotMicros+fullMicros, proposedMicros=900_000;
const usd=(micros:number)=>micros/1e6;
console.log(JSON.stringify({offline:true,authorisedSpend:0,model:analysisAI.model,serviceTier:'default',tariffReviewed:'2026-10-17',tariffSource:'https://developers.openai.com/api/docs/models/gpt-6.1-sol',
 snapshot:{calls:analysisAI.maxDispatches,inputAllowance:snapshotInput,outputCap:snapshotOutput,estimatedUpperUsd:usd(snapshotMicros),proposedAllowanceUsd:0.60,headroomUsd:usd(600_000-snapshotMicros),includesExistingSemanticRepairs:true,durableGlobalMonetaryCap:false},
 full:{calls:3,inputAllowance:fullInput,outputCap:fullOutput,estimatedUpperUsd:usd(fullMicros),existingReservationUsd:usd(intelligencePolicy.reportReserveMicros),headroomUsd:usd(intelligencePolicy.reportReserveMicros-fullMicros),workerSemanticRepair:false,reservationIsActualInvoiceCap:false},
 combinedEstimateUsd:usd(combinedMicros),proposedAiAllowanceUsd:usd(proposedMicros),headroomUsd:usd(proposedMicros-combinedMicros),headroomPercentOfEstimate:Number(((proposedMicros-combinedMicros)/combinedMicros*100).toFixed(2)),
 sensitivity:[{assumption:'10% regional premium, only if applicable',percent:110},
 {assumption:'20% tax example, not a determination of actual tax',percent:120}].map(({assumption,percent})=>({assumption,
 combinedUsd:usd(Math.ceil(combinedMicros*percent/100)),fullUsd:usd(Math.ceil(fullMicros*percent/100)),
 fitsProposedAllowance:Math.ceil(combinedMicros*percent/100)<=proposedMicros,
 fitsFullReservation:Math.ceil(fullMicros*percent/100)<=intelligencePolicy.reportReserveMicros})),
 actualAccountBillingVerified:false,onePurchaserPropertyConfinementVerified:false,
 assumptions:['one input token per bounded UTF-8 byte plus1000 framing tokens per call','standard global processing; no priority/ultrafast/regional premium','excludes tax, currency conversion, Stripe and source charges','does not prove provider tokenization, account billing profile or fleet-wide monetary enforcement'],
 executionBlockers:['account tariff/tax/credits/automatic billing unverified','Snapshot repairs conflict with a no-retry proof unless explicitly disabled','Snapshot in-flight control is process-local; durable one-case dispatch fencing is required','Full reservation does not restrict the purchaser or property; exact case binding is required'],
 readyForPaidExecution:false},null,2));
