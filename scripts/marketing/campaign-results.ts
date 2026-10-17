import { readFile, writeFile } from "node:fs/promises";
import { campaignResults } from "../../lib/marketing/results.ts";
const [input, spend, output] = process.argv.slice(2);
if (!input || !output || !spend || process.argv.length !== 5) throw Error("Usage: node scripts/marketing/campaign-results.ts aggregate.json spend.json output.md");
await writeFile(output, campaignResults(JSON.parse(await readFile(input, "utf8")), JSON.parse(await readFile(spend, "utf8"))));
console.log("Aggregate campaign results written. No AI, provider request or payment executed.");
