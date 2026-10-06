"use client";
import { useCallback,useEffect,useRef,useState } from "react";
export function PurchaseClaim(){
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 const started=useRef(false);
 const connect=useCallback(async()=>{
  setBusy(true);setError("");
  try{
   const response=await fetch("/purchase/claim",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
   const data=await response.json();
   if(!response.ok||typeof data.url!=="string"||!/^\/purchase\/resume\?report=[a-f0-9-]+$/.test(data.url))throw Error("unavailable");
   window.location.assign(data.url);
  }catch{setError("We could not save this connection. Please retry in the same browser.");setBusy(false);}
 },[]);
 useEffect(()=>{if(!started.current){started.current=true;void connect();}},[connect]);
 return <><p>Your sign-in is verified. Save this Snapshot to your account to continue.</p><button type="button" className="button" disabled={busy} onClick={connect}>{busy?"Saving…":"Save and continue"}</button><p role="status">{error}</p></>;
}
