import {PageIntro} from '@/components/ui';
import {pageMetadata} from '@/lib/seo';
import {termsSections,policyVersions} from '@/lib/legal/policy-text';
export const metadata=pageMetadata('/terms');
export default function Terms(){return <div className="page-wrap narrow-page"><PageIntro eyebrow="SERVICE INFORMATION" title="SiteFit sale terms."><p>Prelaunch review version: {policyVersions.terms}. Purchases remain unavailable pending final launch checks.</p></PageIntro><div className="prose">{termsSections.map(s=><section key={s.title}><h2>{s.title}</h2><p>{s.body}</p></section>)}</div></div>;}
