import 'server-only';
import {packetDigest} from '../analysis/canonical.ts';
import type {Dashboard} from '../report-dashboard/model.ts';
import type {EconomicInput} from '../economics/model.ts';
import type {DecisionReport,Competitor,EvidenceRef} from './types.ts';
import {buildDecisionReport} from './model.ts';
import {planningScenarios,planningVersion} from './planning.ts';
import type {DecisionGeography} from './geography.ts';

const normal=(s:string)=>s.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export function directMetres(a:[number,number],b:[number,number]){
  const rad=(n:number)=>n*Math.PI/180;
  const q=Math.sin(rad(b[1]-a[1])/2)**2+Math.cos(rad(a[1]))*Math.cos(rad(b[1]))*Math.sin(rad(b[0]-a[0])/2)**2;
  return Math.round(6371000*2*Math.asin(Math.sqrt(Math.min(1,q))));
}
/** Only admitted frozen sources. Category match is a lead, never proof of menu,
 * current trading or competitive strength. Straight-line distances are explicit. */
export function automaticCompetitors(d:Pick<Dashboard,'business'|'address'|'competition'|'operators'|'map'|'generatedAt'>){
  const items:Competitor[]=[],refs:EvidenceRef[]=[];
  const origin=d.competition?.provenance.origin;
  const center:[number,number]|undefined=origin?[origin.longitude,origin.latitude]:d.map?.layers.find(l=>l.kind==='property')?.points[0];
  const admit=(c:Competitor)=>{
    if(normal(c.name).length>=4&&normal(d.address).includes(normal(c.name)))return;
    if(center&&directMetres(center,c.point)<=10)return; // Same building: cannot establish a separate competing unit.
    if(items.some(o=>o.id===c.id||normal(o.name)===normal(c.name)&&directMetres(o.point,c.point)<50))return;
    items.push(c);
  };
  const common={address:'Address not retained in source',status:'Source listing; current trading not verified',hours:'Opening hours not supplied',price:'Menu and prices not supplied',reviews:'Customer reviews not supplied',strength:'Proximity and registered category only; commercial strength is unverified',limitation:'A listing is not proof of current offer, customer volume or entrance position.',seconds:null,distanceKind:'straight-line' as const};
  const competition=d.competition;
  if(competition&&competition.category!==d.business&&!(d.business==='hair-beauty-salon'&&['hair-salon','beauty-salon'].includes(competition.category)))throw Error('foreign_competitor_category');
  if(competition?.state==='ready'){
    const id='automatic-category-register';
    refs.push({id,label:'Geoapify category-matched walking-area businesses',url:'https://www.geoapify.com/places-api/',observedAt:competition.provenance.retrievedAt??d.generatedAt,period:'Dated mapped listings',scope:'Category matches inside saved cumulative walking areas; current offers unverified',qualification:competition.reason+' '+competition.provenance.correction,notices:['© OpenStreetMap contributors · Powered by Geoapify']});
    for(const c of competition.records.toSorted((a,b)=>a.band-b.band||(center?directMetres(center,[a.longitude,a.latitude])-directMetres(center,[b.longitude,b.latitude]):0)||a.name.localeCompare(b.name))){
      const point:[number,number]=[c.longitude,c.latitude];
      admit({...common,id:`mapped-${c.id}`,name:c.name,relationship:d.business==='coffee-shop'?'Coffee candidate':'Category-matched candidate',offer:`Mapped categories: ${c.categories.map(s=>s.replaceAll('.',' / ').replaceAll('_',' ')).join(', ')}. Confirm the actual offer.`,implication:d.business==='coffee-shop'?'Audit the coffee offer, takeaway speed and food attachment before selecting a positioning gap.':d.business==='restaurant'?'Compare cuisine, service occasion and price before assuming these listings address the same customers.':'Compare treatments, appointment duration, pricing and availability before assuming substitutability.',point,metres:center?directMetres(center,point):null,walkingBand:c.band,refs:[id]});
      if(items.length>=8)break;
    }
  }
  if(d.business==='coffee-shop'||d.business==='restaurant')for(const o of d.operators?.items??[]){
    if(!o.point)continue;
    const pub=/pub|bar|nightclub/i.test(o.businessType),cafe=/cafe|restaurant/i.test(o.businessType),bakery=/bake/i.test(o.name+' '+o.businessType);
    if(!pub&&!cafe&&!bakery)continue;
    const point:[number,number]=[o.point.longitude,o.point.latitude],id=`register-${o.authorityId}-${o.recordId}`;
    const c:Competitor={...common,id,name:o.name,relationship:pub?'Pub alternative':bakery?'Bakery alternative':d.business==='restaurant'?'Restaurant alternative':'Café alternative',offer:`FSA registered type: ${o.businessType}. Menu and coffee offer unverified.`,implication:pub?'Potential alternative for food and daytime visits; do not count as a direct coffee offer without a menu check.':'A food-occasion alternative to review; registered type alone does not establish a direct competing offer.',point,metres:center?directMetres(center,point):null,refs:[id]};
    const previous=items.length;admit(c);
    if(items.length>previous)refs.push({id,label:`FSA register: ${o.name}`,url:o.reference,observedAt:o.observedAt??d.generatedAt,period:o.observedAt??'Inspection date not supplied',scope:'Registered food-business category and source point; not trading status',qualification:'Food hygiene registration does not prove current menu, quality, demand or available premises.',notices:[]});
    if(items.length>=12)break;
  }
  return {items,refs};
}

/** Generation only. No reviewed-property registry is imported here. The output
 * is frozen with the parent before Ready; reads deserialize that same output. */
