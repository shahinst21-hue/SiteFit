import test from 'node:test';
import assert from 'node:assert/strict';
import {runProofScope,proofFetch,type ProofScope} from '../lib/proof/context.ts';
import {interpretSections,synthesiseSections} from '../lib/analysis/section-engine.ts';
import {context,result,ids} from './fixtures/data/framework.ts';
import {sectionPackets} from '../lib/analysis/packets.ts';
import {analysisAIProvider} from '../lib/analysis/ai-provider.ts';
import {proofPolicy} from '../lib/proof/repository.ts';

function harness(options:{fail?:boolean;settlementFails?:boolean}={}){
 const journal=new Map<string,{id:string;state:string;reserve:number}>();let calls=0,total=0;
 const scope:ProofScope={stage:'snapshot',inputRate:2.5,outputRate:10,
  store:{async reserve(key,_kind,_digest,micros){
   if(journal.has(key)||total+micros>1650000||[...journal.values()].some(d=>d.state==='ambiguous'))throw Error('denied');
   total+=micros;const id=String(journal.size+1);journal.set(key,{id,state:'intent',reserve:micros});return id;
  },async settle(id,state){if(options.settlementFails)throw Error('lost_ack');const row=[...journal.values()].find(r=>r.id===id)!;if(row.state!=='intent')throw Error('settled');row.state=state;}},
  fetcher:async()=>{calls++;assert.ok([...journal.values()].some(r=>r.state==='intent'));if(options.fail)throw Error('timeout');return Response.json({status:'completed'});},
 };
 return {scope,journal,calls:()=>calls,total:()=>total};
}
const request={method:'POST',body:JSON.stringify({model:'gpt-6.1-sol',service_tier:'default',store:false,max_output_tokens:1800})};
test('proof authority stays off; concurrent identical dispatches have one committed intent and one external call',async()=>{
 assert.equal(proofPolicy.activationApproved,false);assert.equal(proofPolicy.totalAiMicros,1650000);
 const h=harness();const results=await runProofScope(h.scope,()=>Promise.allSettled([
  proofFetch('https://api.openai.com/v1/responses',request),proofFetch('https://api.openai.com/v1/responses',request)]));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(h.calls(),1);assert.equal(h.journal.size,1);
 assert.equal([...h.journal.values()][0].state,'received');assert.ok(h.total()>18000);
 // New browser/process scope, same durable store: accepted request cannot dispatch again.
 await assert.rejects(runProofScope({...h.scope},()=>proofFetch('https://api.openai.com/v1/responses',request)));
 assert.equal(h.calls(),1);
});
test('timeout and lost settlement acknowledgement retain reservation and cannot redispatch',async()=>{
 for(const option of [{fail:true},{settlementFails:true}]){
  const h=harness(option);
  await assert.rejects(runProofScope(h.scope,()=>proofFetch('https://api.openai.com/v1/responses',request)),/reconciliation/);
  const held=h.total();assert.ok(held>0);
  await assert.rejects(runProofScope({...h.scope},()=>proofFetch('https://api.openai.com/v1/responses',request)));
  assert.equal(h.calls(),1);assert.equal(h.total(),held);
  assert.ok(['ambiguous','intent'].includes([...h.journal.values()][0].state));
 }
});
test('credential rotation and query order cannot turn an accepted source call into a new dispatch',async()=>{
 const h=harness();
 await runProofScope(h.scope,()=>proofFetch('https://api.geoapify.com/v1/isoline?lat=1&lon=2&apiKey=synthetic-one'));
 await assert.rejects(runProofScope({...h.scope},()=>proofFetch('https://api.geoapify.com/v1/isoline?apiKey=synthetic-two&lon=2&lat=1')));
 assert.equal(h.calls(),1);
});
test('a response-body interruption is ambiguous and retains the dispatch intent cost',async()=>{
 const h=harness();h.scope.fetcher=async()=>new Response(new ReadableStream({start(controller){controller.error(Error('body interrupted'));}}));
 await assert.rejects(runProofScope(h.scope,()=>proofFetch('https://api.openai.com/v1/responses',request)),/reconciliation/);
 assert.equal([...h.journal.values()][0].state,'ambiguous');assert.ok(h.total()>0);
});
test('proof rejects unexpected providers, tools, premium tiers and oversized payloads before intent/fetch',async()=>{
 const h=harness();
 for(const [url,body] of [['https://foreign.invalid/','{}'],['https://api.openai.com/v1/responses',JSON.stringify({...JSON.parse(request.body),tools:[{type:'web_search'}]})],
 ['https://api.openai.com/v1/responses',JSON.stringify({...JSON.parse(request.body),service_tier:'ultrafast'})],['https://api.openai.com/v1/responses','x'.repeat(31000)]])
 await assert.rejects(runProofScope(h.scope,()=>proofFetch(url,{method:'POST',body})));
 assert.equal(h.calls(),0);assert.equal(h.journal.size,0);
});
test('a controlled Snapshot never performs the existing semantic repair loop',async()=>{
 const h=harness(),c=context(),r=result();r.outcome='partial';
 const prepared=sectionPackets(c,[{id:ids.correlation,analysisId:ids.analysis,inputId:ids.input,collectionKey:'free-v1',requestHash:'fixture',result:r}],null,new Date());
 const invalid=()=>analysisAIProvider({key:'sk-fixture',fetch:async()=>Response.json({status:'completed',model:'gpt-6.1-sol',output:[{type:'message',content:[{type:'output_text',text:'{"invalid":true}'}]}],usage:{input_tokens:100,output_tokens:10}})});
 const proof=invalid();const output=await runProofScope(h.scope,()=>interpretSections(prepared.packets,prepared.index,proof));
 assert.equal(proof.dispatches(),1);assert.equal(output.errors.length,1);
 const ordinary=invalid();await interpretSections(prepared.packets,prepared.index,ordinary);assert.equal(ordinary.dispatches(),2);
 const empty=sectionPackets(c,[],null,new Date());
 const sections=await interpretSections(empty.packets,empty.index,invalid());
 const synthesis=invalid();await assert.rejects(runProofScope(h.scope,()=>synthesiseSections(sections.sections,synthesis)));
 assert.equal(synthesis.dispatches(),1);
});
