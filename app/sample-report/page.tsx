import Link from "next/link";
import { ButtonLink, Wordmark } from "@/components/ui";
import { Icon } from "@/components/icon";
import { LocationVisual } from "@/components/location-visual";
import { reportAreas } from "@/components/report-outline";
import { formatPrice, site } from "@/lib/site-config";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("/sample-report");
const sections = [
  [
    "A daytime-led proposition",
    "For this fictional coffee shop, repeat weekday visits matter more than general activity across the whole day. Test the intended customer occasions before treating the street as suitable.",
  ],
  [
    "Who can realistically reach you?",
    "Consider actual walking routes, barriers and the people present during trading hours. A circular catchment alone does not establish a reachable customer base.",
  ],
  [
    "Separate activity from intent",
    "The sample scenario assumes lunchtime trips to neighbouring workplaces. That is an indicator to investigate, not proof that people will buy coffee.",
  ],
  [
    "Compare the offering",
    "An illustrative nearby café serves seated lunches. A takeaway-led shop could have a different role, but price, opening hours and queue patterns need comparison.",
  ],
  [
    "A cluster can be useful",
    "Complementary uses may create repeat trips. Investigate whether those visits happen at the hours your business needs; proximity alone is not enough.",
  ],
  [
    "Check the route, not just distance",
    "In the fictional scenario, a crossing interrupts the direct route. Walk it, check accessible entry and observe how people approach the shopfront.",
  ],
  [
    "Activity is not measured footfall",
    "Transport and nearby-use indicators can provide context. They do not establish how many pedestrians pass the premises or become customers.",
  ],
  [
    "History needs dated evidence",
    "No occupancy finding is asserted in this sample. Ask for dated records and distinguish an observed change from an inferred reason for closure.",
  ],
  [
    "Avoid a survival narrative without evidence",
    "Business listings or company records cannot establish why a site changed occupier. Verified dates and identity matching are necessary before drawing a conclusion.",
  ],
  [
    "Make the cost assumptions explicit",
    "Annual rent, business rates and transaction value frame the first financial questions. Margin, staffing and opening hours refine them. This sample contains no calculated financial result.",
  ],
  [
    "Test a downside as well as a target",
    "Compare the effect of lower sales, higher costs and reduced trading hours using explicit assumptions. A scenario describes dependencies; it is not a forecast.",
  ],
  [
    "What would support the proposition?",
    "In the fictional scenario, complementary daytime uses and a visible shopfront are positive indicators. Both need dated verification and a link to the intended customer.",
  ],
  [
    "What could change the decision?",
    "The fictional crossing and limited evening activity challenge the proposition. Their importance depends on your trading hours and the routes customers use.",
  ],
  [
    "The critical gap",
    "Actual purchase intent, premises constraints and lease obligations remain unverified. Do not convert missing evidence into reassuring assumptions.",
  ],
  [
    "Verify the important few",
    "Visit during morning and lunchtime trading periods. Observe actual approach routes and competitors' offering. Check access and fit-out constraints with qualified advisers.",
  ],
  [
    "Ask for documents, not reassurance",
    "What is the lawful use? Which repairs and service charges fall to the tenant? Are extraction, signage and fit-out works permitted? Ask for written evidence before commitment.",
  ],
];
const links = [
  ["Overview", "report-overview"],
  ["Evidence notes", "sample-evidence"],
  ["Next checks", "report-next"],
  ...reportAreas.map((label, i) => [label, "report-section-" + i]),
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
          ← Back to SiteFit
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
            <h2>Test the daytime opportunity. Resolve the access question.</h2>
            <p>
              The fictional proposition centres on repeat weekday visits. Before
              committing, check whether nearby activity translates into
              customers who can reach the shop conveniently.
            </p>
            <div className="summary-priority">
              <Icon name="check" />
              <div>
                <strong>A conditional proposition</strong>
                <span>
                  Customer intent and premises constraints need verification.
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
            <li>Observe the approach route at the intended opening times.</li>
            <li>
              Compare businesses by offering, price and customer occasion.
            </li>
            <li>
              Confirm lawful use, fit-out permissions and lease responsibilities
              in writing.
            </li>
          </ol>
        </section>
        <section id="sample-evidence" className="sample-evidence">
          <div className="section-heading">
            <div>
              <p className="eyebrow">THE REASONING TRAIL</p>
              <h2>Observation. Interpretation. Next check.</h2>
            </div>
            <Link className="text-link" href="/methodology">
              Read the methodology ↗
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
                The sample interpretation connects daytime uses to a takeaway
                coffee occasion. It depends on verified customer behaviour and
                accessible routes.
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
              <h2>Explore the sixteen sections.</h2>
            </div>
            <p>
              Open the question that matters to you. Coverage and evidence
              quality determine what an assessment can support.
            </p>
          </div>
          {reportAreas.map((area, i) => (
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
            <h2>Start with a focused brief.</h2>
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
