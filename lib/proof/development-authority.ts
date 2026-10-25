/** Expiring Preview acceptance only. Database proof identity, receipts and caps
 * remain authoritative; this does not enable ordinary or Production execution. */
export function developmentProofConfigured(env:Readonly<Record<string,string|undefined>>,hostname?:string,now=Date.now()){
 if(env.VERCEL_ENV!=='preview'||env.SITEFIT_DEVELOPMENT_ACCEPTANCE_ENABLED!=='1'||
  env.SITEFIT_CONTROLLED_PROOF_ENABLED!=='1'||env.SUPABASE_URL!=='https://idlsjusbrmyucccostxt.supabase.co'||
  env.SITEFIT_TEST_PURCHASES_ENABLED!=='true'||!/^sk_test_[A-Za-z0-9]+$/.test(env.STRIPE_SECRET_KEY??'')||
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(env.SITEFIT_CONTROLLED_PROOF_ID??''))return false;
 const expires=Date.parse(env.SITEFIT_DEVELOPMENT_ACCEPTANCE_EXPIRES_AT??'');
 if(!Number.isFinite(expires)||expires<=now||expires-now>24*60*60*1000)return false;
 try{
  const origin=new URL(env.SITEFIT_PURCHASE_ORIGIN??'');
  return origin.protocol==='https:'&&origin.hostname.endsWith('.vercel.app')&&origin.hostname===env.VERCEL_BRANCH_URL&&
   (!hostname||hostname===origin.hostname)&&origin.pathname==='/'&&!origin.port&&!origin.username&&!origin.password&&!origin.search&&!origin.hash;
 }catch{return false;}
}
