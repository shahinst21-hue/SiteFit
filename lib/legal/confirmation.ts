import "server-only";
import fs from "node:fs/promises";
import fontkit from "@pdf-lib/fontkit";
import {PDFDocument} from "pdf-lib";
/** Preparation is not proof of legal delivery. Only immutable approved full text can be exported. */
export async function confirmationPDF(value:unknown){
 if(!value||typeof value!=="object")throw Error("confirmation_unavailable");
 const v=value as Record<string,unknown>,p=v.policy as Record<string,unknown>;
 if(typeof v.version!=="string"||typeof v.acceptedAt!=="string"||!Number.isFinite(Date.parse(v.acceptedAt))||!v.consent||typeof v.consent!=="object"||Array.isArray(v.consent)||!p||![p.termsText,p.privacyText,p.retentionText].every(x=>typeof x==="string"&&x.length>20&&x.length<=20000))throw Error("confirmation_unavailable");
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
 const font=await pdf.embedFont(await fs.readFile("public/fonts/DejaVuSans.ttf"),{subset:true});
 let page=pdf.addPage(),y=780;
 const consent=v.consent as Record<string,unknown>;
 const text=["SiteFit contract confirmation",`Policy version: ${v.version}`,`Recorded: ${v.acceptedAt}`,
 `Purchase purpose declared: ${String(consent.buyerKind ?? "not recorded")}`,
 `Terms accepted: ${consent.termsAccepted===true?"Yes":"Not recorded"}`,
 `Immediate supply requested: ${consent.immediateRequested===true?"Yes":"Not recorded"}`,
 `Applicable acknowledgement recorded: ${consent.acknowledgement===true?"Yes":"Not recorded"}`,
 String(p.termsText),String(p.privacyText),String(p.retentionText)].join("\n");
 const words=(line:string)=>line.split(/\s+/).flatMap(word=>{
  const chunks:string[]=[];let chunk="";
  for(const char of word){if(chunk&&font.widthOfTextAtSize(chunk+char,10)>480){chunks.push(chunk);chunk=char;}else chunk+=char;}
  if(chunk)chunks.push(chunk);return chunks;
 });
 for(const line of text.split("\n")){
 let row="";for(const word of words(line)){if(font.widthOfTextAtSize(row+" "+word,10)>480&&row){if(y<50){page=pdf.addPage();y=780;}page.drawText(row,{x:50,y,size:10,font});y-=14;row=word;}else row+=(row?" ":"")+word;}
 if(y<50){page=pdf.addPage();y=780;}page.drawText(row,{x:50,y,size:10,font});y-=16;
 }
 return pdf.save();
}
