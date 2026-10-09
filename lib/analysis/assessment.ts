import { object, timestamp, uuid, validateContext } from "../data/validation.ts";
import type { CollectionContext } from "../data/contracts.ts";
import { type Evidence } from "./evidence.ts";
import { canonicalJSON,packetDigest } from "./canonical.ts";
import { contextIndex,contextPolicy,validateDensityRank,type DensityRank } from "./context-index.ts";
import { decisionAssessment } from "./decision-assessment.ts";
import { validateHistory,type HistoryBundle } from "../premises-history/model.ts";
import { validateEconomicBundle,type EconomicBundle } from "../economics/bundle.ts";

export type AssessmentSupplement={kind:"history";bundle:HistoryBundle}|{kind:"rental";bundle:EconomicBundle};
export type AssessmentEvidenceReference={id:string;snapshotId:string|null;digest:string;source:Evidence["source"];kind:Evidence["kind"];scope:string;value:Evidence["value"];units:string|null;effectiveAt:string|null;statistical:unknown;parents:string[];licence:{policyId:string;version:number;expiresAt:string|null}};
export type AssessmentBundle={schemaVersion:1;analysisId:string;inputId:string;propertyId:string;business:CollectionContext["category"];
  contextDigest:string;generatedAt:string;methodVersion:string;configDigest:string;sourceBindings:{snapshotId:string;checksum:string}[];
  evidence:AssessmentEvidenceReference[];index:ReturnType<typeof contextIndex>;decision:ReturnType<typeof decisionAssessment>;supplements:AssessmentSupplement[]};
