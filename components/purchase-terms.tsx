import 'server-only';
import {salePolicy,saleDisclosure} from '../lib/legal/sale';
import {legalPublicationReady} from '../lib/legal/publication';
import {consentLabels,formationRule,deliveryCommitment} from '../lib/legal/policy-text';
import {seller} from '../lib/legal/seller';
import {LegalUnavailable} from './legal-unavailable';
import {PurchaseConsent} from './purchase-consent';

export function PurchaseTerms({report}:{report:string}){
 if(!salePolicy.approved||!legalPublicationReady())return <LegalUnavailable/>;
 // Only a separately approved public disclosure may cross this server/client boundary.
 return <PurchaseConsent report={report} disclosure={saleDisclosure} sellerDisclosure={`${seller.name}, trading as ${seller.tradingName}. ${seller.address}. ${seller.email}. Not VAT registered.`}
  formation={formationRule} delivery={deliveryCommitment} labels={consentLabels}/>;
}
