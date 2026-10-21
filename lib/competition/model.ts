export const competitionVersion='competition_headroom_v1' as const;
export const classificationVersion='geoapify-category-match-v1' as const;
export type CompetitionCategory='coffee-shop'|'restaurant'|'hair-salon'|'beauty-salon';
export const competitionStates=['ready','incomplete','provider_unavailable','classification_ambiguous','invalid_coordinates','invalid_geometry','population_unavailable','budget_unavailable','collection_unconfirmed','unsupported'] as const;
export type CompetitionState=typeof competitionStates[number];
export type CompetitionRating='Limited'|'Moderate'|'Supportive'|'Strong';
export type CompetitionResult={version:typeof competitionVersion;category:CompetitionCategory;state:CompetitionState;reason:string;
 counts:[number,number,number]|null;populations:[number,number,number]|null;effectiveCompetitors:number|null;effectivePopulation:number|null;density:number|null;score:number|null;rating:CompetitionRating|null;
 provenance:{collectionId:string|null;walkingSnapshotId:string|null;walkingChecksum:string|null;populationSnapshotIds:string[];origin:{longitude:number;latitude:number;precision:string}|null;geometryVersion:string;categoryVersion:typeof classificationVersion;provider:'geoapify';retrievedAt:string|null;complete:boolean;spatialVerified:boolean;coverageVerified:boolean;pages:number;reservedCredits:number;correction:string};
 records:{id:string;name:string;categories:string[];longitude:number;latitude:number;band:5|10|15}[];recordTotal:number};
