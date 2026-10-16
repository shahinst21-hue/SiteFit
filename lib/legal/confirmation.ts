import "server-only";
import fs from "node:fs/promises";
import fontkit from "@pdf-lib/fontkit";
import {PDFDocument,rgb} from "pdf-lib";
/** Preparation is not proof of legal delivery. Only immutable approved full text can be exported. */
export async function confirmationPDF(value:unknown,{rehearsal=false}:{rehearsal?:boolean}={}){
 if(!value||typeof value!=="object")throw Error("confirmation_unavailable");
 const v=value as Record<string,unknown>,p=v.policy as Record<string,unknown>;
 if(typeof v.version!=="string"||typeof v.acceptedAt!=="string"||!Number.isFinite(Date.parse(v.acceptedAt))||!v.consent||typeof v.consent!=="object"||Array.isArray(v.consent)||!p||![p.termsText,p.privacyText,p.retentionText].every(x=>typeof x==="string"&&x.length>20&&x.length<=20000))throw Error("confirmation_unavailable");
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
 const font=await pdf.embedFont(await fs.readFile("public/fonts/DejaVuSans.ttf"),{subset:true});
 const ink=rgb(13/255,20/255,0),muted=rgb(96/255,100/255,108/255),lime=rgb(178/255,243/255,76/255),line=rgb(224/255,225/255,230/255);
 const svg=await fs.readFile('public/brand/sitefit-wordmark.svg','utf8');
 const paths=[...svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map(m=>m[1]!);
 if(!paths.length)throw Error('confirmation_brand_unavailable');
 const newPage=()=>{const page=pdf.addPage([595.28,841.89]);page.drawRectangle({x:0,y:835.89,width:595.28,height:6,color:lime});for(const path of paths)page.drawSvgPath(path,{x:36,y:816,scale:150/(4094/2.41392),color:ink});page.drawText('PURCHASE RECORD',{x:416,y:795,size:8,font,color:muted});page.drawLine({start:{x:42,y:776},end:{x:553,y:776},color:line,thickness:0.6});return page;};
 let page=newPage(),y=740;
 const consent=v.consent as Record<string,unknown>;
 pdf.setTitle(rehearsal?'SiteFit — delivery rehearsal, no contract':'SiteFit — contract confirmation');pdf.setAuthor('SiteFit');
 const text=[`Policy version: ${v.version}`,`Recorded: ${v.acceptedAt}`,
 `Purchase purpose declared: ${String(consent.buyerKind ?? "not recorded")}`,
 `Terms accepted: ${consent.termsAccepted===true?"Yes":"Not recorded"}`,
 `Immediate supply requested: ${consent.immediateRequested===true?"Yes":"Not recorded"}`,
 `Applicable acknowledgement recorded: ${consent.acknowledgement===true?"Yes":"Not recorded"}`,
 ].join("\n");
 const words=(line:string)=>line.split(/\s+/).flatMap(word=>{
  const chunks:string[]=[];let chunk="";
  for(const char of word){if(chunk&&font.widthOfTextAtSize(chunk+char,10)>480){chunks.push(chunk);chunk=char;}else chunk+=char;}
  if(chunk)chunks.push(chunk);return chunks;
 });
 const write=(text:string)=>{for(const lineText of text.split('\n')){let row='';for(const word of words(lineText)){if(font.widthOfTextAtSize(row+' '+word,10)>480&&row){if(y<76){page=newPage();y=740;}page.drawText(row,{x:42,y,size:10,font,color:ink});y-=15;row=word;}else row+=(row?' ':'')+word;}if(y<76){page=newPage();y=740;}page.drawText(row,{x:42,y,size:10,font,color:ink});y-=17;}};
 const heading=(title:string)=>{if(y<125){page=newPage();y=740;}page.drawRectangle({x:42,y:y-7,width:3,height:22,color:lime});page.drawText(title,{x:54,y,size:16,font,color:ink});y-=32;};
 page.drawText(rehearsal?'Email delivery rehearsal':'Your contract confirmation',{x:42,y,size:24,font,color:ink});y-=28;
 page.drawText(rehearsal?'TEST ONLY — no purchase, payment or contract.':'Keep this document with your purchase records.',{x:42,y,size:10,font,color:muted});y-=32;
 heading('Recorded choices');write(text);y-=12;
 for(const [title,body] of [['Terms of Sale',p.termsText],['Privacy information',p.privacyText],['Retention information',p.retentionText]] as const){heading(title as string);write(body as string);y-=14;}
 const pages=pdf.getPages();for(const [index,p] of pages.entries()){p.drawLine({start:{x:42,y:55},end:{x:553,y:55},color:line,thickness:0.6});p.drawText('SiteFit  /  info@sitefit.co.uk',{x:42,y:36,size:8,font,color:muted});p.drawText(`${index+1} / ${pages.length}`,{x:519,y:36,size:8,font,color:muted});}
 return pdf.save();
}
