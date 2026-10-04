import "server-only";
import { createPostioProvider } from "./postio";
import { AddressError } from "./provider";
export function addressProvider() {
  if ((process.env.ADDRESS_LOOKUP_PROVIDER?.trim() || "postio") !== "postio")
    throw new AddressError("configuration");
  return createPostioProvider(process.env.POSTIO_API_KEY || "");
}
