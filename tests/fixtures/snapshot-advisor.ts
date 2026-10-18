import type {SnapshotAdvice,AdvisorStatement} from '../../lib/analysis/advisor.ts';
export function advisorFixture(stance:SnapshotAdvice['stance']='conditional',coffee=true):SnapshotAdvice {
 const statement=(text:string,sectionIds:AdvisorStatement['sectionIds']):AdvisorStatement=>({text,sectionIds});
 return {version:'snapshot-advisor-v1',stance,
  recommendation:statement(stance==='not_recommended'?'Look elsewhere for the present concept.':'Keep this location on your shortlist, but obtain the use documents before making an offer.',['customer-base','market-position','customer-access','premises']),
  why:statement('The recorded resident and food-business context warrants a targeted viewing; neither establishes customers for this concept.',['customer-base','market-position']),
  counterargument:statement('The intended use and the physical suitability of this unit remain unverified.',['premises']),
  change:statement('Evidence that the intended use is incompatible would move this location off the shortlist.',['premises']),
  action:statement('Request permitted-use documents and a measured plan from the landlord before making an offer; an incompatible use would change the decision.',['premises']),
  leaseCommitment:'withhold',formats:coffee?[
   {id:'takeaway',assessment:statement('Test quick collection against the actual approach and queue space before prioritising a takeaway-led offer.',['customer-access','premises'])},
   {id:'specialty',assessment:statement('Compare genuinely similar coffee offers before choosing a specialty proposition; register records cannot establish a gap.',['market-position'])},
   {id:'seated',assessment:statement('Do not prioritise a sit-in format until a measured plan supports the customer experience; no seating capacity is established.',['premises'])},
  ]:[]};
}
