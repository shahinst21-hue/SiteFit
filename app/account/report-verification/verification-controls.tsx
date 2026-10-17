"use client";
import { useState } from "react";

type Status = { reportId: string; status: string; stage: string; completed: string[]; recoveryAvailable: boolean; resumable: boolean };
export function VerificationControls({ initial }: { initial: Status }) {
  const [status, setStatus] = useState(initial), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  async function check(action: "status" | "replay" | "resume") {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(action === "resume" ? "/api/reports/intelligence" :
        `/api/reports/intelligence?report=${encodeURIComponent(status.reportId)}${action === "replay" ? "&content=1" : ""}`, {
        method: action === "resume" ? "POST" : "GET", cache: "no-store",
        ...(action === "resume" ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reportId: status.reportId, action: "resume" }) } : {}) });
      const body = await response.json();
      if (!response.ok) throw Error(typeof body.error === "string" ? body.error : "Verification unavailable.");
      if (action === "replay") {
        if (body.version !== "full-report-v1" || !Array.isArray(body.sections) || body.sections.length !== 8 ||
          typeof body.contentDigest !== "string" || !/^[a-f0-9]{64}$/.test(body.contentDigest)) throw Error("Stored export is unavailable.");
        setMessage(`Stored replay verified: eight sections. Content digest: ${body.contentDigest}.`);
      } else {
        if (body.reportId !== status.reportId || !["draft", "ready"].includes(body.status) ||
          !["ready", "validating-and-saving", "interrupted", "validation_failed", "context", "premises", "synthesis", "checking-evidence"].includes(body.stage) ||
          !Array.isArray(body.completed) || body.completed.some((group: unknown) => !["context", "premises", "synthesis"].includes(String(group))) ||
          typeof body.resumable !== "boolean" || typeof body.recoveryAvailable !== "boolean") throw Error("Invalid status response.");
        setStatus(body); setMessage(action === "resume" ? "Existing execution requested. You may leave this page and return to check its stored progress." : "Stored progress refreshed.");
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Verification unavailable."); }
    finally { setBusy(false); }
  }
  return <section aria-label="Private report verification">
    <p>Status: <strong>{status.stage}</strong></p>
    <p>Completed: {status.completed.join(", ") || "No stages completed."}</p>
    <div className="button-row">
      <button className="button button-secondary" disabled={busy} onClick={() => void check("status")}>Refresh stored progress</button>
      {status.status === "ready" && <button className="button button-secondary" disabled={busy} onClick={() => void check("replay")}>Verify stored replay</button>}
      {(status.resumable || status.recoveryAvailable) && <button className="button button-primary" disabled={busy} onClick={() => void check("resume")}>Resume existing verification</button>}
    </div>
    <p role="status" aria-live="polite">{message}</p>
  </section>;
}
