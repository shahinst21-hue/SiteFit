import "server-only";
import { collector } from "./collect.ts";
import { snapshotRepository } from "./snapshot-repository.ts";
import { onsLocal } from "./adapters/ons-local.ts";
import { tflAdapter } from "./adapters/tfl.ts";
import { fsaAdapter } from "./adapters/fsa.ts";
// Only the opt-in development probe consumes this factory in Phase 5.
export function framework(ownerId: string) {
  const repository = snapshotRepository(ownerId);
  return { repository, ...collector(repository, [onsLocal(), tflAdapter(), fsaAdapter()]) };
}
