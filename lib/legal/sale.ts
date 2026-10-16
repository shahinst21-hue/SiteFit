import {site,formatPrice} from "../site-config.ts";
import {policyVersions} from './policy-text.ts';
/** Versioned draft. Approval requires a reviewed replacement, never an env override. */
export const salePolicy = Object.freeze({ version: policyVersions.sale, approved: false,
  classification: 'digital_content', priceMinor: site.pricing.fullReport, currency: site.currency, consumerCancellationDays: 14,
  reportAccessDays: 30, additionalCheckoutFeeMinor: 0,
  termsVersion: policyVersions.terms, privacyVersion: policyVersions.privacy, retentionVersion: policyVersions.retention });
export type SaleConsent = { version: string; buyerKind: "consumer" | "business";
  termsAccepted: boolean; immediateRequested: boolean; acknowledgement: boolean };
export function validateSaleConsent(value: unknown): SaleConsent {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("sale_consent_required");
  const v = value as Record<string, unknown>;
  if (Object.keys(v).length !== 5 || v.version !== salePolicy.version || !["consumer", "business"].includes(String(v.buyerKind)) ||
    v.termsAccepted !== true || v.immediateRequested !== true || v.acknowledgement !== true) throw Error("sale_consent_required");
  return structuredClone(v) as SaleConsent;
}
export function requireApprovedSale() { if (!salePolicy.approved) throw Error("sale_policy_not_approved"); }
export const cancellationReasons = ["change_of_mind", "failed_delivery", "report_problem", "other"] as const;
export function cancellationReason(value: unknown) {
  if (!cancellationReasons.includes(value as never)) throw Error("invalid_cancellation_reason");
  return value as typeof cancellationReasons[number];
}
export const saleDisclosure = `One ${formatPrice(site.pricing.fullReport)} location report, the total payable with no additional checkout fee. Access lasts 30 days from when the report is Ready, with PDF export. Consumer V1 purchases include a contractual 14-day cancellation right, including after immediate delivery. Statutory rights remain unaffected. AI analysis is indicative and may contain inaccuracies; verify material facts before committing.`;
