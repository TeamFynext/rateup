import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { IntegratedApps } from "@/types/enums.ts";
import { safeHttpUrl } from "@/utils/safeRedirectUrl.ts";

import {
  checkWooPlugin,
  getWooStatus,
  getWooWidget,
  repairWooWebhooks,
  saveWooWidget,
  startWooConnect,
  updateWooSettings,
  type WooSettings,
} from "./woocommerce.api";

/** Under `integrationKeys.byType("woocommerce")`, so a disconnect's invalidation reaches them. */
const wooKeys = {
  status: () => ["integrations", IntegratedApps.woocommerce, "status"] as const,
  widget: () => ["integrations", IntegratedApps.woocommerce, "widget"] as const,
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
    onSuccess: ({ url }) => {
      // The authorize URL is built from the merchant-typed store address; only follow http(s).
      const target = safeHttpUrl(url);
      if (target) window.location.assign(target);
      else toast.error("Could not reach the store", { id: "woo-connect" });
    },
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
      // The API saves the checkout opt-in even when the store can't be reached.
      queryClient.invalidateQueries({ queryKey: wooKeys.status() });
    },
  });
}

/** The storefront WhatsApp button: settings, whether the plugin answered, 30-day taps. */
export function useWooWidget() {
  return useQuery({ queryKey: wooKeys.widget(), queryFn: getWooWidget });
}

export function useSaveWooWidget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveWooWidget,
    // Also after a failure: the API saves the settings even when the store can't be reached.
    onSettled: () => queryClient.invalidateQueries({ queryKey: wooKeys.widget() }),
  });
}

/** "Check again": the caller says what happened, so this only refreshes the data. */
export function useCheckWooPlugin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: checkWooPlugin,
    onSuccess: (widget) => queryClient.setQueryData(wooKeys.widget(), widget),
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
