import Link from "next/link";
import { PageIntro, ButtonLink } from "@/components/ui";
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
export default function SampleReport() {
  return (
    <div className="page-wrap sample-report">
      <PageIntro
        eyebrow="SAMPLE REPORT"
        title="The reasoning behind a location decision."
      >
        <p>
          A fictional Coffee Shop at Market Quarter. Illustrative content
          explains the report format; it is not analysis of a real property.
        </p>
      </PageIntro>
      <div className="sample-label">
        <strong>Fictional scenario · illustrative evidence</strong>
        <span>
          No verified location data, live source retrieval or financial results
          are represented.
        </span>
      </div>
      <section className="report-overview">
        <div className="report-summary">
          <p className="eyebrow">DECISION SUMMARY · SAMPLE</p>
          <h2>
            A daytime opportunity.
            <br />
            An access question to resolve.
          </h2>
          <p>
            The fictional proposition centres on repeat weekday visits. Before
            committing, test whether the nearby activity translates into
            customers who can reach the shop conveniently.
          </p>
          <div className="report-highlights">
            <article>
              <span className="badge positive">Opportunity</span>
              <h3>Complementary daytime uses</h3>
              <p>Potential repeat trips, if the customer occasion fits.</p>
            </article>
            <article>
              <span className="badge caution">Key risk</span>
              <h3>An interrupted approach route</h3>
              <p>A nearby crossing may change who actually passes the door.</p>
            </article>
            <article>
              <span className="badge">Critical gap</span>
              <h3>Purchase intent is unverified</h3>
              <p>Activity alone does not establish demand for the offering.</p>
            </article>
          </div>
        </div>
        <LocationVisual />
      </section>
      <section className="report-next">
        <p className="eyebrow">RECOMMENDED NEXT CHECKS · SAMPLE</p>
        <h2>Resolve the assumptions that matter.</h2>
        <ol>
          <li>Observe the approach route at the intended opening times.</li>
          <li>
            Compare nearby businesses by offering, price and customer occasion.
          </li>
          <li>
            Confirm lawful use, fit-out permissions and lease responsibilities
            in writing.
          </li>
        </ol>
      </section>
      <nav className="report-navigation" aria-label="Sample report sections">
        <a href="#report-detail">Explore the detail ↓</a>
        <a href="#sample-evidence">Inspect the evidence ↓</a>
        <a href="#sample-next-step">Your next step ↓</a>
      </nav>
      <section id="report-detail" className="report-detail">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FROM SIGNAL TO IMPLICATION</p>
            <h2>The detail, at your pace.</h2>
          </div>
          <p>
            Open a section for the question it answers. Coverage and evidence
            quality determine what a real assessment can support.
          </p>
        </div>
        {reportAreas.map((area, i) => (
          <details key={area}>
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
      <section id="sample-evidence" className="sample-evidence">
        <p className="eyebrow">TRANSPARENT REASONING · SAMPLE</p>
        <h2>Keep observation and interpretation separate.</h2>
        <div className="two-columns">
          <article className="signal-card">
            <span className="badge">Illustrative observation</span>
            <h3>Complementary daytime uses</h3>
            <p>
              A fictional observation log describes neighbouring workplaces and
              a lunchtime café. This is sample evidence, not a retrieved record.
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
            <span className="badge">Illustrative interpretation</span>
            <h3>Repeat visits may fit the proposition</h3>
            <p>
              The sample interpretation connects daytime uses to a takeaway
              coffee occasion. It is conditional on verified customer behaviour
              and accessible routes.
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
        <Link href="/methodology" className="text-link">
          How evidence is assessed ↗
        </Link>
      </section>
      <section id="sample-next-step" className="closing-cta">
        <div>
          <p className="eyebrow">YOUR PROPERTY. YOUR DECISION.</p>
          <h2>Start with your own location.</h2>
          <p>
            Free Snapshot {formatPrice(site.pricing.snapshot)} · Full Report{" "}
            {formatPrice(site.pricing.fullReport)}, one-off. No subscription.
          </p>
        </div>
        <ButtonLink href="/check-location">Check a location — free</ButtonLink>
      </section>
    </div>
  );
}
