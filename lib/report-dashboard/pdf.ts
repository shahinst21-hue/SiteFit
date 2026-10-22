import {competitionInterpretation,competitionMethod,competitionLimit} from '../competition/model.ts';
import 'server-only';
import {residentialModel,residentialInterpretation} from '../analysis/residential-catchment.ts';
import fs from 'node:fs/promises';
import path from 'node:path';
import {PDFDocument,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type {Dashboard} from './model.ts';
import {reportPages,readableNumber,displayDate} from './model.ts';
import type {SectionKey} from '../report-intelligence/catalog.ts';
import {rentalCards} from './rental.ts';
import {dashboardRecommendation} from './presentation.ts';

/** One display contract for immutable tab and full exports. No private preparation/checkpoints or external resources. */
export function exportParagraphs(report:Dashboard,key:SectionKey):{text:string;heading?:boolean}[]{
  const p=report.pages.find(p=>p.key===key);if(!p)throw Error('invalid_export_section');
  const rows:{text:string;heading?:boolean}[]=[];
  const add=(text:string,heading=false)=>{if(text.trim()&&!rows.some(r=>r.text===text))rows.push({text,heading});};
  if(report.structuredPreview){
    if(key!=='rental-context')throw Error('full_report_not_ready');
    add('Owner Preview — qualified structured rental evidence, not a Ready Full Report',true);
    add(`Stored generation stage: ${report.structuredPreview.stage}. No incomplete AI narrative is published.`);
  }
  const emptyPricing=key==='rental-context'&&!report.rental.length;
  const decision=dashboardRecommendation(report);
  if(key==='overview'&&decision){add('Our recommendation',true);add(decision.title,true);add(decision.why);add(`Your next move: ${decision.nextMove}`);
    for(const [label,metric] of [['Residential Catchment',decision.inputs.demand],['Competition Headroom',decision.inputs.competition]] as const)add(`${label}: ${metric?`${metric.score}/100 — ${metric.rating}`:'Score unavailable'}`);
    add(`Decision policy ${decision.version}. ${report.recommendation?'Saved with the assessment.':'Current policy applied to saved scores. Original stored advice follows unchanged.'}`);decision.limitations.forEach(t=>add(t));}
  add(reportPages.find(x=>x.key===key)!.label,true);if(!emptyPricing)add(key==='competition'&&report.competition?competitionInterpretation(report.competition):p.conclusion);
  if(key==='overview'&&report.summary){add('Consultant Verdict',true);report.summary.verdict.forEach(t=>add(t));add('Key strengths',true);report.summary.strengths.forEach(s=>add(s.text));add('Key risks & unknowns',true);report.summary.risks.forEach(s=>add(s.text));add('Priority action',true);add(report.summary.priority);add(`${report.index.label}: ${report.index.value??'withheld'}. ${report.index.scope}. Hypothetical context policy only; not demand, profitability or suitability.`);add(`Decision readiness: ${report.readiness}`);}
  if(!emptyPricing&&!(key==='competition'&&report.competition))p.analysis.forEach(s=>add(`${s.kind.replaceAll('_',' ')}: ${s.text}`));
  if(p.test&&!emptyPricing){add('What could change the decision?',true);add(p.test.text);}
  if(key==='customer-context'&&report.residentialCatchment!==undefined){const r=report.residentialCatchment;add('Residential Catchment Strength',true);if(!r)add('Score unavailable: verified walking populations are incomplete.');else{add(`${r.score}/100 — ${r.rating}`);add(residentialInterpretation(r));r.populations.forEach((n,i)=>add(`${[5,10,15][i]} min walk: ${Math.round(n).toLocaleString('en-GB')} estimated residents.`));r.bands.forEach((n,i)=>add(`${['0–5','5–10','10–15'][i]} min band: ${readableNumber(n)}; reference ${residentialModel.benchmarks[i]}; score ${r.components[i].toFixed(1)}/100; weight ${residentialModel.weights[i]*100}%.`));add(`SiteFit ${r.version}; weighted result ${r.rawScore.toFixed(4)}. ONS Census 2021 and Geoapify walking network. ${r.metadata.precision}. Reference thresholds, not measured demand or business success.`);}}
  if(key==='competition'&&report.competition){
    const r=report.competition;add('Competition Headroom Score',true);add(r.score===null?'Score unavailable':`${r.score}/100 — ${r.rating}`);add(competitionInterpretation(r));add(r.reason);
    r.counts?.forEach((n,i)=>add(`${[5,10,15][i]} min walking area: ${r.provenance.complete?'':'at least '}${n} identified similar businesses.`));
    if(r.score!==null)add(`Effective competitors ${r.effectiveCompetitors}; effective residential population ${r.effectivePopulation}; density per 1,000 effective residents ${r.density}. Model ${r.version}.`);
    if(r.populations)add(`Cumulative residential populations: ${r.populations.join(' / ')}. Same frozen walking origin and evidence as the Snapshot.`);
    add(competitionMethod);add(competitionLimit);add(`Source: Geoapify Places / OpenStreetMap. Retrieved ${r.provenance.retrievedAt??'not established'}. ${r.provenance.pages} validated pages; category rules ${r.provenance.categoryVersion}. ${r.provenance.correction}`);
    add(`${r.records.length} displayed of ${r.recordTotal} identified matches. A complete zero-match search does not prove that no competitors exist.`);
    for(const p of r.records)add(`${p.name} · ${p.band} min walking area · ${p.categories.join(', ')} · recorded position ${p.latitude}, ${p.longitude} · Geoapify ${p.id}`);
    add('Compare current offers, prices and operating hours on a local visit. Current activity and commercial performance remain unverified. © OpenStreetMap contributors; powered by Geoapify.');
  }
  if(key==='competition'&&!report.competition){
    add('Qualified register shortlist — not unique or verified direct competitors',true);
    for(const o of report.operators?.items??[])add(`${o.name} · ${o.businessType}. Observed ${displayDate(o.observedAt)}. Offer, current activity, customer rating and chain affiliation unverified. ${o.reference}`);
    if(!report.operators)add('No named business shortlist is available in this report.');
  }
  if(key==='premises'){
    add('Operating-format comparison',true);
    if(report.scenarios)for(const s of report.scenarios.scenarios){add(s.label,true);add(`Physical state: ${s.physical.state}. Requirements: ${s.requirements.join('; ')}.`);add(`Trading hypotheses: ${s.commercial.tradingPeriods.map(p=>`${p.period} (${p.status}${p.evidenceIds.length?'':'; no supporting period evidence'})`).join('; ')}.`);add(s.physical.blocker??'Permission and usable layout remain to verify.');add(s.physical.capacity?`Conditional documented capacity: ${s.physical.capacity.count} ${s.physical.capacity.unit}. ${s.physical.capacity.status}.`:`Capacity withheld: ${s.physical.capacityWithheldReason?.replaceAll('_',' ')}`);}
    else add('Scenario Fit not stored in this historical edition. No format or capacity is inferred.');
    for(const t of report.timeline)add(`${displayDate(t.date)} · ${t.fact}. ${t.dateMeaning}; ${t.scope}. Source reference ${t.referenceId}.`);
  }
  if(key==='rental-context'){
    for(const r of rentalCards(report)){
      add(`${r.label}: ${r.amount} ${r.unit}; ${r.areaBasis}. ${r.dates}. ${r.margin??''} ${r.qualification}`);
      for(const d of r.details)add(`${d.label}: ${d.value}.`);
      if(r.relevance)add(r.relevance);
    }
    if(report.rental.length>1)add('Separate dated observations, not an averaged rent or an automatically preferred newest figure.');
  }
  if(key==='actions')for(const a of report.actions){add(`${a.rank}. ${a.action}`,true);add(`Why it matters: ${a.consequence}`);}
  if(key==='access')for(const t of report.transport)add(`${t.name}: ${t.walkingMinutes===null?'route unavailable':`${readableNumber(t.walkingMinutes)} minute modelled walk; ${readableNumber(t.distanceMetres??0)} metres`}. ${t.information}`);
  if(key==='customer-context')for(const t of report.profiles){add(`${t.dataset} · ${t.seconds/60} minute contour · ${t.period}`,true);add(`Universe: ${t.universe}. Method: ${t.method}. Published categories are not additive; contours are cumulative.`);for(const c of t.columns)add(`${c.label}: ${c.value===null?c.state:readableNumber(c.value)}.`);t.limitations.forEach(l=>add(l));}
  if(!emptyPricing)add('Supporting sources & material qualifications',true);
  const ids=new Set([...p.factIds,...p.analysis.flatMap(s=>s.factIds),...(p.test?.factIds??[])]);
  const refs=new Set([...p.referenceIds,...p.analysis.flatMap(s=>s.referenceIds),...(p.test?.referenceIds??[])]);
  if(key==='overview'&&report.summary)for(const s of [...report.summary.strengths,...report.summary.risks]){s.factIds.forEach(id=>ids.add(id));s.referenceIds.forEach(id=>refs.add(id));}
  if(key==='premises')report.timeline.forEach(t=>refs.add(t.referenceId));
  if(key==='rental-context')report.rental.forEach(r=>refs.add(r.id));
  for(const s of report.sources.filter(s=>key==='appendix'||ids.has(s.id))){add(`${s.id} · ${s.label}`,true);add(`${typeof s.value==='number'?readableNumber(s.value,s.units):s.value} ${s.units??''}. ${s.scope}. ${s.kind}; evidence ${s.strength}; precision ${s.precision}. Period ${displayDate(s.effectiveAt)}; retrieved ${displayDate(s.retrievedAt)}.`);s.limitations.forEach(l=>add(l));add(`Provider ${s.provider}; release ${s.release??'not specified'}; adapter ${s.adapter}; policy ${s.licence}.`);s.notices.forEach(n=>add(n));if(s.reference)add(s.reference);}
  for(const r of report.references.filter(r=>key==='appendix'||refs.has(r.id)))add(`${r.id} · ${r.source}; ${r.scope}. Source date ${displayDate(r.effectiveAt)}; retrieved ${displayDate(r.retrievedAt)}; policy ${r.licence}. ${r.url??'Public URL unavailable.'}`);
  if(!emptyPricing){p.cautions.forEach(s=>add(s.text));p.unknowns.forEach(u=>add(u));}
  if(key==='appendix'&&!report.rental.length){const rent=report.pages.find(p=>p.key==='rental-context')!;
    add('Stored rental assessment & limitations',true);add(rent.conclusion);rent.analysis.forEach(s=>add(s.text));if(rent.test)add(rent.test.text);rent.cautions.forEach(s=>add(s.text));rent.unknowns.forEach(u=>add(u));}
  if(key==='appendix')add(`Full Report V1 content digest: ${report.digest}. Stored interpretation and source snapshots are not refreshed on reopen. Financial Engine calculations are excluded.`);
  return rows;
}

export async function renderReportPDF(report:Dashboard,key?:SectionKey){
  if(report.structuredPreview&&key!=='rental-context')throw Error('full_report_not_ready');
  const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
  const font=await pdf.embedFont(await fs.readFile(path.join(process.cwd(),'public/fonts/DejaVuSans.ttf')),{subset:true});
  const charset=new Set(font.getCharacterSet()), ink=rgb(.09,.15,.19),muted=rgb(.34,.41,.47),green=rgb(.04,.36,.24);
  const date=new Date(report.generatedAt);if(Number.isFinite(date.getTime())){pdf.setCreationDate(date);pdf.setModificationDate(date);}
  pdf.setTitle(`SiteFit — ${key?reportPages.find(p=>p.key===key)!.label:'Full Report'}`);pdf.setAuthor('SiteFit');pdf.setSubject(report.digest);
  let page=pdf.addPage([595.28,841.89]),y=756;
  const fresh=()=>{page=pdf.addPage([595.28,841.89]);y=756;};
  const line=(text:string,size:number,colour=ink)=>{
    // Fail honestly if the bundled font cannot represent a character; never silently drop or replace customer content.
    if(Array.from(text).some(c=>!charset.has(c.codePointAt(0)!)))throw Error('pdf_character_unavailable');
    if(y<66)fresh();page.drawText(text,{x:42,y,size,font,color:colour});y-=size*1.65;
  };
  const paragraph=(text:string,size=10,colour=ink)=>{
    const words=text.replace(/[\r\n]+/g,' ').split(/\s+/);let row='';
    for(const word of words){const next=row?`${row} ${word}`:word;
      if(font.widthOfTextAtSize(next,size)<=508){row=next;continue;}
      if(row)line(row,size,colour);let chunk='';
      for(const c of Array.from(word)){if(font.widthOfTextAtSize(chunk+c,size)>508){line(chunk,size,colour);chunk='';}chunk+=c;}row=chunk;
    }if(row)line(row,size,colour);y-=7;
  };
  const keys=key?[key]:reportPages.map(p=>p.key);
  const map=(operators=false)=>{
    const m=report.map;if(!m?.bounds||m.status!=='available')return;
    if(y<290)fresh();const [w,s,e,n]=m.bounds,bottom=y-210;
    const xy=(p:[number,number])=>[42+(p[0]-w)/(e-w)*508,bottom+(p[1]-s)/(n-s)*210];
    page.drawRectangle({x:42,y:bottom,width:508,height:210,color:rgb(.94,.96,.94)});
    for(const l of m.layers.filter(l=>l.kind==='catchment').toReversed())for(const part of l.polygonParts??l.polygons.map(p=>[p]))for(const ring of part){
      const c=/^#[\da-f]{6}$/i.test(l.colour)?rgb(parseInt(l.colour.slice(1,3),16)/255,parseInt(l.colour.slice(3,5),16)/255,parseInt(l.colour.slice(5,7),16)/255):muted;
      for(let i=1;i<ring.length;i++){const a=xy(ring[i-1]),b=xy(ring[i]);page.drawLine({start:{x:a[0],y:a[1]},end:{x:b[0],y:b[1]},thickness:1,color:c});}
    }
    for(const l of m.layers.filter(l=>l.kind==='property'||l.id==='stations'))for(const p of l.points){const [x,py]=xy(p);page.drawCircle({x,y:py,size:l.kind==='property'?5:3,color:l.kind==='property'?rgb(.8,.2,.25):rgb(.15,.45,.7)});}
    if(operators)for(const o of report.operators?.items??[]){if(!o.point)continue;const [x,py]=xy([o.point.longitude,o.point.latitude]);if(x>=42&&x<=550&&py>=bottom&&py<=bottom+210)page.drawCircle({x,y:py,size:2,color:rgb(.54,.33,.79)});}
    y=bottom-18;paragraph('Stored modelled contour boundaries. Red: property building point; blue: station register points. No street basemap or confirmed entrances.',8,muted);
    paragraph(m.layers.filter(l=>l.kind==='catchment').map(l=>`${l.label} (${l.colour})`).join('; ')+(operators?'. Purple: FSA register coordinates, precision unknown; not verified current competitors.':''),8,muted);
    report.spatialNotices.forEach(t=>paragraph(t,8,muted));
  };
  for(const [i,k] of keys.entries()){
    if(i)fresh();paragraph('SITEFIT',20,green);paragraph(report.address,14);paragraph(`${report.businessLabel} · ${report.editionLabel} · Generated ${displayDate(report.generatedAt)}`,9,muted);
    paragraph(report.structuredPreview?'Structured rental evidence export · Preview only':key?'Section PDF · Full Report V1':'Full Report V1 · saved report',9,muted);
    if(k==='overview'||k==='access'||k==='competition'&&!report.competition)map(k==='competition');
    if(k==='competition'&&report.competition?.score!==null&&report.competition?.score!==undefined){
      const r=report.competition;if(y<230)fresh();paragraph('Competition Headroom Score',16,ink);paragraph(`${r.score}/100 — ${r.rating}`,24,ink);
      const barY=y-8;for(let i=0;i<100;i++)page.drawRectangle({x:42+i*5.08,y:barY,width:5.1,height:13,color:rgb(.87-(i/100)*.18,.88+(i/100)*.07,.87-(i/100)*.61)});
      for(const edge of [40,60,80])page.drawRectangle({x:42+edge*5.08-1,y:barY,width:2,height:13,color:rgb(1,1,1)});
      page.drawCircle({x:42+r.score!*5.08,y:barY+6.5,size:8,color:ink,borderColor:rgb(1,1,1),borderWidth:3});y=barY-24;
      for(const [label,position] of [['Limited',.2],['Moderate',.5],['Supportive',.7],['Strong',.9]] as const)page.drawText(label,{x:42+508*position-font.widthOfTextAtSize(label,9)/2,y,size:9,font,color:muted});y-=27;
    }
    if(k==='customer-context'&&report.residentialCatchment){
      const r=report.residentialCatchment;if(y<270)fresh();
      paragraph('Residential Catchment Strength',16,ink);paragraph(`${r.score}/100 — ${r.rating}`,24,ink);
      const barY=y-8;for(let i=0;i<100;i++)page.drawRectangle({x:42+i*5.08,y:barY,width:5.1,height:13,color:rgb(.87-(i/100)*.18,.88+(i/100)*.07,.87-(i/100)*.61)});
      page.drawCircle({x:42+r.score*5.08,y:barY+6.5,size:8,color:ink,borderColor:rgb(1,1,1),borderWidth:3});y=barY-24;
      for(const [label,position] of [['Limited',.2],['Moderate',.5],['Supportive',.7],['Strong',.9]] as const){page.drawText(label,{x:42+508*position-font.widthOfTextAtSize(label,9)/2,y,size:9,font,color:muted});}y-=27;
      r.populations.forEach((n,i)=>{paragraph(`${[5,10,15][i]} min walking catchment: ${Math.round(n).toLocaleString('en-GB')} estimated residents`,11,ink);});
    }

    for(const r of exportParagraphs(report,k)){if(k==='competition'&&report.competition?.score!==null&&report.competition?.score!==undefined&&(r.text==='Competition Headroom Score'||r.text===`${report.competition.score}/100 — ${report.competition.rating}`))continue;if(r.heading&&y<110)fresh();paragraph(r.text,r.heading?13:10,r.heading?green:ink);}
  }
  const pages=pdf.getPages();pages.forEach((p,i)=>{p.drawLine({start:{x:42,y:46},end:{x:550,y:46},thickness:.5,color:rgb(.8,.85,.83)});p.drawText(`SiteFit · ${report.digest.slice(0,16)} · Page ${i+1} / ${pages.length}`,{x:42,y:29,size:8,font,color:muted});});
  if(pages.length>150)throw Error('pdf_bounds');return pdf.save();
}
