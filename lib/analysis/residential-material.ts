import "server-only";
import type { CollectionContext, StoredSnapshot } from '../data/contracts.ts';
import { queryPoint } from '../data/query-point.ts';
import { enrichedEvidence } from './enriched-evidence.ts';
import { residentialFromEvidence, type ResidentialScore, type ResidentialState } from './residential-catchment.ts';
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
