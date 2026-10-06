import "server-only";
import { collector } from "./collect.ts";
import { snapshotRepository } from "./snapshot-repository.ts";
import { onsLocal } from "./adapters/ons-local.ts";
import { tflAdapter } from "./adapters/tfl.ts";
import { fsaAdapter } from "./adapters/fsa.ts";
// Phase 6 generation supplies verified ownership; Phase 5 development probes remain supported.
export function framework(ownerId: string) {
  const repository = snapshotRepository(ownerId);
  return { repository, ...collector(repository, [onsLocal(), tflAdapter(), fsaAdapter()]) };
}
