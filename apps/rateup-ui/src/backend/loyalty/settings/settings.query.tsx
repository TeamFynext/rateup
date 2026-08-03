import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { loyaltyKeys } from "@/backend/loyalty/loyalty.keys";
import type { RequestPayload } from "@/types/api.ts";

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
      toast.success("Command configured");
    },
    onError: (error) => {
      toast.error(error?.message || `Command configuration failed`);
    },
  });
};

export const useUpdateLoyaltyTemplate = (commandId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RequestPayload) => updateLoyaltyTemplate(commandId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.templates() });
      queryClient.invalidateQueries({ queryKey: ["allLoyaltyTemplates"] });
      toast.success("Command configuration updated");
    },
    onError: (error) => {
      toast.error(error?.message || "Command config updation failed");
    },
  });
};

export const useDeleteLoyaltyTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteLoyaltyTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.templates() });
      queryClient.invalidateQueries({ queryKey: ["allLoyaltyTemplates"] });
      toast.success("Command configuration deleted");
    },
    onError: (error) => {
      toast.error(error?.message || "Command config deletion failed");
    },
  });
};

export const useGetLoyaltyTemplate = (commandId: string) => {
  return useQuery({
    queryFn: () => getLoyaltyTemplate(commandId),
    queryKey: loyaltyKeys.templates(),
    enabled: !!commandId,
  });
};

export const useGetAllLoyaltyTemplates = () => {
  return useQuery({
    queryFn: getAllLoyaltyTemplates,
    queryKey: ["allLoyaltyTemplates"],
  });
};
