"use client";
import { useEffect,useRef,useState,type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PageIntro } from "@/components/ui";
import { Icon } from "./icon";
export function PurchaseAuth({test=true}:{test?:boolean}){
 const router=useRouter();const sentHeading=useRef<HTMLHeadingElement>(null);
 const [email,setEmail]=useState("");const [busy,setBusy]=useState(false);const [sent,setSent]=useState(false);const [error,setError]=useState<string|null>(null);
 useEffect(()=>{
  if(!sent)return;
  sentHeading.current?.focus();
  // Returning from a verification tab rechecks the server-owned continuation.
  // Focus/visibility never supplies identity, ownership or payment authority.
  const refresh=()=>router.refresh();
  const visible=()=>{if(document.visibilityState==="visible")refresh();};
  window.addEventListener("focus",refresh);document.addEventListener("visibilitychange",visible);
  return ()=>{window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",visible);};
 },[sent,router]);
 async function action(action: string){
  if(busy)return;setBusy(true);setError(null);
  try{const response=await fetch("/purchase/identity",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,email})});
   const data=await response.json();if(!response.ok||typeof data.error==="string"){setError(data.error??"Sign-in is temporarily unavailable.");return;}
   if(typeof data.url==="string")window.location.assign(data.url);else if(data.sent){setSent(true);}
  }catch{setError("We could not reach sign-in. Please try again.");}finally{setBusy(false);}
 }
 function submit(event: FormEvent){event.preventDefault();void action("email");}
 return <><PageIntro eyebrow="KEEP YOUR REPORT" title={sent?"Check your email.":"Sign in or create your account."}><p>{sent?"Open the sign-in link on the device where you want to continue. Your original Snapshot will follow your verified account.":"Use Google or an email link. New and existing accounts follow the same steps. Your Free Snapshot stays saved."}</p></PageIntro>{test&&<p className="field-help">Test Mode · No real payment is taken.</p>}<section className="simple-panel" aria-busy={busy}>
  {!sent&&<>
  <button className="button button-primary" disabled={busy} onClick={()=>void action("google")}><Icon name="login"/>Continue with Google</button><div className="auth-divider">or use email</div>
  <form onSubmit={submit}><div className="field"><label htmlFor="purchase-email">Email address</label><input id="purchase-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} disabled={busy||sent}/></div>
   <button className="button button-secondary" type="submit" disabled={busy||sent}><Icon name="email"/>Continue with email</button></form>
  </>}
  {sent&&<><h2 ref={sentHeading} tabIndex={-1}>Verification email sent</h2><p role="status">Check your inbox and spam folder. Your Snapshot is still saved. Verifying your email does not take a payment.</p><button className="button button-secondary" disabled={busy} onClick={()=>router.refresh()}>I opened the verification link</button><p className="field-help">If you used another tab in this browser, refresh here. On another device, continue there; this browser is not signed in automatically.</p></>}
  {error&&<p className="field-error" role="alert">{error}</p>}
  {sent&&<button className="button button-secondary" disabled={busy} onClick={()=>{setSent(false);setError(null);}}>Back to sign-in options</button>}<button className="text-link" disabled={busy} onClick={()=>void action("cancel")}>Return to my Snapshot</button>
 </section></>;
}
