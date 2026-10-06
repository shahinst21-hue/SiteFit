"use client";
import { useState } from "react";
import { Icon } from "./icon";
import type { SnapshotMap } from "@/lib/snapshot/model";
export function SnapshotMapPanel({ map, demo }: { map: SnapshotMap; demo: boolean }) {
  const [hidden, setHidden] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const available = map.status === "available" && map.bounds !== null && map.layers.some(l => l.status === "available");
  const project = ([lon, lat]: [number, number]) => { const [west, south, east, north] = map.bounds!; return `${(lon - west) / (east - west) * 800},${(north - lat) / (north - south) * 420}`; };
  return <figure className={`sf-map ${available ? "sf-map-populated" : ""}`} aria-labelledby="map-caption">
    {map.status === "loading" ? <div className="sf-map-empty" role="status"><span className="sf-skeleton sf-skeleton-map" /><p>Loading location context…</p></div> : available ? <>
      <svg viewBox="0 0 800 420" role="img" aria-label={demo ? "Schematic demo catchments and example places. Not a real street map." : map.description}>
        <rect width="800" height="420" fill="#eef2ef" />
        {demo && <g aria-hidden="true"><g fill="#e0e6e2" stroke="#fff" strokeWidth="3">{Array.from({ length: 48 }, (_, i) => <rect key={i} x={i % 8 * 108 - 25} y={Math.floor(i / 8) * 86 - 18} width="86" height="64" rx="2" transform={`rotate(-12 ${i % 8 * 108} ${Math.floor(i / 8) * 86})`} />)}</g><path d="M-50 340C80 275 180 355 310 297S510 350 620 285 780 250 850 330" stroke="#bcdbe8" strokeWidth="35" fill="none" /><g stroke="white" strokeWidth="9"><path d="M-30 70 840 325M-30 220 810 30M150-20 540 450M640-20 280 450M-30 385 850 150" /></g></g>}
        <g transform={`translate(400 210) scale(${zoom}) translate(-400 -210)`}>{map.layers.filter(l => l.status === "available" && !hidden.includes(l.id)).map(layer => <g key={layer.id}>
          {layer.polygons.map((p, i) => <polygon key={i} points={p.map(project).join(" ")} fill={layer.colour} fillOpacity=".2" stroke={layer.colour} strokeWidth="1.5"><title>{layer.label}</title></polygon>)}
          {layer.points.map((p, i) => { const [x, y] = project(p).split(",").map(Number); return layer.kind === "property" ? <g key={i} transform={`translate(${x} ${y})`}><path d="M0 0C-5-8-15-18-15-27a15 15 0 0 1 30 0C15-18 5-8 0 0Z" fill={layer.colour} stroke="white" strokeWidth="2" /><circle cx="0" cy="-27" r="5" fill="white" /><title>{layer.label}</title></g> : <circle key={i} cx={x} cy={y} r="5" fill={layer.colour} stroke="white" strokeWidth="1.5"><title>{layer.label}</title></circle>; })}
        </g>)}</g>
      </svg>
      <div className="sf-map-controls"><button type="button" aria-label="Zoom in on diagram" disabled={zoom >= 1.8} onClick={() => setZoom(v => Math.min(1.8, v + .2))}>+</button><button type="button" aria-label="Zoom out on diagram" disabled={zoom <= 1} onClick={() => setZoom(v => Math.max(1, v - .2))}>−</button></div>
      <details className="sf-map-legend" open><summary>Map layers</summary><div>{map.layers.map(layer => <label key={layer.id}><input type="checkbox" checked={!hidden.includes(layer.id)} disabled={layer.status !== "available"} onChange={() => setHidden(v => v.includes(layer.id) ? v.filter(id => id !== layer.id) : [...v, layer.id])} /><span style={{ background: layer.colour }} />{layer.label}{layer.status !== "available" ? " · Not available" : ""}</label>)}</div></details>
      <span className="sf-map-marker">{demo ? "Demo diagram" : "Stored location layers"}</span>
    </> : <div className="sf-map-empty"><span className="sf-map-empty-pin"><Icon name="pin" /></span><p className="eyebrow">LOCATION CONTEXT</p><h3>Map layers not available</h3><p>{map.description}</p><div className="sf-map-awaiting"><span>Walking catchments</span><span>Nearby businesses</span><span>Transport routes</span></div></div>}
    <figcaption id="map-caption">{demo ? "Illustrative geometry · not a real street map or measured catchment" : "No estimated routes or property point substituted for missing map data."}</figcaption>
  </figure>;
}
