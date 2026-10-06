"use client";
import { useState,type FormEvent } from "react";
export function PurchaseAuth(){
 const [email,setEmail]=useState("");const [token,setToken]=useState("");const [busy,setBusy]=useState(false);const [sent,setSent]=useState(false);const [existingEmail,setExistingEmail]=useState(false);const [error,setError]=useState<string|null>(null);
 async function action(action: string){
  if(busy)return;setBusy(true);setError(null);
  try{const response=await fetch("/purchase/identity",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,email,...action==="verify_email"?{token}:{}})});
   const data=await response.json();if(!response.ok||typeof data.error==="string"){setError(data.error??"Sign-in is temporarily unavailable.");return;}
   if(typeof data.url==="string")window.location.assign(data.url);else if(data.sent){setSent(true);setExistingEmail(action==="existing_email");}
  }catch{setError("We could not reach sign-in. Please try again.");}finally{setBusy(false);}
 }
 function submit(event: FormEvent){event.preventDefault();void action("email");}
 return <section className="simple-panel" aria-busy={busy}>
  <button className="button button-primary" disabled={busy} onClick={()=>void action("google")}>Continue with Google</button>
  <form onSubmit={submit}><div className="field"><label htmlFor="purchase-email">Email address</label><input id="purchase-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} disabled={busy||sent}/></div>
   <button className="button button-secondary" type="submit" disabled={busy||sent}>Continue with email</button></form>
  {sent&&<div role="status"><p>Check your inbox. Open the verification link in this browser.{!existingEmail&&" If your email includes a code, you can enter it here."}</p>{!existingEmail&&<><label htmlFor="purchase-token">Email verification code</label><input id="purchase-token" inputMode="numeric" autoComplete="one-time-code" value={token} maxLength={10} onChange={e=>setToken(e.target.value)}/><button className="button button-secondary" disabled={busy||!token} onClick={()=>void action("verify_email")}>Verify email</button></>}</div>}
  <details><summary>Already have an account? Sign in</summary><p>Use your existing account to keep this Snapshot with your history.</p><button className="button button-secondary" disabled={busy} onClick={()=>void action("existing_google")}>Sign in with Google</button><button className="button button-secondary" disabled={busy||!email} onClick={()=>void action("existing_email")}>Sign in with email</button></details>
  {error&&<p className="field-error" role="alert">{error}</p>}
  <button className="text-link" disabled={busy} onClick={()=>void action("cancel")}>Return to my Snapshot</button>
 </section>;
}
