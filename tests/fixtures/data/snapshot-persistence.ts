import {sourceIds,type CollectionContext,type StoredSnapshot} from '../../../lib/data/contracts.ts';
import {definitions} from '../../../lib/data/registry.ts';
import {initialResult} from '../../../lib/data/result.ts';
import {enrichmentReleaseKeys,type EnrichmentInput} from '../../../lib/data/enrichment-input.ts';
import {catchmentDatasets,catchmentReleaseKeys} from '../../../lib/data/catchment-sources.ts';
import columns from '../../../lib/data/census-columns.json' with {type:'json'};
import {packetDigest} from '../../../lib/analysis/canonical.ts';
import {context} from './framework.ts';

export function persistenceFixture(businessType:CollectionContext['businessType']='coffee-shop',unavailable=false){
 const now=new Date(),release=context().region.boundaryReleaseId;
 const c:CollectionContext={...context(),analysisId:crypto.randomUUID(),inputId:crypto.randomUUID(),analysisTimestamp:now.toISOString(),
  businessType,category:businessType.includes('salon')?'hair-beauty-salon':businessType as 'coffee-shop'|'restaurant',schemaVersion:2,
  enrichment:{schemaVersion:1,releases:Object.fromEntries(enrichmentReleaseKeys.map(k=>[k,release])) as EnrichmentInput['releases'],
   identity:{state:'matched',uprn:'123456789',point:{latitude:51.5,longitude:-.1,crs:'EPSG:4326',precision:'building',source:'os-open-uprn'},
    coordinateBasis:'address_building_not_entrance',method:'exact_selected_address_components',retrievedAt:now.toISOString(),
    selectedParts:{primary:'10',secondary:null,street:'Synthetic Road',town:'London',postcode:'E8 4PH'},observedCredits:0,missingReason:null}}};
 const snapshots:StoredSnapshot[]=sourceIds.map(source=>({id:crypto.randomUUID(),analysisId:c.analysisId,inputId:c.inputId,collectionKey:'free-enriched-v1',requestHash:'a'.repeat(64),
  result:initialResult(definitions[source],{context:c,collectionKey:'free-enriched-v1',radiusMetres:500},{signal:new AbortController().signal,correlationId:crypto.randomUUID(),now:()=>now})}));
 if(!unavailable){
  const walking=snapshots.find(s=>s.result.meta.source==='geoapify-walking')!;
  const polygons=([300,600,900] as const).map(seconds=>({seconds,geometry:{type:'Polygon' as const,coordinates:[[[-.11,51.49],[-.09,51.49],[-.09,51.51],[-.11,51.49]] as [number,number][]]}}));
  walking.result.outcome='success';walking.result.payload={schemaVersion:1,kind:'walking_geometry',
   walking:{schemaVersion:1,provider:'geoapify',mode:'walk',type:'time',origin:c.enrichment!.identity.point!,retrievedAt:now.toISOString(),routingVersion:null,snappedOrigin:null,credits:{expected:6,observed:null},polygons},
   topology:{schemaVersion:1,method:'postgis-bng-topology-1',geographyReleaseId:release,parts:polygons.map((p,i)=>({seconds:p.seconds,areaM2:10,londonAreaM2:10,londonCoverageFraction:1,originCovered:true,outsideNextFraction:i===2?null:0,vertices:4,polygons:1}))}};
  walking.result.observations=[{id:'synthetic-walking',path:'walking',recordId:'synthetic-walking',reference:walking.result.meta.licence.termsUrl,observedAt:null,units:'seconds_metres_geometry',geography:null,sourceClass:'commercial_data',kind:'modelled',limitations:[]}];
  walking.result.meta.checksum=packetDigest({payload:walking.result.payload,observations:walking.result.observations});
  const census=snapshots.find(s=>s.result.meta.source==='ons-catchments')!;
  census.result.outcome='partial';census.result.payload={schemaVersion:1,kind:'catchment_statistics',parent:{snapshotId:walking.id,checksum:walking.result.meta.checksum},releases:c.enrichment!.releases,
   ranges:polygons.map(({seconds},i)=>({seconds,statistics:catchmentDatasets.map((dataset,j)=>{
    const count=columns[dataset].columns.length,values=Array<number>(count).fill(0);values[0]=40;
    return {dataset,releaseId:c.enrichment!.releases[catchmentReleaseKeys[j]],referencePeriod:'2021-03-21' as const,outcome:i===0?'unavailable' as const:'success' as const,
     error:i===0?{code:'invalid_response' as const,retryable:false,status:null}:null,
     operands:i===0?null:{schemaVersion:1,methodVersion:'area-uniform-bng1',allocation:'uniform_within_native_area_estimate',geographyReleaseId:release,nativeReleaseId:release,censusReleaseId:release,incomeReleaseId:release,bresReleaseId:release,
      catchmentAreaM2:10,londonCoveredAreaM2:10,londonCoverageFraction:1,oaOperands:[{code:'E00000001',lsoaCode:'E01000001',msoaCode:'E02000001',intersectionAreaM2:10,nativeAreaM2:20,allocationFraction:.5,values,missingReasons:Array(count).fill(null)}],
      censusEstimates:values.map((v,k)=>({columnOrdinal:k+1,knownContribution:v/2,missingAreaM2:0,state:'available'})),employeeJobsOperands:[{code:'E01000001',intersectionAreaM2:10,nativeAreaM2:20,nativeProfile:null,knownContribution:null}],incomeNativeContext:[],incomeMissingGeographies:['E02000001'],limitations:['Synthetic uniform-area estimate']}};
   })}))};
  census.result.observations=[{id:'synthetic-census',path:'ranges',recordId:walking.id,reference:census.result.meta.licence.termsUrl,observedAt:null,units:'native_statistical_operands',geography:null,sourceClass:'official_public_data',kind:'modelled',limitations:[]}];
  census.result.meta.checksum=packetDigest({payload:census.result.payload,observations:census.result.observations});
 }
 return {c,snapshots};
}
