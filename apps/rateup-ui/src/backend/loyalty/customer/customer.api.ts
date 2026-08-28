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

type CreateLoyaltyCustomerInput = Partial<Omit<LoyaltyCustomer, "id">>;
export async function createLoyaltyCustomer(
  lc: CreateLoyaltyCustomerInput & { isPublic?: boolean },
) {
  const url = lc.isPublic ? publicbase : base;
  return await axiosClient.post(`${url}`, lc);
}

/** What the org already knows about a phone number, for the add-customer form. */
export interface ContactLookupResult {
  contact: { id: string; name: string | null; email: string | null; dob: string | null } | null;
  /** True only for an *active* member — an inactive account is reactivated on submit. */
  alreadyMember: boolean;
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

export const exportCustomers = async (format: "csv" | "excel" = "excel") => {
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

export async function updateLoyaltyCustomer(
  customerId: string,
  data: { status?: "active" | "suspended" | "closed" },
) {
  return (await axiosClient.put(`${base}/${customerId}`, data)).data;
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
}) {
  return (await axiosClient.post(`${base}/award-points`, data)).data;
}
