import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { OrderRow } from "./billing.api";
import { api } from "./client";
import type { SubscriptionFeatures } from "./org-actions.api";
import type { IsoDate, Page } from "./types";

export const ORG_STATUSES = [
  "active",
  "expired",
  "no_plan",
  "paused",
  "paid",
  "suspended",
] as const;
export type OrgStatusFilter = (typeof ORG_STATUSES)[number];
export const ORG_SORTS = ["created", "name", "expires", "conversations"] as const;
export type OrgSort = (typeof ORG_SORTS)[number];

export type SubscriptionStatus = "active" | "expired" | "no_plan";

export interface OrgListParams {
  q?: string;
  status?: OrgStatusFilter;
  planId?: string;
  expiringInDays?: number;
  createdWithinDays?: number;
  sort?: OrgSort;
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface OrgRow {
  id: string;
  name: string;
  logo: string | null;
  createdAt: IsoDate;
  pausedByCustomer: boolean;
  /** Switched off by RateUp staff; the customer cannot lift this one. */
  suspendedAt: IsoDate | null;
  suspendedReason: string | null;
  owner: { id: string; name: string | null; email: string };
  plan: { id: string; name: string; paid: boolean } | null;
  status: SubscriptionStatus;
  expiresAt: IsoDate | null;
  members: number;
  /** Against the plan's own ceiling; `max` null means not metered. */
  conversations: { used: number; max: number | null };
  lastActiveAt: IsoDate | null;
}

export interface PlanOption {
  id: string;
  name: string;
  paid: boolean;
  /** The tier's features, for the plan picker's before / after comparison. */
  features: Partial<SubscriptionFeatures> | null;
}

export interface OrgSummary extends OrgRow {
  phone: string | null;
  address: string | null;
  industry: string | null;
  website: string | null;
  location: string | null;
  onboardingCompleted: boolean;
  deletionWarningSentAt: IsoDate | null;
  subscription: {
    startedAt: IsoDate;
    renewedAt: IsoDate | null;
    expiresAt: IsoDate;
    annualAllowance: boolean;
    gatewayRef: string | null;
    limitAlertSentAt: IsoDate | null;
  } | null;
  counts: {
    members: number;
    teams: number;
    pendingInvites: number;
    channels: number;
    templates: number;
  };
}

export interface OrgMember {
  id: string;
  joinedAt: IsoDate;
  /** The role's display label; group and filter by `roleKey`. */
  role: string;
  /** rateup-api `src/authz/roles.ts` key, e.g. "OWNER", "ADMIN", "AGENT". */
  roleKey: string;
  isOwner: boolean;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    active: boolean;
    paused: boolean;
    lastLoginAt: IsoDate | null;
  };
  teams: { id: string; name: string }[];
}

export interface OrgMembers {
  members: OrgMember[];
  teams: {
    id: string;
    name: string;
    code: string;
    color: string;
    createdAt: IsoDate;
    members: number;
  }[];
  invitations: {
    id: string;
    email: string;
    name: string;
    role: string | null;
    createdAt: IsoDate;
    invitedBy: string;
  }[];
}

export interface PlanLimitStatus {
  metered: boolean;
  max?: number;
  used: number;
  remaining?: number;
  exceeded: boolean;
}

export type UsageDays = 30 | 90;

export interface OrgUsage {
  /** One entry per UTC day, oldest first, zero-filled. */
  daily: { date: string; conversations: number }[];
  limits: {
    teams: PlanLimitStatus;
    users: PlanLimitStatus;
    conversations: PlanLimitStatus;
    formResponses: PlanLimitStatus;
  };
  conversationPeriod: "monthly" | "annual";
  packs: {
    id: string;
    name: string;
    quantity: number;
    expiresAt: IsoDate;
    boughtAt: IsoDate;
    paymentRef: string | null;
  }[];
  counters: {
    updatedAt: IsoDate;
    lastMonthlyReset: IsoDate | null;
    messages: number;
    templateMessagesThisMonth: number;
    inboxConversationsThisMonth: number;
    meteredConversationsThisMonth: number;
    meteredConversationsThisYear: number;
    formResponsesThisMonth: number;
    whatsappSurveyResponsesThisMonth: number;
    automationTriggersThisMonth: number;
    campaigns: number;
    aiTokens: number;
  } | null;
}

