import { SourceError } from "./errors.ts";
import { object, text } from "./validation.ts";

export const numbatDays = ["MON", "TWT", "FRI", "SAT", "SUN"] as const;
export type NumbatProfile = {
  schemaVersion: 1; year: 2025; dayType: typeof numbatDays[number]; measure: "gateline_entries" | "gateline_exits";
  station: { nlc: number; asc: string; name: string; fareZone: string | null };
  trafficDayStartMinutes: 300; quarterHourIds: number[]; periodLabels: string[];
  values: (number | null)[]; missingReasons: ("source_blank" | null)[]; publishedTotals: (number | null)[];
  workbookProducedAt: string; sourceSheet: "Station_Entries" | "Station_Exits"; sourceRow: number;
  sourceKind: "modelled"; units: "typical_day_gateline_passenger_movements";
};
function demand(v: unknown): asserts v { if (!v) throw new SourceError("invalid_response"); }
const finiteCount = (v: unknown) => v === null || typeof v === "number" && Number.isFinite(v) && v >= 0;
/** Source native station/day/quarter hours, never pedestrian footfall or annual demand. */
export function validateNumbatProfile(value: unknown): NumbatProfile {
  const r = object(value), s = object(r.station);
  const keys = "schemaVersion year dayType measure station trafficDayStartMinutes quarterHourIds periodLabels values missingReasons publishedTotals workbookProducedAt sourceSheet sourceRow sourceKind units".split(" ");
  demand(Object.keys(r).length === keys.length && keys.every(k => k in r));
  demand(Object.keys(s).length === 4 && ["nlc", "asc", "name", "fareZone"].every(k => k in s));
  demand(r.schemaVersion === 1 && r.year === 2025 && numbatDays.includes(r.dayType as typeof numbatDays[number]) &&
    ["gateline_entries", "gateline_exits"].includes(String(r.measure)) && r.trafficDayStartMinutes === 300 &&
    r.sourceKind === "modelled" && r.units === "typical_day_gateline_passenger_movements");
  demand(Number.isSafeInteger(s.nlc) && Number(s.nlc) > 0 && text(s.asc, 30) && text(s.name, 150) && (s.fareZone === null || text(s.fareZone, 30)));
  demand(r.workbookProducedAt === "2026-07-01 00:00:00" && Number.isSafeInteger(r.sourceRow) && Number(r.sourceRow) >= 4 &&
    r.sourceSheet === (r.measure === "gateline_entries" ? "Station_Entries" : "Station_Exits"));
  for (const field of ["quarterHourIds", "periodLabels", "values", "missingReasons"] as const) demand(Array.isArray(r[field]) && r[field].length === 96);
  const ids = r.quarterHourIds as unknown[], labels = r.periodLabels as unknown[], counts = r.values as unknown[], missing = r.missingReasons as unknown[];
  for (let i = 0; i < 96; i++) {
    const start = (300 + 15 * i) % 1440, end = (start + 15) % 1440;
    const time = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}${String(m % 60).padStart(2, "0")}`;
    demand(ids[i] === i + 21 && labels[i] === `${time(start)}-${time(end)}` && finiteCount(counts[i]) && missing[i] === (counts[i] === null ? "source_blank" : null));
  }
  demand(Array.isArray(r.publishedTotals) && r.publishedTotals.length === 7 && r.publishedTotals.every(finiteCount));
  const total = r.publishedTotals[0];
  if (total !== null && counts.every(v => v !== null)) demand(Math.abs(counts.reduce<number>((sum, v) => sum + Number(v), 0) - Number(total)) <= Math.max(0.00001, Number(total) * 0.000001));
  return structuredClone(value) as NumbatProfile;
}
