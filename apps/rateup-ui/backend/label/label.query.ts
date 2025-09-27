import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { showErrorToast, showSuccessToast } from "@/utils/notifications";

import { createLabel, deleteLabel, getLabels, updateLabel } from "./label.api";

export function useCreateLabelMutation() {
  const queryClient = useQueryClient();
  const t = useTranslations();
  return useMutation({
    mutationFn: createLabel,
    onSuccess: () => {
      showSuccessToast(t("Label created successfully"), "c-label", null, true);
      queryClient.invalidateQueries({ queryKey: ["lifecycles"] });
    },
    onError: (error: any) => {
      showErrorToast(error?.response?.data?.message, "c-label", null, true);
    },
  });
}

export function useUpdateLabelMutation() {
  const queryClient = useQueryClient();
  const t = useTranslations();
  return useMutation({
    mutationFn: updateLabel,
    onSuccess: () => {
      showSuccessToast(t("Label updated successfully"), "c-label", null, true);
      queryClient.invalidateQueries({ queryKey: ["lifecycles"] });
    },
    onError: (error: any) => {
      showErrorToast(error?.response?.data?.message, "c-label", null, true);
    },
  });
}
export function useDeleteLabelMutation() {
  const queryClient = useQueryClient();
  const t = useTranslations();
  return useMutation({
    mutationFn: deleteLabel,
    onSuccess: () => {
      showSuccessToast(t("Label deleted successfully"), "c-label", null, true);
      queryClient.invalidateQueries({ queryKey: ["lifecycles"] });
    },
    onError: (error: any) => {
      console.log("🚀 ~ useDeleteLabelMutation ~ error:", error);
      showErrorToast(error?.response?.data?.message, "c-label", null, true);
    },
  });
}

export const useLabelsQuery = () =>
  useQuery({
    queryKey: ["lifecycles"],
    queryFn: getLabels,
  });
