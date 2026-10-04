// REST adapter. Only the server factory or explicit development probe instantiates it.
import {
  normalisePostcode,
  normaliseQuery,
  validReference,
  ukCountries,
  hasControlCharacters,
} from "./model.ts";
import type { AddressCandidate, ResolvedAddress } from "./model.ts";
import { AddressError, type AddressLookupProvider } from "./provider.ts";
type ObjectValue = Record<string, unknown>;
const object = (value: unknown): value is ObjectValue =>
  !!value && typeof value === "object" && !Array.isArray(value);
function text(value: unknown, limit = 200): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (
    typeof value !== "string" ||
    value.length > limit ||
    hasControlCharacters(value)
  )
    throw new AddressError("invalid_response");
  return value.trim() || null;
}
export function normalisePostioAddress(value: unknown): ResolvedAddress {
  if (!object(value)) throw new AddressError("invalid_response");
  const id =
    typeof value.udprn === "number" && Number.isSafeInteger(value.udprn)
      ? String(value.udprn)
      : value.udprn;
  const postcode = normalisePostcode(value.postcode);
  const lines = [
    text(value.address_line_1),
    text(value.address_line_2),
    text(value.address_line_3),
  ].filter((line): line is string => !!line);
  const postTown = text(value.post_town, 100);
  const country = text(value.country);
  if (
    !validReference(id) ||
    !postcode ||
    !lines.length ||
    !postTown ||
    (country && !ukCountries.some((c) => c === country))
  )
    throw new AddressError("invalid_response");
  const hasCoordinates =
    typeof value.latitude === "number" &&
    Number.isFinite(value.latitude) &&
    value.latitude >= -90 &&
    value.latitude <= 90 &&
    typeof value.longitude === "number" &&
    Number.isFinite(value.longitude) &&
    value.longitude >= -180 &&
    value.longitude <= 180;
  // A missing pair stays unknown. Partial or malformed supplied coordinates fail closed.
  if ((value.latitude != null || value.longitude != null) && !hasCoordinates)
    throw new AddressError("invalid_response");
  const formattedAddress = [...lines, postTown, postcode].join(", ");
  if (formattedAddress.length > 500) throw new AddressError("invalid_response");
  return {
    formattedAddress,
    lines,
    postcode,
    postTown,
    country: country as ResolvedAddress["country"],
    components: {
      organisation: text(value.organisation_name),
      department: text(value.department_name),
      subBuilding: text(value.sub_building_name),
      buildingName: text(value.building_name),
      buildingNumber: text(value.building_number),
      thoroughfare: text(value.thoroughfare),
      dependentThoroughfare: text(value.dependent_thoroughfare),
      dependentLocality: text(value.dependent_locality),
      doubleDependentLocality: text(value.double_dependent_locality),
      poBox: text(value.po_box),
      district: text(value.district),
      ward: text(value.ward),
    },
    provider: "postio",
    providerAddressId: id,
    udprn: id,
    uprn: null,
    latitude: hasCoordinates ? (value.latitude as number) : null,
    longitude: hasCoordinates ? (value.longitude as number) : null,
    coordinatePrecision: hasCoordinates ? "postcode_centroid" : "unknown",
    coordinateSource: hasCoordinates ? "postio" : null,
    resolution: "provider_verified",
  };
}
export function createPostioProvider(
  key: string,
  request: typeof fetch = fetch,
): AddressLookupProvider {
  if (!key.trim() || /[\r\n]/.test(key))
    throw new AddressError("configuration");
  async function call(path: string, signal?: AbortSignal) {
    let requestId: string | null = null;
    try {
      const response = await request(`https://api.postio.co.uk/v1${path}`, {
        headers: { "x-api-key": key, accept: "application/json" },
        redirect: "error",
        cache: "no-store",
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(12000)])
          : AbortSignal.timeout(12000),
      });
      // Bounded streaming read: a bad upstream cannot force an unbounded payload into memory.
      const reader = response.body?.getReader();
      if (!reader) throw new AddressError("invalid_response");
      const chunks: Uint8Array[] = [];
      let size = 0;
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.length;
        if (size > 2_000_000) {
          await reader.cancel();
          throw new AddressError("invalid_response");
        }
        chunks.push(chunk.value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      const payload: unknown = JSON.parse(new TextDecoder().decode(bytes));
      if (!object(payload)) throw new AddressError("invalid_response");
      if (
        object(payload.meta) &&
        typeof payload.meta.requestId === "string" &&
        /^[a-zA-Z0-9-]{1,100}$/.test(payload.meta.requestId)
      )
        requestId = payload.meta.requestId;
      if (!response.ok || payload.success !== true)
        throw new AddressError(
          response.status === 429
            ? "busy"
            : response.status === 400
              ? "invalid_input"
              : "unavailable",
          requestId,
        );
      return { payload, requestId };
    } catch (error) {
      if (error instanceof AddressError) throw error;
      throw new AddressError("unavailable", requestId);
    }
  }
  function results(payload: ObjectValue): unknown[] {
    if (!Array.isArray(payload.results) || payload.results.length > 10000)
      throw new AddressError("invalid_response");
    if (
      !object(payload.meta) ||
      payload.meta.countResults !== payload.results.length
    )
      throw new AddressError("invalid_response");
    return payload.results;
  }
  const distinct = (candidates: AddressCandidate[]) => [
    ...new Map(
      candidates.map((candidate) => [candidate.reference, candidate]),
    ).values(),
  ];
  return {
    async healthCheck() {
      const { requestId } = await call("/connect");
      return { requestId };
    },
    async lookupByPostcode(input, signal) {
      const postcode = normalisePostcode(input);
      if (!postcode) throw new AddressError("invalid_input");
      const { payload, requestId } = await call(
        `/address/postcode/${encodeURIComponent(postcode)}`,
        signal,
      );
      const addresses = results(payload).map(normalisePostioAddress);
      if (addresses.some((address) => address.postcode !== postcode))
        throw new AddressError("invalid_response", requestId);
      return {
        candidates: distinct(
          addresses.map((address) => ({
            reference: address.providerAddressId!,
            label:
              address.components.organisation &&
              !address.formattedAddress
                .toLocaleLowerCase("en-GB")
                .includes(
                  address.components.organisation.toLocaleLowerCase("en-GB"),
                )
                ? `${address.components.organisation}, ${address.formattedAddress}`
                : address.formattedAddress,
          })),
        ),
        requestId,
      };
    },
    async searchAddress(input, signal) {
      const query = normaliseQuery(input);
      if (!query) throw new AddressError("invalid_input");
      const { payload, requestId } = await call(
        `/address/search?q=${encodeURIComponent(query)}&max_results=10`,
        signal,
      );
      const candidates = results(payload).map((row) => {
        if (!object(row)) throw new AddressError("invalid_response", requestId);
        const reference =
          typeof row.udprn === "number" && Number.isSafeInteger(row.udprn)
            ? String(row.udprn)
            : row.udprn;
        const label = text(row.suggestion, 500);
        if (!validReference(reference) || !label)
          throw new AddressError("invalid_response", requestId);
        return { reference, label };
      });
      if (candidates.length > 10)
        throw new AddressError("invalid_response", requestId);
      return { candidates: distinct(candidates), requestId };
    },
    async resolveAddress(reference, signal) {
      if (!validReference(reference)) throw new AddressError("invalid_input");
      const { payload, requestId } = await call(
        `/address/udprn/${reference}`,
        signal,
      );
      const rows = results(payload);
      if (!rows.length) throw new AddressError("not_found", requestId);
      if (rows.length !== 1)
        throw new AddressError("invalid_response", requestId);
      const address = normalisePostioAddress(rows[0]);
      if (address.providerAddressId !== reference)
        throw new AddressError("invalid_response", requestId);
      return { address, requestId };
    },
  };
}
