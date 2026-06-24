import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createInstagramAutomation,
  deleteInstagramAutomation,
  getAllInstagramAutomations,
  getInstagramAutomationById,
  initiateInstagramAutomation,
  updateInstagramAutomation,
} from "./instagramAutomation.api";

export const useAllInstagramAutomations = () =>
  useQuery({
    queryKey: ["allInstagramAutomations"],
    queryFn: async () => {
      const response = await getAllInstagramAutomations();
      return response.data;
    },
  });

export const useInstagramAutomationById = (automationId: string) =>
  useQuery({
    queryKey: ["instagramAutomation", { automationId }],
    queryFn: async () => {
      const response = await getInstagramAutomationById(automationId);
      return response.data;
    },
    enabled: !!automationId,
  });

export const useCreateInstagramAutomationMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createInstagramAutomation(data),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ["allInstagramAutomations"] });
      toast.success("Instagram Automation Created Successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error Creating Instagram Automation");
    },
  });
};

export const useDeleteInstagramAutomationMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (automationId: string) =>
      deleteInstagramAutomation(automationId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["allInstagramAutomations"] });
      toast.success("Instagram Automation Deleted Successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error Deleting Instagram Automation");
    },
  });
};

export const useUpdateInstagramAutomationMutation = () => {
  return useMutation({
    mutationFn: ({ id, ...data }: any) => updateInstagramAutomation(id, data),
    onError: (error) => {
      toast.error(error?.message || "Error Updating Instagram Automation");
    },
  });
};

const useInitiateInstagramAutomationMutation = (automationId: string) => {
  return useMutation({
    mutationFn: ({ igsId }: any) =>
      initiateInstagramAutomation(automationId, igsId),
    onSuccess: (res) => {
      toast.success("Instagram Automation initiated Successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error initiating Instagram Automation");
    },
  });
};
