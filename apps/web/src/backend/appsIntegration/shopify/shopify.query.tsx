import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { integrationKeys } from "@/backend/campaign/campaign.keys";
import { IntegratedApps } from "@/types/enums.ts";

import {
  deleteAllShopifyWebhooks,
  deleteShopifyIntegrationByShop,
  deleteShopifyWebhookByTopic,
  getProductsFromShopify,
  getRegisteredWebhooks,
  getShopifyAttribution,
  getShopifyWidget,
  registerShopifyWebhookbyTopic,
  registerShopifyWebhooks,
  saveShopifyWidget,
  updateShopifySession,
} from "./shopify.api";

export const useGetProductsFromShopify = (enabled: boolean) => {
  return useQuery({
    queryKey: ["shopifyProducts"],
    queryFn: getProductsFromShopify,
    enabled,
  });
};

/** Cart-reminder results for the last `days` days, ending now. */
export const useShopifyAttribution = (days: number) => {
  return useQuery({
    queryKey: ["shopifyAttribution", days],
    queryFn: () => {
      const to = new Date();
      const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
      return getShopifyAttribution({ from: from.toISOString(), to: to.toISOString() });
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
};

const shopifyWidgetKey = ["shopifyWidget"] as const;

/** The storefront WhatsApp button: its settings, theme editor link and 30-day taps. */
export const useShopifyWidget = () => {
  return useQuery({
    queryKey: shopifyWidgetKey,
    queryFn: getShopifyWidget,
  });
};

export const useSaveShopifyWidget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveShopifyWidget,
    // Also after a failure: the API can save the settings and still fail to reach the store.
    onSettled: () => queryClient.invalidateQueries({ queryKey: shopifyWidgetKey }),
  });
};

export const useGetRegisteredWebhooks = (enabled: boolean) => {
  return useQuery({
    queryKey: ["shopifyWebhooks"],
    queryFn: getRegisteredWebhooks,
    enabled,
  });
};

export const useUpdateShopifySession = () => {
  return useMutation({
    mutationFn: updateShopifySession,
  });
};

export const useRegisterWebhooks = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registerShopifyWebhooks,
    onSuccess: () => {
      toast.success("Webhooks registration succesfull", {
        id: "webhooks",
      });
      queryClient.invalidateQueries({
        queryKey: integrationKeys.byType(IntegratedApps.shopify),
      });
      queryClient.invalidateQueries({ queryKey: ["shopifyWebhooks"] });
    },
    onError: (error) => {
      toast.error(error?.message || "Webhook registration failed", {
        id: "webhooks",
      });
    },
  });
};

export const useRegisterWebhookByTopic = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registerShopifyWebhookbyTopic,
    onSuccess: () => {
      toast.success("Webhooks registration succesfull", {
        id: "webhooks",
      });
      queryClient.invalidateQueries({
        queryKey: integrationKeys.byType(IntegratedApps.shopify),
      });
      queryClient.invalidateQueries({ queryKey: ["shopifyWebhooks"] });
    },
    onError: (error) => {
      toast.error(error?.message || "Webhook registration failed", {
        id: "webhooks",
      });
    },
  });
};

export const useDeleteAllWebhooks = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAllShopifyWebhooks,
    onSuccess: () => {
      toast.success("Webhooks subscription deletion succesfull", {
        id: "webhooks",
      });
      queryClient.invalidateQueries({
        queryKey: integrationKeys.byType(IntegratedApps.shopify),
      });
      queryClient.invalidateQueries({ queryKey: ["shopifyWebhooks"] });
    },
    onError: (error) => {
      toast.error(error?.message || "Webhook subscription deletion failed", {
        id: "webhooks",
      });
    },
  });
};

export const useDeleteWebhookByTopic = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteShopifyWebhookByTopic,
    onSuccess: () => {
      toast.success("Webhooks subscription deletion succesfull", {
        id: "webhooks",
      });
      queryClient.invalidateQueries({
        queryKey: integrationKeys.byType(IntegratedApps.shopify),
      });
      queryClient.invalidateQueries({ queryKey: ["shopifyWebhooks"] });
    },
    onError: (error) => {
      toast.error(error?.message || "Webhook subscription deletion failed", {
        id: "webhooks",
      });
    },
  });
};

export const useDeleteShopifyIntegrationByShop = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteShopifyIntegrationByShop,
    onSuccess: () => {
      toast.success("Integration deleted", {
        id: "integration",
      });
      queryClient.invalidateQueries({ queryKey: integrationKeys.all() });
    },
    onError: (error) => {
      toast.error(error?.message || `Error in deleting integration ${error?.message ?? ""}`, {
        id: "integration",
      });
    },
  });
};
