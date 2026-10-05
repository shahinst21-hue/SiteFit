import type { CollectionContext } from "../data/contracts.ts";
import { SourceError } from "../data/errors.ts";
import { object, text, uuid } from "../data/validation.ts";
import type { Point } from "./model.ts";
export function geographyContext(value: unknown, point: Point, releaseId: string): Pick<CollectionContext, "region" | "geography"> {
  const data = object(value);
  if (!uuid(releaseId) || typeof data.eligible !== "boolean" || typeof data.ambiguous !== "boolean" || typeof data.onBoundary !== "boolean" || !Array.isArray(data.matches) || data.matches.length > 3 || !data.matches.every(v => text(v, 20) && /^E00\d{6}$/.test(v)) || data.method !== (point.precision === "postcode_centroid" ? "centroid_proxy" : "point_in_polygon")) throw new SourceError("invalid_response");
  return { region: { id: "london", boundaryReleaseId: releaseId, eligible: data.eligible, method: data.method as "centroid_proxy" | "point_in_polygon" },
    geography: data.eligible && !data.ambiguous && data.matches.length === 1 ? { code: data.matches[0], type: "OA2021", releaseId, method: data.method as "centroid_proxy" | "point_in_polygon", ambiguous: false } : null };
}
