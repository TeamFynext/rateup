/**
 * `?tab=` values the inbox used before its tabs were renamed (New → Unassigned,
 * Mine → Assigned to me, Favourites → Starred), and the value each one is now.
 *
 * Only the URL changed. What the list sends the API for these tabs
 * (`waMessageAssignStatus: "New"` / `"mine"`, `favorite: true`) is untouched.
 */
const LEGACY_INBOX_TABS: Readonly<Record<string, string>> = {
  new: "unassigned",
  mine: "assigned",
  favourites: "starred",
};

export function isLegacyInboxTab(tab: unknown): boolean {
  return typeof tab === "string" && Object.hasOwn(LEGACY_INBOX_TABS, tab);
}

/** The current `?tab=` value for one read from a URL; anything not retired passes through. */
export function normalizeInboxTab(tab: string): string;
export function normalizeInboxTab(tab: unknown): string | undefined;
export function normalizeInboxTab(tab: unknown): string | undefined {
  if (typeof tab !== "string") return undefined;
  return Object.hasOwn(LEGACY_INBOX_TABS, tab) ? LEGACY_INBOX_TABS[tab] : tab;
}
