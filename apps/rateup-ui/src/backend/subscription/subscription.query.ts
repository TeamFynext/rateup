import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { subscriptionKeys } from "@/backend/campaign/campaign.keys";
import type { QueryFilter } from "@/types/api.ts";

import {
  getAllSubscriptions,
  getMessageStats,
  getSubscription,
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
