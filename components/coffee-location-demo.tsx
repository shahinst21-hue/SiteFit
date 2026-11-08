"use client";

import { useState } from "react";
import Link from "next/link";
import { Arrow } from "./ui";

type Walk = { minutes: number; residents: number; competitors: number };
const notes = [
  { title: "The immediate neighbourhood", text: "Start with repeat local custom. Walk the closest alternatives and compare queues, opening hours, food and seating. A residential base is a reason to investigate, not proof of coffee demand." },
  { title: "A wider choice of coffee", text: "More residents sit within reach, alongside more alternatives. Test what would make someone choose your café: a convenient route, a different offer or a better fit for their routine." },
  { title: "A wider catchment needs a reason to travel", text: "Do not treat everyone within a 15-minute walk as a potential regular. Check barriers, competing destinations and whether your concept gives people a reason to pass closer cafés." },
];
const pins = [[245,205],[320,255],[265,300],[365,195],[180,175],[385,295],[170,285],[285,130],[420,220],[220,350],[355,350],[140,225]];

/** No map tiles, APIs, customer records or analytical execution. Props are reviewed public aggregates only. */
export function CoffeeLocationDemo({ walks }: { walks: Walk[] }) {
  const [selected, setSelected] = useState(1);
  const [showCompetition, setShowCompetition] = useState(true);
  const walk = walks[selected];
  return <div className="coffee-demo">
    <div className="coffee-demo-toolbar">
      <div><span className="coffee-dot" /> EXAMPLE ANALYSIS <span className="coffee-demo-place">/ London coffee shop</span></div>
      <span className="coffee-example-label">Public sample figures · Schematic map</span>
    </div>
    <div className="coffee-demo-grid">
      <div className="coffee-map-panel">
        <div className="coffee-walk-controls" role="group" aria-label="Choose example walking area">
          {walks.map((w, i) => <button key={w.minutes} type="button" aria-pressed={selected === i} onClick={() => setSelected(i)}>{w.minutes} min walk</button>)}
        </div>
        <svg className="coffee-map" viewBox="0 0 560 460" role="img" aria-label={`Schematic neighbourhood, ${walk.minutes}-minute walking area selected. Illustrative markers do not locate the sample businesses.`}>
          <defs><pattern id="coffee-blocks" width="75" height="62" patternUnits="userSpaceOnUse" patternTransform="rotate(-17)"><rect width="75" height="62" fill="#f6f6f2"/><rect x="7" y="7" width="61" height="48" rx="4" fill="#e7e9e1"/></pattern></defs>
          <rect width="560" height="460" fill="url(#coffee-blocks)"/>
          <path d="M-20 330 Q160 245 230 100 T440 -20 M70 480 Q170 320 365 265 T590 80 M-20 95 Q180 170 590 390" stroke="white" strokeWidth="23" fill="none"/>
          <path d="M420 -20 Q350 150 460 245 T520 480" stroke="#d4e1dc" strokeWidth="30" fill="none"/>
          <path d="M55 350 L130 323 L180 365 L130 418 L65 400Z" fill="#cdddbd"/>
          {[185,132,77].map((r, i) => <ellipse key={r} cx="280" cy="240" rx={r * 1.15} ry={r} transform="rotate(-17 280 240)" fill={selected === 2-i ? '#b2f34c44' : '#b2f34c0b'} stroke={selected === 2-i ? '#487023' : '#9caa8c'} strokeWidth={selected === 2-i ? 2 : 1} strokeDasharray={selected === 2-i ? undefined : '5 5'}/>)}
          {showCompetition && pins.slice(0, selected === 0 ? 4 : selected === 1 ? 8 : 12).map(([x,y],i) => <g key={i}><circle cx={x} cy={y} r="10" fill="#fff" stroke="#535d46"/><circle cx={x} cy={y} r="3" fill="#535d46"/></g>)}
          <circle cx="280" cy="240" r="23" fill="#0d1400"/><path d="M272 238h16v9h-16z M288 240h4v5h-4 M275 232v3 M281 230v5" fill="none" stroke="#b2f34c" strokeWidth="2"/>
          <text x="301" y="399" fontSize="12" fill="#535d46" letterSpacing="2">ILLUSTRATIVE STREETS</text>
        </svg>
        <div className="coffee-map-legend"><span><i />Example site</span><button type="button" aria-pressed={showCompetition} onClick={() => setShowCompetition(!showCompetition)}><span aria-hidden="true">{showCompetition ? '☑' : '☐'}</span> Café markers</button></div>
        <p className="coffee-map-note">Illustrative geography and marker positions; markers are not a complete count or actual business locations. Real reports use modelled walking areas.</p>
      </div>
      <div className="coffee-demo-insights" aria-live="polite" aria-atomic="true">
        <p className="eyebrow">WITHIN A {walk.minutes}-MINUTE WALK</p>
        <div className="coffee-demo-metrics"><div><strong>~{Math.round(walk.residents).toLocaleString('en-GB')}</strong><span>estimated residents</span></div><div><strong>{walk.competitors}</strong><span>coffee / café records</span></div></div>
        <div className="coffee-range-chart" aria-label="Estimated residents by walking area">
          {walks.map((w,i) => <div key={w.minutes} className={i===selected ? 'is-selected' : ''}><span>{w.minutes} min</span><div><i style={{width:`${w.residents/walks[2].residents*100}%`}} /></div><span>~{Math.round(w.residents/1000*10)/10}k</span></div>)}
        </div>
        <div className="coffee-reading"><span className="coffee-small-label">WHAT THIS MEANS FOR A CAFÉ</span><h3>{notes[selected].title}</h3><p>{notes[selected].text}</p></div>
        <Link className="text-link" href="/sample-report?section=competition">Inspect the full sample <Arrow /></Link>
      </div>
    </div>
    <details className="coffee-demo-sources"><summary>Where these figures come from</summary><p>Reused from SiteFit’s reviewed, anonymised public Sample Report, prepared 30 October 2026. Resident estimates allocate Census 2021 population to modelled walking areas; they are not current footfall, customer counts or sales forecasts. Coffee / café records are cumulative within each area and may be incomplete or out of date. The chart and interpretation are marketing presentations of those aggregates. The map is entirely schematic. <Link href="/sample-report?section=appendix">Inspect sample evidence and limitations.</Link></p></details>
  </div>;
}
