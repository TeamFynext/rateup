/**
 * Query keys for the loyalty domain.
 *
 * Every literal below is byte-identical to the live inline key it replaced, so the cache
 * layout is unchanged.
 *
 * The roots are a mix of camelCase (`loyaltyCustomers`, `loyaltyRedeems`) and kebab-case
 * (`loyalty-tiers`, `loyalty-rewards`) because they grew that way. They are preserved
 * as-is here rather than normalised, since renaming a root changes what every existing
 * `invalidateQueries` matches. Centralising them first is what makes that normalisation
 * safe to do later, in one place.
 *
 * One exception, called out explicitly — see `customer` / `customers` below.
 */

/** Opaque state (pagination, filters, search) that only ever gets serialised into a key. */
type KeyPart = unknown;

export const loyaltyKeys = {
  /** Without a period this is the prefix that sweeps every Overview window. */
  dashboard: (period?: KeyPart, tz?: KeyPart) =>
    (period === undefined
      ? ["loyaltyDashboardData"]
      : ["loyaltyDashboardData", period, tz]) as readonly unknown[],
  giveback: () => ["loyalty-giveback"] as const,

  /**
   * NOTE — behaviour change. Two invalidations in `customer.query.ts` (the assign-reward
   * mutation) previously used the kebab spellings `["loyalty-customers"]` and
   * `["loyalty-customer", id]`. No query is ever registered under those names — every
   * customer query uses the camel form below — so both invalidations silently matched
   * nothing and the customer list/detail did not refresh after assigning a reward. Routing
   * those call sites here fixes that. Revert those two sites to the kebab literals if the
   * dead behaviour was somehow intentional.
   */
  customers: () => ["loyaltyCustomers"] as const,
  customerList: (pagination: KeyPart, search: KeyPart, sort: KeyPart, filters: KeyPart) =>
    ["loyaltyCustomers", pagination, search, sort, filters] as const,
  /** Without an id this is the prefix that sweeps every customer detail. */
  customer: (customerId?: KeyPart) =>
    (customerId === undefined
      ? ["loyaltyCustomer"]
      : ["loyaltyCustomer", customerId]) as readonly unknown[],
  customerByContact: (contactId: KeyPart) => ["loyaltyCustomerByContact", contactId] as const,
  contactLookup: (phone: KeyPart) => ["loyaltyContactLookup", phone] as const,
  /** The cashier's "from contacts" list. Without a search this is the prefix that sweeps every one. */
  enrolmentContacts: (search?: KeyPart) =>
    (search === undefined
      ? ["loyaltyEnrolmentContacts"]
      : ["loyaltyEnrolmentContacts", search]) as readonly unknown[],

  tiers: () => ["loyalty-tiers"] as const,
  tier: (tierId: KeyPart) => ["loyalty-tier", tierId] as const,

  rewards: () => ["loyalty-rewards"] as const,
  reward: (rewardId: KeyPart) => ["loyalty-reward", rewardId] as const,

  earningRules: () => ["loyalty-earning-rules"] as const,
  earningRule: (ruleId: KeyPart) => ["loyalty-earning-rule", ruleId] as const,

  program: () => ["loyalty-program"] as const,

  onboardingPresets: () => ["loyalty-onboarding-presets"] as const,
  onboardingState: () => ["loyalty-onboarding-state"] as const,

  redeems: () => ["loyaltyRedeems"] as const,
  redemptions: () => ["loyaltyRedemptions"] as const,
  redemptionsByCustomer: (customerId: KeyPart) =>
    ["loyaltyRedemptions", "customer", customerId] as const,

  transactions: () => ["loyaltyTransactions"] as const,
  transactionsFiltered: (filters: KeyPart) => ["loyaltyTransactions", filters] as const,

  approvals: () => ["loyaltyApprovals"] as const,
  approvalsFiltered: (filters: KeyPart) => ["loyaltyApprovals", filters] as const,
  approval: (approvalId: KeyPart) => ["loyaltyApprovals", approvalId] as const,

  templates: () => ["LoyaltyTemplate"] as const,

  feedback: () => ["loyalty-feedback"] as const,
  feedbackFlows: () => ["loyalty-feedback-flows"] as const,
  /** Without a period this is the prefix that sweeps every results window. */
  feedbackResults: (period?: KeyPart, tz?: KeyPart) =>
    (period === undefined
      ? ["loyalty-feedback-results"]
      : ["loyalty-feedback-results", period, tz]) as readonly unknown[],
  /** Without a query this is the prefix that sweeps every requests page. */
  feedbackRequests: (query?: KeyPart) =>
    (query === undefined
      ? ["loyalty-feedback-requests"]
      : ["loyalty-feedback-requests", query]) as readonly unknown[],

  cashierSearch: (search: KeyPart) => ["loyalty-cashier-search", search] as const,
  /** Without a phone this is the prefix that sweeps every cashier lookup. */
  cashierCustomer: (phone?: KeyPart) =>
    (phone === undefined
      ? ["loyalty-cashier-customer"]
      : ["loyalty-cashier-customer", phone]) as readonly unknown[],
} as const;

export const loyaltyKeyRoots: readonly (readonly unknown[])[] = [
  loyaltyKeys.dashboard(),
  loyaltyKeys.giveback(),
  loyaltyKeys.customers(),
  loyaltyKeys.customer(),
  ["loyaltyCustomerByContact"],
  ["loyaltyContactLookup"],
  loyaltyKeys.tiers(),
  ["loyalty-tier"],
  loyaltyKeys.rewards(),
  ["loyalty-reward"],
  loyaltyKeys.earningRules(),
  ["loyalty-earning-rule"],
  loyaltyKeys.program(),
  loyaltyKeys.onboardingState(),
  loyaltyKeys.redeems(),
  loyaltyKeys.redemptions(),
  loyaltyKeys.transactions(),
  loyaltyKeys.approvals(),
  loyaltyKeys.templates(),
  loyaltyKeys.feedback(),
  loyaltyKeys.feedbackFlows(),
  loyaltyKeys.feedbackResults(),
  loyaltyKeys.feedbackRequests(),
  ["loyalty-cashier-search"],
  loyaltyKeys.cashierCustomer(),
];
