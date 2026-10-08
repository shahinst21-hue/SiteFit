import "server-only";
import type { DataAdapter, StoredSnapshot } from "../contracts.ts";
import { definitions } from "../registry.ts";
import { coverage } from "../coverage.ts";
import { initialResult } from "../result.ts";
import { SourceError, safeError } from "../errors.ts";
import { object, validateContext, validateResult } from "../validation.ts";
import { normaliseNonDomesticCertificate } from "../non-domestic-epc.ts";
import { validateEpcResult } from "../epc-result.ts";
import { packetDigest } from "../../analysis/canonical.ts";

/** Conditional official fallback. One bounded discovery plus at most one
 * certificate, no retries, address retention, candidate persistence or latest/unit claim. */
export function epcAdapter(parent: StoredSnapshot | undefined, options: {key?: string; fetcher?: typeof fetch} = {}): DataAdapter {
 const source=definitions["govuk-non-domestic-epc"];
 return {source,supports:c=>coverage(source.id,c),async retrieve(request,execution) {
  const c=validateContext(request.context), r=initialResult(source,request,execution), start=performance.now();
  try {
   const eligible=coverage(source.id,c);if(!eligible.eligible){r.outcome=eligible.outcome;r.error={code:eligible.code,retryable:false,status:null};return validateResult(r);}
   const facts=parent?.result.payload;
   if (!parent || parent.analysisId!==c.analysisId || parent.inputId!==c.inputId || parent.collectionKey!==request.collectionKey ||
     parent.result.meta.source!=="propertydata-premises" || !parent.result.meta.checksum || facts?.kind!=="property_fact" || facts.operation!=="uprn") throw new SourceError("dataset_missing");
   validateResult(parent.result);
   if(facts.binding.uprn!==c.enrichment!.identity.uprn || facts.binding.osReleaseId!==c.enrichment!.releases.osReleaseId ||
     packetDigest(facts.binding.point)!==packetDigest(c.enrichment!.identity.point))throw new SourceError("invalid_request");
   if (facts.facts.epc.state!=="unavailable" && facts.facts.floorArea.state!=="unavailable") {r.outcome="not_applicable";return validateResult(r);}
   const key=options.key??process.env.EPC_API_TOKEN;
   if(!key||key.length>4096||/\s/.test(key))throw new SourceError("configuration_missing");
   let bytes=0;
   async function get(path: string, params: Record<string,string>) {
    const url=new URL(path,"https://api.get-energy-performance-data.communities.gov.uk");
    for(const [k,v] of Object.entries(params))url.searchParams.set(k,v);
    r.meta.execution.attempts++;r.meta.execution.pages++;
    const response=await (options.fetcher??fetch)(url,{headers:{Authorization:`Bearer ${key}`,Accept:"application/json"},redirect:"error",cache:"no-store",signal:execution.signal});
    r.meta.execution.httpStatus=response.status;
    if(response.status===404){await response.body?.cancel();return null;}
    if(!response.ok){await response.body?.cancel();throw new SourceError(response.status===401?"authentication_failed":response.status===429?"rate_limited":"provider_unavailable",response.status);}
    if(response.redirected||!response.body||!/^application\/json(?:;|$)/i.test(response.headers.get("content-type")??"")){await response.body?.cancel();throw new SourceError("invalid_response");}
    const reader=response.body.getReader(), chunks:Uint8Array[]=[];
    try {for(;;){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>source.maxBytes)throw new SourceError("invalid_response");chunks.push(part.value);}}
    finally {await reader.cancel();}
    const body=new TextDecoder("utf-8",{fatal:true}).decode(Buffer.concat(chunks));if(body.includes(key!))throw new SourceError("invalid_response");
    try{return object(JSON.parse(body));}catch{throw new SourceError("invalid_response");}
   }
   const identity=c.enrichment!.identity, uprn=identity.uprn!, retrievedAt=execution.now().toISOString();
   const search=await get("/api/non-domestic/search",{uprn:uprn.padStart(12,"0"),page_size:"3",current_page:"1"});
   let count=0,complete=true,number:string|null=null;
   if(search){
    const pagination=object(search.pagination);if(!Array.isArray(search.data)||search.data.length>3||!Number.isSafeInteger(pagination.totalRecords)||Number(pagination.totalRecords)<search.data.length)throw new SourceError("invalid_response");
    count=Number(pagination.totalRecords);complete=count===search.data.length;
    for(const record of search.data){const row=object(record);if(String(row.uprn).replace(/^0+/,"")!==uprn||row.schemaType!=="CEPC-8.0.0"||typeof row.certificateNumber!=="string"||!/^\d{4}(?:-\d{4}){4}$/.test(row.certificateNumber))throw new SourceError("invalid_response");}
    if(complete&&count===1)number=object(search.data[0]).certificateNumber as string;
   }
   const certificate=number?await get("/api/certificate",{certificate_number:number}):null;
   if(number&&!certificate)throw new SourceError("invalid_response");
   r.payload=validateEpcResult({schemaVersion:1,kind:"non_domestic_certificate",binding:{uprn,point:identity.point!,osReleaseId:c.enrichment!.releases.osReleaseId},
    parent:{snapshotId:parent.id,checksum:parent.result.meta.checksum},discovery:{retrievedAt,count,complete,selection:!complete?"incomplete":count===0?"none":count===1?"single_certificate":"ambiguous"},
    certificate:certificate?normaliseNonDomesticCertificate(certificate,{certificateNumber:number!,expectedUprn:uprn,retrievedAt}):null});
   r.outcome="partial";r.meta.sourceRetrievedAt=retrievedAt;r.meta.quality.truncated=!complete;
   r.meta.quality.missing=["verified_trading_unit_match","current_certificate_confirmation"];
   r.limitations=["UPRN-matched historical non-domestic certificate evidence does not establish selected trading-unit extent, latest certification or lease NIA; ambiguous/incomplete discovery is not substituted."];
   r.observations=[{id:uprn,recordId:uprn,path:"discovery",reference:r.payload.certificate?.sourceReference??"https://get-energy-performance-data.communities.gov.uk/",observedAt:null,
    units:"qualified_non_domestic_certificate_context",geography:null,sourceClass:"official_public_data",kind:"direct_register",limitations:[...r.limitations]}];
  }catch(error){r.outcome="unavailable";r.payload=null;r.observations=[];r.error=safeError(error);}
  r.meta.execution.durationMs=Math.round(performance.now()-start);r.meta.quality.limitations=[...r.limitations];return validateResult(r);
 }};
}
