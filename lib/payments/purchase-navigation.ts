/** Both Snapshot purchase controls use this POST journey. Page anchors and
 * report-reading URLs cannot masquerade as a successful purchase destination. */
export async function purchaseNavigation(report: string, checkout: boolean, origin: string, fetcher: typeof fetch = fetch) {
  const response = await fetcher(checkout ? "/purchase/checkout" : "/purchase/start", {
    method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({reportId: report}),
  });
  const data = await response.json();
  if (!response.ok || typeof data.url !== "string") throw Error("purchase_unavailable");
  const url = new URL(data.url, origin);
  // Stripe's server-validated Checkout URL includes provider-owned fragment
  // state. Preserve it; only internal purchase anchors represent the circular
  // Snapshot navigation defect. Never allow credentials or a foreign host.
  if (url.username || url.password || (checkout ? url.origin !== "https://checkout.stripe.com" || !url.pathname.startsWith("/c/pay/") :
    !!url.hash || url.origin !== origin || !["/purchase/auth", "/purchase/resume"].includes(url.pathname))) throw Error("invalid_purchase_redirect");
  return url.href;
}
