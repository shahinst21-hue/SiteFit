import "server-only";
import { frameworkClient } from "../data/server-client.ts";
import { hashProof,type ClaimCookie } from "./purchase-flow.ts";
export type Claim = { id: string; guest_id: string; report_id: string; analysis_id: string; method: "email"|"google"|null;
 state: string; expires_at: string; target_id: string|null; auth_target_id: string|null; email_sha256: string|null };
function validatedClaim(data: Omit<Claim,"method"> & {method: string|null}): Claim {
 if(data.method!==null&&data.method!=="email"&&data.method!=="google")throw Error("claim_unavailable");
 return {...data,method:data.method};
}
export async function readClaim(proof: ClaimCookie): Promise<Claim> {
 const {data,error}=await frameworkClient().from("guest_account_claims").select("*").eq("id",proof.id)
  .eq("capability_sha256",hashProof(proof.capability)).eq("browser_sha256",hashProof(proof.browser)).maybeSingle();
 if(error||!data)throw Error("claim_unavailable");
 return validatedClaim(data);
}
export async function prepareClaim(guest: string,report: string,proof: ClaimCookie): Promise<Claim>{
 const {data,error}=await frameworkClient().rpc("prepare_sitefit_claim",{p_guest:guest,p_report:report,p_id:proof.id,p_capability:hashProof(proof.capability),p_browser:hashProof(proof.browser)});
 if(error||!data)throw Error(error?.message==="claim_busy"?"claim_busy":"claim_unavailable");return validatedClaim(data);
}
export async function startClaimAuth(proof: ClaimCookie,guest: string,method: "email"|"google",email: string|null){
 // PostgreSQL accepts null function arguments; generated RPC types omit that
 // nullability. Google deliberately has no email authority binding.
 const emailHash=email?hashProof(email.toLowerCase()):null;
 const {error}=await frameworkClient().rpc("start_sitefit_claim_auth",{p_id:proof.id,p_guest:guest,p_capability:hashProof(proof.capability),p_browser:hashProof(proof.browser),p_method:method,p_email_hash:emailHash as string});
 if(error)throw Error("claim_auth_unavailable");
}
export async function recordClaimAuth(proof: ClaimCookie,target: string,method: "email"|"google"){
 const {error}=await frameworkClient().rpc("verify_sitefit_claim_auth",{p_id:proof.id,p_target:target,p_capability:hashProof(proof.capability),p_browser:hashProof(proof.browser),p_method:method});
 if(error)throw Error("claim_auth_unavailable");
}
export async function finishClaim(proof: ClaimCookie,target: string){
 const {data,error}=await frameworkClient().rpc("complete_sitefit_claim",{p_id:proof.id,p_target:target,p_capability:hashProof(proof.capability),p_browser:hashProof(proof.browser)});
 if(error||!data)throw Error("claim_completion_unavailable");return data;
}
export async function cancelClaim(proof: ClaimCookie,guest: string){
 const claim=await readClaim(proof);if(claim.guest_id!==guest)throw Error("claim_owner_required");
 const {error}=await frameworkClient().rpc("cancel_sitefit_claim",{p_id:claim.id,p_guest:guest,p_capability:hashProof(proof.capability),p_browser:hashProof(proof.browser)});
 if(error)throw Error("claim_unavailable");
}
