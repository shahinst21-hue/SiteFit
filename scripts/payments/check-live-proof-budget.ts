// Offline estimate only: no environment loading, credentials, fetch or dispatch.
// Run: node --conditions=react-server scripts/payments/check-live-proof-budget.ts
import assert from 'node:assert/strict';
import {analysisAI} from '../../lib/analysis/ai-provider.ts';
import {intelligencePolicy} from '../../lib/report-intelligence/execution.ts';
import {proofLimits} from '../../lib/proof/limits.ts';
assert.equal(analysisAI.model,'gpt-6.1-sol');assert.equal(intelligencePolicy.model,analysisAI.model);
// Official short-context standard tariff rechecked 17 October 2026.
// Price validity is distinct from the actual account's billing/tax/residency profile.
// No cache discounts assumed; the cache-write rate is the conservative input rate.
const inputMicrosPerToken=2.5,outputMicrosPerToken=10,framingAllowancePerCall=1000;
const snapshotInput=proofLimits.snapshotAiCalls*(proofLimits.maxEncodedAiBytes+framingAllowancePerCall);
const snapshotOutput=proofLimits.snapshotAiCalls*analysisAI.maxOutputTokens;
// Existing Full request encoded limits: context20k, premises20k, synthesis28k.
// Strict three-call proof only: no repair, question or fourth dispatch.
const fullInput=20_000+20_000+intelligencePolicy.maxRequestBytes+3*framingAllowancePerCall,fullOutput=3000+3000+6000;
const snapshotMicros=Math.ceil(snapshotInput*inputMicrosPerToken+snapshotOutput*outputMicrosPerToken);
const fullMicros=Math.ceil(fullInput*inputMicrosPerToken+fullOutput*outputMicrosPerToken);
assert.ok(snapshotMicros+fullMicros<=proofLimits.totalAiMicros,'Proof estimate exceeds admission ceiling');
assert.ok(fullMicros<=proofLimits.fullReserveMicros,'Full estimate exceeds existing reservation');
const combinedMicros=snapshotMicros+fullMicros, proposedMicros=proofLimits.totalAiMicros;
const usd=(micros:number)=>micros/1e6;
console.log(JSON.stringify({offline:true,authorisedSpend:0,model:analysisAI.model,serviceTier:'default',tariffReviewed:'2026-10-17',tariffSource:'https://developers.openai.com/api/docs/models/gpt-6.1-sol',
 snapshot:{calls:proofLimits.snapshotAiCalls,ordinaryCallCap:analysisAI.maxDispatches,inputAllowance:snapshotInput,outputCap:snapshotOutput,estimatedUpperUsd:usd(snapshotMicros),includesExistingSemanticRepairs:false,durableProofAdmissionCap:true},
 full:{calls:3,inputAllowance:fullInput,outputCap:fullOutput,estimatedUpperUsd:usd(fullMicros),existingReservationUsd:usd(proofLimits.fullReserveMicros),headroomUsd:usd(proofLimits.fullReserveMicros-fullMicros),workerSemanticRepair:false,reservationIsActualInvoiceCap:false},
 combinedEstimateUsd:usd(combinedMicros),proposedAiAllowanceUsd:usd(proposedMicros),headroomUsd:usd(proposedMicros-combinedMicros),headroomPercentOfEstimate:Number(((proposedMicros-combinedMicros)/combinedMicros*100).toFixed(2)),
 reconciliation:{previousSnapshotCalls:8,previousSnapshotInput:168000,previousSnapshotOutput:14400,previousSnapshotUsd:0.564,previousFullUsd:0.2975,previousCombinedUsd:0.8615,
  inputReductionUsd:0.0325,outputReductionUsd:0.054,totalReductionUsd:0.0865,
  explanation:'Proof disables repairs: five calls with31000 conservative input tokens each instead of eight with21000; Full unchanged. Full US$1.00 is included, not additional. Historical ordinary Full reservations stay unchanged.',
  snapshotAdmissionEnvelopeUsd:0.65,fullAdmissionEnvelopeUsd:1.00,aggregateEnvelopeUsd:1.65,commercialFullReservationOverlapsFullDispatches:true},
 sensitivity:[{assumption:'10% regional premium, only if applicable',percent:110},
 {assumption:'20% tax example, not a determination of actual tax',percent:120}].map(({assumption,percent})=>({assumption,
 combinedUsd:usd(Math.ceil(combinedMicros*percent/100)),fullUsd:usd(Math.ceil(fullMicros*percent/100)),
 fitsProposedAllowance:Math.ceil(combinedMicros*percent/100)<=proposedMicros,
 fitsFullReservation:Math.ceil(fullMicros*percent/100)<=proofLimits.fullReserveMicros})),
 actualAccountBillingVerified:false,onePurchaserPropertyConfinementImplemented:true,productionActivationApproved:false,
 assumptions:['one input token per bounded UTF-8 byte plus1000 framing tokens per call','standard global processing; no priority/ultrafast/regional premium','excludes tax, currency conversion, Stripe and source charges','does not prove provider tokenization, account billing profile or fleet-wide monetary enforcement'],
 executionBlockers:['account tariff/tax/credits/automatic billing unverified','new migration and protected application release require successful safety gates','proof activation and exact purchaser/property/nonce/policy/tariff approval absent','Snapshot US$0.65 and Full US$1.00 are separate sub-limits inside aggregate US$1.65'],
 readyForPaidExecution:false},null,2));
