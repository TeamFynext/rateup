import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { showErrorToast, showSuccessToast } from "@/utils/notifications";

import {
  createLifeCycle,
  deleteLifeCycle,
  getLifeCycles,
  reorderLifeCycles,
  updateLifeCycle,
} from "./lifecycle.api";

export function useCreateLifeCycleMutation() {
  const queryClient = useQueryClient();
  const t = useTranslations();
  return useMutation({
    mutationFn: createLifeCycle,
    onSuccess: () => {
      showSuccessToast(
        t("Life cycle created successfully"),
        "c-life-cycle",
        null,
        true,
      );
      queryClient.invalidateQueries({ queryKey: ["lifecycles"] });
    },
    onError: (error: any) => {
      showErrorToast(
        error?.response?.data?.message,
        "c-life-cycle",
        null,
        true,
      );
    },
  });
}

export function useUpdateLifeCycleMutation() {
  const queryClient = useQueryClient();
  const t = useTranslations();
  return useMutation({
    mutationFn: updateLifeCycle,
    onSuccess: () => {
      showSuccessToast(
        t("Life cycle updated successfully"),
        "c-life-cycle",
        null,
        true,
      );
      queryClient.invalidateQueries({ queryKey: ["lifecycles"] });
    },
    onError: (error: any) => {
      showErrorToast(
        error?.response?.data?.message,
        "c-life-cycle",
        null,
        true,
      );
    },
  });
}
export function useDeleteLifeCycleMutation() {
  const queryClient = useQueryClient();
  const t = useTranslations();
  return useMutation({
    mutationFn: deleteLifeCycle,
    onSuccess: () => {
      showSuccessToast(
        t("Life cycle deleted successfully"),
        "c-life-cycle",
        null,
        true,
      );
      queryClient.invalidateQueries({ queryKey: ["lifecycles"] });
    },
    onError: (error: any) => {
      showErrorToast(
        error?.response?.data?.message,
        "c-life-cycle",
        null,
        true,
      );
    },
  });
}

export const useLifeCyclesQuery = () =>
  useQuery({
    queryKey: ["lifecycles"],
    queryFn: getLifeCycles,
  });

export function useReorderLifeCycleMutation() {
  const queryClient = useQueryClient();
  const t = useTranslations();
  return useMutation({
    mutationFn: reorderLifeCycles,
    onSuccess: () => {
      showSuccessToast(
        t("Life cycle updated successfully"),
        "c-life-cycle",
        null,
        true,
      );
      queryClient.invalidateQueries({ queryKey: ["lifecycles"] });
    },
    onError: (error: any) => {
      showErrorToast(
        error?.response?.data?.message,
        "c-life-cycle",
        null,
        true,
      );
    },
  });
}
