import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createShopifySurveySchedule,
  deleteShopifySurveySchedule,
  getProductsFromShopify,
  getShopifySession,
  getShopifySurveySchedulesByOrg,
  registerShopifyWebhooks,
  updateShopifySession,
  updateShopifySurveySchedule,
} from "./shopify.api";
import { showErrorToast, showSuccessToast } from "../../utils/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";
import { AxiosError } from "axios";

export const useGetProductsFromShopify = (enabled) => {
  return useQuery({
    queryKey: ["shopifyProducts"],
    queryFn: getProductsFromShopify,
    enabled,
  });
};

export const useGetShopifySession = () => {
  return useQuery({
    queryKey: ["shopifySession"],
    queryFn: getShopifySession,
  });
};

export const useGetShopifySurveySchedules = () => {
  return useQuery({
    queryKey: ["shopifySurveySchedules"],
    queryFn: getShopifySurveySchedulesByOrg,
  });
};

export const useCreateShopifySurveySchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createShopifySurveySchedule,
    onSuccess: () => {
      showSuccessToast("Success", "shopify-survey", <IconCheck />, true);
      queryClient.invalidateQueries({ queryKey: ["shopifySurveySchedules"] });
    },
    onError: (error: AxiosError | any) => {
      showErrorToast(
        `error in creating schedule: ${error?.response?.data?.error}`,
        "shopify-survey",
        <IconX />,
        true,
      );
    },
  });
};

export const useUpdateShopifySurveySchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateShopifySurveySchedule,
    onSuccess: () => {
      showSuccessToast("Success", "shopify-survey", <IconCheck />, true);
      queryClient.invalidateQueries({ queryKey: ["shopifySurveySchedules"] });
    },
    onError: (error: AxiosError | any) => {
      showErrorToast(
        `survey schedule updation failed: ${error?.response?.data?.error}`,
        "shopify-survey",
        <IconX />,
        true,
      );
    },
  });
};

export const useDeleteShopifySurveySchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteShopifySurveySchedule,
    onSuccess: () => {
      showSuccessToast(
        "Deleted Succesfully",
        "shopify-survey",
        <IconCheck />,
        true,
      );
      queryClient.invalidateQueries({ queryKey: ["shopifySurveySchedules"] });
    },
    onError: (error: AxiosError | any) => {
      showErrorToast(
        `error in deleting schedule: ${error?.response?.data?.error}`,
        "shopify-survey",
        <IconX />,
        true,
      );
    },
  });
};

export const useUpdateShopifySession = () => {
  return useMutation({
    mutationFn: updateShopifySession,
  });
};

export const useRegisterWebhooks = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registerShopifyWebhooks,
    onSuccess: () => {
      showSuccessToast(
        "Webhooks registration succesfull",
        "webhooks",
        <IconCheck />,
        true,
      );
      queryClient.invalidateQueries({ queryKey: ["shopifySession"] });
    },
    onError: () => {
      showErrorToast(
        "Webhook registration failed",
        "webhooks",
        <IconX />,
        true,
      );
    },
  });
};
