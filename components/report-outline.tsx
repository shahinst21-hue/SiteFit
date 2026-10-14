export const reportAreas = [
  "Location Snapshot",
  "Customer Catchment",
  "Demand Signals",
  "Competition",
  "Complementary Businesses",
  "Accessibility",
  "Mobility Signals",
  "Premises History",
  "Local Business Signals",
  "Commercial Rental Context",
  "Commercial Terms to Verify",
  "Evidence Supporting the Location",
  "Evidence Against the Location",
  "Unknowns",
  "Things to Check in Person",
  "Questions for the Landlord or Agent",
];
/** Current delivered report contract; fictional Sample Report retains its own illustrative navigation. */
export const fullReportAreas = ["Overview", "Customer Context", "Competition", "Access", "Premises", "Rent & Lease", "Actions", "Appendix"];
export function ReportOutline() {
  return (
    <section id="report" className="section-block">
      <div className="section-heading">
        <div>
          <p className="eyebrow">INSIDE THE FULL REPORT</p>
          <h2>
            Eight sections.
            <br />
            One lease decision.
          </h2>
        </div>
        <p>
          Start with the verdict, then explore the findings behind it.
          See the strengths, risks and checks that matter for your business.
        </p>
      </div>
      <ol className="report-grid">
        {fullReportAreas.map((area, index) => (
          <li key={area}>
            <span className="report-number">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>{area}</span>
          </li>
        ))}
      </ol>
      <p className="fine-print">
        Source coverage varies. A report can identify an important question
        without being able to answer it; a viewing or specialist advice may
        still be needed.
      </p>
    </section>
  );
}
