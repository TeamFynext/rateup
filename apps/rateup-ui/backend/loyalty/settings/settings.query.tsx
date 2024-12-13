import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "@/utils/notifications";

import {
  createLoyaltyTemplate,
  getAllLoyaltyTemplates,
  getLoyaltyTemplate,
  UpdateLoyaltyTemplate,
  updateLoyaltyTemplate,
} from "./settings.api";

export const useCreateLoyaltyTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLoyaltyTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allLoyaltyTemplates"] });
      showSuccessToast("Template configured");
    },
    onError: () => {
      showErrorToast("template config failed");
    },
  });
};

export const useUpdateLoyaltyTemplate = (type) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateLoyaltyTemplate) =>
      updateLoyaltyTemplate(type, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["LoyaltyTemplate"] });
      queryClient.invalidateQueries({ queryKey: ["allLoyaltyTemplates"] });
      showSuccessToast("Template configuration updated");
    },
    onError: () => {
      showErrorToast("template config updation failed");
    },
  });
};

export const useGetLoyaltyTemplate = (type) => {
  return useQuery({
    queryFn: () => getLoyaltyTemplate(type),
    queryKey: ["LoyaltyTemplate"],
    enabled: !!type,
  });
};

export const useGetAllLoyaltyTemplates = () => {
  return useQuery({
    queryFn: getAllLoyaltyTemplates,
    queryKey: ["allLoyaltyTemplates"],
  });
};
