import { useRouter } from "next/navigation";

import { notifications } from "@mantine/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "../../utils/notifications";
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
      notifications.update({
        id: "load-data",
        color: "teal",
        loading: false,
        title: "Sync Success",
        message: "RateUp Plan created successfully.",
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
      close();
    },
    onError: (error: any) => {
      notifications.update({
        id: "load-data",
        color: "red",
        loading: false,
        title: "Failed",
        message: error.response.data,
        icon: <IconX size="1rem" />,
        autoClose: 3000,
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
      notifications.update({
        id: "load-data",
        color: "teal",
        loading: false,
        title: "Sync Success",
        message: "RateUp Plan updated successfully.",
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
      close();
    },
    onError: (error: any) => {
      queryClient.invalidateQueries({ queryKey: ["rateupPaymentPlansQuery"] });
      notifications.update({
        id: "load-data",
        color: "red",
        loading: false,
        title: "Failed",
        message: error.response.data,
        icon: <IconX size="1rem" />,
        autoClose: 3000,
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
      notifications.update({
        id: "load-data",
        color: "teal",
        loading: false,
        title: "Sync Success",
        message: "RateUp Plan deleted successfully.",
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
    },
    onError: (error: any) => {
      queryClient.invalidateQueries({ queryKey: ["rateupPaymentPlansQuery"] });
      notifications.update({
        id: "load-data",
        color: "red",
        loading: false,
        title: "Failed",
        message: error.response.data,
        icon: <IconX size="1rem" />,
        autoClose: 3000,
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
      notifications.show({
        id: "load-data",
        color: "teal",
        loading: false,
        title: "Sync Success",
        message: "RazorPay Plan list updated successfully.",
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
    },
    onError: (error: any) => {
      notifications.show({
        id: "load-data",
        color: "red",
        loading: false,
        title: "Failed",
        message: error.response.data,
        icon: <IconX size="1rem" />,
        autoClose: 3000,
      });
    },
  });
}

export function useCreateCheckoutSession(setIsLoading, setOrder) {
  const router = useRouter();
  return useMutation({
    mutationFn: (values: ICreateCheckoutType) => createCheckoutSession(values),
    onSuccess: (data) => {
      notifications.show({
        id: "load-data",
        color: "teal",
        title: "Processing Started",
        message: "Please wait get ready for payment",
        icon: <IconCheck size="1rem" />,
        loading: true,
        autoClose: 3000,
      });
      setIsLoading(false);
      setOrder(data.data.data);
    },
    onError: (error: any) => {
      console.error("Error creating order:" + error.message);
      notifications.show({
        id: "load-data",
        color: "red",
        title: "Failed",
        message: error?.response?.data?.message,
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
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
      showSuccessToast(
        "Plan updated succesfully",
        "plan-update",
        <IconCheck />,
      );
    },
    onError: () => {
      showErrorToast("Error updating plan", "plan-update", <IconX />);
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
      notifications.update({
        id: "load-data",
        color: "teal",
        loading: false,
        title: "Cancel Success",
        message:
          "Rateup Subscription cancelled. Enjoy services till expiry date.",
        icon: <IconCheck size="1rem" />,
        autoClose: 4000,
      });
    },
    onError: (error: any) => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      queryClient.invalidateQueries({ queryKey: ["userOrgOrdersQuery"] });
      notifications.update({
        id: "load-data",
        color: "red",
        loading: false,
        title: "Failed",
        message: error.response.data,
        icon: <IconX size="1rem" />,
        autoClose: 4000,
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
      showSuccessToast("Plan Deleted Succefully", "plan", <IconCheck />, true);
    },
    onError: () => {
      showErrorToast("Error in deleting Plan", "plan", <IconCheck />, true);
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
