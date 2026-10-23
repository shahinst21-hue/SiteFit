import Link from "next/link";
import { ButtonLink, ClosingCTA } from "@/components/ui";
import { PricingCards } from "@/components/pricing-cards";
import { HomeReportPreview } from "@/components/home-report-preview";
import { HeroLocationVisual } from "@/components/hero-location-visual";
import { LocationEntry } from "@/components/location-entry";
import { Icon, type IconName } from "@/components/icon";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("/");
const checks: [IconName, string, string, string][] = [
  [
    "demand",
    "Customer context",
    "See who lives and works nearby, and what that could mean for your trading hours.",
    "green",
  ],
  [
    "shop",
    "Competitive context",
    "Identify nearby business records and the offers to compare in person.",
    "amber",
  ],
  [
    "access",
    "Access & transport",
    "Explore how customers could reach you and which routes to check on a visit.",
    "blue",
  ],
  [
    "shield",
    "Premises & risk",
    "Identify use, layout and lease questions that could change your decision.",
    "rose",
  ],
  [
    "clock",
    "History & evidence",
    "Review available dated records without guessing why previous occupiers left.",
    "violet",
  ],
  [
    "cost",
    "Commercial rental context",
    "Compare available rent estimates, with their dates and limits.",
    "green",
  ],
];
export default function Home() {
  return (
    <div className="page-wrap home-page">
      <section className="home-hero">
        <div className="hero-content">
          <p className="eyebrow">COMMERCIAL LOCATION ANALYSIS · LONDON</p>
          <h1>Found a property? Check it before you commit.</h1>
          <p className="hero-copy">
            Assess a London property for your coffee shop, restaurant or salon.
            See what supports the location, what could work against it and
            what to check before signing a lease.
          </p>
          <LocationEntry />
          <Link className="text-link" href="/sample-report">
            Explore a Sample Report <Icon name="external"/>
          </Link>
          <div className="hero-benefits">
            <span>
              <Icon name="pin" />
              Your property
            </span>
            <span>
              <Icon name="evidence" />
              Sources you can inspect
            </span>
            <span>
              <Icon name="document" />
              Checks before signing
            </span>
          </div>
        </div>
        <HeroLocationVisual />
      </section>
      <section className="trust-strip" aria-label="Evidence standards">
        <p className="eyebrow">EVIDENCE WITH CONTEXT</p>
        <div>
          <Icon name="document" />
          <span>
            <strong>Official records</strong>
            <small>Know the period and area covered</small>
          </span>
        </div>
        <div>
          <Icon name="shop" />
          <span>
            <strong>Local business context</strong>
            <small>Listings are not proof of trading</small>
          </span>
        </div>
        <div>
          <Icon name="shield" />
          <span>
            <strong>Transparent reasoning</strong>
            <small>See what remains unknown</small>
          </span>
        </div>
        <Link className="text-link" href="/methodology">
          Our methodology <Icon name="external"/>
        </Link>
      </section>
      <section className="section-block value-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">WHAT MATTERS TO THE DECISION</p>
            <h2>Know what to investigate before signing.</h2>
          </div>
          <p>
            A busy area is only part of the picture. Consider the people,
            competing offers, approach routes and premises constraints that
            matter to your business.
          </p>
        </div>
        <div className="value-grid">
          {checks.map(([icon, title, text, tone]) => (
            <article className="feature" key={title}>
              <span className={`icon-disc ${tone}`}>
                <Icon name={icon} />
              </span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="sample-teaser home-report-showcase" aria-labelledby="report-preview-heading">
        <div className="teaser-copy">
          <p className="eyebrow">YOUR LOCATION. A CLEARER DECISION.</p>
          <h2 id="report-preview-heading">See the potential.<br />Know what to check.</h2>
          <p>Bring local population, access and premises questions into one clear view. Start with a Free Snapshot of your property.</p>
          <ButtonLink href="/check-location">Check your location</ButtonLink>
        </div>
        <HomeReportPreview />
      </section>
      <section className="how-strip">
        <div>
          <p className="eyebrow">TWO DETAILS TO START</p>
          <h2>Keep the first step simple.</h2>
          <ButtonLink href="/check-location" secondary>
            Start a Free Snapshot
          </ButtonLink>
        </div>
        <ol>
          {[
            [
              "Enter the property",
              "The address of the commercial space you are considering.",
            ],
            [
              "Choose your business",
              "Coffee Shop, Restaurant, Hair Salon or Beauty Salon.",
            ],
            [
              "Review the priorities",
              "Review the evidence and the checks that could change your lease decision.",
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
            <p className="eyebrow">A CLEAR NEXT STEP</p>
            <h2>Start free. Go deeper before you sign.</h2>
          </div>
          <Link className="text-link" href="/pricing">
            Compare the options <Icon name="external"/>
          </Link>
        </div>
        <PricingCards />
      </section>
      <ClosingCTA />
    </div>
  );
}
