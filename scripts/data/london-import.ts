import { createHash } from "node:crypto";
import { unzipSync, strFromU8 } from "fflate";

export const services = {
  oa: "Output_Areas_2021_EW_BFC_V8",
  region: "Regions_December_2021_EN_BFC_2022",
  lookup: "OA_LSOA_MSOA_EW_DEC_2021_LU_v3",
  boroughs: "LAD21_RGN21_EN_LU_e39114ca0d934551b012bba304cdd11f",
};
export const arcgisRoot = "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/";
export const censusUrl = "https://www.nomisweb.co.uk/output/census/2021/census2021-ts001.zip";
export const digest = (value: Uint8Array | string) => createHash("sha256").update(value).digest("hex");
export type GeographyRow = { type: "region" | "OA2021"; code: string; name: string; parent: string | null; geometry: unknown; reference: string };
export type StatisticRow = { code: string; count: number; missingReason: null };
function invalid(): never { throw new Error("London import validation failed; release must remain inactive."); }
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}
export async function download(url: string, limit: number): Promise<Uint8Array> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || !["services1.arcgis.com", "www.nomisweb.co.uk", "www.arcgis.com"].includes(parsed.hostname)) invalid();
  let response: Response | undefined;
  // Reviewed free, idempotent official downloads only. No unbounded recovery loop.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(60_000) });
      if (response.status !== 429 && response.status < 500) break;
      await response.body?.cancel();
    } catch { if (attempt === 1) throw new Error("Official source network download failed."); }
    if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (!response?.ok || !response.body) throw new Error(`download_status_${response?.status ?? 0}`);
  if (Number(response.headers.get("content-length")) > limit) invalid();
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    for (;;) { const { done, value } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > limit) invalid(); chunks.push(value); }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks, bytes);
}
export async function query(service: string, parameters: Record<string, string>) {
  if (!Object.values(services).includes(service)) invalid();
  const bytes = await download(`${arcgisRoot}${service}/FeatureServer/0/query?${new URLSearchParams(parameters)}`, 12_000_000);
  const value = record(JSON.parse(Buffer.from(bytes).toString("utf8")));
  if (value.error) throw new Error("Official geography query failed.");
  return { value, sha256: digest(bytes) };
}
export function attributes(value: unknown): Record<string, unknown>[] {
  const features = record(value).features; if (!Array.isArray(features)) invalid();
  return features.map(f => record(record(f).attributes));
}
export function londonLookup(boroughs: Record<string, unknown>[], rows: Record<string, unknown>[]) {
  const codes = new Set(boroughs.map(r => String(r.LAD21CD)));
  if (codes.size !== 33 || boroughs.some(r => r.RGN21CD !== "E12000007" || !/^E090000\d\d$/.test(String(r.LAD21CD)))) invalid();
  const map = new Map<string, string>(); const seenBoroughs = new Set<string>();
  for (const row of rows) {
    const code = String(row.OA21CD), parent = String(row.LAD22CD);
    if (!/^E00\d{6}$/.test(code) || !codes.has(parent) || map.has(code)) invalid();
    map.set(code, parent); seenBoroughs.add(parent);
  }
  if (!map.size || seenBoroughs.size !== 33 || map.size > 40_000) invalid();
  return map;
}
export function geographyRows(value: unknown, lookup: Map<string, string>, region = false): GeographyRow[] {
  const data = record(value); if (data.type !== "FeatureCollection") invalid();
  if (data.crs && (record(data.crs).type !== "name" || record(record(data.crs).properties).name !== "EPSG:4326")) invalid();
  if (!Array.isArray(data.features) || data.features.length > 200) invalid();
  return data.features.map(feature => {
    const f = record(feature), p = record(f.properties), g = record(f.geometry);
    const code = String(region ? p.RGN21CD : p.OA21CD);
    if (region ? code !== "E12000007" : !lookup.has(code)) invalid();
    if (!["Polygon", "MultiPolygon"].includes(String(g.type))) invalid();
    let count = 0;
    function coordinates(v: unknown) {
      if (!Array.isArray(v) || !v.length) invalid();
      if (typeof v[0] === "number") {
        if (v.length !== 2 || !v.every(Number.isFinite) || v[0] < -1 || v[0] > 1 || v[1] < 50 || v[1] > 53) invalid();
        count++; if (count > 500_000) invalid();
      } else for (const child of v) coordinates(child);
    }
    coordinates(g.coordinates);
    return { type: region ? "region" : "OA2021", code, name: region ? "London" : code, parent: region ? null : lookup.get(code)!,
      geometry: { type: g.type, coordinates: g.coordinates }, reference: `${arcgisRoot}${region ? services.region : services.oa}/FeatureServer/0` };
  });
}
// Strict quoted CSV parser; rejects malformed quotes, ragged rows and duplicate area codes.
export function csv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], cell = "", quoted = false, closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else { quoted = false; closed = true; } } else cell += c; }
    else if (c === '"') { if (cell || closed) invalid(); quoted = true; }
    else if (c === "," || c === "\n") { row.push(cell); cell = ""; closed = false; if (c === "\n") { rows.push(row); row = []; } }
    else if (c === "\r" && text[i + 1] === "\n") { /* CRLF */ }
    else { if (closed) invalid(); cell += c; }
  }
  if (quoted) invalid(); if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
export function statistics(archive: Uint8Array, lookup: Map<string, string>): StatisticRow[] {
  const files = unzipSync(archive, { filter: entry => entry.name === "census2021-ts001-oa.csv" && entry.originalSize <= 80_000_000 });
  const bytes = files["census2021-ts001-oa.csv"]; if (!bytes || bytes.length > 80_000_000) invalid();
  const rows = csv(strFromU8(bytes));
  const expected = ["date", "geography", "geography code", "Residence type: Total; measures: Value", "Residence type: Lives in a household; measures: Value", "Residence type: Lives in a communal establishment; measures: Value"];
  if (JSON.stringify(rows.shift()) !== JSON.stringify(expected)) invalid();
  const result: StatisticRow[] = []; const seen = new Set<string>();
  for (const row of rows) {
    if (row.length !== 6 || row[0] !== "2021" || !/^[EW]00\d{6}$/.test(row[2]) || seen.has(row[2])) invalid();
    seen.add(row[2]);
    if (lookup.has(row[2])) {
      if (!/^\d+$/.test(row[3]) || !Number.isSafeInteger(Number(row[3]))) invalid();
      result.push({ code: row[2], count: Number(row[3]), missingReason: null });
    }
  }
  if (result.length !== lookup.size) invalid();
  return result.sort((a, b) => a.code.localeCompare(b.code));
}
export function verifyJoin(geographies: GeographyRow[], statistics: StatisticRow[], lookup: Map<string, string>) {
  const areas = geographies.filter(r => r.type === "OA2021");
  if (geographies.filter(r => r.type === "region").length !== 1 || areas.length !== lookup.size || new Set(areas.map(r => r.code)).size !== lookup.size ||
    statistics.length !== lookup.size || new Set(statistics.map(r => r.code)).size !== lookup.size || areas.some(r => lookup.get(r.code) !== r.parent) || statistics.some(r => !lookup.has(r.code))) invalid();
}
