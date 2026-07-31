/**
 * Query keys for the contacts family.
 *
 * Every literal is byte-identical to the inline key it replaced, so the cache layout is
 * unchanged. In particular the list, detail and filtered keys all sit under the same
 * `["contacts"]` prefix — that is load-bearing: several mutations invalidate the bare
 * `["contacts"]` root specifically to sweep all three at once.
 *
 * Import this module rather than the query hooks when you only need a key to invalidate.
 */

/** Opaque table state (pagination, sort, filter objects) that only ever gets serialised into a key. */
type KeyPart = unknown;

export const contactKeys = {
  /** Root prefix — invalidating this sweeps lists, details and filtered views. */
  all: () => ["contacts"] as const,
  list: (
    pagination: KeyPart,
    search: KeyPart,
    sort: KeyPart,
    filters: KeyPart,
    groupType: KeyPart,
  ) => ["contacts", pagination, search, sort, filters, groupType] as const,
  detail: (contactId: string) => ["contacts", contactId] as const,
  /** The inbox's filtered contact list. */
  filtered: () => ["contacts", "filtered"] as const,
  filteredBy: (filterData: KeyPart) => ["contacts", "filtered", filterData] as const,
  inboxCount: () => ["contactInboxCount"] as const,
} as const;

export const contactGroupKeys = {
  /**
   * NOTE: `groupId` is intentionally optional because two callers
   * (`useEditContactMutation`, `useEditContactGroupMutation`) accept an optional group and
   * pass it straight through. When it is `undefined` the key becomes
   * `["contactGroupById", undefined]`, which partial-matches no real group query — so that
   * invalidation is a no-op today. This signature preserves that existing behaviour rather
   * than silently widening those mutations to sweep every group. Worth fixing deliberately,
   * separately.
   */
  detail: (groupId: string | undefined) => ["contactGroupById", groupId] as const,
  list: (groupId: string, pagination: KeyPart, search: KeyPart, sort: KeyPart, filters: KeyPart) =>
    ["contactGroupById", groupId, pagination, search, sort, filters] as const,
  byTeam: () => ["contactGroupsDataByTeamId"] as const,
  /** Without a contact id this is the prefix that sweeps every contact's group list. */
  byContact: (contactId?: string) =>
    (contactId === undefined
      ? ["contactGroupsDataByContactId"]
      : ["contactGroupsDataByContactId", contactId]) as readonly unknown[],
} as const;
