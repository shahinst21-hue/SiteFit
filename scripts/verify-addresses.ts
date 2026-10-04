// Explicit development-only, billable-on-hit probe. Never run by CI or application code.
import nextEnv from "@next/env";
import { createPostioProvider } from "../lib/addresses/postio.ts";
import { AddressError } from "../lib/addresses/provider.ts";
nextEnv.loadEnvConfig(process.cwd(), true);
const examples = [
  { postcode: "KT2 7AU", country: "England" },
  { postcode: "EH1 1YZ", country: "Scotland" },
  { postcode: "CF10 1EP", country: "Wales" },
  { postcode: "BT1 5GS", country: "Northern Ireland" },
];
let stage = "configuration";
try {
  const provider = createPostioProvider(process.env.POSTIO_API_KEY || "");
  stage = "health";
  const health = await provider.healthCheck();
  console.log(
    JSON.stringify({ stage, passed: true, requestId: health.requestId }),
  );
  const requested = process.argv[2];
  if (requested && !examples.some((example) => example.postcode === requested))
    throw new AddressError("invalid_input");
  for (const example of examples.filter(
    (example) => !requested || example.postcode === requested,
  )) {
    stage = example.postcode;
    const list = await provider.lookupByPostcode(example.postcode);
    if (!list.candidates.length)
      throw new AddressError("not_found", list.requestId);
    const selected = await provider.resolveAddress(
      list.candidates[0].reference,
    );
    const address = selected.address;
    if (
      (address.country !== null && address.country !== example.country) ||
      address.postcode !== example.postcode ||
      !address.udprn ||
      address.uprn !== null
    )
      throw new AddressError("invalid_response", selected.requestId);
    console.log(
      JSON.stringify({
        postcode: example.postcode,
        count: list.candidates.length,
        distinctIds: new Set(list.candidates.map((row) => row.reference)).size,
        distinctLabels: new Set(list.candidates.map((row) => row.label)).size,
        resolved: true,
        udprnPresent: !!address.udprn,
        uprn: null,
        structuredLines: address.lines.length,
        representativeNation: example.country,
        country: address.country,
        districtPresent: !!address.components.district,
        wardPresent: !!address.components.ward,
        coordinatesPresent:
          address.latitude !== null && address.longitude !== null,
        precision: address.coordinatePrecision,
        lookupRequestId: list.requestId,
        resolveRequestId: selected.requestId,
      }),
    );
  }
} catch (error) {
  console.error(
    JSON.stringify({
      stage,
      passed: false,
      code: error instanceof AddressError ? error.code : "verification_failed",
      requestId: error instanceof AddressError ? error.requestId : null,
    }),
  );
  process.exitCode = 1;
}
