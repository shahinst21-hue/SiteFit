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
          title="One property. One report. One payment."
        >
          <p>
            Your first look is free: a Free Snapshot for{" "}
            <strong>{formatPrice(site.pricing.snapshot)}</strong>. A Full Report costs{" "}
            <strong>{formatPrice(site.pricing.fullReport)}</strong>, as a
            one-off payment with no subscription.
          </p>
        </PageIntro>
        <PricingCards />
      </section>
      <section className="pricing-value">
        <div>
          <p className="eyebrow">THE VALUE OF A CLOSER LOOK</p>
          <h2>Know what could change the lease decision.</h2>
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
              "Qualified rental evidence",
              "See available rental context with its date, units and limitations.",
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
          <summary>What happens after payment?</summary>
          <p>Payment confirmation and report preparation are separate steps. Check progress in your account, open the Full Report when ready and download its PDF. Reopening a saved report does not generate a new assessment.</p>
        </details>
        <details>
          <summary>What if my report is not delivered?</summary>
          <p>Do not purchase again. Check your purchase status and submit a delivery-problem request, or email info@sitefit.co.uk with your purchase reference. Cancellation and refund terms are explained before Checkout; your statutory rights remain unaffected.</p>
        </details>
        <details><summary>Where does SiteFit analyse locations?</summary><p>Current location analysis covers London. Analysis covers Greater London, including all 32 boroughs and the City of London. You can enter a UK address, but locations outside this area are not currently analysed.</p></details>
        <details>
          <summary>What makes the Full Report different?</summary>
          <p>
            The Full Report brings together a consultant-style verdict,
            prioritised strengths and risks, operating-format constraints and
            an action plan. Explore eight sections online and download a PDF.
            Available rental evidence includes its dates and limitations.
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
            No. Coverage varies by property and source. Your report distinguishes
            findings from estimates and unanswered questions; it cannot confirm
            everything that a viewing or document review would establish.
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
