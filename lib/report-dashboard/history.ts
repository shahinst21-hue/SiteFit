import 'server-only';
import { frameworkClient } from '../data/server-client.ts';
import { validateStoredEdition } from '../report-intelligence/repository.ts';
import { intelligenceId } from '../report-intelligence/http.ts';
/** Read existing editions only; the existing RPC enforces current permanent paid ownership. */
export async function findReadyDashboard(owner:string,free:string):Promise<string|null>{
  if(!intelligenceId(owner)||!intelligenceId(free))return null;
  try{const rpc=frameworkClient() as unknown as {rpc(name:string,args:Record<string,string>):PromiseLike<{data:unknown;error:unknown}>};
    const result=await rpc.rpc('find_sitefit_full',{p_owner:owner,p_free:free});
    if(result.error||!result.data)return null;const edition=validateStoredEdition(result.data);
    return edition.status==='ready'?edition.id:null;
  }catch{return null;}
}
