import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
  ICreateCheckoutType,
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
    queryKey: ["userOrgOrdersQuery"],
    queryFn: getAllOrdersUserOrg,
    enabled,
  });
}

export function useRateupPaymentsPlanMutation(close) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => createRateupPaymentPlan(data),
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

export function useRateupPaymentsPlanUpdateMutation(close) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => updateRateupPaymentPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rateupPaymentPlansQuery"] });
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
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

export function useCreateCheckoutSession(setIsLoading, setOrder) {
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
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      queryClient.invalidateQueries({ queryKey: ["userOrgOrdersQuery"] });
      toast.success(
        "Rateup Subscription cancelled. Enjoy services till expiry date.",
        {
          id: "load-data",
        },
      );
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      queryClient.invalidateQueries({ queryKey: ["userOrgOrdersQuery"] });
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendMailPlanSelectDetails,
  });
}

export const useUpdateSubscriptionOrder = (orderId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => updateSubscriptionOrder(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentorders"] });
    },
  });
};