export function automaticDecision(d:Dashboard,business:EconomicInput['business'],input:EconomicInput|null=null,geography:DecisionGeography|null=null):DecisionReport{
  const r=buildDecisionReport(d),competitors=automaticCompetitors(d),economics=planningScenarios(business,input);
  for(const source of d.sources)if(!r.refs.some(ref=>ref.id===`saved-${source.id}`))r.refs.push({id:`saved-${source.id}`,label:source.label,url:source.reference,observedAt:source.retrievedAt??d.generatedAt,period:source.effectiveAt??'Period not supplied',scope:source.scope,qualification:source.limitations.join(' '),notices:source.notices});
  for(const [i,source] of d.references.entries())if(!r.refs.some(ref=>ref.id===`saved-reference-${i+1}`))r.refs.push({id:`saved-reference-${i+1}`,label:source.source,url:source.url,observedAt:source.retrievedAt,period:source.effectiveAt??'Period not supplied',scope:source.scope,qualification:'Dated supplementary reference; not refreshed on reopen.',notices:[]});
  const referenceIds=(ids:string[])=>ids.map(id=>d.references.findIndex(ref=>ref.id===id)).filter(i=>i>=0).map(i=>`saved-reference-${i+1}`);
  r.reportId=null;r.researchDigest=null;r.scenarios=economics.scenarios;r.sensitivity=economics.sensitivity;
  r.competitors=competitors.items;r.refs.push(...competitors.refs);
  if(geography){
    r.map=geography.map;r.geographyArtifact=geography.artifact;
    for(const [i,id] of geography.candidateIds.entries()){
      const c=r.competitors.find(c=>c.id===id),route=geography.routes?.targets[i];
      if(!c||!route)continue;
      if(route.point.longitude!==c.point[0]||route.point.latitude!==c.point[1])throw Error('geography_competitor_binding');
      c.seconds=route.seconds;c.metres=route.metres;c.distanceKind='routed';c.refs.push('automatic-routes');
    }
    r.refs.push({id:'automatic-routes',label:'Geoapify modelled walking routes',url:'https://www.geoapify.com/route-matrix-api/',observedAt:geography.routes?.retrievedAt??d.generatedAt,period:'Routing model at collection',scope:'Walking network from the selected building to saved business points',qualification:'Snapped source coordinates, not verified shop entrances or timed walks. Routing version and observed provider debit are not supplied.',notices:['Powered by Geoapify · © OpenStreetMap contributors']});
  }
  r.refs.push({id:planningVersion,label:'SiteFit category operating-plan assumptions',url:null,observedAt:d.generatedAt,period:'Planning assumptions, not a statistical benchmark',scope:`Proposed ${d.businessLabel.toLowerCase()}; ${input?'saved customer operating plan with explicitly labelled stress cases':'illustrative category-specific operating plan'}`,qualification:'Baseline inputs and their origins are printed in full. These are not the selected unit’s quoted costs or predicted trade. VAT registration, staff coverage, rates and owner pay require verification.',notices:[]});
  for(const s of r.sections){
    const key=s.id==='customers'?'customer-context':s.id==='economics'?'rental-context':s.id,p=d.pages.find(p=>p.key===key)!;
    const statements=p.analysis.length?p.analysis:[{text:p.conclusion,factIds:p.factIds,referenceIds:[],operatorIds:[],kind:'interpretation'}];
    s.findings=statements.map((a,i)=>({title:i===0?s.title:'Decision implication',finding:a.text,
      implication:p.cautions[i]?.text??'Interpret this finding within its dated source scope; it does not establish measured customer demand.',
      action:p.test?.text??'Verify this condition against the proposed operating plan before committing.',
      confidence:a.kind==='unknown'?'Unresolved in the saved evidence.':'Interpretation of saved, scoped evidence.',
      refs:[...new Set([...a.factIds,...(p.test?.factIds??[])].map(id=>`saved-${id}`).concat(referenceIds([...a.referenceIds,...(p.test?.referenceIds??[])])))]}));
  }
  const e=r.sections.find(s=>s.id==='economics')!;
  e.findings.push({title:input?'Your saved plan and its stress tests':'A category-specific operating requirement',finding:`${business==='restaurant'?'Covers':business.includes('salon')?'Appointments':'Transactions'} required per open day: ${r.scenarios[1].daily??'unavailable'}. The baseline is ${input?'the saved operating plan':'an illustrative operating plan'}, not a local cost estimate or forecast.`,implication:'Compare this requirement with observed visits, realistic capacity and an actual staffed operating plan. Residential population alone cannot establish achievable trade.',action:'Replace every illustrative cost with quotes or a rota and check the VAT treatment, owner allowance and delivery or treatment commissions.',confidence:'Calculated by the exact economic engine at generation; assumptions remain visible.',refs:[planningVersion]});
  r.limitations.push('Named category matches and register alternatives are leads, not confirmed direct competitors. Straight-line distances are not walking routes; walking bands describe area membership only.','Illustrative economics reuse category-specific operating plans, not measured sector averages. Local rental benchmarks are not substituted for the selected unit’s rent.');
  const used=new Set([...r.sections.flatMap(s=>s.findings.flatMap(f=>f.refs)),...r.discovery.refs,...r.competitors.flatMap(c=>c.refs),...r.actions.flatMap(a=>a.refs),...r.populations.flatMap(p=>p.refs),...r.profiles.flatMap(p=>p.refs),planningVersion,...(business==='coffee-shop'?['cvp','vat','payroll','rates','margin']:[])]);
  r.refs=r.refs.filter(ref=>used.has(ref.id));
  for(const ref of r.refs){
    if(/^Modelled station route /i.test(ref.label))ref.label='Modelled station walking route';
    if(/^point-inverse/i.test(ref.label))ref.label='Recorded property lookup';
  }
  const {digest:_,...content}=r;void _;
  r.digest=packetDigest({...content,reportId:null});
  return r;
}
