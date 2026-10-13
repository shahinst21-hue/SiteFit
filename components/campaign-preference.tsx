"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { campaignFromSearch, campaignCode, type Campaign } from "@/lib/marketing/campaign";
/** Optional and outside the checkout consent contract. No automatic cookie or event. */
export function CampaignPreference() {
  const [offered, setOffered] = useState<Campaign | null>(null);
  const [active, setActive] = useState<Campaign | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    const code = campaignFromSearch(window.location.search);
    fetch("/api/campaign", { cache: "no-store", signal: AbortSignal.timeout(3000) }).then(r => r.json()).then(data => {
      if (alive) { setEnabled(data.enabled === true); setOffered(code); setActive(campaignCode(data.campaign)); }
    }).catch(() => {});
    return () => { alive = false; };
  }, []);
  async function choose(accept: boolean) {
    setBusy(true); setError("");
    try {
      const result = await fetch("/api/campaign", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accept ? { action: "accept", campaign: offered } : { action: "clear" }), signal: AbortSignal.timeout(3000) });
      if (!result.ok) throw Error();
      setActive(accept ? offered : null); setOffered(null);
    } catch { setError("Preference could not be saved. You can continue without measurement."); }
    finally { setBusy(false); }
  }
  if (!enabled || !offered && !active) return null;
  return <section className="campaign-preference" aria-label="Optional campaign measurement">
    <div><strong>{active ? "Campaign measurement is on" : "Help us measure this campaign?"}</strong>
      <p>Optional session cookie links this campaign to your Snapshot and purchase outcomes. No property details go into campaign exports. <Link href="/privacy">Privacy</Link></p>
      {error && <p role="status">{error}</p>}</div>
    <div className="campaign-preference-actions">
      {offered && !active && <button type="button" className="button" disabled={busy} onClick={() => choose(true)}>Allow measurement</button>}
      <button type="button" className="button button-secondary" disabled={busy} onClick={() => choose(false)}>{active ? "Stop measurement" : "No thanks"}</button>
    </div>
  </section>;
}
