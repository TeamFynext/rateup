import { IconCheck, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { IntegratedApps } from "@/types/enums";
import { showErrorToast, showSuccessToast } from "@/utils/notifications";

import {
  createGoogleSheetAuthToken,
  createIntegration,
  deleteIntegration,
  getGoogleSheetAuthorizationUrl,
  getIntegrationByType,
  updateIntegration,
  updateIntegrationSchema,
} from "./integration.api";

export const useIntegrationByType = (type: IntegratedApps) => {
  return useQuery({
    queryKey: ["integrations", type],
    queryFn: () => getIntegrationByType(type),
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
