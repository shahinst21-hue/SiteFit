import Link from "next/link";
import { ButtonLink, ClosingCTA, Wordmark } from "@/components/ui";
import { PricingCards } from "@/components/pricing-cards";
import { LocationVisual } from "@/components/location-visual";
import { LocationEntry } from "@/components/location-entry";
import { Icon, type IconName } from "@/components/icon";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("/");
const checks: [IconName, string, string, string][] = [
  [
    "demand",
    "Customer demand",
    "Connect the customer occasion to the people and activity around a location.",
    "green",
  ],
  [
    "shop",
    "Competitive context",
    "Compare the offering, positioning and useful commercial clusters.",
    "amber",
  ],
  [
    "access",
    "Access & transport",
    "Check the routes and trading hours that matter to your customers.",
    "blue",
  ],
  [
    "shield",
    "Premises & risk",
    "Bring permissions, fit-out constraints and lease questions into view.",
    "rose",
  ],
  [
    "clock",
    "History & evidence",
    "Separate dated observations from assumptions about a property’s past.",
    "violet",
  ],
  [
    "cost",
    "Commercial rental context",
    "Frame costs and scenarios around the figures you choose to supply.",
    "green",
  ],
];
export default function Home() {
  return (
    <div className="page-wrap home-page">
      <section className="home-hero">
        <div className="hero-content">
          <p className="eyebrow">UK-WIDE COMMERCIAL LOCATION DECISIONS</p>
          <h1>Choose your next location with clarity.</h1>
          <p className="hero-copy">
            Start with your property and business. Build a focused brief around
            customers, competition, access and the questions to resolve before a
            lease.
          </p>
          <LocationEntry />
          <Link className="text-link" href="/sample-report">
            Explore a Sample Report ↗
          </Link>
          <div className="hero-benefits">
            <span>
              <Icon name="pin" />
              One location
            </span>
            <span>
              <Icon name="evidence" />
              Evidence-led approach
            </span>
            <span>
              <Icon name="document" />
              Practical next checks
            </span>
          </div>
        </div>
        <LocationVisual />
      </section>
      <section className="trust-strip" aria-label="Evidence standards">
        <p className="eyebrow">EVIDENCE WITH CONTEXT</p>
        <div>
          <Icon name="document" />
          <span>
            <strong>Official records</strong>
            <small>Dates and geography matter</small>
          </span>
        </div>
        <div>
          <Icon name="shop" />
          <span>
            <strong>Local business context</strong>
            <small>Observation before inference</small>
          </span>
        </div>
        <div>
          <Icon name="shield" />
          <span>
            <strong>Transparent reasoning</strong>
            <small>Gaps remain visible</small>
          </span>
        </div>
        <Link className="text-link" href="/methodology">
          Our methodology ↗
        </Link>
      </section>
      <section className="section-block value-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">WHAT MATTERS TO THE DECISION</p>
            <h2>Make the important questions visible.</h2>
          </div>
          <p>
            A location needs to fit your business. These are the factors to
            investigate, with verified evidence wherever an assessment is made.
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
      <section className="sample-teaser">
        <div className="teaser-copy">
          <p className="eyebrow">SEE THE REASONING</p>
          <h2>
            A clearer brief.
            <br />A better next question.
          </h2>
          <p>
            Explore how a Full Report brings opportunities, opposing evidence
            and practical checks into one decision. This fictional example shows
            the depth of the format.
          </p>
          <ButtonLink href="/sample-report">
            Explore the Sample Report
          </ButtonLink>
          <p className="fine-print">
            Fictional scenario · illustrative evidence
          </p>
        </div>
        <div className="teaser-report">
          <div className="teaser-toolbar">
            <Wordmark />
            <span className="badge">Sample Report</span>
          </div>
          <div className="teaser-title">
            <span className="icon-disc amber">
              <Icon name="coffee" />
            </span>
            <div>
              <h3>Coffee Shop · Market Quarter</h3>
              <p>A fictional daytime-led proposition</p>
            </div>
          </div>
          <div className="teaser-report-grid">
            <LocationVisual compact />
            <div className="teaser-reasoning">
              <span className="badge positive">Opportunity</span>
              <h3>Repeat weekday visits</h3>
              <p>Complementary uses may fit the customer occasion.</p>
              <span className="badge caution">Check first</span>
              <h3>The approach route</h3>
              <p>Visibility and access could change the picture.</p>
              <Link href="/sample-report" className="text-link">
                Read the sample reasoning ↗
              </Link>
            </div>
          </div>
        </div>
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
              "Organise the checks; add financial details only when useful.",
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
            <h2>Start free. Understand the deeper value.</h2>
          </div>
          <Link className="text-link" href="/pricing">
            Compare the options ↗
          </Link>
        </div>
        <PricingCards />
      </section>
      <ClosingCTA />
    </div>
  );
}
