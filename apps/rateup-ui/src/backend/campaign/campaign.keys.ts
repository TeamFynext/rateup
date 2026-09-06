/**
 * Query keys for campaigns, contact groups used by campaigns, subscriptions, integrations
 * and the other small roots that were duplicated across more than one file.
 *
 * Every literal is byte-identical to the inline key it replaced.
 */

/** Opaque state that only ever gets serialised into a key. */
type KeyPart = unknown;

export const campaignKeys = {
  all: () => ["campaigns"] as const,
  byType: (type: KeyPart) => ["campaigns", type] as const,
  byTeam: (teamId: KeyPart) => ["campaignsbyTeam", teamId] as const,
  contactGroups: () => ["campaignContactGroupsData"] as const,
  contactGroupsByType: (type: KeyPart) => ["campaignContactGroupsData", type] as const,
  sendPreflight: (campaignId: KeyPart, statuses: KeyPart) =>
    ["campaignSendPreflight", campaignId, statuses] as const,
  // Moved off inline literals while this file was open; the strings are
  // byte-identical to the keys they replaced, so nothing already cached misses.
  byId: (campaignId: KeyPart) => ["campaignById", campaignId] as const,
  stats: (campaignId: KeyPart, dripStage: KeyPart) =>
    ["campaignStats", campaignId, dripStage] as const,
  /** Every key under a campaign's stats, for invalidating without knowing the stage. */
  statsRoot: (campaignId: KeyPart) => ["campaignStats", campaignId] as const,
  filterForFlows: (surveyId: KeyPart) => ["campaignFilterForFlows", surveyId] as const,
  sends: (campaignId: KeyPart) => ["campaignSends", campaignId] as const,
  sendParticipants: (campaignId: KeyPart, sendId: KeyPart, filters: KeyPart) =>
    ["campaignSendParticipants", campaignId, sendId, filters] as const,
  analytics: (campaignId: KeyPart) => ["campaignAnalytics", campaignId] as const,
  retryPolicy: (campaignId: KeyPart) => ["campaignRetryPolicy", campaignId] as const,
} as const;

export const subscriptionKeys = {
  current: () => ["subscription"] as const,
  byOrg: (orgId: KeyPart) => ["subscription", orgId] as const,
  all: () => ["subscriptions"] as const,
  orgOrders: () => ["userOrgOrdersQuery"] as const,
  orgInvoices: () => ["userOrgInvoicesQuery"] as const,
  conversationAddon: () => ["conversationAddon"] as const,
  onboardingChecklist: () => ["onboarding-checklist"] as const,
} as const;

export const integrationKeys = {
  all: () => ["integrations"] as const,
  byType: (type: KeyPart) => ["integrations", type] as const,
} as const;

export const linktreeKeys = {
  all: () => ["linktrees"] as const,
} as const;

export const referralKeys = {
  all: () => ["referrals"] as const,
} as const;
