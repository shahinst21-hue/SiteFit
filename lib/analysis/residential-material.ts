import "server-only";
import type { CollectionContext, StoredSnapshot } from '../data/contracts.ts';
import { queryPoint } from '../data/query-point.ts';
import { enrichedEvidence } from './enriched-evidence.ts';
import { residentialFromEvidence, type ResidentialScore, type ResidentialState } from './residential-catchment.ts';
import {validateCatchmentSources} from '../data/catchment-sources.ts';
import {catchmentAllocationOperands} from './catchment-operands.ts';
import {object} from '../data/validation.ts';
import censusColumns from '../data/census-columns.json' with {type:'json'};
export type ResidentialMaterial = {score:ResidentialScore|null;state:ResidentialState};
/** Deterministic interpretation of the frozen source pair. No provider, AI,
 * database write, reservation or mutable latest-source selection is possible. */
export function residentialMaterial(context:CollectionContext,snapshots:readonly StoredSnapshot[],at:Date):ResidentialMaterial {
 const absent=(state:ResidentialState):ResidentialMaterial=>({score:null,state});
 if(context.schemaVersion!==2||!context.region.eligible||!queryPoint(context))return absent('unsupported');
 const pair=snapshots.filter(s=>['geoapify-walking','ons-catchments'].includes(s.result.meta.source));
 if(pair.length!==2||new Set(pair.map(s=>s.result.meta.source)).size!==2)return absent('source_unavailable');
 if(pair.some(s=>['unsupported','not_applicable'].includes(s.result.outcome)))return absent('unsupported');
 if(pair.some(s=>!s.result.payload))return absent('source_unavailable');
 try {
  // Checks exact origin, releases, checksums, input, collection and parent lineage.
  const {evidence}=enrichedEvidence(context,pair,at);
  // Stable source/path identifiers for this read projection; these are not new
  // persisted evidence rows and cannot alter the historical AI's evidence IDs.
  for(const e of evidence)if(e.kind==='derived')e.id=`${e.snapshotId}:${e.source.dataset}`;
  const score=residentialFromEvidence(evidence,context.businessType,queryPoint(context),at);
  if(score)return {score,state:'ready'};
  const rows=evidence.filter(e=>e.source.dataset.startsWith('TS007A total,'));
  return absent(rows.length===3&&rows.some(e=>!e.quality.available)?'partial_coverage':'invalid_evidence');
 }catch{return absent('invalid_evidence');}
}

/** A new read-policy interpretation, never a replacement for a stored source.
 * Certificate is server-computed from this exact owned report's frozen polygon.
 * Run original checksum/lineage validation before using any old population. */
export function residentialWithExtent(context:CollectionContext,snapshots:readonly StoredSnapshot[],at:Date,certificate:unknown):ResidentialMaterial {
 const original=residentialMaterial(context,snapshots,at);
 if(original.score||original.state!=='partial_coverage')return original;
 try {
  const proof=object(certificate),w=snapshots.find(s=>s.result.meta.source==='geoapify-walking'),p=snapshots.find(s=>s.result.meta.source==='ons-catchments');
  if(!w||!p||proof.walkingId!==w.id||proof.populationId!==p.id||proof.walkingChecksum!==w.result.meta.checksum||proof.populationChecksum!==p.result.meta.checksum||!Array.isArray(proof.parts)||proof.parts.length!==3)return original;
  const {evidence}=enrichedEvidence(context,snapshots,at),source=validateCatchmentSources(p.result.payload);
  for(let i=0;i<3;i++){
   const part=object(proof.parts[i]),range=source.ranges[i],table=range.statistics[0];
   if(part.seconds!==range.seconds||table.dataset!=='TS007A'||table.outcome!=='success')return original;
   const raw=object(table.operands);
   if(raw.schemaVersion!==2||raw.methodVersion!=='area-uniform-bng2')return original;
   const certified={...raw,schemaVersion:3,methodVersion:'area-uniform-bng3',coverageExtent:{version:'ons-london-bfe-2021-v1',sha256:'955fbae44301c2191d0c20f1fdfefb53c07a953a19b484f99003b0f15cd135cd',outsideAreaM2:part.outsideAreaM2,clippedGapAreaM2:Math.max(0,Number(raw.catchmentAreaM2)-Number(raw.londonCoveredAreaM2))}};
   const allocation=catchmentAllocationOperands(certified,{...source.releases,censusReleaseId:table.releaseId},censusColumns.TS007A.columns.length);
   // TS007A column count comes from the admitted source, not a missing-as-zero rule.
   if(allocation.metrics[0].state!=='available')return original;
   const row=evidence.find(e=>e.source.dataset===`TS007A total, ${range.seconds/60} minute walking estimate`);
   if(!row)return original;
   row.value=allocation.metrics[0].knownContribution;row.quality.available=true;
  }
  for(const e of evidence)if(e.kind==='derived')e.id=`${e.snapshotId}:${e.source.dataset}`;
  const score=residentialFromEvidence(evidence,context.businessType,queryPoint(context),at);
  return score?{score,state:'ready'}:original;
 }catch{return original;}
}
