import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addCampaignParticipants,
  addContactParticipants,
  addGroupParticipants,
  getCampaignParticipants,
} from "./campaignParticipants.api";
import { showErrorToast, showSuccessToast } from "../../../utils/notifications";

export const useAddContactParticipantMutation = (campaignId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addContactParticipants,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaignParticipants", campaignId],
      });
      showSuccessToast("Added participants successfully.");
    },
    onError: (error: any) => {
      showErrorToast(
        "Error adding participants",
        error?.response?.data?.message,
      );
    },
  });
};

export const useAddGroupParticipantMutation = (campaignId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addGroupParticipants,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaignParticipants", campaignId],
      });
      showSuccessToast("Added group participants successfully.");
    },
    onError: (error: any) => {
      showErrorToast(
        "Error adding group participants",
        error?.response?.data?.message,
      );
    },
  });
};

export const useCampaignParticipants = (campaignId) => {
  return useQuery({
    queryKey: ["campaignParticipants", campaignId],
    queryFn: () => getCampaignParticipants(campaignId),
  });
};

export const useAddCampaignParticipants = (campaignId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addCampaignParticipants,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaignById", campaignId] });
      showSuccessToast("Campaign particiants added successfully.");
    },
    onError: (error: any) => {
      showErrorToast(
        "Error on adding participants",
        error?.response?.data.message,
      );
    },
  });
};
