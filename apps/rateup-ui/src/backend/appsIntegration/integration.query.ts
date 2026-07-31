import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { integrationKeys } from "@/backend/campaign/campaign.keys";
import { IntegratedApps } from "@/types/enums.ts";

import type { integrationSchemaProps, updateIntegrationSchema } from "./integration.api";
import {
  createGoogleSheetAuthToken,
  createIntegration,
  createWaPaymentConfiguration,
  deleteIntegration,
  deleteWaPaymentConfiguration,
  deleteZapierTriggerHook,
  getAllIntegrations,
  getGoogleSheetAuthorizationUrl,
  getIntegrationByType,
  getIntegrationStatuses,
  getWaPaymentConfigurationByName,
  getWaPaymentConfigurations,
  regenerateWaPaymentConfigurationOauth,
  updateIntegration,
} from "./integration.api";

export const useIntegrationByType = (type: IntegratedApps) => {
  return useQuery({
    queryKey: integrationKeys.byType(type),
    queryFn: () => getIntegrationByType(type),
  });
};

export const useWaPaymentConfigurations = (whatsappSettingsId?: string) => {
  return useQuery({
    queryKey: ["waPaymentConfigurations", whatsappSettingsId],
    queryFn: () => getWaPaymentConfigurations(whatsappSettingsId),
    enabled: !!whatsappSettingsId,
  });
};

export const useGetWaPaymentConfigurationByNameMutation = (type: IntegratedApps) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: getWaPaymentConfigurationByName,
    onSuccess: () => {
      toast.success("whatsapp payment configuration found successfully", {
        id: "waPaymentConfiguration-get-by-name",
      });
      queryClient.invalidateQueries({ queryKey: integrationKeys.byType(type) });
    },
    onError: (error) => {
      toast.error(error?.message || `Error getting waPaymentConfiguration`, {
        id: "waPaymentConfiguration-get-by-name",
      });
    },
  });
};

export const useCreateWaPaymentConfigurationMutation = (type: IntegratedApps) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWaPaymentConfiguration,
    onSuccess: () => {
      toast.success("whatsapp payment configuration created successfully", {
        id: "waPaymentConfigurations-create",
      });
      queryClient.invalidateQueries({ queryKey: integrationKeys.byType(type) });
    },
    onError: (error) => {
      toast.error(error?.message || `Error creating waPaymentConfigurations`, {
        id: "waPaymentConfigurations-create",
      });
    },
  });
};
export const useRegenerateWaPaymentConfigurationOauthMutation = (type: IntegratedApps) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: regenerateWaPaymentConfigurationOauth,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.byType(type) });
      toast.success("whatsapp payment configuration oauth link updated successfully", {
        id: "waPaymentConfigurations-oauth",
      });
    },
    onError: (error) => {
      toast.error(error?.message || `Error creating waPaymentConfigurations oauth link`, {
        id: "waPaymentConfigurations-oauth",
      });
    },
  });
};
export const useDeleteWaPaymentConfigurationMutation = (type: IntegratedApps) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWaPaymentConfiguration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.byType(type) });

      toast.success("whatsapp payment configuration created successfully", {
        id: "waPaymentConfigurations-delete",
      });
    },
    onError: (error) => {
      toast.error(error?.message || `Error creating waPaymentConfigurations`, {
        id: "waPaymentConfigurations-delete",
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

export const useGetGoogleSheetAuthorizationUrl = () => {
  return useQuery({
    queryKey: ["authriationurl"],
    queryFn: () => getGoogleSheetAuthorizationUrl(),
  });
};

export const useCreateAuthToken = () => {
  return useMutation({
    mutationFn: createGoogleSheetAuthToken,
    onError: (error) => {
      toast.error(error?.message || "Error authorizing Google Sheets", {
        id: "googlesheet-auth-token",
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
      toast.success("success");
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
