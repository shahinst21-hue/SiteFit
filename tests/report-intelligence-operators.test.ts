import test from "node:test";
import assert from "node:assert/strict";
import { context, result, date, ids } from "./fixtures/data/framework.ts";
import { buildAssessment } from "../lib/analysis/assessment.ts";
import { buildCatalog, catalogPacket, type Fact } from "../lib/report-intelligence/catalog.ts";
import { projectOperators } from "../lib/report-intelligence/operators.ts";
import { decisionSummary } from "../lib/report-intelligence/decision-summary.ts";
import { evaluateScenarioFit } from "../lib/report-intelligence/scenario-fit.ts";
import { packetDigest } from "../lib/analysis/canonical.ts";
import { expandedProfiles } from "../lib/report-intelligence/profiles.ts";

function fixture() {
 const c=context(), r=result(); r.meta.source="fsa-establishments";r.meta.provider="fsa";r.meta.dataset="FHRS";r.meta.checksum="a".repeat(64);
 r.payload={schemaVersion:1,kind:"food_establishments",complete:true,items:[{id:"1",authorityId:"2",name:"Synthetic Cafe",businessType:"Restaurant/Cafe/Canteen",point:null,observedAt:null}]};
 r.observations=[{...r.observations[0],id:"1",recordId:"1",units:"establishment",reference:"https://ratings.food.gov.uk/business/1"}];
 r.meta.checksum=packetDigest({payload:r.payload,observations:r.observations});
 const a=buildAssessment(c,[],[],[],null,null,false,[],new Date(date));
 a.sourceBindings=[{snapshotId:ids.property,checksum:r.meta.checksum}];
 a.evidence=[{id:ids.correlation,snapshotId:ids.property} as typeof a.evidence[number]];
 const cat=buildCatalog(buildAssessment(c,[],[],[],null,null,false,[],new Date(date)),[],new Date(date));
 cat.facts.push({id:"fsa",evidenceId:ids.correlation,section:"competition",dataset:"FHRS",value:1,units:"returned records",
   scope:"Synthetic register",effectiveAt:null,strength:"limited",source:{provider:"fsa"}} as Fact);
 const {payload,...metadata}=r;
 return {c,a,cat,row:{id:ids.property,analysis_id:ids.analysis,input_id:ids.input,provider_metadata:metadata,normalised_data:payload}};
}
test("admitted frozen register names reach AI and export context, not invented operator attributes",()=>{
 const {c,a,cat,row}=fixture();const d=projectOperators(c,a,cat,[row],new Date(date));
 assert.equal(d.items[0].name,"Synthetic Cafe");assert.equal(d.items[0].observedAt,null);
 const p=JSON.stringify(catalogPacket(cat,["competition"]));assert.match(p,/Synthetic Cafe/);assert.match(p,/not direct competitors/);
 assert.doesNotMatch(p,/latitude|longitude/);assert.equal(d.complete,false);
 const denied=fixture();denied.cat.facts=[];assert.equal(projectOperators(denied.c,denied.a,denied.cat,[denied.row],new Date(date)).items.length,0);
 const mismatch=fixture();mismatch.row.input_id=ids.property;
 assert.throws(()=>projectOperators(mismatch.c,mismatch.a,mismatch.cat,[mismatch.row],new Date(date)),/binding_invalid/);
 const expired=fixture();expired.row.provider_metadata.meta.licence.normalised.maxDays=0;
 assert.equal(projectOperators(expired.c,expired.a,expired.cat,[expired.row],new Date(date)).items.length,0);
});
test("three concepts preserve decision consequences without selecting a format or inventing capacity",()=>{
 for(const businessType of ["coffee-shop","restaurant","hair-salon"] as const){
 const fit=evaluateScenarioFit({businessType,facts:[]}),summary=decisionSummary(fit,[]);
 assert.equal(summary.consultantVerdict.length,3);assert.equal(summary.rankedActions.length,4);
 assert.match(summary.rankedActions[0].consequence,/rule out/);assert.equal(fit.leadingFormatId,null);assert.equal(fit.numericalScore,null);
 assert.doesNotMatch(JSON.stringify(summary),/seats|success probability/);
 }
});
test("compact Census profile metadata expands losslessly and broken references fail closed",()=>{
 const input={version:"stored-profiles-v2",valueFields:["state","value"],allocationReleases:[{censusReleaseId:ids.release}],
   allocationLimitations:[["Dated allocated context"]],tables:[{dataset:"TS066",universe:"usual_residents_16_plus",values:[["available",42]],allocation:{releaseIndex:0,limitationsIndex:0,method:"synthetic"}}]};
 const expanded=expandedProfiles(input),table=(expanded.tables as Record<string,unknown>[])[0];
 assert.deepEqual(table.values,input.tables[0].values);assert.deepEqual(table.valueFields,input.valueFields);
 assert.deepEqual((table.allocation as Record<string,unknown>).releases,input.allocationReleases[0]);
 assert.deepEqual((table.allocation as Record<string,unknown>).limitations,input.allocationLimitations[0]);
 const broken=structuredClone(input);broken.tables[0].allocation.releaseIndex=1;assert.throws(()=>expandedProfiles(broken),/invalid_profile_metadata/);
 assert.equal(input.tables[0].allocation.releaseIndex,0);
});
