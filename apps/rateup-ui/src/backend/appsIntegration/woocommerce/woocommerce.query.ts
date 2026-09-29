import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { IntegratedApps } from "@/types/enums.ts";

import {
  getWooStatus,
  repairWooWebhooks,
  startWooConnect,
  updateWooSettings,
  type WooSettings,
} from "./woocommerce.api";

/** Under `integrationKeys.byType("woocommerce")`, so a disconnect's invalidation reaches it. */
const wooKeys = {
  status: () => ["integrations", IntegratedApps.woocommerce, "status"] as const,
};

type ApiError = { response?: { data?: { error?: string } }; message?: string };

/** The server's own message, which says what to fix: the address, WooCommerce, the store. */
const messageOf = (error: ApiError, fallback: string) =>
  error?.response?.data?.error ?? error?.message ?? fallback;

export function useWooStatus() {
  return useQuery({ queryKey: wooKeys.status(), queryFn: getWooStatus });
}

/** Leaves for the store's approval screen; it returns to the integration page afterwards. */
export function useStartWooConnect() {
  return useMutation({
    mutationFn: (storeUrl: string) => startWooConnect(storeUrl),
    onSuccess: ({ url }) => window.location.assign(url),
    onError: (error: ApiError) => {
      toast.error(messageOf(error, "Could not reach the store"), { id: "woo-connect" });
    },
  });
}

export function useUpdateWooSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: Partial<WooSettings>) => updateWooSettings(settings),
    onSuccess: (status) => queryClient.setQueryData(wooKeys.status(), status),
    onError: (error: ApiError) => {
      toast.error(messageOf(error, "Could not save the setting"), { id: "woo-settings" });
    },
  });
}

export function useRepairWooWebhooks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: repairWooWebhooks,
    onSuccess: (status) => {
      queryClient.setQueryData(wooKeys.status(), status);
      toast.success("Webhooks registered", { id: "woo-webhooks" });
    },
    onError: (error: ApiError) => {
      toast.error(messageOf(error, "Could not register the webhooks"), { id: "woo-webhooks" });
    },
  });
}
