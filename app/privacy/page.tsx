import {PageIntro} from '@/components/ui';
import {pageMetadata} from '@/lib/seo';
import {privacySections,retentionSections,policyVersions} from '@/lib/legal/policy-text';
export const metadata=pageMetadata('/privacy');
export default function Privacy(){return <div className="page-wrap narrow-page"><PageIntro eyebrow="YOUR INFORMATION" title="Privacy at SiteFit."><p>Prelaunch review version: {policyVersions.privacy}. Processor and operational checks remain outstanding before commercial activation.</p></PageIntro><div className="prose">{privacySections.map(s=><section key={s.title}><h2>{s.title}</h2><p>{s.body}</p></section>)}<h2>Data retention criteria</h2><p>Version: {policyVersions.retention}</p>{retentionSections.map(s=><section key={s.title}><h3>{s.title}</h3><p>{s.body}</p></section>)}</div></div>;}
