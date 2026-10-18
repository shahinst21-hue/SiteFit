import type {SnapshotMap} from './model.ts';
import {validateContext,validateResult,object} from '../data/validation.ts';
import {permitted} from '../data/policy.ts';
import {packetDigest} from '../analysis/canonical.ts';

export type SnapshotContext={map:SnapshotMap;precision:string;foodGroups:{label:string;count:number}[];foodTotal:number|null;foodDate:string|null;stopGroups:{label:string;count:number}[];notices:string[]};
/** Read-only presentation of already retained, qualified operands. No collection or inference. */
export function storedSnapshotContext(context:unknown,rows:unknown[],now=new Date()):SnapshotContext {
 const input=validateContext(context);
 const origin=input.enrichment?.identity.point??input.selectedProperty.point;
 const precision=origin?.precision==='postcode_centroid'?'Postcode context · not the premises':origin?'Recorded location · entrance unverified':'Location unresolved';
 const layers:SnapshotMap['layers']=[];
 if(origin)layers.push({id:'context-origin',label:precision,kind:'property',status:'available',colour:'#0d1400',points:[[origin.longitude,origin.latitude]],polygons:[]});
 const notices:string[]=[],foodGroups:SnapshotContext['foodGroups']=[],stopGroups:SnapshotContext['stopGroups']=[];
 let foodTotal:number|null=null,foodDate:string|null=null;
 for(const value of rows){
  try{
   const row=object(value);
   if(rows.filter(v=>v&&typeof v==='object'&&(v as {source?:unknown}).source===row.source).length!==1)continue;
   if(row.analysis_id!==input.analysisId||row.input_id!==input.inputId||!['fsa-establishments','tfl-stop-points'].includes(String(row.source)))continue;
   if(row.expires_at&&Date.parse(String(row.expires_at))<=now.getTime())continue;
   const result=validateResult({...object(row.provider_metadata),payload:row.normalised_data});
   if(result.meta.source!==row.source||!permitted(result.meta.licence)||!['success','partial'].includes(result.outcome))continue;
   if(result.meta.checksum&&result.meta.checksum!==packetDigest({payload:result.payload,observations:result.observations}))continue;
   const payload=result.payload;
   if(!payload||!['food_establishments','transport_access_points'].includes(payload.kind))continue;
   const food=payload.kind==='food_establishments';
   if(payload.kind!=='food_establishments'&&payload.kind!=='transport_access_points')continue;
   const groups=new Map<string,number>();
   const features=payload.items.flatMap(item=>{
    const label='businessType' in item?item.businessType:item.originalMode;
    groups.set(label,(groups.get(label)??0)+1);
    return item.point?[{id:item.id,label:item.name,position:[item.point.longitude,item.point.latitude] as [number,number]}]:[];
   });
   const grouped=[...groups].map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label));
   if(food){foodTotal=payload.items.length;foodDate=result.meta.retrievedAt;foodGroups.push(...grouped);}else stopGroups.push(...grouped);
   if(features.length)layers.push({id:food?'food-register':'transport-register',label:food?'FSA food records · not direct competitors':'TfL stop records · not routes',kind:food?'competitor':'transport',status:'available',colour:food?'#60646c':'#0d1400',points:features.map(f=>f.position),polygons:[],features});
   notices.push(...result.meta.licence.attribution);
  }catch{/* Invalid/unlicensed material never becomes a feature or count. */}
 }
 const points=layers.flatMap(l=>l.points);
 // Padding is a display viewport, never a radius, catchment or accessibility claim.
 const bounds:SnapshotMap['bounds']=points.length?[Math.min(...points.map(p=>p[0]))-.003,Math.min(...points.map(p=>p[1]))-.002,Math.max(...points.map(p=>p[0]))+.003,Math.max(...points.map(p=>p[1]))+.002]:null;
 return {map:{status:bounds?'available':'unavailable',bounds,layers,description:'Stored postcode/location and register context. Points have source-level precision; no premises entrance, current trading status, walking route or customer catchment is established.'},precision,foodGroups,foodTotal,foodDate,stopGroups,notices:[...new Set(notices)]};
}
