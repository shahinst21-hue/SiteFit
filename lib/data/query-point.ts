import type { CollectionContext } from "./contracts.ts";

/** The canonical postal point remains in the immutable input. A qualified OS
 * building point is used only when the separately frozen identity matched;
 * neither point claims a surveyed entrance or the selected trading-unit extent. */
export function queryPoint(context: CollectionContext) {
  return context.schemaVersion === 2 && context.enrichment?.identity.state === "matched"
    ? context.enrichment.identity.point
    : context.selectedProperty.point;
}
