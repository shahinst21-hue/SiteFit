import Link from "next/link";
import { ButtonLink, Wordmark } from "@/components/ui";
import { Icon } from "@/components/icon";
import { LocationVisual } from "@/components/location-visual";
import { fullReportAreas } from "@/components/report-outline";
import { formatPrice, site } from "@/lib/site-config";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("/sample-report");
// Illustrative teaching scenario, never a customer result or a source record.
const sections = [
  ["Explore weekday visits; do not choose a format yet", "Nearby workplaces are part of this fictional scenario, so morning coffee and lunch could be worth testing. Neither customer demand nor a preferred operating format is established. A plan and permitted-use documents are still needed."],
  ["Match the occasion to the people nearby", "Workplace trips could matter at lunchtime, while local residents may visit at other times. Visit during the hours you intend to trade; general activity does not show that people want your particular offer."],
  ["Compare offers, not just names", "The fictional neighbouring café serves seated lunches. Compare its menu, hours, prices and queues with the offer you have in mind. This example contains no verified competitor count, customer ratings or brand affiliations."],
  ["Check which side of the crossing people use", "The fictional crossing interrupts the direct approach to the shop. Walk the route at morning and lunchtime trading periods. A station nearby does not establish that its passengers pass your door."],
  ["The layout and lawful use could change the concept", "Ask for a measured plan and written confirmation of permitted use. Check space for preparation, storage, customer access and any required works. This example cannot establish seating capacity or recommend takeaway rather than seated service."],
  ["Ask for the full lease costs", "There are no rental figures in this fictional example. Ask for rent, rates, service charges, repair obligations and break terms in writing. Real reports show rental benchmarks or estimates only where qualified evidence is available; these are not agreed lease terms."],
  ["Resolve the constraints before committing", "First obtain the plan and use documents: an incompatible layout or restriction could rule out your intended concept. Then compare nearby offers, observe the approach route and obtain the full proposed lease terms."],
  ["Know what this example can tell you", "All findings here are illustrative. The map is schematic and no real property, source retrieval, trading performance or financial forecast is represented. In a real report, this section records the sources, dates, areas covered and important limitations."],
];
const links = [
  ["Overview", "report-overview"],
  ["Evidence notes", "sample-evidence"],
  ["Next checks", "report-next"],
  ...fullReportAreas.map((label, i) => [label, "report-section-" + i]),
];
function ReportLinks() {
  return (
    <>
      {links.map(([label, id]) => (
        <a key={id} href={"#" + id}>
          {label}
        </a>
      ))}
    </>
  );
}
export default function SampleReport() {
  return (
    <div className="page-wrap sample-report report-workspace">
      <aside className="report-sidebar">
        <Wordmark />
        <Link className="text-link" href="/">
          <Icon name="back"/> Back to SiteFit
        </Link>
        <div className="sidebar-property">
          <span className="icon-disc amber">
            <Icon name="coffee" />
          </span>
          <div>
            <strong>Coffee Shop</strong>
            <span>Market Quarter · fictional</span>
          </div>
        </div>
        <nav aria-label="Report navigation">
          <ReportLinks />
        </nav>
        <div className="sidebar-note">
          <Icon name="document" />
          <p>
            Sample Report
            <br />
            <span>Illustrative reasoning, no live sources</span>
          </p>
        </div>
      </aside>
      <div className="report-main">
        <header className="report-header">
          <div>
            <p className="eyebrow">SAMPLE REPORT</p>
            <h1>Coffee Shop</h1>
            <p className="report-address">
              Market Quarter · a fictional commercial location
            </p>
            <div className="report-tags">
              <span className="badge">Daytime-led proposition</span>
              <span className="badge">Coffee Shop</span>
              <span className="badge">Illustrative scenario</span>
            </div>
          </div>
          <ButtonLink href="/check-location" secondary>
            Check your own location
          </ButtonLink>
        </header>
        <div className="sample-label">
          <strong>Fictional scenario · illustrative evidence</strong>
          <span>
            No verified location data, live source retrieval or financial
            results are represented.
          </span>
        </div>
        <div className="report-metadata">
          <span>
            <Icon name="document" />
            Report format<strong>Decision-led example</strong>
          </span>
          <span>
            <Icon name="evidence" />
            Evidence status<strong>Illustrative only</strong>
          </span>
          <span>
            <Icon name="shield" />
            Assessment<strong>Conditional reasoning</strong>
          </span>
        </div>
        <details className="mobile-report-menu">
          <summary>Explore report sections</summary>
          <nav aria-label="Mobile report navigation">
            <ReportLinks />
          </nav>
        </details>
        <section className="report-overview" id="report-overview">
          <div className="report-summary">
            <p className="eyebrow">OVERALL VIEW · SAMPLE</p>
            <span className="icon-disc green">
              <Icon name="coffee" />
            </span>
            <h2>Explore weekday visits. Check the premises first.</h2>
            <p>
              Nearby workplaces could support weekday coffee visits in this fictional scenario; actual buying intent is unknown.
            </p>
            <p>No operating format can be selected without a usable plan and confirmation of permitted use.</p>
            <p>Obtain those documents first: a constraint could change the concept or your decision to proceed.</p>
            <div className="summary-priority">
              <Icon name="check" />
              <div>
                <strong>Priority action: get the plan and use documents</strong>
                <span>
                  Confirm whether your intended coffee service can work here before assessing the opportunity further.
                </span>
              </div>
            </div>
          </div>
          <LocationVisual compact />
        </section>
        <div className="report-highlights">
          <article className="highlight-opportunity">
            <span className="icon-disc green">
              <Icon name="demand" />
            </span>
            <span className="badge positive">Opportunity · sample</span>
            <h3>Complementary daytime uses</h3>
            <p>Potential repeat trips, if the customer occasion fits.</p>
          </article>
          <article className="highlight-risk">
            <span className="icon-disc rose">
              <Icon name="shield" />
            </span>
            <span className="badge caution">Key risk · sample</span>
            <h3>An interrupted approach route</h3>
            <p>A crossing may change who actually passes the door.</p>
          </article>
          <article>
            <span className="icon-disc blue">
              <Icon name="evidence" />
            </span>
            <span className="badge">Critical gap</span>
            <h3>Purchase intent is unverified</h3>
            <p>Activity alone does not establish demand for the offering.</p>
          </article>
        </div>
        <section id="report-next" className="report-next">
          <div>
            <p className="eyebrow">NEXT CHECKS · SAMPLE</p>
            <h2>Resolve the assumptions that matter.</h2>
          </div>
          <ol>
            <li>Obtain the plan and written use confirmation; an incompatible constraint could rule out your concept.</li>
            <li>
              Compare menus, prices and trading hours to test how your offer would differ.
            </li>
            <li>
              Observe the approach route at your intended hours; check whether people pass the entrance.
            </li>
            <li>Obtain full lease costs and obligations before deciding what you can commit to.</li>
          </ol>
        </section>
        <section id="sample-evidence" className="sample-evidence">
          <div className="section-heading">
            <div>
              <p className="eyebrow">THE REASONING TRAIL</p>
              <h2>Observation. Interpretation. Next check.</h2>
            </div>
            <Link className="text-link" href="/methodology">
              Read the methodology <Icon name="external"/>
            </Link>
          </div>
          <div className="two-columns">
            <article className="signal-card">
              <span className="badge">Illustrative observation</span>
              <h3>Complementary daytime uses</h3>
              <p>
                A fictional observation log describes neighbouring workplaces
                and a lunchtime café. This is sample evidence, not a retrieved
                record.
              </p>
              <dl>
                <div>
                  <dt>Evidence type</dt>
                  <dd>Illustrative observation</dd>
                </div>
                <div>
                  <dt>Limitation</dt>
                  <dd>Does not measure demand or sales</dd>
                </div>
              </dl>
            </article>
            <article className="signal-card">
              <span className="badge positive">
                Illustrative interpretation
              </span>
              <h3>Repeat visits may fit the proposition</h3>
              <p>
                The sample connects workplace activity to a possible morning
                or lunchtime visit. It does not choose a takeaway or seated
                format; that requires premises evidence as well as customer checks.
              </p>
              <dl>
                <div>
                  <dt>Reasoning</dt>
                  <dd>Business-specific inference</dd>
                </div>
                <div>
                  <dt>Next check</dt>
                  <dd>Observe the intended trading periods</dd>
                </div>
              </dl>
            </article>
          </div>
        </section>
        <section id="report-detail" className="report-detail">
          <div className="section-heading">
            <div>
              <p className="eyebrow">THE DETAIL BEHIND THE SUMMARY</p>
              <h2>Explore the eight sections.</h2>
            </div>
            <p>
              Open the question that matters to you. Coverage and evidence
              quality determine what an assessment can support.
            </p>
          </div>
          {fullReportAreas.map((area, i) => (
            <details key={area} id={"report-section-" + i}>
              <summary>
                <span className="report-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {area}
              </summary>
              <div className="report-section-body">
                <span className="badge">Sample interpretation</span>
                <h3>{sections[i][0]}</h3>
                <p>{sections[i][1]}</p>
              </div>
            </details>
          ))}
        </section>
        <section id="sample-next-step" className="closing-cta">
          <div>
            <p className="eyebrow">YOUR OWN LOCATION</p>
            <h2>Check the property you are considering.</h2>
            <p>
              Free Snapshot {formatPrice(site.pricing.snapshot)} · Full Report{" "}
              {formatPrice(site.pricing.fullReport)}, one-off. No subscription.
            </p>
          </div>
          <ButtonLink href="/check-location">Start a Free Snapshot</ButtonLink>
        </section>
      </div>
    </div>
  );
}
