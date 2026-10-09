import nextEnv from "@next/env";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { webEvidenceSearch, DiscoveryError } from "../../lib/web-evidence/search.ts";

// One owner-approved proof. The exclusive marker consumes permission before dispatch.
// A provider timeout/failure does not authorise rerunning or deleting the marker.
const envDirectory = process.argv[2];
if (!envDirectory || process.env.VERCEL_ENV === "production") throw new Error("development_proof_only");
nextEnv.loadEnvConfig(resolve(envDirectory), true, { info() {}, error() {} });
if (!process.env.OPENAI_API_KEY) throw new Error("configuration_missing");
const outputDirectory = resolve(envDirectory, "supabase/.temp");
await mkdir(outputDirectory, { recursive: true });
await writeFile(resolve(outputDirectory, "phase95-proof-dispatched"), new Date().toISOString(), { flag: "wx" });
const provider = webEvidenceSearch({ enabled: true, approvedUsd: .5 });
try {
  const result = await provider.discover("Ground floor and basement, 33 Broadway Market, London E8 4PH");
  // Public-source proposals remain transient pilot data, not admitted/customer evidence.
  await writeFile(resolve(outputDirectory, "phase95-proof-result.json"), JSON.stringify({ candidates: result.candidates.map(c => ({ url: c.url })), receipt: result.receipt }, null, 2));
  console.log(JSON.stringify({ outcome: "success", candidates: result.candidates, receipt: result.receipt }));
} catch (error) {
  const outcome = error instanceof DiscoveryError ? error.code : "invalid_response";
  const result = { outcome, receipts: provider.receipts() };
  await writeFile(resolve(outputDirectory, "phase95-proof-result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  process.exitCode = 1;
}
