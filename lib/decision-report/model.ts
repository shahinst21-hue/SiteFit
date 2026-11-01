import {packetDigest} from '../analysis/canonical.ts';
import type {Dashboard} from '../report-dashboard/model.ts';
import {sourceURL} from '../report-dashboard/display.ts';
import {coffeeScenarios,coffeeSensitivity} from './economics.ts';
import type {DecisionReport,ResearchPack,EvidenceRef,Finding} from './types.ts';
import coffeeMethodReferences from './research/coffee-method-references-20261101.json' with {type:'json'};

export const decisionMethodVersion='decision-method-2026-11-01' as const;
const fallback=(title:string,text:string,refs:string[]=[]):Finding=>({title,finding:text,implication:'This finding defines a condition to resolve before committing to the proposed use.',action:'Obtain the relevant premises documents and compare the proposed operating plan with this saved finding.',confidence:'Saved interpretation; scope and date follow its evidence.',refs});
export function validateResearch(pack:ResearchPack,d:Dashboard){
  if(pack.version!=='decision-research-v1'||pack.parentDigest!==d.digest||pack.business!==d.business||!Number.isFinite(Date.parse(pack.createdAt)))throw Error('research_binding_invalid');
  const ids=new Set(pack.refs.map(r=>r.id));if(ids.size!==pack.refs.length)throw Error('research_duplicate_reference');
  for(const r of pack.refs)if(!r.id||!r.label||!Number.isFinite(Date.parse(r.observedAt))||r.url!==null&&!sourceURL(r.url))throw Error('research_reference_invalid');
  const all=new Set([...ids,...d.sources.map(s=>`saved-${s.id}`),...d.references.map((_,i)=>`saved-reference-${i+1}`),...(d.business==='coffee-shop'?coffeeMethodReferences.map(r=>r.id):[])]);
  for(const f of Object.values(pack.findings).flat())if(!f.refs.length||f.refs.some(id=>!all.has(id)))throw Error('finding_reference_invalid');
  const seen=new Set<string>();
  for(const c of pack.competitors){
    const key=c.address.toLowerCase().replace(/[^a-z0-9]/g,'');
    if(seen.has(key)||!c.refs.length||c.refs.some(id=>!all.has(id))||!c.point.every(Number.isFinite)||Math.abs(c.point[0])>180||Math.abs(c.point[1])>90||[c.metres,c.seconds].some(v=>v!==null&&(!Number.isFinite(v)||v<0)))throw Error('competitor_invalid');
    seen.add(key);
    if(d.address.toLowerCase().includes(c.address.split(',')[0].toLowerCase()))throw Error('selected_property_is_not_competitor');
  }
  if(pack.map&&(pack.map.tileSize!==512||!/^[a-z0-9-]+\.png$/.test(pack.map.asset)||!/^[a-f0-9]{64}$/.test(pack.map.sha256)||pack.map.width<1||pack.map.height<1))throw Error('map_asset_invalid');
  return pack;
}
/** Pure, versioned compilation from saved evidence. No provider, AI, clock, payment or database writes. */
export function buildDecisionReport(d:Dashboard,research:ResearchPack|null=null):DecisionReport{
  if(d.presentationMode==='public-sample'||d.structuredPreview)throw Error('decision_report_requires_saved_full');
  const pack=research?validateResearch(research,d):null;
  const refs:EvidenceRef[]=[...d.sources.map(s=>({id:`saved-${s.id}`,label:s.label,url:s.reference,observedAt:s.retrievedAt??d.generatedAt,period:s.effectiveAt??'Source period not supplied',scope:s.scope,qualification:s.limitations.join(' '),notices:s.notices})),
    ...d.references.map((r,i)=>({id:`saved-reference-${i+1}`,label:r.source,url:r.url,observedAt:r.retrievedAt,period:r.effectiveAt??'Source period not supplied',scope:r.scope,qualification:'Dated reference saved with the original report; not a refreshed observation.',notices:[]})),...(pack?.refs??[]),...(d.business==='coffee-shop'?coffeeMethodReferences.filter(r=>!pack?.refs.some(p=>p.id===r.id)):[])];
  const page=(key:string)=>d.pages.find(p=>p.key===key)!;
  const sections:DecisionReport['sections']=[['overview','Executive decision'],['customers','Customer opportunity'],['competition','Competition & positioning'],['access','Access & commercial geography'],['premises','Property suitability'],['economics','Rent & operating economics']].map(([id,title])=>{
    const key=id==='customers'?'customer-context':id==='economics'?'rental-context':id,p=page(key);
    return {id,title,standfirst:p.conclusion,findings:pack?.findings[id as keyof ResearchPack['findings']]??[fallback(title,p.conclusion,p.factIds.map(x=>`saved-${x}`)),...p.analysis.slice(0,2).map(a=>fallback('Business implication',a.text,a.factIds.map(x=>`saved-${x}`)))]};
  });
  const populations=[5,10,15].flatMap(minutes=>{const s=d.sources.find(s=>s.label===`TS007A total, ${minutes} minute walking estimate`);return s&&typeof s.value==='number'&&Number.isFinite(s.value)&&s.value>=0?[{minutes,value:s.value,refs:[`saved-${s.id}`]}]:[];});
  const profiles=d.profiles.filter(p=>p.seconds===600).flatMap(p=>p.columns.flatMap(c=>{
    const label=c.label==='Household composition: One person household; measures: Value'?'One-person households':c.label==='Number of cars or vans: No cars or vans in household'?'Households without a car':null;
    // Profiles are bound to their original Census family; no additive hierarchy or age-based spending inference.
    const source=d.sources.find(s=>s.label===`${p.dataset} total, 10 minute walking estimate`);
    return label&&c.share!==null&&c.share>=0&&c.share<=1&&source?[{label,share:c.share,scope:`10-minute walking estimate; ${p.period}`,refs:[`saved-${source.id}`]}]:[];
  }));
  const discovery=pack?.findings.discovery?.[0]??fallback('The decision-changing gap',d.summary?.risks[0]?.text??'No supported non-obvious discovery is available in this saved edition.',d.summary?.risks[0]?.factIds.map(x=>`saved-${x}`)??[]);
  const used=new Set([...sections.flatMap(s=>s.findings.flatMap(f=>f.refs)),...discovery.refs,...(pack?.competitors.flatMap(c=>c.refs)??[]),...populations.flatMap(p=>p.refs),...profiles.flatMap(p=>p.refs),...d.actions.flatMap(a=>a.factIds.map(id=>`saved-${id}`)),...(d.business==='coffee-shop'?['cvp','vat','margin','payroll','rates']:[])]);
  const selectedRefs=refs.filter(r=>used.has(r.id)).map(r=>({...r,label:r.label.startsWith('TS007A total')?'ONS Census: walking population':r.label.startsWith('TS003 total')?'ONS Census: household composition':r.label.startsWith('TS045 total')?'ONS Census: car availability':r.label==='FHRS'?'FSA food-business register':r.label==='selected-property-facts'?'PropertyData: recorded premises context':r.label==='walking-isolines'?'Geoapify: saved walking areas':r.label==='BRES2024'?'ONS: employee jobs, 2024':r.label==='income-AHC-FYE2023'?'ONS: modelled household income, 2023':r.label==='article-4-direction-area'?'Planning Data: Article 4 area record':r.label==='propertydata'?'PropertyData: restaurant rent context':r.label}));
  const content={version:'decision-report-v1' as const,methodVersion:decisionMethodVersion,parentDigest:d.digest,researchDigest:pack?packetDigest(pack):null,reportId:d.reportId,date:pack?.createdAt??d.generatedAt,address:d.address,business:d.business,businessLabel:d.businessLabel,
    verdict:'Conditional opportunity',recommendation:'Keep this on the investigation shortlist. Do not sign until the use, workable layout, actual occupancy costs and a credible route to the required transactions are established.',
    advantages:pack?.advantages??d.summary?.strengths.slice(0,3).map(x=>x.text)??[],concerns:pack?.concerns??d.summary?.risks.slice(0,3).map(x=>x.text)??[],sections,discovery,competitors:pack?.competitors??[],
    scenarios:d.business==='coffee-shop'?coffeeScenarios():[],sensitivity:d.business==='coffee-shop'?coffeeSensitivity():[],populations,profiles,refs:selectedRefs,map:pack?.map??null,mapImage:null,catchments:d.map,
    actions:d.actions.map(a=>({action:a.action,condition:a.consequence,refs:a.factIds.map(x=>`saved-${x}`)})),
    limitations:['The selected premises is assessed as a proposed new business; availability for lease or vacancy is not established.','Walking times are modelled to source coordinates, not timed entrance-to-entrance visits. Census walking areas are overlapping estimates and must not be added.','No measured footfall, customer conversion, sales forecast or success probability is supplied.','Economics are conditional operating break-even, including an owner allowance; fit-out, finance, tax, depreciation and working capital are excluded.','No comparable-property ranking or statistically validated opportunity score is claimed.']};
  // Do not derive a positive or negative commercial verdict from density-only scores.
  // Without reviewed research, preserve the original saved recommendation in this separate edition.
  if(!pack){content.verdict='Assessment remains conditional';content.recommendation=d.summary?.verdict[0]??page('overview').conclusion;}
  return {...content,digest:packetDigest({...content,reportId:null})};
}
