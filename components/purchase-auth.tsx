"use client";
import { useEffect,useRef,useState,type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PageIntro } from "@/components/ui";
export function PurchaseAuth(){
 const router=useRouter();const sentHeading=useRef<HTMLHeadingElement>(null);
 const [email,setEmail]=useState("");const [token,setToken]=useState("");const [busy,setBusy]=useState(false);const [sent,setSent]=useState(false);const [existingEmail,setExistingEmail]=useState(false);const [error,setError]=useState<string|null>(null);
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
  try{const response=await fetch("/purchase/identity",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,email,...action==="verify_email"?{token}:{}})});
   const data=await response.json();if(!response.ok||typeof data.error==="string"){setError(data.error??"Sign-in is temporarily unavailable.");return;}
   if(typeof data.url==="string")window.location.assign(data.url);else if(data.sent){setSent(true);setExistingEmail(action==="existing_email");}
  }catch{setError("We could not reach sign-in. Please try again.");}finally{setBusy(false);}
 }
 function submit(event: FormEvent){event.preventDefault();void action("email");}
 return <><PageIntro eyebrow="KEEP YOUR REPORT" title={sent?"Check your email.":"Create your account to keep your report and access it later."}><p>{sent?"Open the verification link in this browser. You will return to SiteFit before continuing to Checkout.":"Your Free Snapshot stays the same. Sign in securely before Checkout."}</p></PageIntro><p className="field-help">Test Mode · No real payment is taken. Full Report generation is not enabled.</p><section className="simple-panel" aria-busy={busy}>
  {!sent&&<>
  <button className="button button-primary" disabled={busy} onClick={()=>void action("google")}>Continue with Google</button>
  <form onSubmit={submit}><div className="field"><label htmlFor="purchase-email">Email address</label><input id="purchase-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} disabled={busy||sent}/></div>
   <button className="button button-secondary" type="submit" disabled={busy||sent}>Continue with email</button></form>
  <details><summary>Already have an account? Sign in</summary><p>Use your existing account to keep this Snapshot with your history.</p><button className="button button-secondary" disabled={busy} onClick={()=>void action("existing_google")}>Sign in with Google</button><button className="button button-secondary" disabled={busy||!email} onClick={()=>void action("existing_email")}>Sign in with email</button></details>
  </>}
  {sent&&<><h2 ref={sentHeading} tabIndex={-1}>Verification email sent</h2><p role="status">Check your inbox and spam folder. Your Snapshot is still saved. Verifying your email does not take a payment.</p>{!existingEmail&&<details><summary>Use an email verification code instead</summary><p>If your email includes a code, enter it here.</p><div className="field"><label htmlFor="purchase-token">Email verification code</label><input id="purchase-token" inputMode="numeric" autoComplete="one-time-code" value={token} maxLength={10} disabled={busy} onChange={e=>setToken(e.target.value)}/></div><button className="button button-secondary" disabled={busy||!token} onClick={()=>void action("verify_email")}>Verify email</button></details>}<button className="button button-secondary" disabled={busy} onClick={()=>router.refresh()}>I opened the verification link</button><p className="field-help">If you opened the link in another tab, return here to continue. Only a verified sign-in can proceed.</p></>}
  {error&&<p className="field-error" role="alert">{error}</p>}
  <button className="text-link" disabled={busy} onClick={()=>void action("cancel")}>Return to my Snapshot</button>
 </section></>;
}
