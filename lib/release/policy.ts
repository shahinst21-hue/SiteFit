/** Implementation approval is not commercial activation or spending authority. */
export const releasePolicy = Object.freeze({
  version: "commercial-release-v1-draft",
  productionApproved: false,
  paidExecutionApproved: false,
  measurementApproved: false,
  sourceCollectionApproved: false,
});
export type ReleaseAuthority = { productionApproved: boolean; paidExecutionApproved: boolean; measurementApproved: boolean; sourceCollectionApproved?: boolean };
export function productionOrigin(env: Readonly<Record<string, string | undefined>>, authority: ReleaseAuthority = releasePolicy): string | null {
  if (!authority.productionApproved || env.VERCEL_ENV !== "production") return null;
  try {
    const origin = new URL(env.SITE_URL ?? "");
    if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash ||
      ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname) || origin.hostname.endsWith(".vercel.app")) return null;
    return origin.origin;
  } catch { return null; }
}
export function productionHost(env: Readonly<Record<string, string | undefined>>, hostname: string, authority: ReleaseAuthority = releasePolicy) {
  const origin = productionOrigin(env, authority);
  return !!origin && new URL(origin).hostname === hostname;
}
export function commercialExecution(env: Readonly<Record<string, string | undefined>>, hostname: string, authority: ReleaseAuthority = releasePolicy) {
  return authority.paidExecutionApproved && env.SITEFIT_COMMERCIAL_EXECUTION === "1" && productionHost(env, hostname, authority);
}
export function sourceCollectionAllowed(env: Readonly<Record<string,string|undefined>>,hostname:string,authority:ReleaseAuthority=releasePolicy){
 if(env.VERCEL_ENV!=="production")return true;
 return authority.sourceCollectionApproved===true&&env.SITEFIT_COMMERCIAL_SOURCE_COLLECTION==="1"&&productionHost(env,hostname,authority);
}
