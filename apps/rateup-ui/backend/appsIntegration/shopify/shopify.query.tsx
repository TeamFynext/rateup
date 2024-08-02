import { IconCheck, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { IntegratedApps } from "@/types/enums";

import { showErrorToast, showSuccessToast } from "../../../utils/notifications";
import {
  deleteAllShopifyWebhooks,
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
      showSuccessToast(
        "Webhooks registration succesfull",
        "webhooks",
        <IconCheck />,
        true,
      );
      queryClient.invalidateQueries({
        queryKey: ["integrations", IntegratedApps.shopify],
      });
      queryClient.invalidateQueries({ queryKey: ["shopifyWebhooks"] });
    },
    onError: () => {
      showErrorToast(
        "Webhook registration failed",
        "webhooks",
        <IconX />,
        true,
      );
    },
  });
};

export const useRegisterWebhookByTopic = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registerShopifyWebhookbyTopic,
    onSuccess: () => {
      showSuccessToast(
        "Webhooks registration succesfull",
        "webhooks",
        <IconCheck />,
        true,
      );
      queryClient.invalidateQueries({
        queryKey: ["integrations", IntegratedApps.shopify],
      });
      queryClient.invalidateQueries({ queryKey: ["shopifyWebhooks"] });
    },
    onError: () => {
      showErrorToast(
        "Webhook registration failed",
        "webhooks",
        <IconX />,
        true,
      );
    },
  });
};

export const useDeleteAllWebhooks = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAllShopifyWebhooks,
    onSuccess: () => {
      showSuccessToast(
        "Webhooks subscription deletion succesfull",
        "webhooks",
        <IconCheck />,
        true,
      );
      queryClient.invalidateQueries({
        queryKey: ["integrations", IntegratedApps.shopify],
      });
      queryClient.invalidateQueries({ queryKey: ["shopifyWebhooks"] });
    },
    onError: () => {
      showErrorToast(
        "Webhook subscription deletion failed",
        "webhooks",
        <IconX />,
        true,
      );
    },
  });
};

export const useDeleteWebhookByTopic = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteShopifyWebhookByTopic,
    onSuccess: () => {
      showSuccessToast(
        "Webhooks subscription deletion succesfull",
        "webhooks",
        <IconCheck />,
        true,
      );
      queryClient.invalidateQueries({
        queryKey: ["integrations", IntegratedApps.shopify],
      });
      queryClient.invalidateQueries({ queryKey: ["shopifyWebhooks"] });
    },
    onError: () => {
      showErrorToast(
        "Webhook subscription deletion failed",
        "webhooks",
        <IconX />,
        true,
      );
    },
  });
};
