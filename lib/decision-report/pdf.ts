import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import {PDFDocument,rgb,type RGB} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type {DecisionReport,Finding} from './types.ts';
import {pounds,dateLabel,mapProject,sourceNumbers,sourceQualification,mapMarkers,tradeLabel,proximityLabel,distanceLabel,competitorRole,economicRows,operatingNotes} from './display.ts';

export const decisionPdfVersion='decision-pdf-2026-11-01.5';
/** Print composition of the same DecisionReport used by React. Never retrieves evidence. */
export async function renderDecisionPDF(r:DecisionReport){
  const unit=tradeLabel(r);
  const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
  const font=await pdf.embedFont(await fs.readFile(path.join(process.cwd(),'public/fonts/DejaVuSans.ttf')),{subset:true});
  const logo=await pdf.embedPng(await fs.readFile(path.join(process.cwd(),'public/brand/sitefit-wordmark-email.png')));
  const ink=rgb(13/255,20/255,0),muted=rgb(96/255,100/255,108/255),green=rgb(178/255,243/255,76/255),line=rgb(224/255,225/255,230/255);
  const date=new Date(r.date);pdf.setCreationDate(date);pdf.setModificationDate(date);pdf.setTitle(`SiteFit | ${r.address} | Decision report`);pdf.setAuthor('SiteFit');pdf.setSubject(r.digest);
  let page=pdf.addPage([595.28,841.89]),y=740;
  const charset=new Set(font.getCharacterSet());
  function clean(t:string){if(Array.from(t).some(c=>!charset.has(c.codePointAt(0)!)))throw Error('pdf_character_unavailable');return t;}
  function lines(text:string,size:number,width=507){
    const out:string[]=[];let row='';
    for(const word of clean(text.replace(/[\r\n]+/g,' ')).split(/\s+/)){
      if(font.widthOfTextAtSize((row?row+' ':'')+word,size)<=width){row+=(row?' ':'')+word;continue;}
      if(row)out.push(row);row='';
      for(const c of word){if(font.widthOfTextAtSize(row+c,size)>width){out.push(row);row='';}row+=c;}
    }if(row)out.push(row);return out;
  }
  function header(){page.drawImage(logo,{x:44,y:790,width:94,height:94*logo.height/logo.width});page.drawText('COMMERCIAL PROPERTY INTELLIGENCE',{x:298,y:798,size:8,font,color:muted});page.drawLine({start:{x:44,y:776},end:{x:551,y:776},thickness:1,color:ink});page.drawText('FULL REPORT · DECISION EDITION',{x:44,y:758,size:8,font,color:muted});y=733;}
  header();
  function next(){page=pdf.addPage([595.28,841.89]);header();}
  function ensure(height:number){if(y-height<66)next();}
  function paragraph(text:string,size=9.8,colour:RGB=ink,after=7){const rows=lines(text,size),height=size*1.35;ensure(Math.min(2,rows.length)*height);for(const [i,row] of rows.entries()){ensure((rows.length-i<=2?rows.length-i:1)*height);page.drawText(row,{x:44,y,size,font,color:colour});y-=height;}y-=after;}
  function heading(text:string,size=21){ensure(75);paragraph(text,size,ink,10);}
  function start(title:string,number:string){if(y>500){y-=16;page.drawLine({start:{x:44,y},end:{x:551,y},thickness:.6,color:line});y-=24;}else next();paragraph(number+' / '+title.toUpperCase(),8,muted,16);}
  const citations=(ids:string[])=>sourceNumbers(r,ids).map(n=>`[${n}]`).join(' ');
  function finding(f:Finding,index=0){const automatic=r.researchDigest===null;ensure(automatic&&index>0?60:100);if(!automatic||index===0)heading(f.title,14);paragraph(f.finding+' '+citations(f.refs));if(!automatic&&f.implication)paragraph(f.implication);if(!automatic||index===0){paragraph('Decision: '+f.action,9.8,ink,5);paragraph(f.confidence,8.3,muted,10);}}
  function bullets(items:string[]){for(const t of items)paragraph('• '+t,10.2,ink,6);}
  function table(headers:string[],rows:string[][],widths:number[]){
    const head=()=>{const wrapped=headers.map((h,i)=>lines(h,8,widths[i]-12)),height=Math.max(...wrapped.map(h=>h.length))*11+18;ensure(height+20);page.drawRectangle({x:44,y:y-height+4,width:507,height,color:ink});let x=50;for(const [i,rows] of wrapped.entries()){for(const [j,h] of rows.entries())page.drawText(h,{x,y:y-12-j*11,size:8,font,color:rgb(1,1,1)});x+=widths[i];}y-=height+7;};head();
    for(const row of rows){const wrapped=row.map((t,i)=>lines(t,9,widths[i]-12)),height=Math.max(...wrapped.map(a=>a.length))*13+18;if(height>630)throw Error('pdf_table_row_too_tall');if(y-height<66){next();head();}let x=50;for(const [i,ls] of wrapped.entries()){for(const [j,t] of ls.entries())page.drawText(t,{x,y:y-11-j*13,size:9,font,color:ink});x+=widths[i];}y-=height;page.drawLine({start:{x:44,y:y+5},end:{x:551,y:y+5},thickness:.5,color:line});}y-=15;
  }
  paragraph('DECISION EDITION · '+dateLabel(r.date),9,muted,18);heading(r.address,24);paragraph(`Proposed ${r.businessLabel.toLowerCase()}`,12,muted,22);
  page.drawRectangle({x:44,y:y-8,width:507,height:3,color:green});y-=33;
  heading(r.verdict,25);paragraph(r.recommendation,12,ink,20);
  const base=r.scenarios.find(s=>s.id==='base');
  if(base&&base.daily!==null){heading(`${base.daily} ${unit} per open day`,21);paragraph('Working-case operating break-even, including owner allowance. Conditional assumptions; not predicted sales.',9,muted,18);}
  heading('What supports the case',13);bullets(r.advantages);y-=8;heading('What could stop the deal',13);bullets(r.concerns);
  paragraph('Proposed new business only. Vacancy or availability for lease is not established.',8.3,muted,10);
  r.sections.find(s=>s.id==='overview')!.findings.forEach(finding);
  heading('The discovery that changes the next step',13);paragraph(r.discovery.finding+' '+citations(r.discovery.refs),9.8);paragraph(r.discovery.action,9.8);
  start('Customer opportunity','02');heading('Reach is a starting point. Visits are the test.');
  if(r.populations.length){paragraph('Estimated residents within each walking area',12);paragraph('People · cumulative contours, not additional customers',8.3,muted);const max=Math.max(1,...r.populations.map(p=>p.value));for(const p of r.populations){ensure(32);page.drawText(`${p.minutes} min`,{x:44,y:y-7,size:10,font,color:ink});page.drawRectangle({x:105,y:y-10,width:p.value/max*340,height:14,color:green});page.drawText('~'+(Math.round(p.value/100)*100).toLocaleString('en-GB'),{x:464,y:y-7,size:10,font,color:ink});y-=33;}paragraph('ONS Census 2021 allocated to saved Geoapify walking areas. '+citations(r.populations.flatMap(p=>p.refs)),8.3,muted,18);}
  r.profiles.forEach(p=>paragraph(`${Math.round(p.share*100)}% ${p.label.toLowerCase()} · ${p.scope}. ${citations(p.refs)}`,9,muted));r.sections.find(s=>s.id==='customers')!.findings.forEach(finding);
  start('Competition & positioning','03');heading('Compare the occasion, not just the count.');r.sections.find(s=>s.id==='competition')!.findings.forEach(finding);
  if(r.competitors.length){ensure(220);heading('Relevant alternatives',15);paragraph('Selected property excluded. Network segments run between snapped road points and omit access from the building or business to those points. Very short segments are not total walking distances. Straight-line distances and walking-area membership are labelled separately.',8.3,muted);table(['Business / role','Walk','Offer & implication'],r.competitors.map((c,i)=>[`${i+1}. ${c.name}\n${c.address} · ${competitorRole(c)}`,`${proximityLabel(c)} / ${distanceLabel(c)}`,`${c.offer} ${c.implication} ${citations(c.refs)}`]),[160,74,273]);
    paragraph('FSA entries are dated register leads, not proof of current coffee offers or trading today. Source-specific activity qualifications appear below. Where no source supplies current hours, menu prices or customer reviews, those fields remain unknown.',9,muted);
    for(const c of r.competitors)paragraph(c.name+': '+c.status+' '+citations(c.refs),8.3,muted,5);
    const priced=r.competitors.find(c=>c.relationship==='Bakery alternative');if(priced)paragraph(priced.name+': '+priced.price+' '+citations(priced.refs),9,muted);
  }else paragraph('No reviewed named competitor comparison is attached. See the saved competition findings above.');
  start('Access & commercial geography','04');heading('The streets behind the catchment.');
  if(r.map&&r.mapImage){const m=r.map,image=await pdf.embedPng(Buffer.from(r.mapImage.split(',')[1],'base64')),width=460,height=width*m.height/m.width;ensure(height+95);const bottom=y-height;page.drawImage(image,{x:44,y:bottom,width,height});
    // Clip drawing manually to the map viewport. The basemap is a frozen licensed image, never a network request.
    const project=(p:[number,number])=>{const [x,v]=mapProject(m,p);return [44+x/m.width*width,bottom+height-v/m.height*height];};
    const inside=(p:number[])=>p[0]>=44&&p[0]<=44+width&&p[1]>=bottom&&p[1]<=bottom+height;
    for(const [i,l] of (r.catchments?.layers.filter(l=>l.kind==='catchment').toReversed()??[]).entries())for(const part of l.polygonParts??l.polygons.map(p=>[p]))for(const ring of part)for(let j=1;j<ring.length;j++){const a=project(ring[j-1]),b=project(ring[j]);if(inside(a)&&inside(b))page.drawLine({start:{x:a[0],y:a[1]},end:{x:b[0],y:b[1]},thickness:.8,color:ink,opacity:.55,...(i<2?{dashArray:i===0?[6,3]:[2,2]}:{})});}
    const [px,py]=project(m.center);page.drawCircle({x:px,y:py,size:6,color:green,borderColor:ink,borderWidth:1.5});page.drawText('Selected property',{x:px-60,y:py+12,size:8,font,color:ink});
    mapMarkers(r).forEach(marker=>{const x=44+marker.label[0]/m.width*width,cy=bottom+height-marker.label[1]/m.height*height,ax=44+marker.anchor[0]/m.width*width,ay=bottom+height-marker.anchor[1]/m.height*height;if(inside([x,cy])){if(x!==ax||cy!==ay){page.drawLine({start:{x:ax,y:ay},end:{x,y:cy},thickness:.7,color:ink});page.drawCircle({x:ax,y:ay,size:1.5,color:ink});}page.drawCircle({x,y:cy,size:6.2,color:ink,borderColor:rgb(1,1,1),borderWidth:1});page.drawText(String(marker.number),{x:x-2.5,y:cy-2.8,size:7,font,color:rgb(1,1,1)});}});y=bottom-17;
    paragraph('Green point: selected building. Numbered labels link to business source points and the alternatives table. Solid / short dash / long dash: saved 5 / 10 / 15-minute walking boundaries; some extend beyond the frame.',8.3,muted,4);paragraph(m.attribution+' · '+dateLabel(m.observedAt),7.6,muted,18);
  }else paragraph('A frozen street-context map is not attached; no schematic is substituted.',9,muted);
  r.sections.find(s=>s.id==='access')!.findings.forEach(finding);
  start('Property suitability','05');heading('Resolve permission before choosing the format.');r.sections.find(s=>s.id==='premises')!.findings.forEach(finding);
  start('Rent & operating economics','06');heading(base&&base.daily!==null?`${base.daily} ${unit} a day in the baseline plan.`:'Cost the operating plan.');
  if(base){paragraph('Conditional operating requirements, not predicted custom. Baseline input origins and cost coverage are recorded below. No scenario has an assigned probability.',11);
    table(['Operating input',...r.scenarios.map(s=>s.label)],[...economicRows(r).map(row=>[row.label,...row.values]),[`${unit} / open day`,...r.scenarios.map(s=>String(s.daily??'Unavailable'))],['Excluding owner allowance',...r.scenarios.map(s=>String(s.withoutOwnerDaily??'Unavailable'))],['Annual break-even receipts',...r.scenarios.map(s=>pounds(s.annualGross))]],[183,108,108,108]);
    heading('Origins and cost coverage',14);operatingNotes(r).forEach(note=>paragraph(note,9,muted));
    start('What changes the break-even requirement?','06 / CONTINUED');heading('Test the operating plan.');
    paragraph(`${unit} per open day · one variable changes from the baseline. Other assumptions stay fixed. Bars start at zero.`,9,muted,20);
    const max=Math.max(1,...r.sensitivity.map(s=>s.daily??0));for(const s of r.sensitivity){ensure(40);paragraph(s.label,9,ink,2);page.drawRectangle({x:44,y:y-7,width:(s.daily??0)/max*440,height:10,color:ink});page.drawText(String(s.daily??'Unavailable'),{x:507,y:y-6,size:10,font,color:ink});y-=25;}
    paragraph('Compare the baseline requirement with observed visits, realistic service capacity and the actual staffed rota. No measured conversion or customer forecast is supplied.',11,ink,20);
  }else paragraph('A category-appropriate costed operating plan is required.');
  r.sections.find(s=>s.id==='economics')!.findings.forEach(finding);
  start('Before you sign','07');heading('Conditions that change the decision.');for(const [i,a] of r.actions.entries()){heading(`${i+1}. ${a.action}`,13);paragraph(a.condition+' '+citations(a.refs));y-=8;}
  heading('Ask the landlord or agent for',14);paragraph('Written lawful-use evidence and planning conditions; measured plan and services; actual annual rent, VAT, service-charge history and current rates bill; repair obligations, break terms and fit-out consent. Keep suitable conditions or an exit if permission or the costed layout fails.');
  start('Sources & evidence','08');heading('What the conclusion rests on.');paragraph('This edition retains its dated evidence and planning assumptions. Reopening performs no fresh source retrieval. Sources and material qualifications are listed below.');bullets(r.limitations);
  // Two-column reference directory. Sources stay whole and all material limitations remain inspectable.
  if(y<400)next();let column=0,columnTop=y;const columnWidth=244;
  for(const [i,source] of r.refs.entries()){
    const entries=[{text:'['+(i+1)+'] '+source.label,size:9.2,color:ink},
      {text:source.period+' · retrieved '+dateLabel(source.observedAt),size:7.5,color:muted},
      {text:source.scope,size:7.5,color:muted},{text:sourceQualification(source),size:7.8,color:muted},
      ...(source.url?[{text:source.url,size:7,color:muted}]:[]),...source.notices.map(text=>({text,size:7,color:muted}))];
    const blocks=entries.map(e=>({...e,rows:lines(e.text,e.size,columnWidth)})),height=blocks.reduce((n,b)=>n+b.rows.length*b.size*1.35+4,0)+14;
    if(y-height<66){if(column===0){column=1;y=columnTop;}else{next();column=0;columnTop=y;}}
    const x=44+column*263;
    for(const b of blocks){for(const row of b.rows){page.drawText(row,{x,y,size:b.size,font,color:b.color});y-=b.size*1.35;}y-=4;}y-=14;
  }
  const pages=pdf.getPages();pages.forEach((p,i)=>{p.drawLine({start:{x:44,y:48},end:{x:551,y:48},thickness:.6,color:line});p.drawText(`SITEFIT · DECISION EDITION · ${dateLabel(r.date)}`,{x:44,y:31,size:7.5,font,color:muted});const label=`${i+1} / ${pages.length}`;p.drawText(label,{x:551-font.widthOfTextAtSize(label,8),y:31,size:8,font,color:muted});});
  return pdf.save({useObjectStreams:true});
}
