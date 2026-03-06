import { useRouter } from "next/navigation";

import { IconCheck, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
      toast.loading("Please wait get ready for payment", {
        id: "load-data",
      });
      setIsLoading(false);
      //setOrder(data.data.data);
    },
    onError: (error) => {
      console.error("Error creating order:" + error.message);
      toast.loading(error?.message, {
        id: "load-data",
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
      toast.success("Stripe products synced successfully", {
        id: "",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Error in Syncing stripe products", {
        id: "",
      });
    },
  });
};

export const useUpdateStripeProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateStripeProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stripeProducts"] });
      toast.success("Stripe product updated successfully", {
        id: "",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Error in updating stripe product", {
        id: "",
      });
    },
  });
};

export const useDeleteStripeProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteStripeProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stripeProducts"] });
      toast.success("Stripe product deleted successfully", {
        id: "stripe",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Error in deleting stripe product", {
        id: "stripe",
      });
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
