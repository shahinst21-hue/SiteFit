import test from "node:test";
import assert from "node:assert/strict";
import { validateCatchmentOperands } from "../lib/data/catchment-result.ts";
const id="248a9600-59cb-4fbe-9791-d64f9cb28aa1";
const releases={geographyReleaseId:id,nativeReleaseId:id,censusReleaseId:id,incomeReleaseId:id,bresReleaseId:id};
function native(income:boolean){return {schemaVersion:2,releaseId:id,geographyReleaseId:id,geography:{type:income?"MSOA2021":"LSOA2021",code:income?"E02000001":"E01000001"},
 measure:{dataset:income?"income-AHC-FYE2023":"BRES2024",variable:income?"net income AHC":"employee jobs",unit:income?"GBP_household_year":"employee_jobs",universe:income?"equivalised_household_income_AHC":"employee_jobs",aggregation:income?"non_additive_mean":"additive_count",referencePeriod:income?"FYE2023":"2024"},
 value:income?40000:20,interval:income?{lower:35000,upper:48000,level:95}:null,state:"available",missingReason:null,quality:{sourceKind:income?"modelled":"measured",disclosureControl:"Synthetic source disclosure description",roundingIncrement:null},lineage:{sourceReference:"https://example.org/synthetic",sourceRecord:income?"E02000001":"E01000001",methodVersion:"synthetic",parentIds:[]}};}
function fixture(){return {schemaVersion:1,methodVersion:"area-uniform-bng1",allocation:"uniform_within_native_area_estimate",...releases,catchmentAreaM2:10,londonCoveredAreaM2:10,londonCoverageFraction:1,
 oaOperands:[{code:"E00000001",lsoaCode:"E01000001",msoaCode:"E02000001",intersectionAreaM2:10,nativeAreaM2:20,allocationFraction:.5,values:[10],missingReasons:[null]}],
 censusEstimates:[{columnOrdinal:1,knownContribution:5,missingAreaM2:0,state:"available"}],employeeJobsOperands:[{code:"E01000001",intersectionAreaM2:10,nativeAreaM2:20,nativeProfile:native(false),knownContribution:10}],incomeNativeContext:[native(true)],incomeMissingGeographies:[] as string[],limitations:["Synthetic uniform-area estimate"]};}
test("complete private operands retain native income and reconstruct employee allocation with explicit missing context",()=>{
 const f=fixture();assert.equal(validateCatchmentOperands(f,releases,1).allocation.metrics[0].knownContribution,5);assert.equal(f.incomeNativeContext[0].value,40000);
 const missing={...fixture(),incomeNativeContext:[],incomeMissingGeographies:["E02000001"]};assert.doesNotThrow(()=>validateCatchmentOperands(missing,releases,1));
 const jobs=fixture();jobs.employeeJobsOperands[0].nativeProfile=null as unknown as ReturnType<typeof native>;jobs.employeeJobsOperands[0].knownContribution=null as unknown as number;assert.doesNotThrow(()=>validateCatchmentOperands(jobs,releases,1));
});
test("native lineage cannot omit areas, invent employee operands, duplicate income or change geography",()=>{
 const changes=[(f:ReturnType<typeof fixture>)=>{f.employeeJobsOperands[0].knownContribution=20;},(f:ReturnType<typeof fixture>)=>{f.employeeJobsOperands[0].nativeProfile.geography.code="E01000002";},(f:ReturnType<typeof fixture>)=>{f.employeeJobsOperands=[];},(f:ReturnType<typeof fixture>)=>{f.incomeNativeContext=[];},(f:ReturnType<typeof fixture>)=>{f.incomeMissingGeographies=["E02000001"];},(f:ReturnType<typeof fixture>)=>{f.oaOperands[0].msoaCode="E02000002";}];
 for(const mutate of changes){const f=fixture();mutate(f);assert.throws(()=>validateCatchmentOperands(f,releases,1));}
});

