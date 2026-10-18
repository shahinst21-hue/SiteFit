"use client";
import Link from "next/link";
import {useState} from "react";
import {readableNumber} from "@/lib/report-dashboard/display";
import {PurchaseButton} from "./purchase-button";
import {Arrow} from "./ui";
import {Icon,type IconName} from "./icon";
import {SnapshotMapPanel} from "./snapshot-map";
import {businessTypes} from "@/lib/wizard";
import {formatPrice,site} from "@/lib/site-config";
import type {FreeProjection} from "@/lib/analysis/projection";
import {factorTitles,snapshotFromStored,type EvidenceQuality as Quality,type FactorId,type SnapshotFactor,type SnapshotMetric,type SnapshotView} from "@/lib/snapshot/model";
import {cafeLenses,decisionChecks,meaningfulMetrics,metricLabel,metricLimit,readinessLabels,snapshotQuestions,type CafeLens} from "@/lib/snapshot/decision";
import {sampleSections} from "@/lib/content/sample-report";
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
 return <details className="sf-evidence-details" id={`evidence-${factor.id}`} data-snapshot-event="factor_open" data-snapshot-detail={factor.id}><summary>Explore the evidence <Icon name="add"/></summary><div className="sf-disclosure-body">
  <p><strong>Evidence sufficiency: {qualityLabels[factor.quality]}.</strong> {factor.scoreNote}</p>
  {factor.implication&&<p>{factor.implication}</p>}
  {why?<><Lines label="What supports this" lines={why.support}/><Lines label="What limits this" lines={why.opposition}/><Lines label="Other explanations" lines={why.alternatives}/><Lines label="Still unknown" lines={why.unknowns}/>
   {why.comparison&&<div><h4>Residential comparison</h4><p>{why.comparison.description}</p>{why.comparison.density!==null&&<p>{readableNumber(why.comparison.density,why.comparison.units)} {why.comparison.units}</p>}{why.comparison.percentile!==null&&<p>Descriptive distribution position: {Math.round(why.comparison.percentile)}th percentile among {why.comparison.peers} other Census areas. This is not a customer-demand or commercial-performance score.</p>}<Lines label="Comparison limits" lines={why.comparison.limitations}/></div>}
   {!!why.observations.length&&<div><h4>Original observations and scope</h4>{why.observations.map((o,i)=><p key={i}>{o.label}: {o.value===null?'Unknown':typeof o.value==='number'?readableNumber(o.value,o.units):o.value} {o.units} · {o.scope}{o.effectiveAt&&<> · Effective {date(o.effectiveAt)}</>}</p>)}</div>}
   {!!why.sources.length&&<details className="sf-source-disclosure"><summary>Sources, dates & methodology</summary>{why.sources.map((s,i)=><div key={i}><p>{s.url?<a href={s.url} rel="noreferrer" target="_blank">{s.provider} · {s.dataset}<Icon name="external"/></a>:`${s.provider} · ${s.dataset}`}{s.retrievedAt&&<> · Retrieved {date(s.retrievedAt)}</>}</p>{s.notices.map(n=><small key={n}>{n}</small>)}</div>)}</details>}
  </>:<p>{demo?'Illustrative fixture only. No property investigation supports these example findings.':'Evidence details were not supplied for this factor.'}</p>}
 </div></details>;
}
function FactorCard({factor,demo,priority}:{factor:SnapshotFactor;demo:boolean;priority:boolean}){
 const metrics=meaningfulMetrics(factor),loading=factor.status==='loading';
 return <article id={`factor-${factor.id}`} className={`sf-factor${priority?' sf-factor-priority':''}`} aria-busy={loading}>
  <div className="sf-factor-heading"><span className="sf-line-icon"><Icon name={icons[factor.id]}/></span><h3>{factor.title}</h3>{priority&&<span className="sf-tag">Check first</span>}</div>
  {loading?<div role="status"><span className="sf-skeleton sf-skeleton-heading"/><p>Preparing this evidence…</p></div>:<><h4 className="sf-finding">{factor.finding??'This part of the case is still open.'}</h4><p className="sf-factor-reason">{factor.reason??'The available evidence cannot establish this factor.'}</p></>}
  {metrics.length>0&&<div className="sf-observations">{metrics.slice(0,1).map(m=><SnapshotMetricRow key={m.id} metric={m} factor={factor}/>)}</div>}
  {factor.question&&<div className="sf-next-check"><span>Next check</span><p>{factor.question}</p></div>}
  {!loading&&<Reasoning factor={factor} demo={demo}/>}
 </article>;
}
function LocationContext({snapshot}:{snapshot:SnapshotView}){
 const mapped=snapshot.map.status==='available'&&snapshot.map.bounds!==null&&snapshot.map.layers.some(l=>l.kind==='property'&&l.status==='available'&&l.points.length>0);
 const precise=snapshot.property.context.find(c=>c.label==='Location precision')?.value;
 return <section className={`sf-location-intelligence${mapped?' sf-location-mapped':''}`} aria-label="Location intelligence">
  <div className="sf-location-summary"><span className="sf-line-icon"><Icon name="pin"/></span><div><h3>Location intelligence</h3><p>{snapshot.property.confirmation}. {precise==='Postcode area'?'The analysis uses postcode-area context; the exact premises point and entrance are not verified.':`Location basis: ${precise??'not established'}. A postal match does not confirm an entrance.`}</p></div><span className="sf-tag">{precise??'Precision unknown'}</span></div>
  {mapped?<SnapshotMapPanel map={snapshot.map} demo={snapshot.mode==='demo'}/>:<p className="sf-location-note">No map is shown because the saved evidence does not contain a verified premises point and usable map layers.</p>}
  {snapshot.transport.places.length>0&&<details className="sf-journey-details"><summary>Explore stored transport journeys</summary><ul>{snapshot.transport.places.map(p=><li key={p.id}><strong>{p.name}</strong><p>{p.walkingMinutes===null?'Walking time unknown':`${Math.round(p.walkingMinutes)} min modelled walk`}{p.distanceMetres!==null&&` · ${readableNumber(p.distanceMetres,'metres')} metres`}</p>{p.information&&<small>{p.information}</small>}</li>)}</ul>{snapshot.transport.note&&<p>{snapshot.transport.note}</p>}</details>}
 </section>;
}
function openEvidence(id:FactorId){const element=document.getElementById(`evidence-${id}`);if(element instanceof HTMLDetailsElement)element.open=true;}
function FullPreview(){
 const [selected,setSelected]=useState(0);
 const examples=[{label:'Priority check',index:4},{label:'Competitive offer',index:2},{label:'Action sequence',index:6}];
 const content=sampleSections[examples[selected].index];
 return <div className="sf-full-preview"><div className="sf-preview-label"><Icon name="document"/><span>Fictional sample · not findings about this property</span></div><div className="sf-preview-picker" role="group" aria-label="Full Report sample examples">{examples.map((e,i)=><button type="button" key={e.label} aria-pressed={selected===i} aria-controls="snapshot-sample-content" onClick={()=>setSelected(i)}>{e.label}</button>)}</div><div id="snapshot-sample-content" className="sf-sample-content" aria-live="polite"><p className="eyebrow">FULL REPORT EXAMPLE</p><h3>{content[0]}</h3><p>{content[1]}</p></div><Link href="/sample-report" className="text-link">Explore the eight-section sample <Arrow/></Link></div>;
}
export function FreeSnapshot({report,purchaseReport,reportId,measurement=false}:{report:FreeProjection;purchaseReport?:string;reportId?:string;measurement?:boolean}){return <FreeSnapshotView snapshot={snapshotFromStored(report)} purchaseReport={purchaseReport} reportId={reportId} measurement={measurement}/>;}
export function FreeSnapshotView({snapshot,purchaseReport,reportId,measurement=false}:{snapshot:SnapshotView;purchaseReport?:string;reportId?:string;measurement?:boolean}){
 const [lens,setLens]=useState<CafeLens>('any');
 const price=formatPrice(site.pricing.fullReport),demo=snapshot.mode==='demo',checks=decisionChecks(snapshot),questions=snapshotQuestions(snapshot);
 const factors=(Object.keys(factorTitles) as FactorId[]).map(id=>snapshot.factors.find(f=>f.id===id)??{id,title:factorTitles[id],status:'unavailable',meaning:'no_basis',quality:'insufficient',finding:null,reason:null,question:null,metrics:[],score:null,details:null,implication:null,scoreNote:null} as SnapshotFactor);
 const coffee=snapshot.businessType==='coffee-shop';
 const purchase=(position:'brief'|'primary'|'mobile')=><PurchaseButton report={!demo?purchaseReport:undefined} label={`Get the Full Report · ${price}`} unavailableMessage="Full Report purchasing is not open yet." controlId={`snapshot-purchase-${position}`}/>;
 return <div className="page-wrap sf-snapshot sf-decision-page" data-snapshot-root>
  {measurement&&reportId&&!demo&&<SnapshotMeasurement reportId={reportId}/>}
  {demo&&<aside className="sf-demo-notice" role="note"><strong>Development demo · illustrative data</strong><span>These example findings do not measure this property.</span></aside>}
  <header className="sf-property-header"><div><p className="eyebrow">YOUR FREE SNAPSHOT</p><h1>{snapshot.property.address}</h1><p className="sf-property-meta">{businessTypes.find(t=>t.id===snapshot.businessType)?.label??snapshot.businessType}{snapshot.generatedAt&&<span> · Saved {date(snapshot.generatedAt)}</span>}</p></div><a className="sf-jump-link" href="#snapshot-explore">Ask about this location <Icon name="help"/></a></header>
  <section className="sf-decision-brief" aria-labelledby="assessment-title" aria-busy={snapshot.analysisStatus==='loading'}>
   <div className="sf-brief-top"><p className="eyebrow"><span className="sf-signal-dot"/>01 · AI DECISION BRIEF</p><span className="sf-tag">Saved analysis</span></div>
   <div className="sf-brief-layout"><div className="sf-brief-finding"><p className="sf-readiness">Your next decision</p><h2 id="assessment-title">{snapshot.analysisStatus==='loading'?'Preparing the evidence':readinessLabels[snapshot.overallAssessment.meaning]}.</h2><p className="sf-saved-finding">{snapshot.overallAssessment.headline??'The location case remains open.'}</p><p className="sf-brief-reason">{snapshot.overallAssessment.reason??'More evidence is needed to assess this location.'}</p></div>
    <aside className="sf-brief-next"><span className="sf-line-icon"><Icon name="shield"/></span><p className="eyebrow">MOST IMPORTANT OPEN QUESTION</p><p>{checks[0]?.question??snapshot.openQuestions[0]??'The saved evidence does not establish a next check.'}</p>{checks[0]&&<a href={`#factor-${checks[0].id}`} className="text-link">Explore this check <Icon name="arrow"/></a>}</aside></div>
   <div className="sf-brief-footer"><div><span className="sf-evidence-label">Evidence sufficiency <strong>{qualityLabels[snapshot.overallAssessment.quality]}</strong></span><span>Indicative analysis. Verify the matters that affect your decision.</span></div><a href="#decision-factors" className="text-link">See the evidence <Icon name="down"/></a></div>
  </section>
  <div className="sf-early-offer"><div><strong>Explore this location in depth.</strong><p>A deeper evidence assessment, prioritised risks and a downloadable report.</p></div><div>{purchase('brief')}</div></div>
  <section id="decision-factors" className="sf-evidence-section" aria-labelledby="snapshot-evidence-title"><div className="sf-section-heading"><div><p className="eyebrow">02 · THE EVIDENCE</p><h2 id="snapshot-evidence-title">The case, from four angles.</h2></div><p>What the records say. What they mean. What they cannot tell you.</p></div>
   <div className="sf-factors">{[...factors].sort((a,b)=>Number(b.id===checks[0]?.id)-Number(a.id===checks[0]?.id)).map(f=><FactorCard key={f.id} factor={f} demo={demo} priority={checks[0]?.id===f.id}/>)}</div>
   <details className="sf-coverage-details"><summary>Evidence coverage & important limits</summary><p>{snapshot.coverage??'Coverage details were not supplied.'}</p><p>Evidence sufficiency describes the available information. It is not a confidence percentage, a location score or a prediction of business success.</p><Lines label="Saved supportive signals" lines={snapshot.supportiveSignals}/><Lines label="Saved open questions" lines={snapshot.openQuestions}/></details>
   <LocationContext snapshot={snapshot}/>
  </section>
  <section id="snapshot-explore" className="sf-explore" aria-labelledby="snapshot-explore-title"><div className="sf-section-heading"><div><p className="eyebrow">03 · ASK & EXPLORE</p><h2 id="snapshot-explore-title">Make it your decision.</h2></div><p>Explore the saved findings. No live search or new AI request.</p></div>
   <div className="sf-explore-layout"><div className="sf-ask"><div className="sf-module-heading"><Icon name="help"/><h3>Ask SiteFit</h3></div><p>About this {coffee?'café':snapshot.businessType==='restaurant'?'restaurant':'salon'} location</p>{questions.map(q=><details key={q.id} className="sf-answer" data-snapshot-event="question_open" data-snapshot-detail={q.id}><summary>{q.question}<Icon name="add"/></summary><div className="sf-answer-body">{q.answer.length?<ul>{q.answer.map((line,i)=><li key={i}>{line}</li>)}</ul>:<p>The saved evidence cannot answer this question.</p>}<p className="sf-answer-limit">{q.limit}</p><a href={`#evidence-${q.factor}`} onClick={()=>openEvidence(q.factor)} className="text-link">Read the underlying evidence <Icon name="arrow"/></a></div></details>)}</div>
   <aside className="sf-decision-changers"><div className="sf-module-heading"><Icon name="shield"/><h3>What could change the decision?</h3></div><p>Resolve constraints first, then test the trading case.</p><ol>{checks.map((check,i)=><li key={check.id}><span className="sf-check-number">0{i+1}</span><div><h4>{check.question}</h4><p>{check.why}</p><details><summary>How to check</summary><p>{check.action}</p><a href={`#evidence-${check.id}`} onClick={()=>openEvidence(check.id)} className="text-link">What we know so far <Icon name="arrow"/></a></details></div></li>)}</ol>{!checks.length&&<p>No prioritised verification questions were supplied in this saved Snapshot.</p>}<small>Verification order, not an estimated risk level. These checks may require you, the landlord or an adviser.</small></aside></div>
   {coffee&&<div className="sf-cafe-lens"><fieldset><legend>What kind of café are you planning? <span>Optional</span></legend><div className="sf-lens-options">{(Object.keys(cafeLenses) as CafeLens[]).map(id=><label key={id}><input type="radio" name="cafe-lens" value={id} checked={lens===id} onChange={()=>setLens(id)}/><span>{cafeLenses[id].label}</span></label>)}</div></fieldset><div className="sf-lens-question" aria-live="polite"><Icon name="coffee"/><p><strong>A question for your plan</strong>{cafeLenses[lens].question}</p></div><small>Your planning lens changes this follow-up question only. It does not change the saved findings, establish capacity or recommend the most profitable format. Your selection stays on this page and is not saved.</small></div>}
  </section>
  <section className="sf-full-report" id="full-case" tabIndex={-1} aria-labelledby="full-case-title"><div className="sf-full-report-intro"><p className="eyebrow">04 · DEEPER ASSESSMENT</p><h2 id="full-case-title">Before you commit,<br/>see the fuller picture.</h2><p className="sf-full-price">Full Report <strong>{price}</strong><span>One-time purchase. No subscription.</span></p><p>Your location, assessed in depth across eight sections. A saved report and downloadable PDF to take into your next conversation.</p><div>{purchase('primary')}</div></div>
   <div className="sf-full-outcomes">{[{icon:'search',title:'Understand the evidence',text:'More detail on customer context, competing offers, access and premises, where qualified evidence is available.'},{icon:'shield',title:'Know what could change the case',text:'An integrated verdict with prioritised strengths, risks and the constraints that remain unresolved.'},{icon:'check',title:'Take a useful next step',text:'A prioritised action plan and questions to take to the landlord, a viewing or a professional adviser.'}].map(o=><div key={o.title}><Icon name={o.icon as IconName}/><div><h3>{o.title}</h3><p>{o.text}</p></div></div>)}<p className="sf-full-limit">Not a survey, planning permission or a guarantee of demand. Rent benchmarks depend on available qualified evidence; business financial calculations are not included.</p></div>
   <FullPreview/><p className="sf-full-boundary">The Full Report makes missing evidence explicit. It cannot promise to settle permitted use, physical fit or lease terms without the relevant documents and checks.</p>
  </section>
  <footer className="sf-saved-note"><p>{demo?'Development demo only. No report is saved.':'Your saved Snapshot reopens with the same findings. Access depends on your signed-in account or the guest browser session that created it.'}</p><Link href="/check-location">Check another location <Arrow/></Link></footer>
  <div className="sf-mobile-action"><span>Go deeper before you commit.</span>{purchase('mobile')}</div>
 </div>;
}
