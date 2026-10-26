import type {FreeProjection} from './projection.ts';
import type {Catalog} from '../report-intelligence/catalog.ts';

/** A structural Ready state is not evidence. Do not sell a wholly empty check.
 * Partial evidence and observed zero remain useful; no score is required. */
export function snapshotHasUsableEvidence(report:FreeProjection){
 return report.dimensions.some(d=>d.why.sources.length>0&&d.why.observations.some(o=>
  typeof o.value==='number'?Number.isFinite(o.value):typeof o.value==='string'&&o.value.trim().length>0));
}
/** Unknowns/actions alone cannot become a successfully delivered paid analysis. */
export function fullHasGroundedFindings(catalog:Catalog){
 const facts=new Set(catalog.facts.map(f=>f.id));
 return catalog.atoms.some(a=>!['overview','actions','appendix'].includes(a.section)&&a.role==='reason'&&a.factIds.some(id=>facts.has(id)));
}
