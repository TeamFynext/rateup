import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { subscriptionKeys } from "@/backend/campaign/campaign.keys";
import type { RequestPayload } from "@/types/api.ts";

import type { ICreateCheckoutType } from "./payment.api";
import {
  cancelRazorpaySubscription,
  createCheckoutSession,
  createRateupPaymentPlan,
  deletePaymentPlan,
  deleteRateupPaymentPlan,
  getAllOrdersUserOrg,
  getAllPaymentOrders,
  getAllPaymentPlans,
  getAllPaymentSubscription,
  getAllRateupPaymentPlans,
  sendMailPlanSelectDetails,
  syncRazorPayPlans,
  updatePaymentPlan,
  updateRateupPaymentPlan,
  updateSubscriptionOrder,
} from "./payment.api";

export function usePaymentsPlans() {
  return useQuery({
    queryKey: ["paymentPlansQuery"],
    queryFn: getAllPaymentPlans,
  });
}

export function useRateupPaymentsPlans() {
  return useQuery({
    queryKey: ["rateupPaymentPlansQuery"],
    queryFn: getAllRateupPaymentPlans,
  });
}

export function useUserOrgOrders(enabled = true) {
  return useQuery({
    queryKey: subscriptionKeys.orgOrders(),
    queryFn: getAllOrdersUserOrg,
    enabled,
  });
}

export function useRateupPaymentsPlanMutation(close: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RequestPayload) => createRateupPaymentPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rateupPaymentPlansQuery"] });
      toast.success("RateUp Plan created successfully.", {
        id: "load-data",
      });
      close();
    },
    onError: (error) => {
      toast.error(error?.message || "Error creating RateUp Plan", {
        id: "load-data",
      });
    },
  });
}

export function useRateupPaymentsPlanUpdateMutation(close: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RequestPayload) => updateRateupPaymentPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rateupPaymentPlansQuery"] });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.current() });
      toast.success("RateUp Plan updated successfully.", {
        id: "load-data",
      });
      close();
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ["rateupPaymentPlansQuery"] });
      toast.error(error?.message || "Error updating RateUp Plan", {
        id: "load-data",
      });
    },
  });
}

export function useRateupPaymentsPlanDeleteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteRateupPaymentPlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rateupPaymentPlansQuery"] });
      toast.success("RateUp Plan deleted successfully.", {
        id: "load-data",
      });
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ["rateupPaymentPlansQuery"] });
      toast.error(error?.message || "Error deleting RateUp Plan", {
        id: "load-data",
      });
    },
  });
}
export function usePlanSyncMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => syncRazorPayPlans(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentPlansQuery"] });
      toast.success("RazorPay Plan list updated successfully.", {
        id: "load-data",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Error syncing RazorPay Plans", {
        id: "load-data",
      });
    },
  });
}

export function useCreateCheckoutSession<TOrder>(
  setIsLoading: (loading: boolean) => void,
  setOrder: (order: TOrder) => void,
) {
  return useMutation({
    mutationFn: (values: ICreateCheckoutType) => createCheckoutSession(values),
    onSuccess: (data) => {
      toast.success("Please wait get ready for payment", {
        id: "load-data",
      });
      setIsLoading(false);
      setOrder(data.data.data);
    },
    onError: (error) => {
      console.error("Error creating order:" + error.message);
      toast.error(error?.message || "Error creating order", {
        id: "load-data",
      });

      setIsLoading(false);
    },
  });
}

export function usePaymentPlanUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePaymentPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentPlansQuery"] });
      toast.success("Plan updated succesfully", {
        id: "plan-update",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Error updating plan", {
        id: "plan-update",
      });
    },
  });
}

export function usePaymentSubcription() {
  return useQuery({
    queryKey: ["paymentsubscription"],
    queryFn: getAllPaymentSubscription,
  });
}

export function useCancelRazorpaySubscriptionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cancelRazorpaySubscription(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.current() });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.orgOrders() });
      toast.success("Rateup Subscription cancelled. Enjoy services till expiry date.", {
        id: "load-data",
      });
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.current() });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.orgOrders() });
      toast.error(error?.message || "Error cancelling Rateup Subscription", {
        id: "load-data",
      });
    },
  });
}

export function usePaymentOrders() {
  return useQuery({
    queryKey: ["paymentorders"],
    queryFn: getAllPaymentOrders,
  });
}

export const useDeletePaymentPlanMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePaymentPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentPlansQuery"] });
      toast.success("Plan Deleted Succefully", {
        id: "plan",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Error in deleting Plan", {
        id: "plan",
      });
    },
  });
};

export function useSendMailPlanSelectDetails() {
  return useMutation({
    mutationFn: sendMailPlanSelectDetails,
  });
}

export const useUpdateSubscriptionOrder = (orderId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RequestPayload) => updateSubscriptionOrder(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentorders"] });
    },
  });
};
