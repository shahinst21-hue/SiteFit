export const googleDestinations=Object.freeze({tag:'GT-NBB5SVJ4',installation:'AW-18530541419',analytics:'G-ZRCDT4R80E',adsAccount:'855-719-5993'});
export type MeasurementConfig={enabled:boolean;installation:string;analytics:string;environment:'production'|'test';origin:string;since:string;rehearsal?:boolean;sharedDebug?:boolean};
/** Explicit activation; existing-property debugging is bounded to the approved Preview branch and a 24-hour window. */
export function measurementConfig(env:Record<string,string|undefined>,now=Date.now()):MeasurementConfig{
 const production=env.VERCEL_ENV==='production';
 const controlled=env.SITEFIT_CONTROLLED_TRIAL_ENABLED==='1'||env.SITEFIT_CONTROLLED_PROOF_ENABLED==='1';
 const since=env.SITEFIT_GOOGLE_LIVE_FROM??'',dated=Number.isFinite(Date.parse(since))&&/^\d{4}-\d{2}-\d{2}T/.test(since);
 const testAnalytics=env.SITEFIT_GOOGLE_TEST_MEASUREMENT_ID??'',testTag=env.SITEFIT_GOOGLE_TEST_INSTALLATION_ID||testAnalytics;
 const rehearsal=!production&&env.SITEFIT_GOOGLE_UI_REHEARSAL==='1';
 const debugFrom=env.SITEFIT_GOOGLE_PREVIEW_DEBUG_FROM??'',debugUntil=Date.parse(env.SITEFIT_GOOGLE_PREVIEW_DEBUG_UNTIL??'');
 const previewOrigin='https://sitefit-git-codex-google-launch-58c7ae-shahinst21-hues-projects.vercel.app';
 const sharedDebug=env.VERCEL_ENV==='preview'&&env.VERCEL_GIT_COMMIT_REF==='codex/google-launch-measurement'&&env.SITEFIT_PURCHASE_ORIGIN===previewOrigin&&testAnalytics===googleDestinations.analytics&&testTag===testAnalytics&&Date.parse(debugFrom)<=now&&Date.parse(debugFrom)>=now-86400000&&debugUntil>now&&debugUntil-Date.parse(debugFrom)<=86400000;
 // Ordinary Preview requires an isolated G tag; the separately bounded sharedDebug path is owner-authorised.
 const isolated=/^G-[A-Z0-9]+$/.test(testAnalytics)&&testTag===testAnalytics&&testAnalytics!==googleDestinations.analytics;
 return {enabled:rehearsal||env.SITEFIT_GOOGLE_MEASUREMENT==='1'&&(production?dated&&env.SITE_URL==='https://sitefit.co.uk'&&!controlled:isolated||sharedDebug),installation:production?googleDestinations.installation:rehearsal?'AW-LOCALONLY':testTag,analytics:production?googleDestinations.analytics:rehearsal?'G-LOCALONLY':testAnalytics,environment:production?'production':'test',origin:sharedDebug?previewOrigin:'https://sitefit.co.uk',since:production?since:sharedDebug?debugFrom:'2000-01-01T00:00:00.000Z',rehearsal,sharedDebug};
}
