import "server-only";
import { object, text } from "../data/validation.ts";
import { addressMatch, finding, type AddressParts, type WebFinding } from "./model.ts";
import { publicReference } from "./search.ts";

/** No arbitrary URL fetch: only a fixed official endpoint, numeric record ID,
 * no redirects, no credentials, no retries, bounded body/time. Other websites
 * need a reviewed source adapter/policy before facts can enter storage. */
export async function verifyPublicCandidate(url: string, target: AddressParts, options: { fetch?: typeof fetch; now?: () => Date } = {}): Promise<{
  url: string; state: "rights_unknown" | "unit_unknown" | "verified" | "fetch_failed"; findings: WebFinding[];
}> {
  if (!publicReference(url)) throw new Error("discovery_invalid");
  const match = /^https:\/\/ratings\.food\.gov\.uk\/business\/(\d+)$/.exec(url);
  if (!match) return { url, state: "rights_unknown", findings: [] };
  try {
    const response = await (options.fetch ?? fetch)(`https://api.ratings.food.gov.uk/Establishments/${match[1]}`, {
      headers: { Accept: "application/json", "x-api-version": "2" }, redirect: "error", signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) { await response.body?.cancel(); return { url, state: "fetch_failed", findings: [] }; }
    const reader = response.body?.getReader(); if (!reader) throw new Error("invalid_response");
    let size = 0; const chunks: Uint8Array[] = [];
    while (true) { const p = await reader.read(); if (p.done) break; size += p.value.byteLength;
      if (size > 64_000) { await reader.cancel(); throw new Error("invalid_response"); } chunks.push(p.value); }
    const root = object(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const row = object(root.EstablishmentDetail ?? root);
    if (String(row.FHRSID) !== match[1] || !text(row.BusinessName,200) || !text(row.PostCode,20)) throw new Error("invalid_response");
    const address = [row.AddressLine1,row.AddressLine2,row.AddressLine3,row.AddressLine4].filter(v => text(v,300)).join(", ");
    const expected = `${target.primary} ${target.street}`.toUpperCase();
    // Explicit comma-delimited address line, optionally with a documented unit prefix.
    const line = address.toUpperCase().split(", ").find(v => v === expected || v.endsWith(` ${expected}`));
    if (!line) return { url, state: "unit_unknown", findings: [] };
    const unit = line.slice(0,-expected.length).trim() || null;
    const scope = addressMatch(target, { primary: target.primary, street: target.street, postcode: row.PostCode, unit });
    if (scope === "rejected") return { url, state: "unit_unknown", findings: [] };
    const observedAt = (options.now ?? (() => new Date()))().toISOString();
    // Inspection date and business-name observation are distinct. A current name
    // is not proof of the occupant's name at its previous inspection.
    const record = finding({ kind: "business_name", value: row.BusinessName, basis: "Name in the official register when retrieved; not tenancy or opening/closure evidence.",
      source: url, sourceRecord: match[1], observedAt, publishedDate: null, eventDate: null, dateMeaning: "observation_only", match: scope,
      sourceAddress: { primary:target.primary,street:target.street,postcode:row.PostCode,unit }, policyId: "fsa-ogl-v3" });
    return { url, state: scope === "exact_unit" ? "verified" : "unit_unknown", findings: [record] };
  } catch { return { url, state: "fetch_failed", findings: [] }; }
}
