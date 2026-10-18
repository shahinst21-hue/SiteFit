"use client";
import {useState} from 'react';
import type {SnapshotAdvice} from '@/lib/analysis/advisor';
import type {SnapshotMap,SnapshotFactor} from '@/lib/snapshot/model';
import {recommendationPosition,densityComparison,distanceRing,mapRecords} from '@/lib/snapshot/visuals';
import {mapViewport} from '@/lib/report-dashboard/geography';
import {snapshotTilePath} from '@/lib/snapshot/tiles';
import {readableNumber} from '@/lib/report-dashboard/display';

export function RecommendationIndicator({stance}:{stance?:SnapshotAdvice['stance']}){
 const current=recommendationPosition(stance);
 return <figure className="sf-recommendation-scale" data-stance={stance??'unassessed'} role="img" aria-label={current?`SiteFit recommendation: ${current.label}. Qualitative category, not a numerical score.`:'No saved recommendation stance supplied.'}>
  <div aria-hidden="true">{current?<span className="sf-scale-current">{current.label}</span>:<span className="sf-scale-unassessed">Recommendation not supplied</span>}<div className="sf-scale-track">{current&&<span className="sf-scale-marker" style={{left:current.position+'%'}}/>}</div><div className="sf-scale-labels"><span>Look elsewhere</span><span>Check first</span><span>Pursue</span></div></div>
  <figcaption>Qualitative recommendation · not a score</figcaption>
 </figure>;
}

export function ResidentComparison({comparison}:{comparison:NonNullable<SnapshotFactor['details']>['comparison']}){
 const c=densityComparison(comparison);if(!c)return null;
 const n=Math.round(c.percentile!),suffix=n%100>=11&&n%100<=13?'th':({1:'st',2:'nd',3:'rd'} as Record<number,string>)[n%10]??'th';
 return <figure className="sf-resident-comparison" role="img" aria-label={`Census resident density: ${readableNumber(c.density!,c.units)} ${c.units}. ${n}${suffix} percentile across ${c.peers} other comparable Census areas. Not customer demand.`}>
  <div><strong>{n}<small>{suffix}</small></strong><span>Density percentile<small>{c.peers} other Census areas</small></span></div>
  <div className="sf-comparison-track" aria-hidden="true"><i style={{left:c.percentile+'%'}}/></div><div className="sf-comparison-labels" aria-hidden="true"><span>Lower density</span><span>Higher density</span></div>
  <figcaption>{readableNumber(c.density!,c.units)} {c.units} · whole-area residential context</figcaption>
 </figure>;
}

export function TransportMiniMap({map,reportId,demo}:{map?:SnapshotMap;reportId?:string;demo:boolean}){
 const [failed,setFailed]=useState(false);
 const stops=map?mapRecords(map).filter(r=>r.category==='transport'):[],origin=map?.layers.find(l=>l.kind==='property'&&l.status==='available')?.points[0];
 if(!map?.bounds||!stops.length)return null;
 const view=mapViewport(map.bounds,280,140),postcode=map.layers.some(l=>l.kind==='property'&&l.label.includes('Postcode'));
 return <figure className="sf-transport-mini"><a href="#snapshot-map-title" aria-label={`Explore ${stops.length} saved transport-stop positions on the location map`}><svg viewBox="0 0 280 140" role="img" aria-label={`${stops.length} recorded transport stops at their saved coordinates. ${postcode?'Postcode centre, not the premises entrance.':'Recorded origin, entrances unverified.'} Open the location map for names and approximate distances.`}>
  <rect width="280" height="140" fill="#f0f3ee"/>
  {!failed&&reportId&&!demo&&view.tiles.map(t=><image key={t.url} href={snapshotTilePath(reportId,t.url)} x={t.x} y={t.y} width={t.size+.5} height={t.size+.5} onError={()=>setFailed(true)}/>)}
  {origin&&<path d={'M'+distanceRing(origin,250).map(p=>view.project(p).join(',')).join('L')+'Z'} fill="#b2f34c" fillOpacity=".08" stroke="#60646c" strokeDasharray="3 4" strokeWidth=".7"/>}
  {stops.map(r=>{const [x,y]=view.project(r.position);return <circle key={r.id} cx={x} cy={y} r="3.5" fill="#60646c" stroke="#cbedff" strokeWidth="2"><title>{r.label}</title></circle>;})}
  {origin&&(()=>{const [x,y]=view.project(origin);return <g><circle cx={x} cy={y} r="7" fill="#b2f34c" stroke="#0d1400" strokeWidth="1.5"/><circle cx={x} cy={y} r="2" fill="#0d1400"/></g>;})()}
  <text x="12" y="18" fontSize="9" fontWeight="600" fill="#0d1400" stroke="white" strokeWidth="3" paintOrder="stroke">N ↑</text>
 </svg><span className="sf-mini-open">Explore stops ↗</span></a>
 {!demo&&reportId&&<div className="sf-mini-attribution"><a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Geoapify</a> · © <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OSM</a></div>}
 <figcaption><i className="sf-mini-stop-key"/>TfL stops <i className="sf-mini-origin-key"/>{postcode?'Postcode centre':'Recorded origin'}{origin&&<span> · 250 m straight-line guide</span>}{failed&&<span> · Street tiles unavailable</span>}</figcaption></figure>;
}
