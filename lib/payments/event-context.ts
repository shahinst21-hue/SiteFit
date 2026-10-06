// The development account emits this stable event envelope version. Objects
// referenced by the envelope are always re-read through the pinned SDK adapter;
// event payloads never supply authoritative money, ownership or entitlement.
export const STRIPE_WEBHOOK_API_VERSION = "2026-08-26.dahlia";
export function validPaymentEventContext(event: {
  id: string;
  livemode: boolean;
  account?: string;
  api_version?: string | null;
}) {
  return !event.livemode && !event.account &&
    event.api_version === STRIPE_WEBHOOK_API_VERSION &&
    /^evt_[A-Za-z0-9]+$/.test(event.id);
}
