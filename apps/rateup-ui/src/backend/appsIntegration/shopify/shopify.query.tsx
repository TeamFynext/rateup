import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { IntegratedApps } from "@/types/enums.ts";

import {
  deleteAllShopifyWebhooks,
  deleteShopifyIntegrationByShop,
  deleteShopifyWebhookByTopic,
  getProductsFromShopify,
  getRegisteredWebhooks,
  registerShopifyWebhookbyTopic,
  registerShopifyWebhooks,
  updateShopifySession,
} from "./shopify.api";

export const useGetProductsFromShopify = (enabled) => {
  return useQuery({
    queryKey: ["shopifyProducts"],
    queryFn: getProductsFromShopify,
    enabled,
  });
};

export const useGetRegisteredWebhooks = (enabled) => {
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
        queryKey: ["integrations", IntegratedApps.shopify],
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
        queryKey: ["integrations", IntegratedApps.shopify],
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
        queryKey: ["integrations", IntegratedApps.shopify],
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
        queryKey: ["integrations", IntegratedApps.shopify],
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
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
    onError: (error) => {
      toast.error(error?.message || `Error in deleting integration ${error?.message ?? ""}`, {
        id: "integration",
      });
    },
  });
};
