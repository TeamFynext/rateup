import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { subscriptionKeys } from "@/backend/campaign/campaign.keys";
import type { QueryFilter } from "@/types/api.ts";

import {
  getAllSubscriptions,
  getMessageStats,
  getSubscription,
  getSubscriptionUsage,
  getUserSubscription,
  updateSubscription,
} from "./subscription.api";

export const useSubscription = (enabled = true) =>
  useQuery({
    queryKey: subscriptionKeys.current(),
    queryFn: getUserSubscription,
    enabled,
    staleTime: 0,
    gcTime: 1000 * 60 * 60 * 24,
  });
/**
 * The active-contact and campaign-credit meters. `enabled` lets app-wide callers (the
 * sidebar) skip it; it refetches on focus because sends move it server-side.
 */
export const useSubscriptionUsage = (enabled = true) =>
  useQuery({
    queryKey: subscriptionKeys.usage(),
    queryFn: getSubscriptionUsage,
    enabled,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

/** Whether a new contact can be messaged this month; mirrors the API's 403 on outbound sends. */
export const useActiveContactLimit = (enabled = true) => {
  const { data } = useSubscriptionUsage(enabled);
  const budget = data?.activeContacts;
  const hasLimit = Boolean(budget?.metered && typeof budget.max === "number");
  return {
    isExceeded: Boolean(budget?.exhausted),
    used: budget?.used ?? 0,
    limit: budget?.max ?? 0,
    remaining: budget?.remaining ?? 0,
    hasLimit,
  };
};

export const useSubscriptionByOrgId = (orgId: string) =>
  useQuery({
    queryKey: subscriptionKeys.byOrg(orgId),
    queryFn: () => getSubscription(orgId),
  });
export const useAllSubscriptions = () =>
  useQuery({
    queryKey: subscriptionKeys.all(),
    queryFn: getAllSubscriptions,
  });

export const useUpdateSubscriptionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { orgId: string; updatedData: object }) =>
      updateSubscription(data?.orgId, data?.updatedData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.current() });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all() });
      toast.success("Subscription updated successfully");
    },
    onError: (error) => {
      console.error(error);
      toast.error(error?.message || `Error updating subscription ${error?.message ?? ""}`);
    },
  });
};

export const useMessageStats = (orgId: string, filter: QueryFilter) => {
  const filterQuery = Object.entries(filter)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return useQuery({
    queryFn: () => getMessageStats(orgId, filterQuery),
    queryKey: ["messageStats", orgId, filter],
    enabled: !!orgId,
  });
};
