import { readFile, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { digest } from "./london-import.ts";
import { nativeMemberships, incomeProfiles, bresProfiles, nativeProfilesDigest } from "./native-enrichment.ts";

const root = resolve("supabase/.temp"), directory = resolve(process.argv[2] ?? "supabase/.temp/phase8-implementation");
if (!directory.startsWith(root + sep)) throw new Error("Ignored development directory required.");
const lookupBytes = await readFile(resolve(directory, "london-native-lookup.json"));
if (digest(lookupBytes) !== "54274c06548e400654adc0a438cb3bd48165dc12135963f5aa5594739ec5baa4") throw new Error("Pinned lookup required.");
const frozen = JSON.parse(await readFile(resolve(directory, "london-oa-codes.json"), "utf8")) as { rows: { geography_code: string }[] };
const memberships = nativeMemberships(JSON.parse(lookupBytes.toString("utf8")), new Set(frozen.rows.map(r => r.geography_code)));
const incomeBytes = await readFile(resolve(directory, "income-fye2023.xlsx")), bresBytes = await readFile(resolve(directory, "bres-london-2024.csv"));
if (digest(incomeBytes) !== "9f17da5c218d2edd336106e1f219e0f7f25e82373afa8be5d0dc7622e18c7ab7" ||
  digest(bresBytes) !== "b6a8f7d14c2fd735070b51a835479c18a0b15f57ecf44966c505fdba25e204ca") throw new Error("Pinned native artifacts required.");
const placeholder = "00000000-0000-4000-8000-000000000001";
const income = incomeProfiles(JSON.parse(await readFile(resolve(directory, "income-london-normalised.json"), "utf8")), placeholder, placeholder,
  new Set(memberships.map(r => r.msoa)));
const bres = bresProfiles(bresBytes.toString("utf8"), placeholder, placeholder, new Set(memberships.map(r => r.lsoa)));
if (memberships.length !== 26369 || income.length !== 1002 || bres.length !== 4994) throw new Error("Native London counts differ.");
await writeFile(resolve(directory, "native-memberships-normalised.json"), JSON.stringify(memberships));
await writeFile(resolve(directory, "income-profiles-prepared.json"), JSON.stringify(income));
await writeFile(resolve(directory, "bres-profiles-prepared.json"), JSON.stringify(bres));
console.log(JSON.stringify({ memberships: memberships.length, income: income.length, bres: bres.length,
  placeholderBindings: true, activation: false, incomeContentDigest: nativeProfilesDigest(income), bresContentDigest: nativeProfilesDigest(bres) }));
