import type {DecisionReport,EvidenceRef} from './types.ts';
export const pounds=(v:number|null)=>v===null?'Not available':new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(v);
export const dateLabel=(s:string)=>new Date(s).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/London'});
export const walkLabel=(seconds:number|null)=>seconds===null?'Route not available':`About ${Math.max(1,Math.round(seconds/60))} min walk`;
export function sourceNumbers(report:DecisionReport,ids:string[]){return [...new Set(ids.map(id=>report.refs.findIndex(r=>r.id===id)+1).filter(n=>n>0))];}
/** Compact customer qualification; the original owned evidence directory retains full technical provenance. */
export function sourceQualification(r:EvidenceRef){
  if(!r.id.startsWith('saved-'))return r.qualification;
  if(r.label.includes('ONS Census'))return 'Census 2021 allocated by area to overlapping walking contours, assuming uniform distribution. Estimated resident/household context, not current demand; do not sum cumulative areas.';
  if(r.label.includes('employee jobs'))return 'Rounded employee jobs in the native statistical area; not walking-area jobs, attendance, footfall or customer demand.';
  if(r.label.includes('household income'))return 'Wider-area modelled household income after housing costs; not personal income, disposable coffee spend or a premises-level measure.';
  if(r.label.includes('premises context'))return 'Recorded property classification is not lawful-use confirmation. Usable area, rates and a non-domestic certificate were not established.';
  if(r.label.includes('Article 4'))return 'An area record requires review of legal scope, dates and applicability. It does not establish the selected unit’s permitted use.';
  if(r.label.includes('walking areas'))return 'Walking-network model from the recorded building point; entrance, routing vintage and all barriers not independently verified. Accessibility, not measured pedestrian flow.';
  if(r.label.includes('rent context'))return 'Modelled restaurant quoting context, not this unit’s rent. Unknown model date, radius units, dispersion and coffee-format comparability; NIA cannot be exchanged for GIA.';
  if(r.label.includes('food-business register'))return 'Dated food-register extract with incomplete coverage. Inspection is not current trading proof, customer reviews, market completeness or a complete occupancy history.';
  if(r.label.includes('primary-family'))return 'Incomplete mapped inventory, not deduplicated businesses, verified direct competitors, current trading or saturation.';
  return r.qualification;
}
/** Exactly the static map's Web Mercator camera, reused by SVG and PDF. */
export function mapProject(map:NonNullable<DecisionReport['map']>,point:[number,number]):[number,number]{
  const world=([lon,lat]:[number,number])=>[(lon+180)/360,(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2];
  const p=world(point),c=world(map.center),scale=map.tileSize*2**map.zoom;
  const pixel=(n:number)=>Math.round(n*1000)/1000;
  return [pixel((p[0]-c[0])*scale+map.width/2),pixel((p[1]-c[1])*scale+map.height/2)];
}
/** Separate nearby labels without moving geographic points. SVG and PDF use identical leaders. */
export function mapMarkers(report:DecisionReport){
  if(!report.map)return [];
  const placed:{anchor:[number,number];label:[number,number];number:number}[]=[];
  for(const [i,c] of report.competitors.entries()){
    const anchor=mapProject(report.map,c.point);
    const candidates:[[number,number],...[number,number][]]=[[0,0],[26,-22],[-26,22],[26,22],[-26,-22],[0,-40],[0,40],[44,0],[-44,0]];
    const offset=candidates.find(([dx,dy])=>placed.every(p=>Math.hypot(p.label[0]-anchor[0]-dx,p.label[1]-anchor[1]-dy)>30))??[0,60];
    placed.push({anchor,label:[anchor[0]+offset[0],anchor[1]+offset[1]],number:i+1});
  }return placed;
}
