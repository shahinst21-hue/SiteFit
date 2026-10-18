/** Public identity only. Approved address is rendered on the server; private draft contracts stay outside client configuration. */
export const publicSeller=Object.freeze({name:'Shahin Shahmir',tradingName:'SiteFit',email:'info@sitefit.co.uk'});
/** Separate publication/disclosure approval; an environment flag cannot approve either. */
export const legalPublication=Object.freeze({approved:true,sellerDisclosuresApproved:true});
export const legalPublicationReady=()=>legalPublication.approved&&legalPublication.sellerDisclosuresApproved;
