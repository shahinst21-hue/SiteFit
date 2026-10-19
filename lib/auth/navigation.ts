import type {createBrowserSupabase} from '../supabase/browser.ts';
type Auth=ReturnType<typeof createBrowserSupabase>['auth'];
/** Display only. Account routes continue to verify identity and ownership server-side. */
export function observeAccountIdentity(auth:Pick<Auth,'getUser'|'onAuthStateChange'>,changed:(signedIn:boolean)=>void){
 let live=true,revision=0;
 const {data:{subscription}}=auth.onAuthStateChange((_event,session)=>{
  revision++;
  if(live)changed(!!session?.user&&!session.user.is_anonymous);
 });
 const requestedAt=revision;
 void auth.getUser().then(({data,error})=>{
  if(live&&revision===requestedAt)changed(!error&&!!data.user&&!data.user.is_anonymous);
 }).catch(()=>{if(live&&revision===requestedAt)changed(false);});
 return ()=>{live=false;subscription.unsubscribe();};
}
