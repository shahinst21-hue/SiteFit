/** Presentation only. Exact operands, statistical universes and lineage stay stored. */
export function consultantNumber(value: number, units: string | null = null, dataset = "") {
  if (!Number.isFinite(value)) throw Error("invalid_display_operand");
  if (/rating|stars|hygiene/i.test(units ?? "")) return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(value);
  if (/route.*seconds/i.test(dataset)) return `about ${Math.max(1, Math.round(value / 60))} minutes`;
  if (/GBP|pounds/i.test(units ?? "")) {
    const step = Math.abs(value) >= 1000 ? 1000 : 1;
    return `about £${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(Math.round(value / step) * step)}`;
  }
  if (/percent|share/i.test(units ?? "")) return `about ${Math.round(value)}%`;
  const abs = Math.abs(value), step = abs >= 1_000_000 ? 100_000 : abs >= 10_000 ? 1000 : abs >= 1000 ? 100 : 1;
  const rounded = Math.round(value / step) * step;
  if (abs >= 1_000_000) return `about ${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(rounded / 1_000_000)} million`;
  return `about ${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(rounded)}`;
}
