import type { LookupResult, ResolvedAddress } from "./model.ts";
export type AddressErrorCode =
  | "invalid_input"
  | "busy"
  | "unavailable"
  | "not_found"
  | "invalid_response"
  | "configuration";
export class AddressError extends Error {
  readonly code: AddressErrorCode;
  readonly requestId: string | null;
  constructor(code: AddressErrorCode, requestId: string | null = null) {
    super("Address operation could not be completed.");
    this.code = code;
    this.requestId = requestId;
  }
}
export interface AddressLookupProvider {
  lookupByPostcode(
    postcode: string,
    signal?: AbortSignal,
  ): Promise<LookupResult>;
  searchAddress(query: string, signal?: AbortSignal): Promise<LookupResult>;
  resolveAddress(
    reference: string,
    signal?: AbortSignal,
  ): Promise<{ address: ResolvedAddress; requestId: string | null }>;
  healthCheck(): Promise<{ requestId: string | null }>;
}
export function addressErrorMessage(code: AddressErrorCode) {
  if (code === "busy") return "Address search is busy. Try again in a moment.";
  if (code === "invalid_input")
    return "Check the address details and try again.";
  if (code === "not_found")
    return "This address could not be found. Search again or enter it manually.";
  return "Address search is temporarily unavailable. Please try again.";
}
