import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { subscriptionKeys } from "@/backend/campaign/campaign.keys";
import type { RequestPayload } from "@/types/api.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import type { ICreateCheckoutType } from "./payment.api";
import {
  cancelRazorpaySubscription,
  createCheckoutSession,
  createRateupPaymentPlan,
  deletePaymentPlan,
  deleteRateupPaymentPlan,
  getAllOrdersUserOrg,
  getAllPaymentOrders,
  changeSubscriptionPlan,
  getAllPaymentPlans,
  createConversationAddonOrder,
  getConversationAddonOffer,
  getOrgInvoices,
  getSubscriptionChangeOptions,
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

/**
 * Whether this subscription can change plans, and whether it can do so mid-cycle.
 *
 * Reads Razorpay live, so it is only fetched when the change dialog is actually open.
 */
export function useSubscriptionChangeOptions(enabled: boolean) {
  return useQuery({
    queryKey: ["subscriptionChangeOptions"],
    queryFn: getSubscriptionChangeOptions,
    enabled,
    staleTime: 0,
  });
}

/**
 * Switches a live subscription onto another tier.
 *
 * The org's plan is not updated here — Razorpay confirms over `subscription.updated`
 * (and `subscription.charged` for an immediate upgrade), and the webhook is the only
 * writer. Invalidating the queries just pulls whatever has landed by now; a downgrade
 * deliberately shows no change until the cycle ends.
 */
export function useChangeSubscriptionPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: changeSubscriptionPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.current() });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.orgOrders() });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.orgInvoices() });
    },
  });
}

/**
 * Invoice history. Read live from Razorpay on every request, so it lags a successful
 * charge by however long the invoice takes to be raised — refetch on mount rather than
 * serving a cached list that is missing the payment the user just made.
 */
export function useOrgInvoices(enabled = true) {
  return useQuery({
    queryKey: subscriptionKeys.orgInvoices(),
    queryFn: getOrgInvoices,
    enabled,
    refetchOnMount: "always",
    staleTime: 0,
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
      // A refused purchase — an add-on a Free or Enterprise plan may not buy — comes back
      // as a 400 with the reason. Showing the axios status text instead would tell the
      // customer nothing about why.
      console.error("Error creating order:" + error.message);
      toast.error(getApiErrorMessage(error, "Error creating order"), {
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

/** What the billing page needs to show — and possibly sell — conversation packs. */
export function useConversationAddonOffer(enabled = true) {
  return useQuery({
    queryKey: subscriptionKeys.conversationAddon(),
    queryFn: getConversationAddonOffer,
    enabled,
  });
}

/**
 * Buys conversation packs outright.
 *
 * The packs are not credited here — Razorpay confirms over `payment.captured`, and that
 * webhook is the only writer, so a customer who closes the tab mid-payment still gets
 * what they paid for. This only creates the order the checkout is opened against.
 */
export function useCreateConversationAddonOrder() {
  return useMutation({ mutationFn: createConversationAddonOrder });
}
