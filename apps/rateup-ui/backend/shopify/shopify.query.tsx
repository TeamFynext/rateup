import { IconCheck, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";

import { showErrorToast, showSuccessToast } from "../../utils/notifications";
import {
  createShopifySurveySchedule,
  deleteAllShopifySchedule,
  deleteAllShopifySurveySchedule,
  deleteAllShopifyWebhooks,
  deleteShopifySession,
  deleteShopifySurveySchedule,
  deleteShopifyWebhookByTopic,
  getProductsFromShopify,
  getRegisteredWebhooks,
  getShopifySchedules,
  getShopifySession,
  getShopifySurveySchedulesByOrg,
  registerShopifyWebhookbyTopic,
  registerShopifyWebhooks,
  updateShopifySession,
  updateShopifySurveySchedule,
} from "./shopify.api";

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

export const useGetShopifySchedules = () => {
  return useQuery({
    queryKey: ["shopifySchedules"],
    queryFn: getShopifySchedules,
  });
};

export const useGetRegisteredWebhooks = (enabled) => {
  return useQuery({
    queryKey: ["shopifyWebhooks"],
    queryFn: getRegisteredWebhooks,
    enabled,
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
      queryClient.invalidateQueries({ queryKey: ["shopifySchedules"] });
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

export const useDeleteAllShopifySurveySchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAllShopifySurveySchedule,
    onSuccess: () => {
      showSuccessToast(
        "Deleted Succesfully",
        "shopify-survey",
        <IconCheck />,
        true,
      );
      queryClient.invalidateQueries({ queryKey: ["shopifySurveySchedules"] });
      queryClient.invalidateQueries({ queryKey: ["shopifySchedules"] });
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

export const useDeleteAllShopifySchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAllShopifySchedule,
    onSuccess: () => {
      showSuccessToast(
        "Deleted Succesfully",
        "shopify-schedule",
        <IconCheck />,
        true,
      );
      queryClient.invalidateQueries({ queryKey: ["shopifySurveySchedules"] });
      queryClient.invalidateQueries({ queryKey: ["shopifySchedules"] });
    },
    onError: (error: AxiosError | any) => {
      showErrorToast(
        `error in deleting schedule: ${error?.response?.data?.error}`,
        "shopify-schedule",
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
      queryClient.invalidateQueries({ queryKey: ["shopifyWebhooks"] });
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

export const useRegisterWebhookByTopic = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registerShopifyWebhookbyTopic,
    onSuccess: () => {
      showSuccessToast(
        "Webhooks registration succesfull",
        "webhooks",
        <IconCheck />,
        true,
      );
      queryClient.invalidateQueries({ queryKey: ["shopifySession"] });
      queryClient.invalidateQueries({ queryKey: ["shopifyWebhooks"] });
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

export const useDeleteAllWebhooks = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAllShopifyWebhooks,
    onSuccess: () => {
      showSuccessToast(
        "Webhooks subscription deletion succesfull",
        "webhooks",
        <IconCheck />,
        true,
      );
      queryClient.invalidateQueries({ queryKey: ["shopifySession"] });
      queryClient.invalidateQueries({ queryKey: ["shopifySurveySchedules"] });
      queryClient.invalidateQueries({ queryKey: ["shopifyWebhooks"] });
    },
    onError: () => {
      showErrorToast(
        "Webhook subscription deletion failed",
        "webhooks",
        <IconX />,
        true,
      );
    },
  });
};

export const useDeleteWebhookByTopic = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteShopifyWebhookByTopic,
    onSuccess: () => {
      showSuccessToast(
        "Webhooks subscription deletion succesfull",
        "webhooks",
        <IconCheck />,
        true,
      );
      queryClient.invalidateQueries({ queryKey: ["shopifySession"] });
      queryClient.invalidateQueries({ queryKey: ["shopifySurveySchedules"] });
      queryClient.invalidateQueries({ queryKey: ["shopifyWebhooks"] });
    },
    onError: () => {
      showErrorToast(
        "Webhook subscription deletion failed",
        "webhooks",
        <IconX />,
        true,
      );
    },
  });
};

export const useDeleteShopifySession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteShopifySession,
    onSuccess: () => {
      showSuccessToast(
        "connection deletion succesfull",
        "session",
        <IconCheck />,
        true,
      );
      queryClient.invalidateQueries({ queryKey: ["shopifySession"] });
      queryClient.invalidateQueries({ queryKey: ["shopifySurveySchedules"] });
    },
    onError: () => {
      showErrorToast("connection deletion failed", "session", <IconX />, true);
    },
  });
};
