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
