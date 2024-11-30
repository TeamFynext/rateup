import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "@/utils/notifications";

import {
  createLoyaltyTemplate,
  getLoyaltyTemplate,
  UpdateLoyaltyTemplate,
  updateLoyaltyTemplate,
} from "./settings.api";

export const useCreateLoyaltyTemplate = () => {
  return useMutation({
    mutationFn: createLoyaltyTemplate,
    onSuccess: () => {
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
