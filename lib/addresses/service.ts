import type { AddressLookupProvider } from "./provider.ts";
import { AddressError } from "./provider.ts";
import type {
  ManualAddress,
  PropertySelection,
  ResolvedAddress,
} from "./model.ts";
import { normaliseManualAddress } from "./model.ts";
export interface PropertyRepository {
  upsertSelected(address: ResolvedAddress): Promise<PropertySelection>;
}
export async function resolveProperty(
  provider: AddressLookupProvider,
  repository: PropertyRepository,
  reference: string,
  signal?: AbortSignal,
) {
  const { address } = await provider.resolveAddress(reference, signal);
  // Provider metadata/labels from the browser are never arguments to this function.
  if (
    address.resolution !== "provider_verified" ||
    !address.provider ||
    !address.providerAddressId
  )
    throw new AddressError("invalid_response");
  return repository.upsertSelected(address);
}
export async function createManualProperty(
  repository: PropertyRepository,
  manual: ManualAddress,
) {
  return repository.upsertSelected(normaliseManualAddress(manual));
}
