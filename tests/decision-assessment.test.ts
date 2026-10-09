import {test} from "node:test";
import assert from "node:assert/strict";
import {decisionAssessment,decisionPriority} from "../lib/analysis/decision-assessment.ts";
import type {Evidence} from "../lib/analysis/evidence.ts";
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const now=new Date("2026-10-09T00:00:00Z");
function evidence(n=3):Evidence{return {schemaVersion:1,id:id(n),analysisId:id(1),inputId:id(2),snapshotId:null,sections:["customer-base"],source:{provider:"ons",dataset:"TS001",releaseId:id(9),reference:"https://www.ons.gov.uk/",adapterVersion:"test"},sourceClass:"official_public",kind:"measured",scope:"Dated native resident context",value:300,units:"persons",retrievedAt:now.toISOString(),effectiveAt:"2021-03-21",geography:{precision:"building",crs:"EPSG:4326",scope:"OA2021",method:"point_in_polygon"},quality:{available:true,partial:false,freshness:"stale",limitations:["Dated 2021; not customer demand."]},parents:[],observationIds:[],licence:{policyId:"ons",version:1,representationAllowed:true,expiresAt:null,notices:[]}};}
test("dated context creates conditional reasoning but cannot clear premises",()=>{
 for(const business of ["coffee-shop","restaurant","hair-beauty-salon"] as const){const out=decisionAssessment(business,[evidence()],id(1),id(2),now);assert.equal(out.claims.length,1);assert.equal(out.claims[0].direction,"conditional");assert.equal(out.premises.status,"unresolved");assert.equal(out.stance,"resolve_material_condition_first");assert.ok(out.claims[0].unresolved.length);}
});
test("rights/source failure isolates an observation, without erasing surviving context",()=>{
 const bad={...evidence(4),source:{...evidence(4).source,dataset:"other"},licence:{...evidence().licence,representationAllowed:false}};
 const out=decisionAssessment("coffee-shop",[evidence(),bad],id(1),id(2),now);assert.equal(out.claims.length,1);assert.equal(out.admissions[1].disposition,"blocked");
 const expired={...evidence(),licence:{...evidence().licence,expiresAt:"2026-10-08T00:00:00Z"}};assert.equal(decisionAssessment("coffee-shop",[expired],id(1),id(2),now).claims.length,0);
});
test("conflicting same-construct evidence survives but cannot produce a favourable claim",()=>{
 const out=decisionAssessment("coffee-shop",[evidence(),{...evidence(4),value:100}],id(1),id(2),now);assert.equal(out.admissions.length,2);assert.equal(out.claims.length,0);
 const differentPeriod={...evidence(4),value:100,effectiveAt:"2011-03-27"};assert.ok(decisionAssessment("coffee-shop",[evidence(),differentPeriod],id(1),id(2),now).admissions.every(a=>a.disposition!=="blocked"));
});
test("confirmed scoped blockers dominate decision priority, independently of any index",()=>{
 assert.deepEqual(decisionPriority("confirmed_incompatible_in_scope",true),{readiness:"confirmed_blocker",stance:"do_not_proceed_with_present_concept"});
 assert.equal(decisionPriority("unresolved",false).stance,"insufficient_basis_for_case");
 assert.throws(()=>decisionAssessment("coffee-shop",[evidence()],id(1),id(2),now,[{id:"invented",state:"confirmed_blocker",meaning:"History proves prohibited use",supportingIds:[id(3)]}]),/authoritative/);
});
test("foreign IDs and unsupported derived parent graphs fail closed",()=>{
 assert.throws(()=>decisionAssessment("coffee-shop",[{...evidence(),inputId:id(7)}],id(1),id(2),now));
 assert.throws(()=>decisionAssessment("coffee-shop",[{...evidence(),kind:"derived",parents:[id(8)]}],id(1),id(2),now));
});
