import Link from "next/link";
import { ButtonLink, ClosingCTA } from "@/components/ui";
import { PricingCards } from "@/components/pricing-cards";
import { LocationVisual } from "@/components/location-visual";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("/");
export default function Home() {
  return (
    <div className="page-wrap">
      <section className="home-hero">
        <div className="hero-content">
          <p className="eyebrow">A CLEARER COMMERCIAL LEASE DECISION</p>
          <h1>
            Check the location.
            <br />
            <em>Before you commit.</em>
          </h1>
          <p className="hero-copy">
            Found a space for your coffee shop, restaurant or salon? Put demand,
            competition, access and costs in the context of your business.
          </p>
          <ButtonLink href="/check-location">
            Check a location — free
          </ButtonLink>
          <p className="hero-footnote">
            UK-wide focus · Just an address and business type
            <br />
            No account or financial details needed to start
          </p>
          <Link href="/sample-report" className="text-link">
            See a Sample Report ↗
          </Link>
        </div>
        <LocationVisual />
      </section>
      <section className="trust-strip" aria-label="Our approach">
        <span>Evidence before assumptions</span>
        <span>Relevant to your business</span>
        <span>Clear about the gaps</span>
        <Link href="/methodology">How we assess evidence ↗</Link>
      </section>
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">BEYOND A PIN ON A MAP</p>
            <h2>
              Focus on what changes
              <br />
              your decision.
            </h2>
          </div>
          <p>
            A busy street is not automatically the right street. The useful
            question is how the location fits your business, costs and
            customers.
          </p>
        </div>
        <div className="three-columns">
          {[
            [
              "01",
              "The right demand",
              "Consider who uses the area, when they visit and whether their needs fit your business.",
            ],
            [
              "02",
              "The competitive context",
              "Distinguish useful commercial clusters from direct competition. A count alone tells only part of the story.",
            ],
            [
              "03",
              "The risks worth checking",
              "Bring evidence gaps, access constraints and lease questions into view before they become costly assumptions.",
            ],
          ].map(([n, title, text]) => (
            <article className="feature" key={n}>
              <span className="feature-index">{n}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="how-strip">
        <div>
          <p className="eyebrow">START SIMPLE</p>
          <h2>
            Your next decision
            <br />
            starts with two details.
          </h2>
          <ButtonLink href="/check-location" secondary>
            Start your Free Snapshot
          </ButtonLink>
        </div>
        <ol>
          {[
            [
              "Enter the address",
              "The commercial property you are considering, anywhere in the UK.",
            ],
            [
              "Choose your business",
              "Coffee Shop, Restaurant, Hair Salon or Beauty Salon.",
            ],
            [
              "Review your Snapshot",
              "Frame the local questions and next checks. Add costs only when you want to go deeper.",
            ],
          ].map(([title, text], i) => (
            <li key={title}>
              <span>0{i + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ONE LOCATION. ONE-OFF PRICING.</p>
            <h2>
              Start with the essentials.
              <br />
              Look deeper before you sign.
            </h2>
          </div>
          <Link className="text-link" href="/sample-report">
            Explore the Sample Report ↗
          </Link>
        </div>
        <PricingCards />
      </section>
      <section className="evidence-strip">
        <p className="eyebrow">REASONING YOU CAN FOLLOW</p>
        <h2>
          What supports the location?
          <br />
          What challenges it?
        </h2>
        <p>
          Good decision support puts positive evidence beside risks, separates
          facts from interpretation and makes the next check clear. It does not
          predict business success.
        </p>
        <Link href="/methodology" className="text-link">
          Read the methodology ↗
        </Link>
      </section>
      <ClosingCTA />
    </div>
  );
}
