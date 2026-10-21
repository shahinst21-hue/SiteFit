import {competitionUnavailable,competitionScore,type CompetitionResult} from '../../lib/competition/model.ts';
/** Synthetic fixed operands, never a live provider recording or property assessment. */
export function competitionFixture(counts:[number,number,number]=[5,13,24]):CompetitionResult{
 const result=competitionUnavailable('coffee-shop','incomplete','Synthetic formula and UI fixture only.');
 result.populations=[3500,9000,25000];result.counts=counts;result.recordTotal=counts[2];result.provenance={...result.provenance,collectionId:'00000000-0000-4000-8000-000000000001',walkingSnapshotId:'00000000-0000-4000-8000-000000000002',walkingChecksum:'a'.repeat(64),populationSnapshotIds:['00000000-0000-4000-8000-000000000003'],origin:{longitude:-.1,latitude:51.5,precision:'postcode_centroid'},retrievedAt:'2026-10-21T10:00:00Z',complete:true,spatialVerified:true,coverageVerified:true,pages:1,reservedCredits:25};
 return {...result,...competitionScore(result.populations,counts)!,state:'ready'};
}
