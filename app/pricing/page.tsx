import { PageIntro } from "@/components/ui";
import { PricingCards } from "@/components/pricing-cards";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("/pricing");
export default function Pricing() {
  return (
    <div className="page-wrap">
      <PageIntro
        eyebrow="SIMPLE, ONE-OFF PRICING"
        title="A clearer decision. No subscription."
      >
        <p>
          Start free. Understand the deeper evidence and reasoning before
          considering a Full Report.
        </p>
      </PageIntro>
      <PricingCards />
      <section className="faq-section">
        <h2>Before you decide</h2>
        <details>
          <summary>What makes the Full Report different?</summary>
          <p>
            The value is in connecting business-specific evidence to the lease
            decision: which signals matter, how risks change the picture and
            what to verify. The Sample Report illustrates this reasoning.
          </p>
        </details>
        <details>
          <summary>Do I need to provide financial details?</summary>
          <p>
            No. Address and business type are enough to start. Economics is
            optional afterwards; calculations must depend on the figures
            actually supplied.
          </p>
        </details>
        <details>
          <summary>Will every section have verified evidence?</summary>
          <p>
            Source coverage varies by location and geography. Insufficient
            verified evidence must be stated clearly; missing observations are
            never replaced by invented facts.
          </p>
        </details>
        <details>
          <summary>Does SiteFit predict business success?</summary>
          <p>
            No. Decision support helps you understand evidence and assumptions.
            It does not guarantee a business outcome or replace professional
            advice.
          </p>
        </details>
      </section>
    </div>
  );
}
