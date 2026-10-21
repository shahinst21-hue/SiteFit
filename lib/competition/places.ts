import {validatePolygonGeometry,type PolygonGeometry,type Position} from '../spatial/polygon.ts';
import type {CompetitionCategory} from './model.ts';
export const placeQueries:Record<CompetitionCategory,string[]>={'coffee-shop':['catering.cafe'],restaurant:['catering.restaurant'],'hair-salon':['service.beauty.hairdresser'],'beauty-salon':['service.beauty']};
export type Place={id:string|null;name:string;categories:string[];tags:Record<string,string>;point:Position|null;closed:boolean};
export type PlacePage={items:Place[];size:number};
const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const text=(v:unknown,max=160)=>typeof v==='string'?[...v].filter(c=>c.charCodeAt(0)>=32&&c!=='<'&&c!=='>').join('').slice(0,max):'';
export function inlineGeometry(value:unknown):PolygonGeometry|null{
 try{const g=validatePolygonGeometry(value),polygons=g.type==='Polygon'?[g.coordinates]:g.coordinates;let rings=0,positions=0;for(const polygon of polygons)for(const ring of polygon){rings++;positions+=ring.length;}
  return rings<=100&&positions<=10000&&new TextEncoder().encode(JSON.stringify(g)).byteLength<=102400?g:null;
 }catch{return null;}
}
/** Boundary-inclusive deterministic local check, including holes and disconnected parts. */
export function pointInPolygon(point:Position,g:PolygonGeometry):boolean{
 const ringState=(ring:Position[])=>{let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[j],b=ring[i],dx=b[0]-a[0],dy=b[1]-a[1],cross=(point[0]-a[0])*dy-(point[1]-a[1])*dx;
  if(Math.abs(cross)<=Number.EPSILON*32*Math.max(1,Math.abs(dx),Math.abs(dy))&&point[0]>=Math.min(a[0],b[0])-1e-12&&point[0]<=Math.max(a[0],b[0])+1e-12&&point[1]>=Math.min(a[1],b[1])-1e-12&&point[1]<=Math.max(a[1],b[1])+1e-12)return 2;
  if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }return inside?1:0;};
 return (g.type==='Polygon'?[g.coordinates]:g.coordinates).some(p=>{const outer=ringState(p[0]);if(!outer)return false;if(outer===2)return true;for(const hole of p.slice(1)){const s=ringState(hole);if(s===2)return true;if(s===1)return false;}return true;});
}
export function normalizePlaces(value:unknown):PlacePage{
 const root=obj(value);if(root.type!=='FeatureCollection'||!Array.isArray(root.features)||root.features.length>500)throw Error('invalid_response');
 const items=root.features.map((v):Place=>{const f=obj(v),p=obj(f.properties),geometry=obj(f.geometry),raw=obj(obj(p.datasource).raw);
  if(f.type!=='Feature'||!Array.isArray(p.categories)||p.categories.length>32||p.categories.some(c=>typeof c!=='string'||c.length>100))throw Error('invalid_response');
  const xy=geometry.coordinates,point:Position|null=geometry.type==='Point'&&Array.isArray(xy)&&xy.length===2&&xy.every(n=>typeof n==='number'&&Number.isFinite(n))&&Math.abs(xy[0])<=180&&Math.abs(xy[1])<=90?[xy[0],xy[1]]:null;
  const tags:Record<string,string>={};for(const key of ['amenity','shop','beauty','cuisine','takeaway','disused','abandoned','closed','status']){if(typeof raw[key]==='string')tags[key]=text(raw[key],100);}
  const closed=['yes','true'].includes(tags.disused)||['yes','true'].includes(tags.abandoned)||['yes','permanently','permanently_closed'].includes(tags.closed)||['closed','deleted','non_operating','permanently_closed'].includes(String(p.status??tags.status));
  return {id:typeof p.place_id==='string'&&p.place_id.length>0&&p.place_id.length<=256?p.place_id:null,name:text(p.name)||'Name not supplied',categories:[...p.categories as string[]].sort(),tags,point,closed};
 });return {items,size:items.length};
}
export function categoryMatch(p:Place,category:CompetitionCategory):'match'|'excluded'|'ambiguous'{
 if(p.closed)return 'excluded';const c=p.categories,t=p.tags,has=(prefix:string)=>c.some(v=>v===prefix||v.startsWith(prefix+'.'));
 if(category==='restaurant')return has('catering.restaurant')&&t.takeaway!=='only'?'match':'excluded';
 if(category==='hair-salon')return has('service.beauty.hairdresser')||t.shop==='hairdresser'?'match':'ambiguous';
 if(category==='beauty-salon'){
  const treatments=(t.beauty??'').split(/[;,]/).map(s=>s.trim());
  if(t.shop==='beauty'&&(!treatments.length||!treatments[0]||treatments.some(v=>['beauty','salon','nails','facial','facials','cosmetics'].includes(v))))return 'match';
  if(treatments.some(v=>['nails','facial','facials'].includes(v)))return 'match';
  if(['massage','spa','tanning_salon','tattoo','hairdresser'].some(v=>has('service.beauty.'+v))||t.shop==='cosmetics'||treatments.some(v=>['massage','spa','tattoo','tanning'].includes(v)))return 'excluded';
  return 'ambiguous';
 }
 const specialist=c.some(v=>/^catering\.cafe\.(ice_cream|frozen_yogurt|donut|dessert|bubble_tea)(\.|$)/.test(v))||/^(ice_cream|frozen_yogurt|donut|dessert|bubble_tea)$/.test(t.cuisine??'');
 const independent=c.some(v=>['catering.cafe.coffee_shop','catering.cafe.coffee','catering.cafe.tea'].includes(v))||t.amenity==='cafe'&&/^(coffee_shop|coffee|tea)$/.test(t.cuisine??'');
 return has('catering.cafe')&&(!specialist||independent)?'match':'excluded';
}
export type PageReceipt={items:Place[];size:number};
export interface PlacesLedger{
 reserve(offset:number):Promise<{id:string;cached:PlacePage|null}>;
 settle(id:string,state:'received'|'failed'|'ambiguous',page:PlacePage|null,reason:string|null):Promise<void>;
}
/** No implicit transport retry. A definite 429/5xx may retry once after a new durable reservation;
 * ambiguous requests retain the full hold and stop this optional evidence step. */
