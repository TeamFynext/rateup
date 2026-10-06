import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { integrationKeys } from "@/backend/campaign/campaign.keys";
import { IntegratedApps } from "@/types/enums.ts";
import { getApiErrorMessage } from "@/utils/apiError";

import type { integrationSchemaProps, updateIntegrationSchema } from "./integration.api";
import {
  connectAmelia,
  createIntegration,
  deleteIntegration,
  deleteZapierTriggerHook,
  finishOAuthConnect,
  getAllIntegrations,
  getIntegrationActivity,
  getIntegrationByType,
  getIntegrationStatuses,
  getOAuthAuthorizeUrl,
  getPetpoojaWebhookUrl,
  getWaPaymentConfigurations,
  regenerateWaPaymentConfigurationOauth,
  savePetpoojaSettings,
  updateIntegration,
} from "./integration.api";

export const useIntegrationByType = (type: IntegratedApps) => {
  return useQuery({
    queryKey: integrationKeys.byType(type),
    queryFn: () => getIntegrationByType(type),
  });
};

const waPaymentKey = ["waPaymentConfigurations"] as const;

/** The WhatsApp Payment page's list, synced from Meta each time it is fetched. */
export const useWaPaymentConfigurations = () =>
  useQuery({
    queryKey: waPaymentKey,
    queryFn: getWaPaymentConfigurations,
  });

export const useRegenerateWaPaymentConfigurationOauthMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: regenerateWaPaymentConfigurationOauth,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: waPaymentKey });
      toast.success("New verification link created", { id: "waPaymentConfigurations-oauth" });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not create a verification link"), {
        id: "waPaymentConfigurations-oauth",
      });
    },
  });
};

export const useCreateIntegrationMutation = (type: IntegratedApps) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { credential: integrationSchemaProps["credential"] }) =>
      createIntegration({ name: type, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.byType(type) });
      toast.success("Integration created successfully", {
        id: "Integration-create",
      });
    },
    onError: (error) => {
      toast.error(error?.message || `Error creating integration`, {
        id: "integration-create",
      });
    },
  });
};

export const useUpdateIntegrationMutation = (type: IntegratedApps) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: updateIntegrationSchema) => updateIntegration(type, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.byType(type) });
      toast.success("Integration updated successfully", {
        id: "integration-update",
      });
    },
    onError: (error) => {
      toast.error(error?.message || `Error updating integration`, {
        id: "integration-update",
      });
    },
  });
};

export const useDeleteIntegrationMutation = (type: IntegratedApps) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteIntegration(type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.byType(type) });
      toast.success("Integration deleted successfully", {
        id: "integration-delete",
      });
    },
    onError: (error) => {
      toast.error(error?.message || `Error deleting integration`, {
        id: "integration-delete",
      });
    },
  });
};

export const useGetAllIntegrations = () => {
  return useQuery({
    queryKey: integrationKeys.all(),
    queryFn: getAllIntegrations,
  });
};

export const useDeleteZapierTriggerHook = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteZapierTriggerHook,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: integrationKeys.byType(IntegratedApps.zapier),
      });
      toast.success("Zapier hook deleted");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed");
    },
  });
};

export const useIntegrationStatuses = () => {
  return useQuery({
    queryKey: ["integrationStatuses"],
    queryFn: getIntegrationStatuses,
  });
};

/** The Sync activity panel's data: the integration's health and its recent lead entries. */
export const useIntegrationActivity = (name: string, enabled = true) => {
  return useQuery({
    queryKey: [...integrationKeys.byType(name), "activity"],
    queryFn: () => getIntegrationActivity(name),
    enabled,
  });
};

/** Fetches a signed authorize URL and leaves for the provider's consent screen. */
export const useStartOAuthConnect = (name: string) => {
  return useMutation({
    mutationFn: (options?: Record<string, string>) => getOAuthAuthorizeUrl(name, options),
    onSuccess: ({ url }) => {
      window.location.assign(url);
    },
    // The server's reason ("already connected to another workspace") beats axios's status line.
    onError: (error: { response?: { data?: { error?: string } }; message?: string }) => {
      toast.error(error?.response?.data?.error || error?.message || "Could not start connecting", {
        id: `oauth-start-${name}`,
      });
    },
  });
};

export const useFinishOAuthConnect = (name: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { code: string; state: string }) => finishOAuthConnect(name, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.byType(name) });
      queryClient.invalidateQueries({ queryKey: ["integrationStatuses"] });
    },
  });
};

export const useSavePetpoojaSettingsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: savePetpoojaSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.byType(IntegratedApps.petpooja) });
      toast.success("Petpooja settings saved", { id: "integration-update" });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not save Petpooja settings"), {
        id: "integration-update",
      });
    },
  });
};

const petpoojaWebhookKey = ["petpooja", "webhook-url"] as const;

/** The org's Petpooja order URL; fetched only once the integration exists. */
export const usePetpoojaWebhookUrl = (enabled: boolean) =>
  useQuery({
    queryKey: petpoojaWebhookKey,
    queryFn: () => getPetpoojaWebhookUrl(),
    enabled,
    staleTime: Infinity,
  });

export const useRotatePetpoojaWebhookUrlMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => getPetpoojaWebhookUrl(true),
    onSuccess: (data) => {
      queryClient.setQueryData(petpoojaWebhookKey, data);
      toast.success("New webhook URL created. Paste it into Petpooja.", { id: "petpooja-url" });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not create a new URL"), { id: "petpooja-url" });
    },
  });
};

export const useConnectAmeliaMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: connectAmelia,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.byType(IntegratedApps.amelia) });
      queryClient.invalidateQueries({ queryKey: ["integrationStatuses"] });
      toast.success("Amelia connected", { id: "integration-update" });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not connect Amelia"), {
        id: "integration-update",
      });
    },
  });
};
