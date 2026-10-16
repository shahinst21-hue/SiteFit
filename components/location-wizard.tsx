"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { businessTypes, type BusinessType } from "@/lib/wizard";
import { Arrow } from "./ui";
import { Icon, type IconName } from "./icon";
import { useLocationEntry } from "./location-entry";
import { AddressLookup, initialAddressLookup } from "./address-lookup";
import type { PropertySelection } from "@/lib/addresses/model";
import {GenerationProgress} from './generation-progress';
import {snapshotView} from '../lib/generation-progress';
import {readSnapshotProgress} from '../lib/snapshot-progress-client';
import type {SnapshotTick} from '../lib/analysis/progress';
export function LocationWizard() {
  const entry = useLocationEntry(); const router = useRouter();
  const [property, setProperty] = useState<PropertySelection | null>(null);
  const [lookupState, setLookupState] = useState(() => initialAddressLookup(entry.address));
  const [initialSearch, setInitialSearch] = useState(entry.address);
  const consumeInitialSearch = useCallback(() => setInitialSearch(""), []);
  const [step, setStep] = useState(0); const [business, setBusiness] = useState<BusinessType | null>(null);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [progress,setProgress]=useState<SnapshotTick|{stage:'ready';completed:8}>({stage:'identity',completed:0});
  const [attempted,setAttempted]=useState(false);
  const nonce = useRef<string | null>(null); const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => entry.clear(), [entry.clear]);
  useEffect(() => { if (step) heading.current?.focus({ preventScroll: true }); }, [step]);
  async function generate(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    if (!property || !business) { setError("Choose your business type."); document.getElementById("businessType")?.focus(); return; }
    nonce.current ??= crypto.randomUUID(); setBusy(true); setError("");setAttempted(true);setProgress({stage:'identity',completed:0});let opening=false;
    try {
      const response = await fetch("/api/analyses/generate", { method: "POST", headers: { "Content-Type": "application/json",Accept:'application/x-ndjson' },
        body: JSON.stringify({ propertyId: property.id, businessType: business, nonce: nonce.current }), signal: AbortSignal.timeout(120000) });
      const reportId=await readSnapshotProgress(response,setProgress);
      opening=true;router.push(`/snapshots/${reportId}`);
    } catch (e) { setError(e instanceof Error?e.message:"Your Snapshot could not be confirmed. Check your account before starting again."); }
    finally { if(!opening)setBusy(false); }
  }
  return <div className="wizard-flow">
    <ol className="stepper" aria-label="Location check progress">{["Property Address", "Business Type", "Free Snapshot"].map((label, index) =>
      <li key={label} className={index === step ? "current" : index < step ? "complete" : ""} aria-current={index === step ? "step" : undefined}><span>{index + 1}</span>{label}</li>)}</ol>
    <div className="wizard-layout"><section className="wizard-panel">
      <p className="eyebrow">CHECK A COMMERCIAL LOCATION</p>
      <h1 ref={heading} tabIndex={-1}>{step === 0 ? "Which property are you considering?" : "What type of business are you planning?"}</h1>
      {error && <p className="error-summary" role="alert">{error}</p>}
      {attempted&&step===1&&<div role="status" aria-live="polite"><GenerationProgress view={snapshotView(progress,!!error)}/></div>}
      {step === 0 ? <AddressLookup state={lookupState} setState={setLookupState} selected={property} initialSearch={initialSearch} onInitialSearch={consumeInitialSearch}
        onSelect={selected => { setProperty(selected); nonce.current = null; setError(""); setAttempted(false); setStep(1); }} /> : <form onSubmit={generate}>
        <p className="address-context">{property?.formattedAddress}</p>
        <fieldset disabled={busy}><legend className="muted">Choose the business you want to open here.</legend>
          <div className="business-options" id="businessType" tabIndex={-1}>{businessTypes.map((type, index) => <label key={type.id} className={`business-option ${business === type.id ? "selected" : ""}`}>
            <input type="radio" name="businessType" value={type.id} checked={business === type.id} required onChange={() => { setBusiness(type.id); nonce.current = null; setError(""); setAttempted(false); }} />
            <span className="business-icon" aria-hidden="true"><Icon name={( ["coffee", "restaurant", "hair", "beauty"] as IconName[])[index]} /></span>
            <span><strong>{type.label}</strong><span>{type.description}</span></span>
          </label>)}</div>
        </fieldset>
        <div className="wizard-actions"><button type="button" disabled={busy} className="button button-secondary" onClick={() => { setStep(0); setError(""); }}>Back</button>
          <button className="button button-primary" disabled={busy} type="submit">{busy ? "Preparing your Free Snapshot…" : "Get my Free Snapshot"}<Arrow /></button></div>
        <p role="status" aria-live="polite" className="field-help">{busy ? "Bringing the available evidence together. This may take a moment." : "No account or card needed. Guest access depends on this browser session."}</p>
      </form>}
    </section></div>
  </div>;
}
