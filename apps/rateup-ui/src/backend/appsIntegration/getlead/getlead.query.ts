import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { integrationKeys } from "@/backend/campaign/campaign.keys";
import { IntegratedApps } from "@/types/enums.ts";

import type { GetLeadTriggerSubscription } from "./getlead.api";
import {
  connectGetLead,
  getGetLeadMeta,
  getGetLeadSettings,
  getGetLeadStatus,
  getGetLeadWebhook,
  issueGetLeadWebhook,
  saveGetLeadSettings,
} from "./getlead.api";

const getleadKeys = {
  status: () => ["integrations", "getlead", "status"] as const,
  meta: () => ["integrations", "getlead", "meta"] as const,
  settings: () => ["integrations", "getlead", "settings"] as const,
  webhook: () => ["integrations", "getlead", "webhook"] as const,
};

export function useGetLeadStatus() {
  return useQuery({
    queryKey: getleadKeys.status(),
    queryFn: getGetLeadStatus,
  });
}

/** Reference data for the mapping screens. Only fetched once connected. */
export function useGetLeadMeta(enabled: boolean) {
  return useQuery({
    queryKey: getleadKeys.meta(),
    queryFn: () => getGetLeadMeta(),
    enabled,
  });
}

export function useConnectGetLeadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (apiKey: string) => connectGetLead(apiKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getleadKeys.status() });
      queryClient.invalidateQueries({ queryKey: getleadKeys.meta() });
      // The grid reads the shared statuses list to draw its Connected badge.
      queryClient.invalidateQueries({ queryKey: integrationKeys.all() });
      queryClient.invalidateQueries({
        queryKey: integrationKeys.byType(IntegratedApps.getlead),
      });
      toast.success("GetLead connected", { id: "getlead-connect" });
    },
    onError: (error: { response?: { data?: { error?: string } }; message?: string }) => {
      // The server distinguishes a rejected key from an unreachable GetLead;
      // showing its message is the difference between "fix your key" and "try
      // again later".
      toast.error(error?.response?.data?.error ?? error?.message ?? "Could not connect GetLead", {
        id: "getlead-connect",
      });
    },
  });
}

export function useGetLeadSettings(enabled: boolean) {
  return useQuery({
    queryKey: getleadKeys.settings(),
    queryFn: getGetLeadSettings,
    enabled,
  });
}

export function useSaveGetLeadSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveGetLeadSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getleadKeys.settings() });
      toast.success("GetLead settings saved", { id: "getlead-settings" });
    },
    onError: (error: { response?: { data?: { error?: string } }; message?: string }) => {
      toast.error(error?.response?.data?.error ?? error?.message ?? "Could not save settings", {
        id: "getlead-settings",
      });
    },
  });
}

/**
 * Pulls GetLead's reference data again, bypassing the server's 24h cache.
 *
 * Statuses and sources are edited in GetLead, not here, so a list opened from
 * cache can be missing one added minutes ago. Failure is deliberately silent:
 * the cached list still resolves every id already mapped, so a toast would be
 * noise on a refresh nobody asked for.
 */
export function useRefreshGetLeadMetaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => getGetLeadMeta(true),
    onSuccess: (meta) => queryClient.setQueryData(getleadKeys.meta(), meta),
  });
}

/**
 * Saves the sync toggles on their own, as each is flipped.
 *
 * A switch that reads as on while nothing syncs is worse than a mapping that
 * needs saving, so these do not wait for the Save button. Safe to send alone:
 * the server merges the settings blob, so this cannot drop stage mappings.
 * Quiet on success — a toast per flip would be noise.
 */
export function useSaveGetLeadTriggersMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (triggerSubscriptions: GetLeadTriggerSubscription[]) =>
      saveGetLeadSettings({ triggerSubscriptions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getleadKeys.settings() });
    },
    onError: (error: { response?: { data?: { error?: string } }; message?: string }) => {
      toast.error(error?.response?.data?.error ?? error?.message ?? "Could not save the change", {
        id: "getlead-triggers",
      });
    },
  });
}

/**
 * The inbound webhook's state, re-read while the screen is open.
 *
 * A delivery arrives at the server, not at the browser, so without polling the
 * "Last delivery" line keeps whatever it said when the page loaded — which
 * reads as "GetLead never called" even as deliveries land. Someone setting a
 * webhook up is watching this line to know whether it worked, so it has to
 * move on its own.
 */
export function useGetLeadWebhook(enabled: boolean) {
  return useQuery({
    queryKey: getleadKeys.webhook(),
    queryFn: getGetLeadWebhook,
    enabled,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Replaces the webhook URL and secret.
 *
 * Connecting seeds a pair, so this is rotation. The query is invalidated rather
 * than the response being held onto: a read returns the whole thing, so there is
 * one source for it.
 */
export function useIssueGetLeadWebhookMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: issueGetLeadWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getleadKeys.webhook() });
    },
    onError: (error: { response?: { data?: { error?: string } }; message?: string }) => {
      toast.error(
        error?.response?.data?.error ?? error?.message ?? "Could not create the webhook URL",
        { id: "getlead-webhook" },
      );
    },
  });
}
