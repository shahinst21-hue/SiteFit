import {validateResidentialScore, type ResidentialScore} from './residential-catchment.ts';
import {validateCompetition, type CompetitionResult} from '../competition/model.ts';

/** SiteFit policy categories, not an empirical prediction of business success. */
export const recommendationVersion = 'sitefit-recommendation-v1' as const;
export const recommendationTitles = {
  do_not_proceed: 'Do not proceed',
  insufficient_evidence: 'Insufficient evidence',
  hold: 'Hold before shortlisting',
  caution: 'Proceed with caution',
  conditional: 'Conditional shortlist',
  promising: 'Promising candidate',
  investigate: 'Worth further investigation',
} as const;
export type RecommendationStatus = keyof typeof recommendationTitles;
type Rating = 'Limited'|'Moderate'|'Supportive'|'Strong';
export type DecisionMetric = {score:number; rating:Rating; version:string; evidenceIds:string[]} | null;
export type DecisionCondition = {state:'unresolved'|'conditional'|'verified_clear'|'confirmed_incompatible'; evidenceIds:string[]};
export type DecisionAccess = {state:'unresolved'|'conditional'|'favourable'; evidenceIds:string[]};
export type RecommendationInputs = {demand:DecisionMetric; competition:DecisionMetric; premises:DecisionCondition; access:DecisionAccess};
export type RecommendationDecision = {version:typeof recommendationVersion; status:RecommendationStatus; title:string;
  inputs:RecommendationInputs; why:string; nextMove:string; limitations:string[]};
const rating = (n:number):Rating => n<40?'Limited':n<60?'Moderate':n<80?'Supportive':'Strong';
const ids = (v:unknown):v is string[] => Array.isArray(v)&&v.length<=32&&new Set(v).size===v.length&&v.every(id=>typeof id==='string'&&id.length>0&&id.length<=120&&!/[<>\s]/u.test(id));
const keys=(v:unknown,expected:string[])=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===expected.length&&Object.keys(v).every(k=>expected.includes(k));
// PostgreSQL jsonb reorders object keys. Compare values, including exact array
// order, rather than transport serialization order. Browser-safe: no Node import.
const ordered=(v:unknown):unknown=>Array.isArray(v)?v.map(ordered):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,ordered(x)])):v;
const equal=(a:unknown,b:unknown)=>JSON.stringify(ordered(a))===JSON.stringify(ordered(b));

