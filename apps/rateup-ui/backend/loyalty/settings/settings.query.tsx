import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "@/utils/notifications";

import {
  createLoyaltyTemplate,
  deleteLoyaltyTemplate,
  getAllLoyaltyTemplates,
  getLoyaltyTemplate,
  updateLoyaltyTemplate,
} from "./settings.api";

export const useCreateLoyaltyTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLoyaltyTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allLoyaltyTemplates"] });
      showSuccessToast("Command configured");
    },
    onError: (e: any) => {
      showErrorToast(
        `Command configuration failed: ${e?.response?.data?.message ?? e?.response?.data ?? ""}`,
      );
    },
  });
};

export const useUpdateLoyaltyTemplate = (commandId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => updateLoyaltyTemplate(commandId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["LoyaltyTemplate"] });
      queryClient.invalidateQueries({ queryKey: ["allLoyaltyTemplates"] });
      showSuccessToast("Command configuration updated");
    },
    onError: () => {
      showErrorToast("Command config updation failed");
    },
  });
};

export const useDeleteLoyaltyTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteLoyaltyTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["LoyaltyTemplate"] });
      queryClient.invalidateQueries({ queryKey: ["allLoyaltyTemplates"] });
      showSuccessToast("Command configuration deleted");
    },
    onError: () => {
      showErrorToast("Command config deletion failed");
    },
  });
};

export const useGetLoyaltyTemplate = (commandId) => {
  return useQuery({
    queryFn: () => getLoyaltyTemplate(commandId),
    queryKey: ["LoyaltyTemplate"],
    enabled: !!commandId,
  });
};

export const useGetAllLoyaltyTemplates = () => {
  return useQuery({
    queryFn: getAllLoyaltyTemplates,
    queryKey: ["allLoyaltyTemplates"],
  });
};
