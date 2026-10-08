import test from "node:test";
import assert from "node:assert/strict";
import { prepareEnrichmentIdentity, validateEnrichmentReleaseSelection } from "../lib/data/enrichment-preparation.ts";
import { enrichmentReleaseKeys, type EnrichmentInput } from "../lib/data/enrichment-input.ts";
import { normaliseManualAddress } from "../lib/addresses/model.ts";
import type { ResolvedAddress } from "../lib/addresses/model.ts";
import { context } from "./fixtures/data/framework.ts";
const id=context().region.boundaryReleaseId, releases=Object.fromEntries(enrichmentReleaseKeys.map(k=>[k,id])) as EnrichmentInput["releases"];
function selected():ResolvedAddress {
 const address=normaliseManualAddress({line1:"67 Synthetic Street",line2:"",town:"London",postcode:"E8 4PH"});
 return {...address,resolution:"provider_verified",provider:"postio",providerAddressId:"10001",components:{...address.components,buildingNumber:"67",thoroughfare:"Synthetic Street"}};
}
function candidates(){return {schemaVersion:1 as const,outcome:"success" as const,retrievedAt:"2026-10-08T10:00:00Z",credits:10,sourceDate:null,candidates:[{uprn:"10008292401",address:"67 Synthetic Street London E8 4PH",point:{longitude:-.1,latitude:51.5,crs:"EPSG:4326" as const,precision:"unknown" as const,source:"propertydata-uprn"},classificationCode:"CR07",classificationDescription:"Synthetic commercial",parts:{primary:"67",secondary:null,street:"Synthetic Street",town:"London",district:null,postcode:"E8 4PH"}}]};}
test("new input preparation keeps the selected canonical components and an independently joined OS point, without candidates",async()=>{
 let calls=0;const result=await prepareEnrichmentIdentity(selected(),releases,undefined,{resolve:async()=>{calls++;return candidates();},os:async()=>({uprn:"10008292401",releaseId:id,precision:"address_building_not_entrance",latitudeE7:515000000,longitudeE7:-1000000})});
 assert.equal(calls,1);assert.equal(result.identity.state,"matched");assert.equal(result.identity.point?.source,"os-open-uprn");assert.equal(result.identity.selectedParts?.primary,"67");assert.equal(result.identity.observedCredits,10);assert.ok(!JSON.stringify(result).includes('"candidates"'));
 const manual={...selected(),resolution:"manual_unverified" as const};await prepareEnrichmentIdentity(manual,releases,undefined,{resolve:async()=>{calls++;throw Error();}});assert.equal(calls,1);
});
test("unit mismatch, native coordinate conflict and unavailable OS cannot become precise evidence or spend a chained retry",async()=>{
 let calls=0;const resolve=async()=>{calls++;return candidates();};
 const unit=selected();unit.components.subBuilding="Flat 1";
 const absent=await prepareEnrichmentIdentity(unit,releases,undefined,{resolve,os:async()=>{throw Error('No OS for mismatched unit');}});assert.equal(absent.identity.state,"unresolved");assert.equal(absent.identity.point,null);
 const conflict=await prepareEnrichmentIdentity(selected(),releases,undefined,{resolve,os:async()=>({uprn:"10008292401",releaseId:id,precision:"address_building_not_entrance",latitudeE7:515000000,longitudeE7:-2000000})});assert.equal(conflict.identity.missingReason,"provider_os_coordinate_conflict");
 const missing=await prepareEnrichmentIdentity(selected(),releases,undefined,{resolve,os:async()=>null});assert.equal(missing.identity.state,"unresolved");assert.equal(calls,3);
});
test("private release selection requires the complete vector and legacy parent agreement",()=>{
 const row={schemaVersion:1,legacy:context().releases,enrichment:releases};assert.deepEqual(validateEnrichmentReleaseSelection(row).enrichment,releases);
 assert.throws(()=>validateEnrichmentReleaseSelection({...row,enrichment:{...releases,censusReleaseId:null}}));assert.throws(()=>validateEnrichmentReleaseSelection({...row,enrichment:{...releases,extra:id}}));
});
