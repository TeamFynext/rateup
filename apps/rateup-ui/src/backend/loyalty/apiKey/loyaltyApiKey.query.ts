import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createApiKey,
  deleteApiKey,
  getApiKeyCreatedAt,
  regenerateApiKey,
} from "./loyaltyApiKey.api";

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
      toast.success("API Key created successfully");
    },
    onError: (error) => {
      console.error(error);
      toast.error(error?.message || "Failed to create API Key");
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
      toast.success("API Key deleted successfully");
    },
    onError: (error) => {
      console.error(error);
      toast.error(error?.message || "Failed to delete API Key");
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
      toast.success("API Key regenerated successfully");
    },
    onError: (error) => {
      console.error(error);
      toast.error(error?.message || "Failed to regenerate API Key");
    },
  });
};
