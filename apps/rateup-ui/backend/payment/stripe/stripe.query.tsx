import { IconCheck } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/router";
import {
  createStripeCheckoutSession,
  getAllStripeSubscriptions,
  getCheckoutSession,
  getStripeProducts,
  syncStripeProducts,
  updateStripeProduct,
} from "./stripe.api";
import { showErrorToast, showSuccessToast } from "../../../utils/notifications";

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
  return useMutation({
    mutationFn: syncStripeProducts,
    onSuccess: () => {
      showSuccessToast("Stripe products synced successfully");
    },
    onError: () => {
      showErrorToast("Error in Syncing stripe products");
    },
  });
};

export const useUpdateStripeProduct = () => {
  return useMutation({
    mutationFn: updateStripeProduct,
    onSuccess: () => {
      showSuccessToast("Stripe product updated successfully");
    },
    onError: () => {
      showErrorToast("Error in updating stripe product");
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
