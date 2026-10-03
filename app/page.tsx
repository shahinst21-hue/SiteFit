import Image from "next/image";
import Link from "next/link";
import { ButtonLink, ClosingCTA } from "@/components/ui";
import { PricingCards } from "@/components/pricing-cards";
import { ReportOutline } from "@/components/report-outline";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("/");
export default function Home() {
  return (
    <div className="page-wrap">
      <section className="home-hero">
        <div>
          <p className="eyebrow">BEFORE YOU SIGN THE LEASE</p>
          <h1>
            Check a commercial location <em>before you commit.</em>
          </h1>
          <p className="hero-copy">
            Found a space for your coffee shop, restaurant or salon? Bring the
            location, the costs and the unanswered questions into one clearer
            picture.
          </p>
          <div className="button-row">
            <ButtonLink href="/check-location">Check a Location</ButtonLink>
            <Link href="/how-it-works#report" className="text-link">
              See what the report includes <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <p className="hero-footnote">
            London first <span>•</span> One location at a time <span>•</span> No
            success predictions
          </p>
        </div>
        <div className="hero-visual">
          <div className="visual-topline">
            <span>A CLOSER LOOK AT YOUR NEXT SPACE</span>
            <span aria-hidden="true">↗</span>
          </div>
          <Image
            src="/images/shopfront.svg"
            alt="Illustrated commercial shopfront. This is not a real property or analysis result."
            width={1200}
            height={760}
            priority
          />
          <div className="visual-caption">
            <span>Beyond the shopfront.</span>
            <p>
              The context, the costs,
              <br />
              the things still worth asking.
            </p>
          </div>
          <div className="visual-bottomline">
            <span>LOCATION + BUSINESS + EVIDENCE</span>
            <span>01 / 01</span>
          </div>
        </div>
      </section>
      <section className="intro-strip">
        <p>
          You found a property.
          <br />
          <strong>Now ask the right questions.</strong>
        </p>
        <p>
          A commercial lease is a big commitment. SiteFit is being built to help
          you investigate a location before you sign, with evidence, practical
          checks and room for uncertainty.
        </p>
      </section>
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A CLEARER WAY TO INVESTIGATE</p>
            <h2>Look at the whole picture.</h2>
          </div>
          <Link href="/methodology" className="text-link">
            Our approach ↗
          </Link>
        </div>
        <div className="three-columns">
          <div className="feature">
            <span className="feature-index">01 — THE LOCATION</span>
            <h3>Who and what is around you?</h3>
            <p>
              Planned catchment, competition, complementary businesses and
              access context, where reliable data is available.
            </p>
          </div>
          <div className="feature">
            <span className="feature-index">02 — THE BUSINESS</span>
            <h3>What do the costs depend on?</h3>
            <p>
              Your inputs will inform transparent economics and scenarios.
              Missing figures stay unknown.
            </p>
          </div>
          <div className="feature">
            <span className="feature-index">03 — THE QUESTIONS</span>
            <h3>What still needs a closer look?</h3>
            <p>
              Evidence gaps, in-person checks and questions for the landlord or
              agent, without a promise of success.
            </p>
          </div>
        </div>
      </section>
      <section className="how-strip">
        <div>
          <p className="eyebrow">HOW IT WILL WORK</p>
          <h2>
            From an address
            <br />
            to a better-informed decision.
          </h2>
          <Link href="/how-it-works" className="text-link">
            See the journey ↗
          </Link>
        </div>
        <ol>
          <li>
            <span>01</span>
            <div>
              <h3>Tell us about the space</h3>
              <p>
                Enter an address, choose your business and add the costs you
                know.
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Start with a Free Snapshot</h3>
              <p>
                A planned initial view of available evidence and limitations.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Go deeper with a Full Report</h3>
              <p>
                A planned one-off report to organise the evidence and your next
                checks.
              </p>
            </div>
          </li>
        </ol>
      </section>
      <ReportOutline />
      <section className="evidence-strip">
        <p className="eyebrow">EVIDENCE BEFORE ASSUMPTIONS</p>
        <h2>
          Knowing what is unknown
          <br />
          is part of the answer.
        </h2>
        <p>
          Not all sources are equally reliable. SiteFit&apos;s approach
          separates sourced information, estimates and interpretation. Missing
          facts stay missing.
        </p>
        <Link href="/methodology" className="text-link">
          Read our methodology ↗
        </Link>
      </section>
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ONE LOCATION. NO SUBSCRIPTION.</p>
            <h2>Start free. Go deeper when ready.</h2>
          </div>
          <p>
            Planned products, with clear initial pricing. Neither tier is
            available to generate or purchase yet.
          </p>
        </div>
        <PricingCards />
      </section>
      <ClosingCTA />
    </div>
  );
}
