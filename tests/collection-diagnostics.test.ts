import test from 'node:test';
import assert from 'node:assert/strict';
import {traceCollection,collectionDiagnostic,reportMissingSources} from '../lib/analysis/collection-diagnostics.ts';
import {SourceError} from '../lib/data/errors.ts';
test('collection failure records a safe phase/code and rethrows once without retry or payload leakage',async()=>{
 const logs:unknown[]=[];let calls=0;
 const error=new SourceError('timeout',504);error.message='Authorization: sb_secret_private token user@example.invalid';
 await assert.rejects(traceCollection('station-access',async()=>{calls++;throw error;},(event,detail)=>logs.push({event,detail})),e=>e===error);
 assert.equal(calls,1);assert.deepEqual(logs,[{event:'snapshot_collection_failure',detail:{group:'station-access',code:'timeout',status:504}}]);
 assert.deepEqual(collectionDiagnostic('premises',new Error('sk_live_private https://provider.invalid?key=secret')),{group:'premises',code:'unclassified',status:null});
 await assert.rejects(traceCollection('native-context',async()=>{throw error;},()=>{throw Error('logger failed');}),e=>e===error);
});
test('missing source diagnostics distinguish unsaved outcomes and exclude payloads and unknown source names',()=>{
 const logs:unknown[]=[];
 reportMissingSources([{outcomes:[{source:'ons-jobs-context',snapshot:null,error:{code:'persistence_failed'}},{source:'ons-population',snapshot:{private:'not logged'},error:null},{source:'email@example.invalid',snapshot:null,error:{code:'token'}}]}],(event,detail)=>logs.push({event,detail}));
 assert.deepEqual(logs,[{event:'snapshot_collection_missing',detail:{missing:[{source:'ons-jobs-context',code:'persistence_failed'}]}}]);
});
