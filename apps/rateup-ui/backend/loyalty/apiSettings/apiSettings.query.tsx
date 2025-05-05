import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "@/utils/notifications";

import {
  createLoyaltyApiSettings,
  getAllLoyaltyApiSettings,
  getLoyaltyApiSettings,
  updateLoyaltyApiSettings,
} from "./apiSettings.api";

export const useLoyaltyApiSettings = (id?: string) => {
  const qc = useQueryClient();

  const useGetAllapi = useQuery({
    queryFn: getAllLoyaltyApiSettings,
    queryKey: ["loyaltyApiSettings"],
  });

  const useCreateApiSetting = useMutation({
    mutationFn: createLoyaltyApiSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyaltyApiSettings"] });
      showSuccessToast("success");
    },
    onError: () => {
      showErrorToast("failed");
    },
  });

  const useUpdateApiSetting = useMutation({
    mutationFn: (data: Partial<Omit<LoyaltyApiSetting, "orgId" | "id">>) =>
      updateLoyaltyApiSettings(data, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyaltyApiSettings"] });
      qc.invalidateQueries({ queryKey: ["loyaltyApiSetting", id] });
      showSuccessToast("success");
    },
    onError: () => {
      showErrorToast("failed");
    },
  });

  const useGetLoyaltyApiSettings = useQuery({
    queryFn: () => getLoyaltyApiSettings(id),
    queryKey: ["loyaltyApiSetting", id],
    enabled: !!id,
  });

  return {
    getAll: useGetAllapi,
    create: useCreateApiSetting,
    getApiSetting: useGetLoyaltyApiSettings,
    update: useUpdateApiSetting,
  };
};
