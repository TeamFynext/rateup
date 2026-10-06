import type { LoyaltyChannel } from "@/backend/loyalty/program.api";
import type { ColumnFilterState, RequestPayload } from "@/types/api.ts";

/** A referral this customer made, as the detail endpoint returns it. */
export interface LoyaltyCustomerReferral {
  id: string;
  createdAt: string;
  status?: string;
  refereeName?: string | null;
  refereePhone?: string | null;
  pointsAwarded?: number;
}

import { axiosClient } from "../../apiClient";
import { LOYALTY_BASE, PUBLIC_LOYALTY_BASE } from "../base.ts";

const base = `${LOYALTY_BASE}/accounts`;
const publicbase = `${PUBLIC_LOYALTY_BASE}/accounts`;

/** Prisma's `Gender` enum, as the API takes and returns it. */
export type LoyaltyGender = "MALE" | "FEMALE" | "OTHER";
export const LOYALTY_GENDERS: readonly LoyaltyGender[] = ["MALE", "FEMALE", "OTHER"];

type CreateLoyaltyCustomerInput = Partial<Omit<LoyaltyCustomer, "id" | "dob">> & {
  /** A `Date` serialises to an ISO timestamp; a `YYYY-MM-DD` string is accepted as-is. */
  dob?: Date | string | null;
  gender?: LoyaltyGender | null;
  referCode?: string;
  /** Honeypot on the public form; see RegisterPage. */
  website?: string;
};
export async function createLoyaltyCustomer(
  lc: CreateLoyaltyCustomerInput & { isPublic?: boolean },
) {
  const url = lc.isPublic ? publicbase : base;
  return await axiosClient.post(`${url}`, lc);
}

/** What the org already knows about a phone number, for the add-customer form. */
export interface ContactLookupResult {
  contact: {
    id: string;
    name: string | null;
    email: string | null;
    dob: string | null;
    gender: LoyaltyGender | null;
  } | null;
  /** True only for an *active* member — an inactive account is reactivated on submit. */
  alreadyMember: boolean;
}

/** One of the org's contacts, as a candidate for enrolment from the counter. */
export interface EnrolmentContact {
  id: string;
  name: string | null;
  /** Never null: the endpoint only returns contacts that have a number. */
  phone: string;
  email: string | null;
  dob: string | null;
  gender: LoyaltyGender | null;
  /** `null` when they have never joined; otherwise the account's status (`active`, `inactive`, …). */
  memberStatus: string | null;
}

/**
 * The org's contacts (from WhatsApp chats, imports, surveys) with a phone number, most
 * recently active first, so the cashier can enrol one without retyping the number.
 * Authenticated and org-scoped server-side.
 */
export async function searchContactsForEnrolment(search: string): Promise<EnrolmentContact[]> {
  const params = new URLSearchParams({ limit: "20" });
  if (search.trim()) params.set("search", search.trim());
  return (await axiosClient.get(`${base}/contacts?${params.toString()}`)).data;
}

/**
 * Authenticated only, and org-scoped server-side. Never call this from the public
 * registration page: an open lookup would let anyone probe phone numbers and read back
 * a customer's name.
 */
export async function lookupContactByPhone(phone: string): Promise<ContactLookupResult> {
  return (await axiosClient.get(`${base}/lookup/${encodeURIComponent(phone)}`)).data;
}

export async function getAllCustomers(
  pagination: {
    pageIndex: number;
    pageSize: number;
  },
  search: string,
  sort: {
    id: string;
    desc: boolean;
  },
  columnFilters: ColumnFilterState[],
) {
  const filter = columnFilters.map((data) => `&${data.id}=${data.value}`).join("&");
  const desc = sort.desc ? "desc" : "asc";
  const customerUrl = `${base}?page=${pagination.pageIndex}&limit=${pagination.pageSize}&search=${search}&sort=${sort.id}&desc=${desc}${filter}`;

  const response = await axiosClient.get(customerUrl);
  return response.data;
}

export async function deleteLoyaltyCustomer(id: string) {
  return (await axiosClient.delete(`${base}/${id}`)).data;
}

export async function createLCAction({
  phone,
  actionId,
  amount,
}: {
  phone: string;
  actionId: string;
  amount: number;
}) {
  await axiosClient.post(`${base}/${phone}/${actionId}`, { amount });
}

export const importCustomers = async (data: RequestPayload) => {
  const res = await axiosClient.post(`${base}/importcsv`, data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    timeout: 60000,
  });
  return res;
};

export type CustomerExportFormat = "csv" | "xlsx" | "ods";

export const exportCustomers = async (format: CustomerExportFormat = "xlsx") => {
  return (
    await axiosClient.get(`${base}/export?format=${format}`, {
      responseType: "blob",
    })
  ).data;
};

