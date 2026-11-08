import Link from "next/link";
import { Icon } from "./icon";
import { Wordmark } from "./ui";
import type { Dashboard } from "@/lib/report-dashboard/model";

/** Server-rendered public sample preview, using the homepage's report presentation. */
export function CoffeeReportPreview({ report }: {
  report: Pick<Dashboard, "residentialCatchment" | "competition" | "recommendation">;
}) {
  const scores = [
    { title: "Residential Catchment", section: "customer-context", icon: "demand" as const,
      value: report.residentialCatchment?.score, rating: report.residentialCatchment?.rating,
      description: "Resident context within the modelled walking areas." },
    { title: "Competition Headroom", section: "competition", icon: "shop" as const,
      value: report.competition?.score, rating: report.competition?.rating,
      description: "Category records relative to the residential catchment." },
  ];
  return <div className="home-preview coffee-report-dashboard" aria-label="Preview of the existing public coffee shop Sample Report">
    <header className="home-preview-toolbar"><Wordmark /><span className="badge">Sample Report</span></header>
    <div className="home-preview-title">
      <span className="icon-disc amber"><Icon name="coffee" /></span>
      <div><h3>London coffee shop</h3><p>Anonymised public sample · Coffee shop analysis</p></div>
    </div>
    <div className="coffee-report-workspace">
      <nav aria-label="Explore sample report sections">
        {([
          ["overview", "Overview", "document"],
          ["customer-context", "Customers", "demand"],
          ["competition", "Competition", "shop"],
          ["rental-context", "Rent & Lease", "cost"],
        ] as const).map(([section, label, icon]) => <Link key={section} href={`/sample-report?section=${section}`}>
          <Icon name={icon} />{label}<Icon name="arrow" />
        </Link>)}
      </nav>
      <div className="coffee-report-panels">
        <div className="coffee-report-status"><span className="badge caution">{report.recommendation?.title}</span><span>Permission & layout unresolved</span></div>
        <div className="coffee-report-scores">
          {scores.map(score => <section className="home-preview-score" key={score.title}>
            <h4><span className="home-preview-disc"><Icon name={score.icon} /></span>{score.title}</h4>
            <div className="home-score-result"><strong>{score.value ?? "—"}<small>/100</small></strong><span>{score.rating}</span></div>
            {typeof score.value === "number" && <div className="home-score-scale" role="img" aria-label={`${score.title}: ${score.value} out of 100, ${score.rating}`}><i style={{left:`${score.value}%`}} /></div>}
            <p>{score.description}</p>
            <Link className="text-link" href={`/sample-report?section=${score.section}`}>Explore the evidence <Icon name="arrow" /></Link>
          </section>)}
        </div>
        <div className="coffee-report-next"><span className="icon-disc"><Icon name="shield" /></span><div><p className="eyebrow">NEXT CHECK</p><p>Confirm permitted use and a measured layout before choosing the café format.</p></div></div>
      </div>
    </div>
    <p className="coffee-report-disclosure">Public sample scores describe separate evidence dimensions, not business success or an overall location rating. <Link href="/sample-report?section=appendix">Sources & limitations <Icon name="arrow" /></Link></p>
  </div>;
}
