import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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

export const useUpdateLoyaltyTemplate = (commandId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => updateLoyaltyTemplate(commandId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["LoyaltyTemplate"] });
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
      queryClient.invalidateQueries({ queryKey: ["LoyaltyTemplate"] });
      queryClient.invalidateQueries({ queryKey: ["allLoyaltyTemplates"] });
      toast.success("Command configuration deleted");
    },
    onError: (error) => {
      toast.error(error?.message || "Command config deletion failed");
    },
  });
};

const _useGetLoyaltyTemplate = (commandId) => {
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
