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
  "Economics",
  "Scenario Analysis",
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
          <p className="eyebrow">THE PLANNED FULL REPORT</p>
          <h2>
            A location has more
            <br />
            than one story.
          </h2>
        </div>
        <p>
          Sixteen areas to help organise your decision. Source coverage varies;
          unanswered questions stay visible.
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
        Report structure shown for guidance. Analysis and reports are not
        available yet; this is not a result for a property.
      </p>
    </section>
  );
}
