import { PageIntro } from "@/components/ui";
import { PricingCards } from "@/components/pricing-cards";
import { pageMetadata } from "@/lib/seo";
import { Icon, type IconName } from "@/components/icon";
import { formatPrice, site } from "@/lib/site-config";
export const metadata = pageMetadata("/pricing");
export default function Pricing() {
  return (
    <div className="page-wrap pricing-page">
      <section className="pricing-layout">
        <PageIntro
          eyebrow="SIMPLE, ONE-OFF PRICING"
          title="A clearer decision. No subscription."
        >
          <p>
            Start with a Free Snapshot for{" "}
            <strong>{formatPrice(site.pricing.snapshot)}</strong>. Explore the
            depth of a{" "}
            <strong>{formatPrice(site.pricing.fullReport)} Full Report</strong>,
            one-off, before your lease decision.
          </p>
        </PageIntro>
        <PricingCards />
      </section>
      <section className="pricing-value">
        <div>
          <p className="eyebrow">THE VALUE OF A CLOSER LOOK</p>
          <h2>Turn detail into a better decision.</h2>
        </div>
        {(
          [
            [
              "evidence",
              "Deeper evidence",
              "Understand the basis and limits of important claims.",
            ],
            [
              "cost",
              "Explicit assumptions",
              "Put optional costs and scenarios in context.",
            ],
            [
              "shield",
              "Balanced reasoning",
              "Weigh supporting evidence against risks and gaps.",
            ],
            [
              "document",
              "Practical questions",
              "Know what to verify before you commit.",
            ],
          ] as [IconName, string, string][]
        ).map(([icon, title, text]) => (
          <article key={title}>
            <span className="icon-disc green">
              <Icon name={icon} />
            </span>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </section>
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
            No. Address and business type are enough to start. Financial inputs
            are never required to purchase or receive the Full Report.
            Financial planning is a separate experience.
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