const sha=(v:unknown)=>typeof v==="string"&&/^[a-f0-9]{64}$/.test(v);
const keys=(v:Record<string,unknown>,expected:string[])=>{if(Object.keys(v).length!==expected.length||expected.some(k=>!(k in v)))throw Error("invalid_assessment_shape");};
/** Historical structural validation only; does not call a calculator or source. */
export function validateAssessment(value:unknown):AssessmentBundle {
  const b=object(value);keys(b,"schemaVersion analysisId inputId propertyId business contextDigest generatedAt methodVersion configDigest sourceBindings evidence index decision supplements".split(" "));
  const json=JSON.stringify(b);
  if(Buffer.byteLength(json)>65536||/(sb_secret_|sk-(proj-)?|sk_(live|test)_|Bearer\s|rawResponse|authorization|guestClaim)/i.test(json)||b.schemaVersion!==1||
    ![b.analysisId,b.inputId,b.propertyId].every(uuid)||!timestamp(b.generatedAt)||!sha(b.contextDigest)||!sha(b.configDigest)||b.methodVersion!==contextPolicy.methodVersion||
    !["coffee-shop","restaurant","hair-beauty-salon"].includes(String(b.business))||!Array.isArray(b.sourceBindings)||b.sourceBindings.length>32||!Array.isArray(b.evidence)||b.evidence.length>64||!Array.isArray(b.supplements)||b.supplements.length>4)throw Error("invalid_assessment");
  const sourceIds=new Set<string>();for(const item of b.sourceBindings){const s=object(item);keys(s,["snapshotId","checksum"]);if(!uuid(s.snapshotId)||!sha(s.checksum)||sourceIds.has(s.snapshotId as string))throw Error("invalid_assessment_source");sourceIds.add(s.snapshotId as string);}
  const ids=new Set<string>();for(const item of b.evidence){const e=object(item);keys(e,"id snapshotId digest source kind scope value units effectiveAt statistical parents licence".split(" "));if(!uuid(e.id)||!sha(e.digest)||!(e.snapshotId===null||uuid(e.snapshotId)&&sourceIds.has(e.snapshotId))||ids.has(String(e.id))||!Array.isArray(e.parents)||e.parents.some(p=>!uuid(p))||typeof e.scope!=="string"||e.scope.length>500||!(e.value===null||typeof e.value==="number"&&Number.isFinite(e.value)||typeof e.value==="string"&&e.value.length<=500))throw Error("foreign_assessment_evidence");ids.add(String(e.id));}
  const idx=object(b.index);keys(idx,"label methodVersion configDigest hypotheticalPolicy state display exact components methodValidated reasons scope exclusions".split(" "));
  if(idx.label!==contextPolicy.label||idx.methodVersion!==b.methodVersion||idx.configDigest!==b.configDigest||idx.hypotheticalPolicy!==true||!["available","withheld"].includes(String(idx.state))||typeof idx.methodValidated!=="boolean"||!Array.isArray(idx.components)||idx.components.length!==2||!Array.isArray(idx.reasons)||!Array.isArray(idx.exclusions)||idx.scope!==contextPolicy.scope)throw Error("invalid_context_index");
  const ratio=(v:unknown)=>{const r=object(v);keys(r,["numerator","denominator"]);if(!/^\d{1,20}$/.test(String(r.numerator))||! /^[1-9]\d{0,19}$/.test(String(r.denominator)))throw Error("invalid_exact_index");};
  if(idx.state==="available"){if(idx.methodValidated!==true||!Number.isInteger(idx.display)||Number(idx.display)<0||Number(idx.display)>100||idx.reasons.length)throw Error("invalid_published_index");ratio(idx.exact);}else if(idx.display!==null||idx.exact!==null||!idx.reasons.length)throw Error("invalid_withheld_index");
  for(const [i,entry] of idx.components.entries()){const c=object(entry);keys(c,["operand","weight","exact","contribution"]);if(c.weight!==contextPolicy.weights[b.business as keyof typeof contextPolicy.weights][i])throw Error("invalid_stored_weight");if(c.operand!==null)validateDensityRank(c.operand);if(c.exact!==null)ratio(c.exact);if(c.contribution!==null)ratio(c.contribution);if(idx.state==="available"&&(c.operand===null||c.exact===null||c.contribution===null))throw Error("missing_published_component");}
  const d=object(b.decision);keys(d,"ruleVersion business admissions claims premises readiness stance actions limitations".split(" "));
  if(d.ruleVersion!=="decision-context-v1"||d.business!==b.business||!Array.isArray(d.claims)||d.claims.length>64||!Array.isArray(d.admissions)||d.admissions.length!==ids.size||!Array.isArray(d.actions)||d.actions.length>3||!Array.isArray(d.limitations))throw Error("invalid_decision");
  const admissionIds=new Set<string>();
  for(const item of d.admissions){const a=object(item);keys(a,["evidenceId","disposition","axes","reasons"]);const axes=object(a.axes);keys(axes,["identity","permission","date","measurement","parents","conflict"]);if(!ids.has(String(a.evidenceId))||admissionIds.has(String(a.evidenceId))||!["admitted_for_scoped_fact","admitted_for_conditional_implication","context_only","blocked","not_applicable"].includes(String(a.disposition))||!Array.isArray(a.reasons)||a.reasons.some(v=>typeof v!=="string")||Object.values(axes).some(v=>!["adequate","limited","fails"].includes(String(v))))throw Error("invalid_admission");admissionIds.add(String(a.evidenceId));}
  for(const item of b.evidence){const e=object(item);if((e.parents as string[]).some(id=>!ids.has(id))||!(e.effectiveAt===null||typeof e.effectiveAt==="string"&&Number.isFinite(Date.parse(e.effectiveAt))))throw Error("invalid_reference_lineage");const licence=object(e.licence);keys(licence,["policyId","version","expiresAt"]);if(typeof licence.policyId!=="string"||!Number.isInteger(licence.version)||Number(licence.version)<1||!(licence.expiresAt===null||typeof licence.expiresAt==="string"&&Number.isFinite(Date.parse(licence.expiresAt))))throw Error("invalid_reference_permission");}
  const claimed=new Set<string>();for(const item of d.claims){const c=object(item);keys(c,"id ruleId domain direction strength conclusion supportingIds opposingIds limitations unresolved".split(" "));if(typeof c.id!=="string"||claimed.has(c.id)||!Array.isArray(c.supportingIds)||!c.supportingIds.length||!Array.isArray(c.opposingIds)||[...c.supportingIds,...c.opposingIds].some(id=>!ids.has(String(id)))||!["favourable","trade_off","conditional","no_basis"].includes(String(c.direction))||!["insufficient","limited","sufficient"].includes(String(c.strength))||typeof c.conclusion!=="string"||c.conclusion.length>500||!Array.isArray(c.limitations)||!Array.isArray(c.unresolved))throw Error("invalid_decision_claim");claimed.add(c.id);}
  for(const entry of b.supplements){const s=object(entry);keys(s,["kind","bundle"]);const parent=s.kind==="history"?validateHistory(s.bundle):s.kind==="rental"?validateEconomicBundle(s.bundle):null;if(!parent||parent.analysisId!==b.analysisId||parent.inputId!==b.inputId||parent.propertyId!==b.propertyId||parent.contextDigest!==b.contextDigest||s.kind==="rental"&&(parent as EconomicBundle).kind!=="rental_evidence")throw Error("foreign_assessment_supplement");}
  return b as AssessmentBundle;
}
export function buildAssessment(input:CollectionContext,evidence:Evidence[],references:AssessmentEvidenceReference[],sourceBindings:AssessmentBundle["sourceBindings"],r:DensityRank|null,j:DensityRank|null,methodValidated:boolean,supplements:AssessmentSupplement[],at:Date):AssessmentBundle {
  const c=validateContext(input);
  const precise=c.region.eligible&&c.region.method==="point_in_polygon"&&c.geography?.method==="point_in_polygon"&&!c.geography.ambiguous&&c.enrichment?.identity.state==="matched";
  if(r&&(r.geographyReleaseId!==c.releases.geography||r.releaseId!==c.releases.population||r.code!==c.geography?.code))throw Error("foreign_comparison");
  if(j&&(j.releaseId!==c.enrichment?.releases.bresReleaseId||j.geographyReleaseId!==c.enrichment?.releases.nativeReleaseId))throw Error("foreign_comparison");
  if(evidence.length!==references.length||evidence.some(e=>!references.some(r=>r.id===e.id)))throw Error("missing_evidence_reference");
  const b:AssessmentBundle={schemaVersion:1,analysisId:c.analysisId,inputId:c.inputId,propertyId:c.selectedProperty.id,business:c.category,contextDigest:packetDigest(c),generatedAt:at.toISOString(),methodVersion:contextPolicy.methodVersion,configDigest:packetDigest(contextPolicy),sourceBindings,evidence:references,
    index:contextIndex(c.category,precise?r:null,precise?j:null,methodValidated),decision:decisionAssessment(c.category,evidence,c.analysisId,c.inputId,at),supplements};
  return validateAssessment(JSON.parse(canonicalJSON(b)));
}
/** Future paid interpretation contract excludes exact property/account/payment data
 * and raw source bundles. This is internal; no public route is added. */
