/** Public identity only. Personal address and draft contract text do not belong in client configuration. */
export const publicSeller=Object.freeze({name:'Shahin Shahmir',tradingName:'SiteFit',email:'info@sitefit.co.uk'});
/** Separate publication/disclosure approval; an environment flag cannot approve either. */
export const legalPublication=Object.freeze({approved:false,sellerDisclosuresApproved:false});
export const legalPublicationReady=()=>legalPublication.approved&&legalPublication.sellerDisclosuresApproved;
