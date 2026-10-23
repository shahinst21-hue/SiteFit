import 'server-only';
import {frameworkClient} from '../data/server-client.ts';

export const documentBucket='sitefit-private-documents';
type Result<T>={data:T|null;error:unknown};
type Bucket={download(path:string):Promise<Result<Blob>>;upload(path:string,bytes:Uint8Array,options:{contentType:string;upsert:false}):Promise<Result<unknown>>};
/** Called only AFTER the existing owned contract/report read. No public URL or signed URL. */
export async function archivedPDF(path:string,render:()=>Promise<Uint8Array>,providedBucket?:Bucket){
 if(!/^(reports|contracts)\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\/[a-f0-9]{64}\/(full-report|overview|customer-context|competition|access|premises|rental-context|actions|appendix|confirmation)\.pdf$/.test(path))throw Error('invalid_document_path');
 const bucket=providedBucket??frameworkClient().storage.from(documentBucket);
 const existing=await bucket.download(path);
 if(existing.data){
  const bytes=new Uint8Array(await existing.data.arrayBuffer());
  if(bytes.length>10485760||new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error('invalid_archived_pdf');
  return bytes;
 }
 // Only an actual missing object allows creation. Network/auth failures are not absence.
 const error=existing.error as {statusCode?:string|number;message?:string}|null;
 if(!error||!(Number(error.statusCode)===404||Number(error.statusCode)===400&&error.message==='Object not found'))throw Error('document_read_unavailable');
 const bytes=await render();
 if(bytes.length>10485760||new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error('invalid_archived_pdf');
 const stored=await bucket.upload(path,bytes,{contentType:'application/pdf',upsert:false});
 if(!stored.error)return bytes;
 // A concurrent writer may win. Read its immutable object, never overwrite it.
 const winner=await bucket.download(path);
 if(!winner.data)throw Error('document_archive_unavailable');
 const saved=new Uint8Array(await winner.data.arrayBuffer());
 if(saved.length>10485760||new TextDecoder().decode(saved.slice(0,5))!=='%PDF-')throw Error('invalid_archived_pdf');
 return saved;
}
