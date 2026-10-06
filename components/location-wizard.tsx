"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { businessTypes, type BusinessType } from "@/lib/wizard";
import { Arrow } from "./ui";
import { Icon, type IconName } from "./icon";
import { useLocationEntry } from "./location-entry";
import { AddressLookup, initialAddressLookup } from "./address-lookup";
import type { PropertySelection } from "@/lib/addresses/model";
export function LocationWizard() {
  const entry = useLocationEntry(); const router = useRouter();
  const [property, setProperty] = useState<PropertySelection | null>(null);
  const [lookupState, setLookupState] = useState(() => initialAddressLookup(entry.address));
  const [initialSearch, setInitialSearch] = useState(entry.address);
  const consumeInitialSearch = useCallback(() => setInitialSearch(""), []);
  const [step, setStep] = useState(0); const [business, setBusiness] = useState<BusinessType | null>(null);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const nonce = useRef<string | null>(null); const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => entry.clear(), [entry.clear]);
  useEffect(() => { if (step) heading.current?.focus({ preventScroll: true }); }, [step]);
  async function generate(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    if (!property || !business) { setError("Choose your business type."); document.getElementById("businessType")?.focus(); return; }
    nonce.current ??= crypto.randomUUID(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/analyses/generate", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: property.id, businessType: business, nonce: nonce.current }), signal: AbortSignal.timeout(120000) });
      const result = await response.json();
      if (!response.ok || typeof result.reportId !== "string" || !/^[0-9a-f-]{36}$/i.test(result.reportId)) {
        setError(typeof result.error === "string" ? result.error : "Your Snapshot could not be completed. Please try again."); return;
      }
      router.push(`/snapshots/${result.reportId}`);
    } catch { setError("Your Snapshot could not be completed. Retry to reuse any saved results."); }
    finally { setBusy(false); }
  }
  return <div className="wizard-flow">
    <ol className="stepper" aria-label="Location check progress">{["Property Address", "Business Type", "Free Snapshot"].map((label, index) =>
      <li key={label} className={index === step ? "current" : index < step ? "complete" : ""} aria-current={index === step ? "step" : undefined}><span>{index + 1}</span>{label}</li>)}</ol>
    <div className="wizard-layout"><section className="wizard-panel">
      <p className="eyebrow">CHECK A COMMERCIAL LOCATION</p>
      <h1 ref={heading} tabIndex={-1}>{step === 0 ? "Enter a UK property address to get started." : "What type of business are you planning?"}</h1>
      {error && <p className="error-summary" role="alert">{error}</p>}
      {step === 0 ? <AddressLookup state={lookupState} setState={setLookupState} selected={property} initialSearch={initialSearch} onInitialSearch={consumeInitialSearch}
        onSelect={selected => { setProperty(selected); nonce.current = null; setError(""); setStep(1); }} /> : <form onSubmit={generate}>
        <p className="address-context">{property?.formattedAddress}</p>
        <fieldset disabled={busy}><legend className="muted">Your business shapes the analysis.</legend>
          <div className="business-options" id="businessType" tabIndex={-1}>{businessTypes.map((type, index) => <label key={type.id} className={`business-option ${business === type.id ? "selected" : ""}`}>
            <input type="radio" name="businessType" value={type.id} checked={business === type.id} required onChange={() => { setBusiness(type.id); nonce.current = null; setError(""); }} />
            <span className="business-icon" aria-hidden="true"><Icon name={( ["coffee", "restaurant", "hair", "beauty"] as IconName[])[index]} /></span>
            <span><strong>{type.label}</strong><span>{type.description}</span></span>
          </label>)}</div>
        </fieldset>
        <div className="wizard-actions"><button type="button" disabled={busy} className="button button-secondary" onClick={() => { setStep(0); setError(""); }}>Back</button>
          <button className="button button-primary" disabled={busy} type="submit">{busy ? "Building your location view…" : "Generate my Snapshot"}<Arrow /></button></div>
        <p role="status" aria-live="polite" className="field-help">{busy ? "Bringing the available evidence together. This may take a moment." : "No email required. Your Snapshot is private to this browser session or your existing account."}</p>
      </form>}
    </section></div>
  </div>;
}
