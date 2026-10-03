import { formatPrice, site } from "@/lib/site-config";
import { ButtonLink } from "./ui";

export function PricingCards() {
  return (
    <div className="pricing-grid">
      <section className="price-card">
        <p className="eyebrow">START WITH THE BASICS</p>
        <h2>Free Snapshot</h2>
        <p className="price">
          {formatPrice(site.pricing.snapshot)}
          <span> / location</span>
        </p>
        <p>An initial view of the location and the evidence available.</p>
        <ul className="check-list">
          <li>A first look at your chosen location</li>
          <li>Available evidence and visible limitations</li>
          <li>Unknowns to investigate further</li>
        </ul>
        <p className="fine-print">
          Planned product. Exact contents will be confirmed before launch.
        </p>
        <ButtonLink href="/check-location" secondary>
          Explore the checker
        </ButtonLink>
      </section>
      <section className="price-card price-card-featured">
        <p className="eyebrow">GO INTO THE DETAIL</p>
        <h2>Full Report</h2>
        <p className="price">
          {formatPrice(site.pricing.fullReport)}
          <span> / report, one-off</span>
        </p>
        <p>
          A Single Location Due Diligence Report for the business you have in
          mind.
        </p>
        <ul className="check-list">
          <li>Sixteen planned report areas</li>
          <li>Location context, economics and scenarios</li>
          <li>Supporting evidence, concerns and unknowns</li>
          <li>In-person checks and questions to ask</li>
        </ul>
        <p className="fine-print">
          Initial price assumption. Reports and purchases are not available yet.
        </p>
        <ButtonLink href="/how-it-works#report">
          See the report outline
        </ButtonLink>
      </section>
    </div>
  );
}
