import { useRouter } from "next/navigation";

import { notifications } from "@mantine/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "../../../utils/notifications";
import {
  cancelStripeSubscription,
  createStripeCheckoutSession,
  deleteStripeProduct,
  getAllStripeSubscriptions,
  getCheckoutSession,
  getStripeProducts,
  syncStripeProducts,
  updateStripeProduct,
} from "./stripe.api";

export function useCreateStripeCheckoutSession(setIsLoading) {
  const router = useRouter();
  return useMutation({
    mutationFn: (values: any) => createStripeCheckoutSession(values),
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
      //setOrder(data.data.data);
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

export const useGetStripeCheckoutSession = (sessionId) => {
  return useQuery({
    enabled: !!sessionId,
    queryFn: () => getCheckoutSession(sessionId),
    queryKey: ["checkoutSessionStatus"],
  });
};

export const useSyncStripeProducts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncStripeProducts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stripeProducts"] });
      showSuccessToast(
        "Stripe products synced successfully",
        "",
        <IconCheck />,
      );
    },
    onError: () => {
      showErrorToast("Error in Syncing stripe products", "", <IconX />);
    },
  });
};

export const useUpdateStripeProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateStripeProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stripeProducts"] });
      showSuccessToast(
        "Stripe product updated successfully",
        "",
        <IconCheck />,
      );
    },
    onError: () => {
      showErrorToast("Error in updating stripe product", "", <IconX />);
    },
  });
};

export const useDeleteStripeProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteStripeProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stripeProducts"] });
      showSuccessToast(
        "Stripe product deleted successfully",
        "stripe",
        <IconCheck />,
        true,
      );
    },
    onError: () => {
      showErrorToast(
        "Error in deleting stripe product",
        "stripe",
        <IconX />,
        true,
      );
    },
  });
};

export const useGetStripeProducts = () => {
  return useQuery({
    queryFn: getStripeProducts,
    queryKey: ["stripeProducts"],
  });
};

export const useGetAllStripeSubscriptions = () => {
  return useQuery({
    queryFn: getAllStripeSubscriptions,
    queryKey: ["stripeSubscriptions"],
  });
};

export function useCancelStripeSubscriptionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cancelStripeSubscription(),
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
