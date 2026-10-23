import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeRead} from '../lib/data/native-read.ts';
import {SourceError} from '../lib/data/errors.ts';
test('local source read recovers one transient failure and remains bounded',async()=>{
 let calls=0;assert.equal(await nativeRead(async()=>{if(++calls===1)throw new SourceError('timeout');return 42;},new AbortController().signal),42);assert.equal(calls,2);
 calls=0;await assert.rejects(nativeRead(async()=>{calls++;throw new SourceError('provider_unavailable');},new AbortController().signal));assert.equal(calls,2);
 calls=0;await assert.rejects(nativeRead(async()=>{calls++;throw new SourceError('invalid_response');},new AbortController().signal));assert.equal(calls,1);
 const controller=new AbortController();calls=0;await assert.rejects(nativeRead(async()=>{calls++;controller.abort();throw new SourceError('timeout');},controller.signal));assert.equal(calls,1);
});
