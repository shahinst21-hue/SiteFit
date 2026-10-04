import { formatPrice, site } from "@/lib/site-config";
import { ButtonLink } from "./ui";
export function PricingCards() {
  return (
    <div className="pricing-grid">
      <section className="price-card">
        <p className="eyebrow">FRAME YOUR FIRST QUESTIONS</p>
        <h2>Free Snapshot</h2>
        <p className="price">
          {formatPrice(site.pricing.snapshot)}
          <span> / location</span>
        </p>
        <p>Start with the essentials and identify what needs a closer look.</p>
        <ul className="check-list">
          <li>Your location and business brief</li>
          <li>Demand, competition and access priorities</li>
          <li>Evidence gaps and practical next checks</li>
        </ul>
        <p className="fine-print">
          Two details to start. No account or economics required.
        </p>
        <ButtonLink href="/check-location" secondary>
          Get your Free Snapshot
        </ButtonLink>
      </section>
      <section className="price-card price-card-featured">
        <p className="eyebrow">UNDERSTAND THE LEASE DECISION</p>
        <h2>Full Report</h2>
        <p className="price">
          {formatPrice(site.pricing.fullReport)}
          <span> / report · one-off</span>
        </p>
        <p>
          Go beyond an overview: understand which evidence matters, what it
          means for your business and what to verify before signing.
        </p>
        <ul className="check-list">
          <li>Business-specific interpretation of demand and competition</li>
          <li>Supporting evidence weighed against commercial risks</li>
          <li>Optional economics and transparent scenario assumptions</li>
          <li>Prioritised landlord questions and physical checks</li>
        </ul>
        <p className="fine-print">
          See the depth and reasoning in a clearly labelled example.
        </p>
        <ButtonLink href="/sample-report">View the Sample Report</ButtonLink>
      </section>
    </div>
  );
}
