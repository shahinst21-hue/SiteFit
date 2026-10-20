import {test} from "node:test";
import assert from "node:assert/strict";
import {buildAssessment,validateAssessment,assessmentPacket} from "../lib/analysis/assessment.ts";
import {assessmentRepository} from "../lib/analysis/assessment-repository.ts";
import {context,ids,date} from "./fixtures/data/framework.ts";
const fixture=()=>buildAssessment(context(),[],[],[],null,null,true,[],new Date(date));
test("absent precise identity retains unknown decision, never fabricates an index",()=>{
 const b=fixture();assert.equal(b.index.state,"withheld");assert.equal(b.index.display,null);assert.equal(b.decision.premises.status,"unresolved");
 const safe=JSON.stringify(assessmentPacket(b));assert.ok(!safe.includes(context().selectedProperty.formattedAddress));assert.ok(!safe.includes(ids.analysis));
});
test("closed historical contract rejects schema, price-data and publication tampering",()=>{
 const b=fixture();assert.throws(()=>validateAssessment({...b,unknown:true}));
 assert.throws(()=>validateAssessment({...b,index:{...b.index,display:80}}));
 assert.throws(()=>validateAssessment({...b,supplements:[{kind:"financial_engine",bundle:{}}]}));
 assert.throws(()=>validateAssessment({...b,decision:{...b.decision,claims:[{id:"fake",supportingIds:[ids.input]}]}}));
});
test("stored replay performs only owned read: no comparison, calculator, provider or AI entry",async()=>{
 const b=fixture();const calls:string[]=[];
 const client={rpc(name:string){calls.push(name);assert.equal(name,"read_sitefit_assessment");return Promise.resolve({data:b,error:null});},from(){throw Error("Forbidden collection/prepare on replay");}};
 const repo=assessmentRepository(ids.analysis,client as unknown as Parameters<typeof assessmentRepository>[1]);
 assert.deepEqual(await repo.prepare(ids.analysis,ids.input),b);assert.deepEqual(calls,["read_sitefit_assessment"]);
});
test("cross-owner read failure cannot fall through to privileged preparation",async()=>{
 const client={rpc(){return Promise.resolve({data:null,error:{message:"private_details_withheld"}});},from(){throw Error("Unowned context accessed");}};
 await assert.rejects(assessmentRepository(ids.analysis,client as unknown as Parameters<typeof assessmentRepository>[1]).prepare(ids.analysis,ids.input),/^Error: permission_denied$/);
});

test("unavailable capability keeps its exact source reference without inventing a payload checksum",()=>{
 const b=fixture();
 const reference={id:ids.input,snapshotId:ids.property,digest:"a".repeat(64),source:{dataset:"unavailable",provider:"tfl",reference:"https://tfl.gov.uk/",releaseId:null,adapterVersion:"1"},kind:"capability" as const,scope:"Source unavailable",value:null,units:null,effectiveAt:null,statistical:null,parents:[],licence:{policyId:"tfl",version:1,expiresAt:null}};
 b.evidence=[reference];
 b.decision.admissions=[{evidenceId:reference.id,disposition:"blocked",axes:{identity:"limited",permission:"adequate",date:"limited",measurement:"fails",parents:"adequate",conflict:"adequate"},reasons:["Source unavailable"]}];
 assert.doesNotThrow(()=>validateAssessment(b));
 assert.equal(validateAssessment(b).evidence[0]!.snapshotId,ids.property);
 for(const changed of [{kind:"measured"},{value:1},{effectiveAt:date},{parents:[ids.analysis]},{snapshotId:"foreign"}])
  assert.throws(()=>validateAssessment({...b,evidence:[{...reference,...changed}]}),/foreign_assessment_evidence/);
 assert.throws(()=>validateAssessment({...b,evidence:[reference,reference]}),/foreign_assessment_evidence/);
});
