import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { BusinessHoursFormValues } from "@/components/account/business-hours/schema";

import {
  createBusinessHour,
  deleteBusinessHour,
  getAllBusinessHours,
  getBusinessHour,
  updateBusinessHour,
} from "./business-hours.api";

export const useGetAllBusinessHours = () => {
  return useQuery({
    queryKey: ["businessHours"],
    queryFn: async () => {
      const response = await getAllBusinessHours();
      return response.data;
    },
  });
};

export const useGetBusinessHour = (id: string) => {
  return useQuery({
    queryKey: ["businessHours", id],
    queryFn: async () => {
      const response = await getBusinessHour(id);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateBusinessHour = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BusinessHoursFormValues) => createBusinessHour(data),
    onSuccess: () => {
      notifications.show({
        color: "teal",
        title: "Success",
        message: "Business hours created successfully!",
        autoClose: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ["businessHours"] });
    },
    onError: (error: any) => {
      notifications.show({
        color: "red",
        title: "Failed",
        message:
          error?.response?.data?.message || "Failed to create business hours",
        autoClose: 3000,
      });
    },
  });
};

export const useUpdateBusinessHour = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: BusinessHoursFormValues }) =>
      updateBusinessHour(id, data),
    onSuccess: () => {
      notifications.show({
        color: "teal",
        title: "Success",
        message: "Business hours updated successfully!",
        autoClose: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ["businessHours"] });
    },
    onError: (error: any) => {
      notifications.show({
        color: "red",
        title: "Failed",
        message:
          error?.response?.data?.message || "Failed to update business hours",
        autoClose: 3000,
      });
    },
  });
};

export const useDeleteBusinessHour = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteBusinessHour(id),
    onSuccess: () => {
      notifications.show({
        color: "teal",
        title: "Success",
        message: "Business hours deleted successfully!",
        autoClose: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ["businessHours"] });
    },
    onError: (error: any) => {
      notifications.show({
        color: "red",
        title: "Failed",
        message:
          error?.response?.data?.message || "Failed to delete business hours",
        autoClose: 3000,
      });
    },
  });
};
