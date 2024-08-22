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
    mutationFn: ({
      orgId,
      updatedData,
    }: {
      orgId: string;
      updatedData: object;
    }) => updateSubscription(orgId, updatedData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      showSuccessToast("Subscription updated successfully");
    },
    onError: (error) => {
      console.error(error);
      showErrorToast("Error updating subscription");
    },
  });
};
