import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createApiKey,
  deleteApiKey,
  getApiKeyCreatedAt,
  regenerateApiKey,
} from "./loyaltyApiKey.api";
import { showErrorToast, showSuccessToast } from "../../../utils/notifications";

export const useLoyaltyApiKey = () =>
  useQuery({
    queryKey: ["apiAccessToken"],
    queryFn: getApiKeyCreatedAt,
  });

export const useCreateLoyaltyApiKey = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createApiKey,
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["apiAccessToken"],
      });
      showSuccessToast("API Key created successfully");
    },
    onError: (error) => {
      console.error(error);
      showErrorToast("Failed to create API Key");
    },
  });
};

export const useDeleteLoyaltyApiKey = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteApiKey,
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["apiAccessToken"],
      });
      showSuccessToast("API Key deleted successfully");
    },
    onError: (error) => {
      console.error(error);
      showErrorToast("Failed to delete API Key");
    },
  });
};

export const useRegenerateLoyaltyApiKey = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: regenerateApiKey,
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["apiAccessToken"],
      });
      showSuccessToast("API Key regenerated successfully");
    },
    onError: (error) => {
      console.error(error);
      showErrorToast("Failed to regenerate API Key");
    },
  });
};
