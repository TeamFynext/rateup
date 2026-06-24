import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  createLifeCycle,
  deleteLifeCycle,
  getLifeCycles,
  getLifecyclesWithContactCount,
  reorderLifeCycles,
  updateLifeCycle,
} from "./lifecycle.api";

export function useCreateLifeCycleMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: createLifeCycle,
    onSuccess: () => {
      toast.success(t("Life cycle created successfully"), {
        id: "c-life-cycle",
      });
      queryClient.invalidateQueries({ queryKey: ["lifecycles"] });
      queryClient.invalidateQueries({
        queryKey: ["lifecyclesWithContactCount"],
      });
    },
    onError: (error) => {
      toast.error(error?.message || "An error occurred", {
        id: "c-life-cycle",
      });
    },
  });
}

export function useUpdateLifeCycleMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: updateLifeCycle,
    onSuccess: () => {
      toast.success(t("Life cycle updated successfully"), {
        id: "c-life-cycle",
      });
      queryClient.invalidateQueries({ queryKey: ["lifecycles"] });
      queryClient.invalidateQueries({
        queryKey: ["lifecyclesWithContactCount"],
      });
    },
    onError: (error) => {
      toast.error(error?.message || "An error occurred", {
        id: "c-life-cycle",
      });
    },
  });
}
export function useDeleteLifeCycleMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: deleteLifeCycle,
    onSuccess: () => {
      toast.success(t("Life cycle deleted successfully"), {
        id: "c-life-cycle",
      });
      queryClient.invalidateQueries({ queryKey: ["lifecycles"] });
      queryClient.invalidateQueries({
        queryKey: ["lifecyclesWithContactCount"],
      });
    },
    onError: (error) => {
      toast.error(error?.message || "An error occurred", {
        id: "c-life-cycle",
      });
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
  const { t } = useTranslation();
  return useMutation({
    mutationFn: reorderLifeCycles,
    onSuccess: () => {
      toast.success(t("Life cycle updated successfully"), {
        id: "c-life-cycle",
      });
      queryClient.invalidateQueries({ queryKey: ["lifecycles"] });
      queryClient.invalidateQueries({
        queryKey: ["lifecyclesWithContactCount"],
      });
    },
    onError: (error) => {
      toast.error(error?.message || "An error occurred", {
        id: "c-life-cycle",
      });
    },
  });
}

export const useLifecyclesWithContactCount = () =>
  useQuery({
    queryKey: ["lifecyclesWithContactCount"],
    queryFn: getLifecyclesWithContactCount,
  });
