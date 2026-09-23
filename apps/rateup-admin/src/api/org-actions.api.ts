import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "./client";
import type { IsoDate } from "./types";

/** The unlimited sentinel the API stores for an uncapped count (subscription.data.ts). */
export const UNLIMITED_COUNT = 10_000_000;

interface Active {
  active: boolean;
}

/** Mirrors the API's typed features schema (staff/orgs/subscription.schema.ts). */
export interface SubscriptionFeatures {
  team: Active & { count: { max: number }; teamMember: Active & { count: { max: number } } };
  webSurvey: Active & {
    encryption: Active;
    googleReview: Active;
    emailNotification: Active;
    htmlCodePage: Active;
    webhook: Active;
    count: { monthlyResponseLimit: number };
  };
  whatsapp: Active & {
    conversation: Active & { count: { max: number } };
    campaign?: Active;
    loyalty?: Active;
    referrals?: Active;
    catalog?: Active;
  };
  ai: Active & { count: { completionTokens: number; promptTokens: number } };
}

export interface OrgSubscription {
  plan: { id: string; name: string } | null;
  expiresAt: IsoDate;
  /** Set while a gateway bills this org; its next renewal re-applies the gateway's plan. */
  gatewayRef: string | null;
  features: Partial<SubscriptionFeatures> | null;
  planFeatures: Partial<SubscriptionFeatures> | null;
  /** An Enterprise deal's negotiated ceiling is in force. */
  contractedCap: boolean;
}

export const orgSubscriptionQueryOptions = (orgId: string) =>
  queryOptions({
    queryKey: ["staff", "orgs", orgId, "subscription"],
    queryFn: async () =>
      (await api.get<{ data: OrgSubscription | null }>(`/orgs/${orgId}/subscription`)).data.data,
  });

export interface PlanChange {
  rateupPlanId: string;
  expiresAt: string;
  preserveContractedCaps: boolean;
  reason: string;
}

/**
 * One hook per org action. Each refreshes everything under the org (its header, usage,
 * billing and activity all move) plus the lists and overview that summarise it.
 */
function useOrgMutation<TInput>(send: (input: TInput) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: send,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["staff", "orgs"] }),
        queryClient.invalidateQueries({ queryKey: ["staff", "overview"] }),
        queryClient.invalidateQueries({ queryKey: ["staff", "billing"] }),
        queryClient.invalidateQueries({ queryKey: ["staff", "access", "audit"] }),
      ]);
    },
  });
}

export const useChangePlan = (orgId: string) =>
  useOrgMutation((input: PlanChange) => api.put(`/orgs/${orgId}/subscription/plan`, input));

export const useChangeExpiry = (orgId: string) =>
  useOrgMutation((input: { expiresAt: string; reason: string }) =>
    api.put(`/orgs/${orgId}/subscription/expiry`, input),
  );

export const useOverrideFeatures = (orgId: string) =>
  useOrgMutation((input: { features: SubscriptionFeatures; reason: string }) =>
    api.put(`/orgs/${orgId}/subscription/overrides`, input),
  );

export const useGrantPacks = (orgId: string) =>
  useOrgMutation((input: { quantity: number; expiresAt?: string; reason: string }) =>
    api.post(`/orgs/${orgId}/addons`, input),
  );

export const useRevokePack = (orgId: string) =>
  useOrgMutation(({ addonId, reason }: { addonId: string; reason: string }) =>
    api.post(`/orgs/${orgId}/addons/${addonId}/revoke`, { reason }),
  );

export const useSuspendOrg = (orgId: string) =>
  useOrgMutation((input: { reason: string }) => api.post(`/orgs/${orgId}/suspend`, input));

export const useUnsuspendOrg = (orgId: string) =>
  useOrgMutation((input: { reason: string }) => api.post(`/orgs/${orgId}/unsuspend`, input));

/** A note staff keep on an account. The customer never sees these. */
export interface OrgNote {
  id: string;
  body: string;
  pinned: boolean;
  staffEmail: string;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export const orgNotesQueryOptions = (orgId: string) =>
  queryOptions({
    queryKey: ["staff", "orgs", orgId, "notes"],
    queryFn: async () => (await api.get<{ data: OrgNote[] }>(`/orgs/${orgId}/notes`)).data.data,
  });

export const useAddOrgNote = (orgId: string) =>
  useOrgMutation((input: { body: string; pinned: boolean }) =>
    api.post(`/orgs/${orgId}/notes`, input),
  );

export const useEditOrgNote = (orgId: string) =>
  useOrgMutation(({ noteId, ...input }: { noteId: string; body?: string; pinned?: boolean }) =>
    api.patch(`/orgs/${orgId}/notes/${noteId}`, input),
  );

export const useDeleteOrgNote = (orgId: string) =>
  useOrgMutation((noteId: string) => api.delete(`/orgs/${orgId}/notes/${noteId}`));
