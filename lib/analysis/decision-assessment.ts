import { evidenceIndex, validateEvidence, type Evidence } from "./evidence.ts";
import type { ContextBusiness } from "./context-index.ts";

export type Admission = {
  evidenceId:string; disposition:"admitted_for_scoped_fact"|"admitted_for_conditional_implication"|"context_only"|"blocked"|"not_applicable";
  axes:{identity:"adequate"|"limited"|"fails";permission:"adequate"|"fails";date:"adequate"|"limited";measurement:"adequate"|"limited"|"fails";parents:"adequate"|"fails";conflict:"adequate"|"fails"}; reasons:string[];
};
export type DecisionClaim={id:string;ruleId:string;domain:"resident"|"workplace"|"market"|"access"|"premises"|"rental";
  direction:"favourable"|"trade_off"|"conditional"|"no_basis"; strength:"insufficient"|"limited"|"sufficient";
  conclusion:string; supportingIds:string[]; opposingIds:string[]; limitations:string[]; unresolved:string[]};
/** Citation presence is not entailment. Only named dated constructs are admitted;
 * the rest remain observations for later reviewed rules, never generic good news. */
export function admitObservation(e:Evidence, conflicts:ReadonlySet<string>, expired=false, failedParent=false):Admission {
  const precise=["building","rooftop"].includes(e.geography.precision);
  const available=e.quality.available && e.value!==null;
  const blocked=!e.licence.representationAllowed || expired || failedParent || conflicts.has(e.id) || !available;
  return {evidenceId:e.id,disposition:e.schemaVersion===2 && e.lineage.missingState === "not_applicable"?"not_applicable":blocked?"blocked":
    precise && ["measured","direct_register"].includes(e.kind)?"admitted_for_scoped_fact":"context_only",
    axes:{identity:precise?"adequate":"limited",permission:e.licence.representationAllowed&&!expired?"adequate":"fails",
      date:e.effectiveAt?"adequate":"limited",measurement:available?(e.quality.partial?"limited":"adequate"):"fails",
      parents:failedParent?"fails":"adequate",conflict:conflicts.has(e.id)?"fails":"adequate"},
    reasons:[...(!available?["value_unavailable"]:[]),...(expired?["retention_expired"]:[]),...(failedParent?["dependent_parent_failed"]:[]),...(!e.licence.representationAllowed?["representation_not_permitted"]:[]),...(!precise?["location_precision_limited"]:[]),...(!e.effectiveAt?["effective_date_unknown"]:[]),...(conflicts.has(e.id)?["material_construct_conflict"]:[])]};
}
export type MaterialCondition={id:string;state:"unknown"|"confirmed_blocker";meaning:string;supportingIds:string[]};
export function decisionPriority(premises:"unresolved"|"conditional"|"confirmed_incompatible_in_scope"|"supported_in_defined_scope",hasContext:boolean) {
  if(premises==="confirmed_incompatible_in_scope")return {readiness:"confirmed_blocker" as const,stance:"do_not_proceed_with_present_concept" as const};
  if(premises==="conditional"||premises==="unresolved"&&hasContext)return {readiness:"material_condition_to_resolve" as const,stance:"resolve_material_condition_first" as const};
  if(!hasContext)return {readiness:"insufficient_basis" as const,stance:"insufficient_basis_for_case" as const};
  return {readiness:"targeted_checks_required" as const,stance:"investigate_further" as const};
}
export function decisionAssessment(business:ContextBusiness,items:readonly unknown[],analysisId:string,inputId:string,at:Date,conditions:MaterialCondition[]=[]) {
  if(!["coffee-shop","restaurant","hair-beauty-salon"].includes(business))throw Error("invalid_business");
  if(items.length>64)throw Error("assessment_evidence_bounds");
  const retained:Evidence[]=items.map(item=>{validateEvidence(item);return item;});
  const seen=new Set<string>();
  for(const e of retained){if(e.analysisId!==analysisId||e.inputId!==inputId||seen.has(e.id))throw Error("foreign_evidence");seen.add(e.id);}
  // Rights failure is scoped to that result. Validate topology with the original
  // dependency graph, but never promote an expired/disallowed observation.
  evidenceIndex(retained.map(e=>({...e,licence:{...e.licence,representationAllowed:true,expiresAt:null}})),analysisId,inputId,at);
  const index=new Map(retained.map(e=>[e.id,e]));
  // Conflict only when construct, date, unit and scope match. Different reference
  // periods/provider purposes coexist rather than "newest wins".
  const conflicts=new Set<string>();const groups=new Map<string,Evidence[]>();
  for(const e of index.values()){
    if(!e.quality.available||e.value===null)continue;
    const key=JSON.stringify([e.source.dataset,e.scope,e.units,e.effectiveAt,e.geography.scope]);
    groups.set(key,[...(groups.get(key)??[]),e]);
  }
  for(const group of groups.values())if(new Set(group.map(e=>JSON.stringify(e.value))).size>1)for(const e of group)conflicts.add(e.id);
  const expired=new Set([...index.values()].filter(e=>e.licence.expiresAt&&Date.parse(e.licence.expiresAt)<=at.getTime()).map(e=>e.id));
  const failedParents=new Set<string>();
  // A failed parent prevents a derived implication, while unrelated sources survive.
  let changed=true;while(changed){changed=false;for(const e of index.values())if(!failedParents.has(e.id)&&e.parents.some(id=>{const p=index.get(id)!;return conflicts.has(id)||expired.has(id)||failedParents.has(id)||!p.quality.available||!p.licence.representationAllowed;})){failedParents.add(e.id);changed=true;}}
  const admissions=[...index.values()].map(e=>admitObservation(e,conflicts,expired.has(e.id),failedParents.has(e.id)));const claims:DecisionClaim[]=[];
  const used=new Set<string>();
  for(const e of index.values()){
    const a=admissions.find(a=>a.evidenceId===e.id)!;
    if(a.disposition==="blocked"||a.disposition==="not_applicable"||used.has(e.source.dataset+e.scope))continue;
    let domain:DecisionClaim["domain"]|null=null,conclusion="",unresolved:string[]=[];
    if(e.source.dataset==="TS001"&&["measured","direct_register"].includes(e.kind)&&["persons","usual residents"].includes(e.units??"")){
      domain="resident";conclusion="Dated resident context provides a basis for considering local repeat visits.";
      unresolved=["Customer conversion and concept fit are not measured."];
    } else if(e.source.provider==="ons"&&e.units==="employee_jobs"){
      domain="workplace";conclusion="Dated employee jobs provide weekday activity context.";
      unresolved=["Jobs are not visitors, footfall or customers; trading-hour fit is unverified."];
    } else if((e.source.provider==="overture"||e.source.provider==="fsa"&&business!=="hair-beauty-salon")&&typeof e.value==="number"&&e.value>0){
      domain="market";conclusion="Recorded business observations support an offer-overlap and differentiation check.";
      unresolved=["Inventory coverage and unique competitor counts are not admitted."];
    } else if(e.source.provider==="geoapify"&&e.kind==="modelled"&&/^Modelled station route .+, (seconds|metres)$/.test(e.source.dataset)&&typeof e.value==="number"&&e.value>=0){
      domain="access";conclusion="A modelled connection provides scoped access context.";
      unresolved=["Actual entrance, service times, step-free access and trading-hour fit need verification."];
    }
    if(!domain)continue;
    used.add(e.source.dataset+e.scope);
    const existing=claims.find(c=>c.domain===domain);
    if(existing){existing.supportingIds.push(e.id);existing.limitations=[...new Set([...existing.limitations,...e.quality.limitations])];continue;}
    if(e.value===0&&domain==="resident")conclusion="The dated native measure supplies no positive resident count; visitor demand remains unmeasured.";
    if(e.value===0&&domain==="workplace")conclusion="The published native measure supplies no positive employee-job count; period and rounding limitations remain.";
    claims.push({id:`claim-${claims.length+1}`,ruleId:`${domain}-context-v1`,domain,direction:"conditional",strength:"limited",conclusion,
      supportingIds:[e.id],opposingIds:[],limitations:[...e.quality.limitations,"Observation is scoped evidence, not demonstrated business demand."],unresolved});
  }
  if(conditions.length>16||new Set(conditions.map(c=>c.id)).size!==conditions.length)throw Error("invalid_conditions");
  for(const c of conditions){
    if(c.state!=="unknown"&&c.state!=="confirmed_blocker")throw Error("invalid_condition_state");
    if(c.state==="confirmed_blocker"){
      // There is no baseline source-specific current legal incompatibility rule.
      // Never let a caller elevate an ordinary history/directory record to one.
      throw Error("current_authoritative_blocker_rule_required");
    }
    if(c.supportingIds.some(id=>!index.has(id)))throw Error("foreign_condition");
  }
  const prerequisites=["Verify the selected unit's permitted use and any concept-specific approvals.","Verify physical suitability, lease terms and premises condition."];
  return {ruleVersion:"decision-context-v1",business,admissions,claims,
    premises:{status:"unresolved" as const,conditions,unknowns:prerequisites},
    ...decisionPriority("unresolved",claims.length>0),
    actions:prerequisites.slice(0,3),limitations:["No current unit-specific clearance is established.","Resident/workplace context cannot resolve premises requirements."]};
}
