export const googleDestinations=Object.freeze({tag:'GT-NBBS5VJ4',installation:'AW-18530541419',analytics:'G-ZRCDT4R80E',adsAccount:'855-719-5993'});
export type MeasurementConfig={enabled:boolean;installation:string;analytics:string;environment:'production'|'test';origin:string;since:string;rehearsal?:boolean};
/** An explicit server flag activates measurement only after release approval. Preview never uses live destinations. */
export function measurementConfig(env:Record<string,string|undefined>):MeasurementConfig{
 const production=env.VERCEL_ENV==='production';
 const controlled=env.SITEFIT_CONTROLLED_TRIAL_ENABLED==='1'||env.SITEFIT_CONTROLLED_PROOF_ENABLED==='1';
 const since=env.SITEFIT_GOOGLE_LIVE_FROM??'',dated=Number.isFinite(Date.parse(since))&&/^\d{4}-\d{2}-\d{2}T/.test(since);
 const testTag=env.SITEFIT_GOOGLE_TEST_INSTALLATION_ID??'',testAnalytics=env.SITEFIT_GOOGLE_TEST_MEASUREMENT_ID??'';
 const rehearsal=!production&&env.SITEFIT_GOOGLE_UI_REHEARSAL==='1';
 const isolated=/^AW-\d+$/.test(testTag)&&/^G-[A-Z0-9]+$/.test(testAnalytics)&&testTag!==googleDestinations.installation&&testAnalytics!==googleDestinations.analytics;
 return {enabled:rehearsal||env.SITEFIT_GOOGLE_MEASUREMENT==='1'&&(production?dated&&env.SITE_URL==='https://sitefit.co.uk'&&!controlled:isolated),installation:production?googleDestinations.installation:rehearsal?'AW-LOCALONLY':testTag,analytics:production?googleDestinations.analytics:rehearsal?'G-LOCALONLY':testAnalytics,environment:production?'production':'test',origin:'https://sitefit.co.uk',since:production?since:'2000-01-01T00:00:00.000Z',rehearsal};
}
