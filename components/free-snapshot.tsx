"use client";
import {CompetitionHeadroom,CompetitionDetails} from './competition-headroom';
import Link from "next/link";
import {ResidentialCatchment,ResidentialDetails} from "./residential-catchment";
import {useEffect,useRef,useState,type ReactNode} from "react";
import {readableNumber} from "@/lib/report-dashboard/display";
import {Arrow} from "./ui";
import {Icon,type IconName} from "./icon";
import {SnapshotEvidenceDialog} from './snapshot-evidence-dialog';
import {SnapshotMapPanel} from "./snapshot-map";
import {businessTypes} from "@/lib/wizard";
import {formatPrice,site} from "@/lib/site-config";
import type {AdvisorResearch} from '@/lib/analysis/advisor';
import type {FreeProjection} from "@/lib/analysis/projection";
import {factorTitles,snapshotFromStored,type EvidenceQuality as Quality,type FactorId,type SnapshotFactor,type SnapshotMetric,type SnapshotView,type SnapshotMap} from "@/lib/snapshot/model";
import {decisionChecks,meaningfulMetrics,metricLabel,metricLimit,readinessLabels,recommendationLabels,snapshotRecommendation,scoreSummary} from "@/lib/snapshot/decision";
import type {SnapshotContext} from "@/lib/snapshot/context";
import {RecommendationIndicator,ResidentComparison,TransportMiniMap} from './snapshot-insights';
import {populationUnits,competitionBars,densityComparison} from "@/lib/snapshot/visuals";
import {SnapshotMeasurement} from './snapshot-measurement';
const icons:Record<FactorId,IconName>={'customer-base':'demand','market-position':'shop','customer-access':'access',premises:'shield'};
const qualityLabels:Record<Quality,string>={good:'Good',moderate:'Moderate',limited:'Limited',insufficient:'Insufficient'};
function date(value:string){return new Date(value).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/London'});}
function Lines({label,lines}:{label:string;lines:string[]}){return lines.length?<div><h4>{label}</h4><ul>{[...new Set(lines)].map(line=><li key={line}>{line}</li>)}</ul></div>:null;}
export function EvidenceQuality({quality}:{quality:Quality}){return <span className="sf-quality">Evidence: {qualityLabels[quality]}</span>;}
export function SnapshotMetricRow({metric,factor}:{metric:SnapshotMetric;factor?:SnapshotFactor}){
 return <div className="sf-observation"><strong>{typeof metric.value==='number'?readableNumber(metric.value,metric.unit):metric.value??'Unknown'}</strong><div><span>{metricLabel(metric)}</span>{metric.unit&&!['TS001','FHRS','StopPoint'].includes(metric.label)&&<small>{metric.unit}</small>}{metric.updatedAt&&<small>As at {date(metric.updatedAt)}</small>}{factor&&<p>{metricLimit(factor,metric)}</p>}</div></div>;
}
function Reasoning({factor,demo}:{factor:SnapshotFactor;demo:boolean}){
 const why=factor.details;
 return <SnapshotEvidenceDialog id={`evidence-${factor.id}`} title={factor.title} detail={factor.id}>
  {factor.competition&&<CompetitionDetails value={factor.competition}/>}
  {factor.residentialCatchment&&<ResidentialDetails value={factor.residentialCatchment}/>}<h4>Saved AI assessment</h4><p>{factor.finding}</p><p>{factor.reason}</p>
  <p><strong>Evidence sufficiency: {qualityLabels[factor.quality]}.</strong> {factor.scoreNote}</p>
  {factor.implication&&<p>{factor.implication}</p>}
  {why?<><Lines label="What supports this" lines={why.support}/><Lines label="What limits this" lines={why.opposition}/><Lines label="Other explanations" lines={why.alternatives}/><Lines label="Still unknown" lines={why.unknowns}/>
   {factor.id==='customer-base'&&!densityComparison(why.comparison)&&<p>No qualified peer comparison is retained for this saved report. The population count alone does not establish above- or below-average density.</p>}{why.comparison&&<div><h4>Residential comparison</h4><p>{why.comparison.description}</p>{why.comparison.density!==null&&<p>{readableNumber(why.comparison.density,why.comparison.units)} {why.comparison.units}</p>}{why.comparison.percentile!==null&&<p>Descriptive distribution position: {Math.round(why.comparison.percentile)}th percentile among {why.comparison.peers} other Census areas. This is not a customer-demand or commercial-performance score.</p>}<Lines label="Comparison limits" lines={why.comparison.limitations}/></div>}
   {!!why.observations.length&&<div><h4>Original observations and scope</h4>{why.observations.map((o,i)=><p key={i}>{o.label}: {o.value===null?'Unknown':typeof o.value==='number'?readableNumber(o.value,o.units):o.value} {o.units} · {o.scope}{o.effectiveAt&&<> · Effective {date(o.effectiveAt)}</>}</p>)}</div>}
   {!!why.sources.length&&<details className="sf-source-disclosure"><summary>Sources, dates & methodology</summary>{why.sources.map((s,i)=><div key={i}><p>{s.url?<a href={s.url} rel="noreferrer" target="_blank">{s.provider} · {s.dataset}<Icon name="external"/></a>:`${s.provider} · ${s.dataset}`}{s.retrievedAt&&<> · Retrieved {date(s.retrievedAt)}</>}</p>{s.notices.map(n=><small key={n}>{n}</small>)}</div>)}</details>}
  </>:<p>{demo?'Illustrative fixture only. No property investigation supports these example findings.':'Evidence details were not supplied for this factor.'}</p>}
 </SnapshotEvidenceDialog>;
}
function excerpt(text:string|null|undefined,max=130){if(!text)return 'Not established by the saved evidence.';if(text.length<=max)return text;const sentence=text.match(/^.*?[.!?](?:\s|$)/u)?.[0].trim();return sentence&&sentence.length<=max?sentence:text.slice(0,max).replace(/\s+\S*$/,'')+'…';}
type UnlockId = FactorId | "rent-lease" | "actions";
function status(f:SnapshotFactor){return f.status!=='available'?'Not established':f.meaning==='favourable'?'Supportive':f.meaning==='trade_off'?'Trade-off':f.meaning==='conditional'?'Conditional':'Unresolved';}
function EvidenceVisual({factor,context,map,reportId,demo}:{factor:SnapshotFactor;context?:SnapshotContext|null;map?:SnapshotMap;reportId?:string;demo:boolean}){
 if(factor.id==='market-position'&&factor.competition)return <CompetitionHeadroom value={factor.competition}/>;
 if(factor.id==='customer-base'&&factor.residentialCatchment!==undefined)return <ResidentialCatchment value={factor.residentialCatchment} state={factor.residentialState}/>;
 const metric=meaningfulMetrics(factor)[0],comparison=factor.details?.comparison;
 if(factor.id==='premises')return <div className="sf-premises-checks">{[{title:'Permitted use',note:'Confirm the intended operation',icon:'shield'},{title:'Layout suitability',note:'Check the measured floor plan',icon:'home'}].map(c=><div key={c.title}><span className="sf-risk-icon"><Icon name={c.icon as IconName}/></span><span><strong>{c.title}</strong><small>Unverified</small></span></div>)}<span className="sf-visual-caption">Resolve these before committing.</span></div>;
 if(factor.id==='market-position'&&context?.foodGroups.length)return <div className="sf-register-chart"><p className="sf-stat"><strong>{context.foodTotal}</strong><span>Food-register records<small>FSA · bounded search</small></span></p><ul aria-label="Recorded FSA business types">{competitionBars(context.foodGroups).map((g,i)=><li key={g.label}><span>{g.label==='Restaurant/Cafe/Canteen'?'Restaurant / café / canteen':g.label==='Retailers - other'?'Other food retailers':g.label==='Takeaway/sandwich shop'?'Takeaway / sandwich':g.label}</span><span className="sf-native-bar" aria-hidden="true"><i style={{width:(g.count/context.foodTotal!*100)+'%',background:['#0d1400','#60646c','#7c7c7c','#b2f34c'][i]}}/></span><strong>{g.count}</strong></li>)}</ul><span className="sf-visual-caption">Register types, not confirmed direct rivals.</span></div>;
 if(factor.id==='customer-access'&&context?.stopGroups.length)return <div className="sf-access-evidence"><p className="sf-stat"><strong>{context.stopGroups.reduce((n,g)=>n+g.count,0)}</strong><span>Transport-stop records<small>TfL · saved local search</small></span></p><TransportMiniMap map={map} reportId={reportId} demo={demo}/><span className="sf-visual-caption">Recorded positions, not walking routes or service frequency.</span></div>;
 const compared=factor.id==='customer-base'?densityComparison(comparison??null):null;
 const units=factor.id==='customer-base'&&metric?.label==='TS001'&&typeof metric.value==='number'?populationUnits(metric.value):null;
 return <div className="sf-card-visual">{metric?<><p className="sf-stat"><strong>{typeof metric.value==='number'?readableNumber(metric.value,metric.unit):metric.value}</strong><span>{metricLabel(metric)}<small>{metric.updatedAt?date(metric.updatedAt):'Source date not supplied'}</small></span></p>{compared?<ResidentComparison comparison={compared}/>:units?<div className="sf-population-chart" role="img" aria-label={metric.value+' Census residents. Each square represents '+units.unit+' residents; partial squares preserve the exact total.'}><div className="sf-population-units" aria-hidden="true">{units.cells.map((fill,i)=><span key={i}><i style={{height:fill*100+'%'}}/></span>)}</div><span className="sf-visual-caption">1 square = {units.unit} residents · Census area</span></div>:<div className="sf-observed-signal"><Icon name="evidence"/><span>Observed context<small>Trading demand still to test</small></span></div>}<span className="sf-visual-caption">{factor.id==='customer-base'?'Residents, not measured trading demand.':metricLimit(factor,metric)}</span></>:<div className="sf-observed-signal"><Icon name="help"/><span>Evidence to establish<small>No numerical finding supplied</small></span></div>}</div>;
}
function FactorCard({factor,demo,context,map,reportId,onUnlock}:{factor:SnapshotFactor;demo:boolean;context?:SnapshotContext|null;map?:SnapshotMap;reportId?:string;onUnlock:(id:UnlockId)=>void}){
 if(factor.id==='premises')return <LockedFactorCard card={premisesCard} onUnlock={onUnlock}/>;
 return <article id={`factor-${factor.id}`} className="sf-factor" data-factor={factor.id} data-meaning={factor.meaning} aria-busy={factor.status==='loading'}>
  {!(factor.id==='customer-base'&&factor.residentialCatchment!==undefined||factor.id==='market-position'&&factor.competition)&&<><div className="sf-factor-heading"><Icon name={icons[factor.id]}/><h3>{factor.title}</h3><span className="sf-tag">{status(factor)}</span></div><p className="sf-card-judgement">{excerpt(factor.finding,125)}</p></>}
  <EvidenceVisual factor={factor} context={context} map={map} reportId={reportId} demo={demo}/>
  <div className="sf-factor-footer"><Reasoning factor={factor} demo={demo}/>
  <button type="button" className="sf-content-lock" onClick={()=>onUnlock(factor.id)}><Icon name="lock"/><span>View full {factor.id==='customer-base'?'demand':factor.id==='market-position'?'competition':'access'} analysis<small>Included in the Full Report</small></span><Icon name="arrow"/></button></div>
 </article>;
}
type LockedCard = {id:'premises'|'rent-lease'|'actions';title:string;icon:IconName;headline:string;copy:string;topics:string[]};
const premisesCard:LockedCard={id:'premises',title:'Premises Risk',icon:'shield',headline:'Know what needs checking.',copy:'Bring property questions into the decision before you commit.',topics:['Permitted use & layout','Property risks & evidence gaps']};
const paidCards:LockedCard[]=[
 {id:'rent-lease',title:'Rent & lease',icon:'cost',headline:'See beyond the asking rent.',copy:'Understand the commitments and questions to take into negotiations.',topics:['Available rental context','Lease terms to verify']},
 {id:'actions',title:'Actions',icon:'check',headline:'Make your next move count.',copy:'Turn the findings into a focused plan for your next conversation.',topics:['Prioritised checks','What to ask and why']},
];
const lockedCards=[premisesCard,...paidCards];
function LockedFactorCard({card,onUnlock}:{card:LockedCard;onUnlock:(id:UnlockId)=>void}){
 return <article id={`factor-${card.id}`} className="sf-factor sf-paid-factor sf-locked-compact" data-factor={card.id} aria-labelledby={`locked-${card.id}-title`}>
  <div className="sf-locked-header"><span className="sf-locked-section-icon"><Icon name={card.icon}/></span><span className="sf-locked-badge"><Icon name="lock"/>Locked</span></div>
  <h3 id={`locked-${card.id}-title`}>{card.title}</h3><h4>{card.headline}</h4><p>{card.copy}</p>
  <ul className="sf-locked-topics">{card.topics.map(t=><li key={t}><Icon name="check"/>{t}</li>)}</ul>
  {card.id==='premises'&&<small className="sf-locked-scope">Use and layout remain unverified.</small>}
  <div className="sf-locked-footer"><p>Available after purchase</p><button type="button" className="sf-content-lock sf-package-button" onClick={()=>onUnlock(card.id)} aria-label={`Explore the Full Report, including ${card.title}`}><Icon name="lock"/><span>Unlock the Full Report</span><Icon name="arrow"/></button><small>All eight sections · {formatPrice(site.pricing.fullReport)} one time</small></div>
 </article>;
}
function LocationContext({snapshot,context,reportId}:{snapshot:SnapshotView;context?:SnapshotContext|null;reportId?:string}){
 const base=context?.map.status==='available'?context.map:snapshot.map;
 // Free presentation may show recorded points without a walking catchment.
 // Keep the shared stored adapter's Full Report behaviour unchanged.
 const map={...base,status:base.bounds&&base.layers.some(l=>l.status==='available'&&l.points.length)?'available' as const:base.status};
 return <section className="sf-location-intelligence" aria-labelledby="snapshot-map-title"><div className="sf-module-heading"><Icon name="pin"/><h2 id="snapshot-map-title">Location Intelligence</h2><span className="sf-tag">{context?.precision??snapshot.property.context.find(c=>c.label==='Location precision')?.value??'Precision unknown'}</span></div>
  <div className="sf-location-layout"><div className="sf-location-facts"><div><Icon name="pin"/><p><strong>{snapshot.property.address}</strong><span>{context?.precision??'Recorded geographic context'}</span></p></div><div><Icon name="shop"/><p><strong>{context?.foodTotal??'—'} food records</strong><span>Native FSA categories; trading unverified.</span></p></div><div><Icon name="access"/><p><strong>{context?.stopGroups.reduce((n,g)=>n+g.count,0)??'—'} transport stops</strong><span>Recorded locations, not service frequency.</span></p></div></div><SnapshotMapPanel map={map} demo={snapshot.mode==='demo'} reportId={reportId}/></div>
  {context&&<details className="sf-map-source-notices"><summary>Map sources, dates & scope</summary><p>{map.description}</p>{context.foodDate&&<p>FSA retrieved {date(context.foodDate)}. Source observation date and coordinate accuracy unspecified.</p>}{context.foodGroups.length>0&&<p>FSA native categories: {context.foodGroups.map(g=>`${g.label}: ${g.count}`).join('; ')}. These are register classifications, not a direct-competitor assessment.</p>}{context.notices.map(n=><p key={n}>{n}</p>)}</details>}
 </section>;
}
export function FreeSnapshot({report,research,context,purchaseReport,reportId,measurement=false,purchaseTerms,openPurchase=false}:{purchaseTerms?:ReactNode;openPurchase?:boolean;report:FreeProjection;research?:AdvisorResearch[];context?:SnapshotContext|null;purchaseReport?:string;reportId?:string;measurement?:boolean}){return <FreeSnapshotView snapshot={{...snapshotFromStored(report),advisorResearch:research}} context={context} purchaseReport={purchaseReport} reportId={reportId} measurement={measurement} purchaseTerms={purchaseTerms} openPurchase={openPurchase}/>;}
export function FreeSnapshotView({snapshot,context,purchaseReport,reportId,measurement=false,purchaseTerms,openPurchase=false}:{purchaseTerms?:ReactNode;openPurchase?:boolean;snapshot:SnapshotView;context?:SnapshotContext|null;purchaseReport?:string;reportId?:string;measurement?:boolean}){
 const [selected,setSelected]=useState<UnlockId>('premises');
 const dialog=useRef<HTMLDialogElement>(null);
 const price=formatPrice(site.pricing.fullReport),demo=snapshot.mode==='demo',checks=decisionChecks(snapshot),advice=snapshot.advisor;
 const decision=snapshotRecommendation(snapshot),currentAdvice=decision&&advice?.version==='snapshot-advisor-v2'?advice:null;
 const why=currentAdvice?.why.text??decision?.why??advice?.why.text??snapshot.overallAssessment.reason;
 const nextMove=currentAdvice?.action.text??decision?.nextMove;
 const factors=(Object.keys(factorTitles) as FactorId[]).map(id=>snapshot.factors.find(f=>f.id===id)??{id,title:factorTitles[id],status:'unavailable',meaning:'no_basis',quality:'insufficient',finding:null,reason:null,question:null,metrics:[],score:null,details:null,implication:null,scoreNote:null} as SnapshotFactor);
 const purchase=(position:'brief'|'primary'|'mobile')=>position==='brief'&&purchaseTerms?purchaseTerms:<><button type="button" className="button button-primary" data-testid={`snapshot-purchase-${position}`} data-snapshot-event="full_click" data-snapshot-detail={position} disabled={demo||!purchaseReport} onClick={()=>unlock('premises')}>Get the Full Report · {price}</button>{!purchaseReport&&<p role="status">Full Report purchasing is not open yet.</p>}</>;
 useEffect(()=>{if(openPurchase&&purchaseReport&&!dialog.current?.open)dialog.current?.showModal();},[openPurchase,purchaseReport]);
 function unlock(id:UnlockId){setSelected(id);dialog.current?.showModal();}
 return <div className="page-wrap sf-snapshot sf-decision-page" data-snapshot-root>
  {measurement&&reportId&&!demo&&<SnapshotMeasurement reportId={reportId}/>}
  {demo&&<aside className="sf-demo-notice" role="note"><strong>Development demo · illustrative data</strong><span>These example findings do not measure this property.</span></aside>}
  <header className="sf-property-header"><div><p className="eyebrow">YOUR FREE SNAPSHOT</p><h1>{snapshot.property.address}</h1><p className="sf-property-meta">{businessTypes.find(t=>t.id===snapshot.businessType)?.label??snapshot.businessType}{snapshot.generatedAt&&<span> · Analysed {date(snapshot.generatedAt)}</span>}</p></div><Link href="/check-location" className="sf-new-location"><Icon name="add"/>New location</Link></header>
  <div className="sf-snapshot-top">
   <section className="sf-recommendation" data-stance={decision?.status??advice?.stance??'unassessed'} aria-labelledby="assessment-title"><p className="eyebrow"><span className="sf-signal-dot"/>OUR RECOMMENDATION</p>
    <div className="sf-verdict-heading"><span className="sf-verdict-symbol"><Icon name={decision?.status==='do_not_proceed'?'close':decision?.status==='promising'?'check':'external'}/></span><div><h2 id="assessment-title">{decision?.title??(advice?({recommended:'Pursue this location',conditional:'Conditional shortlist',not_recommended:'Look elsewhere'} as const)[advice.stance]:readinessLabels[snapshot.overallAssessment.meaning])}</h2></div></div>
    {decision?<><p className="sf-decision-lead">{decision.status==='hold'?'Important questions remain before this location can be recommended.':'An investigation decision based on the available evidence.'}</p><div className="sf-decision-metrics">{([{label:'Residential Catchment',metric:decision.inputs.demand},{label:'Competition Headroom',metric:decision.inputs.competition}]).map(({label,metric})=><div key={label}><span>{label}</span><strong>{metric?metric.score:'—'}<small>{metric?'/100':''}</small></strong><span>{metric?.rating??'Unavailable'}</span></div>)}</div><h3 className="sf-decision-caption">Why this matters</h3></>:<RecommendationIndicator stance={advice?.stance}/>}
    <p className="sf-recommendation-why">{decision?why:excerpt(why,170)}</p>
    <a href="#snapshot-explore" className="sf-next-move"><span className="sf-round-icon"><Icon name="arrow"/></span><span><small>YOUR NEXT MOVE</small><strong>{nextMove??(advice?.action.text??'Resolve the priority question before proceeding.')}</strong></span></a>
    <SnapshotEvidenceDialog id="snapshot-recommendation-reasoning" title="Recommendation reasoning" label="Why SiteFit reached this view" className="sf-advisor-rationale">
     {decision&&<><h4>{decision.title}</h4><p>{why}</p><p>{decision.nextMove}</p>{decision.limitations.map(t=><p key={t}>{t}</p>)}<p>Decision policy: {decision.version}. {snapshot.recommendation?'Saved with this assessment.':'Current policy applied to saved scores; the original Ready assessment is retained below without changes or new AI execution.'}</p></>}
     {advice&&<><h4>{currentAdvice?'AI explanation of the policy decision':'Original saved AI advice'}</h4><p>{currentAdvice&&decision?decision.title:recommendationLabels[advice.stance]}</p><p>{advice.recommendation.text}</p><p>{advice.why.text}</p><h4>Strongest reason against</h4><p>{advice.counterargument.text}</p><h4>What would change our view</h4><p>{advice.change.text}</p><h4>Our next recommendation</h4><p>{advice.action.text}</p></>}
     {!advice&&<><p>{snapshot.overallAssessment.headline}</p><p>{snapshot.overallAssessment.reason}</p></>}
     {snapshot.advisorResearch?.map(r=><div key={r.url}><p>{r.fact}</p><p>{r.limitation}</p><a href={r.url} rel="noreferrer" target="_blank">{r.publisher}</a><small> · Retrieved {date(r.retrievedAt)} · {r.effectiveAt?date(r.effectiveAt):'Publication/effective date not supplied'} · {r.licence}</small></div>)}<Lines label="Saved supporting evidence" lines={snapshot.supportiveSignals}/>
    </SnapshotEvidenceDialog>
   </section>
   <section className="sf-snapshot-summary" aria-labelledby="snapshot-summary-title">
    <div className="sf-module-heading"><Icon name="document"/><h2 id="snapshot-summary-title">Snapshot Summary</h2><span className="sf-tag" aria-label="Free Snapshot">Free</span></div>
    <p className="sf-summary-section-label">Your location at a glance</p>
    <ul className="sf-summary-results">{factors.filter(f=>f.id!=='premises').map(f=>{const scored=scoreSummary(f);return <li key={f.id} data-meaning={scored?'scored':f.meaning}><span className={`sf-summary-icon ${!scored&&f.meaning==='favourable'?'sf-summary-positive':''}`}><Icon name={!scored&&f.meaning==='favourable'?'check':icons[f.id]}/></span><div className="sf-summary-result"><div><strong>{f.title}</strong><span className="sf-summary-rating">{scored?.label??status(f)}</span></div><p>{scored?.text??excerpt(f.finding,115)}</p></div></li>;})}</ul>
    {decision&&<p className="sf-summary-decision"><span>Recommendation</span><strong>{decision.title}</strong></p>}
    <div className="sf-summary-locked"><div className="sf-summary-locked-heading"><span>In your Full Report</span><span className="sf-locked-badge"><Icon name="lock"/>Locked</span></div><p>These sections unlock after purchase.</p><ul>{lockedCards.map(card=><li key={card.id}><button type="button" onClick={()=>unlock(card.id)} aria-label={`Explore the Full Report, including ${card.title}`}><Icon name={card.icon}/><strong>{card.title}</strong><Icon name="lock"/></button></li>)}</ul><button type="button" className="button button-primary" onClick={()=>unlock('premises')}>Explore the Full Report <Icon name="arrow"/></button><small>All eight sections · {price} one time · No subscription</small></div>
    <p className="sf-summary-sufficiency"><EvidenceQuality quality={snapshot.overallAssessment.quality}/> <span>Evidence strength, not a success score.</span></p>
   </section>
  </div>
  <section id="decision-factors" aria-label="Location insights and Full Report previews"><div className="sf-factors">{factors.map(f=><FactorCard key={f.id} factor={f} demo={demo} context={context} map={context?.map??snapshot.map} reportId={reportId} onUnlock={unlock}/>)}{paidCards.map(card=><LockedFactorCard key={card.id} card={card} onUnlock={unlock}/>)}</div></section>
  <LocationContext snapshot={snapshot} context={context} reportId={reportId}/>
  <section className="sf-key-unknowns" id="snapshot-explore" aria-labelledby="snapshot-explore-title"><div className="sf-module-heading"><span className="sf-round-icon"><Icon name="help"/></span><h2 id="snapshot-explore-title">Key unknowns & what could change the recommendation</h2></div><div className="sf-unknown-layout"><div><p className="sf-section-caption">Resolve these before committing. Ordered by the next useful check, not a calculated risk score.</p>{checks.map((c,i)=><details className="sf-answer" key={c.id} data-snapshot-event="question_open" data-snapshot-detail={['lease','demand','risks'][i]}><summary><span className="sf-check-number">0{i+1}</span><span>{c.question}<small>{c.why}</small></span><Icon name="add"/></summary><div className="sf-answer-body"><strong>Next practical step</strong><p>{c.action}</p>{c.id==='premises'&&advice&&<p>{advice.action.text}</p>}<button type="button" className="text-link" onClick={()=>c.id==='premises'?unlock('premises'):document.getElementById(`evidence-${c.id}`)?.click()}>{c.id==='premises'?'Explore full premises review':'What the saved evidence says'} <Icon name="arrow"/></button></div></details>)}{checks.length===0&&<p>No prioritised questions were supplied in the saved evidence.</p>}</div><aside className="sf-deeper-view"><Icon name="document"/><h3>Get a deeper decision view</h3><ul><li>Connect customer, competition and access evidence.</li><li>Prioritise property and lease questions.</li><li>Take a clear action plan into your next conversation.</li></ul>{purchase('primary')}<small>{price} one time · No subscription</small><p>Available evidence may leave questions unresolved. Not a survey or confirmation of planning permission.</p></aside></div></section>
  <section id="full-case" className="sf-snapshot-offer" aria-labelledby="full-case-title"><div className="sf-offer-document" aria-hidden="true"><Icon name="document"/><span>SITEFIT</span><i/><i/><i/></div><div><p className="eyebrow">FULL REPORT</p><h2 id="full-case-title">See the bigger picture for {snapshot.property.address.split(",").slice(0,2).join(",")}.</h2><p>Eight connected sections. Prioritised risks. A saved assessment and downloadable PDF.</p><Link href="/sample-report" className="text-link">See the report format <Arrow/></Link></div><div><button className="button button-secondary" onClick={()=>unlock('premises')}>Explore the Full Report <Icon name="arrow"/></button><p><strong>{price}</strong> · One-time purchase</p></div></section>
  <details className="sf-coverage-details"><summary>Evidence coverage & important limits</summary><p>{snapshot.coverage}</p><Lines label="Saved open questions" lines={snapshot.openQuestions}/><Lines label="Counterevidence and alternative explanations" lines={snapshot.factors.flatMap(f=>f.details?.opposition??[])}/><p>AI analysis is indicative and can be inaccurate. Verify material matters and make your own business decision. Your statutory rights are unaffected. This initial recommendation is not a forecast of customer demand or commercial success. Rent benchmarks depend on available qualified evidence; business financial calculations are not included.</p></details>
  <footer className="sf-saved-note"><p>{demo?'Development demo only. No report is saved.':'Saved analysis. Reopening this Snapshot does not run AI or refresh its source evidence.'}</p><Link href="/account">Your saved locations <Arrow/></Link></footer>
  <dialog ref={dialog} className="sf-unlock-dialog" aria-labelledby="snapshot-unlock-title" data-unlock-origin={selected}>
   <div className="sf-dialog-heading"><span className="sf-tag"><Icon name="document"/>THE FULL REPORT</span><button type="button" aria-label="Close deeper analysis" onClick={()=>dialog.current?.close()}><Icon name="close"/></button></div>
   <h2 id="snapshot-unlock-title">The full picture.<br/> One clear next move.</h2><p className="sf-unlock-lead">Go beyond the Snapshot with all eight report sections, a prioritised action plan and a downloadable PDF.</p>
   <ul className="sf-package-includes"><li><Icon name="check"/>Deeper demand, competition & access analysis</li><li><Icon name="check"/>Premises risks, rental context & lease questions</li><li><Icon name="check"/>Prioritised actions to take before you commit</li></ul>
   <div className="sf-unlock-context"><strong>{snapshot.property.address}</strong><span>{businessTypes.find(t=>t.id===snapshot.businessType)?.label??snapshot.businessType}</span></div>
   <div className="sf-package-price"><strong>{price}<span>one-time payment</span></strong><span>All eight sections + PDF<br/>30 days’ online access from Ready</span></div>
   {purchase('brief')}<small>One purchase covers the whole report. No subscription. Available evidence may leave questions unresolved; this is not a premises survey or confirmation of planning permission.</small>
  </dialog>
  <div className="sf-mobile-action"><span>Your next step · deeper assessment</span>{purchase('mobile')}</div>
 </div>;
}
