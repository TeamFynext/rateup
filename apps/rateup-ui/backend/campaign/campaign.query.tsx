import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCampaign,
  deleteCampaign,
  getCampaignById,
  getCampaignFilterForFlows,
  getCampaigns,
  getCampaignsByTeam,
  sendCampaign,
  updateCampaign,
} from "./campaign.api";
import { showErrorToast, showSuccessToast } from "../../utils/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";
import { CampaignParticipantStatus } from "../../types/enums";
import { notifications } from "@mantine/notifications";

export const useCampaignData = () => {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: () => getCampaigns(),
  });
};

export const useCampaignDataByTeam = (teamId: string, enabled: boolean) => {
  return useQuery({
    queryKey: ["campaignsbyTeam", teamId],
    queryFn: () => getCampaignsByTeam(teamId),
    enabled: enabled,
  });
};

export const useCreateCampaignMutation = (teamId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaignsbyTeam", teamId] });
      showSuccessToast(
        "Campaign created successfully",
        "campaign-create",
        <IconCheck />,
      );
    },
    onError: (error: any) => {
      showErrorToast(
        `Error creating campaign: ${error?.response?.data?.error}`,
        "campaign-create",
        <IconX />,
      );
    },
  });
};

export const useCampaignById = (campaignId) => {
  return useQuery({
    queryKey: ["campaignById", campaignId],
    queryFn: () => getCampaignById(campaignId),
    enabled: !!campaignId,
  });
};

export const useUpdateCampaignMutation = (
  campaignId,
  teamId,
  complete = () => {},
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaignById", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaignsbyTeam", teamId] });
      showSuccessToast(
        "Campaign updated successfully",
        "campaign-update",
        <IconCheck />,
      );
      complete();
    },
    onError: (error: any) => {
      showErrorToast(
        `Error updating campaign: ${error?.response?.data?.error}`,
        "campaign-delete",
        <IconX />,
      );
      complete();
    },
  });
};

export const useDeleteCampaignMutation = (teamId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaignsbyTeam", teamId] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      showSuccessToast(
        "Campaign deleted successfully.",
        "campaign-delete",
        <IconCheck />,
      );
    },
    onError: (error: any) => {
      showErrorToast(
        `Error deleting campaign: ${error?.response?.data.error}`,
        "campaign-delete",
        <IconX />,
      );
    },
  });
};

export const useSendCampaign = (campaignId: string, teamId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sendToStatuses,
      participantId,
    }: {
      sendToStatuses: CampaignParticipantStatus[];
      participantId?: string;
    }) => sendCampaign(campaignId, sendToStatuses, participantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaignsbyTeam", teamId] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaignById", campaignId] });
      notifications.show({
        color: "teal",
        title: "Campaign started successfully",
        message: "It may take a few minutes to send to all participants.",
        autoClose: 5000,
        loading: false,
        icon: <IconCheck />,
      });
    },
    onError: (error: any) => {
      showErrorToast(
        `Error starting campaign: ${error?.response?.data.error}`,
        "campaign-start",
        <IconX />,
      );
    },
  });
};

export const useCampaignFilterForFlows = (surveyId: string) => {
  return useQuery({
    queryFn: () => getCampaignFilterForFlows(surveyId),
    queryKey: ["campaignFilterForFlows", surveyId],
    enabled: !!surveyId,
  });
};
