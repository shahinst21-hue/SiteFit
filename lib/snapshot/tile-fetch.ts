import 'server-only';
// Bounded in-memory coalescing prevents duplicate tile fetches in one instance.
// No automatic retry or persistent location/credential URL is stored.
const cache=new Map<string,{until:number;promise:Promise<ArrayBuffer|null>}>();
export async function geoapifyTile(key:string,z:number,x:number,y:number,fetcher:typeof fetch=fetch){
 const id=`${z}/${x}/${y}`,now=Date.now(),old=cache.get(id);
 if(old&&old.until>now)return old.promise;
 if(cache.size>=256)cache.delete(cache.keys().next().value!);
 const promise=(async()=>{try{
  const url=new URL(`https://maps.geoapify.com/v1/tile/osm-bright-grey/${id}.png`);url.searchParams.set('apiKey',key);
  const response=await fetcher(url,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!response.ok||!response.headers.get('content-type')?.startsWith('image/png'))return null;
  const reader=response.body?.getReader();if(!reader)return null;
  const chunks:Uint8Array[]=[];let size=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>524288)return null;chunks.push(value);}}finally{await reader.cancel();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return bytes.buffer;
 }catch{return null;}})();
 cache.set(id,{until:now+3600000,promise});
 // A transient failure must not blank every reopening for an hour. Coalesce
 // failed reads briefly; only a new explicit display request can try again.
 void promise.then(bytes=>{const row=cache.get(id);if(!bytes&&row?.promise===promise)row.until=Date.now()+10000;});
 return promise;
}
