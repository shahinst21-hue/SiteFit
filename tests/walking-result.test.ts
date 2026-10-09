import test from "node:test";
import assert from "node:assert/strict";
import { validateWalkingCatchments, validateWalkingTopology } from "../lib/data/walking-result.ts";
const release="248a9600-59cb-4fbe-9791-d64f9cb28aa1";
const point={longitude:-.1,latitude:51.5,crs:"EPSG:4326" as const,precision:"building" as const,source:"os-open-uprn"};
function walking() {return {schemaVersion:1,provider:"geoapify",mode:"walk",type:"time",origin:point,retrievedAt:"2026-10-08T10:00:00Z",routingVersion:null,snappedOrigin:null,
 polygons:[300,600,900].map(seconds=>({seconds,geometry:{type:"Polygon",coordinates:[[[-.11,51.49],[-.09,51.49],[-.09,51.51],[-.11,51.49]]]}})),credits:{expected:6,observed:null}};}
function topology(){return {schemaVersion:1,geographyReleaseId:release,method:"postgis-bng-topology-1",parts:[300,600,900].map((seconds,i)=>({seconds,areaM2:100*(i+1),londonAreaM2:100*(i+1),londonCoverageFraction:1,originCovered:true,outsideNextFraction:i===2?null:0,vertices:4,polygons:1}))};}
test("stored walking geometry keeps fixed durations, exact OS basis and unknown routing/billing",()=>{
 const w=walking();assert.deepEqual(validateWalkingCatchments(w,point),w);
 for(const patch of [{routingVersion:"invented"},{snappedOrigin:[-.1,51.5]},{credits:{expected:6,observed:6}},{origin:{...point,precision:"postcode_centroid"}},{extra:"raw"}])assert.throws(()=>validateWalkingCatchments({...w,...patch},point));
 assert.throws(()=>validateWalkingCatchments(w,{...point,longitude:-.2}));
 const bad=walking();bad.polygons[1].seconds=300;assert.throws(()=>validateWalkingCatchments(bad));
});
test("topology operands preserve border coverage and reject fabricated area, nesting or source release",()=>{
 const t=topology();assert.deepEqual(validateWalkingTopology(t,release),t);
 t.parts[2].londonAreaM2=150;t.parts[2].londonCoverageFraction=.5;assert.equal(validateWalkingTopology(t,release).parts[2].londonCoverageFraction,.5);
 for(const patch of [{areaM2:0},{londonAreaM2:999},{londonCoverageFraction:0},{originCovered:false},{outsideNextFraction:.1},{vertices:20001}]) {
  const bad=topology();Object.assign(bad.parts[0],patch);assert.throws(()=>validateWalkingTopology(bad,release));
 }
 assert.throws(()=>validateWalkingTopology(t,"other"));
});
