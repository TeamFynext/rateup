import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "./client";
import type { IsoDate } from "./types";

export interface MaintenanceTask {
  id: string;
  title: string;
  description: string;
  destructive: boolean;
}

export interface TaskResult {
  summary: string;
  details?: Record<string, unknown>;
  applied: boolean;
  lines: string[];
}

export interface ShopifyStore {
  id: string;
  shop: string | null;
  active: boolean;
  createdAt: IsoDate | null;
  orgId: string | null;
  orgName: string | null;
}

export interface Referral {
  id: string;
  code: string;
  link: string | null;
  name: string;
  email: string;
  visits: number;
  signups: number;
  createdAt: IsoDate;
}

export const maintenanceTasksQueryOptions = queryOptions({
  queryKey: ["staff", "ops", "maintenance"],
  queryFn: async () =>
    (await api.get<{ data: MaintenanceTask[] }>("/ops/maintenance/tasks")).data.data,
  staleTime: 10 * 60_000,
});

/** A dry run: the API reports what the task would change and writes nothing. */
export function usePreviewTask() {
  return useMutation({
    mutationFn: async (taskId: string) =>
      (await api.post<{ data: TaskResult }>(`/ops/maintenance/tasks/${taskId}/preview`, {})).data
        .data,
  });
}

export const shopifyStoresQueryOptions = queryOptions({
  queryKey: ["staff", "ops", "shopify"],
  queryFn: async () => (await api.get<{ data: ShopifyStore[] }>("/ops/shopify")).data.data,
});

export const referralsQueryOptions = queryOptions({
  queryKey: ["staff", "ops", "referrals"],
  queryFn: async () => (await api.get<{ data: Referral[] }>("/ops/referrals")).data.data,
});

/**
 * The real run. Needs a Google sign-in from the last 15 minutes (REAUTH_REQUIRED
 * otherwise), the task id typed back and a reason. Refreshes nothing by itself: what a task
 * touches is its own business, so the caller invalidates.
 */
export function useApplyTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, ...body }: { taskId: string; confirm: string; reason: string }) =>
      (await api.post<{ data: TaskResult }>(`/ops/maintenance/tasks/${taskId}/apply`, body)).data
        .data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });
}

function useOpsMutation<TInput, TResult = unknown>(send: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: send,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["staff", "ops"] }),
        queryClient.invalidateQueries({ queryKey: ["staff", "access", "audit"] }),
      ]);
    },
  });
}

export const useAddReferral = () =>
  useOpsMutation((input: { name: string; email: string; reason: string }) =>
    api.post("/ops/referrals", input),
  );

export const useDeleteReferral = () =>
  useOpsMutation(({ id, reason }: { id: string; reason: string }) =>
    api.delete(`/ops/referrals/${id}`, { data: { reason } }),
  );

export const useUnlinkShopify = () =>
  useOpsMutation(({ id, reason }: { id: string; reason: string }) =>
    api.delete(`/ops/shopify/${id}`, { data: { reason } }),
  );

/** One survey on one team: where fake responses can be pointed. */
export interface SurveyTarget {
  id: string;
  survey: { id: string; title: string; type: string };
  team: { id: string; name: string };
  responses: number;
}

export const surveyTargetsQueryOptions = (orgId: string) =>
  queryOptions({
    queryKey: ["staff", "ops", "test-data", "surveys", orgId],
    queryFn: async () =>
      (await api.get<{ data: SurveyTarget[] }>("/ops/test-data/surveys", { params: { orgId } }))
        .data.data,
    enabled: orgId.length > 0,
  });

export const useFakeResponses = () =>
  useOpsMutation(async (input: { surveyTeamMapId: string; batchSize: number; reason: string }) => {
    const { data } = await api.post<{ data: { generated: number } }>(
      "/ops/test-data/responses",
      input,
    );
    return data.data;
  });

export const useFakeInbox = () =>
  useOpsMutation(
    async (input: {
      orgId: string;
      numberOfContacts: number;
      messagesPerContact: number;
      reason: string;
    }) => {
      const { data } = await api.post<{ data: { queued: number } }>("/ops/test-data/inbox", input);
      return data.data;
    },
  );
