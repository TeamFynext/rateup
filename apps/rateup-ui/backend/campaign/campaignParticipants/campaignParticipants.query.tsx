import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addCampaignParticipants,
  addContactParticipants,
  addGroupParticipants,
  deleteCampaignParticipant,
  deleteMulitpleGroupParticipants,
  getCampaignParticipants,
} from "./campaignParticipants.api";
import { showErrorToast, showSuccessToast } from "../../../utils/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";

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
        `Error adding participants: 
        ${error?.response?.data?.error}`,
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
        `Error adding group participants: 
        ${error?.response?.data?.error}`,
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
        `Error on adding participants: 
        ${error?.response?.data.error}`,
      );
    },
  });
};

export const useRemoveCampaignParticipant = (campaignId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCampaignParticipant,
    onSuccess() {
      showSuccessToast(
        "Participants removed from campaign successfully.",
        "campaign-participants-remove",
        <IconCheck />,
      );
      queryClient.invalidateQueries({ queryKey: ["campaignById", campaignId] });
    },
    onError(error: any) {
      showErrorToast(
        `Error removing participants from campaign: ${error?.response?.data?.error}`,
        "campaign-participants-remove",
        <IconX />,
      );
    },
  });
};

export const useRemoveMulitpleGroupParticipants = (
  campaignId: string,
  onSucess: () => void,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMulitpleGroupParticipants,
    onSuccess() {
      showSuccessToast(
        "Participants removed from campaign successfully.",
        "campaign-mulitiple-participants-remove",
        <IconCheck />,
        true,
      );
      queryClient.invalidateQueries({ queryKey: ["campaignById", campaignId] });
      onSucess();
    },
    onError(error: any) {
      showErrorToast(
        `Error removing participants from campaign: ${error?.response?.data?.error}`,
        "campaign-mulitiple-participants-remove",
        <IconX />,
        true,
      );
    },
  });
};
