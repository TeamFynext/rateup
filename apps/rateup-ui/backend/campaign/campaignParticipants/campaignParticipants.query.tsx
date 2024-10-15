import { IconCheck, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import useTranslations from "@/dictionaries/useTranslation";

import { showErrorToast, showSuccessToast } from "../../../utils/notifications";
import {
  addCampaignParticipants,
  addContactParticipants,
  addGroupParticipants,
  deleteCampaignParticipant,
  deleteMulitpleGroupParticipants,
  getCampaignParticipants,
} from "./campaignParticipants.api";

export const useAddContactParticipantMutation = (campaignId) => {
  const queryClient = useQueryClient();
  const { translations } = useTranslations();
  return useMutation({
    mutationFn: addContactParticipants,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaignParticipants", campaignId],
      });
      queryClient.invalidateQueries({
        queryKey: ["campaigns"],
      });
      showSuccessToast(translations["Added participants successfully."]);
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
  const { translations } = useTranslations();
  return useMutation({
    mutationFn: addGroupParticipants,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaignParticipants", campaignId],
      });
      queryClient.invalidateQueries({
        queryKey: ["campaigns"],
      });
      showSuccessToast(translations["Added group participants successfully."]);
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

export const useAddCampaignParticipants = (
  campaignId,
  onSuccess = () => {},
) => {
  const queryClient = useQueryClient();
  const { translations } = useTranslations();
  return useMutation({
    mutationFn: addCampaignParticipants,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaignById", campaignId] });
      queryClient.invalidateQueries({
        queryKey: ["campaigns"],
      });
      showSuccessToast(
        translations["Campaign particiants added successfully."],
      );
      onSuccess();
    },
    onError: (error: any) => {
      showErrorToast(
        `Error on adding participants: 
        ${error?.response?.data.error}`,
      );
      onSuccess();
    },
  });
};

export const useRemoveCampaignParticipant = (campaignId: string) => {
  const queryClient = useQueryClient();
  const { translations } = useTranslations();
  return useMutation({
    mutationFn: deleteCampaignParticipant,
    onSuccess() {
      showSuccessToast(
        translations["Participants removed from campaign successfully."],
        "campaign-participants-remove",
        <IconCheck />,
      );
      queryClient.invalidateQueries({ queryKey: ["campaignById", campaignId] });
      queryClient.invalidateQueries({
        queryKey: ["campaigns"],
      });
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
  const { translations } = useTranslations();
  return useMutation({
    mutationFn: deleteMulitpleGroupParticipants,
    onSuccess() {
      showSuccessToast(
        translations["Participants removed from campaign successfully."],
        "campaign-mulitiple-participants-remove",
        <IconCheck />,
        true,
      );
      queryClient.invalidateQueries({ queryKey: ["campaignById", campaignId] });
      queryClient.invalidateQueries({
        queryKey: ["campaigns"],
      });
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