export async function retrievePlacePage(category:CompetitionCategory,geometry:PolygonGeometry,offset:number,key:string,ledger:PlacesLedger,signal:AbortSignal,fetcher:typeof fetch=fetch):Promise<PlacePage>{
 if(!inlineGeometry(geometry)||!Number.isSafeInteger(offset)||offset<0||offset>2500||offset%500||!key||key.length>256||/\s/.test(key))throw Error('invalid_request');
 for(let attempt=0;attempt<2;attempt++){
  if(signal.aborted)throw Error('collection_unconfirmed');
  const reservation=await ledger.reserve(offset);if(reservation.cached)return reservation.cached;
  let received=false;
  try{
   const url=new URL('https://api.geoapify.com/v2/places');url.searchParams.set('apiKey',key);
   const response=await fetcher(url,{method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.any([signal,AbortSignal.timeout(6000)]),headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({categories:placeQueries[category],filter:{type:'polygon',geometry,buffer:0},limit:500,offset})});
   received=true;
   if(!response.ok){await response.body?.cancel();await ledger.settle(reservation.id,'failed',null,'http_'+response.status);if(attempt===0&&(response.status===429||response.status>=500)&&Number(response.headers.get('retry-after')??0)<=1&&!signal.aborted){await new Promise(resolve=>setTimeout(resolve,1000));continue;}throw Error(response.status===429?'rate_limited':'provider_unavailable');}
   if(!response.body||!/^application\/(?:geo\+)?json(?:;|$)/i.test(response.headers.get('content-type')??''))throw Error('invalid_response');
   const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
   try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>2000000)throw Error('invalid_response');chunks.push(part.value);}}finally{await reader.cancel();}
   const page=normalizePlaces(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks))));await ledger.settle(reservation.id,'received',page,null);return page;
  }catch(error){
   // Received malformed data is a definite unusable response; acknowledgement failure is held.
   if(!(error instanceof Error&&['rate_limited','provider_unavailable'].includes(error.message))){try{await ledger.settle(reservation.id,received?'failed':'ambiguous',null,received?'invalid_response':'send_unconfirmed');}catch{/* intent remains retained */}}
   throw Error(error instanceof Error&&['rate_limited','provider_unavailable','invalid_response'].includes(error.message)?error.message:'collection_unconfirmed',{cause:error});
  }
 }throw Error('provider_unavailable');
}
