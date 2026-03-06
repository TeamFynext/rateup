import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  addWaCustomers,
  createRgroupFromPhoneNumbers,
  deleteWaCustomerFromWaCustomerGroup,
  deleteWaCustomerGroup,
  getWaCustomerGroups,
  getWaCustomerGroupsByTeamId,
  getWaCustomerGroupSurveySendHistory,
  getWaCustomersByWaCustomerGroup,
  sendSurveyToWaCustomerGroup,
  updateWaCustomerGroup,
} from "./waCustomerGroup.api";

export const useWaCustomerGroups = (teamId: string, enabled: boolean) => {
  if (teamId) {
    return useQuery({
      enabled,
      queryKey: ["rgroup", "team", teamId],
      queryFn: () => getWaCustomerGroupsByTeamId(teamId),
    });
  } else {
    return useQuery({
      enabled,
      queryKey: ["rgroup"],
      queryFn: () => getWaCustomerGroups(),
    });
  }
};

export const useWaCustomerGroupSurveySendHistory = (rgroupId: string) => {
  return useQuery({
    queryKey: ["rgroup", rgroupId, "history", "surveys"],
    queryFn: () => getWaCustomerGroupSurveySendHistory(rgroupId),
  });
};

export const useWaCustomersByWaCustomerGroup = (rgroupId: string) =>
  useQuery({
    queryKey: ["rgroup", rgroupId, "waCustomers"],
    queryFn: () => getWaCustomersByWaCustomerGroup(rgroupId),
  });

export const useSendSurveyToWaCustomerGroupMutation = ({ rgroupId }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      surveyId,
      templateId,
    }: {
      surveyId: string;
      templateId: string;
    }) => {
      return sendSurveyToWaCustomerGroup(rgroupId, surveyId, templateId);
    },
    onSuccess: () => {
      toast.success("Survey sent successfully");
      queryClient.invalidateQueries({
        queryKey: ["rgroup", rgroupId, "history", "surveys"],
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Error sending survey");
    },
  });
};

export const useCreateWaCustomerGroupMutation = (teamId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      rgroupName,
      phoneNumbers,
    }: {
      rgroupName: string;
      phoneNumbers: Array<{ phone: string; name?: string }>;
    }) => {
      return createRgroupFromPhoneNumbers(teamId, rgroupName, phoneNumbers);
    },
    onSuccess: () => {
      toast.success("WaCustomer Group created successfully!");
      queryClient.invalidateQueries({ queryKey: ["rgroup", "team", teamId] });
      queryClient.invalidateQueries({
        queryKey: ["waCustomer", "team", teamId],
      });
    },
  });
};

export const useDeleteWaCustomerFromWaCustomerGroupMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      rgroupId,
      waCustomerId,
    }: {
      rgroupId: string;
      waCustomerId: string;
    }) => {
      return deleteWaCustomerFromWaCustomerGroup(rgroupId, waCustomerId);
    },
    onSuccess: () => {
      toast.success("WaCustomer removed from group successfully!");
      queryClient.invalidateQueries({ queryKey: ["rgroup"] });
    },
  });
};

export const useDeleteWaCustomerGroupMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rgroupId: string) => {
      return deleteWaCustomerGroup(rgroupId);
    },
    onSuccess: () => {
      toast.success("WaCustomer Group deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["rgroup"] });
    },
  });
};

export const useUpdateWaCustomerGroupMutation = (rgroupId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rgroup: { name: string }) => {
      return updateWaCustomerGroup(rgroupId, rgroup);
    },
    onSuccess: () => {
      toast.success("WaCustomer Group updated successfully!");
      // TODO: only invalidate the updated rgroup?
      queryClient.invalidateQueries({ queryKey: ["rgroup"] });
    },
  });
};

export const useAddWaCustomersMutation = (rgroupId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (waCustomers: Array<string>) => {
      return addWaCustomers(rgroupId, waCustomers);
    },
    onSuccess: () => {
      toast.success("WaCustomers added successfully!");
      queryClient.invalidateQueries({ queryKey: ["rgroup", rgroupId] });
    },
  });
};
