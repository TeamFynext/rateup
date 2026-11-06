/**
 * Query keys for the loyalty domain.
 *
 * The reason this file exists rather than inline arrays: the keys the mutations used to
 * invalidate — `["loyaltyCustomers"]`, `["loyalty-customer", id]`, `["loyaltyRedeems"]` —
 * were names **no query in this app ever registered under**, so awarding points invalidated
 * nothing and the balance on screen stayed stale until a remount. Every key now comes from
 * here, and `cashierInvalidations` names the exact set a counter action has to sweep, so a
 * new mutation cannot quietly invent a third spelling.
 *
 * The literals match `rateup-ui/src/backend/loyalty/loyalty.keys.ts` where the two apps
 * query the same endpoint. That is not required by anything — the caches are separate — but
 * it keeps the two files diffable, which is how they stay in step.
 */

/** Opaque state (a search string, a phone) that only ever gets serialised into a key. */
type KeyPart = unknown;

export const loyaltyKeys = {
  program: () => ["loyalty-program"] as const,
  tiers: () => ["loyalty-tiers"] as const,
  rewards: () => ["loyalty-rewards"] as const,
  earningRules: () => ["loyalty-earning-rules"] as const,
  /** Without a programme this is the prefix that sweeps every programme's triggers. */
  eventTriggers: (programId?: KeyPart) =>
    (programId === undefined
      ? ["loyalty-event-triggers"]
      : ["loyalty-event-triggers", programId]) as readonly unknown[],

  /** Without a phone this is the prefix that sweeps every cashier lookup. */
  cashierCustomer: (phone?: KeyPart) =>
    (phone === undefined
      ? ["loyalty-cashier-customer"]
      : ["loyalty-cashier-customer", phone]) as readonly unknown[],
  cashierSearch: (search: KeyPart) => ["loyalty-cashier-search", search] as const,
  contactLookup: (phone: KeyPart) => ["loyaltyContactLookup", phone] as const,
  /** Without a search this is the prefix that sweeps every enrolment-contacts page. */
  enrolmentContacts: (search?: KeyPart) =>
    (search === undefined
      ? ["loyaltyEnrolmentContacts"]
      : ["loyaltyEnrolmentContacts", search]) as readonly unknown[],

  approvals: () => ["loyaltyApprovals"] as const,
} as const;

/**
 * What a counter action changes.
 *
 * Every write from the cashier alters the open customer, so `cashierCustomer(phone)` is
 * always in the set; a redemption or a gift also moves stock and the reward catalogue.
 * Passing the phone is what makes the refresh actually happen — the prefix form would work
 * too, but it refetches every customer the shift has served.
 */
export function cashierInvalidations(phone: string | null | undefined): readonly unknown[][] {
  return [
    [...(phone ? loyaltyKeys.cashierCustomer(phone) : loyaltyKeys.cashierCustomer())],
    [...loyaltyKeys.rewards()],
  ];
}
