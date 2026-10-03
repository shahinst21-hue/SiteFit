import { PageIntro } from "@/components/ui";
import { PricingCards } from "@/components/pricing-cards";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("/pricing");
export default function Pricing() {
  return (
    <div className="page-wrap">
      <PageIntro
        eyebrow="SIMPLE, ONE-OFF PRICING"
        title="One location. A clearer picture."
      >
        <p>
          Begin with a Free Snapshot, then choose a Full Report when you want to
          investigate further. No subscription or multiple paid plans.
        </p>
      </PageIntro>
      <PricingCards />
      <section className="faq-section">
        <h2>A few things to know</h2>
        <details>
          <summary>Can I buy a report today?</summary>
          <p>
            No. This is an early preview of the journey. Reports, checkout and
            payment processing are not available yet.
          </p>
        </details>
        <details>
          <summary>Is this the final pricing?</summary>
          <p>
            The displayed Full Report price is the initial assumption. Final
            pricing, tax treatment and purchase terms will be confirmed before
            sales open.
          </p>
        </details>
        <details>
          <summary>Will every report have data for every section?</summary>
          <p>
            Coverage depends on available and permitted sources. Gaps will stay
            visible as Unknown or Insufficient Evidence.
          </p>
        </details>
        <details>
          <summary>Does a report predict success?</summary>
          <p>
            No. SiteFit is intended to support a decision by organising evidence
            and questions. It cannot guarantee a business outcome.
          </p>
        </details>
      </section>
    </div>
  );
}
