/**
 * Query keys for the user domain.
 *
 * Every literal here is byte-identical to the inline key it replaced, so the cache layout
 * and all existing `invalidateQueries` matches behave exactly as before. They are flat and
 * unrelated (`userInfoQuery`, `userProfile`, `allUsers`) because that is how they grew;
 * nesting them under a single `["user"]` root would change the cache layout and is a
 * separate, deliberate migration.
 *
 * Import this module — not the query hooks — when all you need is a key to invalidate. It
 * pulls in nothing else, so a mutation in another domain can reference a user key without
 * dragging in React Query hooks, toasts or stores.
 */
export const userKeys = {
  /** The signed-in user's own record. */
  info: () => ["userInfoQuery"] as const,
  /** The signed-in user's profile document. */
  profile: () => ["userProfile"] as const,
  /** Org-wide user listing (admin). */
  all: () => ["allUsers"] as const,
  auditLogs: (pagination: unknown) => ["user-audit-logs", pagination] as const,
} as const;
