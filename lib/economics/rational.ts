/** Exact arithmetic. JSON projections serialize fractions, never BigInt or floats. */
export type Rational = { n: bigint; d: bigint };
export function fraction(n: bigint, d = 1n): Rational {
  if (d === 0n) throw new Error("invalid_denominator");
  if (d < 0n) { n = -n; d = -d; }
  let a = n < 0n ? -n : n, b = d;
  while (b) { const r = a % b; a = b; b = r; }
  return { n: n / a, d: d / a };
}
export const add = (a: Rational, b: Rational) => fraction(a.n*b.d+b.n*a.d,a.d*b.d);
export const sub = (a: Rational, b: Rational) => fraction(a.n*b.d-b.n*a.d,a.d*b.d);
export const mul = (a: Rational, b: Rational) => fraction(a.n*b.n,a.d*b.d);
export const div = (a: Rational, b: Rational) => fraction(a.n*b.d,a.d*b.n);
export const compare = (a: Rational, b: Rational) => a.n*b.d < b.n*a.d ? -1 : a.n*b.d > b.n*a.d ? 1 : 0;
export const serialise = (v: Rational) => ({ numerator: v.n.toString(), denominator: v.d.toString() });
export function rounded(v: Rational, ceiling = false): string {
  if (ceiling) return ((v.n + v.d - 1n) / v.d).toString();
  const sign = v.n < 0n ? -1n : 1n, abs = v.n * sign;
  return (sign * ((abs*2n+v.d)/(2n*v.d))).toString();
}
export function decimal(value: string, scale = 100n): Rational {
  if (!/^(0|[1-9]\d{0,8})(\.\d{1,2})?$/.test(value)) throw new Error("invalid_decimal");
  const [whole, part = ""] = value.split(".");
  return fraction((BigInt(whole)*100n+BigInt(part.padEnd(2,"0")))*scale,100n);
}
