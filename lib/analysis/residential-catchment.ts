import type {Evidence} from './evidence.ts';
export const residentialModel=Object.freeze({version:'residential-catchment-v1.0',benchmarks:Object.freeze([2500,5000,12000] as const),weights:Object.freeze([.5,.3,.2] as const)});
export type ResidentialRating='Limited'|'Moderate'|'Supportive'|'Strong';
export type ResidentialScore={version:typeof residentialModel.version;origin:'deterministic';populations:number[];bands:number[];components:number[];rawScore:number;score:number;rating:ResidentialRating;metadata:{evidenceIds:string[];snapshotIds:string[];releaseIds:string[];precision:string;referencePeriod:string;retrievedAt:string[];point:{longitude:number;latitude:number}|null}};
export function residentialScore(populations:readonly unknown[],metadata:ResidentialScore['metadata']):ResidentialScore|null{
 if(populations.length!==3||populations.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0))return null;
 const [p5,p10,p15]=populations as number[];
 if(p5>p10||p10>p15)return null;
 const bands=[p5,p10-p5,p15-p10],components=bands.map((n,i)=>Math.min(100,50*n/residentialModel.benchmarks[i]));
 const rawScore=components.reduce((sum,s,i)=>sum+s*residentialModel.weights[i],0),score=Math.round(rawScore);
 const rating:ResidentialRating=score<40?'Limited':score<60?'Moderate':score<80?'Supportive':'Strong';
 return {version:residentialModel.version,origin:'deterministic',populations:[p5,p10,p15],bands,components,rawScore,score,rating,metadata:{evidenceIds:[...metadata.evidenceIds],snapshotIds:[...metadata.snapshotIds],releaseIds:[...metadata.releaseIds],precision:metadata.precision,referencePeriod:metadata.referencePeriod,retrievedAt:[...metadata.retrievedAt],point:metadata.point?{longitude:metadata.point.longitude,latitude:metadata.point.latitude}:null}};
}
/** Only admitted ONS totals with walking-network lineage qualify. No new provider requests. */
export function residentialFromEvidence(evidence:readonly Evidence[],business:string,point:{longitude:number;latitude:number}|null,at:Date):ResidentialScore|null{
 if(!['coffee-shop','restaurant','hair-salon','beauty-salon','hair-beauty-salon'].includes(business)||!point||!Number.isFinite(point.longitude)||!Number.isFinite(point.latitude)||Math.abs(point.longitude)>180||Math.abs(point.latitude)>90)return null;
 const rows=[5,10,15].map(minutes=>evidence.filter(e=>e.schemaVersion===2&&e.source.provider==='ons'&&e.source.dataset===`TS007A total, ${minutes} minute walking estimate`&&e.geography.statistical.unit==='network_catchment'&&e.kind==='derived'&&e.quality.available&&e.licence.representationAllowed&&(!e.licence.expiresAt||Date.parse(e.licence.expiresAt)>at.getTime())&&e.parents.length>0&&e.lineage.parentSnapshots.length>0));
 if(rows.some(r=>r.length!==1))return null;
 const selected=rows.map(r=>r[0]);
 if(selected.some(e=>!e.snapshotId||!e.source.releaseId)||new Set(selected.map(e=>e.analysisId)).size!==1||new Set(selected.map(e=>e.inputId)).size!==1||new Set(selected.map(e=>e.geography.precision)).size!==1||new Set(selected.map(e=>e.snapshotId)).size!==1||new Set(selected.map(e=>e.source.releaseId)).size!==1||selected.some(e=>e.effectiveAt!=='2021-03-21'))return null;
 return residentialScore(selected.map(e=>e.value),{evidenceIds:selected.map(e=>e.id),snapshotIds:[...new Set(selected.flatMap(e=>e.snapshotId?[e.snapshotId]:[]))],releaseIds:[...new Set(selected.flatMap(e=>e.source.releaseId?[e.source.releaseId]:[]))],precision:selected[0].geography.precision,referencePeriod:'2021-03-21',retrievedAt:[...new Set(selected.flatMap(e=>e.retrievedAt?[e.retrievedAt]:[]))],point});
}
/** Recompute at the trust boundary; a stored/AI-edited score cannot override the approved formula. */
export function validateResidentialScore(value:unknown):ResidentialScore{
 const v=value as ResidentialScore;
 if(!v||v.version!==residentialModel.version||v.origin!=='deterministic'||!v.metadata||!Array.isArray(v.populations))throw Error('invalid_residential_score');
 const m=v.metadata;
 if(!['unknown','postcode_centroid','building','rooftop'].includes(m.precision)||m.referencePeriod!=='2021-03-21'||!['evidenceIds','snapshotIds','releaseIds','retrievedAt'].every(k=>Array.isArray(m[k as keyof typeof m])&&(m[k as keyof typeof m] as unknown[]).length<=32&&(m[k as keyof typeof m] as unknown[]).every(x=>typeof x==='string'&&x.length<=120))||!m.point||!Number.isFinite(m.point.longitude)||!Number.isFinite(m.point.latitude)||Math.abs(m.point.longitude)>180||Math.abs(m.point.latitude)>90)throw Error('invalid_residential_metadata');
 const expected=residentialScore(v.populations,m);
 if(!expected||v.rawScore!==expected.rawScore||v.score!==expected.score||v.rating!==expected.rating||JSON.stringify(v.bands)!==JSON.stringify(expected.bands)||JSON.stringify(v.components)!==JSON.stringify(expected.components))throw Error('invalid_residential_score');
 return expected;
}
export function residentialInterpretation(score:ResidentialScore){return `${score.rating} residential base within the modelled walking area. Test trading hours, competition and visitor activity before committing.`;}

export const residentialStates = ['ready','partial_coverage','source_unavailable','unsupported','invalid_evidence','read_unavailable'] as const;
export type ResidentialState = typeof residentialStates[number];
export const residentialMessages: Record<ResidentialState,string> = {
 ready: 'Population estimates are available for all three walking areas.',
 partial_coverage: 'Some walking areas have incomplete Census coverage. A full catchment score cannot be established.',
 source_unavailable: 'The walking or population source could not be completed for this saved check. Available evidence is retained; no population is invented.',
 unsupported: 'A supported London location and verified map position are needed for walking population estimates.',
 invalid_evidence: 'The saved walking and population evidence could not be validated together. No score is published.',
 read_unavailable: 'Saved population data could not be opened just now. Reload this Snapshot to check again; this does not start a new analysis.',
};
export function validateResidentialState(value:unknown):ResidentialState {
 if(!residentialStates.includes(value as ResidentialState))throw Error('invalid_residential_state');
 return value as ResidentialState;
}
