import test from 'node:test';
import assert from 'node:assert/strict';
import {observeAccountIdentity} from '../lib/auth/navigation.ts';
test('navigation follows permanent sign-in, sign-out, anonymous conversion and unsubscribes',async()=>{
 let listener:(event:string,session:unknown)=>void=()=>{};let finish:(v:unknown)=>void=()=>{};let unsubscribed=false;const states:boolean[]=[];
 const auth={getUser:()=>new Promise(resolve=>{finish=resolve;}),onAuthStateChange:(callback:typeof listener)=>{listener=callback;return {data:{subscription:{unsubscribe:()=>{unsubscribed=true;}}}};}};
 const stop=observeAccountIdentity(auth as unknown as Parameters<typeof observeAccountIdentity>[0],value=>states.push(value));
 listener('SIGNED_IN',{user:{is_anonymous:false}});assert.deepEqual(states,[true]);
 listener('SIGNED_OUT',null);finish({data:{user:{is_anonymous:false}},error:null});await Promise.resolve();assert.deepEqual(states,[true,false]);
 listener('INITIAL_SESSION',{user:{is_anonymous:true}});assert.equal(states.at(-1),false);
 listener('USER_UPDATED',{user:{is_anonymous:false}});assert.equal(states.at(-1),true);
 stop();listener('SIGNED_OUT',null);assert.equal(states.at(-1),true);assert.equal(unsubscribed,true);
});
test('initial verified user read and unavailable Auth resolve without granting account authority',async()=>{
 for(const [user,error,expected] of [[{is_anonymous:false},null,true],[{is_anonymous:true},null,false],[null,null,false],[{is_anonymous:false},{message:'unavailable'},false]] as const){
 const states:boolean[]=[];
 const auth={getUser:async()=>({data:{user},error}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})};
 const stop=observeAccountIdentity(auth as unknown as Parameters<typeof observeAccountIdentity>[0],v=>states.push(v));await Promise.resolve();assert.deepEqual(states,[expected]);stop();
 }
});
