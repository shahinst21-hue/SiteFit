import test from "node:test";
import assert from "node:assert/strict";
import { epcAdapter } from "../lib/data/adapters/epc.ts";
import { premisesAdapter } from "../lib/data/adapters/premises.ts";
import { normalisePremises } from "../lib/data/adapters/propertydata-facts.ts";
import { validateEpcResult } from "../lib/data/epc-result.ts";
import { enrichmentReleaseKeys, type EnrichmentInput } from "../lib/data/enrichment-input.ts";
import type { CollectionContext, StoredSnapshot } from "../lib/data/contracts.ts";
import { context, ids, date } from "./fixtures/data/framework.ts";
const point={latitude:51.5,longitude:-.1,crs:"EPSG:4326" as const,precision:"building" as const,source:"os-open-uprn"};
const c:CollectionContext={...context(),schemaVersion:2,enrichment:{schemaVersion:1,releases:Object.fromEntries(enrichmentReleaseKeys.map(k=>[k,ids.release])) as EnrichmentInput["releases"],
 identity:{state:"matched",uprn:"123456789",point,coordinateBasis:"address_building_not_entrance",method:"exact_selected_address_components",retrievedAt:date,
 selectedParts:{primary:"10",secondary:null,street:"Synthetic Road",town:"London",postcode:"E8 4PH"},observedCredits:10,missingReason:null}}};
const execution={signal:new AbortController().signal,correlationId:ids.correlation,now:()=>new Date(date)}, request={context:c,collectionKey:"proof",radiusMetres:500};
async function parent() {
 const result=await premisesAdapter("propertydata-premises",()=>({premises:async s=>({...normalisePremises({status:"success",data:{address:s.address,addressParts:s.selectedParts,description:"Synthetic retail",lat:51.5,lng:-.1}},s),retrievedAt:date}),flood:async()=>{throw Error();},rent:async()=>{throw Error();}})).retrieve(request,execution);
 result.meta.checksum="a".repeat(64);
 return {id:ids.correlation,analysisId:c.analysisId,inputId:c.inputId,collectionKey:"proof",requestHash:"b".repeat(64),result} satisfies StoredSnapshot;
}
const certificate={data:{schema_type:"CEPC-8.0.0",assessment_type:"CEPC",uprn:123456789,status:"entered",property_type:"Synthetic retail",registration_date:"2026-10-01",inspection_date:"2026-09-30",issue_date:"2026-10-01",valid_until:"2036-09-30",current_energy_efficiency_band:"C",asset_rating:65,technical_information:{floor_area:193},address_line_1:"Restricted synthetic",assessor_name:"Private synthetic"}};
test("conditional EPC strips address fields and rejects false unit/current claims",async()=>{
 let calls=0;
 const result=await epcAdapter(await parent(),{key:"test-epc-key",fetcher:async(input,init)=>{
  calls++;const u=new URL(String(input));assert.equal(new Headers(init?.headers).get("Authorization"),"Bearer test-epc-key");assert.equal(u.search.includes("test-epc-key"),false);
  return Response.json(u.pathname.endsWith("search")?{data:[{uprn:123456789,schemaType:"CEPC-8.0.0",certificateNumber:"1111-2222-3333-4444-5555"}],pagination:{totalRecords:1}}:certificate);
 }}).retrieve(request,execution);
 assert.equal(calls,2);assert.equal(result.outcome,"partial");const payload=validateEpcResult(result.payload);
 assert.equal(payload.certificate?.nativeFloorArea.value,193);assert.equal(payload.certificate?.tradingUnitMatchConfirmed,false);
 assert.equal(JSON.stringify(payload).includes("Restricted synthetic"),false);
 assert.throws(()=>validateEpcResult({...payload,certificate:{...payload.certificate,currentCertificateConfirmed:true}}));
 assert.throws(()=>validateEpcResult({...payload,certificate:{...payload.certificate,address:"forbidden"}}));
});
test("empty, ambiguous and incomplete discovery do not fetch or invent a certificate",async()=>{
 for(const [records,total,selection] of [[0,0,"none"],[2,2,"ambiguous"],[1,4,"incomplete"]] as const){
  let calls=0;const result=await epcAdapter(await parent(),{key:"test-epc-key",fetcher:async()=>{calls++;return Response.json({data:Array.from({length:records},()=>({uprn:123456789,schemaType:"CEPC-8.0.0",certificateNumber:"1111-2222-3333-4444-5555"})),pagination:{totalRecords:total}});}}).retrieve(request,execution);
  const payload=validateEpcResult(result.payload);assert.equal(payload.discovery.selection,selection);assert.equal(payload.certificate,null);assert.equal(calls,1);
 }
 let calls=0;const result=await epcAdapter(undefined,{key:"test-epc-key",fetcher:async()=>{calls++;throw Error();}}).retrieve(request,execution);
 assert.equal(result.outcome,"unavailable");assert.equal(calls,0);
});