export function competitionUnavailable(category:CompetitionCategory,state:Exclude<CompetitionState,'ready'>,reason:string):CompetitionResult{
 return {version:competitionVersion,category,state,reason,counts:null,populations:null,effectiveCompetitors:null,effectivePopulation:null,density:null,score:null,rating:null,provenance:{collectionId:null,walkingSnapshotId:null,walkingChecksum:null,populationSnapshotIds:[],origin:null,geometryVersion:'postgis-cumulative-union-v1',categoryVersion:classificationVersion,provider:'geoapify',retrievedAt:null,complete:false,spatialVerified:false,coverageVerified:false,pages:0,reservedCredits:0,correction:'none'},records:[],recordTotal:0};
}
export function competitionScore(populations:readonly unknown[],counts:readonly unknown[]){
 if(populations.length!==3||counts.length!==3||populations.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0)||counts.some(v=>!Number.isSafeInteger(v)||Number(v)<0))return null;
 const [p5,p10,p15]=populations as number[],[n5,n10,n15]=counts as number[];
 if(p5>p10||p10>p15||n5>n10||n10>n15)return null;
 const effectivePopulation=p5+.5*(p10-p5)+.25*(p15-p10),effectiveCompetitors=n5+.5*(n10-n5)+.25*(n15-n10);
 if(effectivePopulation<=0)return null;
 const density=1000*effectiveCompetitors/effectivePopulation,score=Math.round(100/(1+density)),rating:CompetitionRating=score<40?'Limited':score<60?'Moderate':score<80?'Supportive':'Strong';
 return {effectivePopulation,effectiveCompetitors,density,score,rating};
}
export function validateCompetition(value:unknown):CompetitionResult{
 const r=value as CompetitionResult;
 if(!r||r.version!==competitionVersion||!['coffee-shop','restaurant','hair-salon','beauty-salon'].includes(r.category)||!competitionStates.includes(r.state)||typeof r.reason!=='string'||r.reason.length>240||!r.provenance||r.provenance.categoryVersion!==classificationVersion||r.provenance.provider!=='geoapify'||!Number.isSafeInteger(r.provenance.pages)||r.provenance.pages<0||r.provenance.pages>6||!Number.isSafeInteger(r.provenance.reservedCredits)||r.provenance.reservedCredits<0||r.provenance.reservedCredits>75||!Array.isArray(r.records)||r.records.length>40||!Number.isSafeInteger(r.recordTotal)||r.recordTotal<r.records.length||r.recordTotal>3000)throw Error('invalid_competition');
 const p=r.provenance;
 if(!Array.isArray(p.populationSnapshotIds)||p.populationSnapshotIds.some(id=>typeof id!=='string'||id.length>120)||p.populationSnapshotIds.length>3||![p.collectionId,p.walkingSnapshotId].every(v=>v===null||typeof v==='string'&&/^[0-9a-f-]{36}$/i.test(v))||!(p.walkingChecksum===null||/^[0-9a-f]{64}$/.test(p.walkingChecksum))||typeof p.correction!=='string'||p.correction.length>240||p.geometryVersion!=='postgis-cumulative-union-v1'||![p.complete,p.spatialVerified,p.coverageVerified].every(v=>typeof v==='boolean')||!(p.retrievedAt===null||typeof p.retrievedAt==='string'&&Number.isFinite(Date.parse(p.retrievedAt)))||!(p.origin===null||Number.isFinite(p.origin.longitude)&&Math.abs(p.origin.longitude)<=180&&Number.isFinite(p.origin.latitude)&&Math.abs(p.origin.latitude)<=90&&['building','postcode_centroid','rooftop'].includes(p.origin.precision)))throw Error('invalid_competition_provenance');
 const monotonic=(a:number[]|null,integer:boolean)=>a===null||Array.isArray(a)&&a.length===3&&a.every(v=>Number.isFinite(v)&&v>=0&&(!integer||Number.isSafeInteger(v)))&&a[0]<=a[1]&&a[1]<=a[2];
 if(!monotonic(r.counts,true)||!monotonic(r.populations,false)||new Set(r.records.map(v=>v.id)).size!==r.records.length||r.records.some(v=>typeof v.id!=='string'||v.id.length>256||!v.id||typeof v.name!=='string'||v.name.length>160||!Array.isArray(v.categories)||v.categories.length>32||v.categories.some(c=>typeof c!=='string'||c.length>100)||!Number.isFinite(v.longitude)||Math.abs(v.longitude)>180||!Number.isFinite(v.latitude)||Math.abs(v.latitude)>90||![5,10,15].includes(v.band)))throw Error('invalid_competition_records');
 if(r.state==='ready'){
  const calculated=competitionScore(r.populations??[],r.counts??[]);
  if(!calculated||!p.complete||!p.spatialVerified||!p.coverageVerified||!p.origin||!p.walkingSnapshotId||!p.walkingChecksum||!p.collectionId||!p.populationSnapshotIds.length||!p.retrievedAt||p.pages<1||r.recordTotal!==r.counts?.[2]||Object.entries(calculated).some(([k,v])=>r[k as keyof CompetitionResult]!==v))throw Error('invalid_competition_score');
 }else if([r.effectiveCompetitors,r.effectivePopulation,r.density,r.score,r.rating].some(v=>v!==null))throw Error('unavailable_competition_has_score');
 return structuredClone(r);
}
export function competitionInterpretation(r:CompetitionResult){
 if(r.score===null)return 'Competition could not be scored reliably with the available business records.';
 if(r.score>=60)return 'Identified same-category competition is relatively light compared with the surrounding residential population. The wider market still needs investigation.';
 if(r.score>=40)return 'Nearby similar businesses suggest moderate competitive headroom. A differentiated offer may help your business stand out.';
 return 'Identified similar businesses suggest limited competitive headroom relative to the residential base. Investigate how your offer would compete.';
}
export const competitionMethod='Based on identified category-matched businesses in 5, 10 and 15-minute walking areas, relative to nearby residential population. Higher scores represent more competitive headroom.';
export const competitionLimit='Provisional SiteFit v1.0 assumptions. A completed provider search is not an exhaustive business inventory, evidence of an underserved market or a success probability.';
