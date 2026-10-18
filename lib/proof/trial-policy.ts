/** Owner-authorised, private Production rehearsal. Public activation stays separate. */
export const trialLimits = Object.freeze({
  totalMicros: 4_250_000, snapshotMicros: 650_000, fullMicros: 1_000_000,
  snapshots: 5, fullReports: 1, addressRequests: 20,
});
export function controlledTrialConfigured(env: Readonly<Record<string, string | undefined>>, hostname = 'sitefit.co.uk') {
  return env.VERCEL_ENV === 'production' && env.SITE_URL === 'https://sitefit.co.uk' && hostname === 'sitefit.co.uk' &&
    env.SITEFIT_CONTROLLED_TRIAL_ENABLED === '1' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(env.SITEFIT_CONTROLLED_TRIAL_ID ?? '');
}
export function verifiedTrialIdentity(user: { id: string; email?: string; email_confirmed_at?: string; is_anonymous?: boolean } | null) {
  return !!user && user.is_anonymous === false && user.email?.toLowerCase() === 'shahinst21@gmail.com' && !!user.email_confirmed_at;
}
