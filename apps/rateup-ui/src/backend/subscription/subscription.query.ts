import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  getAllSubscriptions,
  getMessageStats,
  getSubscription,
  getUserSubscription,
  updateSubscription,
} from "./subscription.api";

export const useSubscription = (enabled = true) =>
  useQuery({
    queryKey: ["subscription"],
    queryFn: getUserSubscription,
    enabled,
    staleTime: 0,
    gcTime: 1000 * 60 * 60 * 24,
  });
export const useSubscriptionByOrgId = (orgId: string) =>
  useQuery({
    queryKey: ["subscription", orgId],
    queryFn: () => getSubscription(orgId),
  });
export const useAllSubscriptions = () =>
  useQuery({
    queryKey: ["subscriptions"],
    queryFn: getAllSubscriptions,
  });

export const useUpdateSubscriptionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { orgId: string; updatedData: object; isMenuPlanChange?: boolean }) =>
      updateSubscription(data?.orgId, data?.updatedData, data?.isMenuPlanChange),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      toast.success("Subscription updated successfully");
    },
    onError: (error) => {
      console.error(error);
      toast.error(error?.message || `Error updating subscription ${error?.message ?? ""}`);
    },
  });
};

export const useMessageStats = (orgId, filter: any) => {
  const filterQuery = Object.entries(filter)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return useQuery({
    queryFn: () => getMessageStats(orgId, filterQuery),
    queryKey: ["messageStats", orgId, filter],
    enabled: !!orgId,
  });
};
