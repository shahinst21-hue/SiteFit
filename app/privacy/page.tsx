import {PageIntro} from '@/components/ui';
import {pageMetadata} from '@/lib/seo';
import {privacySections,retentionSections,policyVersions} from '@/lib/legal/policy-text';
import {legalPublicationReady} from '@/lib/legal/publication';
import {LegalUnavailable} from '@/components/legal-unavailable';
export const metadata=pageMetadata('/privacy');
export default function Privacy(){
 if(!legalPublicationReady())return <div className="page-wrap narrow-page"><PageIntro eyebrow="YOUR INFORMATION" title="Privacy at SiteFit." children={null}/><div className="prose"><LegalUnavailable/><h2>Accounts and essential cookies</h2><p>Supabase Auth processes email or Google sign-in and maintains necessary session cookies. Ownership and access records protect your saved reports.</p><h2>Privacy requests</h2><p>Contact info@sitefit.co.uk for access, correction, erasure, restriction, objection or portability requests. Existing records remain subject to applicable rights and retention obligations.</p></div></div>;
 return <div className="page-wrap narrow-page"><PageIntro eyebrow="YOUR INFORMATION" title="Privacy at SiteFit." children={null}/><div className="prose">{privacySections.map(s=><section key={s.title}><h2>{s.title}</h2><p>{s.body}</p></section>)}<h2>Data retention criteria</h2><p>Version: {policyVersions.retention}</p>{retentionSections.map(s=><section key={s.title}><h3>{s.title}</h3><p>{s.body}</p></section>)}</div></div>;
}
