import { IconCheck, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { IntegratedApps } from "@/types/enums";
import { showErrorToast, showSuccessToast } from "@/utils/notifications";

import {
  createIntegration,
  deleteIntegration,
  getIntegrationByType,
  updateIntegration,
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
    mutationFn: updateIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", type] });
      showSuccessToast(
        "Integration updated successfully",
        "Integration-update",
        <IconCheck />,
      );
    },
    onError: (error: any) => {
      showErrorToast(
        `Error updating integration: ${error?.response?.data?.error}`,
        "integration-update",
        <IconX />,
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
        "Integration-delete",
        <IconCheck />,
      );
    },
    onError: (error: any) => {
      showErrorToast(
        `Error deleting integration: ${error?.response?.data?.error}`,
        "integration-delete",
        <IconX />,
      );
    },
  });
};
