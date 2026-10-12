import nextEnv from '@next/env';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {webEvidenceSearch,DiscoveryError,estimatedSearchUsd} from '../../lib/web-evidence/search.ts';

// Owner's 11 October one-shot $0.50 approval only. This is not runtime enablement.
const envDirectory=process.argv[2];
if(!envDirectory||process.env.VERCEL_ENV==='production')throw Error('development_proof_only');
nextEnv.loadEnvConfig(resolve(envDirectory),true,{info(){},error(){}});
if(!process.env.OPENAI_API_KEY||process.env.VERCEL_ENV==='production')throw Error('configuration_missing_or_production');
const out=resolve(envDirectory,'supabase/.temp'),at=new Date().toISOString();
const estimate=estimatedSearchUsd(128000,512,1);
if(estimate>.5)throw Error('budget_insufficient');
await mkdir(out,{recursive:true});
// Persist unknown-cost reservation BEFORE dispatch. Never remove/reset or retry this marker.
await writeFile(resolve(out,'rent-proof-20261011-dispatched.json'),JSON.stringify({approvedUsd:.5,reservedUsd:.5,at,
  plausibleEstimateUsd:estimate,inputCapEnforced:false,approval:'owner-rent-one-shot-2026-10-11'}),{flag:'wx'});
const provider=webEvidenceSearch({enabled:true,approvedUsd:.5});
try{
  const result=await provider.discover('67 Broadway Market, London E8 4PH',{kind:'rent'});
  await writeFile(resolve(out,'rent-proof-20261011-result.json'),JSON.stringify({outcome:'success',...result},null,2));
  console.log(JSON.stringify({outcome:'success',candidates:result.candidates,receipt:result.receipt}));
}catch(error){
  const result={outcome:error instanceof DiscoveryError?error.code:'invalid_response',receipts:provider.receipts(),reservedUsd:.5,retryAllowed:false};
  await writeFile(resolve(out,'rent-proof-20261011-result.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));process.exitCode=1;
}
