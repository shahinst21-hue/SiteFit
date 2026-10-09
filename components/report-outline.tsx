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
export function ReportOutline() {
  return (
    <section id="report" className="section-block">
      <div className="section-heading">
        <div>
          <p className="eyebrow">INSIDE THE FULL REPORT</p>
          <h2>
            A location has more
            <br />
            than one story.
          </h2>
        </div>
        <p>
          Decision-relevant sections organise the reasoning. Source coverage
          varies; unanswered questions stay visible.
        </p>
      </div>
      <ol className="report-grid">
        {reportAreas.map((area, index) => (
          <li key={area}>
            <span className="report-number">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>{area}</span>
          </li>
        ))}
      </ol>
      <p className="fine-print">
        Report structure shown for guidance. See the fictional Sample Report for
        the format and reasoning; this is not a property result.
      </p>
    </section>
  );
}
