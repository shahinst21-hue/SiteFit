import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import {PDFDocument,rgb,type RGB} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type {DecisionReport,Finding} from './types.ts';
import {pounds,dateLabel,walkLabel,mapProject,sourceNumbers,sourceQualification,mapMarkers} from './display.ts';

export const decisionPdfVersion='decision-pdf-2026-11-01';
/** Print composition of the same DecisionReport used by React. Never retrieves evidence. */
export async function renderDecisionPDF(r:DecisionReport){
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
  function paragraph(text:string,size=9.8,colour:RGB=ink,after=7){const rows=lines(text,size);for(const row of rows){ensure(size*1.35);page.drawText(row,{x:44,y,size,font,color:colour});y-=size*1.35;}y-=after;}
  function heading(text:string,size=21){ensure(75);paragraph(text,size,ink,10);}
  function start(title:string,number:string){if(y>500){y-=16;page.drawLine({start:{x:44,y},end:{x:551,y},thickness:.6,color:line});y-=24;}else next();paragraph(number+' / '+title.toUpperCase(),8,muted,16);}
  const citations=(ids:string[])=>sourceNumbers(r,ids).map(n=>`[${n}]`).join(' ');
  function finding(f:Finding){ensure(100);heading(f.title,14);paragraph(f.finding+' '+citations(f.refs));paragraph(f.implication);paragraph('Decision: '+f.action,9.8,ink,5);paragraph(f.confidence,8.3,muted,10);}
  function bullets(items:string[]){for(const t of items)paragraph('• '+t,10.2,ink,6);}
  function table(headers:string[],rows:string[][],widths:number[]){
    const head=()=>{ensure(40);page.drawRectangle({x:44,y:y-25,width:507,height:29,color:ink});let x=50;for(const [i,h] of headers.entries()){page.drawText(h,{x,y:y-14,size:8,font,color:rgb(1,1,1)});x+=widths[i];}y-=36;};head();
    for(const row of rows){const wrapped=row.map((t,i)=>lines(t,9,widths[i]-12)),height=Math.max(...wrapped.map(a=>a.length))*13+18;if(height>630)throw Error('pdf_table_row_too_tall');if(y-height<66){next();head();}let x=50;for(const [i,ls] of wrapped.entries()){for(const [j,t] of ls.entries())page.drawText(t,{x,y:y-11-j*13,size:9,font,color:ink});x+=widths[i];}y-=height;page.drawLine({start:{x:44,y:y+5},end:{x:551,y:y+5},thickness:.5,color:line});}y-=15;
  }
  paragraph('DECISION EDITION · '+dateLabel(r.date),9,muted,18);heading(r.address,24);paragraph(`Proposed ${r.businessLabel.toLowerCase()}`,12,muted,22);
  page.drawRectangle({x:44,y:y-8,width:507,height:3,color:green});y-=33;
  heading(r.verdict,25);paragraph(r.recommendation,12,ink,20);
  const base=r.scenarios.find(s=>s.id==='base');
  if(base){heading(`${base.daily} transactions per open day`,21);paragraph('Working-case operating break-even, including owner allowance. Conditional assumptions; not predicted sales.',9,muted,18);}
  heading('What supports the case',13);bullets(r.advantages);y-=8;heading('What could stop the deal',13);bullets(r.concerns);
  paragraph('Proposed new business only. Vacancy or availability for lease is not established.',8.3,muted,10);
  heading('The discovery that changes the next step',13);paragraph(r.discovery.finding+' '+citations(r.discovery.refs),9.8);paragraph(r.discovery.action,9.8);
  start('Customer opportunity','02');heading('Reach is a starting point. Visits are the test.');
  if(r.populations.length){paragraph('Estimated residents within each walking area',12);paragraph('People · cumulative contours, not additional customers',8.3,muted);const max=Math.max(...r.populations.map(p=>p.value));for(const p of r.populations){ensure(32);page.drawText(`${p.minutes} min`,{x:44,y:y-7,size:10,font,color:ink});page.drawRectangle({x:105,y:y-10,width:p.value/max*340,height:14,color:green});page.drawText('~'+(Math.round(p.value/100)*100).toLocaleString('en-GB'),{x:464,y:y-7,size:10,font,color:ink});y-=33;}paragraph('ONS Census 2021 allocated to saved Geoapify walking areas. '+citations(r.populations.flatMap(p=>p.refs)),8.3,muted,18);}
  r.profiles.forEach(p=>paragraph(`${Math.round(p.share*100)}% ${p.label.toLowerCase()} · ${p.scope}. ${citations(p.refs)}`,9,muted));r.sections.find(s=>s.id==='customers')!.findings.forEach(finding);
  start('Competition & positioning','03');heading('Compare the occasion, not just the count.');r.sections.find(s=>s.id==='competition')!.findings.forEach(finding);
  if(r.competitors.length){ensure(220);heading('Relevant alternatives',15);paragraph('Distinct premises; China Garden excluded. Walking routes end at source points; entrance positions are not verified.',8.3,muted);table(['Business / role','Walk','Offer & implication'],r.competitors.map((c,i)=>[`${i+1}. ${c.name}\n${c.address} · ${c.relationship}`,`${walkLabel(c.seconds)} / ${c.metres??'—'} m`,`${c.offer} ${c.implication} ${citations(c.refs)}`]),[160,74,273]);
    paragraph('FSA entries are dated register leads, not proof of trading today; inspection dates appear in Sources. Costa and Wenzel’s also have official branch listings checked on 1 November 2026. Current shop hours and customer ratings/review volumes are not verified for reuse.',9,muted);
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
  start('Rent & operating economics','06');heading(base?`${base.daily} transactions a day in the working case.`:'Cost the operating plan.');
  if(base){paragraph('Conditional operating requirements, not predicted custom. No actual selected-property rent, costed rota or customer basket has been supplied. These cases have no assigned probabilities.',11);
    paragraph('Method and assumption basis: '+citations(['cvp','vat','payroll','rates','margin']),8.3,muted,8);
    table(['Illustrative input', 'Higher cost','Working case','Lower cost'],[
      ['Annual rent',...r.scenarios.map(s=>pounds(Number(s.input.operands.rent.value)))],
      ['Annual staff incl. employer costs',...r.scenarios.map(s=>pounds(Number(s.input.operands.staff.value)))],
      ['Annual other fixed costs',...r.scenarios.map(s=>pounds(Number(s.input.operands.otherFixed.value)))],
      ['Annual owner allowance',...r.scenarios.map(s=>pounds(Number(s.input.operands.ownerAllowance.value)))],
      ['Basket incl. VAT',...r.scenarios.map(s=>'£'+Number(s.input.operands.grossSpend.value).toFixed(2))],
      ['Stock gross margin / net sales',...r.scenarios.map(s=>Number(s.input.operands.grossMarginBps.value)/100+'%')],
      ['Open days / year',...r.scenarios.map(s=>s.input.operands.annualOpenDays.value!)],
      ['Transactions / open day',...r.scenarios.map(s=>String(s.daily))],
      ['Excluding owner allowance',...r.scenarios.map(s=>String(s.withoutOwnerDaily))],
      ['Break-even gross receipts / year',...r.scenarios.map(s=>pounds(s.annualGross))],
    ],[183,108,108,108]);
    paragraph('Higher cost / lower basket; working case; lower cost / stronger basket. These are combined stress cases, not best/worst statistical bounds.',8.3,muted,14);
    heading('A staffed business, with the owner paid',14);paragraph('Working case other fixed costs: rates £4,000; service charge £2,000; utilities £8,000; other operating overhead £9,000. The other cases use £28,000 and £18,000 totals. These are allowances, not observed bills; rate relief is not assumed. Staff budgets include employer costs and paid-cover provision. Owner allowance is additional.');
    paragraph('All cases: VAT registered; full basket standard-rated at 20%; net recoverable costs; card fee 1.5% of receipts. Stock, packaging and waste are inside gross margin; no delivery commission is assumed. Actual menu mix, VAT recovery and staffing steps can change the result. Fit-out, deposits, finance, tax, depreciation and working capital are excluded. Initial investment was not supplied. Operating break-even does not repay the investment.',9,muted);
    start('What changes the break-even requirement?','06 / CONTINUED');heading('Basket value matters as much as the headline rent.');
    paragraph('Transactions per open day · one variable changes from the working case. All other assumptions stay fixed. Bars start at zero.',9,muted,20);
    const max=Math.max(...r.sensitivity.map(s=>s.daily??0));for(const s of r.sensitivity){ensure(40);paragraph(s.label,9,ink,2);page.drawRectangle({x:44,y:y-7,width:(s.daily??0)/max*440,height:10,color:ink});page.drawText(String(s.daily??'Unavailable'),{x:507,y:y-6,size:10,font,color:ink});y-=25;}
    paragraph(`A £3.50 drinks-only basket requires ${r.sensitivity.find(s=>s.label==='Drinks-only basket £3.50')?.daily} transactions daily, versus ${base.daily} with the £6 working basket at the same stock margin. Validate food attachment and the rota; no evidence measures the passing flow or conversion needed.`,11,ink,20);
  }else paragraph('Coffee assumptions are not applied to this business. A category-appropriate costed operating plan is required.');
  r.sections.find(s=>s.id==='economics')!.findings.forEach(finding);
  start('Before you sign','07');heading('Conditions that change the decision.');for(const [i,a] of r.actions.entries()){heading(`${i+1}. ${a.action}`,13);paragraph(a.condition+' '+citations(a.refs));y-=8;}
  heading('Ask the landlord or agent for',14);paragraph('Written lawful-use evidence and planning conditions; measured plan and services; actual annual rent, VAT, service-charge history and current rates bill; repair obligations, break terms and fit-out consent. Keep suitable conditions or an exit if permission or the costed layout fails.');
  start('Sources & evidence','08');heading('What the conclusion rests on.');paragraph('Original saved observations and this dated research edition remain separate. Reopening performs no fresh source retrieval. Detailed original evidence remains available through the owned original report.');bullets(r.limitations);
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
