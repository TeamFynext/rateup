import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createWaCustomers,
  getAllWaCustomerGroupsByWaCustomer,
  getWaCustomerSurveySendHistoryByWaCustomerId,
  getAllWaCustomers,
  sendSurveyToWaCustomer,
  getWaCustomersByTeamId,
  getWaCustomerResponseHistoryByWaCustomerId,
  deleteWaCustomer,
} from "./waCustomer.api";
import { notifications } from "@mantine/notifications";

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
      notifications.show({
        message: "Survey sent successfully!",
        color: "green",
      });
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
      notifications.show({
        message: "WaCustomers created successfully!",
        color: "green",
      });
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
      notifications.show({
        message: "WaCustomer deleted successfully!",
        color: "green",
      });
      queryClient.invalidateQueries({ queryKey: ["waCustomer"] });
    },
  });
};
