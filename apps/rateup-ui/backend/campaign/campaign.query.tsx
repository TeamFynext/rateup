import { notifications } from "@mantine/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CampaignParticipantStatus, CampaignStatus } from "../../types/enums";
import { showErrorToast, showSuccessToast } from "../../utils/notifications";
import {
  campaignResponseDownloadById,
  createCampaign,
  deleteCampaign,
  getCampaignById,
  getCampaignFilterForFlows,
  getCampaigns,
  getCampaignsByTeam,
  getCampaignStatsById,
  sendCampaign,
  updateCampaign,
} from "./campaign.api";

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

export const useCampaignStatsById = (campaignId) => {
  return useQuery({
    queryKey: ["campaignStats", campaignId],
    queryFn: () => getCampaignStatsById(campaignId),
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
type sendCampaignProps = {
  campaignSentAt?: Date;
  statuses: CampaignParticipantStatus[];
  sentCampaignChoice: string;
  participantId?: string;
  status?: CampaignStatus;
};

export const useSendCampaign = (campaignId: string, teamId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      statuses,
      participantId,
      campaignSentAt,
      sentCampaignChoice,
      status,
    }: sendCampaignProps) =>
      sendCampaign(
        campaignId,
        statuses,
        sentCampaignChoice,
        participantId,
        campaignSentAt,
        status,
      ),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["campaignsbyTeam", teamId] });
      queryClient.invalidateQueries({ queryKey: ["campaignById", campaignId] });
      queryClient.invalidateQueries({
        queryKey: ["campaignStats", campaignId],
      });
      notifications.show({
        color: "teal",
        title:
          res?.data?.code === "MSG_SCHEDULED"
            ? "Sucess"
            : "Campaign started successfully",
        message:
          res?.data?.code === "MSG_SCHEDULED"
            ? (res?.data?.message ?? "Campaign scheduled successfully")
            : "It may take a few minutes to send to all participants.",
        autoClose: 5000,
        loading: false,
        icon: <IconCheck />,
      });
    },
    onError: (error: any) => {
      if (!(error?.response?.data?.displayMessageInClient ?? false))
        showErrorToast(
          `${error?.response?.data?.message ?? "Error sending campaign"}`,
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
export const useCampaignResponseDownloadById = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: campaignResponseDownloadById,
    onSuccess: () => {
      // queryClient.invalidateQueries({ queryKey: ["campaignsbyTeam", teamId] });
      // queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      showSuccessToast(
        "Delivery report generated successfully.",
        "delivery-report",
        <IconCheck />,
        true,
      );
    },
    onError: (error: any) => {
      showErrorToast(
        `Error generating delivery report: ${error?.response?.data.error}`,
        "delivery-report",
        <IconX />,
        true,
      );
    },
  });
};