export interface OrgChannel {
  id: string;
  type: string;
  status: string;
  phone: string | null;
  phoneDisplayName: string | null;
  phoneId: string | null;
  wabaId: string | null;
  fbPageId: string | null;
  fbUserName: string | null;
  ibaId: string | null;
  igUserName: string | null;
  igDisplayName: string | null;
  messagesPerSecond: number | null;
  paymentMethod: string;
  createdAt: IsoDate;
}

export async function listOrgs(params: OrgListParams, signal?: AbortSignal) {
  const { data } = await api.get<Page<OrgRow>>("/orgs", { params, signal });
  return data;
}

export async function listPlanOptions() {
  const { data } = await api.get<{ data: PlanOption[] }>("/orgs/plans");
  return data.data;
}

export async function getOrg(orgId: string) {
  const { data } = await api.get<{ data: OrgSummary }>(`/orgs/${orgId}`);
  return data.data;
}

export async function getOrgMembers(orgId: string) {
  const { data } = await api.get<{ data: OrgMembers }>(`/orgs/${orgId}/members`);
  return data.data;
}

export async function getOrgUsage(orgId: string, days: UsageDays) {
  const { data } = await api.get<{ data: OrgUsage }>(`/orgs/${orgId}/usage`, {
    params: { days },
  });
  return data.data;
}

export async function getOrgChannels(orgId: string) {
  const { data } = await api.get<{ data: OrgChannel[] }>(`/orgs/${orgId}/channels`);
  return data.data;
}

export interface OrgInvoice {
  id: string;
  subscriptionId: string;
  status: string;
  amount: number;
  currency: string;
  /** Unix seconds, as Razorpay sends them. */
  issuedAt: number | null;
  paidAt: number | null;
  billingStart: number | null;
  billingEnd: number | null;
  url: string | null;
  paymentId: string | null;
}

export interface OrgMessageStats {
  from: IsoDate;
  to: IsoDate;
  templateMessages: number;
}

export interface OrgActivityEntry {
  id: string;
  createdAt: IsoDate;
  action: string;
  actor: string;
  detail: string | null;
}

export type ActivitySource = "customer" | "staff";

export async function getOrgOrders(orgId: string, page: number) {
  const { data } = await api.get<Page<OrderRow>>(`/orgs/${orgId}/orders`, {
    params: { page, pageSize: 10 },
  });
  return data;
}

export async function getOrgInvoices(orgId: string) {
  const { data } = await api.get<{ data: OrgInvoice[] }>(`/orgs/${orgId}/invoices`);
  return data.data;
}

export async function getOrgMessageStats(orgId: string, range: { from: string; to: string }) {
  const { data } = await api.get<{ data: OrgMessageStats }>(`/orgs/${orgId}/message-stats`, {
    params: range,
  });
  return data.data;
}

export async function getOrgActivity(orgId: string, source: ActivitySource, page: number) {
  const { data } = await api.get<Page<OrgActivityEntry>>(`/orgs/${orgId}/activity`, {
    params: { source, page, pageSize: 20 },
  });
  return data;
}

/**
 * Pause or resume one member's account (platform-wide: it is the person, not the membership).
 * The customer app sends a paused user to its "account paused" screen.
 */
export function useSetUserPaused() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; paused: boolean; reason: string }) =>
      api.put(`/users/${id}/pause`, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["staff", "orgs"] }),
        queryClient.invalidateQueries({ queryKey: ["staff", "access", "audit"] }),
      ]);
    },
  });
}
