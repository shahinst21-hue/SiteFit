import {publicSeller} from '../lib/legal/publication';

/** Non-commercial public notice, deliberately independent of the private contract snapshot. */
export function LegalUnavailable(){return <section aria-label="Service availability"><p>Purchases are currently unavailable. Commercial sale terms are not published for purchase acceptance.</p><p>{publicSeller.name}, trading as {publicSeller.tradingName}. Contact: <a href={`mailto:${publicSeller.email}`}>{publicSeller.email}</a>.</p></section>;}
