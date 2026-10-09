import "server-only";
import { object, text, timestamp } from "../data/validation.ts";
import { historyDate } from "../premises-history/model.ts";
import { publicReference } from "./search.ts";
import { addressMatch, type AddressParts } from "./model.ts";

/** Independently reviewed source facts, not an LLM extraction/admission claim.
 * Unknown commercial reuse permission blocks content retention. The reference
 * and disposition can be included in the immutable bundle; numerical candidate
 * values stay transient unless a reviewed source policy permits them. */
export type RentReview = { address: AddressParts; url: string; observedAt: string; publishedDate: string | null;
  effectiveDate: string | null; kind: "asking_rent" | "reported_contract_rent" | "market_estimate";
  annualGbp: number; amountQualifier: "exact" | "offers_above" | "approximate";
  areaSquareMetres: number | null; areaBasis: "GIA" | "NIA" | "unknown";
  leaseTerms: string | null; additionalCharges: string | null; vat: "included" | "excluded" | "not_applicable" | "unknown";
  reuse: "unknown" | "prohibited" };
export function reviewRent(value: unknown, selected: AddressParts) {
  const r = object(value); const allowed = "address url observedAt publishedDate effectiveDate kind annualGbp amountQualifier areaSquareMetres areaBasis leaseTerms additionalCharges vat reuse".split(" ");
  if (Object.keys(r).length !== allowed.length || Object.keys(r).some(k => !allowed.includes(k)) || !publicReference(r.url) || !timestamp(r.observedAt) ||
    !(r.publishedDate === null || historyDate(r.publishedDate)) || !(r.effectiveDate === null || historyDate(r.effectiveDate)) ||
    !["asking_rent","reported_contract_rent","market_estimate"].includes(String(r.kind)) ||
    typeof r.annualGbp !== "number" || !Number.isFinite(r.annualGbp) || r.annualGbp <= 0 || r.annualGbp > 10_000_000 ||
    !["exact","offers_above","approximate"].includes(String(r.amountQualifier)) ||
    !(r.areaSquareMetres === null || typeof r.areaSquareMetres === "number" && Number.isFinite(r.areaSquareMetres) && r.areaSquareMetres>0 && r.areaSquareMetres<100_000) ||
    !["GIA","NIA","unknown"].includes(String(r.areaBasis)) || ![r.leaseTerms,r.additionalCharges].every(v => v === null || text(v,500)) ||
    !["included","excluded","not_applicable","unknown"].includes(String(r.vat)) || !["unknown","prohibited"].includes(String(r.reuse))) throw new Error("rent_review_invalid");
  if (r.publishedDate !== null && String(r.publishedDate)>String(r.observedAt).slice(0,10)) throw new Error("rent_review_invalid");
  const address = object(r.address);
  if (Object.keys(address).length!==4 || !["primary","street","postcode","unit"].every(k => k in address) || !(address.unit===null || text(address.unit,200))) throw new Error("rent_review_invalid");
  const match = addressMatch(selected,address as unknown as AddressParts);
  return { match, reference: String(r.url), retainContent: false as const,
    reason: match === "rejected" ? "wrong_property_or_unit" : r.reuse === "prohibited" ? "reuse_prohibited" : "commercial_reuse_unconfirmed",
    classification: r.kind, currentRentEstablished: false as const,
    limitations: ["Source asking rent is not contracted rent; reported contract rent is not verified lease evidence.",
      "Publication/effective dates remain distinct; URL dates are not publication proof.",
      "Area basis, VAT and charges cannot be silently substituted or assumed included."] };
}
