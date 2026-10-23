import {test} from 'node:test';import assert from 'node:assert/strict';
import {proofFetch,runProofScope,proofFrozenInput,type ProofScope} from '../lib/proof/context.ts';

const request={method:'POST',body:JSON.stringify({model:'gpt-6.1-sol',service_tier:'default',store:false,max_output_tokens:1800,input:[{content:[{text:'{"section":"customer-base"}'}]}]})};
test('continuation checkpoints received AI output across process scopes without a second paid dispatch',async()=>{
 const rows=new Map<string,{id:string;state:string;body?:string}>();let requests=0,reservations=0;
 const scope:ProofScope={stage:'snapshot',inputRate:2.5,outputRate:10,frozenInput:{analysisId:'frozen-analysis',inputId:'frozen-input'},
  store:{async received(key){const r=rows.get(key);if(!r)return null;if(r.state!=='received'||!r.body)throw Error('no_resend');return r.body;},
   async reserve(key){assert.ok(!rows.has(key));reservations++;const id=String(rows.size);rows.set(key,{id,state:'intent'});return id;},
   async settle(id,state,_digest,body){const r=[...rows.values()].find(r=>r.id===id)!;r.state=state;r.body=body;}},
  fetcher:async()=>{requests++;return Response.json({status:'completed',model:'gpt-6.1-sol',output:[{type:'message',content:[{type:'output_text',text:'{"selected":true}'}]}],usage:{input_tokens:100,output_tokens:50},instructions:'discarded provider metadata'});}};
 assert.equal(proofFrozenInput(),undefined);
 const first=await runProofScope(scope,async()=>{assert.deepEqual(proofFrozenInput(),scope.frozenInput);return (await proofFetch('https://api.openai.com/v1/responses',request)).json();});
 const second=await runProofScope({...scope},async()=>(await proofFetch('https://api.openai.com/v1/responses',request)).json());
 assert.equal(requests,1);assert.equal(reservations,1);assert.deepEqual(second.output,first.output);assert.deepEqual(second.usage,first.usage);
 assert.equal('instructions' in second,false);assert.equal(proofFrozenInput(),undefined);
});

test('continuation never redispatches unknown AI or checkpoints source response bodies',async()=>{
 let requests=0,checkpoint:unknown='unset';let accepted=false;
 const scope:ProofScope={stage:'snapshot',inputRate:2.5,outputRate:10,
 store:{async received(){if(accepted)throw Error('manual_reconciliation');return null;},async reserve(){accepted=true;return 'one';},async settle(_id,_state,_digest,body){checkpoint=body;}},
 fetcher:async()=>{requests++;throw Error('ambiguous');}};
 await assert.rejects(runProofScope(scope,()=>proofFetch('https://api.openai.com/v1/responses',request)));
 await assert.rejects(runProofScope({...scope},()=>proofFetch('https://api.openai.com/v1/responses',request)));
 assert.equal(requests,1);assert.equal(checkpoint,undefined);
 scope.fetcher=async()=>Response.json({establishments:[]});
 await runProofScope(scope,()=>proofFetch('https://api.ratings.food.gov.uk/Establishments?pageNumber=1'));
 assert.equal(checkpoint,undefined);
});
