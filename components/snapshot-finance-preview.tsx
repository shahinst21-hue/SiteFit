"use client";
import { useState, type FormEvent } from "react";
import { Icon } from "./icon";
import { Arrow } from "./ui";
import type { SnapshotView } from "@/lib/snapshot/model";
export function SnapshotOutlineLink({ price }: { price: string }) {
  return <a className="button button-primary" href="#report-outline" aria-controls="report-outline" onClick={event => {
    const outline = document.getElementById("report-outline");
    if (!(outline instanceof HTMLDetailsElement)) return;
    event.preventDefault(); outline.open = true; outline.querySelector("summary")?.focus(); outline.scrollIntoView({ block: "start" });
  }}>Check the Full Case · {price} <Arrow /></a>;
}
export function SnapshotFinancePreview({ financial, demo }: { financial: SnapshotView["financialPreview"]; demo: boolean }) {
  const [rent, setRent] = useState(financial.inputs.annualRent?.toString() ?? "");
  const [spend, setSpend] = useState(financial.inputs.averageSpend?.toString() ?? "");
  const [days, setDays] = useState(financial.inputs.tradingDays?.toString() ?? "");
  const [preview, setPreview] = useState<{ rent: string; spend: string; days: string } | null>(null);
  function showPreview(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setPreview({ rent, spend, days }); }
  return <section className="sf-finance" aria-labelledby="finance-title"><div className="sf-finance-intro"><span className="icon-disc amber"><Icon name="cost" /></span><div><p className="eyebrow">FINANCIAL ANALYSIS · FULL REPORT</p><h2 id="finance-title">See how the numbers could work.</h2><p>Explore the inputs behind required daily transactions, break-even revenue and sensitivity to rent and customer spend.</p></div></div>
    <form onSubmit={showPreview} className="sf-finance-form"><div className="sf-finance-fields">
      <label>Annual rent (£)<input type="number" min="0" max="10000000" step="0.01" required value={rent} onChange={e => { setRent(e.target.value); setPreview(null); }} placeholder="e.g. 50,000" /></label>
      <label>Average customer spend (£)<input type="number" min="0.01" max="100000" step="0.01" required value={spend} onChange={e => { setSpend(e.target.value); setPreview(null); }} placeholder="e.g. 7.50" /></label>
      <label>Trading days per week<input type="number" min="1" max="7" step="1" required value={days} onChange={e => { setDays(e.target.value); setPreview(null); }} placeholder="e.g. 5" /></label><button type="submit" className="button button-primary">Preview inputs <Arrow /></button></div>
      <p className="field-help">Inputs stay on this page. This previews the analysis outline; no financial calculation or payment is made.{demo ? " Prefilled values are examples." : ""}</p></form>
    {preview && <div className="sf-finance-result" role="status"><p><strong>Your scenario inputs</strong> · Annual rent £{Number(preview.rent).toLocaleString("en-GB")} · Customer spend £{Number(preview.spend).toLocaleString("en-GB")} · {preview.days} trading days per week</p><div className="sf-finance-outputs"><div><Icon name="cost" /><strong>Break-even revenue</strong><span>Requires margins and operating costs as well as rent.</span></div><div><Icon name="demand" /><strong>Daily transactions needed</strong><span>Connects sales requirements to spend and trading days.</span></div><div><Icon name="evidence" /><strong>Cost sensitivity</strong><span>Explores how rent, spend and margins change the requirements.</span></div></div><a className="text-link" href="#full-case">Explore the Full Report outline <Arrow /></a><p className="field-help">This preview shows the analysis outline, not calculated financial results.</p></div>}
  </section>;
}
