/**
 * The two pieces on the Materials page, and the `?tab=` value each answers to. Shared by
 * the route's search schema and the page so the two cannot disagree.
 */
export const MATERIALS_TABS = ["qr", "brochure"] as const;

export type MaterialsTab = (typeof MATERIALS_TABS)[number];

/** Base UI hands tab values back untyped; this narrows without a cast. */
export function isMaterialsTab(value: unknown): value is MaterialsTab {
  return MATERIALS_TABS.some((tab) => tab === value);
}
