"use client";
import {useState} from 'react';
import {Icon} from './icon';
import type {SnapshotMap} from '@/lib/snapshot/model';
import {mapViewport} from '@/lib/report-dashboard/geography';
import {snapshotTilePath} from '@/lib/snapshot/tiles';
export function SnapshotMapPanel({map,demo,reportId}:{map:SnapshotMap;demo:boolean;reportId?:string}){
 const [hidden,setHidden]=useState<string[]>([]),[zoom,setZoom]=useState(0),[pan,setPan]=useState(0),[selected,setSelected]=useState(''),[loaded,setLoaded]=useState(false),[failed,setFailed]=useState(false);
 const available=map.status==='available'&&map.bounds!==null&&map.layers.some(l=>l.status==='available');
 const original=map.bounds??[-.1,51.5,-.09,51.51],w=(original[2]-original[0])/2**zoom,h=(original[3]-original[1])/2**zoom,cx=(original[0]+original[2])/2+pan*(original[2]-original[0]),cy=(original[1]+original[3])/2;
 const view=mapViewport([cx-w/2,cy-h/2,cx+w/2,cy+h/2]);
 const layers=map.layers.filter(l=>l.status==='available'&&!hidden.includes(l.id));
 const features=layers.flatMap(l=>(l.features??[]).map(f=>({...f,layer:l.label})));
 const selection=features.find(f=>f.id===selected);
 return <figure className="sf-map" aria-labelledby="map-caption">
  {available?<><svg className="sf-map-canvas" viewBox="0 0 800 440" role="group" aria-label={demo?'Illustrative location diagram':map.description}>
   <rect width="800" height="440" fill="#eef0e9"/>
   {loaded&&!failed&&reportId&&!demo&&view.tiles.map(t=><image key={t.url} href={snapshotTilePath(reportId,t.url)} x={t.x} y={t.y} width={t.size+.5} height={t.size+.5} onError={()=>setFailed(true)}/>)}
   {!loaded&&<text x="400" y="34" textAnchor="middle" fill="#60646c" fontSize="14">{demo?'Illustrative geometry':'Stored geographic records · load street map for context'}</text>}
   {layers.map(layer=><g key={layer.id}>{layer.polygons.map((p,i)=><polygon key={i} points={p.map(p=>view.project(p).join(',')).join(' ')} fill="#60646c" fillOpacity=".1" stroke="#60646c"/>)}{layer.polygonParts?.map((rings,i)=><path key={'part-'+i} d={rings.map(r=>'M'+r.map(p=>view.project(p).join(',')).join('L')+'Z').join(' ')} fillRule="evenodd" fill="#60646c" fillOpacity=".12" stroke="#60646c"/>)}{layer.points.map((p,i)=>{const [x,y]=view.project(p),feature=layer.features?.[i],anchor=layer.kind==='property',active=feature?.id===selected;return <g key={feature?.id??i} transform={`translate(${x} ${y})`} className={feature?'sf-map-feature':undefined} onClick={feature?()=>setSelected(feature.id):undefined}>
    {anchor?<><circle r="17" fill="#b2f34c" stroke="white" strokeWidth="3"/><circle r="5" fill="#0d1400"/><text x="22" y="5" fill="#0d1400" fontSize="12" stroke="white" strokeWidth="4" paintOrder="stroke">{layer.id==='context-origin'?'Location context':'Recorded point'}</text></>:<><circle r="12" fill="transparent"/><circle r={active?9:6} fill={active?'#b2f34c':layer.kind==='transport'?'#0d1400':'#60646c'} stroke="white" strokeWidth="2"/></>}<title>{feature?`${feature.label} · ${layer.label}`:layer.label}</title></g>;})}</g>)}
  </svg>
  <div className="sf-map-tools"><button aria-label="Zoom in on map" disabled={zoom>=3} onClick={()=>setZoom(v=>v+1)}><Icon name="add"/></button><button aria-label="Zoom out on map" disabled={zoom<=0} onClick={()=>setZoom(v=>v-1)}><Icon name="minus"/></button><button aria-label="Pan map west" disabled={pan<=-.5} onClick={()=>setPan(v=>v-.25)}><Icon name="back"/></button><button aria-label="Pan map east" disabled={pan>=.5} onClick={()=>setPan(v=>v+.25)}><Icon name="arrow"/></button><button aria-label="Reset map" onClick={()=>{setZoom(0);setPan(0);}}><Icon name="reset"/></button>{reportId&&!demo&&!loaded&&<button className="sf-map-load" onClick={()=>setLoaded(true)}>Load street map <Icon name="pin"/></button>}<span>Source locations · not verified entrances</span></div>
  <div className="sf-map-legend" role="group" aria-label="Map layers">{map.layers.map(l=><label key={l.id}><input type="checkbox" checked={!hidden.includes(l.id)} disabled={l.status!=='available'} onChange={()=>setHidden(v=>v.includes(l.id)?v.filter(id=>id!==l.id):[...v,l.id])}/>{l.label}</label>)}</div>
  {features.length>0&&<div className="sf-map-selection"><label>Inspect a saved location <select value={selection?.id??''} onChange={e=>{setSelected(e.target.value);setZoom(0);setPan(0);}}><option value="">Choose a register record</option>{features.map(f=><option key={f.id} value={f.id}>{f.label} · {f.layer.startsWith('FSA')?'FSA':'TfL'}</option>)}</select></label>{selection&&<p><strong>{selection.label}</strong> · {selection.layer}. Source precision and current operating status are unverified.</p>}</div>}
  </>:<div className="sf-map-empty"><Icon name="pin"/><p>{map.status==='loading'?'Preparing saved location evidence…':'No qualified coordinates were retained for this Snapshot.'}</p><p>No point or catchment has been invented.</p></div>}
  <figcaption id="map-caption" className="sf-map-caption"><p>{demo?'Illustrative geometry only.':map.description}</p>{failed&&<p role="status">Street tiles could not be loaded. Saved geographic layers remain available; no automatic retry.</p>}{loaded&&<span>Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Geoapify</a> · © <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a></span>}</figcaption>
 </figure>;
}
