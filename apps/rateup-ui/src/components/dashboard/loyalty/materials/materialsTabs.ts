/**
 * The two pieces on the Materials page, and the `?tab=` value each answers to. Shared by
 * the route's search schema and the page so the two cannot disagree.
 */
// Brochure first: it is the piece a merchant designs, and the one they come back to as
// rewards change. The QR card is written once and printed.
export const MATERIALS_TABS = ["brochure", "qr"] as const;

export type MaterialsTab = (typeof MATERIALS_TABS)[number];

/** Base UI hands tab values back untyped; this narrows without a cast. */
export function isMaterialsTab(value: unknown): value is MaterialsTab {
  return MATERIALS_TABS.some((tab) => tab === value);
}
