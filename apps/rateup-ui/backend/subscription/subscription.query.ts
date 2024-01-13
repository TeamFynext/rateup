import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAllSubscriptions,
  getSubscription,
  getUserSubscription,
  updateSubscription,
} from "./subscription.api";
import { showErrorToast, showSuccessToast } from "../../utils/notifications";

export const useSubscription = () =>
  useQuery({
    queryKey: ["subscription"],
    queryFn: getUserSubscription,
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