export function assessmentPacket(bundle:AssessmentBundle){
  const b=validateAssessment(bundle);
  const history=b.supplements.find(s=>s.kind==="history");
  const rentals=b.supplements.filter(s=>s.kind==="rental"),rental=rentals.length===1?rentals[0]:null;
  const rentalResult=rental?.kind==="rental"&&rental.bundle.kind==="rental_evidence"?rental.bundle.result as ReturnType<typeof import("../economics/rent.ts").rentalReportProjection>:null;
  return {schemaVersion:1,business:b.business,index:{label:b.index.label,state:b.index.state,display:b.index.display,scope:b.index.scope,exclusions:b.index.exclusions},
    claims:b.decision.claims,premises:b.decision.premises,readiness:b.decision.readiness,stance:b.decision.stance,actions:b.decision.actions,
    history:history?.kind==="history"?{events:history.bundle.events.map(e=>({id:e.id,date:e.date,dateMeaning:e.dateMeaning,precision:e.precision,scope:e.scope,source:e.source})),unknowns:history.bundle.unknowns,limitations:history.bundle.limitations}:null,
    rental:rentalResult?{benchmark:rentalResult.benchmark,valuation:rentalResult.valuation?{poundsPerYear:rentalResult.valuation.poundsPerYear,classification:"estimated_property_rent"}:null,
      propertySpecificState:rentalResult.propertySpecificState,propertySpecificReason:rentalResult.propertySpecificReason,financialCalculationsIncluded:false}:null,
    rentalMultipleOutcomes:rentals.length>1,limitations:b.decision.limitations};
}
