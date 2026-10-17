import {PageIntro} from '@/components/ui';
import {pageMetadata} from '@/lib/seo';
import {termsSections,policyVersions} from '@/lib/legal/policy-text';
import {legalPublicationReady} from '@/lib/legal/publication';
import {LegalUnavailable} from '@/components/legal-unavailable';
export const metadata=pageMetadata('/terms');
export default function Terms(){
 if(!legalPublicationReady())return <div className="page-wrap narrow-page"><PageIntro eyebrow="SERVICE INFORMATION" title="SiteFit service information." children={null}/><div className="prose"><LegalUnavailable/></div></div>;
 return <div className="page-wrap narrow-page"><PageIntro eyebrow="SERVICE INFORMATION" title="SiteFit sale terms."><p>Version: {policyVersions.terms}.</p></PageIntro><div className="prose">{termsSections.map(s=><section key={s.title}><h2>{s.title}</h2><p>{s.body}</p></section>)}</div></div>;
}
