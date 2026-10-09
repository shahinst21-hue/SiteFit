import {test} from "node:test";
import assert from "node:assert/strict";
import {contextIndex,type DensityRank} from "../lib/analysis/context-index.ts";
const rank=(component:DensityRank["component"],less:number):DensityRank=>({component,code:component==="resident"?"E00000001":"E01000001",count:100,areaM2:1000,density:100000,less,equal:0,peers:100,eligible:100,memberDigest:"a".repeat(64),releaseId:"source",releaseChecksum:"b".repeat(64),geographyReleaseId:"geo",geographyChecksum:"c".repeat(64),referencePeriod:component==="resident"?"2021":"2024",footprintVerified:true,nonconstant:true,reasons:[]});
test("hypothetical context policy uses exact fixed business arithmetic",()=>{
 for(const [business,expected,reverse] of [["coffee-shop",58,62],["restaurant",62,58],["hair-beauty-salon",72,48]] as const){
  assert.equal(contextIndex(business,rank("resident",80),rank("workplace",40),true).display,expected);
  assert.equal(contextIndex(business,rank("resident",40),rank("workplace",80),true).display,reverse);
  assert.equal(contextIndex(business,rank("resident",50),rank("workplace",50),true).display,50);
 }
});
test("missingness and failed validation cannot produce or improve a number",()=>{
 const r=rank("resident",80),j=rank("workplace",40);
 for(const invalid of [null,{...j,footprintVerified:false},{...j,eligible:200},{...j,nonconstant:false},{...j,count:NaN},{...j,referencePeriod:"2026"},{...j,reasons:["conflict"]}]){
  const out=contextIndex("coffee-shop",r,invalid,true);assert.equal(out.state,"withheld");assert.equal(out.display,null);assert.ok(out.components[0].exact);
 }
 assert.equal(contextIndex("coffee-shop",r,j,false).display,null);
});
test("published zero and ties are retained, rounding happens only on final sum",()=>{
 const r={...rank("resident",0),count:0,density:0,equal:1},j={...rank("workplace",0),equal:1};
 const out=contextIndex("coffee-shop",r,j,true);assert.deepEqual(out.exact,{numerator:"1",denominator:"2"});assert.equal(out.display,1);
});
