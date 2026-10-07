/** Lossless OS Open UPRN London format 1. Source XY has two decimal places;
 * source WGS84 has seven. These scales preserve operands, not accuracy claims. */
export const osRecordBytes = 24;
export const osChunkRows = 20_000;
export type OsRecord = {
  uprn: string;
  eastingCentimetres: number;
  northingCentimetres: number;
  latitudeE7: number;
  longitudeE7: number;
};

function validRecord(r: OsRecord): boolean {
  return /^[1-9][0-9]{0,11}$/.test(r.uprn) &&
    Number.isInteger(r.eastingCentimetres) && r.eastingCentimetres >= 0 && r.eastingCentimetres <= 70_000_000 &&
    Number.isInteger(r.northingCentimetres) && r.northingCentimetres >= 0 && r.northingCentimetres <= 130_000_000 &&
    Number.isInteger(r.latitudeE7) && r.latitudeE7 >= -900_000_000 && r.latitudeE7 <= 900_000_000 &&
    Number.isInteger(r.longitudeE7) && r.longitudeE7 >= -1_800_000_000 && r.longitudeE7 <= 1_800_000_000;
}

function view(bytes: Uint8Array): DataView {
  if (!bytes.length || bytes.length % osRecordBytes || bytes.length > osChunkRows * osRecordBytes)
    throw new Error("Invalid OS compact chunk length.");
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function read(v: DataView, index: number): OsRecord {
  const o = index * osRecordBytes;
  return { uprn: v.getBigUint64(o).toString(), eastingCentimetres: v.getInt32(o + 8),
    northingCentimetres: v.getInt32(o + 12), latitudeE7: v.getInt32(o + 16), longitudeE7: v.getInt32(o + 20) };
}

export function encodeOsChunk(records: readonly OsRecord[]): Uint8Array {
  if (!records.length || records.length > osChunkRows) throw new Error("Invalid OS compact row count.");
  const bytes = new Uint8Array(records.length * osRecordBytes), v = view(bytes);
  let previous = 0n;
  records.forEach((r, i) => {
    if (!validRecord(r) || BigInt(r.uprn) <= previous) throw new Error("Invalid or unordered OS record.");
    previous = BigInt(r.uprn);
    const o = i * osRecordBytes;
    v.setBigUint64(o, previous); v.setInt32(o + 8, r.eastingCentimetres); v.setInt32(o + 12, r.northingCentimetres);
    v.setInt32(o + 16, r.latitudeE7); v.setInt32(o + 20, r.longitudeE7);
  });
  return bytes;
}

/** Admission validation is mandatory before trusted lookup; checksum/release
 * identity and London coverage are separate database/importer obligations. */
export function validateOsChunk(bytes: Uint8Array): { rows: number; first: string; last: string } {
  const v = view(bytes), rows = bytes.length / osRecordBytes;
  let previous = 0n;
  for (let i = 0; i < rows; i++) {
    const r = read(v, i);
    if (!validRecord(r) || BigInt(r.uprn) <= previous) throw new Error("Invalid or unordered OS record.");
    previous = BigInt(r.uprn);
  }
  return { rows, first: read(v, 0).uprn, last: previous.toString() };
}

export function lookupOsChunk(bytes: Uint8Array, uprn: string): OsRecord | null {
  if (!/^[1-9][0-9]{0,11}$/.test(uprn)) throw new Error("Invalid UPRN.");
  // Bounded validation also protects callers reading an untrusted artifact.
  validateOsChunk(bytes);
  const v = view(bytes), target = BigInt(uprn);
  let lo = 0, hi = bytes.length / osRecordBytes - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2), value = v.getBigUint64(mid * osRecordBytes);
    if (value === target) return read(v, mid);
    if (value < target) lo = mid + 1; else hi = mid - 1;
  }
  return null;
}
