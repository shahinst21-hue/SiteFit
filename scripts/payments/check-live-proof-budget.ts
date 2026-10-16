// Offline estimate only: no environment loading, credentials, fetch or dispatch.
// Run: node --conditions=react-server scripts/payments/check-live-proof-budget.ts
import assert from 'node:assert/strict';
import {analysisAI} from '../../lib/analysis/ai-provider.ts';
import {intelligencePolicy} from '../../lib/report-intelligence/execution.ts';
assert.equal(analysisAI.model,'gpt-6.1-sol');assert.equal(intelligencePolicy.model,analysisAI.model);
// Official standard tariff reviewed 16 October 2026. No cache discounts assumed.
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
console.log(JSON.stringify({offline:true,authorisedSpend:0,model:analysisAI.model,serviceTier:'default',tariffSource:'https://developers.openai.com/api/docs/models/gpt-6.1-sol',snapshot:{calls:analysisAI.maxDispatches,inputAllowance:snapshotInput,outputCap:snapshotOutput,estimatedUpperUsd:snapshotMicros/1e6,proposedAllowanceUsd:0.60},full:{calls:3,inputAllowance:fullInput,outputCap:fullOutput,estimatedUpperUsd:fullMicros/1e6,existingReservationUsd:intelligencePolicy.reportReserveMicros/1e6},combinedEstimateUsd:(snapshotMicros+fullMicros)/1e6,proposedAiAllowanceUsd:0.90,assumptions:['one input token per bounded UTF-8 byte plus1000 framing tokens per call','standard global processing; no priority/ultrafast/regional premium','excludes tax, currency conversion, Stripe and source charges','does not prove provider tokenization, account billing profile or fleet-wide monetary enforcement'],readyForPaidExecution:false},null,2));