export function decideRecommendation(input:RecommendationInputs):RecommendationDecision {
  if(!keys(input,['demand','competition','premises','access']))throw Error('invalid_recommendation_inputs');
  for (const [key,metric] of [['demand',input.demand],['competition',input.competition]] as const) {
    if(metric!==null&&(!keys(metric,['score','rating','version','evidenceIds'])||!Number.isInteger(metric.score)||metric.score<0||metric.score>100||metric.rating!==rating(metric.score)||
      metric.version!==(key==='demand'?'residential-catchment-v1.0':'competition_headroom_v1')||!ids(metric.evidenceIds)||!metric.evidenceIds.length)) throw Error('invalid_recommendation_metric');
  }
  if(!keys(input.premises,['state','evidenceIds'])||!['unresolved','conditional','verified_clear','confirmed_incompatible'].includes(input.premises.state)||!ids(input.premises.evidenceIds)||
    !keys(input.access,['state','evidenceIds'])||!['unresolved','conditional','favourable'].includes(input.access.state)||!ids(input.access.evidenceIds)||
    ['verified_clear','confirmed_incompatible'].includes(input.premises.state)&&!input.premises.evidenceIds.length||input.access.state==='favourable'&&!input.access.evidenceIds.length) throw Error('unverified_recommendation_condition');
  const d=input.demand?.score, c=input.competition?.score;
  const status:RecommendationStatus=input.premises.state==='confirmed_incompatible'?'do_not_proceed':
    d===undefined||c===undefined?'insufficient_evidence':d<40&&c<40?'hold':d<40||c<40?'caution':
    input.premises.state!=='verified_clear'?'conditional':d>=60&&c>=60&&input.access.state==='favourable'?'promising':'investigate';
  const why:Record<RecommendationStatus,string>={
    do_not_proceed:'Verified evidence identifies an incompatible permitted use for the proposed business. Resolve that constraint before pursuing this location.',
    insufficient_evidence:'Essential walking population or category-matched competition evidence is unavailable. The location cannot yet be recommended from the available evidence.',
    hold:'The residential customer base is limited, while identified similar businesses create competitive pressure. Demand from workers and passing customers has not been verified, so the location should not yet be shortlisted.',
    caution:d!==undefined&&d<40?'Residential catchment is limited. Alternative customer activity remains unverified, so investigate it and the premises constraints before proceeding.':'Competition headroom relative to nearby residents is limited. Test your offer against identified alternatives and verify premises constraints before proceeding.',
    conditional:'Neither residential catchment nor competition headroom is Limited, but permitted use, layout or other premises conditions still need verification before shortlisting.',
    promising:'Both residential catchment and competition headroom are at least Supportive, access evidence is favourable in its stated scope, and no premises blocker is established. This supports further investigation, not a lease commitment.',
    investigate:'The available catchment and competition evidence supports further investigation. Resolve the remaining customer activity and access questions before committing.',
  };
  const nextMove=status==='do_not_proceed'?'Obtain authoritative confirmation that the proposed use can lawfully operate before proceeding.':
    status==='insufficient_evidence'?'Establish the missing walking population and category-matched competition evidence; verify permitted use and layout.':
    status==='caution'&&c!==undefined&&c<40?'Compare current offers and daytime customer activity; verify permitted use and layout before proceeding.':
    'Check daytime customer activity and verify permitted use and layout before proceeding.';
  return {version:recommendationVersion,status,title:recommendationTitles[status],inputs:structuredClone(input),why:why[status],nextMove,
    limitations:['These thresholds are SiteFit policy, not a prediction of commercial success.',
      'Residential population is not measured customer demand. Worker, visitor and passing trade remain unverified.',
      'A positive recommendation supports investigation; it does not approve a lease.']};
}

/** Callers supply admitted score objects. Missing/incomplete evidence is never zero. */
export function recommendationFromScores(residential:ResidentialScore|null|undefined, competition:CompetitionResult|undefined,
  premises:DecisionCondition={state:'unresolved',evidenceIds:[]}, access:DecisionAccess={state:'unresolved',evidenceIds:[]}):RecommendationDecision {
  const r=residential?validateResidentialScore(residential):null, c=competition?validateCompetition(competition):null;
  if(r&&c?.state==='ready'&&JSON.stringify(r.populations)!==JSON.stringify(c.populations)) throw Error('recommendation_population_mismatch');
  return decideRecommendation({demand:r?{score:r.score,rating:r.rating,version:r.version,evidenceIds:[...r.metadata.evidenceIds]}:null,
    competition:c?.state==='ready'?{score:c.score!,rating:c.rating!,version:c.version,evidenceIds:[c.provenance.collectionId!]}:null,premises,access});
}
export function validateRecommendation(value:unknown):RecommendationDecision {
  const v=value as RecommendationDecision;
  if(!v||v.version!==recommendationVersion||!v.inputs)throw Error('invalid_recommendation');
  const expected=decideRecommendation(v.inputs);
  if(!equal(v,expected))throw Error('invalid_recommendation');
  return expected;
}
export function bindRecommendation(value:unknown,residential:ResidentialScore|null|undefined,competition:CompetitionResult|undefined) {
  const decision=validateRecommendation(value), expected=recommendationFromScores(residential,competition,decision.inputs.premises,decision.inputs.access);
  if(!equal(decision,expected))throw Error('recommendation_score_binding_mismatch');
  return decision;
}
export function recommendationStance(status:RecommendationStatus):'recommended'|'conditional'|'not_recommended' {
  return status==='promising'?'recommended':status==='do_not_proceed'?'not_recommended':'conditional';
}
/** Do not spend input tokens asking the model to paraphrase the deterministic
 * fallback prose. Its task is to explain these fixed inputs using source evidence. */
export function recommendationPacket(decision:RecommendationDecision){
 const d=validateRecommendation(decision);
 return {version:d.version,status:d.status,title:d.title,inputs:d.inputs,
   constraints:{leaseCommitment:'withhold',workerVisitorAndPassingDemand:'unverified'}};
}
