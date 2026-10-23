import {verifiedUser} from '@/lib/supabase/server';
import {readSnapshotContext} from '@/lib/snapshot/read-context';
import {admittedTile} from '@/lib/snapshot/tiles';
import {geoapifyTile} from '@/lib/snapshot/tile-fetch';
import {savedSnapshotReview} from '@/lib/snapshot/review';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string;z:string;x:string;y:string}>}){
 const {id,z,x,y}=await params;
 const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer'};
 const unavailable=()=>new Response(null,{status:404,headers});
 // Separately opt in to display credits; merely deploying code cannot open a provider path.
 if(process.env.SITEFIT_SNAPSHOT_MAP_TILES_ENABLED!=='1')return unavailable();
 if(!/^[0-9a-f-]{36}$/i.test(id)&&id!=='review'||![z,x,y].every(v=>/^\d{1,6}$/.test(v)))return unavailable();
 let context;
 if(id==='review')context=savedSnapshotReview(process.env)?.context;
 else{const {client,user}=await verifiedUser();if(!client||!user)return unavailable();context=await readSnapshotContext(client,id);}
 if(!context||!admittedTile(context.map,+z,+x,+y))return unavailable();
 const key=process.env.GEOAPIFY_API_KEY?.trim();if(!key)return unavailable();
 const bytes=await geoapifyTile(key,+z,+x,+y);
 return bytes?new Response(bytes,{headers:{...headers,'Content-Type':'image/png','X-Content-Type-Options':'nosniff'}}):unavailable();
}
