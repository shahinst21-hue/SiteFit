import "server-only";
import { handleAddressOperation, type AddressOperation } from "./http";
import { addressProvider } from "./server-provider";
import { propertyRepository } from "./repository";
import { sourceCollectionAllowed } from "../release/policy";
import {controlledTrialConfigured,publicCustomersConfigured} from '../proof/trial-policy';
import {assertTrialOwner} from '../proof/trial';
import {trialAddressFetch} from '../proof/trial-address';
import {verifiedUser} from '../supabase/server';
import {sameOrigin} from '../analysis/http';
const windows = new Map<string, { count: number; until: number }>();
let total = { count: 0, until: 0 };
function allow(request: Request, operation: AddressOperation) {
  const now = Date.now();
  if (total.until <= now) {
    total = { count: 0, until: now + 300000 };
    for (const [key, value] of windows)
      if (value.until <= now) windows.delete(key);
  }
  const ip = (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local"
  ).slice(0, 100);
  const key = `${ip}:${operation === "search" ? "search" : "paid"}`;
  const limit = operation === "search" ? 60 : 20;
  const entry = windows.get(key);
  const window =
    !entry || entry.until <= now ? { count: 0, until: now + 300000 } : entry;
  if (
    window.count >= limit ||
    total.count >= 500 ||
    (!entry && windows.size >= 10000)
  )
    return false;
  window.count++;
  total.count++;
  windows.set(key, window);
  return true;
}
export async function addressRoute(request: Request, operation: AddressOperation) {
  if(controlledTrialConfigured(process.env,new URL(request.url).hostname)){
    let owner:string|null=null;
    return handleAddressOperation(request,operation,{
      admit:async()=>{try{
        const verified=await verifiedUser();let user=verified.user;
        if(!user&&publicCustomersConfigured(process.env,new URL(request.url).hostname)){
          if(!sameOrigin(request)||verified.unavailable||!verified.client)return false;
          const guest=await verified.client.auth.signInAnonymously();if(guest.error)return false;
          const checked=await verified.client.auth.getUser();user=checked.error?null:checked.data.user;
        }
        await assertTrialOwner(user,new URL(request.url).hostname);owner=user!.id;return true;
      }catch{return false;}},
      provider:()=>addressProvider(trialAddressFetch(owner!)),repository:propertyRepository,allow,
      log:event=>console.warn('address_operation',JSON.stringify(event)),
    });
  }

  // Proof uses a pre-approved canonical property, never a public address-spending switch.
  if(process.env.VERCEL_ENV==='production'&&process.env.SITEFIT_CONTROLLED_PROOF_ENABLED==='1')return Promise.resolve(Response.json({error:"Address capture is unavailable during the controlled proof."},{status:503,headers:{"Cache-Control":"private, no-store"}}));
  if(!sourceCollectionAllowed(process.env,new URL(request.url).hostname))return Promise.resolve(Response.json({error:"Address lookup is not activated here."},{status:503,headers:{"Cache-Control":"private, no-store"}}));
  return handleAddressOperation(request, operation, {
    provider: addressProvider,
    repository: propertyRepository,
    allow,
    log: (event) => console.warn("address_operation", JSON.stringify(event)),
  });
}
