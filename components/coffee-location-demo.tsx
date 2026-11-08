"use client";

import { useState } from "react";
import Link from "next/link";
import { Arrow, Wordmark } from "./ui";
import { Icon } from "./icon";
import { ReportMap, type ReportMapData } from "./report-dashboard/map";

type Walk = { minutes: number; residents: number; competitors: number };
const notes = [
  { title: "The immediate neighbourhood", text: "Start with repeat local custom. Walk the closest alternatives and compare queues, opening hours, food and seating. A residential base is a reason to investigate, not proof of coffee demand." },
  { title: "A wider choice of coffee", text: "More residents sit within reach, alongside more alternatives. Test what would make someone choose your café: a convenient route, a different offer or a better fit for their routine." },
  { title: "A wider catchment needs a reason to travel", text: "Do not treat everyone within a 15-minute walk as a potential regular. Check barriers, competing destinations and whether your concept gives people a reason to pass closer cafés." },
];

/** Only already-public sample geometry/aggregates enter this component. No source collection or generation. */
export function CoffeeLocationDemo({ walks, map }: { walks: Walk[]; map: ReportMapData['map'] }) {
  const [selected, setSelected] = useState(1);
  const walk = walks[selected];
  const selectedMap = map ? { ...map, layers:map.layers.filter((_,i)=>i===selected) } : null;
  const mapReport: ReportMapData = {
    map:selectedMap, transport:[], operators:null, presentationMode:'public-sample',
    spatialNotices:['Saved public Sample Report walking geometry. The selected-property pin and generic transport points are omitted. Walking areas are modelled; population estimates are Census 2021 context, not observed visits.'],
  };
  return <div className="home-preview coffee-demo">
    <div className="home-preview-toolbar"><Wordmark /><span className="badge">Interactive sample</span></div>
    <div className="coffee-demo-toolbar"><div><span className="icon-disc amber"><Icon name="coffee" /></span><div><h3>London coffee shop</h3><p>Customers, competition & walking catchments</p></div></div><Link className="text-link" href="/sample-report?section=customer-context">Open full sample <Arrow /></Link></div>
    <div className="coffee-demo-grid">
      <div className="coffee-map-panel">
        <div className="coffee-walk-controls" role="group" aria-label="Choose example walking area">
          {walks.map((w, i) => <button key={w.minutes} type="button" aria-pressed={selected === i} onClick={() => setSelected(i)}>{w.minutes} min walk</button>)}
        </div>
        <ReportMap report={mapReport} />
      </div>
      <div className="coffee-demo-insights" aria-live="polite" aria-atomic="true">
        <p className="eyebrow">WITHIN A {walk.minutes}-MINUTE WALK</p>
        <div className="coffee-demo-metrics"><div><span className="home-preview-disc"><Icon name="demand" /></span><strong>~{Math.round(walk.residents).toLocaleString('en-GB')}</strong><span>estimated residents</span></div><div><span className="home-preview-disc"><Icon name="shop" /></span><strong>{walk.competitors}</strong><span>coffee / café records</span></div></div>
        <div className="coffee-range-chart" aria-label="Estimated residents by walking area">
          {walks.map((w,i) => <div key={w.minutes} className={i===selected ? 'is-selected' : ''}><span>{w.minutes} min</span><div><i style={{width:`${w.residents/walks[2].residents*100}%`}} /></div><span>~{Math.round(w.residents/1000*10)/10}k</span></div>)}
        </div>
        <div className="coffee-reading"><p className="eyebrow">WHAT THIS MEANS FOR A CAFÉ</p><h3>{notes[selected].title}</h3><p>{notes[selected].text}</p></div>
        <Link className="text-link" href="/sample-report?section=competition">Explore nearby alternatives <Arrow /></Link>
      </div>
    </div>
    <details className="coffee-demo-sources"><summary>Where these figures come from</summary><p>Reused from SiteFit’s reviewed, anonymised public Sample Report, prepared 30 October 2026. Resident estimates allocate Census 2021 population to modelled walking areas; they are not current footfall, customer counts or sales forecasts. Coffee / café records are cumulative within each area and may be incomplete or out of date. The map uses the sample’s saved walking geometry with the existing report map component and OpenStreetMap street background. No selected-property pin or invented café positions are shown. <Link href="/sample-report?section=appendix">Inspect sample evidence and limitations.</Link></p></details>
  </div>;
}
