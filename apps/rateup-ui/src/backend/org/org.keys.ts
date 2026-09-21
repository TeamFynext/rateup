/**
 * Query keys for the org and team domains.
 *
 * Every literal is byte-identical to the inline key it replaced, so the cache layout and all
 * existing partial-match invalidations behave exactly as before.
 *
 * `orgTeamsDataQuery`, `orgTeamsAllDataQuery`, `teamsDataUserQuery` and `teamsDetailsQuery`
 * are four separate roots covering overlapping views of the same team data — which is why
 * mutations across the codebase invalidate three or four of them by hand. Collapsing them
 * is worth doing, but it changes what each invalidation matches, so it belongs in its own
 * change; centralising them here is the prerequisite.
 */

/** Opaque state (filters, day ranges) that only ever gets serialised into a key. */
type KeyPart = unknown;

export const orgKeys = {
  all: () => ["org"] as const,
  stats: (orgId: KeyPart) => ["org", orgId, "stats"] as const,
  nameAndPhone: () => ["orgNameAndPhone"] as const,

  /** Teams-of-org listing (members scoped to the caller). */
  teams: () => ["orgTeamsDataQuery"] as const,
  /** Teams-of-org listing (all members). */
  teamsAll: () => ["orgTeamsAllDataQuery"] as const,
  /** One member's audit trail, one page at a time. */
  memberActivity: (memberId: KeyPart, page: KeyPart) =>
    ["orgMemberActivity", memberId, page] as const,
} as const;

export const teamKeys = {
  /** Teams visible to the signed-in user. */
  byUser: () => ["teamsDataUserQuery"] as const,
  details: () => ["teamsDetailsQuery"] as const,
  detail: (teamId: KeyPart) => ["teamsDetailsQuery", teamId] as const,

  features: (teamId: KeyPart) => ["teamFeatures", teamId] as const,
  channels: (teamId: KeyPart) => ["teamChannels", teamId] as const,

  invited: () => ["invitedTeamMembers"] as const,
  invitedByTeam: (teamId: KeyPart) => ["invitedTeamMembers", teamId] as const,
  notMembers: () => ["notTeamMembers"] as const,
  notMembersByTeam: (teamId: KeyPart) => ["notTeamMembers", teamId] as const,

  membersByCardId: (cardId: KeyPart) => ["teamMembersByCardId", cardId] as const,
  membersByBoardId: (cardId: KeyPart) => ["teamMembersByBoardId", cardId] as const,
  memberStats: () => ["team-member-stats"] as const,

  overview: (filter: KeyPart) => ["teamoverview", filter] as const,
  apiOverview: (filter: KeyPart) => ["teamapioverview", filter] as const,
  detailedMetrics: (teamId: KeyPart, filter: KeyPart) =>
    ["teamdetailedmetrics", teamId, filter] as const,
} as const;

/**
 * The root of every query the /dashboard/analytics page runs — the first element of
 * each key, which is all a partial-match invalidation needs. The page's Refresh
 * button and its "is anything loading" spinner both walk this list, so a query that
 * is not on it is one Refresh silently skips (as the team overview and the
 * resolved-conversations trend were, until they were added here).
 */
export const analyticsKeys = {
  roots: () =>
    [
      "conversationOverview",
      "conversationResolvedStats",
      "conversationAverageResponseTime",
      "ConversationAccountDistribution",
      "ConversationQuickStats",
      "StaffPerformanceonConversation",
      "StaffDetailedConversationAnalytics",
      "teamoverview",
      "analyticsapiOverview",
      "deliveredfailedtrend",
      "templateapioverview",
      "teamapioverview",
      "wa-message-logs",
      "user-audit-logs",
    ] as const,
} as const;

export const staffKeys = {
  conversationPerformance: (filter: KeyPart) => ["StaffPerformanceonConversation", filter] as const,
  detailedConversationAnalytics: (staffId: KeyPart, filter: KeyPart) =>
    ["StaffDetailedConversationAnalytics", staffId, filter] as const,
} as const;
