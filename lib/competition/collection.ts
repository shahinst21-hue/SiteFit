import type {CompetitionResult,CompetitionCategory,CompetitionState} from './model.ts';
import {competitionUnavailable,competitionScore,validateCompetition} from './model.ts';
import {placeQueries,categoryMatch,pointInPolygon,inlineGeometry,retrievePlacePage,type Place,type PlacesLedger} from './places.ts';
import type {PolygonGeometry} from '../spatial/polygon.ts';
export type CompetitionInputs={category:CompetitionCategory;populations:[number,number,number];geometries:PolygonGeometry[];provenance:CompetitionResult['provenance']};
/** Uses the same verified origins/populations and effective cumulative walking unions.
 * Every POI is locally checked even if HTTP succeeded. No raw response enters the report. */
export async function collectCompetition(input:CompetitionInputs,ledger:PlacesLedger,key:string,signal:AbortSignal,fetcher?:typeof fetch):Promise<CompetitionResult>{
 let result=competitionUnavailable(input.category,'incomplete','The category search did not finish.'),complete=false;
 result.populations=input.populations;result.provenance={...input.provenance,complete:false,spatialVerified:false,coverageVerified:false,pages:0};
 const bad=(state:CompetitionState,reason:string)=>{result.state=state;result.reason=reason;};
 if(input.geometries.length!==3||!inlineGeometry(input.geometries[2])){bad('invalid_geometry','The stored polygon exceeds supported inline geometry limits; no validated geometry ID is retained.');return result;}
 const places=new Map<string,Place>(),seenProviderIds=new Map<string,string>();let ambiguity=false,invalid=false,spatial=true,beautyConfirmed=false;
 for(let page=0;page<6;page++){
  try{
   const response=await retrievePlacePage(input.category,input.geometries[2],page*500,key,ledger,signal,fetcher);result.provenance.pages++;
   let fresh=0;
   for(const p of response.items){
    if(!p.point){invalid=true;continue;}
    if(!pointInPolygon(p.point,input.geometries[2])){spatial=false;continue;}
    if(p.id){const fingerprint=JSON.stringify([p.point,p.categories,p.tags,p.closed]),prior=seenProviderIds.get(p.id);if(prior&&prior!==fingerprint)invalid=true;if(!prior){seenProviderIds.set(p.id,fingerprint);fresh++;}}
    if(!p.categories.some(c=>placeQueries[input.category].some(q=>c===q||c.startsWith(q+'.')))){ambiguity=true;continue;}
    const match=categoryMatch(p,input.category);if(match==='excluded')continue;if(match==='ambiguous'){ambiguity=true;continue;}
    if(!p.id){invalid=true;continue;}if(input.category==='beauty-salon')beautyConfirmed=true;
    const prior=places.get(p.id);if(prior){if(JSON.stringify(prior.point)!==JSON.stringify(p.point)||JSON.stringify([...prior.categories].sort())!==JSON.stringify([...p.categories].sort()))invalid=true;if(p.name<prior.name)places.set(p.id,p);continue;}
    places.set(p.id,p);
   }
   if(!spatial){bad('invalid_geometry','The provider returned places outside the intended walking polygon. Spatial filtering is unconfirmed.');break;}
   if(response.size<500){complete=true;break;}
   if(page>0&&!fresh){bad('incomplete','Pagination returned no new provider records; completeness cannot be established.');break;}
  }catch(error){const reason=error instanceof Error?error.message:'';bad(/budget|authoris|reserv/.test(reason)?'budget_unavailable':reason==='collection_unconfirmed'?'collection_unconfirmed':'provider_unavailable',/budget|authoris|reserv/.test(reason)?'The existing provider allowance could not authorise another page. Search coverage is incomplete.':'The provider search could not be completed. Available records are retained.');break;}
 }
 const counts:[number,number,number]=[0,0,0];const records:CompetitionResult['records']=[];
 for(const p of [...places.values()].sort((a,b)=>a.id!.localeCompare(b.id!))){
  // Cumulative union membership: a harmless nesting sliver cannot make N5 > N10.
  const in5=pointInPolygon(p.point!,input.geometries[0]),in10=in5||pointInPolygon(p.point!,input.geometries[1]);
  if(in5)counts[0]++;if(in10)counts[1]++;counts[2]++;
  records.push({id:p.id!,name:p.name.slice(0,120),categories:p.categories.slice(0,4),longitude:p.point![0],latitude:p.point![1],band:in5?5:in10?10:15});
 }
 result.records=records.sort((a,b)=>a.band-b.band||a.id.localeCompare(b.id)).slice(0,40);result.recordTotal=records.length;
 result.counts=spatial&&!invalid?counts:null;result.provenance.complete=complete;result.provenance.spatialVerified=spatial;result.provenance.coverageVerified=complete&&spatial&&!invalid&&!ambiguity&&(input.category!=='beauty-salon'||beautyConfirmed);
 if(complete){
  if(invalid)bad('invalid_coordinates','Some candidate records lacked a stable identity, valid coordinates or consistent duplicate data.');
  else if(ambiguity||input.category==='beauty-salon'&&!beautyConfirmed)bad('classification_ambiguous','Provider categories or explicit source tags do not establish sufficiently reliable category coverage.');
  else if(spatial){const score=competitionScore(input.populations,counts);if(score){result={...result,...score,state:'ready',reason:'Completed category search; counts identify source records, not all real-world competitors.'};}else bad('population_unavailable','Valid cumulative walking populations and positive effective population are required.');}
 }
 return result;
}
export function checkedCompetition(input:CompetitionResult){return validateCompetition(input);}
