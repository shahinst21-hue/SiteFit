import {verificationEnabled} from '../report-intelligence/http.ts';
import {productionHost} from '../release/policy.ts';
/** Independent read-only dashboard flag: never activates intelligence dispatch routes. */
export function dashboardEnabled(env:Record<string,string|undefined>,host:string){
  return productionHost(env,host)||verificationEnabled({...env,SITEFIT_REPORT_INTELLIGENCE_VERIFICATION:env.SITEFIT_DASHBOARD_VERIFICATION},host);
}
