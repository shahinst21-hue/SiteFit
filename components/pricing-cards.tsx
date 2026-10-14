import { formatPrice, site } from "@/lib/site-config";
import { ButtonLink } from "./ui";
import { Icon } from "./icon";
import Link from "next/link";
export function PricingCards() {
  return (
    <div className="pricing-grid">
      <section className="price-card">
        <span className="icon-disc green">
          <Icon name="document" />
        </span>
        <p className="eyebrow">YOUR FIRST LOOK</p>
        <h2>Free Snapshot</h2>
        <p className="price">
          {formatPrice(site.pricing.snapshot)}
          <span> / location</span>
        </p>
        <p>Start with the essentials and identify what needs a closer look.</p>
        <ul className="check-list">
          <li>An initial view for your property and business</li>
          <li>Local customer context, competition and access</li>
          <li>Evidence gaps and practical next checks</li>
        </ul>
        <p className="fine-print">
          Two details to start. No account or financial inputs required.
        </p>
        <ButtonLink href="/check-location" secondary>
          Get your Free Snapshot
        </ButtonLink>
      </section>
      <section className="price-card price-card-featured">
        <span className="price-label badge positive">
          Before you sign
        </span>
        <span className="icon-disc amber">
          <Icon name="evidence" />
        </span>
        <p className="eyebrow">THE CASE FOR AND AGAINST</p>
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
          <li>What local context and competition mean for your business</li>
          <li>Supporting evidence weighed against commercial risks</li>
          <li>Rent benchmarks and estimates, where available</li>
          <li>Ranked checks and questions for the landlord</li>
        </ul>
        <p className="fine-print">
          Eight sections · Saved to your account · PDF download. No subscription.
        </p>
        <ButtonLink href="/check-location">Start with your property</ButtonLink>
        <Link href="/sample-report" className="text-link">See a sample first</Link>
      </section>
    </div>
  );
}
