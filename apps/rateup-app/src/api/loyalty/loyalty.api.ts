import axios from "@/config/axios";

import type {
  AssignRewardRequest,
  AssignRewardResponse,
  AwardPointsInput,
  AwardPointsResponse,
  ContactLookupResult,
  CreateApprovalRequestInput,
  CreateLoyaltyCustomerInput,
  CreateLoyaltyCustomerResponse,
  CustomerRewardsResponse,
  CustomerSearchResult,
  EnrolmentContact,
  EventTrigger,
  LoyaltyEarningRule,
  LoyaltyProgram,
  LoyaltyReward,
  LoyaltyTier,
  RedeemRewardInput,
  RedeemRewardResponse,
  ShortCodeRedeemResponse,
  VerifyRedemptionResponse,
} from "./loyalty.type";

/**
 * The loyalty endpoints.
 *
 * **The `/api` prefix belongs here.** The web's axios base is `${VITE_API_URL}/api` and its
 * paths start `/loyalty/…`; this app's base is `EXPO_PUBLIC_API_URL` with no suffix, so every
 * path carries `/api` itself. Same final URL, different constants — a path copied across
 * from `rateup-ui` without the prefix 404s.
 */
const ACCOUNTS = "/api/loyalty/accounts";
const REDEMPTIONS = "/api/loyalty/redemptions";
const PROGRAM = "/api/loyalty/program";
const TIERS = "/api/loyalty/tiers";
const REWARDS = "/api/loyalty/rewards";
const EARNING_RULES = "/api/loyalty/earning-rules";
const EVENT_TRIGGERS = "/api/loyalty/settings/event-trigger";
const APPROVALS = "/api/loyalty/approvals";

/* ── reads ──────────────────────────────────────────────────────────────────── */

/** The customer with everything the counter needs about them, in one request. */
export async function getCustomerRewardsByPhone(phone: string): Promise<CustomerRewardsResponse> {
  return (await axios.get(`${ACCOUNTS}/phone/${phone}`)).data;
}

/** Members, by partial name or number. */
export async function searchCustomers(search: string): Promise<CustomerSearchResult[]> {
  return (await axios.get(ACCOUNTS, { params: { search } })).data;
}

/** What the org already knows about a number, so the register form arrives half-filled. */
export async function lookupContactByPhone(phone: string): Promise<ContactLookupResult> {
  return (await axios.get(`${ACCOUNTS}/lookup/${encodeURIComponent(phone)}`)).data;
}

/**
 * The org's contacts that have a number, most recently active first, so a customer can be
 * enrolled without retyping it. Org-scoped server-side.
 */
export async function searchContactsForEnrolment(search: string): Promise<EnrolmentContact[]> {
  const params: Record<string, string> = { limit: "20" };
  if (search.trim()) params.search = search.trim();
  return (await axios.get(`${ACCOUNTS}/contacts`, { params })).data;
}

export async function getLoyaltyProgram(): Promise<LoyaltyProgram> {
  return (await axios.get(PROGRAM)).data;
}

export async function getLoyaltyTiers(): Promise<LoyaltyTier[]> {
  return (await axios.get(TIERS)).data;
}

export async function getLoyaltyRewards(): Promise<LoyaltyReward[]> {
  return (await axios.get(REWARDS)).data;
}

export async function getLoyaltyEarningRules(): Promise<LoyaltyEarningRule[]> {
  return (await axios.get(EARNING_RULES)).data;
}

export async function getEventTriggers(programId: string): Promise<EventTrigger[]> {
  return (await axios.get(`${EVENT_TRIGGERS}/all`, { params: { programId } })).data;
}

/* ── writes ─────────────────────────────────────────────────────────────────── */

export async function awardPoints(data: AwardPointsInput): Promise<AwardPointsResponse> {
  return (await axios.post(`${ACCOUNTS}/award-points`, data)).data;
}

/**
 * Spends points on a reward.
 *
 * **The path is `/redemptions/redeem`, not `/accounts/redeem`** — the version this replaced
 * posted to the latter, which is not a route the accounts module registers (its only POSTs
 * are `/`, `/award-points`, `/:customerId/assign-reward` and `/rewards/:shortCode/redeem`).
 * Every redemption from the app 404'd, and because the failure was raised from inside a
 * native modal the notice rendered behind it, so it presented as the modal simply closing.
 *
 * It also returns its response now: the caller needs `redemption.status`, which is
 * `"PENDING"` when the programme requires approval, to say so on the receipt.
 */
export async function redeemReward(data: RedeemRewardInput): Promise<RedeemRewardResponse> {
  return (await axios.post(`${REDEMPTIONS}/redeem`, data)).data;
}

/** Looks a code up before it is applied — what it is, whose it is, whether it is still good. */
export async function verifyRedemption(redemptionCode: string): Promise<VerifyRedemptionResponse> {
  return (await axios.post(`${REDEMPTIONS}/verify`, { redemptionCode })).data;
}

/** Marks an approved redemption used. `appliedBy` defaults to the signed-in user server-side. */
export async function applyRedemption(data: {
  redemptionCode: string;
  notes?: string;
}): Promise<unknown> {
  return (await axios.post(`${REDEMPTIONS}/apply`, data)).data;
}

/** Gives a reward away without charging points. Uniquely constrained per customer. */
export async function assignRewardToCustomer(
  payload: AssignRewardRequest,
): Promise<AssignRewardResponse> {
  return (await axios.post(`${ACCOUNTS}/${payload.customerId}/assign-reward`, payload)).data;
}

/** Marks an issued gift used, by the short code staff read out. */
export async function redeemRewardByShortCode(shortCode: string): Promise<ShortCodeRedeemResponse> {
  return (await axios.post(`${ACCOUNTS}/rewards/${shortCode}/redeem`)).data;
}

/** Enrols someone at the counter. */
export async function createLoyaltyCustomer(
  data: CreateLoyaltyCustomerInput,
): Promise<CreateLoyaltyCustomerResponse> {
  return (await axios.post(ACCOUNTS, data)).data;
}

/** Files a points adjustment for approval — how the counter undoes a purchase. */
export async function createApprovalRequest(data: CreateApprovalRequestInput): Promise<unknown> {
  return (await axios.post(APPROVALS, data)).data;
}
