/** Recognise credential prefixes, not the trailing letters of risk-/desk-based.
 * Project keys and long classic keys are caught even with an attached prefix.
 * Standalone short/partial keys stay prohibited. No configured value is logged. */
export function privateTokenText(value: string) {
  return /sb_secret_|sk-proj-|sk-[A-Za-z0-9_]{20,}|\bsk-|Bearer/i.test(value);
}
/** Exempt only the explicit false discard-policy flag, never a raw body/value. */
export function privateReportData(value: unknown) {
  const scan = JSON.stringify(value, (key, v) => key === "rawResponseRetained" && v === false ? undefined : v);
  return privateTokenText(scan) || /sk_(?:live|test)_|rawResponse|authorization|guestClaim/i.test(scan);
}
