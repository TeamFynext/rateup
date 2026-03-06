import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createWaCustomers,
  deleteWaCustomer,
  getAllWaCustomerGroupsByWaCustomer,
  getAllWaCustomers,
  getWaCustomerResponseHistoryByWaCustomerId,
  getWaCustomersByTeamId,
  getWaCustomerSurveySendHistoryByWaCustomerId,
  sendSurveyToWaCustomer,
} from "./waCustomer.api";

export const useWaCustomers = (teamId: string, enabled: boolean) =>
  useQuery({
    enabled: enabled,
    queryKey: ["waCustomer", teamId],
    queryFn: () => {
      if (teamId) {
        return getWaCustomersByTeamId(teamId);
      } else {
        return getAllWaCustomers();
      }
    },
  });

export const useWaCustomerSurveySendHistory = (waCustomerId: string) => {
  // TODO: change querykey. modifying waCustomerData should not invalidate surveyHistory
  return useQuery({
    queryKey: ["waCustomer", waCustomerId, "history", "surveys"],
    queryFn: () => getWaCustomerSurveySendHistoryByWaCustomerId(waCustomerId),
  });
};

export const useWaCustomerResponseHistory = (waCustomerId: string) => {
  return useQuery({
    queryKey: ["waCustomer", waCustomerId, "history", "responses"],
    queryFn: () => getWaCustomerResponseHistoryByWaCustomerId(waCustomerId),
  });
};

export const useWaCustomerGroupsByWaCustomer = (waCustomerId: string) =>
  useQuery({
    queryKey: ["rgroup", "waCustomer", waCustomerId],
    queryFn: () => getAllWaCustomerGroupsByWaCustomer(waCustomerId),
  });

export const useSendSurveyToWaCustomerMutation = ({ waCustomerId }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      surveyId,
      templateId,
    }: {
      surveyId: string;
      templateId: string;
    }) => {
      return sendSurveyToWaCustomer(waCustomerId, surveyId, templateId);
    },
    onSuccess: () => {
      toast.loading("Survey sent successfully!");
      queryClient.invalidateQueries({
        queryKey: ["waCustomer", waCustomerId, "history", "surveys"],
      });
    },
  });
};

export const useCreateWaCustomersMutation = (teamId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (waCustomers: Array<{ phone: string; name?: string }>) => {
      return createWaCustomers(waCustomers, teamId);
    },
    onSuccess: () => {
      toast.loading("WaCustomers created successfully!");
      queryClient.invalidateQueries({ queryKey: ["waCustomer"] });
    },
  });
};

export const useDeleteWaCustomerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (waCustomerId: string) => {
      return deleteWaCustomer(waCustomerId);
    },
    onSuccess: () => {
      toast.loading("WaCustomer deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["waCustomer"] });
    },
  });
};
