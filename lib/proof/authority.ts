/** Owner approved one real free Snapshot on 17 October. No sale or Full execution approval. */
export const snapshotProofAuthority=Object.freeze({approved:true});
export function controlledSnapshotConfigured(env:Readonly<Record<string,string|undefined>>,hostname:string){
 return snapshotProofAuthority.approved&&env.VERCEL_ENV==='production'&&hostname==='sitefit.co.uk'&&env.SITE_URL==='https://sitefit.co.uk'&&
  env.SITEFIT_CONTROLLED_PROOF_ENABLED==='1'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(env.SITEFIT_CONTROLLED_PROOF_ID??'');
}
