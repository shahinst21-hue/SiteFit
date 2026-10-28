/** All three hosted formats were returned by verified Stripe Checkout Sessions.
 * This predicate grants no Session/payment authority and preserves provider state. */
export function stripeCheckoutUrl(url:URL){
 return url.origin==='https://checkout.stripe.com'&&!url.username&&!url.password&&/^\/(?:c|f|g)\/pay\/[^/]+$/.test(url.pathname);
}
