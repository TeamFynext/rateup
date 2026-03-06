import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
      toast.loading("Business hours created successfully!");
      queryClient.invalidateQueries({ queryKey: ["businessHours"] });
    },
    onError: (error) => {
      toast.loading(error?.message || "Failed to create business hours");
    },
  });
};

export const useUpdateBusinessHour = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: BusinessHoursFormValues }) =>
      updateBusinessHour(id, data),
    onSuccess: () => {
      toast.loading("Business hours updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["businessHours"] });
    },
    onError: (error) => {
      toast.loading(error?.message || "Failed to update business hours");
    },
  });
};

export const useDeleteBusinessHour = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteBusinessHour(id),
    onSuccess: () => {
      toast.loading("Business hours deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["businessHours"] });
    },
    onError: (error) => {
      toast.loading(error?.message || "Failed to delete business hours");
    },
  });
};