/** A single point movement on a loyalty account. */
export interface LoyaltyTransaction {
  id: string;
  accountId: string;
  transactionType: "earn" | "redeem" | string;
  points: number;
  balanceAfter: number;
  source: string;
  referenceId?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown>;
  earningRuleId?: string | null;
  earningRuleMultiplier?: number | null;
  basePoints?: number | null;
  rewardId?: string | null;
  programId: string;
  createdAt: string;
  createdBy?: string | null;
}

export interface LoyaltyCustomerDetail {
  id: string;
  programId: string;
  contactId: string;
  currentPoints: number;
  lifetimePoints: number;
  totalSpend: string;
  currentTierId: string | null;
  referralCode: string;
  referredById: string | null;
  status: string;
  createdAt: string;
  lastActivityAt: string;
  updatedAt: string;
  currentTier?: {
    id: string;
    programId: string;
    name: string;
    threshold: number;
    pointsMultiplier: string;
    color: string;
    benefitsDescription: string;
    priority: number;
    createdAt: string;
  };
  transactions: LoyaltyTransaction[];
  redemptions: {
    id: string;
    accountId: string;
    rewardId: string;
    transactionId: string;
    redemptionCode: string;
    status: "APPROVED" | "PENDING" | "REJECTED" | string;
    expiresAt?: string | null;
    usedAt?: string | null;
    usedContext?: Record<string, unknown>;
    rulesValidatedAt?: string;
    rulesValidationPassed?: boolean;
    createdAt: string;
    updatedAt: string;
  }[];
  referrals: LoyaltyCustomerReferral[];
}

export async function getLoyaltyCustomerById(customerId: string) {
  return (await axiosClient.get(`${base}/${customerId}`)).data as LoyaltyCustomerDetail;
}

export async function getLoyaltyCustomerByContactId(contactId: string) {
  return (await axiosClient.get(`${base}/contact/${contactId}`)).data;
}

/**
 * Editing a member.
 *
 * `status` is the loyalty account's own; name, birthday, gender and email belong to the
 * contact behind it and are written through. `null` clears a field and `undefined` leaves
 * it alone, so a mistyped birthday can be removed rather than only replaced.
 */
export interface UpdateLoyaltyCustomerInput {
  status?: "active" | "suspended" | "closed";
  name?: string;
  /** `YYYY-MM-DD`. Filling this in is what lets the birthday reminder find them. */
  dob?: string | null;
  gender?: "MALE" | "FEMALE" | "OTHER" | null;
  email?: string | null;
  /** Where they want loyalty messages; null follows the programme's order. */
  preferredChannel?: LoyaltyChannel | null;
}

export async function updateLoyaltyCustomer(customerId: string, data: UpdateLoyaltyCustomerInput) {
  return (await axiosClient.put(`${base}/${customerId}`, data)).data;
}

/** What happened to a loyalty message, so a receipt can show it. Mirrors `LoyaltySendOutcome`. */
export interface LoyaltyNotificationOutcome {
  sent: boolean;
  channel: Lowercase<LoyaltyChannel> | null;
  /**
   * A pre-approved template, or — inside an open conversation — the same words as a plain,
   * interactive or media message.
   */
  mode: "template" | "text" | "interactive" | "media" | null;
  templateId: string | null;
  text: string | null;
  skippedReason:
    | "no_program"
    | "program_inactive"
    | "whatsapp_disabled"
    | "points_alerts_disabled"
    | "no_phone"
    | "no_template"
    | "template_not_approved"
    | "send_failed"
    | "no_channel"
    | "session_closed"
    | "unsupported"
    | "replayed"
    | null;
}

export interface AwardPointsTierSummary {
  id: string;
  name: string;
  threshold: number;
  pointsMultiplier: number;
  color: string | null;
}

/** Mirrors `awardPoints` in rateup-api — everything a counter receipt reads. */
export interface AwardPointsResponse {
  customer: {
    id: string;
    currentPoints: number;
    lifetimePoints: number;
    totalSpend: number | string;
  };
  transaction: { id: string; points: number; balanceAfter: number; createdAt: string };
  pointsAwarded: number;
  rule: { id: string; name: string; multiplier: number; bonusPoints: number } | null;
  tier: {
    current: AwardPointsTierSummary | null;
    previous: string | null;
    upgraded: boolean;
    next: AwardPointsTierSummary | null;
    amountToNext: number | null;
  };
  notification: LoyaltyNotificationOutcome;
  tierNotification: LoyaltyNotificationOutcome | null;
}

export async function awardPoints(data: {
  contactId: string;
  purchaseAmount: number;
  locationId?: string;
  productCategories?: string[];
  productSkus?: string[];
  paymentMethod?: string;
  channel?: string;
  orderId?: string;
  notes?: string;
}): Promise<AwardPointsResponse> {
  return (await axiosClient.post(`${base}/award-points`, data)).data;
}
