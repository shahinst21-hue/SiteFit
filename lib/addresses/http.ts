import {
  AddressError,
  addressErrorMessage,
  type AddressLookupProvider,
} from "./provider.ts";
import {
  normalisePostcode,
  normaliseQuery,
  validReference,
  manualErrors,
} from "./model.ts";
import type { ManualAddress } from "./model.ts";
import {
  createManualProperty,
  resolveProperty,
  type PropertyRepository,
} from "./service.ts";
export type AddressOperation = "lookup" | "search" | "resolve" | "manual";
export type AddressRouteDependencies = {
  provider: () => AddressLookupProvider;
  repository: () => PropertyRepository;
  allow: (request: Request, operation: AddressOperation) => boolean;
  log: (event: {
    operation: AddressOperation;
    code: string;
    requestId: string | null;
  }) => void;
};
function reply(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "private, no-store",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
    },
  });
}
async function readBody(request: Request): Promise<Record<string, unknown>> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  )
    throw new AddressError("invalid_input");
  const reader = request.body?.getReader();
  if (!reader) throw new AddressError("invalid_input");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.length;
    if (size > 4096) {
      await reader.cancel();
      throw new AddressError("invalid_input");
    }
    chunks.push(chunk.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new AddressError("invalid_input");
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new AddressError("invalid_input");
  return body as Record<string, unknown>;
}
export async function handleAddressOperation(
  request: Request,
  operation: AddressOperation,
  dependencies: AddressRouteDependencies,
) {
  try {
    if (request.method !== "POST")
      return reply({ error: "Use the address search form." }, 405);
    const expectedOrigin = new URL(request.url);
    // Next can internally canonicalise loopback/Preview URLs. The actual request Host
    // identifies this app's origin; never accept an arbitrary client-supplied return URL.
    if (request.headers.get("host"))
      expectedOrigin.host = request.headers.get("host")!;
    if (request.headers.get("x-forwarded-proto") === "https")
      expectedOrigin.protocol = "https:";
    if (
      request.headers.get("origin") !== expectedOrigin.origin ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      return reply({ error: "Reload the page and try again." }, 403);
    const body = await readBody(request);
    // Validate before allocating a provider, creating a repository or spending a lookup.
    const postcode =
      operation === "lookup" ? normalisePostcode(body.postcode) : null;
    const query = operation === "search" ? normaliseQuery(body.query) : null;
    if (operation === "lookup" && !postcode)
      return reply({ error: "Enter a valid UK postcode." }, 400);
    if (operation === "search" && !query)
      return reply(
        { error: "Enter at least four characters of the address." },
        400,
      );
    if (operation === "resolve" && !validReference(body.reference))
      throw new AddressError("invalid_input");
    let manual: ManualAddress | null = null;
    if (operation === "manual") {
      if (
        !["line1", "line2", "town", "postcode"].every(
          (key) => typeof body[key] === "string",
        )
      )
        throw new AddressError("invalid_input");
      manual = {
        line1: body.line1 as string,
        line2: body.line2 as string,
        town: body.town as string,
        postcode: body.postcode as string,
      };
      const errors = manualErrors(manual);
      if (Object.keys(errors).length)
        return reply(
          { error: "Check the address details.", fields: errors },
          400,
        );
    }
    if (!dependencies.allow(request, operation)) throw new AddressError("busy");
    if (operation === "lookup") {
      const result = await dependencies
        .provider()
        .lookupByPostcode(postcode!, request.signal);
      return reply({
        postcode,
        candidates: result.candidates,
        count: result.candidates.length,
      });
    }
    if (operation === "search") {
      const result = await dependencies
        .provider()
        .searchAddress(query!, request.signal);
      return reply({
        candidates: result.candidates,
        count: result.candidates.length,
      });
    }
    // Check repository configuration before the billable resolve, fail closed without spending it.
    const repository = dependencies.repository();
    const property =
      operation === "manual"
        ? await createManualProperty(repository, manual!)
        : await resolveProperty(
            dependencies.provider(),
            repository,
            body.reference as string,
            request.signal,
          );
    return reply({ property });
  } catch (error) {
    const safe =
      error instanceof AddressError ? error : new AddressError("unavailable");
    dependencies.log({ operation, code: safe.code, requestId: safe.requestId });
    return reply(
      { error: addressErrorMessage(safe.code) },
      safe.code === "busy"
        ? 429
        : safe.code === "invalid_input"
          ? 400
          : safe.code === "not_found"
            ? 404
            : 503,
    );
  }
}
