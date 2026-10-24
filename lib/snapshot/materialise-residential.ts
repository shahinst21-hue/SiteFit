import type {FreeProjection} from '../analysis/projection.ts';
import type {ResidentialScore,ResidentialState} from '../analysis/residential-catchment.ts';
import {recommendationFromScores} from '../analysis/recommendation.ts';

/** Current read interpretation only. The stored Ready edition is never changed. */
export function materialiseResidential(projection:FreeProjection,material:{score:ResidentialScore|null;state:ResidentialState}):FreeProjection {
 if(!material.score||projection.residentialCatchment)return {...projection,residentialState:material.state};
 const decision=recommendationFromScores(material.score,projection.competition,projection.recommendation?.inputs.premises,projection.recommendation?.inputs.access);
 return {...projection,residentialCatchment:material.score,residentialState:material.state,recommendation:decision,
  earlyView:{...projection.earlyView,advisor:undefined,headline:decision.title,reason:decision.why,
   coverage:`Current evidence interpretation · ${projection.earlyView.coverage}`}};
}
