import { IconCheck, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { IntegratedApps } from "@/types/enums";
import { showErrorToast, showSuccessToast } from "@/utils/notifications";

import {
  createGoogleSheetAuthToken,
  createIntegration,
  createWaPaymentConfiguration,
  deleteIntegration,
  deleteWaPaymentConfiguration,
  getGoogleSheetAuthorizationUrl,
  getIntegrationByType,
  getWaPaymentConfigurations,
  regenerateWaPaymentConfigurationOauth,
  updateIntegration,
  updateIntegrationSchema,
} from "./integration.api";

export const useIntegrationByType = (type: IntegratedApps) => {
  return useQuery({
    queryKey: ["integrations", type],
    queryFn: () => getIntegrationByType(type),
  });
};

export const useWaPaymentConfigurations = () => {
  return useQuery({
    enabled: false,
    queryKey: ["waPaymentConfigurations"],
    queryFn: getWaPaymentConfigurations,
  });
};

export const useCreateWaPaymentConfigurationMutation = (
  type: IntegratedApps,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWaPaymentConfiguration,
    onSuccess: () => {
      showSuccessToast(
        "whatsapp payment configuration created successfully",
        "waPaymentConfigurations-create",
        <IconCheck />,
        true,
      );
      queryClient.invalidateQueries({ queryKey: ["integrations", type] });
    },
    onError: (error: any) => {
      showErrorToast(
        `Error creating waPaymentConfigurations: ${error?.response?.data?.error}`,
        "waPaymentConfigurations-create",
        <IconX />,
        true,
      );
    },
  });
};
export const useRegenerateWaPaymentConfigurationOauthMutation = (
  type: IntegratedApps,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: regenerateWaPaymentConfigurationOauth,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", type] });
      showSuccessToast(
        "whatsapp payment configuration oauth link updated successfully",
        "waPaymentConfigurations-oauth",
        <IconCheck />,
      );
    },
    onError: (error: any) => {
      console.log(error);

      showErrorToast(
        `Error creating waPaymentConfigurations oauth link: ${error?.response?.data?.message}`,
        "waPaymentConfigurations-oauth",
        <IconX />,
      );
    },
  });
};
export const useDeleteWaPaymentConfigurationMutation = (
  type: IntegratedApps,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWaPaymentConfiguration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", type] });

      showSuccessToast(
        "whatsapp payment configuration created successfully",
        "waPaymentConfigurations-delete",
        <IconCheck />,
        true,
      );
    },
    onError: (error: any) => {
      showErrorToast(
        `Error creating waPaymentConfigurations: ${error?.response?.data}`,
        "waPaymentConfigurations-delete",
        <IconX />,
        true,
      );
    },
  });
};

export const useCreateIntegrationMutation = (type: IntegratedApps) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", type] });
      showSuccessToast(
        "Integration created successfully",
        "Integration-create",
        <IconCheck />,
      );
    },
    onError: (error: any) => {
      showErrorToast(
        `Error creating integration: ${error?.response?.data?.error}`,
        "integration-create",
        <IconX />,
      );
    },
  });
};

export const useUpdateIntegrationMutation = (type: IntegratedApps) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: updateIntegrationSchema) =>
      updateIntegration(type, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", type] });
      showSuccessToast(
        "Integration updated successfully",
        "integration-update",
        <IconCheck />,
        true,
      );
    },
    onError: (error: any) => {
      showErrorToast(
        `Error updating integration: ${error?.response?.data?.error}`,
        "integration-update",
        <IconX />,
        true,
      );
    },
  });
};

export const useDeleteIntegrationMutation = (type: IntegratedApps) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", type] });
      showSuccessToast(
        "Integration deleted successfully",
        "integration-delete",
        <IconCheck />,
        true,
      );
    },
    onError: (error: any) => {
      showErrorToast(
        `Error deleting integration: ${error?.response?.data?.error}`,
        "integration-delete",
        <IconX />,
        true,
      );
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
    onSuccess: (data) => {},
  });
};
