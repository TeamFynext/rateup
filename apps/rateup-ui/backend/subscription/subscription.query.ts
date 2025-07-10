import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "../../utils/notifications";
import {
  getAllSubscriptions,
  getSubscription,
  getUserSubscription,
  updateSubscription,
} from "./subscription.api";

export const useSubscription = (enabled = true) =>
  useQuery({
    queryKey: ["subscription"],
    queryFn: getUserSubscription,
    enabled,
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
    mutationFn: (data: {
      orgId: string;
      updatedData: object;
      isMenuPlanChange?: boolean;
    }) =>
      updateSubscription(
        data?.orgId,
        data?.updatedData,
        data?.isMenuPlanChange,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      showSuccessToast("Subscription updated successfully");
    },
    onError: (error: any) => {
      console.error(error);
      showErrorToast(
        `Error updating subscription ${error?.response?.data?.message ?? ""}`,
      );
    },
  });
};
